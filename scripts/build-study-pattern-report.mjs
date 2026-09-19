import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DATA = "data/study/g4-s1-math-u1/";
export const REPORT = "docs-dev/grade4-math-pattern-counts.md";
const CHAPTERS = ["一億以內的數", "整數乘法", "角度", "整數除法", "公里"];
// Reviewed activity-to-answer-unit contracts, not an inference from section headings or ID prefixes.
// II-11a and II-11d remain independent activities; the new synthetic 11bc group contains only b/c.
const MERGED_SOURCE_UNITS = {
  "tyk113-II-03": ["tyk113-II-03a", "tyk113-II-03b", "tyk113-II-03c"],
  "tyk113-II-08": ["tyk113-II-08a", "tyk113-II-08b"],
  "tyk113-II-11bc": ["tyk113-II-11b", "tyk113-II-11c"],
  "anh114-II-07": ["anh114-II-07a", "anh114-II-07b"],
  "anh112-I-03": ["anh112-I-03a", "anh112-I-03b", "anh112-I-03c"],
};
const requireThat = (condition, message) => { if (!condition) throw Error(message); };
const nonempty = value => typeof value === "string" && value.trim().length > 0;
const md = value => String(value).replace(/[|<>]/g, "\\$&").replace(/\r?\n/g, " ");
function uniqueMap(items, key, label) {
  requireThat(Array.isArray(items), `${label} 必須是陣列`);
  const result = new Map();
  for (const item of items) {
    requireThat(item && nonempty(item[key]), `${label} 缺少識別碼`);
    requireThat(!result.has(item[key]), `${label} 識別碼重複`);
    result.set(item[key], item);
  }
  return result;
}
function sameIds(actual, expected, label) {
  requireThat(actual.size === expected.size && [...actual.keys()].every(id => expected.has(id)), `${label} ID 集合不一致（漏題或多題）`);
}
function json(text, label) {
  try { return JSON.parse(text); } catch { throw Error(`${label} 不是有效 JSON`); }
}

