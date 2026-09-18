import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import { datedWorks, sourceKey } from "../scripts/work-catalog.mjs";
import { fetchRemoteDates, syncWorks } from "../scripts/sync-work-catalog.mjs";

const exec = promisify(execFile);
const now = "2026-09-18T01:00:00.000Z";
const before = "2026-09-17T01:00:00.000Z";
const source = {
  repo: "huansbox/example", ref: "codex/registered", paths: ["source"],
  excludePaths: ["source/generated"], remote: true,
};
const work = { id: "app:example", source };
const known = {
  sourceKey: sourceKey(source), created: "2024-01-01", updated: "2024-01-02",
  attemptedAt: before, lastSuccessAt: before, error: null,
};
const previousCache = () => ({ schemaVersion: 1, sources: { [work.id]: { ...known } } });

test("remote success stores Git dates separately from the attempt/success time", async () => {
  const cache = previousCache();
  const result = await syncWorks({ works: [work], cache, now, readDates: async () => ({ created: "2024-01-01", updated: "2024-06-30" }) });
  assert.deepEqual(result.cache.sources[work.id], {
    ...known, updated: "2024-06-30", attemptedAt: now, lastSuccessAt: now,
  });
  assert.deepEqual(result.failures, []);
  assert.equal(cache.sources[work.id].updated, "2024-01-02", "input cache is not mutated");
});

test("failure retains known dates, reports the source, and does not expose raw errors", async () => {
  const result = await syncWorks({ works: [work], cache: previousCache(), now, readDates: async () => { throw new Error("credential=secret-fixture-value"); } });
  const saved = result.cache.sources[work.id];
  assert.equal(saved.created, known.created);
  assert.equal(saved.updated, known.updated);
  assert.equal(saved.lastSuccessAt, before);
  assert.equal(saved.attemptedAt, now);
  assert.match(saved.error, /遠端來源讀取失敗/);
  assert.equal(result.failures[0].repo, source.repo);
  assert.equal(JSON.stringify(result).includes("secret-fixture-value"), false);
});

test("first failure stays unknown and a later successful sync clears the failure", async () => {
  const failed = await syncWorks({ works: [work], now, readDates: async () => { throw new Error("offline"); } });
  assert.equal(failed.cache.sources[work.id].created, null);
  assert.equal(failed.cache.sources[work.id].updated, null);
  assert.equal(failed.cache.sources[work.id].lastSuccessAt, null);
  const recovered = await syncWorks({ works: [work], cache: failed.cache, now, readDates: async () => ({ created: "2024-01-01", updated: "2024-01-02" }) });
  assert.equal(recovered.cache.sources[work.id].error, null);
  assert.equal(recovered.cache.sources[work.id].lastSuccessAt, now);
  assert.equal(recovered.cache.sources[work.id].updated, "2024-01-02");
});

for (const [field, value] of Object.entries({
  repo: "huansbox/replacement", ref: "another-branch", paths: ["new-location"], excludePaths: [],
})) {
  test(`changing source ${field} never reuses an unrelated cached history`, async () => {
    const changed = { ...work, source: { ...source, [field]: value } };
    const result = await syncWorks({ works: [changed], cache: previousCache(), now, readDates: async () => { throw new Error("offline"); } });
    const saved = result.cache.sources[work.id];
    assert.equal(saved.sourceKey, sourceKey(changed.source));
    assert.equal(saved.created, null);
    assert.equal(saved.updated, null);
    assert.equal(saved.lastSuccessAt, null);
  });
}

test("refreshes both registered external repos and the registered same-repo branch only", async () => {
  const branch = { id: "task:story", source: { ...source, repo: "huansbox/aiden-study" } };
  const local = { id: "app:local", source: { ...source, remote: false } };
  const seen = [];
  const cache = previousCache();
  cache.sources["app:removed"] = { ...known };
  const result = await syncWorks({ works: [work, local, branch], cache, now, readDates: async value => {
    seen.push(value);
    return { created: known.created, updated: known.updated };
  } });
  assert.deepEqual(seen, [source, branch.source]);
  assert.deepEqual(Object.keys(result.cache.sources), [work.id, branch.id]);
  assert.equal(result.cache.sources[branch.id].created, known.created);
  assert.equal(result.cache.sources[branch.id].updated, known.updated);
});

