// zhuyin child 維度 key 尋址純函式測試（票 #29）。
// 抽取：docs/zhuyin/index.html 的 <child-store-pure>。
// 身分／token 解析（bootIdentity 等）與 worker KEY_RE 契約已由 tests/test_child_store.mjs 釘住，不重複。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../docs/zhuyin/index.html", import.meta.url), "utf8");
const blk = html.match(/\/\/ <child-store-pure>([\s\S]*?)\/\/ <\/child-store-pure>/);
if (!blk) throw new Error("docs/zhuyin/index.html 找不到 <child-store-pure> 區塊");
const {
  LEGACY_STORAGE_KEY, LEGACY_CHILD, childProgressKey, childSyncMetaKey, planLegacySeed, planImportWrite,
} = new Function(blk[1] +
  "\nreturn { LEGACY_STORAGE_KEY, LEGACY_CHILD, childProgressKey, childSyncMetaKey, planLegacySeed, planImportWrite };")();

test("key 尋址：progress 與 sync meta 每 child 各自一把、互不相同", () => {
  assert.equal(childProgressKey("bingpu"), "zhuyin:progress:bingpu");
  assert.equal(childProgressKey("aiden"), "zhuyin:progress:aiden");
  assert.equal(childSyncMetaKey("bingpu"), "zhuyin:sync:bingpu");
  assert.notEqual(childProgressKey("bingpu"), childProgressKey("aiden"));
  assert.notEqual(childProgressKey("bingpu"), childSyncMetaKey("bingpu"));
  assert.notEqual(childProgressKey("bingpu"), LEGACY_STORAGE_KEY, "新格式 key 不得撞舊 key");
  assert.notEqual(childProgressKey("aiden"), "study:progress:aiden", "zhuyin 與 study 的 key 空間不得互撞");
});

test("legacy 歸屬：zhuyin 舊存檔歸弟弟（ADR-0004 per-app 歸屬，非 study 的 aiden）", () => {
  assert.equal(LEGACY_STORAGE_KEY, "aiden_zhuyin_v1");
  assert.equal(LEGACY_CHILD, "bingpu");
});

test("planLegacySeed：bingpu＋新 key 空＋舊 blob 在 → 複製到新 key（值原樣）", () => {
  const legacy = '{"schemaVersion":1,"cards":{"sym:ㄅ":{"introduced":true,"wrong":false,"practiced":3,"correct":2}}}';
  const plan = planLegacySeed("bingpu", legacy, null);
  assert.deepEqual(plan, { key: "zhuyin:progress:bingpu", value: legacy });
});

test("planLegacySeed：新 key 已有資料／舊 blob 不存在／child 非歸屬者 → 不動作", () => {
  const legacy = '{"schemaVersion":1,"cards":{}}';
  assert.equal(planLegacySeed("bingpu", legacy, '{"schemaVersion":1,"cards":{"sym:ㄇ":{}}}'), null, "新 key 已有資料不得覆蓋");
  assert.equal(planLegacySeed("bingpu", legacy, ""), null, "新 key 存過空字串也算存在，不覆蓋");
  assert.equal(planLegacySeed("bingpu", null, null), null, "無舊 blob");
  assert.equal(planLegacySeed("bingpu", "", null), null, "舊 blob 空字串視同不存在");
  assert.equal(planLegacySeed("aiden", legacy, null), null, "zhuyin 舊存檔歸 bingpu，不播種給哥哥");
  assert.equal(planLegacySeed("test-zy", legacy, null), null);
});

test("planImportWrite：只寫目標 child 的新格式 key，值＝JSON 序列化", () => {
  const obj = { schemaVersion: 1, cards: { "syl:ㄅㄚ1": { introduced: true, wrong: false, practiced: 1, correct: 1 } } };
  const plan = planImportWrite("aiden", obj);
  assert.equal(plan.key, "zhuyin:progress:aiden");
  assert.deepEqual(JSON.parse(plan.value), obj);
});

test("交錯 case：aiden 已有新格式資料後為 bingpu 匯入備份 → 目標 child 得到、另一 child 不動", () => {
  const store = new Map([
    [childProgressKey("aiden"), '{"schemaVersion":1,"cards":{"sym:ㄚ":{}}}'],
    [LEGACY_STORAGE_KEY, '{"schemaVersion":1,"cards":{"sym:ㄅ":{}}}'],
  ]);
  const imported = { schemaVersion: 1, cards: { "sym:ㄅ": {}, "sym:ㄇ": {} } };
  const plan = planImportWrite("bingpu", imported);
  store.set(plan.key, plan.value);
  assert.deepEqual(JSON.parse(store.get(childProgressKey("bingpu"))), imported, "目標 child 得到匯入資料");
  assert.equal(store.get(childProgressKey("aiden")), '{"schemaVersion":1,"cards":{"sym:ㄚ":{}}}', "另一 child 不動");
  assert.equal(store.get(LEGACY_STORAGE_KEY), '{"schemaVersion":1,"cards":{"sym:ㄅ":{}}}', "legacy blob 原樣保留");
  // 匯入不繞 legacy migration guard：匯入後 seed 也不會再覆蓋 bingpu 的新資料
  assert.equal(planLegacySeed("bingpu", store.get(LEGACY_STORAGE_KEY), store.get(childProgressKey("bingpu"))), null);
});
