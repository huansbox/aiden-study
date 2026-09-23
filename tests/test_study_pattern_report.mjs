import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { summarize, renderReport, verifyPack, build } from "../scripts/build-study-pattern-report.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = path => JSON.parse(readFileSync(new URL("../" + path, import.meta.url), "utf8"));
function fixture() {
  const mapping = { packId: "synthetic", revision: 1, items: ["a", "b", "c"].map(appId => ({ appId, unit: 15, paperId: "paper-b", originalId: appId === "a" ? "tyk113-II-03" : appId })) };
  const classification = {
    schemaVersion: 1, taxonomyVersion: "test", countUnit: "digital_activity",
    snapshot: { packId: "synthetic", revision: 1, status: "frozen_unreleased", evidence: null, packBytes: 1, packSha256: "A".repeat(64) },
    sourceReferences: { B: { manifest: "synthetic-manifest.json", review: "synthetic-review.json", countUnit: "answer_unit" }, C: { manifest: "synthetic-c-manifest.json", review: "synthetic-c-review.json", countUnit: "review_item" } },
    patterns: ["first", "second", "empty"].map(id => ({ id, chapter: "U1", conceptId: "synthetic", concept: "合成概念", label: id, definition: "合成定義", boundary: "合成邊界" })),
    assignments: ["a", "b", "c"].map((appId, i) => ({ appId, primaryPattern: i < 2 ? "first" : "second", secondaryTags: [], sourceKind: "historical_exam", sourceGroup: "B" })),
  };
  classification.assignments[0].sourceUnits = ["tyk113-II-03a", "tyk113-II-03b", "tyk113-II-03c"];
  const sourceDocuments = { B: { review: { papers: [{ paper_id: "paper-b", record_id: "record-b", review_groups: [{ ids: ["b", "c", "tyk113-II-03a", "tyk113-II-03b", "tyk113-II-03c"] }] }] }, manifest: { papers: [{ record_id: "record-b" }] } }, C: { review: { papers: [{ paper_id: "paper-c", items: [{ id: "c-item" }] }] }, manifest: { targets: [{ paper_id: "paper-c" }] } } };
  return { classification, mapping, sourceDocuments };
}

test("現有公開分類完整覆蓋 mapping；generated report 可由公開資料重算", () => {
  const classification = read("data/study/g4-s1-math-u1/pattern-classification.json");
  const mapping = read("data/study/g4-s1-math-u1/mapping-metadata.json");
  const summary = build({ root, check: true });
  assert.equal(summary.reduce((n, s) => n + s.activities, 0), mapping.items.length);
  assert.equal(summary.reduce((n, s) => n + s.observedPatterns, 0), new Set(classification.assignments.map(a => a.primaryPattern)).size);
  assert.equal(summary.reduce((n, s) => n + s.singleton + s.repeated, 0), new Set(classification.assignments.map(a => a.primaryPattern)).size);
});

test("rev5 mapping 追加自然時，數學分類仍只統計既有題", () => {
  const { classification, mapping, sourceDocuments } = fixture();
  mapping.revision = 5;
  mapping.items.push({ appId: "science-g4s1-synthetic-S1-01-v1", unit: 20, paperId: "synthetic-science", originalId: "synthetic-S1-01" });
  const summary = summarize(classification, mapping, sourceDocuments);
  assert.equal(summary.reduce((n, row) => n + row.activities, 0), 3);
  assert.equal(summary.reduce((n, row) => n + row.observedPatterns, 0), 2);
});

test("漏 ID、多 ID、重複 assignment ID 都拒絕，不能產生低估或重計的報告", () => {
  for (const mutate of [c => c.assignments.pop(), c => c.assignments.push({ ...c.assignments[0], appId: "extra" }), c => c.assignments.push({ ...c.assignments[0] })]) {
    const { classification, mapping, sourceDocuments } = fixture();
    mutate(classification);
    assert.throws(() => summarize(classification, mapping, sourceDocuments), /ID 集合不一致|識別碼重複/);
  }
});

test("mapping 重複 ID 不能被 Map 靜默合併", () => {
  const { classification, mapping, sourceDocuments } = fixture();
  mapping.items.push({ ...mapping.items[0] });
  assert.throws(() => summarize(classification, mapping, sourceDocuments), /mapping 識別碼重複/);
});

