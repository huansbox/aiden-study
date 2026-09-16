import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const source = (path) =>
  readFileSync(new URL("../docs/" + path, import.meta.url), "utf8");
const settle = () => new Promise((resolve) => setImmediate(resolve));

// 頁面以已登入但首次 settings 請求失敗的情境啟動；只模擬 DOM，執行真正頁面程式。
function page(script) {
  const handlers = new Map();
  const root = {
    innerHTML: "",
    querySelector(selector) {
      return this.innerHTML.includes(`id="${selector.slice(1)}"`)
        ? {
            addEventListener: (event, fn) =>
              handlers.set(selector + ":" + event, fn),
          }
        : null;
    },
    querySelectorAll: () => [],
  };
  const context = vm.createContext({
    URL,
    URLSearchParams,
    location: { search: "?child=aiden", hash: "" },
    document: {
      getElementById: (id) => (["hub", "parent"].includes(id) ? root : null),
      visibilityState: "visible",
      addEventListener() {},
    },
    addEventListener() {},
    setInterval() {},
    restoreForwardTarget: () => null,
    fetch: async () => ({
      ok: true,
      json: async () => JSON.parse(source("registry.json")),
    }),
    KidsSyncV1: { bootIdentity: () => ({ child: "aiden" }) },
    KidsAuth: {
      state: { status: "connected" },
      ready: Promise.resolve(),
      refresh: async () => {},
    },
  });
  context.window = context;
  vm.runInContext(source("shared/family-core.js"), context);
  const missing = {
    available: false,
    rev: 0,
    data: context.KidsFamilyCore.defaults(),
  };
  context.KidsFamily = {
    core: context.KidsFamilyCore,
    cachedSettings: () => missing,
    settings: async () => ({ ...missing, offline: true, error: "服務暫停" }),
    activity: async () => {},
  };
  vm.runInContext(source(script), context);
  return { root, handlers };
}

for (const [label, script] of [
  ["孩子首頁", "shared/home.js"],
  ["家長後台", "parent/parent.js"],
]) {
  test(`${label} 首次讀不到設定只提供重試，不顯示預設活動或可覆寫雲端的表單`, async () => {
    const h = page(script);
    await settle();
    assert.match(h.root.innerHTML, /尚未取得家庭設定/);
    assert.doesNotMatch(
      h.root.innerHTML,
      /開始練習|長除法|英文拼字|儲存全部設定/,
    );
    assert.equal(typeof h.handlers.get("#settings-retry:click"), "function");
    await h.handlers.get("#settings-retry:click")();
    await settle();
    assert.match(h.root.innerHTML, /尚未取得家庭設定/);
  });
}
