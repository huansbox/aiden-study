import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import worker from "../worker/worker.mjs";
import { kvStub } from "../worker/kv-stub.mjs";
import { expandedSyntheticPack } from "./helpers/synthetic-study-pack.mjs";
const origin = "https://kids.linshuhuan.com";
const file = (p) =>
  readFileSync(new URL("../docs/" + p, import.meta.url), "utf8");
function browser({
  env = { TOKEN: "test-key", KV: kvStub() },
  jar = {},
  storage = new Map(),
  search = "?child=aiden",
  blocked = false,
} = {}) {
  const requests = [],
    events = [];
  let offline = false;
  const localStorage = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
    get length() {
      return storage.size;
    },
    key: (i) => [...storage.keys()][i],
  };
  const document = {
    currentScript: { src: origin + "/shared/device-auth.js" },
    visibilityState: "visible",
    addEventListener() {},
  };
  const location = { href: origin + "/" + search, search };
  const context = vm.createContext({
    document,
    location,
    localStorage,
    URL,
    URLSearchParams,
    crypto,
    AbortController,
    TextEncoder,
    TextDecoder,
    Blob,
    performance,
    setTimeout: () => 1,
    clearTimeout() {},
    setInterval() {},
    addEventListener() {},
    dispatchEvent: (e) => events.push(e.type),
    CustomEvent: class {
      constructor(type) {
        this.type = type;
      }
    },
    history: {
      state: null,
      replaceState(_s, _t, url) {
        location.href = String(url);
        location.search = new URL(url).search;
      },
    },
    navigator: {
      sendBeacon: (url, body) => {
        requests.push({ url, beacon: body });
        return true;
      },
    },
    fetch: async (url, init = {}) => {
      if (offline) throw Error("offline");
      const headers = new Headers(init.headers);
      headers.set("Origin", origin);
      if (jar.cookie && !blocked) headers.set("Cookie", jar.cookie);
      requests.push({ url: String(url), init });
      const response = await worker.fetch(
        new Request(url, { ...init, headers }),
        env,
      );
      const cookie = response.headers.get("set-cookie");
      if (cookie && !blocked) jar.cookie = cookie.split(";")[0];
      return response;
    },
  });
  context.window = context;
  for (const name of [
    "device-auth.js",
    "sync-v1.js",
    "family-core.js",
    "family-client.js",
  ]) {
    document.currentScript.src = origin + "/shared/" + name;
    vm.runInContext(file("shared/" + name), context);
  }
  vm.runInContext(file("study/private-pack.js"), context);
  return {
    context,
    A: context.KidsAuth,
    F: context.KidsFamily,
    storage,
    env,
    jar,
    requests,
    events,
    location,
    offline: (value) => {
      offline = value;
    },
  };
}
test("每個儲存容器獨立首次登入；重開依 Cookie 記住，localStorage 不保存憑證", async () => {
  const safari = browser();
  await safari.A.ready;
  assert.equal(safari.A.state.status, "required");
  await safari.A.connect("test-key");
  assert.equal(safari.A.state.status, "connected");
  assert.equal(safari.storage.size, 0);
  const reopened = browser({ env: safari.env, jar: safari.jar });
  await reopened.A.ready;
  assert.equal(reopened.A.state.status, "connected");
  assert.ok(reopened.requests.every((r) => r.init.method !== "POST"));
  const icon = browser({ env: safari.env });
  await icon.A.ready;
  assert.equal(icon.A.state.status, "required");
  await icon.A.connect("test-key");
  assert.notEqual(icon.jar.cookie, safari.jar.cookie);
});
test("舊帶 key 網址與已存金鑰自動轉移，保留 child/hash，只在 Cookie 確認後清舊 key", async () => {
  for (const search of ["?child=aiden&k=test-key#keep", "?child=bingpu"]) {
    const h = browser({
      search,
      storage: new Map([["kids_sync_token", "test-key"]]),
    });
    await h.A.ready;
    assert.equal(h.A.state.status, "connected");
    assert.equal(h.storage.has("kids_sync_token"), false);
    assert.ok(!h.location.href.includes("k="));
    assert.match(h.location.search, /child=/);
    if (search.includes("#keep")) assert.ok(h.location.href.endsWith("#keep"));
    assert.ok(h.requests.every((r) => !r.url.includes("test-key")));
  }
  const bad = browser({
    blocked: true,
    storage: new Map([["kids_sync_token", "test-key"]]),
  });
  await bad.A.ready;
  assert.equal(bad.A.state.status, "required");
  assert.equal(bad.storage.get("kids_sync_token"), "test-key");
});
test("新版設定、進度、題包與背景補送都使用 Cookie，不再傳家庭 key", async () => {
  const h = browser();
  await h.A.ready;
  await h.A.connect("test-key");
  const data = h.F.core.defaults();
  data.children.aiden.apps = ["study"];
  await h.F.saveSettings(data, 0, "settings-write");
  const icon = browser({ env: h.env });
  await icon.A.ready;
  await icon.A.connect("test-key");
  const settings = await icon.F.settings();
  assert.deepEqual(Array.from(settings.data.children.aiden.apps), ["study"]);
  await h.env.KV.put(
    "c:study:g4-s1-math-u1",
    JSON.stringify(expandedSyntheticPack()),
  );
  const pack = await icon.context.StudyPrivatePack.fetchRemote("unused", null);
  assert.equal(JSON.parse(pack).packId, "g4-s1-math-u1");
  let meta = null,
    local = { schemaVersion: 1, answer: 1 };
  const sync = icon.context.KidsSyncV1.createSyncClient({
    child: "test-cookie",
    app: "study",
    schemaVersion: 1,
    getToken: () => null,
    loadData: () => local,
    saveData: (d) => (local = d),
    loadMeta: () => meta,
    saveMeta: (m) => (meta = m),
  });
  await sync.boot();
  sync.markDirty();
  await sync.syncNow();
  assert.ok(await h.env.KV.get("p:test-cookie:study"));
  sync.markDirty();
  sync.flushBeacon();
  const progress = icon.requests.filter((r) => r.url.includes("/progress/"));
  assert.ok(progress.length > 0);
  for (const r of progress) assert.equal(new URL(r.url).search, "");
  const activity = icon.F.attach("study", "aiden");
  await activity.ready;
  activity.record({ unit: 15, answered: true, correct: true });
  await activity.flush();
  const streams = await h.env.KV.list({ prefix: "m:aiden:" });
  assert.equal(streams.keys.length, 1);
  for (const r of icon.requests.filter((r) => !r.url.endsWith("/session"))) {
    assert.ok(!r.init?.headers?.Authorization);
    assert.ok(!r.url.includes("k="));
  }
});
test("登入失效會要求重連，斷線保留已驗證設定；失敗不建立預設雲端資料", async () => {
  const h = browser();
  await h.A.ready;
  await h.A.connect("test-key");
  await h.F.settings();
  h.offline(true);
  await h.A.refresh();
  const stale = await h.F.settings();
  assert.equal(h.A.state.status, "offline");
  assert.equal(stale.offline, true);
  assert.equal(stale.available, true);
  h.offline(false);
  h.env.TOKEN = "new-key";
  const expired = await h.F.settings();
  assert.equal(expired.status, 401);
  assert.equal(h.A.state.status, "required");
  assert.equal((await h.env.KV.list({ prefix: "c:family:" })).keys.length, 0);
  await h.A.connect("new-key");
  assert.equal(h.A.state.status, "connected");
  await h.A.disconnect();
  assert.equal(h.A.state.status, "required");
  assert.equal((await h.F.settings()).status, 401);
});
test("練習入口只把取得過的設定視為可用，首次斷線不可使用預設設定", async () => {
  const h = browser();
  await h.A.ready;
  await h.A.connect("test-key");
  h.offline(true);
  const missing = h.F.attach("study", "aiden");
  await missing.ready;
  assert.equal(missing.hasSettings(), false);
  h.offline(false);
  await h.F.settings();
  h.offline(true);
  const cached = h.F.attach("study", "aiden");
  await cached.ready;
  assert.equal(cached.hasSettings(), true);
});
