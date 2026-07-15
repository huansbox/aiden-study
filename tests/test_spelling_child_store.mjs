// spelling child 維度 key 尋址純函式測試（票 #33）。
// 抽取：docs/spelling/index.html 的 <child-store-pure>。
// 身分／token 解析（bootIdentity 等）與 worker KEY_RE 契約已由 tests/test_child_store.mjs 釘住，不重複。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../docs/spelling/index.html", import.meta.url), "utf8");
const blk = html.match(/\/\/ <child-store-pure>([\s\S]*?)\/\/ <\/child-store-pure>/);
if (!blk) throw new Error("docs/spelling/index.html 找不到 <child-store-pure> 區塊");
const { LEGACY_STORAGE_KEY, LEGACY_CHILD, childProgressKey, childSyncMetaKey, planLegacySeed } = new Function(
  blk[1] + "\nreturn { LEGACY_STORAGE_KEY, LEGACY_CHILD, childProgressKey, childSyncMetaKey, planLegacySeed };",
)();

test("key 尋址：progress 與 sync meta 每 child 各自一把、互不相同", () => {
  assert.equal(childProgressKey("aiden"), "spelling:progress:aiden");
  assert.equal(childProgressKey("bingpu"), "spelling:progress:bingpu");
  assert.equal(childSyncMetaKey("aiden"), "spelling:sync:aiden");
  assert.notEqual(childProgressKey("aiden"), childProgressKey("bingpu"));
  assert.notEqual(childProgressKey("aiden"), childSyncMetaKey("aiden"));
  assert.notEqual(childProgressKey("aiden"), LEGACY_STORAGE_KEY, "新格式 key 不得撞舊 key");
  assert.notEqual(childProgressKey("aiden"), "study:progress:aiden", "spelling 與 study 的 key 空間不得互撞");
});

test("legacy 歸屬：spelling 舊存檔（v4）歸哥哥（ADR-0004 per-app 歸屬）", () => {
  assert.equal(LEGACY_STORAGE_KEY, "spelling_bee_progress_v4");
  assert.equal(LEGACY_CHILD, "aiden");
});

test("planLegacySeed：aiden＋新 key 空＋舊 v4 在 → 複製到新 key（值原樣）", () => {
  const legacy = '{"currentBatchIndex":2,"maxUnlockedBatchIndex":3,"rehearsalQueue":[],"mode":"practice","errorBank":["cliff"],"practiceLog":{"total":{"ace":4},"daily":{}}}';
  const plan = planLegacySeed("aiden", legacy, null);
  assert.deepEqual(plan, { key: "spelling:progress:aiden", value: legacy });
});

test("planLegacySeed：新 key 已有資料／舊 blob 不存在／child 非歸屬者 → 不動作", () => {
  const legacy = '{"currentBatchIndex":0}';
  assert.equal(planLegacySeed("aiden", legacy, '{"currentBatchIndex":1}'), null, "新 key 已有資料不得覆蓋");
  assert.equal(planLegacySeed("aiden", legacy, ""), null, "新 key 存過空字串也算存在，不覆蓋");
  assert.equal(planLegacySeed("aiden", null, null), null, "無舊 blob");
  assert.equal(planLegacySeed("aiden", "", null), null, "舊 blob 空字串視同不存在");
  assert.equal(planLegacySeed("bingpu", legacy, null), null, "spelling 舊存檔歸 aiden，不播種給弟弟");
  assert.equal(planLegacySeed("test-sp", legacy, null), null);
});

test("播種冪等：seed 落地後再跑 planLegacySeed → 不動作", () => {
  const legacy = '{"currentBatchIndex":2}';
  const store = new Map([[LEGACY_STORAGE_KEY, legacy]]);
  const plan = planLegacySeed("aiden", store.get(LEGACY_STORAGE_KEY), store.get(childProgressKey("aiden")) ?? null);
  store.set(plan.key, plan.value);
  assert.equal(
    planLegacySeed("aiden", store.get(LEGACY_STORAGE_KEY), store.get(childProgressKey("aiden"))),
    null,
    "第二次開站不得重複播種（否則會蓋掉之後的新進度）",
  );
  assert.equal(store.get(LEGACY_STORAGE_KEY), legacy, "legacy blob 原樣保留（複製不搬移）");
});
