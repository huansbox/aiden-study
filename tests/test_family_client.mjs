import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import worker from "../worker/worker.mjs";
import { kvStub } from "../worker/kv-stub.mjs";
const load = (path) =>
  readFileSync(new URL("../docs/shared/" + path, import.meta.url), "utf8");
function harness({
  storageMap = new Map([["kids_sync_token", "test-token"]]),
  env = { TOKEN: "test-token", KV: kvStub() },
  search = "?child=aiden",
  offline = false,
  base = "https://kids.linshuhuan.com/",
} = {}) {
  const windows = new Map(),
    docs = new Map(),
    intervals = [],
    beacons = [];
  let now = 0,
    id = 0;
  const storage = {
    get length() {
      return storageMap.size;
    },
    key: (i) => [...storageMap.keys()][i],
    getItem: (k) => storageMap.get(k) ?? null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k),
  };
  const shown = [];
  const element = () => ({
    children: [],
    removed: false,
    append(...children) { this.children.push(...children); },
    appendChild(child) { shown.push(child); },
    remove() { this.removed = true; },
    setAttribute() {},
    addEventListener() {},
    classList: { add() {} },
  });
  const document = {
    currentScript: {
      src: base + "shared/family-client.js",
    },
    visibilityState: "visible",
    getElementById: () => null,
    createElement: element,
    body: element(),
    addEventListener: (name, fn) => docs.set(name, fn),
  };
  const ctx = vm.createContext({
    document,
    localStorage: storage,
    location: { search },
    URL,
    URLSearchParams,
    AbortController,
    Blob,
    Intl,
    Date,
    performance: { now: () => now },
    crypto: { randomUUID: () => `session-${++id}` },
    setTimeout: () => 1,
    clearTimeout() {},
    setInterval: (fn) => intervals.push(fn),
    CustomEvent: class {
      constructor(type) {
        this.type = type;
      }
    },
    navigator: {
      sendBeacon: (url, body) => {
        beacons.push({ url, body });
        return true;
      },
    },
    addEventListener: (name, fn) => windows.set(name, fn),
    dispatchEvent: (event) => windows.get(event.type)?.(),
    fetch: async (url, init = {}) => {
      if (offline) throw Error("offline");
      return worker.fetch(new Request(url, init), env);
    },
  });
  ctx.window = ctx;
  vm.runInContext(load("family-core.js"), ctx);
  vm.runInContext(load("family-client.js"), ctx);
  return {
    F: ctx.KidsFamily,
    C: ctx.KidsFamilyCore,
    env,
    storageMap,
    beacons,
    rewards: () => shown.filter((el) => el.id === "family-reward" && !el.removed),
    setOffline: (value) => {
      offline = value;
    },
    time: (ms) => {
      now += ms;
      intervals.forEach((fn) => fn());
    },
    visibility: (state) => {
      document.visibilityState = state;
      docs.get("visibilitychange")?.();
    },
    event: (name) => windows.get(name)?.(),
  };
}
test("達標立即存檔但回合結束才合併通知；暫停與背景不觸發，新回合收掉提示", async () => {
  const h = harness(), data = h.C.defaults(), day = h.C.dateKey();
  data.children.bingpu.overrides[day] = [
    { id: "round", app: "zhuyin", mode: "all", quantity: 1 },
  ];
  await h.F.saveSettings(data, 0, "reward-timing");
  const child = harness({ env: h.env, search: `?child=bingpu&task=round&day=${day}` });
  const app = child.F.attach("zhuyin", "bingpu");
  await app.ready;
  app.setActive(true);
  child.setOffline(true);
  assert.equal(app.record({ mode: "listen", answered: true, correct: true }).taskDone, true);
  assert.equal(app.summary().finishedTasks, 1);
  for (let i = 1; i < 10; i++) app.record({ mode: "build", answered: true, correct: true });
  app.setActive(false); // 單題回饋或暫停仍不是批末
  child.visibility("hidden");
  child.visibility("visible");
  await new Promise(setImmediate); // 等回前景觸發的離線送出失敗結束，再模擬恢復網路
  assert.equal(child.rewards().length, 0);
  app.finishRound();
  assert.equal(child.rewards().length, 1);
  const label = child.rewards()[0].children.find((el) => el.textContent)?.textContent;
  assert.match(label, /任務完成/);
  assert.match(label, /第一個任務/);
  assert.match(label, /第一塊積木/);
  app.finishRound();
  assert.equal(child.rewards().length, 1, "重複結算不重複彈出");
  app.setActive(true);
  assert.equal(child.rewards().length, 0, "下一批不帶著上一批提示");
  app.record({ mode: "listen", answered: false });
  app.finishRound();
  assert.equal(child.rewards().length, 0, "已取得的成就不再彈出");
  child.setOffline(false);
  await app.flush();
  const another = harness({ env: h.env });
  await another.F.activity("bingpu");
  assert.equal(another.F.summary("bingpu").total.answered, 10);
  assert.equal(another.F.summary("bingpu").finishedTasks, 1);
});
test("所有站內正式 App 的普通徽章一律等明確回合結束，重開也保留累計", async () => {
  const registry = JSON.parse(readFileSync(new URL("../docs/registry.json", import.meta.url), "utf8"));
  for (const { id } of registry.apps.filter((app) => app.path && app.status === "active")) {
    const h = harness(), app = h.F.attach(id, "aiden");
    await app.ready;
    app.setActive(true);
    for (let i = 0; i < 10; i++) app.record({ answered: true, correct: true });
    assert.equal(h.rewards().length, 0, id);
    app.finishRound();
    assert.equal(h.rewards().length, 1, id);
    app.setActive(true);
    const reopened = h.F.attach(id, "aiden");
    await reopened.ready;
    reopened.finishRound();
    assert.equal(h.rewards().length, 0, id);
    assert.equal(reopened.summary().total.answered, 10, id);
  }
});
test("作答與閱讀分開、同任務跨 App 不計、任務只完成一次", async () => {
  const h = harness(),
    data = h.C.defaults(),
    day = h.C.dateKey();
  data.children.aiden.overrides[day] = [
    { id: "t", app: "study", unit: 15, quantity: 2 },
  ];
  await h.F.saveSettings(data, 0, "save");
  const other = harness({
    env: h.env,
    storageMap: h.storageMap,
    search: `?child=aiden&task=t&day=${day}`,
  });
  const app = other.F.attach("study", "aiden");
  await app.ready;
  app.record({ unit: 1, answered: true, correct: true });
  assert.equal(app.remaining(), 2);
  app.record({ unit: 15, answered: false });
  assert.equal(app.remaining(), 2);
  assert.equal(
    app.record({ unit: 15, answered: true, correct: false }).taskDone,
    false,
  );
  assert.equal(
    app.record({ unit: 15, answered: true, correct: true }).taskDone,
    true,
  );
  assert.equal(
    app.record({ unit: 15, answered: true, correct: true }).taskDone,
    false,
  );
  assert.equal(app.summary().total.answered, 4);
  assert.equal(app.summary().total.completed, 5);
  assert.equal(app.summary().finishedTasks, 1);
});
test("只計使用中的時間，兩分鐘閒置、背景、暫停不灌入時數；背景採 beacon", async () => {
  const h = harness(),
    app = h.F.attach("math", "aiden");
  await app.ready;
  app.setActive(true);
  h.time(10000);
  assert.equal(app.summary().total.seconds, 10);
  h.visibility("hidden");
  h.time(300000);
  assert.equal(app.summary().total.seconds, 10);
  assert.equal(h.beacons.length, 1);
  assert.equal(h.beacons[0].body.type, "text/plain");
  h.visibility("visible");
  h.time(180000);
  assert.equal(app.summary().total.seconds, 130);
  h.event("pointerdown");
  h.time(5000);
  assert.equal(app.summary().total.seconds, 135);
  app.setActive(false);
  h.time(60000);
  assert.equal(app.summary().total.seconds, 135);
});
test("離線完成、離開 App 後從首頁補送；重送不翻倍", async () => {
  const h = harness({ offline: true }),
    app = h.F.attach("spelling", "aiden");
  await app.ready;
  app.record({ batch: 0, answered: true, correct: true });
  await app.flush();
  assert.equal(h.F.summary("aiden").total.answered, 1);
  const home = harness({ env: h.env, storageMap: h.storageMap });
  await home.F.activity("aiden");
  await home.F.activity("aiden");
  const separate = harness({ env: h.env });
  await separate.F.activity("aiden");
  assert.equal(separate.F.summary("aiden").total.answered, 1);
  assert.equal(separate.F.summary("bingpu").total.answered, 0);
});
test("同一瀏覽器同時開兩頁也各自保留作答", async () => {
  const h = harness(),
    first = h.F.attach("math", "aiden"),
    second = h.F.attach("math", "aiden");
  await Promise.all([first.ready, second.ready]);
  first.record({ answered: true, correct: true });
  second.record({ answered: true, correct: true });
  await Promise.all([first.flush(), second.flush()]);
  await h.F.activity("aiden");
  assert.equal(h.F.summary("aiden").total.answered, 2);
});

