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

// status 定義域的單一真相源＝hub 實際渲染的分組列表（parentGroups 對不在列的 status 是靜默消失，
// 這裡若另抄一份，兩份漂移時 app 會從家長目錄無聲蒸發而測試全綠）
const hubHtml = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
const hubBlk = hubHtml.match(/\/\/ <hub-pure>([\s\S]*?)\/\/ <\/hub-pure>/);
if (!hubBlk) throw new Error("docs/index.html 找不到 <hub-pure> 區塊");
const { STATUS_ORDER: STATUS } = new Function(hubBlk[1] + "\nreturn { STATUS_ORDER };")();

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

test("sync 設定一致：sync=true 必為站內 app、頁面引用 sync client、雲端 key 段＝registry id", () => {
  const errs = [];
  for (const a of (reg.apps || []).filter((x) => x.sync === true)) {
    if (typeof a.path !== "string") { errs.push(`app ${a.id} sync=true 但非站內 path app`); continue; }
    const idx = new URL(`../docs/${a.path}index.html`, import.meta.url);
    if (!existsSync(idx)) continue; // path 實存已由上一測項報
    const src = readFileSync(idx, "utf8");
    if (!src.includes("shared/sync-v1.js")) errs.push(`app ${a.id} sync=true 但 docs/${a.path}index.html 未引用 shared/sync-v1.js`);
    // hub 健康燈 join 的真契約：registry id ＝ app 傳給 sync client 的雲端 key app 段。
    // 慣例（#40-B 起）＝恰一個 <wiring-config> 區塊、WIRING_CONFIG.appId 接進 createWiring；
    // 0 或多個都當髒（響亮失敗勝過默過）
    const cfgs = [...src.matchAll(/\/\/ <wiring-config>[\s\S]*?const WIRING_CONFIG = (\{[\s\S]*?\});[\s\S]*?\/\/ <\/wiring-config>/g)];
    if (cfgs.length !== 1) { errs.push(`app ${a.id} 頁面應恰有一個 <wiring-config> 區塊，找到 ${cfgs.length} 個`); continue; }
    let cfg;
    try { cfg = new Function(`return ${cfgs[0][1]};`)(); } catch (e) { errs.push(`app ${a.id} 的 WIRING_CONFIG 不是純物件字面量：${e.message}`); continue; }
    if (!src.includes("createWiring(WIRING_CONFIG)")) errs.push(`app ${a.id} 的 WIRING_CONFIG 未接進 createWiring`);
    if (!src.includes("shared/wiring-v1.js")) errs.push(`app ${a.id} 未引用 shared/wiring-v1.js`);
    if (cfg.appId !== a.id) errs.push(`app ${a.id} 的雲端 key 段（${cfg.appId}）與 registry id 不一致，健康燈 join 會永遠對不上`);
  }
  assert.deepEqual(errs, []);
});

// CHILD_INFO（wiring-v1 的 app 端靜態副本）↔ registry children（hub 的真相源）：
// 加小孩＝改兩處，漂移時這裡響（app 端選單／徽章少人，跟 hub 對不上）
const wiringSrc = readFileSync(new URL("../docs/shared/wiring-v1.js", import.meta.url), "utf8");
const wiringBlk = wiringSrc.match(/\/\/ <wiring-pure>([\s\S]*?)\/\/ <\/wiring-pure>/);
if (!wiringBlk) throw new Error("docs/shared/wiring-v1.js 找不到 <wiring-pure> 區塊");
const { CHILD_INFO } = new Function(wiringBlk[1] + "\nreturn { CHILD_INFO };")();

test("wiring CHILD_INFO 與 registry children 一字不差（id／名字／emoji）", () => {
  const errs = [];
  const wiringIds = Object.keys(CHILD_INFO);
  if (wiringIds.length !== childIds.length) errs.push(`人數不符：wiring ${wiringIds.length} vs registry ${childIds.length}`);
  for (const c of reg.children || []) {
    const w = CHILD_INFO[c.id];
    if (!w) { errs.push(`registry child ${c.id} 不在 wiring CHILD_INFO`); continue; }
    if (w.label !== c.name) errs.push(`child ${c.id} 名字不一致：wiring「${w.label}」vs registry「${c.name}」`);
    if (w.emoji !== c.emoji) errs.push(`child ${c.id} emoji 不一致：wiring ${w.emoji} vs registry ${c.emoji}`);
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