test("a source without Git history is a failed read, preserving known dates or staying unknown", async () => {
  const readDates = async () => ({ created: null, updated: null });
  const retained = await syncWorks({ works: [work], cache: previousCache(), now, readDates });
  assert.equal(retained.cache.sources[work.id].created, known.created);
  assert.equal(retained.cache.sources[work.id].updated, known.updated);
  assert.equal(retained.cache.sources[work.id].lastSuccessAt, before);
  assert.equal(retained.failures.length, 1);
  assert.equal(datedWorks("unused-for-remote", [work], retained.cache)[0].freshness.state, "stale");
  const initial = await syncWorks({ works: [work], now, readDates });
  assert.equal(initial.cache.sources[work.id].lastSuccessAt, null);
  assert.equal(initial.failures.length, 1);
  assert.equal(datedWorks("unused-for-remote", [work], initial.cache)[0].freshness.state, "unknown");
});

test("push missing-only sync preserves an unchanged successful source without network or timestamp churn", async () => {
  const cache = previousCache();
  const result = await syncWorks({ works: [work], cache, now, missingOnly: true,
    readDates: async () => assert.fail("a known same-key source must not be fetched on push") });
  assert.deepEqual(result.cache, cache);
  assert.deepEqual(result.failures, []);
  const stale = previousCache();
  stale.sources[work.id].error = "previous daily check failed";
  const retained = await syncWorks({ works: [work], cache: stale, now, missingOnly: true,
    readDates: async () => assert.fail("a later push must retain the daily stale warning") });
  assert.deepEqual(retained.cache, stale);
});

test("missing-only sync queries newly registered, changed-source, and never-successful sources", async () => {
  for (const cache of [
    { schemaVersion: 1, sources: {} },
    { schemaVersion: 1, sources: { [work.id]: { ...known, sourceKey: sourceKey({ ...source, ref: "old-branch" }) } } },
    { schemaVersion: 1, sources: { [work.id]: { ...known, created: null, updated: null, lastSuccessAt: null, error: "offline" } } },
  ]) {
    let reads = 0;
    const result = await syncWorks({ works: [work], cache, now, missingOnly: true, readDates: async () => {
      reads++;
      return { created: known.created, updated: known.updated };
    } });
    assert.equal(reads, 1);
    assert.equal(result.cache.sources[work.id].sourceKey, sourceKey(source));
    assert.equal(result.cache.sources[work.id].lastSuccessAt, now);
    assert.equal(result.cache.sources[work.id].error, null);
  }
});

test("another successful check only changes freshness, never the work dates", async () => {
  const result = await syncWorks({ works: [work], cache: previousCache(), now, readDates: async () => ({ created: known.created, updated: known.updated }) });
  assert.equal(result.cache.sources[work.id].updated, known.updated);
  assert.notEqual(result.cache.sources[work.id].lastSuccessAt, known.lastSuccessAt);
  const repeated = await syncWorks({ works: [work], cache: result.cache, now, readDates: async () => ({ created: known.created, updated: known.updated }) });
  assert.deepEqual(repeated.cache, result.cache, "identical inputs and check time are stable");
});

test("sync outcomes reach the builder contract as current, stale, unknown, and recovered", async () => {
  const succeed = async () => ({ created: known.created, updated: known.updated });
  const fail = async () => { throw new Error("offline fixture"); };
  const rendered = cache => datedWorks("unused-for-remote", [work], cache)[0];
  const firstFailure = await syncWorks({ works: [work], now, readDates: fail });
  assert.equal(rendered(firstFailure.cache).freshness.state, "unknown");
  assert.equal(rendered(firstFailure.cache).created, null);
  const current = await syncWorks({ works: [work], cache: firstFailure.cache, now, readDates: succeed });
  assert.equal(rendered(current.cache).freshness.state, "current");
  assert.equal(rendered(current.cache).updated, known.updated);
  const stale = await syncWorks({ works: [work], cache: current.cache, now, readDates: fail });
  assert.equal(rendered(stale.cache).freshness.state, "stale");
  assert.equal(rendered(stale.cache).updated, known.updated);
  assert.equal(rendered(stale.cache).freshness.checkedAt, now);
  const recovered = await syncWorks({ works: [work], cache: stale.cache, now, readDates: succeed });
  assert.equal(rendered(recovered.cache).freshness.state, "current");
  assert.equal(rendered(recovered.cache).freshness.error, null);
});

