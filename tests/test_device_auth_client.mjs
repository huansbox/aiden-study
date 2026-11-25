import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import worker from "../worker/worker.mjs";
import { kvStub } from "../worker/kv-stub.mjs";
import { boot, publicQuestions, storage } from "./helpers/study-harness.mjs";
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
test("每個入口以 Cookie 各自維持連線；重開可沿用，登出只影響自己的入口", async () => {
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
  await safari.A.disconnect();
  assert.equal((await reopened.A.refresh()).status, "required");
  assert.equal((await icon.A.refresh()).status, "connected");
  assert.equal((await icon.F.settings()).available, true);
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

test("Study 切換孩子時，前一頁延遲的同步只更新原孩子，另一個入口重開仍各自保留作答", async () => {
  const local = storage();
  const device = browser({ storage: local.map });
  await device.A.ready;
  await device.A.connect("test-key");
  const first = await boot(local, "test-a", { auth: device.A });
  const [questionA, questionB] = publicQuestions.filter(q => q.unit === 5 && q.type === "multiple_choice");
  function answer(page, question) {
    page.app.State.setSubject("math");
    page.app.State.saveBatch("5", [question.id]);
    page.app.startQuiz("full", 5);
    page.app.submitAnswer(question.answer);
    assert.deepEqual(Array.from(page.app.State.getMasteredSet(5)), [question.id]);
  }
  const localProgress = child => JSON.parse(local.getItem(`study:progress:${child}`));
  const cloudProgress = async child => JSON.parse(await device.env.KV.get(`p:${child}:study`));
  answer(first, questionA);
  const expectedA = localProgress("test-a");

  // 將 A 這輪的 GET 回應留到 B 已作答、已同步才交回，讓 A 的後續 PUT 在 B 之後發生。
  const received = Promise.withResolvers();
  const resume = Promise.withResolvers();
  const send = device.A.fetch;
  device.A.fetch = async (url, init) => {
    const response = await send(url, init);
    if (new URL(url).pathname === "/api/v1/progress/test-a/study" && init.method === "GET") {
      received.resolve();
      await resume.promise;
    }
    return response;
  };
  const syncingA = first.window._syncNow();
  await Promise.race([received.promise, syncingA.then(() => assert.fail("A 未送出同步讀取"))]);
  const second = await boot(local, "test-b", { auth: device.A });
  assert.equal(second.app.State.doneCount(5), 0);
  answer(second, questionB);
  await second.window._syncNow();
  const expectedB = localProgress("test-b");
  const savedB = await cloudProgress("test-b");
  assert.deepEqual(savedB.data, expectedB);
  assert.deepEqual(localProgress("test-a"), expectedA);

  resume.resolve();
  await syncingA;
  assert.deepEqual((await cloudProgress("test-a")).data, expectedA);
  assert.deepEqual(await cloudProgress("test-b"), savedB);
  assert.deepEqual(localProgress("test-b"), expectedB);

  // 第二個入口沒有任何本機進度，兩份作答都必須由 Worker 還原。
  const fresh = storage();
  const other = browser({ env: device.env, storage: fresh.map });
  await other.A.ready;
  await other.A.connect("test-key");
  for (const [child, question] of [["test-a", questionA], ["test-b", questionB]]) {
    const page = await boot(fresh, child, { auth: other.A });
    assert.deepEqual(Array.from(page.app.State.getMasteredSet(5)), [question.id]);
    assert.deepEqual(Object.keys(page.app.state.stats), [question.id]);
  }
});
