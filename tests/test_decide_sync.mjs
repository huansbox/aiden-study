import test from "node:test";
import assert from "node:assert/strict";
import { decideSync, classifyRemote } from "../worker/decide-sync.mjs";

const L = (syncedRev, dirty, schemaVersion = 1, lastWriteId = undefined) => ({
  syncedRev,
  dirty,
  schemaVersion,
  lastWriteId,
});
const OK = (rev, data = null, schemaVersion = undefined, writeId = undefined) => ({
  kind: "ok",
  rev,
  data,
  schemaVersion,
  writeId,
});

// 全矩陣：錯誤類 → 版本比對 → reseed → rev 三向（含 own-write 例外）
const MATRIX = [
  // 錯誤類（與 rev 無關）
  [L(0, true), { kind: "network" }, "offline"],
  [L(5, false), { kind: "network" }, "offline"],
  [L(0, true), { kind: "auth" }, "auth-error"],
  [L(3, true), { kind: "http" }, "data-error"],
  [L(3, false), { kind: "bad-payload" }, "data-error"],
  // 合法空（rev 0、從未同步過）落在一般 rev 規則：本地髒 → 播種 push；乾淨 → none
  [L(0, true), OK(0, null), "push"],
  [L(0, false), OK(0, null), "none"],
  // 雲端被清空（rev 0＋data null 但曾同步過）→ reseed，髒或乾淨皆然，不卡死
  [L(5, true), OK(0, null), "reseed"],
  [L(5, false), OK(0, null), "reseed"],
  // rev 對齊
  [L(2, true), OK(2, { a: 1 }), "push"],
  [L(2, false), OK(2, { a: 1 }), "none"],
  // 遠端領先
  [L(2, false), OK(5, { a: 1 }), "adopt"],
  [L(2, true), OK(5, { a: 1 }), "conflict-adopt"],
  // own-write 例外：遠端領先的那筆是自己的 beacon（writeId 命中）→ 續 push
  [L(2, true, 1, "w-mine"), OK(3, { a: 1 }, undefined, "w-mine"), "push"],
  [L(2, true, 1, "w-mine"), OK(3, { a: 1 }, undefined, "w-other"), "conflict-adopt"],
  [L(2, false, 1, "w-mine"), OK(3, { a: 1 }, undefined, "w-mine"), "adopt"],
  // 遠端落後（KV 舊讀；rev>0 才算舊讀，rev 0 歸 reseed）
  [L(5, true), OK(2, { a: 1 }), "retry"],
  [L(5, false), OK(2, { a: 1 }), "retry"],
  // schemaVersion 防護：遠端比 app 新 → 擋在 rev 規則之前（含 rev 對齊時）
  [L(1, false, 1), OK(9, { schemaVersion: 2 }, 2), "schema-block"],
  [L(1, true, 1), OK(9, { schemaVersion: 2 }, 2), "schema-block"],
  [L(2, true, 1), OK(2, { schemaVersion: 2 }, 2), "schema-block"],
  // 遠端 schemaVersion 相同 → 不擋
  [L(1, false, 2), OK(9, { schemaVersion: 2 }, 2), "adopt"],
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

// 分類器矩陣：HTTP 原始結果 → remote.kind（shipped 真相源，#28 client 與契約測試共用）
const CLASSIFY = [
  [{ threw: true }, "network"],
  [{ threw: false, status: 401, jsonOk: true, body: { error: "bad token" } }, "auth"],
  // 403 只會來自 Cloudflare 邊緣層，不歸 auth（重輸 token 無效）
  [{ threw: false, status: 403, jsonOk: true, body: {} }, "http"],
  [{ threw: false, status: 404, jsonOk: true, body: {} }, "http"],
  [{ threw: false, status: 500, jsonOk: true, body: { error: "internal" } }, "http"],
  [{ threw: false, status: 200, jsonOk: false }, "bad-payload"],
  [{ threw: false, status: 200, jsonOk: true, body: null }, "bad-payload"],
  // 200＋合法 JSON 但 rev 缺／型別壞＝壞 payload，不得落入 retry 空轉
  [{ threw: false, status: 200, jsonOk: true, body: {} }, "bad-payload"],
  [{ threw: false, status: 200, jsonOk: true, body: { rev: "3", data: null } }, "bad-payload"],
  [{ threw: false, status: 200, jsonOk: true, body: { rev: 3.5, data: null } }, "bad-payload"],
];

test("classifyRemote 分類矩陣", () => {
  for (const [input, expected] of CLASSIFY) {
    const got = classifyRemote(input);
    assert.equal(got.kind, expected, `${JSON.stringify(input)} → ${got.kind}（預期 ${expected}）`);
  }
});

test("classifyRemote 正常 200 抽取 rev/data/schemaVersion/writeId", () => {
  const got = classifyRemote({
    threw: false,
    status: 200,
    jsonOk: true,
    body: { rev: 4, data: { schemaVersion: 2, mastered: ["q1"] }, writeId: "w9" },
  });
  assert.deepEqual(got, {
    kind: "ok",
    rev: 4,
    data: { schemaVersion: 2, mastered: ["q1"] },
    schemaVersion: 2,
    writeId: "w9",
  });
  // 合法空：data null → schemaVersion undefined、data 保持 null
  const empty = classifyRemote({ threw: false, status: 200, jsonOk: true, body: { rev: 0, data: null } });
  assert.deepEqual(empty, { kind: "ok", rev: 0, data: null, schemaVersion: undefined, writeId: undefined });
});
