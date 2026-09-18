import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { loadWorks, gitDates, datedWorks, sourceKey } from "../scripts/work-catalog.mjs";
import { buildOutputs, build } from "../scripts/build-work-catalog.mjs";

const repo = fileURLToPath(new URL("../", import.meta.url));
const read = (root, path) => readFileSync(resolve(root, path), "utf8");
const json = (root, path) => JSON.parse(read(root, path));
function file(root, path, value) {
  mkdirSync(dirname(resolve(root, path)), { recursive: true });
  writeFileSync(resolve(root, path), typeof value === "string" ? value : JSON.stringify(value));
}
function fixture(t) {
  const root = mkdtempSync(resolve(tmpdir(), "work-catalog-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  file(root, "docs/registry.json", { children: [{ id: "aiden", name: "哥哥" }], apps: [{ id: "demo", name: "作品 A", audience: ["aiden"], status: "active", path: "demo/" }] });
  file(root, "docs/demo/index.html", "demo");
  file(root, "learning-tasks/catalog.json", { schemaVersion: 1, tasks: [{ id: "task-a", name: "任務 A", status: "in-progress", availability: "source-only", audience: ["aiden"], eventDate: "2000-01-01" }] });
  file(root, "learning-tasks/task-a/README.md", "task");
  file(root, "learning-tasks/shared/README.md", "shared");
  file(root, "README.md", "# 保留前文\n\n<!-- work-catalog:start -->\n舊表\n<!-- work-catalog:end -->\n\n## 保留後文\n");
  file(root, "learning-tasks/README.md", "# 規則保留\n<!-- task-catalog:start -->\n舊表\n<!-- task-catalog:end -->\n分類規則\n");
  mkdirSync(resolve(root, "docs/parent"), { recursive: true });
  return root;
}
function git(root, args, env = {}) {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] }).trim();
}
function init(root) { git(root, ["init", "--initial-branch=master"]); }
function commit(root, date) {
  git(root, ["add", "."]);
  git(root, ["-c", "user.name=Catalog Test", "-c", "user.email=catalog-test@example.invalid", "commit", "-m", "fixture"], { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date });
}
function merge(root, branch, date) {
  return git(root, ["-c", "user.name=Catalog Test", "-c", "user.email=catalog-test@example.invalid", "merge", "--no-ff", "-m", "merge fixture", branch], { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date });
}

test("真實登錄完整列出所有 App、task 及主線外作品，不把 shared 計為作品", () => {
  const works = loadWorks(repo), registry = json(repo, "docs/registry.json"), catalog = json(repo, "learning-tasks/catalog.json");
  assert.deepEqual(works.filter((entry) => entry.type === "app").map((entry) => entry.id), registry.apps.map((entry) => "app:" + entry.id));
  assert.deepEqual(works.filter((entry) => entry.type === "task").map((entry) => entry.id), catalog.tasks.map((entry) => "task:" + entry.id));
  const dirs = readdirSync(resolve(repo, "learning-tasks"), { withFileTypes: true }).filter((entry) => entry.isDirectory() && entry.name !== "shared").map((entry) => "task:" + entry.name).sort();
  assert.deepEqual(works.filter((entry) => entry.type === "task" && !entry.source.remote).map((entry) => entry.id).sort(), dirs);
  for (const app of registry.apps.filter((entry) => ["draft", "parked"].includes(entry.status))) assert.ok(works.some((entry) => entry.id === "app:" + app.id));
  assert.ok(works.every((entry) => entry.id !== "task:shared"));
  const story = works.find((entry) => entry.id === "task:ai-collaboration-showcase");
  assert.equal(story.source.remote, true); assert.equal(story.source.ref, "codex/ai-collaboration-showcase");
  assert.match(story.sourceUrl, /tree\/codex\/ai-collaboration-showcase\/learning-tasks\/ai-collaboration-showcase$/);
});

