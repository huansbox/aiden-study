// 注音 app 核心純函式測試（issue #17 骨架＋聽音辨認；issue #18 示範卡＋聽音組字）。
// 執行：node --test tests/test_zhuyin_core.mjs
// 做法：從 docs/zhuyin/index.html 抽出 <zhuyin-core-pure> sentinel 區塊 eval（維持單檔 app）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../docs/zhuyin/index.html", import.meta.url), "utf8");
const m = html.match(/\/\/ <zhuyin-core-pure>([\s\S]*?)\/\/ <\/zhuyin-core-pure>/);
if (!m) throw new Error("docs/zhuyin/index.html 找不到 <zhuyin-core-pure> 區塊");
const {
  zyCardId, zySylId, zyResolveAudio, zyLoadProgress, zyCardState, zyShuffle,
  zyBuildPool, zyBuildBatch, zyEnteredGlyphs, zyCardKind, zyPickChoices,
  zyOnQuizResult, zyAdvanceQueue, zyDemoChain, zyToneOptions, zyBuildStep,
} = new Function('"use strict";' + m[1] + `
return { zyCardId, zySylId, zyResolveAudio, zyLoadProgress, zyCardState, zyShuffle,
  zyBuildPool, zyBuildBatch, zyEnteredGlyphs, zyCardKind, zyPickChoices,
  zyOnQuizResult, zyAdvanceQueue, zyDemoChain, zyToneOptions, zyBuildStep };`)();

const zero = () => 0;       // 洗牌成固定序、選位取 0
const high = () => 0.999;   // 選位取末位

// 測試資料 helper
const AUDIO = { "ㄅ": "sym-b", "ㄇ": "sym-m", "ㄚ": "sym-a", "ㄈ": "sym-f", "ㄨ": "sym-u", "ㄆ": "sym-p" };
const ORDER3 = ["ㄅ", "ㄇ", "ㄚ"];
const SYLS = [
  { onset: "ㄅ", rime: "ㄚ", tone: 1, audio: "syl-ba1" },
  { onset: "ㄅ", rime: "ㄚ", tone: 2, audio: "syl-ba2" },
  { onset: "ㄅ", rime: "ㄚ", tone: 3, audio: "syl-ba3" },
  { onset: "ㄅ", rime: "ㄚ", tone: 4, audio: "syl-ba4" },
  { onset: "ㄇ", rime: "ㄚ", tone: 1, audio: "syl-ma1" },
  { onset: "ㄇ", rime: "ㄚ", tone: 3, audio: "syl-ma3" },
];
const allAudio = () => true;
function prog(cards) { return { schemaVersion: 1, cards }; }
function card(over) { return { introduced: false, wrong: false, practiced: 0, correct: 0, ...over }; }
function introducedAll(glyphs) {
  return prog(Object.fromEntries(glyphs.map((g) => ["sym:" + g, card({ introduced: true })])));
}

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

// ── zySylId ──

test("zySylId：聲韻調組合為卡 id", () => {
  assert.equal(zySylId(SYLS[3]), "syl:ㄅㄚ4");
});

// ── zyBuildPool（題池展開）──

test("題池：無符號進場 → 只有符號卡、依進場序", () => {
  const pool = zyBuildPool(ORDER3, AUDIO, SYLS, prog({}));
  assert.deepEqual(pool.map((c) => c.id), ["sym:ㄅ", "sym:ㄇ", "sym:ㄚ"]);
  assert.equal(pool[0].promptKey, "sym-b");
});

test("題池：聲韻都進場的音節才進池（依 content 順序）", () => {
  const p = introducedAll(["ㄅ", "ㄚ"]); // ㄇ 未進場
  const pool = zyBuildPool(ORDER3, AUDIO, SYLS, p);
  assert.deepEqual(pool.map((c) => c.id), [
    "sym:ㄅ", "sym:ㄇ", "sym:ㄚ",
    "syl:ㄅㄚ1", "syl:ㄅㄚ2", "syl:ㄅㄚ3", "syl:ㄅㄚ4",
  ]);
  assert.equal(pool[3].kind, "syl");
  assert.equal(pool[3].promptKey, "syl-ba1");
});

test("題池：全部進場 → 全音節入池", () => {
  const pool = zyBuildPool(ORDER3, AUDIO, SYLS, introducedAll(ORDER3));
  assert.equal(pool.length, 3 + SYLS.length);
});

