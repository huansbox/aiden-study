import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import worker from "../worker/worker.mjs";
import { kvStub } from "../worker/kv-stub.mjs";
import "../docs/nativecamp/core.js";

const source = (path) => readFileSync(new URL("../docs/" + path, import.meta.url), "utf8");
const origin = "http://127.0.0.1:8788";
const decode = (s) => s.replace(/&(amp|lt|gt|quot|#39);/g, (_, name) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[name]);
const waiters = new Set();
function changed() {
  // 完成這輪 DOM 更新後才檢查，避免觀察到 render 中途暫時不存在的節點。
  for (const check of waiters) queueMicrotask(check);
}
function until(predicate) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const finish = (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      waiters.delete(check);
      if (error) reject(error);
      else resolve();
    };
    const check = () => {
      if (finished) return;
      try {
        if (predicate()) finish();
      } catch (error) {
        finish(error);
      }
    };
    const timeout = setTimeout(() => finish(Error("頁面未在 5 秒內完成預期更新")), 5000);
    waiters.add(check);
    check();
  });
}
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// 只替代 DOM 與網路傳輸；腳本依真實 HTML 載入，使用真正 auth、family client 與 Worker。
// 此小型 DOM 保留節點身分、輸入值與事件，讓測試能抓到查詢誤重繪表單的問題。
class Element {
  constructor(tag = "div", attrs = {}) {
    this.tag = tag;
    this.attrs = attrs;
    this.id = attrs.id || "";
    this.dataset = Object.fromEntries(Object.entries(attrs).filter(([key]) => key.startsWith("data-")).map(([key, value]) => [key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), value]));
    this.value = attrs.value || "";
    this.checked = Object.hasOwn(attrs, "checked");
    this.disabled = Object.hasOwn(attrs, "disabled");
    this.children = [];
    this.events = new Map();
  }
  set innerHTML(html) {
    this.html = html;
    this.children = [...html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)].map((match) => {
      const attrs = Object.fromEntries([...match[2].matchAll(/([^\s=]+)(?:="([^"]*)"|='([^']*)'|=([^\s]+))?/g)].map(([, key, quoted, single, plain]) => [key, decode(quoted ?? single ?? plain ?? "")]));
      const child = new Element(match[1], attrs);
      child.text = decode(html.slice(match.index + match[0].length).split("<")[0]);
      child.parent = this;
      return child;
    });
    changed();
  }
  get innerHTML() { return this.html || ""; }
  set textContent(value) { this.text = String(value); changed(); }
  get textContent() { return this.text ?? decode(this.innerHTML.replace(/<[^>]+>/g, "")); }
  matches(selector) {
    if (selector.startsWith("#")) return this.id === selector.slice(1);
    if (selector.startsWith("[")) return [...selector.matchAll(/\[([^=\]]+)(?:=["']?([^"'\]]+)["']?)?\]/g)].every(([, key, value]) => Object.hasOwn(this.attrs, key) && (value === undefined || this.attrs[key] === value));
    return selector === this.tag;
  }
  querySelectorAll(selector) {
    const all = this.children.flatMap((child) => [child, ...child.querySelectorAll("*")]);
    return selector === "*" ? all : all.filter((child) => selector.split(",").some((part) => child.matches(part)));
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  addEventListener(type, handler) { this.events.set(type, handler); }
  fire(type) { return (this["on" + type] || this.events.get(type))?.({ target: this, preventDefault() {} }); }
  closest() { return this; }
  before(element) { element.parent = this.parent; this.parent.children.splice(this.parent.children.indexOf(this), 0, element); changed(); }
  appendChild(element) { element.parent = this; this.children.push(element); changed(); return element; }
  get elements() { return { key: this.parent.querySelector("[name=key]") }; }
}