test("Native Camp 明確分組所有素材，動物園獨立，App active 不推論 complete", () => {
  const works = loadWorks(repo), members = works.filter((entry) => entry.groupId === "nativecamp");
  assert.ok(members.some((entry) => entry.id === "app:nativecamp"));
  const nativeTasks = json(repo, "learning-tasks/catalog.json").tasks.filter((entry) => entry.groupId === "nativecamp");
  assert.equal(members.length, nativeTasks.length + 1);
  assert.ok(members.every((entry) => entry.groupName === "Native Camp"));
  assert.equal(works.find((entry) => entry.id === "task:hsinchu-zoo-adventure").groupId, null);
  assert.ok(works.filter((entry) => entry.type === "app").every((entry) => entry.status === "unknown"));
});

test("private 不公開缺檔，站內成品存在，Native Camp 用 Preview，失效舊 animal-fight URL 不當成品", () => {
  const works = loadWorks(repo);
  for (const id of ["grade4-math-first-practice", "grade4-sem1-math-exam1"]) {
    const entry = works.find((entry) => entry.id === "task:" + id);
    assert.equal(entry.availability, "private"); assert.equal(entry.status, "complete"); assert.deepEqual(entry.links, []);
    assert.match(entry.sourceUrl, /github.com\/huansbox\/aiden-study\/tree\/master\/learning-tasks/);
  }
  assert.ok(works.filter((entry) => entry.groupId === "nativecamp").every((entry) => entry.links.some((link) => link.url.startsWith("../nativecamp/preview.html"))));
  const animal = works.find((entry) => entry.id === "app:animal-fight");
  assert.ok(animal.links.some((link) => link.url.endsWith(".pdf")));
  assert.ok(animal.links.every((link) => link.url.startsWith("https://github.com/huansbox/animal-fight/")));
});

test("新 task 漏登、重複 id、錯誤工作狀態與不實存成品均響亮失敗", (t) => {
  const root = fixture(t), original = json(root, "learning-tasks/catalog.json");
  mkdirSync(resolve(root, "learning-tasks/forgotten"));
  assert.throws(() => loadWorks(root), /尚未登錄：forgotten/);
  rmSync(resolve(root, "learning-tasks/forgotten"), { recursive: true });
  for (const [tasks, pattern] of [
    [[...original.tasks, original.tasks[0]], /重複作品/],
    [[{ ...original.tasks[0], status: "active" }], /工作狀態/],
    [[{ ...original.tasks[0], links: [{ label: "壞連結", url: "../not-real/" }] }], /來源不存在/],
    [[{ ...original.tasks[0], links: [{ label: "任務", url: "../../learning-tasks/task-a/" }] }], /來源不存在/],
    [[{ ...original.tasks[0], links: [{ label: "編碼路徑", url: "../%2F..%2Flearning-tasks/task-a/README.md" }] }], /docs 部署根目錄/],
    [[{ ...original.tasks[0], source: { paths: ["../private"] } }], /明確相對位置/],
    [[{ ...original.tasks[0], links: [{ label: "危險", url: "javascript:alert(1)" }] }], /https/],
  ]) {
    file(root, "learning-tasks/catalog.json", { ...original, tasks });
    assert.throws(() => loadWorks(root), pattern);
  }
});

