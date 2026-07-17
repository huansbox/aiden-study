// study 的 wiring 設定 pin＋身分/token 解析純函式測試（票 #28；#40-B 起 key 尋址移共用）。
// key 尋址與播種語意的行為測試在 tests/test_wiring_pure.mjs（單一真相源）；
// 這裡 pin 住 study 的 <wiring-config>——重接線不得默默改 key／歸屬（改了＝進度看似消失）。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../docs/study/index.html", import.meta.url), "utf8");
const cfgBlk = html.match(/\/\/ <wiring-config>[\s\S]*?const WIRING_CONFIG = (\{[\s\S]*?\});[\s\S]*?\/\/ <\/wiring-config>/);
if (!cfgBlk) throw new Error("docs/study/index.html 找不到 <wiring-config> 區塊");
const CONFIG = new Function(`return ${cfgBlk[1]};`)();

const wiringSrc = readFileSync(new URL("../docs/shared/wiring-v1.js", import.meta.url), "utf8");
const wiringBlk = wiringSrc.match(/\/\/ <wiring-pure>([\s\S]*?)\/\/ <\/wiring-pure>/);
if (!wiringBlk) throw new Error("docs/shared/wiring-v1.js 找不到 <wiring-pure> 區塊");
const { makeChildStore } = new Function(wiringBlk[1] + "\nreturn { makeChildStore };")();

const syncSrc = readFileSync(new URL("../docs/shared/sync-v1.js", import.meta.url), "utf8");
const clientBlk = syncSrc.match(/\/\/ <sync-client>([\s\S]*?)\/\/ <\/sync-client>/);
if (!clientBlk) throw new Error("docs/shared/sync-v1.js 找不到 <sync-client> 區塊");
const { normalizeChildId, identityFromSearch, resolveToken, bootIdentity } = new Function(clientBlk[1] +
  "\nreturn { normalizeChildId, identityFromSearch, resolveToken, bootIdentity };")();

test("study wiring 設定 pin：appId／schema／legacy 歸屬一字不差", () => {
  assert.equal(CONFIG.appId, "study");
  assert.equal(CONFIG.schemaVersion, 1);
  assert.equal(CONFIG.legacyChild, "aiden", "ADR-0004：study 舊存檔歸哥哥");
  assert.equal(CONFIG.legacyKey, "aiden_study_v2");
});

test("study 實際 key 派生不變（progress／sync meta）", () => {
  const s = makeChildStore(CONFIG);
  assert.equal(s.progressKey("aiden"), "study:progress:aiden");
  assert.equal(s.progressKey("bingpu"), "study:progress:bingpu");
  assert.equal(s.syncMetaKey("aiden"), "study:sync:aiden");
});

test("normalizeChildId：合法（小寫英數/連字號 ≤32）通過，其餘回 null", () => {
  assert.equal(normalizeChildId("aiden"), "aiden");
  assert.equal(normalizeChildId("test-a"), "test-a");
  assert.equal(normalizeChildId("Aiden"), null);
  assert.equal(normalizeChildId("弟弟"), null);
  assert.equal(normalizeChildId(""), null);
  assert.equal(normalizeChildId("a".repeat(33)), null);
  assert.equal(normalizeChildId(null), null);
});

test("identityFromSearch：?child=＋?k= 解析；壞 child 擋下、缺項回 null", () => {
  assert.deepEqual(identityFromSearch("?child=aiden&k=tok-123"), { child: "aiden", token: "tok-123" });
  assert.deepEqual(identityFromSearch("?child=test-b"), { child: "test-b", token: null });
  assert.deepEqual(identityFromSearch("?child=BAD*&k=t"), { child: null, token: "t" });
  assert.deepEqual(identityFromSearch(""), { child: null, token: null });
  assert.deepEqual(identityFromSearch(undefined), { child: null, token: null });
});

test("resolveToken fallback：網址參數 > 本機儲存 > 無", () => {
  assert.equal(resolveToken("url-t", "stored-t"), "url-t");
  assert.equal(resolveToken(null, "stored-t"), "stored-t");
  assert.equal(resolveToken(null, null), null);
  assert.equal(resolveToken("", "stored-t"), "stored-t", "空字串視同無");
});

test("bootIdentity：?k= 首開持久化、getToken fallback、setToken 蓋過網址舊 token", () => {
  const store = new Map();
  const storage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v) };
  const id = bootIdentity("?child=aiden&k=old-tok", storage);
  assert.equal(id.child, "aiden");
  assert.equal(store.get("kids_sync_token"), "old-tok", "?k= 首開即寫入本機");
  assert.equal(id.getToken(), "old-tok");
  // 家長貼新金鑰：本 session 立即生效，不被網址殘留的舊 ?k= 蓋回
  id.setToken("new-tok");
  assert.equal(id.getToken(), "new-tok");
  assert.equal(store.get("kids_sync_token"), "new-tok");
  id.setToken(""); // 空值不動作
  assert.equal(id.getToken(), "new-tok");
  // 無網址 token → 走本機儲存；兩邊皆無 → null
  const id2 = bootIdentity("", storage);
  assert.equal(id2.child, null);
  assert.equal(id2.getToken(), "new-tok");
  const id3 = bootIdentity("", { getItem: () => null, setItem: () => {} });
  assert.equal(id3.getToken(), null);
});

test("normalizeChildId 與 worker KEY_RE 一字不差（雲端 key 段格式契約，防單邊放寬）", () => {
  const workerSrc = readFileSync(new URL("../worker/worker.mjs", import.meta.url), "utf8");
  const workerRe = workerSrc.match(/const KEY_RE = (\/[^;\n]+\/);/);
  const clientRe = clientBlk[1].match(/function normalizeChildId[\s\S]{0,200}?(\/[^/\n]+\/)\.test/);
  assert.ok(workerRe, "worker.mjs 找不到 KEY_RE 字面量");
  assert.ok(clientRe, "sync-v1.js 找不到 normalizeChildId 的 regex 字面量");
  assert.equal(clientRe[1], workerRe[1], "格式漂移會讓合法 child id 靜默 fallback 成 aiden（資料混寫）");
});
