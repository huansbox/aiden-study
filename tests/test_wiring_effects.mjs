// 接線層效果層測試（#40 裁決①）：docs/shared/wiring-v1.js 的 createWiring。
// pure 區塊測試（test_wiring_pure.mjs）罩不到的守衛住在這裡——identityUnresolvable、
// 封鎖 Cookie 降級、seedLegacy、定錨後備（markImportedFallback）、commitImport 編排、
// pageshow 身分重驗。整份檔案在 mock window 沙箱執行，錨死「改壞守衛測試會叫」。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const src = readFileSync(new URL("../docs/shared/wiring-v1.js", import.meta.url), "utf8");

// mock localStorage：failKeys(k)=true 的 key 在 setItem 時拋（模擬 quota 只卡部分寫入）
function makeStorage({ failKeys = null } = {}) {
  const map = new Map();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (failKeys && failKeys(k)) throw new Error("QuotaExceededError");
      map.set(k, String(v));
    },
    removeItem: (k) => map.delete(k),
  };
}

// 沙箱：wiring-v1.js 需要的全域一次備齊（window/location/document/URLSearchParams/alert）
function makeEnv({ search = "", storage = null, storageThrows = false, kidsSync = null } = {}) {
  const calls = { reload: 0, replace: [], alerts: [] };
  const listeners = {};
  const win = { addEventListener: (ev, fn) => { (listeners[ev] ||= []).push(fn); } };
  const st = storage || makeStorage();
  if (storageThrows) {
    // 「封鎖所有 Cookie」類設定：連取 localStorage 這個屬性都拋 SecurityError
    Object.defineProperty(win, "localStorage", { get() { throw new Error("SecurityError"); } });
  } else {
    win.localStorage = st;
  }
  if (kidsSync) win.KidsSyncV1 = kidsSync;
  const sandbox = {
    window: win,
    location: { search, reload: () => { calls.reload++; }, replace: (u) => { calls.replace.push(u); } },
    document: { getElementById: () => null, activeElement: null },
    URLSearchParams,
    alert: (m) => { calls.alerts.push(m); },
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return { KW: win.KidsWiringV1, storage: storageThrows ? null : st, calls, listeners };
}

const CFG = { appId: "zhuyin", schemaVersion: 1, legacyChild: "bingpu", legacyKey: "aiden_zhuyin_v1" };
const PKEY = "zhuyin:progress:bingpu";
const MKEY = "zhuyin:sync:bingpu";

// mock sync-v1：介面對齊 bootIdentity/identityFromSearch/createSyncClient/HEALTH_TEXT
function mockKidsSync({ client = null, token = "tok" } = {}) {
  const created = [];
  const ks = {
    created,
    bootIdentity(search) {
      const child = new URLSearchParams(search).get("child") || null;
      return { child, getToken: () => token, setToken: () => {} };
    },
    identityFromSearch(search) {
      return { child: new URLSearchParams(search).get("child") || null };
    },
    HEALTH_TEXT: { ok: "同步正常", retry: "同步中", "no-token": "還沒設定同步金鑰" },
    createSyncClient(cfg) {
      const c = {
        cfg,
        markImportedCalls: 0,
        markImported() { this.markImportedCalls++; },
        markDirty() {},
        importedLocal: async () => ({ action: "push", putRejected: false }),
        syncNow: async () => {},
        attachLifecycle() {},
        meta: () => ({ health: "ok" }),
        ...(client || {}),
      };
      created.push(c);
      return c;
    },
  };
  return ks;
}

// ── 身分守衛（#40-A：跨 child 寫入的最後一道閘）──

test("identityUnresolvable：sync-v1 沒載到＋網址指名 child → 拒開站；沒指名 → 放行（legacy 可練不持久）", () => {
  const named = makeEnv({ search: "?child=aiden" });
  assert.equal(named.KW.createWiring(CFG).identityUnresolvable(), true);

  const legacy = makeEnv({ search: "" });
  const w = legacy.KW.createWiring(CFG);
  assert.equal(w.identityUnresolvable(), false);
  assert.equal(w.currentChild, "bingpu", "無參數網址退回 legacyChild（per-app 歸屬）");
});

test("identityUnresolvable：sync-v1 有載到＋指名 child → 放行，currentChild 取自網址（不退 legacyChild）", () => {
  const env = makeEnv({ search: "?child=aiden", kidsSync: mockKidsSync() });
  const w = env.KW.createWiring(CFG);
  assert.equal(w.identityUnresolvable(), false);
  assert.equal(w.currentChild, "aiden");
});

// ── 封鎖 Cookie 降級 ──

test("封鎖 Cookie（localStorage 取值即拋）：createWiring 不炸；safeGet 回 null、safeSet 回 false", () => {
  const env = makeEnv({ storageThrows: true });
  const w = env.KW.createWiring(CFG);
  assert.equal(w.safeGet("anything"), null);
  assert.equal(w.safeSet("anything", "v"), false);
  assert.equal(w.identityUnresolvable(), false, "legacy 網址照舊放行（可練不持久）");
});

test("safeGet／safeSet：正常環境原值進出；safeSet 回 true", () => {
  const env = makeEnv({});
  const w = env.KW.createWiring(CFG);
  assert.equal(w.safeSet("k1", "v1"), true);
  assert.equal(w.safeGet("k1"), "v1");
  assert.equal(w.safeGet("missing"), null);
});

// ── legacy 播種（複製不搬移）──

test("seedLegacy：legacy blob 在＋新 key 空 → 複製到新 key、legacy 原樣保留；新 key 已有 → 不動作", () => {
  const storage = makeStorage();
  storage.setItem("aiden_zhuyin_v1", '{"cards":{}}');
  const env = makeEnv({ storage });
  const w = env.KW.createWiring(CFG);
  assert.equal(w.seedLegacy(), true);
  assert.equal(storage.getItem(PKEY), '{"cards":{}}');
  assert.equal(storage.getItem("aiden_zhuyin_v1"), '{"cards":{}}', "複製不搬移：revert 後舊程式讀舊 key 如常");
  assert.equal(w.seedLegacy(), false, "已播過（新 key 有資料）不重播");
});

// ── 定錨後備（markImportedFallback，經 anchorLocalWrite）──

test("anchorLocalWrite（無 sync）：meta 落 dirty＋anchorPending、既有 meta 欄位保留（merge 不蓋）", () => {
  const storage = makeStorage();
  storage.setItem(MKEY, JSON.stringify({ lastSyncAt: 123, syncedRev: 7 }));
  const env = makeEnv({ storage });
  env.KW.createWiring(CFG).anchorLocalWrite(false);
  const m = JSON.parse(storage.getItem(MKEY));
  assert.equal(m.dirty, true);
  assert.equal(m.anchorPending, true);
  assert.equal(m.pendingWriteId, null);
  assert.equal(m.lastSyncAt, 123, "既有 meta 不得被整包蓋掉");
  assert.equal(m.syncedRev, 7);
});

// ── commitImport 編排 ──

test("commitImport：進度寫入失敗 → write-failed、不 reload、什麼都沒寫", async () => {
  const storage = makeStorage({ failKeys: (k) => k === PKEY });
  const env = makeEnv({ storage });
  const r = await env.KW.createWiring(CFG).commitImport("bingpu", { cards: {} });
  assert.equal(r.status, "write-failed"); // vm realm 物件 prototype 不同，逐欄位斷言
  assert.equal(env.calls.reload, 0);
  assert.equal(storage.getItem(PKEY), null);
});

test("commitImport 當前 child（無 sync）：寫 key＋定錨後立即 reload；reloadTo 走 replace", async () => {
  const env = makeEnv({});
  const w = env.KW.createWiring(CFG);
  const r = await w.commitImport("bingpu", { cards: { a: 1 } });
  assert.equal(r.status, "reloading");
  assert.equal(env.calls.reload, 1, "同步地 reload：等待窗內的 app 存檔會用舊 state 蓋掉匯入");
  assert.equal(JSON.parse(env.storage.getItem(PKEY)).cards.a, 1);
  assert.equal(JSON.parse(env.storage.getItem(MKEY)).anchorPending, true, "定錨不得漏——漏了日後 boot adopt 蓋掉匯入");
  assert.equal(env.calls.alerts.length, 0);

  const env2 = makeEnv({});
  await env2.KW.createWiring(CFG).commitImport("bingpu", { cards: {} }, { reloadTo: "./x.html" });
  assert.deepEqual(env2.calls.replace, ["./x.html"]);
});

test("commitImport 當前 child 定錨寫失敗（#40 裁決③）：reload 前 alert 明講可能不會上雲", async () => {
  const storage = makeStorage({ failKeys: (k) => k === MKEY });
  const env = makeEnv({ storage });
  const r = await env.KW.createWiring(CFG).commitImport("bingpu", { cards: {} });
  assert.equal(r.status, "reloading");
  assert.equal(env.calls.alerts.length, 1, "reload 後沒有回報面，不 alert 等於假裝成功");
  assert.match(env.calls.alerts[0], /可能不會自動上雲/);
  assert.equal(env.calls.reload, 1, "資料已寫入，reload 語意不變");
});

test("commitImport 其他 child（sync-v1 沒載到）：寫他 child 的 key＋定錨、不 reload；當前 child 不受影響", async () => {
  const env = makeEnv({});
  const r = await env.KW.createWiring(CFG).commitImport("aiden", { cards: {} });
  assert.equal(r.status, "done");
  assert.equal(r.pushed, false);
  assert.equal(r.reason, null);
  assert.equal(env.calls.reload, 0);
  assert.ok(env.storage.getItem("zhuyin:progress:aiden"));
  assert.equal(JSON.parse(env.storage.getItem("zhuyin:sync:aiden")).anchorPending, true);
  assert.equal(env.storage.getItem(PKEY), null, "不碰當前 child 的存檔");
});

test("commitImport 其他 child 定錨寫失敗（#40 裁決③）：reason=anchor-failed、回報文案不承諾補傳", async () => {
  const storage = makeStorage({ failKeys: (k) => k === "zhuyin:sync:aiden" });
  const env = makeEnv({ storage });
  const w = env.KW.createWiring(CFG);
  const r = await w.commitImport("aiden", { cards: {} });
  assert.equal(r.status, "done");
  assert.equal(r.pushed, false);
  assert.equal(r.reason, "anchor-failed");
  const text = w.importedFeedback("aiden", r);
  assert.match(text, /可能不會自動上雲/);
  assert.doesNotMatch(text, /會自動補傳/);
});

test("commitImport 其他 child（sync 正常）：push 成功 → pushed:true；409 採雲端 → adopted；schema-block 分流", async () => {
  const pushedEnv = makeEnv({ search: "?child=bingpu", kidsSync: mockKidsSync() });
  const r1 = await pushedEnv.KW.createWiring(CFG).commitImport("aiden", { cards: {} });
  assert.equal(r1.status, "done");
  assert.equal(r1.pushed, true);
  assert.equal(r1.reason, null);

  const adoptedEnv = makeEnv({
    search: "?child=bingpu",
    kidsSync: mockKidsSync({ client: { importedLocal: async () => ({ action: "push", putRejected: true, secondAction: "adopt" }) } }),
  });
  const r2 = await adoptedEnv.KW.createWiring(CFG).commitImport("aiden", { cards: {} });
  assert.equal(r2.pushed, false);
  assert.equal(r2.reason, "adopted");

  const sbEnv = makeEnv({
    search: "?child=bingpu",
    kidsSync: mockKidsSync({ client: { importedLocal: async () => ({ action: "schema-block" }) } }),
  });
  const r3 = await sbEnv.KW.createWiring(CFG).commitImport("aiden", { cards: {} });
  assert.equal(r3.reason, "schema-block");
});

test("commitImport 當前 child（sync 正常）：走 sync.markImported（不落 fallback meta）後 reload", async () => {
  const ks = mockKidsSync();
  const env = makeEnv({ search: "?child=bingpu", kidsSync: ks });
  const w = env.KW.createWiring(CFG);
  w.initSync();
  const r = await w.commitImport("bingpu", { cards: {} });
  assert.equal(r.status, "reloading");
  assert.equal(env.calls.reload, 1);
  assert.equal(ks.created[0].markImportedCalls, 1);
});

// ── pageshow 身分重驗（bfcache 復原）──

test("attachPageshowGuard：bfcache 復原時身分不一致 → reload；非 bfcache（persisted:false）不動作", () => {
  const ks = mockKidsSync();
  const env = makeEnv({ search: "?child=aiden", kidsSync: ks });
  const w = env.KW.createWiring(CFG);
  w.attachPageshowGuard();
  const fire = env.listeners.pageshow[0];
  fire({ persisted: false });
  assert.equal(env.calls.reload, 0);
  fire({ persisted: true }); // mock identityFromSearch 仍回 aiden＝一致 → 不 reload
  assert.equal(env.calls.reload, 0);
  // 模擬殘留頁：換掉網址上的 child 再復原
  ks.identityFromSearch = () => ({ child: "bingpu" });
  fire({ persisted: true });
  assert.equal(env.calls.reload, 1, "身分不一致必須 reload，否則寫進錯的小孩");
});

// ── 健康燈 ──

test("syncStatusHtml：sync-v1 沒載到 → 明示腳本未載入；載到但無 token → no-token 文案", () => {
  const off = makeEnv({});
  assert.match(off.KW.createWiring(CFG).syncStatusHtml(), /同步腳本未載入/);

  const noToken = makeEnv({ search: "?child=bingpu", kidsSync: mockKidsSync({ token: null }) });
  assert.match(noToken.KW.createWiring(CFG).syncStatusHtml(), /還沒設定同步金鑰/);
});