test("真實来源一次改名，README 與 JSON 一起更新，保留非產生區段，重建穩定", (t) => {
  const root = fixture(t); init(root); commit(root, "2026-09-01T00:00:00Z");
  build({ root }); assert.deepEqual(build({ root }), []); assert.deepEqual(build({ root, check: true }), []);
  const catalog = json(root, "learning-tasks/catalog.json"); catalog.tasks[0].name = "同一真相源的新名稱"; file(root, "learning-tasks/catalog.json", catalog);
  assert.throws(() => build({ root, check: true }), /產物過期/);
  const outputs = buildOutputs(root);
  for (const path of Object.keys(outputs)) assert.match(outputs[path], /同一真相源的新名稱/);
  assert.match(outputs["README.md"], /^# 保留前文/); assert.match(outputs["README.md"], /## 保留後文\n$/);
  assert.match(outputs["learning-tasks/README.md"], /^# 規則保留/); assert.match(outputs["learning-tasks/README.md"], /分類規則\n$/);
  const app = JSON.parse(outputs["docs/parent/work-catalog.json"]).works.find((entry) => entry.type === "app");
  assert.equal(app.created, "2026-09-01"); assert.equal(app.updated, "2026-09-01");
  assert.equal(Object.hasOwn(JSON.parse(outputs["docs/parent/work-catalog.json"]), "generatedAt"), false);
});

test("來源 Git 日期含文件與素材，換算臺灣日期，不用活動日期或無關提交", (t) => {
  const root = fixture(t); init(root); commit(root, "2026-08-31T18:30:00Z");
  file(root, "learning-tasks/task-a/assets/picture.txt", "material"); commit(root, "2026-09-03T00:00:00Z");
  file(root, "learning-tasks/task-a/README.md", "updated docs"); commit(root, "2026-09-05T17:00:00Z");
  file(root, "unrelated.md", "not this work"); commit(root, "2026-09-10T00:00:00Z");
  const works = datedWorks(root, loadWorks(root));
  const task = works.find((entry) => entry.type === "task");
  assert.deepEqual({ created: task.created, updated: task.updated }, { created: "2026-09-01", updated: "2026-09-06" });
  assert.equal(task.eventDate, "2000-01-01");
  assert.deepEqual(gitDates(root, { paths: ["unknown"] }), { created: null, updated: null });
});

test("日期排除別的巢狀作品，不追搬移前位置，完整 bare repo 與確切 commit 亦可讀", (t) => {
  const root = fixture(t); init(root);
  file(root, "docs/old/source.txt", "source"); file(root, "docs/demo/nested/index.html", "nested"); commit(root, "2026-08-01T00:00:00Z");
  file(root, "docs/demo/nested/index.html", "nested update"); commit(root, "2026-08-02T00:00:00Z");
  assert.deepEqual(gitDates(root, { paths: ["docs/demo"], excludePaths: ["docs/demo/nested"] }), { created: "2026-08-01", updated: "2026-08-01" });
  git(root, ["mv", "docs/old", "docs/new"]); commit(root, "2026-08-03T00:00:00Z");
  assert.deepEqual(gitDates(root, { paths: ["docs/new"] }), { created: "2026-08-03", updated: "2026-08-03" });
  const bare = resolve(root, "bare.git"); git(root, ["clone", "--bare", root, bare]);
  const sha = git(root, ["rev-parse", "HEAD"]);
  assert.deepEqual(gitDates(bare, { ref: sha, paths: ["."] }), { created: "2026-08-01", updated: "2026-08-03" });
});

test("master 的 Study 更新後合入沒碰 Study 的舊分支，不用無關 merge 日期", (t) => {
  const root = fixture(t); init(root); commit(root, "2026-08-01T00:00:00Z");
  git(root, ["branch", "old-story"]);
  file(root, "docs/demo/index.html", "Study on master"); commit(root, "2026-08-03T00:00:00Z");
  git(root, ["checkout", "old-story"]);
  file(root, "story.txt", "unrelated story"); commit(root, "2026-08-02T00:00:00Z");
  git(root, ["checkout", "master"]); merge(root, "old-story", "2026-08-10T00:00:00Z");
  assert.deepEqual(gitDates(root, { paths: ["docs/demo"] }), { created: "2026-08-01", updated: "2026-08-03" });
});

test("故事工作分支合入沒有改故事來源的 master，不刷新故事 update", (t) => {
  const root = fixture(t); init(root); commit(root, "2026-08-01T00:00:00Z");
  git(root, ["checkout", "-b", "story"]);
  file(root, "learning-tasks/task-a/README.md", "story source updated"); commit(root, "2026-08-02T00:00:00Z");
  git(root, ["checkout", "master"]);
  file(root, "docs/demo/index.html", "unrelated Study change"); commit(root, "2026-08-03T00:00:00Z");
  git(root, ["checkout", "story"]); merge(root, "master", "2026-08-10T00:00:00Z");
  assert.deepEqual(gitDates(root, { ref: "story", paths: ["learning-tasks/task-a"] }), { created: "2026-08-01", updated: "2026-08-02" });
});

test("真正 merge conflict resolution 改動作品來源，仍使用 merge 的更新日期", (t) => {
  const root = fixture(t); init(root); commit(root, "2026-08-01T00:00:00Z");
  git(root, ["branch", "another-version"]);
  file(root, "docs/demo/index.html", "master content\n"); commit(root, "2026-08-02T00:00:00Z");
  git(root, ["checkout", "another-version"]);
  file(root, "docs/demo/index.html", "branch content\n"); commit(root, "2026-08-03T00:00:00Z");
  git(root, ["checkout", "master"]);
  assert.throws(() => merge(root, "another-version", "2026-08-10T00:00:00Z"), (error) => error.status === 1);
  file(root, "docs/demo/index.html", "combined conflict resolution\n"); commit(root, "2026-08-10T00:00:00Z");
  assert.equal(git(root, ["rev-list", "--parents", "-n", "1", "HEAD"]).split(" ").length, 3, "fixture must contain an actual merge commit");
  assert.deepEqual(gitDates(root, { paths: ["docs/demo"] }), { created: "2026-08-01", updated: "2026-08-10" });
});

test("淺層 Git 歷史拒絕產生假建立日期", (t) => {
  const root = fixture(t); init(root); commit(root, "2026-08-01T00:00:00Z");
  file(root, "docs/demo/index.html", "updated"); commit(root, "2026-08-03T00:00:00Z");
  const shallow = resolve(root, "shallow"); git(root, ["clone", "--depth=1", pathToFileURL(root).href, shallow]);
  assert.throws(() => gitDates(shallow, { paths: ["docs/demo"] }), /完整 Git 歷史/);
});

test("遠端首次未知、成功、失敗保留舊值與來源更改不冒充最新", () => {
  const remote = loadWorks(repo).find((entry) => entry.id === "app:99-meteor");
  const createCache = (record) => ({ schemaVersion: 1, sources: { [remote.id]: record } });
  const snapshot = { sourceKey: sourceKey(remote.source), created: "2026-07-01", updated: "2026-08-15", attemptedAt: "2026-09-18T00:00:00Z", lastSuccessAt: "2026-09-17T00:00:00Z", error: null };
  assert.equal(datedWorks(repo, [remote])[0].freshness.state, "unknown");
  assert.equal(datedWorks(repo, [remote], createCache(snapshot))[0].freshness.state, "current");
  const stale = datedWorks(repo, [remote], createCache({ ...snapshot, error: "取得失敗" }))[0];
  assert.equal(stale.updated, "2026-08-15"); assert.equal(stale.freshness.state, "stale"); assert.equal(stale.freshness.checkedAt, snapshot.lastSuccessAt);
  const failed = datedWorks(repo, [remote], createCache({ ...snapshot, created: null, updated: null, lastSuccessAt: null, error: "首次失敗" }))[0];
  assert.equal(failed.created, null); assert.equal(failed.updated, null); assert.equal(failed.freshness.state, "unknown");
  const changed = datedWorks(repo, [{ ...remote, source: { ...remote.source, ref: "another" } }], createCache(snapshot))[0];
  assert.equal(changed.updated, null); assert.equal(changed.freshness.checkedAt, null);
  assert.throws(() => datedWorks(repo, [remote], createCache({ ...snapshot, updated: "2026-02-30" })), /快取日期不正確/);
  assert.equal(sourceKey({ ...remote.source, excludePaths: undefined }), JSON.stringify({ repo: remote.source.repo, ref: remote.source.ref, paths: remote.source.paths, excludePaths: [] }));
});

test("已提交的 README／白板 metadata 與共同登錄一致；本地 Git 日期由發布重建", () => {
  const outputs = buildOutputs(repo);
  for (const [path, output] of Object.entries(outputs)) {
    if (!path.endsWith("work-catalog.json")) {
      assert.equal(read(repo, path), output, `${path}：請執行 node scripts/build-work-catalog.mjs`);
      continue;
    }
    // 一般來源提交可能先抵達 test CI，之後發布流程才重建該 commit 的 Git 日期。
    // 只略過 local created/updated 的這個時間差；metadata 與 remote cache 仍完整比對。
    // 日期語意／完整歷史由上方真实 Git fixtures 驗證；發布流程重建後 --check 嚴格比對全部。
    const withoutLocalDates = (body) => ({ ...body, works: body.works.map((entry) => entry.source.remote ? entry : { ...entry, created: null, updated: null }) });
    assert.deepEqual(withoutLocalDates(json(repo, path)), withoutLocalDates(JSON.parse(output)), `${path}：metadata 與來源不一致`);
  }
});
