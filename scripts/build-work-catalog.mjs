import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadWorks, datedWorks } from "./work-catalog.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const read = (root, path) => readFileSync(resolve(root, path), "utf8").replace(/\r\n/g, "\n");
const md = (value) => String(value ?? "—").replace(/\\/g, "\\\\").replace(/[|\[\]<>]/g, (char) => "\\" + char).replace(/\r?\n/g, " ");
const statusNames = { unknown: "未標記", "in-progress": "進行中", complete: "已完成", paused: "暫停" };
const availabilityNames = { available: "已有成品", "source-only": "僅來源", private: "私用成品", unknown: "未知" };
const markdownLink = (name, url) => `[${md(name)}](${url})`;
const versionLinks = (entry) => entry.links.length ? entry.links.map((link) => markdownLink(link.label, link.url.startsWith("../") ? "docs/" + link.url.slice(3) : link.url)).join("、") : availabilityNames[entry.availability];
const sourceLink = (entry) => markdownLink(entry.location, entry.source.remote ? entry.sourceUrl : entry.source.paths[0] + "/");
function replaceSection(content, start, end, body) {
  if (content.split(start).length !== 2 || content.split(end).length !== 2 || content.indexOf(start) > content.indexOf(end)) throw Error("README 產生區段標記缺少或重複");
  return content.slice(0, content.indexOf(start) + start.length) + "\n\n" + body.trim() + "\n\n" + content.slice(content.indexOf(end));
}
export function overview(works) {
  const apps = works.filter((entry) => entry.type === "app");
  const localTasks = works.filter((entry) => entry.type === "task" && !entry.source.remote);
  const remoteTasks = works.filter((entry) => entry.type === "task" && entry.source.remote);
  return `此區塊由 [App registry](docs/registry.json) 與 [task catalog](learning-tasks/catalog.json) 自動產生，勿手改。相同資料供[家長作品白板](https://kids.linshuhuan.com/parent/)使用；操作與歸檔規則見[任務庫](learning-tasks/README.md)。

### App

包含 draft／parked 與外部 App；對象是 registry 預設，不是孩子目前的家庭設定。App 上下架不代表工作已完成，沒有明確工作狀態就顯示「未標記」。

| App | 來源 | 可用版本 | 工作狀態 |
| --- | --- | --- | --- |
${apps.map((entry) => `| ${md(entry.name)} | ${sourceLink(entry)} | ${versionLinks(entry)} | ${statusNames[entry.status]}；${md(entry.statusNote)} |`).join("\n")}

### 學習任務與共用經驗

每份任務保留一個來源入口；白板把同系列合成一列，展開後仍可找到每份素材。活動日期、狀態與對象由同一份登錄產生於[任務索引](learning-tasks/README.md#任務索引)。

| 任務 | 找得到什麼 | 可用版本 |
| --- | --- | --- |
${localTasks.map((entry) => `| ${markdownLink(entry.name, entry.source.paths[0] + "/")} | ${md(entry.description)} | ${versionLinks(entry)} |`).join("\n")}

可跨任務沿用的內容從 [shared 索引](learning-tasks/shared/README.md) 找；例如[兒童閱讀心智圖](learning-tasks/shared/reading-mind-maps.md)。這些是經驗或資源，不另外計為一份作品。

### 主線外作品入口

下列作品保留其明確分支來源，不複製或合併其他裝置的工作。網站可用與來源已整合是兩件事；最新工作狀態仍回查該分支／PR，不把遠端日期當成尚未推送的即時變動。

| 作品 | 來源 | 已有成果入口 | 工作狀態 |
| --- | --- | --- | --- |
${remoteTasks.map((entry) => `| ${md(entry.name)} | ${sourceLink(entry)}（${md(entry.source.ref)}） | ${versionLinks(entry)} | ${statusNames[entry.status]}；${md(entry.statusNote)} |`).join("\n")}

白板的 create／update 取作品來源範圍的 Git commit 日期（臺灣時間），不是活動日、發布日或孩子作答時間；create 指目前來源位置首次收錄。完整歷史不足時建置失敗，未知日期顯示「—」。遠端同步失敗保留上次已知值並明示過期；不以同步嘗試時間更新作品日期。`;
}
export function taskIndex(works, catalog) {
  const details = new Map(catalog.tasks.map((entry) => ["task:" + entry.id, entry]));
  return `此表由 [catalog.json](catalog.json) 產生，請修改登錄後重建，不直接改表格。主線外來源另標明分支；shared 不列為獨立任務。

| 任務 | 狀態 | 活動日期 | 對象 | 情境與玩法 | 可重用經驗／素材 |
| --- | --- | --- | --- | --- | --- |
${works.filter((entry) => entry.type === "task").map((entry) => {
    const task = details.get(entry.id), url = entry.source.remote ? entry.sourceUrl : task.id + "/";
    const state = statusNames[entry.status] + (entry.statusNote ? "；" + entry.statusNote : "");
    const source = entry.source.remote ? `主線外分支：${entry.source.ref}。` : "";
    return `| ${markdownLink(entry.name, url)} | ${md(state)} | ${md(entry.eventDate)} | ${md(entry.audienceLabel)} | ${md(source + entry.description)} | ${task.reusable ?? "—"} |`;
  }).join("\n")}`;
}
export function buildOutputs(root = ROOT, options = {}) {
  const cachePath = "docs/parent/work-catalog-remotes.json";
  const cache = options.cache ?? (existsSync(resolve(root, cachePath)) ? JSON.parse(read(root, cachePath)) : { schemaVersion: 1, sources: {} });
  const works = datedWorks(root, loadWorks(root), cache, options.readDates);
  return {
    "docs/parent/work-catalog.json": JSON.stringify({ schemaVersion: 1, works }, null, 2) + "\n",
    "README.md": replaceSection(read(root, "README.md"), "<!-- work-catalog:start -->", "<!-- work-catalog:end -->", overview(works)),
    "learning-tasks/README.md": replaceSection(read(root, "learning-tasks/README.md"), "<!-- task-catalog:start -->", "<!-- task-catalog:end -->", taskIndex(works, JSON.parse(read(root, "learning-tasks/catalog.json")))),
  };
}
export function build({ root = ROOT, check = false } = {}) {
  const outputs = buildOutputs(root), changed = [];
  for (const [path, content] of Object.entries(outputs)) {
    if (existsSync(resolve(root, path)) && read(root, path) === content) continue;
    changed.push(path);
    if (!check) writeFileSync(resolve(root, path), content);
  }
  if (check && changed.length) throw Error("作品目錄產物過期，請執行 node scripts/build-work-catalog.mjs：" + changed.join("、"));
  return changed;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.slice(2).some((arg) => arg !== "--check")) throw Error("用法：node scripts/build-work-catalog.mjs [--check]");
    const check = process.argv.includes("--check"), changed = build({ check });
    console.log(check ? "作品目錄與 README 已核對。" : `作品目錄已重建（${changed.length} 個產物更新）。`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