test("科目入口帶正確範圍，內部心智圖保留孩子，外站不帶家庭參數；新設定離線可讀", async () => {
  const h = harness(),
    { F, C } = h;
  const settings = C.defaults();
  settings.children.aiden.homeOrder = ["website:stroke"];
  await F.saveSettings(settings, 0, "home-fields");
  h.setOffline(true);
  const cached = await F.settings();
  assert.equal(cached.offline, true);
  assert.equal(cached.data.children.aiden.homeOrder[0], "website:stroke");
  const registry = {
    mindMaps: [{ id: "latest", title: "悠閒午後", date: "2026-09-15", path: "leisure-mind-map/" }],
    apps: [{ id: "study", status: "active", path: "study/" }],
  };
  const entries = C.homeEntries(cached.data, "aiden", registry);
  const math = new URL(
    F.entryHref(
      entries.find((e) => e.id === "study:math"),
      "aiden",
    ),
  );
  assert.equal(math.searchParams.get("subject"), "math");
  assert.equal(math.searchParams.get("term"), "g4-s1");
  assert.equal(math.searchParams.get("child"), "aiden");
  assert.equal(
    F.entryHref(
      entries.find((e) => e.id === "mind-map"),
      "aiden",
    ),
    "https://kids.linshuhuan.com/leisure-mind-map/?child=aiden",
  );
  assert.equal(
    F.entryHref(entries[0], "aiden"),
    "https://stroke.gh.miniasp.com/",
  );
});

test("站內文章路徑沿用部署前綴", () => {
  const { F } = harness({ base: "https://huansbox.github.io/aiden-study/" });
  assert.equal(
    F.entryHref({ internal: true, url: "/leisure-mind-map/" }, "aiden"),
    "https://huansbox.github.io/aiden-study/leisure-mind-map/?child=aiden",
  );
});