async function page({ initial = {}, statusQueue = [], registry = JSON.parse(source("registry.json")), child, lessonId = "2026-09-15", freshDevice = false } = {}) {
  const root = new Element();
  root.id = "parent";
  const storage = new Map();
  const requests = [];
  const env = { TOKEN: "test-token", KV: kvStub(initial), LOCAL_DEV: true };
  const jar = { cookie: "" };
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
    get length() { return storage.size; },
    key: (index) => [...storage.keys()][index],
  };
  const search = (freshDevice ? "?" : "?k=test-token") + (child ? "&child=" + encodeURIComponent(child) : "") + (lessonId ? "&lesson=" + encodeURIComponent(lessonId) : "");
  const location = { href: origin + "/parent/" + search, search };
  const document = {
    currentScript: {},
    visibilityState: "visible",
    getElementById: (id) => id === "parent" ? root : root.querySelector("#" + id),
    createElement: (tag) => new Element(tag),
    addEventListener() {},
  };
  const context = vm.createContext({
    document, location, localStorage, URL, URLSearchParams, crypto, AbortController,
    performance, Blob, Intl, Date,
    setTimeout, clearTimeout, setInterval() {},
    addEventListener() {}, dispatchEvent() {},
    CustomEvent: class { constructor(type) { this.type = type; } },
    confirm: () => true,
    history: { replaceState(_state, _title, url) { location.href = String(url); location.search = new URL(url).search; } },
    fetch: async (input, init = {}) => {
      const url = new URL(input, location.href);
      if (url.pathname === "/registry.json") return json(registry);
      if (url.pathname === "/nativecamp/lessons/catalog.json") return json(JSON.parse(source("nativecamp/lessons/catalog.json")));
      if (/^\/nativecamp\/lessons\/[a-z0-9-]+\.json$/.test(url.pathname)) {
        // Serve each catalog entry's real bundle, including weekly IDs whose date differs from their ID.
        return json(JSON.parse(source(url.pathname.slice(1))));
      }
      assert.equal(url.origin, origin, "不得連線正式服務");
      const headers = new Headers(init.headers);
      headers.set("Origin", origin);
      if (jar.cookie) headers.set("Cookie", jar.cookie);
      requests.push({ path: url.pathname, init });
      const request = new Request(url, { ...init, headers });
      const queued = url.pathname === "/api/v1/status" && statusQueue.shift();
      const pending = queued ? queued(request) : worker.fetch(request, env);
      changed();
      const response = await pending;
      const cookie = response.headers.get("set-cookie");
      if (cookie) jar.cookie = cookie.split(";")[0];
      return response;
    },
  });
  context.window = context;
  for (const [, script] of source("parent/index.html").matchAll(/<script src="([^"]+)"/g)) {
    const url = new URL(script, location.href);
    document.currentScript.src = url.href;
    vm.runInContext(source(url.pathname.slice(1)), context, { filename: url.pathname });
  }
  await until(() => root.querySelector(freshDevice ? "#connect-family" : "#sync-status"));
  if (freshDevice) await new Promise((resolve) => setImmediate(resolve));
  return {
    root, document, requests, env, jar, context, statusQueue,
    panel: () => root.querySelector("#parent-sync"),
    status: () => root.querySelector("#sync-status")?.textContent,
    async ready() { await until(() => this.status() && this.status() !== "查詢中⋯"); },
    async refresh() { await root.querySelector("#sync-refresh").fire("click"); },
  };
}

const progress = (child, app, date = "2026-09-15T18:05:06.000Z") => ({
  ["p:" + child + ":" + app]: { value: JSON.stringify({ rev: 3, data: {} }), metadata: { rev: 3, updatedAt: date } },
});
const record = (child, app, date) => ({ child, app, rev: 3, lastWrite: date });

test("新機器直接開家長後台可輸入金鑰，錯誤後重試並連接成功", async () => {
  const h = await page({ freshDevice: true });
  const key = h.root.querySelector("[name=key]");
  const form = h.root.querySelector("#connect-family");
  assert.equal(key.disabled, false, "首次設定載入不得鎖住金鑰欄位");
  assert.equal(h.root.querySelector("#connect-retry").disabled, false);
  assert.equal(h.root.querySelector("#save"), null);
  key.value = "wrong-test-key";
  form.fire("submit");
  await until(() => !key.disabled);
  assert.equal(h.context.KidsAuth.state.status, "required");
  assert.ok(h.root.querySelector("#connect-status").textContent);
  key.value = "test-token";
  form.fire("submit");
  await until(() => h.root.querySelector("#save"));
  await h.ready();
  assert.equal(h.context.KidsAuth.state.status, "connected");
  assert.equal(h.root.querySelector("#connect-family"), null);
  assert.equal(key.value, "");
  assert.equal(h.root.querySelector("#save").disabled, false);
});

