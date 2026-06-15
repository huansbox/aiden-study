// 獎勵插畫選圖純函式測試（見 docs-dev/reward-illustrations-design.md）。
// 執行：node --test tests/test_reward_pick.mjs
// 做法：從 docs/index.html 抽出 <reward-pick-pure> sentinel 區塊 eval（維持單一 index.html）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
const m = html.match(/\/\/ <reward-pick-pure>([\s\S]*?)\/\/ <\/reward-pick-pure>/);
if (!m) throw new Error("docs/index.html 找不到 <reward-pick-pure> 區塊");
const { rwPoolFor, rwMergedPool, rwDominantKey, rwResolvePool, rwDrawFromBag } =
  new Function(m[1] + "\nreturn { rwPoolFor, rwMergedPool, rwDominantKey, rwResolvePool, rwDrawFromBag };")();

const zero = () => 0;        // 永遠取剩餘清單第 0 個
const high = () => 0.999;    // 取末位

// ── rwPoolFor / rwMergedPool ──

test("rwPoolFor：缺 manifest/缺 key 回空陣列、不炸", () => {
  assert.deepEqual(rwPoolFor(null, "風"), []);
  assert.deepEqual(rwPoolFor({ pools: {} }, "風"), []);
  assert.deepEqual(rwPoolFor({ pools: { "風": ["a"] } }, "風"), ["a"]);
});

test("rwMergedPool：多 key 合併、缺 key 跳過", () => {
  const m = { pools: { "風": ["w1", "w2"], "雨量降雨": ["r1"] } };
  assert.deepEqual(rwMergedPool(m, ["風", "雨量降雨", "無此池"]), ["w1", "w2", "r1"]);
});

// ── rwDominantKey ──

test("rwDominantKey：取出現最多者", () => {
  assert.equal(rwDominantKey(["a", "a", "b"], zero), "a");
});

test("rwDominantKey：平手用 rng 在並列中挑", () => {
  assert.equal(rwDominantKey(["a", "a", "b", "b"], zero), "a");
  assert.equal(rwDominantKey(["a", "a", "b", "b"], high), "b");
});

test("rwDominantKey：空輸入回 null", () => {
  assert.equal(rwDominantKey([], zero), null);
  assert.equal(rwDominantKey(null, zero), null);
});

// ── rwResolvePool：roll-up 四層 ──

const M = { pools: { "風": ["w1"], "__generic__": ["g1", "g2"] } };

test("resolve batch：subtopic 命中 → 直接該池", () => {
  const r = rwResolvePool(M, { kind: "batch", subtopic: "風", unitKeys: ["風", "雨量降雨"], subjectKeys: ["風"] });
  assert.deepEqual(r, { key: "風", items: ["w1"] });
});

test("resolve batch：subtopic 無池 → roll-up 到 unit 合併池", () => {
  const r = rwResolvePool(M, { kind: "batch", subtopic: "雨量降雨", unitKeys: ["風", "雨量降雨"], subjectKeys: ["風"] });
  assert.equal(r.key, "__unit__風,雨量降雨");
  assert.deepEqual(r.items, ["w1"]);
});

test("resolve：unit 也無池 → roll-up 到 subject 合併池", () => {
  const r = rwResolvePool(M, { kind: "batch", subtopic: "雨量降雨", unitKeys: ["雨量降雨"], subjectKeys: ["雨量降雨", "風"] });
  assert.equal(r.key, "__subject__");
  assert.deepEqual(r.items, ["w1"]);
});

test("resolve：subtopic/unit/subject 皆無池 → __generic__", () => {
  const r = rwResolvePool(M, { kind: "batch", subtopic: "雨量降雨", unitKeys: ["雨量降雨"], subjectKeys: ["雨量降雨"] });
  assert.equal(r.key, "__generic__");
  assert.deepEqual(r.items, ["g1", "g2"]);
});

test("resolve unit kind：用合併池（無 subtopic 直挑）", () => {
  const r = rwResolvePool(M, { kind: "unit", unitKeys: ["風"], subjectKeys: ["風"] });
  assert.equal(r.key, "__unit__風");
  assert.deepEqual(r.items, ["w1"]);
});

test("resolve error kind：永遠 __generic__", () => {
  const r = rwResolvePool(M, { kind: "error" });
  assert.deepEqual(r, { key: "__generic__", items: ["g1", "g2"] });
});

test("resolve：全空 manifest → key null、items 空", () => {
  const r = rwResolvePool({ pools: {} }, { kind: "batch", subtopic: "風", unitKeys: ["風"], subjectKeys: ["風"] });
  assert.deepEqual(r, { key: null, items: [] });
});

// ── rwDrawFromBag：shuffle-bag ──

test("drawFromBag：抽完整池才重裝（rng=0 → 依序 a,b,c 後重來 a）", () => {
  const bag = {};
  const items = ["a", "b", "c"];
  const seq = [0, 1, 2, 3].map(() => rwDrawFromBag(bag, "k", items, zero));
  assert.deepEqual(seq.slice(0, 3).sort(), ["a", "b", "c"]); // 前三張涵蓋整池、不重複
  assert.equal(new Set(seq.slice(0, 3)).size, 3);
  assert.equal(seq[3], "a");                                  // 第四張才重裝重抽
});

test("drawFromBag：不更動傳入的 items（用副本）", () => {
  const bag = {};
  const items = ["a", "b"];
  rwDrawFromBag(bag, "k", items, zero);
  assert.deepEqual(items, ["a", "b"]);
});

test("drawFromBag：key null 或空池回 null", () => {
  assert.equal(rwDrawFromBag({}, null, [], zero), null);
  assert.equal(rwDrawFromBag({}, "k", [], zero), null);
});
