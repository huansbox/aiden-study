// issue #35 iPad 平台架構 spike：純函式與靜態不變量。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const mainHtml = readFileSync(new URL("../docs/platform-ipad-spike.html", import.meta.url), "utf8");
const targetHtml = readFileSync(new URL("../docs/platform-ipad-spike-target.html", import.meta.url), "utf8");
const mainScript = mainHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const targetScript = targetHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!mainScript || !targetScript) throw new Error("spike 頁缺少 inline script");
const block = mainHtml.match(/\/\/ <platform-spike-pure>([\s\S]*?)\/\/ <\/platform-spike-pure>/);
if (!block) throw new Error("docs/platform-ipad-spike.html 找不到 <platform-spike-pure> 區塊");
const {
  SPIKE_STORAGE_KEY, spikeParams, isStandalone, targetHref, parseSpikeRecord,
} = new Function(block[1] +
  "\nreturn { SPIKE_STORAGE_KEY, spikeParams, isStandalone, targetHref, parseSpikeRecord };")();

test("spikeParams：可讀 child 與 k，但不回傳 token 原文", () => {
  const secret = "family-secret-value";
  const result = spikeParams(`?child=test%20child&k=${secret}`);
  assert.deepEqual(result, { child: "test child", hasToken: true, tokenLength: secret.length });
  assert.equal(JSON.stringify(result).includes(secret), false);
  assert.equal(Object.hasOwn(result, "token"), false);
});

test("spikeParams：區分缺少 k 與空字串 k", () => {
  assert.deepEqual(spikeParams("?child=aiden"), { child: "aiden", hasToken: false, tokenLength: 0 });
  assert.deepEqual(spikeParams("?child=&k="), { child: "", hasToken: true, tokenLength: 0 });
  assert.deepEqual(spikeParams(null), { child: "", hasToken: false, tokenLength: 0 });
});

test("isStandalone：navigator.standalone 或 display-mode 任一成立即可", () => {
  assert.equal(isStandalone(true, false), true);
  assert.equal(isStandalone(false, true), true);
  assert.equal(isStandalone(true, true), true);
  assert.equal(isStandalone(false, false), false);
  assert.equal(isStandalone(undefined, false), false);
});

test("targetHref：走同目錄目標頁、保留 query、清掉 hash", () => {
  assert.equal(
    targetHref("https://example.test/aiden-study/platform-ipad-spike.html?old=1#section", "?child=aiden&k=x%20y"),
    "https://example.test/aiden-study/platform-ipad-spike-target.html?child=aiden&k=x%20y",
  );
  assert.equal(
    targetHref("https://example.test/platform-ipad-spike.html#x", ""),
    "https://example.test/platform-ipad-spike-target.html",
  );
});

test("parseSpikeRecord：接受安全紀錄並丟棄額外欄位", () => {
  const value = parseSpikeRecord(JSON.stringify({
    markerId: "spike-123",
    createdAt: "2026-07-21T01:02:03.000Z",
    targetVisitedAt: null,
    token: "must-not-escape",
  }));
  assert.deepEqual(value, {
    markerId: "spike-123",
    createdAt: "2026-07-21T01:02:03.000Z",
    targetVisitedAt: null,
  });
  assert.equal(JSON.stringify(value).includes("must-not-escape"), false);
});

test("parseSpikeRecord：拒絕損壞或不完整資料", () => {
  for (const raw of [null, "", "not-json", "[]", "{}", '{"markerId":""}',
    '{"markerId":"ok","createdAt":"now","targetVisitedAt":12}']) {
    assert.equal(parseSpikeRecord(raw), null, String(raw));
  }
});

