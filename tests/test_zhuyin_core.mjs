// 注音 app 核心純函式測試（issue #17）。
// 執行：node --test tests/test_zhuyin_core.mjs
// 做法：從 docs/zhuyin/index.html 抽出 <zhuyin-core-pure> sentinel 區塊 eval（維持單檔 app）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../docs/zhuyin/index.html", import.meta.url), "utf8");
const m = html.match(/\/\/ <zhuyin-core-pure>([\s\S]*?)\/\/ <\/zhuyin-core-pure>/);
if (!m) throw new Error("docs/zhuyin/index.html 找不到 <zhuyin-core-pure> 區塊");
const {
  zyCardId, zyResolveAudio, zyLoadProgress, zyCardState, zyShuffle,
  zyBuildBatch, zyEnteredGlyphs, zyCardKind, zyPickChoices, zyOnQuizResult, zyAdvanceQueue,
} = new Function('"use strict";' + m[1] + `
return { zyCardId, zyResolveAudio, zyLoadProgress, zyCardState, zyShuffle,
  zyBuildBatch, zyEnteredGlyphs, zyCardKind, zyPickChoices, zyOnQuizResult, zyAdvanceQueue };`)();

const zero = () => 0;       // 洗牌成「尾捲到頭」的固定序、選位取 0
const high = () => 0.999;   // 選位取末位

// 測試資料 helper
const AUDIO = { "ㄅ": "sym-b", "ㄇ": "sym-m", "ㄚ": "sym-a", "ㄈ": "sym-f", "ㄨ": "sym-u", "ㄆ": "sym-p" };
const ORDER6 = ["ㄅ", "ㄇ", "ㄚ", "ㄈ", "ㄨ", "ㄆ"];
const allAudio = () => true;
function prog(cards) { return { schemaVersion: 1, cards }; }
function card(over) { return { introduced: false, wrong: false, practiced: 0, correct: 0, ...over }; }

// ── zyLoadProgress ──

test("zyLoadProgress：null／壞 JSON／版本不符 → 空檔", () => {
  const empty = { schemaVersion: 1, cards: {} };
  assert.deepEqual(zyLoadProgress(null), empty);
  assert.deepEqual(zyLoadProgress("not json"), empty);
  assert.deepEqual(zyLoadProgress('{"schemaVersion":2,"cards":{}}'), empty);
  assert.deepEqual(zyLoadProgress('{"cards":{}}'), empty);
  assert.deepEqual(zyLoadProgress('{"schemaVersion":1,"cards":[]}'), empty);
});

test("zyLoadProgress：合法存檔原樣載入", () => {
  const p = { schemaVersion: 1, cards: { "sym:ㄅ": card({ introduced: true }) } };
  assert.deepEqual(zyLoadProgress(JSON.stringify(p)), p);
});

// ── zyResolveAudio（fallback 鏈）──

test("zyResolveAudio：取第一個可用 key、跳過缺檔、全缺回 null", () => {
  const has = (k) => k === "b";
  assert.equal(zyResolveAudio(["a", "b"], has), "b");
  assert.equal(zyResolveAudio(["b", "a"], has), "b");
  assert.equal(zyResolveAudio(["a", "c"], has), null);
  assert.equal(zyResolveAudio([], has), null);
  assert.equal(zyResolveAudio([null, "b"], has), "b");
});

// ── zyBuildBatch ──

test("組批：全新進度 → 新卡按進場序、上限 max", () => {
  const b = zyBuildBatch({ entryOrder: ORDER6, symbolAudio: AUDIO, progress: prog({}), hasAudio: allAudio, max: 5, rng: zero });
  assert.deepEqual(b, ["ㄅ", "ㄇ", "ㄚ", "ㄈ", "ㄨ"]);
});

test("組批：可出卡數 N＜max 時 batch＝N", () => {
  const b = zyBuildBatch({ entryOrder: ["ㄅ", "ㄇ", "ㄚ"], symbolAudio: AUDIO, progress: prog({}), hasAudio: allAudio, max: 5, rng: zero });
  assert.deepEqual(b, ["ㄅ", "ㄇ", "ㄚ"]);
});

test("組批：題目提示音缺檔的卡不入批", () => {
  const has = (k) => k !== "sym-m";
  const b = zyBuildBatch({ entryOrder: ["ㄅ", "ㄇ", "ㄚ"], symbolAudio: AUDIO, progress: prog({}), hasAudio: has, max: 5, rng: zero });
  assert.deepEqual(b, ["ㄅ", "ㄚ"]);
});

test("組批：全缺檔 → 空批", () => {
  const b = zyBuildBatch({ entryOrder: ["ㄅ", "ㄇ"], symbolAudio: AUDIO, progress: prog({}), hasAudio: () => false, max: 5, rng: zero });
  assert.deepEqual(b, []);
});

test("組批：錯題優先 → 新卡 → 複習卡", () => {
  const p = prog({
    "sym:ㄅ": card({ introduced: true }),                 // 複習
    "sym:ㄇ": card({ introduced: true, wrong: true }),    // 錯題
    // ㄚ 未介紹＝新卡
  });
  const b = zyBuildBatch({ entryOrder: ["ㄅ", "ㄇ", "ㄚ"], symbolAudio: AUDIO, progress: p, hasAudio: allAudio, max: 5, rng: zero });
  assert.deepEqual(b, ["ㄇ", "ㄚ", "ㄅ"]);
});