// Only public fields enter the report. Secondary tags and source answer units never increase activity counts.
export function summarize(classification, mapping, sourceDocuments) {
  requireThat(classification.schemaVersion === 1, "不支援的分類 schemaVersion");
  requireThat(nonempty(classification.taxonomyVersion), "缺少 taxonomyVersion");
  requireThat(classification.countUnit === "digital_activity", "計數單位必須是 digital_activity");
  requireThat(classification.snapshot?.packId === mapping.packId && classification.snapshot?.revision === mapping.revision, "packId／revision 與 mapping 不一致");
  requireThat(Number.isSafeInteger(classification.snapshot.revision) && classification.snapshot.revision > 0, "revision 無效");
  requireThat(["released_documented", "frozen_unreleased"].includes(classification.snapshot?.status), "發布狀態無效");
  requireThat(classification.snapshot.status !== "released_documented" || nonempty(classification.snapshot.evidence), "已發布快照缺少證據入口");
  requireThat(Number.isSafeInteger(classification.snapshot.packBytes) && classification.snapshot.packBytes > 0 && /^[A-F0-9]{64}$/.test(classification.snapshot.packSha256), "題包指紋無效");
  const patterns = uniqueMap(classification.patterns, "id", "pattern");
  const items = uniqueMap(classification.assignments, "appId", "assignment");
  const mapped = uniqueMap(mapping.items, "appId", "mapping");
  sameIds(items, mapped, "assignment／mapping");
  const concepts = new Map();
  for (const pattern of patterns.values()) {
    requireThat(/^U[1-5]$/.test(pattern.chapter), "pattern 章節無效");
    for (const key of ["conceptId", "concept", "label", "definition", "boundary"]) requireThat(nonempty(pattern[key]), `pattern 缺少 ${key}`);
    const previous = concepts.get(pattern.conceptId);
    requireThat(!previous || (previous.chapter === pattern.chapter && previous.concept === pattern.concept), "同一細概念的章節或名稱不一致");
    concepts.set(pattern.conceptId, pattern);
  }
  const counts = new Map([...patterns.keys()].map(id => [id, 0]));
  const sourceGroupCounts = new Map([...patterns.keys()].map(id => [id, { B: 0, C: 0 }]));
  const sourceKindCounts = new Map([...patterns.keys()].map(id => [id, { historical_exam: 0, agent_variant: 0 }]));
  const sourceOwners = new Set();
  for (const item of items.values()) {
    const pattern = patterns.get(item.primaryPattern), source = classification.sourceReferences?.[item.sourceGroup];
    requireThat(pattern, "assignment 引用不存在的 pattern");
    requireThat(["historical_exam", "agent_variant"].includes(item.sourceKind), "sourceKind 必須區分歷屆題與 agent 變式");
    requireThat(mapped.get(item.appId).unit === Number(pattern.chapter.slice(1)) + 14, "assignment 的 pattern 與 mapping unit 不一致");
    requireThat(Array.isArray(item.secondaryTags) && item.secondaryTags.every(nonempty) && new Set(item.secondaryTags).size === item.secondaryTags.length, "secondaryTags 無效或重複");
    requireThat(source && nonempty(source.manifest) && nonempty(source.review) && ["answer_unit", "review_item"].includes(source.countUnit), "來源 pointer 或計數口徑無效");
    requireThat(item.sourceUnits === undefined || (Array.isArray(item.sourceUnits) && item.sourceUnits.length > 0 && item.sourceUnits.every(nonempty) && new Set(item.sourceUnits).size === item.sourceUnits.length), "sourceUnits 無效或重複");
    const documents = sourceDocuments?.[item.sourceGroup], origin = mapped.get(item.appId);
    requireThat(["B", "C"].includes(item.sourceGroup) && documents?.review && documents?.manifest, "缺少對應來源 review／manifest");
    requireThat(source.countUnit === (item.sourceGroup === "B" ? "answer_unit" : "review_item"), "sourceGroup 與來源計數口徑不一致");
    const paper = documents.review.papers.find(p => p.paper_id === origin.paperId);
    requireThat(paper, "sourceGroup 的 review 找不到 mapping paperId");
    const manifestPaper = item.sourceGroup === "B"
      ? documents.manifest.papers.find(p => p.record_id === paper.record_id)
      : documents.manifest.targets.find(p => p.paper_id === origin.paperId);
    requireThat(manifestPaper, "mapping paperId 無法追溯到對應 manifest");
    const atomicIds = new Set(item.sourceGroup === "B" ? paper.review_groups.flatMap(group => group.ids) : paper.items.map(row => row.id));
    const assignedIds = item.sourceUnits ?? [origin.originalId];
    const expectedIds = Object.hasOwn(MERGED_SOURCE_UNITS, origin.originalId) ? MERGED_SOURCE_UNITS[origin.originalId] : [origin.originalId];
    requireThat(assignedIds.length === expectedIds.length && expectedIds.every(id => assignedIds.includes(id)), "atomic sourceUnits 與核准題組不一致，不能遺漏或擴大相依作答格");
    for (const id of assignedIds) {
      requireThat(atomicIds.has(id), "來源 review 找不到 source ID");
      const sourceKey = JSON.stringify([item.sourceGroup, origin.paperId, id]);
      requireThat(!sourceOwners.has(sourceKey), "不同 assignments 重複占用同一 atomic source ID");
      sourceOwners.add(sourceKey);
    }
    counts.set(item.primaryPattern, counts.get(item.primaryPattern) + 1);
    sourceGroupCounts.get(item.primaryPattern)[item.sourceGroup]++;
    sourceKindCounts.get(item.primaryPattern)[item.sourceKind]++;
  }
  return CHAPTERS.map((label, index) => {
    const chapter = `U${index + 1}`;
    const rows = [...patterns.values()].filter(p => p.chapter === chapter).map(p => ({ ...p, count: counts.get(p.id), sourceGroupCounts: sourceGroupCounts.get(p.id), sourceKindCounts: sourceKindCounts.get(p.id) }));
    return { chapter, label, activities: rows.reduce((sum, row) => sum + row.count, 0),
      sourceGroupCounts: { B: rows.reduce((sum, row) => sum + row.sourceGroupCounts.B, 0), C: rows.reduce((sum, row) => sum + row.sourceGroupCounts.C, 0) },
      sourceKindCounts: { historical_exam: rows.reduce((sum, row) => sum + row.sourceKindCounts.historical_exam, 0), agent_variant: rows.reduce((sum, row) => sum + row.sourceKindCounts.agent_variant, 0) },
      observedPatterns: rows.filter(row => row.count > 0).length,
      zero: rows.filter(row => row.count === 0).length,
      singleton: rows.filter(row => row.count === 1).length,
      repeated: rows.filter(row => row.count >= 2).length, rows };
  });
}