test("invalid cache schema fails before remote reads instead of discarding known data", async () => {
  await assert.rejects(syncWorks({ works: [work], cache: { schemaVersion: 2, sources: {} }, readDates: () => assert.fail("must not read") }), /Unsupported/);
});

test("remote reader fetches the exact full branch into a disposable bare repo", async () => {
  const calls = [];
  let temp;
  const result = await fetchRemoteDates(source, {
    runGit: async (args, options) => {
      calls.push(args);
      temp = options.cwd;
      assert.equal(options.env.GIT_TERMINAL_PROMPT, "0");
      return { stdout: args[0] === "rev-parse" ? `${"a".repeat(40)}\n`
        : args[0] === "ls-tree" ? `040000 tree ${"b".repeat(40)}\tsource\0` : "" };
    },
    readGitDates: async (directory, request) => {
      assert.equal(directory, temp);
      assert.deepEqual(request, { ref: "a".repeat(40), paths: source.paths, excludePaths: source.excludePaths });
      return { created: "2024-01-01", updated: "2024-01-02" };
    },
  });
  assert.deepEqual(result, { created: "2024-01-01", updated: "2024-01-02" });
  const fetch = calls.find(args => args.includes("fetch"));
  assert.ok(fetch.includes("--filter=blob:none"), "fetch metadata, not recordings/images");
  assert.ok(fetch.includes("--no-tags"));
  assert.ok(fetch.includes("https://github.com/huansbox/example.git"));
  assert.ok(fetch.includes("refs/heads/codex/registered"));
  assert.equal(fetch.some(arg => arg.startsWith("--depth") || arg.startsWith("--shallow")), false);
  assert.deepEqual(calls.find(args => args[0] === "ls-tree"), ["ls-tree", "-z", "--full-tree", "a".repeat(40), "--", "source"]);
  await assert.rejects(access(temp), { code: "ENOENT" });
});

test("failed remote reads remove their temporary repo and redact subprocess output", async () => {
  let temp;
  await assert.rejects(fetchRemoteDates(source, {
    runGit: async (args, options) => {
      temp = options.cwd;
      throw new Error("private credential helper details");
    },
  }), error => {
    assert.equal(error.message.includes("private credential"), false);
    assert.match(error.message, /Remote branch\/source\/history unavailable/);
    return true;
  });
  await assert.rejects(access(temp), { code: "ENOENT" });
  await assert.rejects(fetchRemoteDates({ ...source, repo: "../../outside" }), /Invalid/);
});

test("remote path checks cover every registered path but treat repo root as present", async () => {
  const checked = [];
  const runGit = async args => {
    if (args[0] === "ls-tree") {
      const path = args.at(-1);
      checked.push(path);
      return { stdout: path === "missing" ? "" : `040000 tree ${"b".repeat(40)}\t${path}\0` };
    }
    return { stdout: args[0] === "rev-parse" ? "a".repeat(40) : "" };
  };
  await assert.rejects(fetchRemoteDates({ ...source, paths: ["source", "missing"] }, {
    runGit, readGitDates: () => assert.fail("do not accept partial source availability"),
  }), /Remote branch\/source\/history unavailable/);
  assert.deepEqual(checked, ["source", "missing"]);
  checked.length = 0;
  const result = await fetchRemoteDates({ ...source, paths: ["."] }, {
    runGit, readGitDates: () => ({ created: known.created, updated: known.updated }),
  });
  assert.deepEqual(checked, []);
  assert.equal(result.updated, known.updated);
});