test("Native Camp family summary reads authenticated first results, keeps modes and children separate", async () => {
  const C = globalThis.NativeCampCore;
  const lesson = JSON.parse(source("nativecamp/lessons/2026-09-15.json"));
  const concept = lesson.concepts[0], question = concept.try[0], spoken = concept.say[0];
  let data = C.createProgress();
  const wrong = question.choices.find((option) => option.id !== question.answer).id;
  data = C.submitTry(data, lesson, "2026-09-17", concept.id, question.id, wrong).progress;
  data = C.markPending(data, lesson, "say", "2026-09-17", concept.id, spoken.id, "reveal");
  data = C.submitSay(data, lesson, "2026-09-17", concept.id, spoken.id, "withHelp").progress;
  const h = await page({ initial: { "p:aiden:nativecamp": { value: JSON.stringify({ rev: 2, epoch: "same", data }) } } });
  await until(() => h.root.querySelector("#nativecamp-summary")?.innerHTML.includes("Read from family storage"));
  const panel = h.root.querySelector("#nativecamp-summary");
  assert.match(panel.innerHTML, /href="\.\.\/nativecamp\/preview\.html\?child=aiden&amp;lesson=2026-09-15"/);
  assert.match(panel.innerHTML, /Try it · In progress/);
  assert.match(panel.innerHTML, /Say it · In progress/);
  assert.match(panel.innerHTML, /Independent/);
  assert.match(panel.innerHTML, /Not yet/);
  assert.doesNotMatch(panel.innerHTML, /[\u3400-\u9FFF]/);
  assert.ok(h.requests.some((request) => request.path === "/api/v1/progress/aiden/nativecamp"));
  await h.root.querySelector('[data-child="bingpu"]').fire("click");
  await until(() => h.root.querySelector("#nativecamp-summary")?.innerHTML.includes("No practice has been saved"));
  assert.doesNotMatch(h.root.querySelector("#nativecamp-summary").innerHTML, /Try it ·/);
  assert.match(h.root.querySelector("#nativecamp-summary").innerHTML, /href="\.\.\/nativecamp\/preview\.html\?child=bingpu&amp;lesson=2026-09-15"/);
});

test("Native Camp summary hides stale or malformed remote data rather than presenting success", async () => {
  const data = globalThis.NativeCampCore.createProgress();
  const h = await page({ initial: { "p:aiden:nativecamp": { value: JSON.stringify({ rev: 3, epoch: "same", data }) } } });
  await until(() => h.root.querySelector("#nativecamp-summary")?.innerHTML.includes("Read from family storage"));
  for (const body of [{ rev: 2, epoch: "same", data }, { rev: 0, data: null }, { rev: 4, epoch: "same", data: {} }]) {
    await h.env.KV.put("p:aiden:nativecamp", JSON.stringify(body));
    await h.root.querySelector("#nativecamp-summary").querySelector("[data-nativecamp-refresh]").fire("click");
    assert.match(h.root.querySelector("#nativecamp-summary").innerHTML, /No results are shown/);
    assert.match(h.root.querySelector("#nativecamp-summary").innerHTML, /href="\.\.\/nativecamp\/preview\.html\?child=aiden&amp;lesson=2026-09-15"/);
    assert.doesNotMatch(h.root.querySelector("#nativecamp-summary").innerHTML, /Read from family storage|Try it ·/);
  }
});