// ── zyBuildBatch ──

test("組批：全新進度 → 新卡按池序、上限 max", () => {
  const pool = zyBuildPool(["ㄅ", "ㄇ", "ㄚ", "ㄈ", "ㄨ", "ㄆ"], AUDIO, [], prog({}));
  const b = zyBuildBatch({ pool, progress: prog({}), hasAudio: allAudio, max: 5, rng: zero });
  assert.deepEqual(b.map((c) => c.glyph), ["ㄅ", "ㄇ", "ㄚ", "ㄈ", "ㄨ"]);
});

test("組批：可出卡數 N＜max 時 batch＝N", () => {
  const pool = zyBuildPool(ORDER3, AUDIO, [], prog({}));
  const b = zyBuildBatch({ pool, progress: prog({}), hasAudio: allAudio, max: 5, rng: zero });
  assert.equal(b.length, 3);
});

test("組批：題目提示音缺檔的卡不入批（符號與音節同規則）", () => {
  const p = introducedAll(ORDER3);
  const pool = zyBuildPool(ORDER3, AUDIO, SYLS, p);
  const has = (k) => k !== "sym-m" && k !== "syl-ba2";
  const b = zyBuildBatch({ pool, progress: p, hasAudio: has, max: 99, rng: zero });
  const ids = b.map((c) => c.id);
  assert.ok(!ids.includes("sym:ㄇ"), ids.join(","));
  assert.ok(!ids.includes("syl:ㄅㄚ2"), ids.join(","));
  assert.equal(b.length, pool.length - 2);
});

test("組批：全缺檔 → 空批", () => {
  const pool = zyBuildPool(ORDER3, AUDIO, [], prog({}));
  assert.deepEqual(zyBuildBatch({ pool, progress: prog({}), hasAudio: () => false, max: 5, rng: zero }), []);
});

test("組批：錯題優先 → 新卡 → 複習卡", () => {
  const p = prog({
    "sym:ㄅ": card({ introduced: true }),                 // 複習
    "sym:ㄇ": card({ introduced: true, wrong: true }),    // 錯題
    // ㄚ 未介紹＝新卡
  });
  const pool = zyBuildPool(ORDER3, AUDIO, [], p);
  const b = zyBuildBatch({ pool, progress: p, hasAudio: allAudio, max: 5, rng: zero });
  assert.deepEqual(b.map((c) => c.glyph), ["ㄇ", "ㄚ", "ㄅ"]);
});

test("組批：符號全學會後 → 新音節卡（示範）按池序優先於複習符號", () => {
  const p = introducedAll(ORDER3);
  const pool = zyBuildPool(ORDER3, AUDIO, SYLS, p);
  const b = zyBuildBatch({ pool, progress: p, hasAudio: allAudio, max: 5, rng: zero });
  assert.deepEqual(b.map((c) => c.id), ["syl:ㄅㄚ1", "syl:ㄅㄚ2", "syl:ㄅㄚ3", "syl:ㄅㄚ4", "syl:ㄇㄚ1"]);
});

// ── zyCardKind／zyEnteredGlyphs ──

const symCard = (g) => ({ id: "sym:" + g, kind: "sym", glyph: g, promptKey: AUDIO[g] });
const sylCard = (y) => ({ id: zySylId(y), kind: "syl", syl: y, promptKey: y.audio });

test("卡片型態（符號）：未介紹→intro；已介紹且池≥2→quiz；池<2→intro（重看）", () => {
  const p = prog({ "sym:ㄅ": card({ introduced: true }) });
  assert.equal(zyCardKind(symCard("ㄇ"), p, 1), "intro");
  assert.equal(zyCardKind(symCard("ㄅ"), p, 1), "intro");
  assert.equal(zyCardKind(symCard("ㄅ"), p, 2), "quiz");
});

test("卡片型態（音節）：首次→demo（不判分示範）；已示範→build（聽音組字）", () => {
  const y = SYLS[0];
  assert.equal(zyCardKind(sylCard(y), prog({}), 3), "demo");
  const p = prog({ [zySylId(y)]: card({ introduced: true }) });
  assert.equal(zyCardKind(sylCard(y), p, 3), "build");
});