test("組批：全部已學無錯 → 複習批（rng 洗牌）", () => {
  const p = prog(Object.fromEntries(["ㄅ", "ㄇ", "ㄚ"].map((g) => ["sym:" + g, card({ introduced: true })])));
  const b1 = zyBuildBatch({ entryOrder: ["ㄅ", "ㄇ", "ㄚ"], symbolAudio: AUDIO, progress: p, hasAudio: allAudio, max: 5, rng: zero });
  assert.equal(b1.length, 3);
  assert.deepEqual([...b1].sort(), ["ㄅ", "ㄇ", "ㄚ"].sort());
});

// ── zyCardKind／zyEnteredGlyphs ──

test("卡片型態：未介紹→intro；已介紹且池≥2→quiz；已介紹但池<2→intro（重看）", () => {
  const p = prog({ "sym:ㄅ": card({ introduced: true }) });
  assert.equal(zyCardKind("ㄇ", p, 1), "intro");
  assert.equal(zyCardKind("ㄅ", p, 1), "intro");   // 池只有自己，湊不出選擇題
  assert.equal(zyCardKind("ㄅ", p, 2), "quiz");
});

test("zyEnteredGlyphs：只列已介紹、依進場序", () => {
  const p = prog({ "sym:ㄚ": card({ introduced: true }), "sym:ㄅ": card({ introduced: true }) });
  assert.deepEqual(zyEnteredGlyphs(["ㄅ", "ㄇ", "ㄚ"], p), ["ㄅ", "ㄚ"]);
});

// ── zyPickChoices（干擾項不變量）──

test("干擾項：正解恰一次、無重複、全部來自已進場池", () => {
  const entered = ["ㄅ", "ㄇ", "ㄚ", "ㄈ", "ㄨ"];
  for (const rng of [zero, high, Math.random]) {
    const c = zyPickChoices("ㄇ", entered, rng);
    assert.equal(c.length, 4);
    assert.equal(c.filter((g) => g === "ㄇ").length, 1);
    assert.equal(new Set(c).size, 4);
    for (const g of c) assert.ok(entered.includes(g));
  }
});

test("干擾項：池不足 4 降 3／2 選一；池 1 或目標未進場回 null", () => {
  assert.equal(zyPickChoices("ㄅ", ["ㄅ", "ㄇ", "ㄚ"], zero).length, 3);
  assert.equal(zyPickChoices("ㄅ", ["ㄅ", "ㄇ"], zero).length, 2);
  assert.equal(zyPickChoices("ㄅ", ["ㄅ"], zero), null);
  assert.equal(zyPickChoices("ㄈ", ["ㄅ", "ㄇ"], zero), null);
});

test("干擾項：正解位置由 rng 決定", () => {
  assert.equal(zyPickChoices("ㄅ", ["ㄅ", "ㄇ", "ㄚ", "ㄈ"], zero)[0], "ㄅ");
  const c = zyPickChoices("ㄅ", ["ㄅ", "ㄇ", "ㄚ", "ㄈ"], high);
  assert.equal(c[c.length - 1], "ㄅ");
});

// ── zyOnQuizResult ──

test("判分映射：本批沒錯過且第一下就對＝答對、清 wrong；點錯＝記錯", () => {
  const st = card({ introduced: true, wrong: true, practiced: 2, correct: 1 });
  assert.deepEqual(zyOnQuizResult(st, true, false), { introduced: true, wrong: false, practiced: 3, correct: 2 });
  assert.deepEqual(zyOnQuizResult(st, false, true), { introduced: true, wrong: true, practiced: 3, correct: 1 });
});

test("判分映射：批尾複驗答對＝計答對但 wrong 保留（下批仍優先重出）", () => {
  const st = card({ introduced: true, wrong: true, practiced: 3, correct: 1 });
  assert.deepEqual(zyOnQuizResult(st, true, true), { introduced: true, wrong: true, practiced: 4, correct: 2 });
});

test("判分映射：未知欄位原樣保留（擴充批新欄位不被判分洗掉）", () => {
  const st = { ...card({ introduced: true }), suspend: "2026-08-01" };
  assert.equal(zyOnQuizResult(st, true, false).suspend, "2026-08-01");
});

// ── zyAdvanceQueue ──

test("批內佇列：答對移出、答錯排批尾、單卡答錯留著重出", () => {
  assert.deepEqual(zyAdvanceQueue(["ㄅ", "ㄇ"], true), ["ㄇ"]);
  assert.deepEqual(zyAdvanceQueue(["ㄅ", "ㄇ"], false), ["ㄇ", "ㄅ"]);
  assert.deepEqual(zyAdvanceQueue(["ㄅ"], false), ["ㄅ"]);
  assert.deepEqual(zyAdvanceQueue(["ㄅ"], true), []);
});

// ── zyShuffle／zyCardState 基本行為 ──

test("zyShuffle：不改原陣列、元素不變", () => {
  const a = ["x", "y", "z"];
  const s = zyShuffle(a, Math.random);
  assert.deepEqual(a, ["x", "y", "z"]);
  assert.deepEqual([...s].sort(), ["x", "y", "z"].sort());
});

test("zyCardState：無記錄回預設值", () => {
  assert.deepEqual(zyCardState(prog({}), zyCardId("ㄅ")), card({}));
});