test("Native Camp defaults to the latest open bundle, switches old and weekly previews, and preserves unsaved parent settings", async () => {
  const C = globalThis.NativeCampCore, lesson = JSON.parse(source("nativecamp/lessons/2026-09-15.json"));
  const entries = JSON.parse(source("nativecamp/lessons/catalog.json")).lessons;
  const latest = entries.filter((entry) => (entry.weekly?.opensOn || entry.date) <= C.today()).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[0];
  const concept = lesson.concepts[0]; let data = C.createProgress();
  for (const q of concept.try.slice(0, 2)) data = C.submitTry(data, lesson, "2026-09-15", concept.id, q.id, q.answer).progress;
  const h = await page({ lessonId: null, child: "bingpu", initial: { "p:bingpu:nativecamp": { value: JSON.stringify({ rev: 1, data }) } } });
  await until(() => h.root.querySelector("#nativecamp-summary")?.innerHTML.includes("Read from family storage"));
  const panel = h.root.querySelector("#nativecamp-summary");
  assert.ok(panel.innerHTML.includes(`data-lesson="${latest.id}" aria-pressed="true"`));
  assert.ok(panel.innerHTML.includes(`child=bingpu&amp;lesson=${latest.id}`));
  assert.match(panel.innerHTML, /No practice has been saved for this lesson/);
  assert.doesNotMatch(panel.innerHTML, /Review ready/);
  const settingsInput = h.root.querySelector('[data-site="stroke"][data-field="title"]');
  settingsInput.value = "Keep this unsaved edit"; settingsInput.fire("input");
  const saved = await h.env.KV.get("p:bingpu:nativecamp");
  await panel.querySelector('[data-lesson="2026-09-15"]').fire("click");
  assert.match(panel.innerHTML, /data-lesson="2026-09-15" aria-pressed="true"/);
  assert.match(panel.innerHTML, /child=bingpu&amp;lesson=2026-09-15/);
  assert.match(panel.innerHTML, /Try it ·/);
  assert.equal(h.context.location.search, "?child=bingpu&lesson=2026-09-15");
  await panel.querySelector('[data-lesson="weekly-2026-09-14"]').fire("click");
  assert.match(panel.innerHTML, /data-lesson="weekly-2026-09-14" aria-pressed="true"/);
  assert.match(panel.innerHTML, /href="\.\.\/nativecamp\/preview\.html\?child=bingpu&amp;lesson=weekly-2026-09-14"/);
  assert.match(panel.innerHTML, /Read from family storage/);
  assert.match(panel.innerHTML, /No practice has been saved for this lesson/);
  assert.equal(h.context.location.search, "?child=bingpu&lesson=weekly-2026-09-14");
  assert.equal(h.root.querySelector('[data-site="stroke"][data-field="title"]'), settingsInput);
  assert.equal(settingsInput.value, "Keep this unsaved edit");
  assert.equal(await h.env.KV.get("p:bingpu:nativecamp"), saved);
  assert.ok(h.requests.filter((r) => r.path === "/api/v1/progress/bingpu/nativecamp").every((r) => !r.init.method || r.init.method === "GET"));
});

test("returning from preview preserves the selected child and maintenance opens a non-writing preview", async () => {
  const h = await page({ child: "bingpu" });
  await h.ready();
  await until(() => h.root.querySelector("#nativecamp-summary")?.innerHTML.includes("No practice has been saved"));
  assert.equal(h.root.querySelector('[data-child="bingpu"]').attrs["aria-pressed"], "true");
  assert.equal(h.root.querySelector('[data-child="aiden"]').attrs["aria-pressed"], "false");
  assert.match(h.root.innerHTML, /href="\.\.\/nativecamp\/preview\.html\?child=bingpu">Native Camp · Preview questions/);
  assert.doesNotMatch(h.root.innerHTML, /href="\.\.\/nativecamp\/\?child=bingpu&parent=1"/);
  assert.match(h.root.innerHTML, /href="\.\.\/study\/\?child=bingpu&parent=1"/);
});

test("家長心智圖顯示最新索引文章，僅控制顯示、不再編輯舊篇名網址", async () => {
  const registry = JSON.parse(source("registry.json"));
  registry.mindMaps.unshift({ id: "older", title: "較舊文章", date: "2026-08-01", path: "old/" });
  registry.mindMaps.push({ id: "newer", title: "本週新文章", date: "2026-09-22", path: "new/" });
  const h = await page({ registry });
  await h.ready();
  assert.match(h.root.innerHTML, /最新文章：本週新文章/);
  assert.equal(h.root.querySelector("#map-title"), null);
  assert.equal(h.root.querySelector("#map-url"), null);
  assert.equal(h.root.querySelector("#map-enabled").checked, true);
});

