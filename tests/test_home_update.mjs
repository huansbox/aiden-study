import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
const script = readFileSync(new URL("../docs/shared/home-update.js", import.meta.url), "utf8");
const old = "a".repeat(64), next = "b".repeat(64);
const html = (version) => `<html><head><meta name="kids-home-release" content="${version}"></head></html>`;
const tick = () => new Promise((resolve) => setImmediate(resolve));

function browser(options = {}) {
  let now = 10000, interval;
  const events = {}, requests = [], navigation = [], saved = options.saved || new Map();
  const state = { remote: old, page: next, form: false, version: old, ...options };
  const document = {
    visibilityState: "visible",
    currentScript: { src: "https://kids.test/aiden-study/shared/home-update.js?v=" + old },
    querySelector: () => ({ content: state.version }),
    getElementById: (id) => id === "hub" ? {} : id === "connect-family" && state.form ? {} : null,
    addEventListener: (name, fn) => { events[name] = fn; },
  };
  const location = {
    href: options.href || "https://kids.test/aiden-study/?child=bingpu#test",
    replace: (url) => navigation.push(url),
  };
  const context = vm.createContext({
    URL, AbortController, document, location,
    Date: { now: () => now },
    setTimeout, clearTimeout,
    setInterval: (fn) => { interval = fn; },
    addEventListener: document.addEventListener,
    sessionStorage: {
      getItem: (key) => { if (state.blocked) throw Error("blocked"); return saved.get(key) || null; },
      setItem: (key, value) => { if (state.blocked) throw Error("blocked"); saved.set(key, value); },
    },
    // 任何觸碰孩子的本機資料或登入 Cookie 都會直接使測試失敗。
    localStorage: new Proxy({}, { get() { throw Error("must not access learning storage"); } }),
    DOMParser: class {
      parseFromString(text) { return { querySelector: () => ({ content: /content="([a-f0-9]+)"/.exec(text)?.[1] }) }; }
    },
    fetch: async (url, init = {}) => {
      requests.push({ url: String(url), init });
      if (String(url).includes("/api/v1/session")) {
        if (state.authHold) await state.authHold;
        if (state.authOffline) throw Error("session offline");
        if (init.method === "POST") state.cookie = true;
        return { ok: Boolean(state.cookie), status: state.cookie ? 200 : 401,
          json: async () => ({ authenticated: Boolean(state.cookie) }) };
      }
      if (state.fail) throw Error("offline");
      if (state.hold) await state.hold;
      return { ok: !state.badStatus, json: async () => ({ version: state.remote }), text: async () => html(state.page) };
    },
  });
  context.window = context;
  if (state.realAuth) {
    context.CustomEvent = class { constructor(type) { this.type = type; } };
    context.dispatchEvent = (event) => { events[event.type]?.(); };
    context.history = { state: null, replaceState: (_s, _t, url) => { location.href = String(url); } };
    vm.runInContext(readFileSync(new URL("../docs/shared/device-auth.js", import.meta.url), "utf8"), context);
    state.auth = context.KidsAuth;
  }
  vm.runInContext(script, context);
  return { state, document, events, requests, navigation, saved, location,
    advance: (ms = 6000) => { now += ms; }, poll: () => interval?.() };
}

