// 備份格式契約純函式測試（issue #8）。
// 執行：node --test tests/test_backup_pure.mjs
// 做法：從 docs/index.html 抽出 <backup-pure> sentinel 區塊 eval，避免把純函式拆出單檔（維持單一 index.html）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
const m = html.match(/\/\/ <backup-pure>([\s\S]*?)\/\/ <\/backup-pure>/);
if (!m) throw new Error("docs/index.html 找不到 <backup-pure> 區塊");
const exported = "BACKUP_MARKER, buildBackupText, parseBackup, encodeBackup, decodeBackup, " +
  "buildShortcutDeepLink, backupLabel, readRestoreHash, isBackupOversized, BACKUP_SIZE_WARN";
const {
  BACKUP_MARKER, buildBackupText, parseBackup, encodeBackup, decodeBackup,
  buildShortcutDeepLink, backupLabel, readRestoreHash, isBackupOversized, BACKUP_SIZE_WARN,
} = new Function(m[1] + `\nreturn { ${exported} };`)();

test("buildBackupText 首行＝記號＋timecode，其後為原始 JSON", () => {
  const json = JSON.stringify({ mastered: { "3": ["a"] } });
  const txt = buildBackupText(json, new Date(2026, 5, 15, 14, 30)); // 月份 0-based：5＝6月
  const lines = txt.split("\n");
  assert.equal(lines[0], `${BACKUP_MARKER} 2026-06-15 14:30`);
  assert.equal(lines.slice(1).join("\n"), json);
});

test("buildBackupText 補零（個位數月/日/時/分）", () => {
  const txt = buildBackupText("{}", new Date(2026, 0, 5, 9, 3));
  assert.equal(txt.split("\n")[0], `${BACKUP_MARKER} 2026-01-05 09:03`);
});

test("round-trip：parseBackup(buildBackupText(state)) 深等於原 state", () => {
  const state = { mastered: { "3": ["x"] }, challenge: {}, errorBank: [], stats: {}, flagged: [] };
  assert.deepEqual(parseBackup(buildBackupText(state)), state);
});

test("round-trip：decode(encode(x)) === x（含中文、emoji/surrogate、JSON、空字串）", () => {
  for (const s of ["abc", "中文題目：射日傳說與布農族", "😀 表情 🎉 surrogate", '{"k":"值","n":3}', ""]) {
    assert.equal(decodeBackup(encodeBackup(s)), s);
  }
});

test("encodeBackup 產出 URL-safe（無 + / =）", () => {
  const b64 = encodeBackup("中文內容需要 padding 的長度測試 ~~~");
  assert.equal(/[+/=]/.test(b64), false);
});

test("parseBackup 接受純 JSON（無記號，沿用既有貼文字框）", () => {
  assert.deepEqual(parseBackup('{"mastered":{}}'), { mastered: {} });
  assert.deepEqual(parseBackup('{"challenge":{}}'), { challenge: {} });
});

test("parseBackup 對非備份文字／壞 JSON／形狀不符／非字串回 null", () => {
  assert.equal(parseBackup("隨便一段不是 JSON 的文字"), null);
  assert.equal(parseBackup(`${BACKUP_MARKER} 2026-06-15 14:30\n{壞掉的 json`), null);
  assert.equal(parseBackup('{"foo":1}'), null);   // 形狀不符：無 mastered/challenge
  assert.equal(parseBackup("[1,2,3]"), null);      // 陣列
  assert.equal(parseBackup("null"), null);          // JSON null
  assert.equal(parseBackup(42), null);              // 非字串
  assert.equal(parseBackup(""), null);              // 空字串
});

test("parseBackup 不造成 prototype pollution", () => {
  const obj = parseBackup('{"mastered":{},"__proto__":{"polluted":1}}');
  assert.ok(obj && typeof obj === "object");
  assert.equal({}.polluted, undefined);             // 全域原型未被污染
});

// ── #9 還原側純函式 ──

test("buildShortcutDeepLink 對中文捷徑名 percent-encode", () => {
  assert.equal(buildShortcutDeepLink("Aiden還原"),
    "shortcuts://run-shortcut?name=Aiden%E9%82%84%E5%8E%9F");
  // 還原可解碼回原名
  const enc = buildShortcutDeepLink("Aiden還原").split("name=")[1];
  assert.equal(decodeURIComponent(enc), "Aiden還原");
});

test("backupLabel：記號行回 timecode，無記號回 null", () => {
  assert.equal(backupLabel(`${BACKUP_MARKER} 2026-06-15 14:30\n{"mastered":{}}`), "2026-06-15 14:30");
  assert.equal(backupLabel('{"mastered":{}}'), null);
  assert.equal(backupLabel(123), null);
});

test("readRestoreHash round-trip：buildBackupText→encode→#restore= 還原回原 obj＋label", () => {
  const obj = { mastered: { "3": ["x"] }, challenge: {} };
  const text = buildBackupText(obj, new Date(2026, 5, 15, 14, 30));
  const hash = "#restore=" + encodeBackup(text);
  const res = readRestoreHash(hash);
  assert.deepEqual(res.obj, obj);
  assert.equal(res.label, "2026-06-15 14:30");
});

test("readRestoreHash：無 restore 參數／空 payload／壞 base64／形狀不符回 null", () => {
  assert.equal(readRestoreHash("#foo=bar"), null);
  assert.equal(readRestoreHash(""), null);
  assert.equal(readRestoreHash("#restore="), null);            // 空 payload（[^&]+ 不匹配）
  assert.equal(readRestoreHash("#restore=&foo=bar"), null);    // 空 payload 後接其他參數
  assert.equal(readRestoreHash("#restore=!!!not-base64!!!"), null);
  assert.equal(readRestoreHash("#restore=" + encodeBackup('{"foo":1}')), null); // 形狀不符
  assert.equal(readRestoreHash(42), null);
});

test("readRestoreHash 接受純 JSON payload（無記號）→ label null", () => {
  const res = readRestoreHash("#restore=" + encodeBackup('{"mastered":{}}'));
  assert.deepEqual(res.obj, { mastered: {} });
  assert.equal(res.label, null);
});

test("isBackupOversized：保守閾值內 false、超過 true", () => {
  assert.equal(isBackupOversized("x".repeat(BACKUP_SIZE_WARN)), false);
  assert.equal(isBackupOversized("x".repeat(BACKUP_SIZE_WARN + 1)), true);
  assert.equal(isBackupOversized(""), false);
  assert.equal(isBackupOversized(123), false);
});
