// math child 維度 key 尋址純函式測試（票 #33）。
// 抽取：docs/math/index.html 的 <child-store-pure>。
// 身分／token 解析（bootIdentity 等）與 worker KEY_RE 契約已由 tests/test_child_store.mjs 釘住，不重複。
// math 拍板從零（舊 aiden-math-progress 不遷移），故 pure 區塊刻意沒有 planLegacySeed。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../docs/math/index.html", import.meta.url), "utf8");
const blk = html.match(/\/\/ <child-store-pure>([\s\S]*?)\/\/ <\/child-store-pure>/);
if (!blk) throw new Error("docs/math/index.html 找不到 <child-store-pure> 區塊");
const { LEGACY_STORAGE_KEY, LEGACY_CHILD, childProgressKey, childSyncMetaKey } = new Function(
  blk[1] + "\nreturn { LEGACY_STORAGE_KEY, LEGACY_CHILD, childProgressKey, childSyncMetaKey };",
)();

test("key 尋址：progress 與 sync meta 每 child 各自一把、互不相同", () => {
  assert.equal(childProgressKey("aiden"), "math:progress:aiden");
  assert.equal(childProgressKey("bingpu"), "math:progress:bingpu");
  assert.equal(childSyncMetaKey("aiden"), "math:sync:aiden");
  assert.notEqual(childProgressKey("aiden"), childProgressKey("bingpu"));
  assert.notEqual(childProgressKey("aiden"), childSyncMetaKey("aiden"));
  assert.notEqual(childProgressKey("aiden"), LEGACY_STORAGE_KEY, "新格式 key 不得撞舊 key");
  assert.notEqual(childProgressKey("aiden"), "study:progress:aiden", "math 與 study 的 key 空間不得互撞");
  assert.notEqual(childProgressKey("aiden"), "spelling:progress:aiden", "math 與 spelling 的 key 空間不得互撞");
});

test("legacy 歸屬：math 舊存檔歸哥哥（ADR-0004），且從零＝pure 區塊沒有播種函式", () => {
  assert.equal(LEGACY_STORAGE_KEY, "aiden-math-progress");
  assert.equal(LEGACY_CHILD, "aiden");
  // 從零拍板（#33）：出現 planLegacySeed 代表有人補了遷移路徑，需回票對齊而不是默默上線
  assert.ok(!/planLegacySeed/.test(blk[1]), "math 拍板不遷移舊進度，<child-store-pure> 不應有 planLegacySeed");
});
