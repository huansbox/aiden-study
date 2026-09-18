// 作品登錄只讀取公開 metadata；不讀題文、私人檔案或家庭設定。
import { readFileSync, readdirSync, existsSync, statSync, realpathSync } from "node:fs";
import { resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";

export const LOCAL_REPO = "huansbox/aiden-study";
export const MAIN_REF = "master";
const statuses = ["unknown", "in-progress", "complete", "paused"];
const availabilities = ["available", "source-only", "private", "unknown"];
const readJSON = (root, path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const fail = (message) => { throw Error("作品登錄：" + message); };
const text = (value, name) => typeof value === "string" && value.trim() ? value : fail(name + " 必須是非空文字");
const segment = (value, name) => /^[a-z0-9][a-z0-9-]*$/.test(text(value, name)) ? value : fail(name + " 格式不正確");
function pathName(value) {
  text(value, "來源路徑");
  if (value !== "." && (value.startsWith("/") || value.includes("\\") || value.split("/").some((part) => !part || part === "." || part === "..") || /[\x00-\x1f:*?\[\]]/.test(value)))
    fail("來源路徑必須是 repo 內的明確相對位置：" + value);
  return value;
}
function normalizeSource(input = {}, fallbackPaths = []) {
  const repo = input.repo ?? LOCAL_REPO, ref = input.ref ?? MAIN_REF;
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) fail("來源 repo 不正確");
  if (typeof ref !== "string" || !ref || ref.startsWith("-") || /[\s~^:?*\[\\]|\.\.|@\{|\/\/|\/$/.test(ref)) fail("來源 ref 不正確");
  const paths = input.paths ?? fallbackPaths, excludePaths = input.excludePaths ?? [];
  if (!Array.isArray(paths) || !paths.length || !Array.isArray(excludePaths)) fail("來源範圍不能留空");
  paths.forEach(pathName); excludePaths.forEach(pathName);
  return { repo, ref, paths, excludePaths, remote: repo !== LOCAL_REPO || ref !== MAIN_REF };
}
export function sourceKey(source) {
  const { repo, ref, paths, excludePaths = [] } = source;
  return JSON.stringify({ repo, ref, paths, excludePaths });
}
export function sourceURL(source, path = source.paths[0], kind = "tree") {
  const encoded = (value) => value.split("/").map(encodeURIComponent).join("/");
  return `https://github.com/${source.repo}/${kind}/${encoded(source.ref)}${path === "." ? "" : "/" + encoded(path)}`;
}
function checkLocalPath(root, path) {
  if (!existsSync(resolve(root, path))) fail("來源不存在：" + path);
  const realRoot = realpathSync(root), real = realpathSync(resolve(root, path));
  if (real !== realRoot && !real.startsWith(realRoot + sep)) fail("來源不可指向 repo 外：" + path);
}
function linksFor(root, links) {
  if (!Array.isArray(links)) fail("links 必須是陣列");
  return links.map((link) => {
    text(link.label, "成品名稱"); text(link.url, "成品網址");
    const url = new URL(link.url, "https://work-catalog.invalid/parent/");
    if (url.username || url.password || url.protocol !== "https:") fail("成品網址必須使用 https 或站內相對路徑");
    if (url.origin === "https://work-catalog.invalid") {
      if (!link.url.startsWith("../")) fail("站內成品網址以 /parent/ 的 ../ 為基底");
      const path = "docs" + decodeURIComponent(url.pathname) + (url.pathname.endsWith("/") ? "index.html" : "");
      checkLocalPath(root, path);
      if (!realpathSync(resolve(root, path)).startsWith(realpathSync(resolve(root, "docs")) + sep)) fail("站內成品必須位於 docs 部署根目錄");
      if (!statSync(resolve(root, path)).isFile()) fail("站內成品不是檔案：" + path);
    }
    return { label: link.label, url: link.url };
  });
}
function work(root, input, childNames) {
  const source = normalizeSource(input.source, input.paths);
  if (!source.remote) source.paths.forEach((path) => checkLocalPath(root, path));
  const status = input.status ?? "unknown", availability = input.availability ?? "unknown";
  if (!statuses.includes(status)) fail("工作狀態不正確：" + input.id);
  if (!availabilities.includes(availability)) fail("可用版本狀態不正確：" + input.id);
  const audience = input.audience ?? [];
  if (!Array.isArray(audience) || new Set(audience).size !== audience.length || audience.some((id) => !childNames.has(id))) fail("對象不正確：" + input.id);
  const groupId = input.groupId ?? null, groupName = input.groupName ?? null;
  if ((groupId === null) !== (groupName === null)) fail("系列必須同時提供 groupId 與 groupName");
  if (groupId !== null) { segment(groupId, "groupId"); text(groupName, "系列名稱"); }
  return {
    id: input.id, type: input.type, name: text(input.name, "作品名稱"), audience,
    audienceLabel: input.audienceLabel ?? (audience.map((id) => childNames.get(id)).join("、") || "未指定（目錄預設）"),
    status, statusNote: input.statusNote ?? "", availability,
    location: source.repo.split("/")[1] + (source.paths[0] === "." ? "" : "/" + source.paths[0]),
    source, sourceUrl: sourceURL(source), links: linksFor(root, input.links ?? []),
    description: input.description ?? "", eventDate: input.eventDate ?? null,
    groupId, groupName, created: null, updated: null,
    freshness: { state: "unknown", checkedAt: null, error: null },
  };
}

export function loadWorks(root) {
  const registry = readJSON(root, "docs/registry.json"), catalog = readJSON(root, "learning-tasks/catalog.json");
  if (!Array.isArray(registry.apps) || !Array.isArray(registry.children) || catalog.schemaVersion !== 1 || !Array.isArray(catalog.tasks)) fail("登錄格式不正確");
  const childNames = new Map(registry.children.map((child) => [child.id, child.name]));
  const appStatus = { active: "啟用", draft: "草稿", parked: "暫不上架" };
  const apps = registry.apps.map((app) => {
    segment(app.id, "App id");
    const metadata = app.work ?? {};
    if (!app.path && !metadata.source) fail("外部 App 必須提供來源 repo/ref：" + app.id);
    return work(root, {
      ...metadata, id: "app:" + app.id, type: "app", name: app.name, audience: app.audience,
      paths: app.path ? ["docs/" + app.path.replace(/\/$/, "")] : [],
      statusNote: metadata.statusNote ?? `App 上下架：${appStatus[app.status] ?? app.status}；未另標記工作狀態。`,
      availability: metadata.availability ?? "available",
      links: metadata.links ?? [{ label: app.path ? "網頁" : "外部網頁", url: app.path ? "../" + app.path : app.url }],
    }, childNames);
  });
  const localTasks = new Set();
  const tasks = catalog.tasks.map((task) => {
    segment(task.id, "task id");
    const path = "learning-tasks/" + task.id;
    const result = work(root, { ...task, id: "task:" + task.id, type: "task", paths: [path] }, childNames);
    if (!result.source.remote) {
      if (!result.source.paths.includes(path)) fail("task 來源範圍必須包含自己的目錄：" + task.id);
      checkLocalPath(root, path + "/README.md");
      localTasks.add(task.id);
    }
    return result;
  });
  for (const entry of readdirSync(resolve(root, "learning-tasks"), { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== "shared" && !localTasks.has(entry.name)) fail("task 資料夾尚未登錄：" + entry.name);
  }
  const works = [...apps, ...tasks], seen = new Set(), groups = new Map();
  for (const entry of works) {
    if (seen.has(entry.id)) fail("重複作品：" + entry.id);
    seen.add(entry.id);
    if (entry.groupId && groups.has(entry.groupId) && groups.get(entry.groupId) !== entry.groupName) fail("系列名稱不一致：" + entry.groupId);
    if (entry.groupId) groups.set(entry.groupId, entry.groupName);
  }
  return works;
}

const git = (root, args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).trim();
function taipeiDate(seconds) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(seconds * 1000));
}
export function gitDates(root, { ref = "HEAD", paths, excludePaths = [] }) {
  if (git(root, ["rev-parse", "--is-shallow-repository"]) !== "false") throw Error("作品日期需要完整 Git 歷史；請先取得完整歷史，不能使用 shallow checkout。");
  if (!Array.isArray(paths) || !paths.length || !Array.isArray(excludePaths)) fail("日期來源範圍不能留空");
  paths.forEach(pathName); excludePaths.forEach(pathName);
  const commit = git(root, ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`]);
  const specs = [...paths.map((path) => path === "." ? "." : `:(top,literal)${path}`), ...excludePaths.map((path) => `:(top,exclude,literal)${path}`)];
  // 不追蹤搬移前位置：create 表示目前來源位置首次被 Git 收錄，採 commit timestamp。
  // full-history 單獨使用會保留未改此範圍的拓樸 merge；simplify-merges 去除這些
  // 冗餘節點，但保留真正改變來源的 merge（例如 conflict resolution），不可用 no-merges。
  const history = git(root, ["log", "--no-renames", "--full-history", "--simplify-merges", "--format=%ct", commit, "--", ...specs]);
  const times = history ? history.split("\n").map(Number) : [];
  if (!times.length) return { created: null, updated: null };
  return { created: taipeiDate(Math.min(...times)), updated: taipeiDate(Math.max(...times)) };
}

function validDate(value) {
  return value === null || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
}
export function datedWorks(root, works, cache = { schemaVersion: 1, sources: {} }, readDates = gitDates) {
  if (cache.schemaVersion !== 1 || !cache.sources || typeof cache.sources !== "object" || Array.isArray(cache.sources)) fail("遠端快取格式不正確");
  return works.map((entry) => {
    if (!entry.source.remote) return { ...entry, ...readDates(root, { ...entry.source, ref: "HEAD" }), freshness: { state: "current", checkedAt: null, error: null } };
    const stored = cache.sources[entry.id], remote = stored?.sourceKey === sourceKey(entry.source) ? stored : null;
    if (!remote) return { ...entry, freshness: { state: "unknown", checkedAt: null, error: null } };
    if (!validDate(remote.created) || !validDate(remote.updated) || (remote.lastSuccessAt !== null && (typeof remote.lastSuccessAt !== "string" || !Number.isFinite(Date.parse(remote.lastSuccessAt))))) fail("遠端快取日期不正確：" + entry.id);
    const known = Boolean(remote.lastSuccessAt);
    return { ...entry, created: known ? remote.created : null, updated: known ? remote.updated : null,
      freshness: { state: known ? (remote.error ? "stale" : "current") : "unknown", checkedAt: remote.lastSuccessAt, error: remote.error ?? null } };
  });
}
