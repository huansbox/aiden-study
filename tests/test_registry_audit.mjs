// registry 真檔 audit（票 #31）：docs/registry.json 的不變量，違規聚合列出（慣例同 zhuyin content audit）。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const reg = JSON.parse(readFileSync(new URL("../docs/registry.json", import.meta.url), "utf8"));

// id 與雲端 key 段同一格式（worker KEY_RE／sync-v1 normalizeChildId；test_child_store.mjs 釘住兩邊一字不差）
const syncSrc = readFileSync(new URL("../docs/shared/sync-v1.js", import.meta.url), "utf8");
const clientBlk = syncSrc.match(/\/\/ <sync-client>([\s\S]*?)\/\/ <\/sync-client>/);
if (!clientBlk) throw new Error("docs/shared/sync-v1.js 找不到 <sync-client> 區塊");
const { normalizeChildId } = new Function(clientBlk[1] + "\nreturn { normalizeChildId };")();

const STATUS = ["active", "draft", "parked", "retired"];
const CATEGORY = ["學科", "興趣"];
const childIds = (reg.children || []).map((c) => c.id);

test("children：非空、id 唯一且合 key 格式、name/emoji 齊全", () => {
  const errs = [];
  if (!Array.isArray(reg.children) || reg.children.length === 0) errs.push("children 為空");
  if (new Set(childIds).size !== childIds.length) errs.push("children id 重複");
  for (const c of reg.children || []) {
    if (normalizeChildId(c.id) !== c.id) errs.push(`child id 不合格式：${c.id}`);
    if (typeof c.name !== "string" || !c.name) errs.push(`child ${c.id} 缺 name`);
    if (typeof c.emoji !== "string" || !c.emoji) errs.push(`child ${c.id} 缺 emoji`);
  }
  assert.deepEqual(errs, []);
});

test("apps：id 唯一且合雲端 key 段格式（sync key＝{child}:{id}）", () => {
  const errs = [];
  const ids = (reg.apps || []).map((a) => a.id);
  if (!Array.isArray(reg.apps) || reg.apps.length === 0) errs.push("apps 為空");
  if (new Set(ids).size !== ids.length) errs.push("app id 重複");
  for (const a of reg.apps || []) {
    if (normalizeChildId(a.id) !== a.id) errs.push(`app id 不合格式：${a.id}`);
    if (typeof a.name !== "string" || !a.name) errs.push(`app ${a.id} 缺 name`);
    if (typeof a.emoji !== "string" || !a.emoji) errs.push(`app ${a.id} 缺 emoji`);
  }
  assert.deepEqual(errs, []);
});

test("enum 合法：status／category／owner／audience 皆在定義域內", () => {
  const errs = [];
  for (const a of reg.apps || []) {
    if (!STATUS.includes(a.status)) errs.push(`app ${a.id} status 非法：${a.status}`);
    if (!CATEGORY.includes(a.category)) errs.push(`app ${a.id} category 非法：${a.category}`);
    if (!childIds.includes(a.owner)) errs.push(`app ${a.id} owner 非已知 child：${a.owner}`);
    if (!Array.isArray(a.audience)) errs.push(`app ${a.id} audience 須為陣列`);
    else for (const au of a.audience) {
      if (!childIds.includes(au)) errs.push(`app ${a.id} audience 含未知 child：${au}`);
    }
    if (typeof a.sync !== "boolean") errs.push(`app ${a.id} sync 須為 boolean`);
  }
  assert.deepEqual(errs, []);
});

test("path xor url：站內相對路徑且實存；外鏈必為 https", () => {
  const errs = [];
  for (const a of reg.apps || []) {
    const hasPath = typeof a.path === "string";
    const hasUrl = typeof a.url === "string";
    if (hasPath === hasUrl) { errs.push(`app ${a.id} 須恰有 path 或 url 其一`); continue; }
    if (hasPath) {
      if (a.path.startsWith("/") || a.path.includes("://")) errs.push(`app ${a.id} path 必須是相對路徑（新舊 origin base path 不同）：${a.path}`);
      if (!a.path.endsWith("/")) errs.push(`app ${a.id} path 須以 / 結尾：${a.path}`);
      const idx = new URL(`../docs/${a.path}index.html`, import.meta.url);
      if (!existsSync(idx)) errs.push(`app ${a.id} path 不實存：docs/${a.path}index.html`);
    } else if (!a.url.startsWith("https://")) {
      errs.push(`app ${a.id} url 須為 https：${a.url}`);
    }
  }
  assert.deepEqual(errs, []);
});

test("sync 設定一致：sync=true 必為站內 app 且其頁面引用 shared/sync-v1.js", () => {
  const errs = [];
  for (const a of (reg.apps || []).filter((x) => x.sync === true)) {
    if (typeof a.path !== "string") { errs.push(`app ${a.id} sync=true 但非站內 path app`); continue; }
    const idx = new URL(`../docs/${a.path}index.html`, import.meta.url);
    if (!existsSync(idx)) continue; // path 實存已由上一測項報
    const src = readFileSync(idx, "utf8");
    if (!src.includes("shared/sync-v1.js")) errs.push(`app ${a.id} sync=true 但 docs/${a.path}index.html 未引用 shared/sync-v1.js`);
  }
  assert.deepEqual(errs, []);
});

test("order：key ⊆ children、值為整數；active app 對每個 audience child 都有明確順序", () => {
  const errs = [];
  for (const a of reg.apps || []) {
    const order = a.order || {};
    if (typeof order !== "object" || Array.isArray(order)) { errs.push(`app ${a.id} order 須為物件`); continue; }
    for (const [k, v] of Object.entries(order)) {
      if (!childIds.includes(k)) errs.push(`app ${a.id} order 含未知 child：${k}`);
      if (!Number.isInteger(v)) errs.push(`app ${a.id} order[${k}] 須為整數：${v}`);
    }
    if (a.status === "active") {
      for (const au of a.audience || []) {
        if (!Number.isInteger(order[au])) errs.push(`app ${a.id} 為 active 且首頁含 ${au}，order.${au} 必填（排序不含糊）`);
      }
    }
  }
  assert.deepEqual(errs, []);
});