test("真實頁面透過 Cookie 查詢 Worker metadata，依孩子與已開放 App 顯示臺灣時間及本機限制", async () => {
  const h = await page({ initial: {
    ...progress("aiden", "study"),
    ...progress("bingpu", "zhuyin", "2026-09-16T01:02:03.000Z"),
    ...progress("test-child", "math"),
    "m:aiden:math:device": { value: JSON.stringify({}) },
  } });
  await h.ready();
  assert.match(h.panel().innerHTML, /煦誠的進度同步/);
  assert.match(h.panel().innerHTML, /2026\/09\/16\s+02:05:06/);
  assert.match(h.panel().innerHTML, /尚無雲端進度紀錄/);
  assert.match(h.panel().innerHTML, /原有過關進度僅存在本機；新累計另行同步/);
  assert.match(h.panel().innerHTML, /其他裝置仍可能有尚未上傳的資料/);
  assert.doesNotMatch(h.panel().innerHTML, /test-child|data-sync-app="zhuyin"|同步正常/);
  const calls = h.requests.filter((r) => r.path === "/api/v1/status");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.credentials, "same-origin");
  assert.ok(!Object.hasOwn(calls[0].init.headers, "Authorization"));
  h.root.querySelector('[data-child="bingpu"]').fire("click");
  await h.ready();
  assert.match(h.panel().innerHTML, /秉樸的進度同步/);
  assert.match(h.panel().innerHTML, /2026\/09\/16\s+09:02:03/);
  assert.doesNotMatch(h.panel().innerHTML, /data-sync-app="study"/);
});

test("查詢中與失敗保留舊資料並明示過期，401 可在區塊內重新連接且不弄丟未存輸入", async () => {
  const h = await page({ initial: progress("aiden", "study") });
  await h.ready();
  const title = h.root.querySelector('[data-site="stroke"][data-field="title"]');
  const quantity = h.root.querySelector("#task-quantity");
  title.value = "尚未儲存的網站";
  title.fire("input");
  quantity.value = "17";
  let release;
  h.statusQueue.push(() => new Promise((resolve) => { release = resolve; }));
  const pending = h.refresh();
  await until(() => release);
  assert.equal(h.status(), "查詢中⋯");
  assert.match(h.panel().innerHTML, /舊資料，尚未更新/);
  release(json({ error: "paused" }, 503));
  await pending;
  assert.match(h.status(), /服務暫時無法使用/);
  assert.match(h.panel().innerHTML, /舊資料，尚未更新/);
  assert.match(h.panel().innerHTML, /2026\/09\/16\s+02:05:06/);
  h.statusQueue.push(() => { throw Error("offline"); });
  await h.refresh();
  assert.match(h.status(), /目前無法連線/);
  h.jar.cookie = "";
  await h.refresh();
  assert.match(h.status(), /家庭連線已失效/);
  h.root.querySelector("#sync-reconnect").fire("click");
  const key = h.root.querySelector("[name=key]");
  key.value = "test-token";
  h.root.querySelector("#connect-family").fire("submit");
  await until(() => h.status() === "查詢完成。");
  assert.equal(h.root.querySelector('[data-site="stroke"][data-field="title"]'), title);
  assert.equal(h.root.querySelector("#task-quantity"), quantity);
  assert.equal(title.value, "尚未儲存的網站");
  assert.equal(quantity.value, "17");
  assert.equal(h.root.querySelector("#save-status").textContent, "尚未儲存");
});

test("首次查詢失敗不冒充空紀錄，合法空結果與缺少時間的紀錄分開顯示", async () => {
  const h = await page({ statusQueue: [() => json({ error: "paused" }, 503)] });
  await h.ready();
  assert.match(h.status(), /服務暫時無法使用/);
  assert.match(h.panel().innerHTML, /尚未取得雲端紀錄/);
  assert.doesNotMatch(h.panel().innerHTML, /尚無雲端進度紀錄|最近查詢/);
  await h.refresh();
  assert.match(h.panel().innerHTML, /尚無雲端進度紀錄/);
  await h.env.KV.put("p:aiden:study", "{}");
  await h.refresh();
  assert.match(h.panel().innerHTML, /已有雲端紀錄，接收時間不明/);
});

