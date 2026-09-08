// math 的 wiring 設定 pin（票 #33；#40-B 起 key 尋址移共用 wiring-v1.js）。
// key 尋址語意的行為測試在 tests/test_wiring_pure.mjs（單一真相源）；
// 這裡 pin 住 math 的 <wiring-config>——重接線不得默默改 key／歸屬（改了＝進度看似消失）。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../docs/math/index.html", import.meta.url), "utf8");
const cfgBlk = html.match(/\/\/ <wiring-config>[\s\S]*?const WIRING_CONFIG = (\{[\s\S]*?\});[\s\S]*?\/\/ <\/wiring-config>/);
if (!cfgBlk) throw new Error("docs/math/index.html 找不到 <wiring-config> 區塊");
const CONFIG = new Function(`return ${cfgBlk[1]};`)();

const wiringSrc = readFileSync(new URL("../docs/shared/wiring-v1.js", import.meta.url), "utf8");
const wiringBlk = wiringSrc.match(/\/\/ <wiring-pure>([\s\S]*?)\/\/ <\/wiring-pure>/);
if (!wiringBlk) throw new Error("docs/shared/wiring-v1.js 找不到 <wiring-pure> 區塊");
const { makeChildStore } = new Function(wiringBlk[1] + "\nreturn { makeChildStore };")();

test("math wiring 設定 pin：appId／schema／從零（無 legacyKey）", () => {
  assert.equal(CONFIG.appId, "math");
  assert.equal(CONFIG.schemaVersion, 1);
  assert.equal(CONFIG.legacyChild, "aiden", "ADR-0004：math 歸哥哥");
  // 從零拍板（#33）：legacyKey 出現非 null 值代表有人補了遷移路徑，需回票對齊而不是默默上線
  assert.equal(CONFIG.legacyKey, null, "math 拍板不遷移舊進度（aiden-math-progress 不讀不寫）");
});

test("math 實際 key 派生不變；key 空間不互撞（舊 key／study／spelling）", () => {
  const s = makeChildStore(CONFIG);
  assert.equal(s.progressKey("aiden"), "math:progress:aiden");
  assert.equal(s.progressKey("bingpu"), "math:progress:bingpu");
  assert.equal(s.syncMetaKey("aiden"), "math:sync:aiden");
  assert.notEqual(s.progressKey("aiden"), "aiden-math-progress", "新格式 key 不得撞舊 key");
  assert.notEqual(s.progressKey("aiden"), "study:progress:aiden");
  assert.notEqual(s.progressKey("aiden"), "spelling:progress:aiden");
  // 從零語意：無 legacyKey → 播種計畫永遠不動作
  assert.equal(s.planLegacySeed("aiden", '{"stars":9}', null), null);
});
