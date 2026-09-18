import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { gitDates, loadWorks, sourceKey } from "./work-catalog.mjs";

const exec = promisify(execFile);
const cachePath = "docs/parent/work-catalog-remotes.json";

// Only public, explicitly registered GitHub branches are read. Never check out
// their files or execute source code, and never reuse a developer's remote refs.
export async function fetchRemoteDates(source, {
  runGit = (args, options) => exec("git", args, options),
  readGitDates = gitDates,
} = {}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(source.repo)) {
    throw new Error("Invalid registered GitHub repository");
  }
  if (typeof source.ref !== "string" || !source.ref || source.ref.startsWith("-")) {
    throw new Error("Invalid registered branch");
  }
  const directory = await mkdtemp(join(tmpdir(), "work-catalog-remote-"));
  const options = {
    cwd: directory,
    timeout: 120_000,
    maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  };
  try {
    await runGit(["check-ref-format", `refs/heads/${source.ref}`], options);
    await runGit(["init", "--bare", "--quiet"], options);
    // No depth limit: creation dates require all ancestors of this exact ref.
    await runGit([
      "-c", "credential.helper=", "fetch", "--quiet", "--no-tags", "--filter=blob:none",
      `https://github.com/${source.repo}.git`, `refs/heads/${source.ref}`,
    ], options);
    const { stdout } = await runGit(["rev-parse", "--verify", "FETCH_HEAD^{commit}"], options);
    const ref = stdout.trim();
    for (const path of source.paths) {
      if (path === ".") continue;
      const tree = await runGit(["ls-tree", "-z", "--full-tree", ref, "--", path], options);
      if (!tree.stdout) throw new Error("Registered source path does not exist at this commit");
    }
    return await readGitDates(directory, {
      ref, paths: source.paths, excludePaths: source.excludePaths || [],
    });
  } catch (error) {
    // Do not persist raw subprocess stderr (which can contain credential/helper
    // details). The source identity and safe failure category remain diagnostic.
    throw new Error(error.killed
      ? "Remote Git read timed out; retry the catalog sync"
      : "Remote branch/source/history unavailable; check the registered repo/ref/paths and retry");
  } finally {
    // directory is the concrete path created above, never a caller-supplied root.
    await rm(directory, { recursive: true, force: true });
  }
}

export async function syncWorks({
  works, cache = { schemaVersion: 1, sources: {} },
  readDates = fetchRemoteDates, now = new Date(), missingOnly = false,
}) {
  if (cache.schemaVersion !== 1 || !cache.sources || typeof cache.sources !== "object" || Array.isArray(cache.sources)) {
    throw new Error("Unsupported remote catalog cache");
  }
  const attemptedAt = new Date(now).toISOString();
  const sources = {};
  const failures = [];
  for (const work of works.filter((entry) => entry.source.remote)) {
    const key = sourceKey(work.source);
    const saved = cache.sources[work.id];
    const previous = saved?.sourceKey === key ? saved : null;
    // Source pushes need local rebuilding, not a new remote-check timestamp on
    // every commit. Daily/manual runs still check all registered remote sources.
    if (missingOnly && previous?.lastSuccessAt && previous.created && previous.updated) {
      sources[work.id] = { ...previous };
      continue;
    }
    try {
      const dates = await readDates(work.source);
      if (dates.created === null || dates.updated === null) {
        throw new Error("Registered source has no Git history");
      }
      sources[work.id] = {
        sourceKey: key, created: dates.created, updated: dates.updated,
        attemptedAt, lastSuccessAt: attemptedAt, error: null,
      };
    } catch {
      // A registered item remains present even on its first failed request.
      // A changed source must not inherit dates from a different repo/ref/path.
      const error = "遠端來源讀取失敗；請核對 repo／分支／來源路徑後重新執行同步";
      sources[work.id] = {
        sourceKey: key, created: previous?.created ?? null,
        updated: previous?.updated ?? null, attemptedAt,
        lastSuccessAt: previous?.lastSuccessAt ?? null, error,
      };
      failures.push({ id: work.id, repo: work.source.repo, ref: work.source.ref, error });
    }
  }
  return { cache: { schemaVersion: 1, sources }, failures };
}

export async function syncCatalog({
  root = fileURLToPath(new URL("..", import.meta.url)),
  readDates = fetchRemoteDates, now = new Date(), missingOnly = false,
} = {}) {
  const target = join(root, cachePath);
  let before = "";
  try {
    before = await readFile(target, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const result = await syncWorks({
    works: loadWorks(root),
    cache: before ? JSON.parse(before) : undefined,
    readDates, now, missingOnly,
  });
  const after = `${JSON.stringify(result.cache, null, 2)}\n`;
  if (after !== before) await writeFile(target, after);
  return { ...result, changed: before !== after };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || args.some(arg => arg !== "--missing-only")) {
      throw new Error("Usage: node scripts/sync-work-catalog.mjs [--missing-only]");
    }
    const { cache, changed, failures } = await syncCatalog({ missingOnly: args.includes("--missing-only") });
    console.log(`Remote catalog: ${Object.keys(cache.sources).length} registered sources; ${changed ? "updated" : "unchanged"}`);
    for (const failure of failures) {
      const message = `${failure.id} (${failure.repo}@${failure.ref}): ${failure.error}`;
      console.warn(process.env.GITHUB_ACTIONS === "true"
        ? `::warning::${message.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A")}`
        : message);
    }
    // Remote failures are data: publish the stale/unknown state instead of
    // failing before families can see that the last successful data is old.
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