test("錯 unit、不存在 pattern 與重複 pattern 都拒絕", () => {
  let { classification, mapping, sourceDocuments } = fixture();
  mapping.items[0].unit = 16;
  assert.throws(() => summarize(classification, mapping, sourceDocuments), /unit 不一致/);
  ({ classification, mapping, sourceDocuments } = fixture());
  classification.assignments[0].primaryPattern = "missing";
  assert.throws(() => summarize(classification, mapping, sourceDocuments), /不存在的 pattern/);
  ({ classification, mapping, sourceDocuments } = fixture());
  classification.patterns.push({ ...classification.patterns[0] });
  assert.throws(() => summarize(classification, mapping, sourceDocuments), /pattern 識別碼重複/);
});

test("secondary 與相依 sourceUnits 不重計；零題定義不算已出現型數", () => {
  const { classification, mapping, sourceDocuments } = fixture();
  classification.assignments[0].secondaryTags = ["second", "another-concept"];
  classification.assignments[0].sourceUnits = ["tyk113-II-03a", "tyk113-II-03b", "tyk113-II-03c"];
  const [chapter] = summarize(classification, mapping, sourceDocuments);
  assert.equal(chapter.activities, 3);
  assert.equal(chapter.observedPatterns, 2);
  assert.equal(chapter.singleton, 1);
  assert.equal(chapter.repeated, 1);
  assert.equal(chapter.zero, 1);
  assert.deepEqual(chapter.rows.map(r => r.count), [2, 1, 0]);
  assert.deepEqual(chapter.sourceGroupCounts, { B: 3, C: 0 });
  assert.deepEqual(chapter.rows[0].sourceGroupCounts, { B: 2, C: 0 });
  assert.match(renderReport(classification, [chapter]), /\| U1 \| 合成概念 \| 2 \| 3 \| first：2；second：1；empty：0 \|/);
});

test("來源 B 誤標 C、缺失 source ID、無對應 manifest 都拒絕", () => {
  let { classification, mapping, sourceDocuments } = fixture();
  classification.assignments[0].sourceGroup = "C";
  assert.throws(() => summarize(classification, mapping, sourceDocuments), /review 找不到 mapping paperId/);
  ({ classification, mapping, sourceDocuments } = fixture());
  mapping.items[0].originalId = "missing-source";
  delete classification.assignments[0].sourceUnits;
  assert.throws(() => summarize(classification, mapping, sourceDocuments), /找不到 source ID/);
  ({ classification, mapping, sourceDocuments } = fixture());
  sourceDocuments.B.review.papers[0].review_groups[0].ids.pop();
  assert.throws(() => summarize(classification, mapping, sourceDocuments), /找不到 source ID/);
  ({ classification, mapping, sourceDocuments } = fixture());
  classification.assignments[0].sourceUnits = ["b"];
  assert.throws(() => summarize(classification, mapping, sourceDocuments), /sourceUnits 與核准題組不一致/);
  ({ classification, mapping, sourceDocuments } = fixture());
  sourceDocuments.B.manifest.papers = [];
  assert.throws(() => summarize(classification, mapping, sourceDocuments), /無法追溯到對應 manifest/);
  ({ classification, mapping, sourceDocuments } = fixture());
  classification.assignments[0].sourceUnits.pop();
  assert.throws(() => summarize(classification, mapping, sourceDocuments), /sourceUnits 與核准題組不一致/);
  ({ classification, mapping, sourceDocuments } = fixture());
  mapping.items[1].originalId = "tyk113-II-03";
  classification.assignments[1].sourceUnits = [...classification.assignments[0].sourceUnits];
  assert.throws(() => summarize(classification, mapping, sourceDocuments), /重複占用/);
});

test("來源數由 assignments 在 pattern、章節與報告層加總，不使用原卷格數", () => {
  const { classification, mapping, sourceDocuments } = fixture();
  classification.assignments[1].sourceGroup = "C";
  classification.assignments[1].sourceKind = "agent_variant";
  mapping.items[1].paperId = "paper-c";
  mapping.items[1].originalId = "c-item";
  const summary = summarize(classification, mapping, sourceDocuments);
  assert.deepEqual(summary[0].sourceGroupCounts, { B: 2, C: 1 });
  assert.deepEqual(summary[0].rows[0].sourceGroupCounts, { B: 1, C: 1 });
  assert.deepEqual(summary[0].sourceKindCounts, { historical_exam: 2, agent_variant: 1 });
  assert.deepEqual(summary[0].rows[0].sourceKindCounts, { historical_exam: 1, agent_variant: 1 });
  assert.match(renderReport(classification, summary), /歷屆題 2 個 activity；agent 變式 1 個 activity/);
  assert.match(renderReport(classification, summary), /B 卷 2 個 activity；C 卷 1 個 activity/);
});

