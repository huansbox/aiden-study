import test from "node:test";
import assert from "node:assert/strict";
import { decideSync } from "../worker/decide-sync.mjs";

const L = (syncedRev, dirty, schemaVersion = 1) => ({ syncedRev, dirty, schemaVersion });
const OK = (rev, data = null, schemaVersion = undefined) => ({ kind: "ok", rev, data, schemaVersion });

// 全矩陣：錯誤類 → 版本比對 → rev 三向
const MATRIX = [
  // 錯誤類（與 rev 無關）
  [L(0, true), { kind: "network" }, "offline"],
  [L(5, false), { kind: "network" }, "offline"],
  [L(0, true), { kind: "auth" }, "auth-error"],
  [L(3, true), { kind: "http" }, "data-error"],
  [L(3, false), { kind: "bad-payload" }, "data-error"],
  // 合法空（rev 0）落在一般 rev 規則：本地髒 → 播種 push；乾淨 → none
  [L(0, true), OK(0, null), "push"],
  [L(0, false), OK(0, null), "none"],
  // rev 對齊
  [L(2, true), OK(2, { a: 1 }), "push"],
  [L(2, false), OK(2, { a: 1 }), "none"],
  // 遠端領先
  [L(2, false), OK(5, { a: 1 }), "adopt"],
  [L(2, true), OK(5, { a: 1 }), "conflict-adopt"],
  // 遠端落後（KV 舊讀）
  [L(5, true), OK(2, { a: 1 }), "retry"],
  [L(5, false), OK(2, { a: 1 }), "retry"],
  // schemaVersion 防護：遠端比 app 新 → 擋在 rev 規則之前
  [L(1, false, 1), OK(9, { schemaVersion: 2 }, 2), "schema-block"],
  [L(1, true, 1), OK(9, { schemaVersion: 2 }, 2), "schema-block"],
  // 遠端 schemaVersion 相同或較舊 → 不擋
  [L(1, false, 2), OK(9, { schemaVersion: 2 }, 2), "adopt"],
  // 遠端 data null（合法空）不觸發 schema 檢查
  [L(0, true, 1), OK(0, null, undefined), "push"],
];

test("decideSync 全矩陣", () => {
  for (const [local, remote, expected] of MATRIX) {
    const got = decideSync(local, remote);
    assert.equal(
      got.type,
      expected,
      `local=${JSON.stringify(local)} remote=${JSON.stringify(remote)} → ${got.type}（預期 ${expected}）`,
    );
  }
});
