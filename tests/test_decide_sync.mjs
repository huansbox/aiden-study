// 同步協定純函式測試：從 docs/shared/sync-v1.js 抽出 <sync-pure> sentinel 區塊 eval
// （shipped 真相源；比照 test_backup_pure 對 index.html 的做法）。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../docs/shared/sync-v1.js", import.meta.url), "utf8");
const m = src.match(/\/\/ <sync-pure>([\s\S]*?)\/\/ <\/sync-pure>/);
if (!m) throw new Error("docs/shared/sync-v1.js 找不到 <sync-pure> 區塊");
const { decideSync, classifyRemote } = new Function(m[1] + "\nreturn { classifyRemote, decideSync };")();

const L = (syncedRev, dirty, schemaVersion = 1, lastWriteId = undefined, syncedEpoch = null, dataNull = false) => ({
  syncedRev,
  dirty,
  schemaVersion,
  lastWriteId,
  syncedEpoch,
  dataNull,
});
const OK = (rev, data = null, schemaVersion = undefined, writeId = undefined, epoch = null) => ({
  kind: "ok",
  rev,
  data,
  schemaVersion,
  writeId,
  epoch,
});

// 全矩陣：錯誤類 → 版本比對 → reseed → 換代 → rev 三向（含 own-write 例外）
// 第 4 欄＝預期的 action.regen（省略＝false）
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

  // ── 換代（票 #37）：雲端遺失後由他機搶先重新播種，rev 從 1 重數 ──
  // 這正是舊版永久卡死的情境（遠端 rev 落後、data 非 null → 落到 retry）：改判以本地重新播種
  [L(50, false, 1, undefined, "E1"), OK(1, { a: 1 }, undefined, "w-a", "E2"), "push", true],
  [L(50, true, 1, undefined, "E1"), OK(1, { a: 1 }, undefined, "w-a", "E2"), "push", true],
  // 跨代 rev 不可比：遠端 rev 領先也不得走 adopt／conflict-adopt 的 rev 比較
  [L(2, false, 1, undefined, "E1"), OK(7, { a: 1 }, undefined, "w-a", "E2"), "push", true],
  [L(2, true, 1, undefined, "E1"), OK(7, { a: 1 }, undefined, "w-a", "E2"), "push", true],
  // 同一枚章＝KV 最終一致的舊讀（非換代）→ 照舊 retry，不得誤觸發
  [L(5, true, 1, undefined, "E1"), OK(2, { a: 1 }, undefined, "w-a", "E1"), "retry"],
  [L(5, false, 1, undefined, "E1"), OK(2, { a: 1 }, undefined, "w-a", "E1"), "retry"],
  // 兩端皆須為新協定才觸發：本地無章（新裝置／舊 client）或遠端無章（舊 worker）→ 行為同改動前
  [L(5, true, 1, undefined, null), OK(2, { a: 1 }, undefined, "w-a", "E2"), "retry"],
  [L(5, true, 1, undefined, "E1"), OK(2, { a: 1 }, undefined, "w-a", null), "retry"],
  // 換代不得越過 schema 防護（遠端資料版本較新仍優先保本地）
  [L(50, true, 1, undefined, "E1"), OK(1, { schemaVersion: 2 }, 2, "w-a", "E2"), "schema-block"],
  // ── 換代守門（PR #43 裁決 2026-07-16）：本機進度亡佚（loadData null、meta 尚存）──
  // 「本機＝最完整殘存」前提不成立 → 不得拿空資料覆蓋他機剛播種的雲端，改走 adopt 取回
  [L(50, false, 1, undefined, "E1", true), OK(1, { a: 1 }, undefined, "w-a", "E2"), "adopt", true],
  [L(50, true, 1, undefined, "E1", true), OK(1, { a: 1 }, undefined, "w-a", "E2"), "adopt", true],
  // 遠端也空（換了代卻無資料）→ 無可 adopt，照舊 push（行為同守門前）
  [L(50, false, 1, undefined, "E1", true), OK(1, null, undefined, "w-a", "E2"), "push", true],
  // dataNull 只作用於換代分支：同一枚章＋遠端落後仍是 KV 舊讀 → retry，不得被守門劫走
  [L(5, false, 1, undefined, "E1", true), OK(2, { a: 1 }, undefined, "w-a", "E1"), "retry"],
  // 雲端整包空掉（尚無人重新播種）＝ reseed，不是換代：空 key 根本沒有章
  [L(50, false, 1, undefined, "E1"), OK(0, null, undefined, undefined, null), "reseed"],
];

test("decideSync 全矩陣", () => {
  for (const [local, remote, expected, expectRegen = false] of MATRIX) {
    const got = decideSync(local, remote);
    const where = `local=${JSON.stringify(local)} remote=${JSON.stringify(remote)}`;
    assert.equal(got.type, expected, `${where} → ${got.type}（預期 ${expected}）`);
    assert.equal(!!got.regen, expectRegen, `${where} → regen=${!!got.regen}（預期 ${expectRegen}）`);
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

test("classifyRemote 正常 200 抽取 rev/data/schemaVersion/writeId/epoch", () => {
  const got = classifyRemote({
    threw: false,
    status: 200,
    jsonOk: true,
    body: { rev: 4, data: { schemaVersion: 2, mastered: ["q1"] }, writeId: "w9", epoch: "E1" },
  });
  assert.deepEqual(got, {
    kind: "ok",
    rev: 4,
    data: { schemaVersion: 2, mastered: ["q1"] },
    schemaVersion: 2,
    writeId: "w9",
    epoch: "E1",
  });
  // 合法空：data null → schemaVersion undefined、data 保持 null、空 key 無章
  const empty = classifyRemote({ threw: false, status: 200, jsonOk: true, body: { rev: 0, data: null } });
  assert.deepEqual(empty, {
    kind: "ok",
    rev: 0,
    data: null,
    schemaVersion: undefined,
    writeId: undefined,
    epoch: null,
  });
  // 舊 worker 不回 epoch／型別壞 → null（不得留 undefined 讓換代判定誤觸發）
  const legacy = classifyRemote({
    threw: false,
    status: 200,
    jsonOk: true,
    body: { rev: 4, data: { a: 1 }, writeId: "w9", epoch: 42 },
  });
  assert.equal(legacy.epoch, null);
});
