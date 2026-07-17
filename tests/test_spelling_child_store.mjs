// spelling 的 wiring 設定 pin（票 #33；#40-B 起 key 尋址移共用 wiring-v1.js）。
// key 尋址與播種語意的行為測試在 tests/test_wiring_pure.mjs（單一真相源）；
// 這裡 pin 住 spelling 的 <wiring-config>——重接線不得默默改 key／歸屬（改了＝進度看似消失）。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../docs/spelling/index.html", import.meta.url), "utf8");
const cfgBlk = html.match(/\/\/ <wiring-config>[\s\S]*?const WIRING_CONFIG = (\{[\s\S]*?\});[\s\S]*?\/\/ <\/wiring-config>/);
if (!cfgBlk) throw new Error("docs/spelling/index.html 找不到 <wiring-config> 區塊");
const CONFIG = new Function(`return ${cfgBlk[1]};`)();

const wiringSrc = readFileSync(new URL("../docs/shared/wiring-v1.js", import.meta.url), "utf8");
const wiringBlk = wiringSrc.match(/\/\/ <wiring-pure>([\s\S]*?)\/\/ <\/wiring-pure>/);
if (!wiringBlk) throw new Error("docs/shared/wiring-v1.js 找不到 <wiring-pure> 區塊");
const { makeChildStore } = new Function(wiringBlk[1] + "\nreturn { makeChildStore };")();

test("spelling wiring 設定 pin：appId／schema／legacy 歸屬一字不差", () => {
  assert.equal(CONFIG.appId, "spelling");
  assert.equal(CONFIG.schemaVersion, 1);
  assert.equal(CONFIG.legacyChild, "aiden", "ADR-0004：spelling 舊存檔（v4）歸哥哥");
  assert.equal(CONFIG.legacyKey, "spelling_bee_progress_v4");
});

test("spelling 實際 key 派生不變；與 study 的 key 空間不互撞", () => {
  const s = makeChildStore(CONFIG);
  assert.equal(s.progressKey("aiden"), "spelling:progress:aiden");
  assert.equal(s.progressKey("bingpu"), "spelling:progress:bingpu");
  assert.equal(s.syncMetaKey("aiden"), "spelling:sync:aiden");
  assert.notEqual(s.progressKey("aiden"), "study:progress:aiden");
});

test("v3/v2 遠古鏈鎖 legacy child：loadProgress 的 guard 讀 WIRING_CONFIG.legacyChild", () => {
  // 遠古鏈是 app 內邏輯（不在 wiring）；guard 消失＝跨 child 互染回歸，用原始碼釘住
  assert.match(html, /currentChild !== WIRING_CONFIG\.legacyChild\) return false/);
  assert.match(html, /spelling_bee_progress_v3/);
  assert.match(html, /spelling_bee_progress_v2/);
});
