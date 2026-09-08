// zhuyin 的 wiring 設定 pin（票 #29；#40-B 起 key 尋址移共用 wiring-v1.js）。
// key 尋址與播種語意的行為測試在 tests/test_wiring_pure.mjs（單一真相源）；
// 這裡 pin 住 zhuyin 的 <wiring-config>——重接線不得默默改 key／歸屬（改了＝進度看似消失）。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../docs/zhuyin/index.html", import.meta.url), "utf8");
const cfgBlk = html.match(/\/\/ <wiring-config>[\s\S]*?const WIRING_CONFIG = (\{[\s\S]*?\});[\s\S]*?\/\/ <\/wiring-config>/);
if (!cfgBlk) throw new Error("docs/zhuyin/index.html 找不到 <wiring-config> 區塊");
const CONFIG = new Function(`return ${cfgBlk[1]};`)();

const wiringSrc = readFileSync(new URL("../docs/shared/wiring-v1.js", import.meta.url), "utf8");
const wiringBlk = wiringSrc.match(/\/\/ <wiring-pure>([\s\S]*?)\/\/ <\/wiring-pure>/);
if (!wiringBlk) throw new Error("docs/shared/wiring-v1.js 找不到 <wiring-pure> 區塊");
const { makeChildStore } = new Function(wiringBlk[1] + "\nreturn { makeChildStore };")();

test("zhuyin wiring 設定 pin：appId／schema／legacy 歸屬一字不差", () => {
  assert.equal(CONFIG.appId, "zhuyin");
  assert.equal(CONFIG.schemaVersion, 1);
  assert.equal(CONFIG.legacyChild, "bingpu", "ADR-0004：zhuyin 舊存檔歸弟弟（per-app 歸屬，非 study 的 aiden）");
  assert.equal(CONFIG.legacyKey, "aiden_zhuyin_v1");
});

test("zhuyin 實際 key 派生不變；與 study 的 key 空間不互撞", () => {
  const s = makeChildStore(CONFIG);
  assert.equal(s.progressKey("bingpu"), "zhuyin:progress:bingpu");
  assert.equal(s.progressKey("aiden"), "zhuyin:progress:aiden");
  assert.equal(s.syncMetaKey("bingpu"), "zhuyin:sync:bingpu");
  assert.notEqual(s.progressKey("aiden"), "study:progress:aiden");
});