test("real Git transport fixture reads the registered branch's full path history offline", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "work-catalog-history-"));
  const git = (args, date) => exec("git", args, {
    cwd: fixture,
    env: { ...process.env, ...(date ? { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : {}) },
  });
  const commit = async (path, value, date) => {
    await mkdir(join(fixture, path, ".."), { recursive: true });
    await writeFile(join(fixture, path), value);
    await git(["add", "--", path]);
    await git(["commit", "--quiet", "-m", value], date);
  };
  try {
    await git(["init", "--quiet", "--initial-branch=master"]);
    await git(["config", "user.name", "Catalog Test"]);
    await git(["config", "user.email", "catalog@example.invalid"]);
    await commit("source/README.md", "First source", "2024-01-01T12:00:00Z");
    await git(["checkout", "--quiet", "-b", "codex/registered"]);
    await commit("source/lesson.md", "New lesson", "2024-01-02T12:00:00Z");
    await commit("source/generated/cache.json", "Generated", "2024-03-01T12:00:00Z");
    await git(["checkout", "--quiet", "master"]);
    await commit("source/README.md", "Unrelated branch version", "2024-06-01T12:00:00Z");
    const runGit = (args, options) => exec("git", args.map(arg => {
        if (arg.startsWith("https://")) {
          assert.equal(arg, "https://github.com/huansbox/example.git");
          return fixture;
        }
        return arg;
      }), options);
    const result = await fetchRemoteDates(source, { runGit });
    assert.deepEqual(result, { created: "2024-01-01", updated: "2024-01-02" });
    await assert.rejects(fetchRemoteDates({ ...source, paths: ["missing-source"] }, { runGit }), /Remote branch\/source\/history unavailable/);
    await git(["checkout", "--quiet", "codex/registered"]);
    await git(["rm", "--quiet", "-r", "source"]);
    await git(["commit", "--quiet", "-m", "Remove registered source"], "2024-07-01T12:00:00Z");
    await assert.rejects(fetchRemoteDates(source, { runGit }), /Remote branch\/source\/history unavailable/,
      "deleted paths must fail even though git log still contains their old history");
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("publication workflow uses shared CLIs, complete history, safe push, and explicit Pages verification", async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const workflow = await readFile(join(root, ".github/workflows/work-catalog.yml"), "utf8");
  assert.match(workflow, /branches: \[master\]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /cron: '23 21 \* \* \*'/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/master'/);
  assert.match(workflow, /fetch-depth: 0/);
  assert.match(workflow, /CATALOG_EVENT: \$\{\{ github\.event_name \}\}/);
  assert.match(workflow, /if \[ "\$CATALOG_EVENT" = "push" \]; then\n\s+node scripts\/sync-work-catalog\.mjs --missing-only/);
  assert.match(workflow, /else\n\s+node scripts\/sync-work-catalog\.mjs\n\s+fi\n\s+node scripts\/build-work-catalog\.mjs/);
  assert.match(workflow, /git push origin HEAD:master/);
  assert.doesNotMatch(workflow, /git (?:push[^\n]*--force|reset|rebase)/);
  assert.match(workflow, /pages: write/);
  assert.doesNotMatch(workflow, /(?:administration|id-token|actions): write/);
  assert.match(workflow, /requestPagesBuild/);
  assert.match(workflow, /getLatestPagesBuild/);
  assert.match(workflow, /JSON\.stringify\(await response\.json\(\)\) === serialized/);
  const testWorkflow = await readFile(join(root, ".github/workflows/test.yml"), "utf8");
  assert.equal((testWorkflow.match(/fetch-depth: 0/g) || []).length, 2);
});

async function publicationFixture({ site = {}, builds, published, expected } = {}) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const workflow = await readFile(join(root, ".github/workflows/work-catalog.yml"), "utf8");
  const embedded = workflow.split("          script: |\n")[1];
  assert.ok(embedded, "publication JavaScript exists in the actual workflow");
  const script = embedded.split("\n").map(line => line.slice(12)).join("\n");
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const execute = new AsyncFunction("github", "context", "core", "require", "process", "fetch", "setTimeout", script);
  const catalog = expected || { schemaVersion: 1, works: [{
    id: "app:fixture", source: { remote: false }, created: "2024-01-01", updated: "2024-06-30",
  }] };
  const record = { requests: 0, polls: 0, fetches: [], summary: [], waits: 0 };
  const summary = {};
  for (const method of ["addHeading", "addRaw", "addLink", "write"]) {
    summary[method] = (...args) => { record.summary.push([method, ...args]); return summary; };
  }
  const require = createRequire(import.meta.url);
  const github = { rest: { repos: {
    getPages: async () => ({ data: { build_type: "legacy", source: { branch: "master", path: "/docs" }, html_url: "https://catalog.invalid/", ...site } }),
    get: async () => ({ data: { default_branch: "master" } }),
    requestPagesBuild: async () => { record.requests++; return { data: { status: "queued" } }; },
    getLatestPagesBuild: async () => {
      const data = builds?.[Math.min(record.polls, builds.length - 1)] || { status: "built", commit: "fixture-commit" };
      record.polls++;
      return { data };
    },
  } } };
  const run = () => execute(github, { repo: { owner: "fixture", repo: "catalog" } },
    { summary, info() {} },
    name => name === "node:fs" ? { readFileSync: () => JSON.stringify(catalog) } : require(name),
    { env: { CATALOG_COMMIT: "fixture-commit" } },
    async url => {
      record.fetches.push(url.toString());
      return { ok: true, json: async () => published || catalog };
    },
    callback => { record.waits++; callback(); });
  return { run, record };
}

test("actual Pages publication script requests a build, waits, and records exact artifact evidence", async () => {
  const { run, record } = await publicationFixture({ builds: [{ status: "building", commit: "fixture-commit" }, { status: "built", commit: "fixture-commit" }] });
  await run();
  assert.equal(record.requests, 1);
  assert.equal(record.polls, 2);
  assert.equal(record.waits, 1);
  assert.match(record.fetches[0], /^https:\/\/catalog\.invalid\/parent\/work-catalog\.json\?catalog-check=/);
  const evidence = JSON.stringify(record.summary);
  assert.match(evidence, /Catalog SHA-256/);
  assert.match(evidence, /2024-01-01 \/ 2024-06-30/);
});

test("an old errored Pages build is ignored until this commit finishes building", async () => {
  const { run, record } = await publicationFixture({ builds: [
    { status: "errored", commit: "older-commit", error: { message: "old failure" } },
    { status: "building", commit: "fixture-commit" },
    { status: "built", commit: "fixture-commit" },
  ] });
  await run();
  assert.equal(record.requests, 1);
  assert.equal(record.polls, 3);
  assert.equal(record.waits, 2);
  assert.equal(record.fetches.length, 1);
  assert.match(JSON.stringify(record.summary), /Pages build commit: fixture-commit/);
});

test("a failure from the exact catalog commit fails publication without accepting live data", async () => {
  const { run, record } = await publicationFixture({ builds: [
    { status: "errored", commit: "fixture-commit", error: { message: "current failure" } },
  ] });
  await assert.rejects(run(), /Pages build failed: current failure/);
  assert.equal(record.polls, 1);
  assert.equal(record.fetches.length, 0);
  assert.equal(record.summary.length, 0);
});

for (const commit of ["older-commit", "concurrent-master-commit", undefined]) {
  test(`a built result for ${commit ?? "an unknown commit"} cannot certify this publication`, async () => {
    const { run, record } = await publicationFixture({ builds: [{ status: "built", commit }] });
    await assert.rejects(run(), /expected commit: fixture-commit/);
    assert.equal(record.polls, 60);
    assert.equal(record.fetches.length, 0, "matching JSON from another build is not publication evidence");
    assert.equal(record.summary.length, 0);
  });
}

test("publication script refuses changed Pages configuration without mutating settings", async () => {
  const { run, record } = await publicationFixture({ site: { build_type: "workflow" } });
  await assert.rejects(run(), /Pages is no longer legacy/);
  assert.equal(record.requests, 0);
  assert.equal(record.fetches.length, 0);
});

test("a successful Pages build is insufficient when the live catalog remains old", async () => {
  const { run, record } = await publicationFixture({ published: { schemaVersion: 1, works: [] } });
  await assert.rejects(run(), /Published catalog did not match/);
  assert.equal(record.requests, 1);
  assert.equal(record.fetches.length, 60);
  assert.equal(record.summary.length, 0);
});

test("stale remote data is still published and verified, not blocked before the warning reaches the page", async () => {
  const { run, record } = await publicationFixture({ expected: { schemaVersion: 1, works: [{
    id: work.id, source, created: known.created, updated: known.updated,
    freshness: { state: "stale", checkedAt: before, error: "讀取失敗" },
  }] } });
  await run();
  assert.equal(record.requests, 1);
  assert.equal(record.fetches.length, 1);
  assert.ok(record.summary.length > 0);
});