// Optional read-only identity check; content validation remains with the existing private-pack verifier.
export function verifyPack(bytes, classification, mapping) {
  const pack = json(bytes.toString("utf8"), "私有題包");
  requireThat(pack.packId === classification.snapshot.packId && pack.revision === classification.snapshot.revision, "私有題包 packId／revision 不一致");
  const questions = uniqueMap(pack.questions, "id", "私有題包");
  const items = uniqueMap(classification.assignments, "appId", "assignment");
  sameIds(questions, items, "私有題包／assignment");
  const mapped = uniqueMap(mapping.items, "appId", "mapping");
  sameIds(questions, mapped, "私有題包／mapping");
  for (const [id, question] of questions) requireThat(question.unit === mapped.get(id).unit, "私有題包 unit 與 mapping 不一致");
  requireThat(bytes.length === classification.snapshot.packBytes && createHash("sha256").update(bytes).digest("hex").toUpperCase() === classification.snapshot.packSha256, "私有題包 bytes／SHA256 不一致");
}

export function renderReport(classification, summary) {
  const released = classification.snapshot.status === "released_documented";
  const count = summary.reduce((n, chapter) => n + chapter.activities, 0);
  const types = summary.reduce((n, chapter) => n + chapter.observedPatterns, 0);
  const conceptRows = summary.flatMap(chapter => [...new Set(chapter.rows.map(row => row.conceptId))].map(id => {
    const patterns = chapter.rows.filter(row => row.conceptId === id);
    return `| ${chapter.chapter} | ${md(patterns[0].concept)} | ${patterns.filter(row => row.count > 0).length} | ${patterns.reduce((sum, row) => sum + row.count, 0)} | ${patterns.map(row => `${md(row.label)}：${row.count}`).join("；")} |`;
  }));
  const lines = ["# 四上數學題型與題數", "",
    `此報告由公開分類與逐題對照產生，請勿手改。快照：rev${classification.snapshot.revision}／${classification.taxonomyVersion}，${count} 個數位 activity、${types} 種本批已辨識模式。`, "",
    released ? `狀態：已發布內容的封存統計；發布依據見[發布紀錄](../${classification.snapshot.evidence})。本腳本不連正式服務，不能當作即時上線查核。` : "狀態：已凍結但尚未發布的候選統計，不能計入已上線題數。", "",
    "一個 activity 就是一個完整作答題組；相依多空只算一次。每題只有一個主要模式，次要概念不重複計數。模式不是選擇／填空介面，也不因只換數字或情境而拆分。", "",
    "以下只說明本批內容覆蓋，不是數學全部題型，也不是孩子的精熟度；沒有讀取孩子作答紀錄。", "",
    `內容來源：歷屆題 ${summary.reduce((sum, row) => sum + row.sourceKindCounts.historical_exam, 0)} 個 activity；agent 變式 ${summary.reduce((sum, row) => sum + row.sourceKindCounts.agent_variant, 0)} 個 activity。本報告只做分類與統計，不生成題目。`, "",
    `來源分布：B 卷 ${summary.reduce((sum, row) => sum + row.sourceGroupCounts.B, 0)} 個 activity；C 卷 ${summary.reduce((sum, row) => sum + row.sourceGroupCounts.C, 0)} 個 activity。兩者此處都按數位題組計數，沒有混加原卷作答格與 review item。`, "",
    "| 章節 | 已出現模式 | 題組數 | 各一題的模式 | 至少兩題的模式 | 已定義但零題的模式 |", "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...summary.map(s => `| ${s.chapter} ${s.label} | ${s.observedPatterns} | ${s.activities} | ${s.singleton} | ${s.repeated} | ${s.zero} |`), "",
    "| 章節 | 細概念 | 已出現模式數 | 題組總數 | 各型題組數 |", "| --- | --- | ---: | ---: | --- |",
    ...conceptRows, "",
    "## 如何安排補題", "",
    "先檢查已有歷屆卷能否補足零題或單題模式，再決定哪些仍需少量 agent 變式。至少兩題只代表有重複練習素材，不保證題量足夠或孩子已學會。尚未完整核算可轉入的剩餘題量，不宣稱現有來源已耗盡。", "",
    "角圖、量角器讀值、作圖、多解集合、直式與驗算是不同的呈現或作答能力；原卷有題但 App 尚無法保留目標時，先補功能，不能用 AI 文字題當成已補齊。待範圍確認的公里加減及後續章節也不列為立即補滿項目。", "",
    "| 補題方向 | 優先處理 |", "| --- | --- |",
    "| 先查現有歷屆來源 | 位值變化／數列、商位數／餘數情境、乘法估算／因數反推：優先核已收原卷中尚未轉入的題目，保留大題共用指示與完整作答目標。 |",
    "| 先補功能 | 角圖、量角器讀值與作圖：來源已有候選，但本批角度模式數不能代表這些圖形能力已齊全；集合、直式及驗算同樣分開處理。 |",
    "| 可考慮少量 agent 變式 | 現有來源核完仍孤立的位值差量、規律、分組／等分、進一／捨餘及單位換算，可選能獨立驗算的變式；生活量感需另外核尺度，且必須標示原創變式。 |", "",
    "以上是內容補充優先順序，並非依孩子作答表現開出的補強清單。來源候選見 [B review](../learning-tasks/grade4-sem1-math-exam1/source/question-scope-review.json)、[C review](../learning-tasks/grade4-sem1-math-exam1/source/supplemental-question-review.json)；能否轉入仍需核原卷及作答能力。", "",
    "表內零題只涵蓋分類檔已定義的模式；尚待原卷核對的候選家族未計入，零題欄全為零也不表示課程完整。原卷 B 按作答格、C 按 review item 的筆數不與 activity 混加。", "",
    "## 分類與重算入口", "",
    "- [模式定義、邊界與逐 appId 分類](../data/study/g4-s1-math-u1/pattern-classification.json)",
    "- [原有來源 mapping](../data/study/g4-s1-math-u1/mapping-metadata.json)", "",
    "來源 manifest／review 保留官方答案可取得性與出版社標籤證據；有官方答案不等於本次重新驗算過每題。分類獨立於 production subtopic，不改既有進度語意。", "",
    "重建：`node scripts/build-study-pattern-report.mjs`；檢查報告未過期：`node scripts/build-study-pattern-report.mjs --check`。可加 `--pack <私有 pack.json 路徑>`，唯讀核對完整 ID、unit、revision 與指紋；不輸出題文，亦不取代既有題包內容驗證。", "",
    `題包封存指紋：${classification.snapshot.packBytes} bytes，SHA256 \`${classification.snapshot.packSha256}\`。`, ""];
  return lines.join("\n");
}