test("401 的區塊登入表單不攔住切孩子；重新登入後表單與寫入歸屬一致", async () => {
  const h = await page();
  await h.ready();
  const aidenMap = h.root.querySelector("#map-enabled");
  aidenMap.checked = false;
  aidenMap.fire("change");
  h.jar.cookie = "";
  await h.refresh();
  h.root.querySelector("#sync-reconnect").fire("click");
  assert.ok(h.root.querySelector("#sync-connect").querySelector("#connect-family"));
  h.root.querySelector('[data-child="bingpu"]').fire("click");
  const connection = h.root.querySelector("#parent-connection");
  assert.ok(connection, "切孩子後應進入全頁登入，不可留下另一個孩子的表單");
  assert.equal(h.root.querySelector("#map-enabled"), null);
  assert.equal(h.panel(), null);
  connection.querySelector("[name=key]").value = "test-token";
  connection.querySelector("#connect-family").fire("submit");
  await h.ready();
  assert.match(h.panel().innerHTML, /秉樸的進度同步/);
  assert.equal(h.root.querySelector('[data-app="zhuyin"]').checked, true);
  assert.equal(h.root.querySelector('[data-app="study"]').checked, false);
  const bingpuMap = h.root.querySelector("#map-enabled");
  assert.notEqual(bingpuMap, aidenMap);
  bingpuMap.checked = true;
  bingpuMap.fire("change");
  await h.root.querySelector("#save").fire("click");
  await h.ready();
  const saved = JSON.parse(await h.env.KV.get("c:family:settings")).data;
  assert.equal(saved.children.bingpu.mindMap.enabled, true);
  assert.equal(saved.children.aiden.mindMap.enabled, false);
});

test("較晚回來的舊查詢不覆蓋新孩子的結果；重新讀取與儲存設定後範圍相符", async () => {
  const h = await page();
  await h.ready();
  let release;
  h.statusQueue.push(() => new Promise((resolve) => { release = resolve; }));
  const pending = h.refresh();
  await until(() => release);
  await h.env.KV.put("p:bingpu:zhuyin", "{}", { metadata: { rev: 4, updatedAt: "2026-09-16T02:00:00.000Z" } });
  h.root.querySelector('[data-child="bingpu"]').fire("click");
  await h.ready();
  release(json({ keys: [record("bingpu", "zhuyin", "2026-01-01T00:00:00.000Z")] }));
  await pending;
  assert.match(h.panel().innerHTML, /2026\/09\/16\s+10:00:00/);
  assert.doesNotMatch(h.panel().innerHTML, /2026\/01\/01/);
  const settings = h.context.KidsFamily.core.defaults();
  settings.children.bingpu.apps = ["math", "animal-fight"];
  await h.env.KV.put("c:family:settings", JSON.stringify({ rev: 1, data: settings }));
  h.root.querySelector("#reload").fire("click");
  await until(() => h.panel().innerHTML.includes('data-sync-app="animal-fight"'));
  await h.ready();
  assert.doesNotMatch(h.panel().innerHTML, /data-sync-app="zhuyin"/);
  assert.match(h.panel().innerHTML, /外部網站，進度未納入同步/);
  const math = h.root.querySelector('[data-app="math"]');
  math.checked = false;
  math.fire("change");
  await h.root.querySelector("#save").fire("click");
  await h.ready();
  assert.match(h.panel().innerHTML, /data-sync-app="animal-fight"/);
  assert.doesNotMatch(h.panel().innerHTML, /data-sync-app="math"|含尚未儲存的調整/);
  assert.deepEqual(JSON.parse(await h.env.KV.get("c:family:settings")).data.children.bingpu.apps, ["animal-fight"]);
});

test("損壞或惡意狀態回應不可變成空紀錄；可顯示欄位經過跳脫", async () => {
  const registry = JSON.parse(source("registry.json"));
  registry.children[0].name = '<img src=x onerror="bad()">';
  const h = await page({ registry, initial: progress("aiden", "study") });
  await h.ready();
  assert.match(h.panel().innerHTML, /&lt;img src=x onerror=&quot;bad\(\)&quot;&gt;/);
  assert.doesNotMatch(h.panel().innerHTML, /<img src=x/);
  for (const body of [
    {},
    { keys: null },
    { keys: [{ child: "aiden", app: "study", rev: 1, lastWrite: '<img src=x onerror="bad()">' }] },
    { keys: [{ child: "aiden", app: "study", rev: "1", lastWrite: null }] },
    { keys: [record("aiden", "study", null), record("aiden", "study", null)] },
  ]) {
    h.statusQueue.push(() => json(body));
    await h.refresh();
    assert.match(h.status(), /回應不完整/);
    assert.match(h.panel().innerHTML, /舊資料，尚未更新/);
    assert.match(h.panel().innerHTML, /2026\/09\/16\s+02:05:06/);
    assert.doesNotMatch(h.panel().innerHTML, /<img src=x/);
  }
  h.statusQueue.push(() => new Response("broken json", { status: 200 }));
  await h.refresh();
  assert.match(h.status(), /回應不完整/);
  assert.match(h.panel().innerHTML, /舊資料，尚未更新/);
});