test("spike 頁不變量：兩頁使用同一份 scope manifest，保留標準同頁面導覽", () => {
  for (const html of [mainHtml, targetHtml]) {
    assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
    assert.match(html, /rel="manifest" href="platform-ipad-spike.webmanifest"/);
    assert.doesNotMatch(html, /target=["']_blank["']/);
  }
});

test("manifest 明定全站 scope，省略 start_url 避免覆寫安裝網址的 child／k", () => {
  const manifest = JSON.parse(readFileSync(new URL("../docs/platform-ipad-spike.webmanifest", import.meta.url), "utf8"));
  assert.equal(manifest.display, "standalone");
  assert.equal(Object.hasOwn(manifest, "start_url"), false);
  assert.equal(Object.hasOwn(manifest, "id"), false);
  for (const base of ["https://example.test/aiden-study/", "https://example.test/"]) {
    const scope = new URL(manifest.scope, base + "platform-ipad-spike.webmanifest");
    assert.equal(scope.href, base);
    for (const path of ["platform-ipad-spike.html", "platform-ipad-spike-target.html", "study/", "math/", "spelling/", "zhuyin/", "math/nonogram/"]) {
      const page = new URL(path + "?child=test-spike&k=test-only", base);
      assert.equal(page.origin, scope.origin);
      assert.ok(page.pathname.startsWith(scope.pathname), page.href);
    }
  }
});

test("spike 頁不變量：雙頁共用隔離 key，且站內連結雙向存在", () => {
  assert.equal(SPIKE_STORAGE_KEY, "kids:platform-spike:v1");
  assert.ok(mainHtml.includes(`const SPIKE_STORAGE_KEY = "${SPIKE_STORAGE_KEY}"`));
  assert.ok(targetHtml.includes(`const SPIKE_STORAGE_KEY = "${SPIKE_STORAGE_KEY}"`));
  assert.ok(mainHtml.includes('href="platform-ipad-spike-target.html"'));
  assert.ok(targetHtml.includes('href="platform-ipad-spike.html"'));
});

test("spike 頁不變量：不讀寫正式 family token key，也不內嵌測試 token", () => {
  for (const html of [mainHtml, targetHtml]) {
    assert.doesNotMatch(html, /kids_sync_token/);
    assert.doesNotMatch(html, /test-spike-token/);
  }
});

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function fakeDocument() {
  const elements = new Map();
  return {
    elements,
    getElementById(id) {
      if (!elements.has(id)) {
        const handlers = new Map();
        elements.set(id, {
          value: "", textContent: "", className: "", href: "",
          addEventListener: (type, handler) => handlers.set(type, handler),
          trigger: (type) => handlers.get(type)?.(),
        });
      }
      return elements.get(id);
    },
  };
}

function runPage(script, { storage, href, search, standalone = false }) {
  const document = fakeDocument();
  const windowHandlers = new Map();
  const window = {
    localStorage: storage,
    matchMedia: () => ({ matches: false }),
    addEventListener: (type, handler) => windowHandlers.set(type, handler),
  };
  const navigator = {
    standalone,
    userAgent: "Node.js spike smoke",
    clipboard: { writeText: async () => {} },
  };
  const location = { href, search };
  new Function("document", "window", "navigator", "location", script)(document, window, navigator, location);
  return { document, windowHandlers };
}

test("inline scripts 可解析，且模擬 runtime 可安全顯示參數", () => {
  assert.doesNotThrow(() => new Function(mainScript));
  assert.doesNotThrow(() => new Function(targetScript));
  const search = "?child=test-spike&k=test-spike-token";
  const page = runPage(mainScript, {
    storage: memoryStorage(), search,
    href: `https://example.test/aiden-study/platform-ipad-spike.html${search}`,
  });
  assert.equal(page.document.getElementById("standalone-value").textContent, "否");
  assert.equal(page.document.getElementById("child-value").textContent, "test-spike");
  assert.match(page.document.getElementById("token-value").textContent, /16 字元/);
  assert.doesNotMatch(page.document.getElementById("token-value").textContent, /test-spike-token/);
  assert.doesNotMatch(page.document.getElementById("report-output").textContent, /test-spike-token/);
});

test("模擬 runtime：主頁建立標記 → 目標頁讀取回寫 → 主頁讀到回寫", () => {
  const storage = memoryStorage();
  const search = "?child=test-spike&k=test-spike-token";
  const main = runPage(mainScript, {
    storage, search,
    href: `https://example.test/aiden-study/platform-ipad-spike.html${search}`,
  });
  main.document.getElementById("marker-id").value = "desktop-preflight-marker";
  main.document.getElementById("save-marker").trigger("click");
  assert.equal(parseSpikeRecord(storage.getItem(SPIKE_STORAGE_KEY)).markerId, "desktop-preflight-marker");
  assert.equal(
    main.document.getElementById("target-link").href,
    `https://example.test/aiden-study/platform-ipad-spike-target.html${search}`,
  );

  const target = runPage(targetScript, {
    storage, search,
    href: `https://example.test/aiden-study/platform-ipad-spike-target.html${search}`,
  });
  assert.equal(target.document.getElementById("marker-value").textContent, "desktop-preflight-marker");
  assert.ok(parseSpikeRecord(storage.getItem(SPIKE_STORAGE_KEY)).targetVisitedAt);
  assert.equal(
    target.document.getElementById("return-link").href,
    `platform-ipad-spike.html${search}`,
  );

  main.document.getElementById("refresh-state").trigger("click");
  assert.notEqual(main.document.getElementById("target-visited").textContent, "尚未回寫");
});

test("真機失敗回歸：系統回報 standalone=true，但另一容器無標記，不得宣稱仍在 Web Clip", () => {
  const storage = memoryStorage();
  const search = "?child=test-spike&k=test-spike-token";
  const main = runPage(mainScript, { storage, search, standalone: true,
    href: `https://example.test/aiden-study/platform-ipad-spike.html${search}` });
  main.document.getElementById("marker-id").value = "original-container-marker";
  main.document.getElementById("save-marker").trigger("click");
  const target = runPage(targetScript, { storage: memoryStorage(), search, standalone: true,
    href: `https://example.test/aiden-study/platform-ipad-spike-target.html${search}` });
  assert.equal(target.document.getElementById("navigator-value").textContent, "true");
  assert.equal(target.document.getElementById("display-mode-value").textContent, "browser");
  assert.doesNotMatch(target.document.getElementById("standalone-value").textContent, /仍在 Web Clip/);
  assert.match(target.document.getElementById("navigation-result").textContent, /尚未通過.*沒有讀到原頁標記/);
  assert.equal(target.document.getElementById("visited-value").textContent, "未回寫");
  main.document.getElementById("refresh-state").trigger("click");
  assert.equal(main.document.getElementById("current-marker").textContent, "original-container-marker");
});

test("目標頁回寫失敗時不顯示成功時間或通過訊息", () => {
  const storage = memoryStorage();
  storage.setItem(SPIKE_STORAGE_KEY, JSON.stringify({markerId: "saved-marker", createdAt: "now", targetVisitedAt: null}));
  storage.setItem = () => { throw new DOMException("Full", "QuotaExceededError"); };
  const target = runPage(targetScript, { storage, search: "?child=test-spike", standalone: true,
    href: "https://example.test/platform-ipad-spike-target.html?child=test-spike" });
  assert.match(target.document.getElementById("navigation-result").textContent, /尚未通過.*QuotaExceededError/);
  assert.equal(target.document.getElementById("visited-value").textContent, "未回寫");
  assert.equal(parseSpikeRecord(storage.getItem(SPIKE_STORAGE_KEY)).targetVisitedAt, null);
});