test("發布版本與首頁所有 JS/CSS 相符；CI 可攔截漏更新的首頁內容", () => {
  execFileSync(process.execPath, ["scripts/build-home-release.mjs", "--check"], { cwd: new URL("../", import.meta.url) });
  const index = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
  const release = JSON.parse(readFileSync(new URL("../docs/home-release.json", import.meta.url), "utf8")).version;
  for (const ref of index.matchAll(/(?:src|href)="shared\/[^"]+\?v=([^"]+)"/g)) assert.equal(ref[1], release);
  assert.match(index, /href="platform\.webmanifest"/); // 不更動已安裝圖示的 manifest 位址。
});

test("已開著的首頁發現新發布：預讀相符 HTML、更新 HTTP cache，再保留 child/hash 重載", async () => {
  const b = browser();
  await tick();
  assert.equal(b.navigation.length, 0);
  b.state.remote = next;
  b.advance();
  await b.events.focus();
  assert.equal(b.navigation.length, 1);
  const target = new URL(b.navigation[0]);
  assert.equal(target.searchParams.get("child"), "bingpu");
  assert.equal(target.searchParams.get("_release"), next);
  assert.equal(target.hash, "#test");
  assert.equal(target.pathname, "/aiden-study/");
  assert.equal(b.requests.at(-2).init.cache, "no-store");
  assert.equal(b.requests.at(-1).init.cache, "reload");
  assert.equal(b.saved.size, 1);
  assert.ok(b.saved.has("kids:home-update-attempt"));
});

test("舊金鑰圖示須等待真實 auth 完成 Cookie 讀回，連線失敗不丟失過渡狀態", async () => {
  let finish;
  const b = browser({ realAuth: true, remote: next,
    href: "https://kids.test/aiden-study/?child=aiden&k=fixture",
    authHold: new Promise((resolve) => { finish = resolve; }),
  });
  await tick();
  assert.equal(b.state.auth.state.status, "checking");
  assert.equal(new URL(b.location.href).searchParams.has("k"), false);
  assert.equal(b.navigation.length, 0);
  assert.equal(b.requests.some((r) => r.url.includes("home-release.json")), false);
  finish(); await b.state.auth.ready; await tick();
  assert.equal(b.state.cookie, true);
  assert.equal(b.navigation.length, 1);
  assert.equal(b.state.auth.state.status, "connected");
  const offline = browser({ realAuth: true, remote: next, authOffline: true,
    href: "https://kids.test/aiden-study/?child=aiden&k=fixture" });
  await offline.state.auth.ready; await tick();
  assert.equal(offline.navigation.length, 0);
  offline.state.authOffline = false; offline.advance();
  await offline.state.auth.refresh(); await tick();
  assert.equal(offline.navigation.length, 1);
});

test("離線、伺服器錯誤、壞版本及尚未一致的發布保留畫面，恢復後可更新", async () => {
  const b = browser({ fail: true, remote: next });
  await tick();
  for (const patch of [
    { fail: false, badStatus: true },
    { badStatus: false, remote: "<script>" },
    { remote: next, page: old },
  ]) {
    Object.assign(b.state, patch); b.advance(); await b.poll();
    assert.equal(b.navigation.length, 0);
    assert.equal(b.saved.size, 0);
  }
  b.state.page = next; b.advance(); await b.events.online();
  assert.equal(b.navigation.length, 1);
});

test("背景、離開頁面、登入輸入都延後更新；晚回應不打斷導航", async () => {
  const b = browser({ form: true, remote: next });
  await tick(); assert.equal(b.requests.length, 0);
  b.state.form = false; b.document.visibilityState = "hidden";
  await b.events.visibilitychange(); assert.equal(b.requests.length, 0);
  b.document.visibilityState = "visible";
  let release;
  b.state.hold = new Promise((resolve) => { release = resolve; });
  const pending = b.events.visibilitychange();
  await tick(); b.events.pagehide(); release(); await pending;
  assert.equal(b.navigation.length, 0);
  b.state.hold = null; b.advance(); b.events.pageshow(); await tick();
  assert.equal(b.navigation.length, 1);
});

test("多個喚醒事件只共用一輪檢查，沒有新版不重載", async () => {
  const b = browser();
  await tick();
  await b.events.focus(); await b.events.online(); await b.poll();
  assert.equal(b.requests.length, 1);
  b.advance(); await b.poll();
  assert.equal(b.requests.length, 2);
  assert.equal(b.navigation.length, 0);
});

test("重載仍收到舊頁面時避免迴圈，五分鐘後允許恢復；儲存禁用仍不迴圈", async () => {
  const saved = new Map([["kids:home-update-attempt", JSON.stringify({ version: next, at: 10000 })]]);
  const b = browser({ remote: next, saved });
  await tick(); assert.equal(b.navigation.length, 0);
  b.advance(300001); await b.poll(); assert.equal(b.navigation.length, 1);
  const blocked = browser({ remote: next, blocked: true, href: "https://kids.test/aiden-study/?child=aiden&_release=" + next });
  await tick(); assert.equal(blocked.navigation.length, 0);
});

test("更新器不在家長、練習或還原入口啟動；預讀不攜帶舊金鑰", async () => {
  for (const tail of ["study/?child=aiden", "?view=parent", "?child=aiden#restore=payload"]) {
    const b = browser({ href: "https://kids.test/aiden-study/" + tail, remote: next });
    await tick(); assert.equal(b.requests.length, 0);
  }
  const b = browser({ remote: next, href: "https://kids.test/aiden-study/?child=aiden&k=fixture" });
  await tick();
  assert.equal(b.requests.length, 2);
  for (const req of b.requests) assert.equal(new URL(req.url).searchParams.has("k"), false);
});