test("11bc 合併契約只包含 b/c，不吞入原有 a/d 活動", () => {
  const { classification, mapping, sourceDocuments } = fixture();
  const prefix = "tyk113-II-11";
  mapping.items.forEach((item, i) => { item.originalId = prefix + ["a", "d", "bc"][i]; });
  classification.assignments.forEach(item => { delete item.sourceUnits; });
  classification.assignments[2].sourceUnits = [prefix + "b", prefix + "c"];
  sourceDocuments.B.review.papers[0].review_groups[0].ids = ["a", "b", "c", "d"].map(suffix => prefix + suffix);
  assert.equal(summarize(classification, mapping, sourceDocuments)[0].activities, 3);
  classification.assignments[2].sourceUnits.pop();
  assert.throws(() => summarize(classification, mapping, sourceDocuments), /sourceUnits 與核准題組不一致/);
  classification.assignments[2].sourceUnits = [...sourceDocuments.B.review.papers[0].review_groups[0].ids];
  assert.throws(() => summarize(classification, mapping, sourceDocuments), /sourceUnits 與核准題組不一致/);
});

test("不同 revision、缺分類邊界與不一致概念歸屬不產生報告", () => {
  let { classification, mapping, sourceDocuments } = fixture();
  mapping.revision = 0;
  assert.throws(() => summarize(classification, mapping, sourceDocuments), /revision 與 mapping 不一致/);
  ({ classification, mapping, sourceDocuments } = fixture());
  delete classification.patterns[0].boundary;
  assert.throws(() => summarize(classification, mapping, sourceDocuments), /boundary/);
  ({ classification, mapping, sourceDocuments } = fixture());
  classification.patterns[0].chapter = "U2";
  assert.throws(() => summarize(classification, mapping, sourceDocuments), /細概念的章節/);
});

test("未發布快照明確標示候選；已發布快照必須有證據 pointer", () => {
  const { classification, mapping, sourceDocuments } = fixture();
  const output = renderReport(classification, summarize(classification, mapping, sourceDocuments));
  assert.match(output, /尚未發布的候選統計/);
  assert.doesNotMatch(output, /狀態：已發布內容/);
  classification.snapshot.status = "released_documented";
  assert.throws(() => summarize(classification, mapping, sourceDocuments), /缺少證據入口/);
});

test("optional 私有 pack 驗證完整集合、unit 和 bytes/hash，錯誤不洩露內容", () => {
  const { classification, mapping, sourceDocuments } = fixture();
  const pack = { packId: "synthetic", revision: 1, questions: mapping.items.map(m => ({ id: m.appId, unit: m.unit, text: "PRIVATE_SENTINEL" })) };
  const bytes = Buffer.from(JSON.stringify(pack));
  classification.snapshot.packBytes = bytes.length;
  classification.snapshot.packSha256 = createHash("sha256").update(bytes).digest("hex").toUpperCase();
  assert.doesNotThrow(() => verifyPack(bytes, classification, mapping));
  const omitted = structuredClone(pack); omitted.questions.pop();
  assert.throws(() => verifyPack(Buffer.from(JSON.stringify(omitted)), classification, mapping), /ID 集合不一致/);
  const wrongUnit = structuredClone(pack); wrongUnit.questions[0].unit = 16;
  assert.throws(() => verifyPack(Buffer.from(JSON.stringify(wrongUnit)), classification, mapping), /unit 與 mapping 不一致/);
  assert.throws(() => verifyPack(Buffer.concat([bytes, Buffer.from(" ")]), classification, mapping), /bytes／SHA256 不一致/);
  assert.throws(() => verifyPack(Buffer.from('{"PRIVATE_SENTINEL"'), classification, mapping), error => !error.message.includes("PRIVATE_SENTINEL") && /不是有效 JSON/.test(error.message));
  const output = renderReport(classification, summarize(classification, mapping, sourceDocuments));
  assert.doesNotMatch(output, /PRIVATE_SENTINEL/);
});