test("zyEnteredGlyphs：只列已介紹、依進場序", () => {
  const p = prog({ "sym:ㄚ": card({ introduced: true }), "sym:ㄅ": card({ introduced: true }) });
  assert.deepEqual(zyEnteredGlyphs(ORDER3, p), ["ㄅ", "ㄚ"]);
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

// ── zyDemoChain（分段慢速示範／慢慢聽）──

test("示範鏈：素材齊 → 聲符、韻符、整音節三段", () => {
  assert.deepEqual(zyDemoChain(SYLS[5], AUDIO, allAudio), ["sym-m", "sym-a", "syl-ma3"]);
});

test("示範鏈：任一段缺檔 → fallback 常速整音節；整音節也缺 → 空", () => {
  const noM = (k) => k !== "sym-m";
  assert.deepEqual(zyDemoChain(SYLS[5], AUDIO, noM), ["syl-ma3"]);
  const noA = (k) => k !== "sym-a";
  assert.deepEqual(zyDemoChain(SYLS[5], AUDIO, noA), ["syl-ma3"]);
  const noSyl = (k) => k !== "syl-ma3";
  assert.deepEqual(zyDemoChain(SYLS[5], AUDIO, noSyl), []);
});

// ── zyToneOptions（聲調步四顆鈕）──

test("聲調選項：恆四顆、audio 取同聲韻變體、content 沒收錄該調→null", () => {
  const opts = zyToneOptions(SYLS[5], SYLS); // ㄇㄚ 只收錄 1、3 聲
  assert.deepEqual(opts.map((o) => o.tone), [1, 2, 3, 4]);
  assert.equal(opts[0].audio, "syl-ma1");
  assert.equal(opts[1].audio, null);
  assert.equal(opts[2].audio, "syl-ma3");
  assert.equal(opts[3].audio, null);
});

// ── zyBuildStep（組字判分狀態機：狀態×事件逐格）──

test("狀態機：onset 對→rime（confirm-onset）；onset 錯→留在 onset、hadWrong", () => {
  assert.deepEqual(zyBuildStep({ phase: "onset", hadWrong: false }, true),
    { phase: "rime", hadWrong: false, effect: "confirm-onset" });
  assert.deepEqual(zyBuildStep({ phase: "onset", hadWrong: false }, false),
    { phase: "onset", hadWrong: true, effect: "retry" });
});

test("狀態機：rime 對→tone（confirm-rime）；rime 錯→留在 rime、hadWrong", () => {
  assert.deepEqual(zyBuildStep({ phase: "rime", hadWrong: false }, true),
    { phase: "tone", hadWrong: false, effect: "confirm-rime" });
  assert.deepEqual(zyBuildStep({ phase: "rime", hadWrong: false }, false),
    { phase: "rime", hadWrong: true, effect: "retry" });
});

test("狀態機：tone 對→done（celebrate）；tone 錯→留在 tone、hadWrong", () => {
  assert.deepEqual(zyBuildStep({ phase: "tone", hadWrong: false }, true),
    { phase: "done", hadWrong: false, effect: "celebrate" });
  assert.deepEqual(zyBuildStep({ phase: "tone", hadWrong: false }, false),
    { phase: "tone", hadWrong: true, effect: "retry" });
});

test("狀態機：hadWrong 一路保留（中途錯過→最後 celebrate 仍 hadWrong＝整題記錯）", () => {
  let st = { phase: "onset", hadWrong: false };
  st = zyBuildStep(st, false);            // onset 錯
  st = zyBuildStep(st, true);             // onset 對
  st = zyBuildStep(st, true);             // rime 對
  const end = zyBuildStep(st, true);      // tone 對
  assert.deepEqual(end, { phase: "done", hadWrong: true, effect: "celebrate" });
});

test("狀態機：done 後任何事件＝noop 不轉移（無未定義轉移）", () => {
  assert.deepEqual(zyBuildStep({ phase: "done", hadWrong: false }, true),
    { phase: "done", hadWrong: false, effect: "noop" });
  assert.deepEqual(zyBuildStep({ phase: "done", hadWrong: true }, false),
    { phase: "done", hadWrong: true, effect: "noop" });
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
  assert.deepEqual(zyAdvanceQueue(["a", "b"], true), ["b"]);
  assert.deepEqual(zyAdvanceQueue(["a", "b"], false), ["b", "a"]);
  assert.deepEqual(zyAdvanceQueue(["a"], false), ["a"]);
  assert.deepEqual(zyAdvanceQueue(["a"], true), []);
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