export function build({ root = ROOT, check = false, packPath } = {}) {
  const read = path => json(readFileSync(resolve(root, path), "utf8"), path);
  const classification = read(DATA + "pattern-classification.json"), mapping = read(DATA + "mapping-metadata.json");
  const sourceDocuments = Object.fromEntries(Object.entries(classification.sourceReferences).map(([kind, source]) => [kind, { manifest: read(source.manifest), review: read(source.review) }]));
  const summary = summarize(classification, mapping, sourceDocuments);
  if (packPath) verifyPack(readFileSync(resolve(root, packPath)), classification, mapping);
  const output = renderReport(classification, summary), target = resolve(root, REPORT);
  if (check) requireThat(readFileSync(target, "utf8").replace(/\r\n/g, "\n") === output, "題型報告已過期，請重建");
  else writeFileSync(target, output);
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const options = {};
    for (let i = 2; i < process.argv.length; i++) {
      if (process.argv[i] === "--check") options.check = true;
      else if (process.argv[i] === "--pack" && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) options.packPath = process.argv[++i];
      else throw Error("用法：node scripts/build-study-pattern-report.mjs [--check] [--pack <path>]");
    }
    const summary = build(options);
    console.log(`題型報告${options.check ? "檢查" : "重建"}通過：${summary.reduce((n, s) => n + s.activities, 0)} activities。`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
