// child 維度 key 尋址＋身分/token 解析純函式測試（票 #28）。
// 抽取：docs/index.html 的 <child-store-pure>＋docs/shared/sync-v1.js 的 <sync-client>（只取身分函式）。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
const storeBlk = html.match(/\/\/ <child-store-pure>([\s\S]*?)\/\/ <\/child-store-pure>/);
if (!storeBlk) throw new Error("docs/index.html 找不到 <child-store-pure> 區塊");
const {
  LEGACY_STORAGE_KEY, LEGACY_CHILD, childProgressKey, childSyncMetaKey, planLegacySeed, planImportWrite,
} = new Function(storeBlk[1] +
  "\nreturn { LEGACY_STORAGE_KEY, LEGACY_CHILD, childProgressKey, childSyncMetaKey, planLegacySeed, planImportWrite };")();

const syncSrc = readFileSync(new URL("../docs/shared/sync-v1.js", import.meta.url), "utf8");
const clientBlk = syncSrc.match(/\/\/ <sync-client>([\s\S]*?)\/\/ <\/sync-client>/);
if (!clientBlk) throw new Error("docs/shared/sync-v1.js 找不到 <sync-client> 區塊");
const { normalizeChildId, identityFromSearch, resolveToken, bootIdentity } = new Function(clientBlk[1] +
  "\nreturn { normalizeChildId, identityFromSearch, resolveToken, bootIdentity };")();

test("key 尋址：progress 與 sync meta 每 child 各自一把、互不相同", () => {
  assert.equal(childProgressKey("aiden"), "study:progress:aiden");
  assert.equal(childProgressKey("bingpu"), "study:progress:bingpu");
  assert.equal(childSyncMetaKey("aiden"), "study:sync:aiden");
  assert.notEqual(childProgressKey("aiden"), childProgressKey("bingpu"));
  assert.notEqual(childProgressKey("aiden"), childSyncMetaKey("aiden"));
  assert.notEqual(childProgressKey("aiden"), LEGACY_STORAGE_KEY, "新格式 key 不得撞舊 key");
});

test("planLegacySeed：aiden＋新 key 空＋舊 blob 在 → 複製到新 key（值原樣）", () => {
  const legacy = '{"mastered":{"3":["a"]}}';
  const plan = planLegacySeed("aiden", legacy, null);
  assert.deepEqual(plan, { key: "study:progress:aiden", value: legacy });
});

test("planLegacySeed：新 key 已有資料／舊 blob 不存在／child 非歸屬者 → 不動作", () => {
  const legacy = '{"mastered":{}}';
  assert.equal(planLegacySeed("aiden", legacy, '{"mastered":{"3":["b"]}}'), null, "新 key 已有資料不得覆蓋");
  assert.equal(planLegacySeed("aiden", legacy, ""), null, "新 key 存過空字串也算存在，不覆蓋");
  assert.equal(planLegacySeed("aiden", null, null), null, "無舊 blob");
  assert.equal(planLegacySeed("aiden", "", null), null, "舊 blob 空字串視同不存在");
  assert.equal(planLegacySeed("bingpu", legacy, null), null, "study 舊存檔歸 aiden，不播種給弟弟");
  assert.equal(planLegacySeed("test-a", legacy, null), null);
  assert.equal(LEGACY_CHILD, "aiden");
});

test("planImportWrite：只寫目標 child 的新格式 key，值＝JSON 序列化", () => {
  const obj = { mastered: { "3": ["x"] }, challenge: {} };
  const plan = planImportWrite("bingpu", obj);
  assert.equal(plan.key, "study:progress:bingpu");
  assert.deepEqual(JSON.parse(plan.value), obj);
});

test("交錯 case：新格式已有 bingpu 資料後匯入 legacy 備份 → 目標 child 得到、另一 child 不動", () => {
  // 模擬容器現況：bingpu 已有新格式資料、legacy 舊 blob 還在
  const store = new Map([
    [childProgressKey("bingpu"), '{"mastered":{"13":["zh1"]}}'],
    [LEGACY_STORAGE_KEY, '{"mastered":{"3":["old"]}}'],
  ]);
  // 家長把（legacy 形狀的）備份匯入給 aiden
  const imported = { mastered: { "3": ["old"], "4": ["new"] }, challenge: {} };
  const plan = planImportWrite("aiden", imported);
  store.set(plan.key, plan.value);
  assert.deepEqual(JSON.parse(store.get(childProgressKey("aiden"))), imported, "目標 child 得到匯入資料");
  assert.equal(store.get(childProgressKey("bingpu")), '{"mastered":{"13":["zh1"]}}', "另一 child 不動");
  assert.equal(store.get(LEGACY_STORAGE_KEY), '{"mastered":{"3":["old"]}}', "legacy blob 原樣保留");
  // 匯入不繞 legacy migration guard：匯入後 seed 也不會再覆蓋 aiden 的新資料
  assert.equal(planLegacySeed("aiden", store.get(LEGACY_STORAGE_KEY), store.get(childProgressKey("aiden"))), null);
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
