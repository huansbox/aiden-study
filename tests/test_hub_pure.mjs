// hub 純函式測試（票 #31）。抽取：docs/index.html 的 <hub-pure>。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
const blk = html.match(/\/\/ <hub-pure>([\s\S]*?)\/\/ <\/hub-pure>/);
if (!blk) throw new Error("docs/index.html 找不到 <hub-pure> 區塊");
const {
  HUB_CHILD_KEY, restoreForwardTarget, knownChild, homeApps, appHref,
  parentGroups, healthRows, pickerDefault, STATUS_ORDER,
} = new Function(blk[1] +
  "\nreturn { HUB_CHILD_KEY, restoreForwardTarget, knownChild, homeApps, appHref, parentGroups, healthRows, pickerDefault, STATUS_ORDER };")();

const CHILDREN = [
  { id: "aiden", name: "哥哥", emoji: "👦" },
  { id: "bingpu", name: "弟弟", emoji: "🧒" },
];
const APPS = [
  { id: "study", name: "題庫練習", emoji: "📚", path: "study/", audience: ["aiden"], category: "學科", status: "active", sync: true, owner: "aiden", order: { aiden: 1 } },
  { id: "math", name: "長除法練習", emoji: "➗", url: "https://example.com/math/", audience: ["aiden"], category: "學科", status: "active", sync: false, owner: "aiden", order: { aiden: 2 } },
  { id: "zhuyin", name: "注音練習", emoji: "ㄅ", path: "zhuyin/", audience: ["bingpu"], category: "學科", status: "active", sync: true, owner: "bingpu", order: { bingpu: 1 } },
  { id: "english", name: "英文閱讀", emoji: "🔤", url: "https://example.com/en/", audience: [], category: "學科", status: "draft", sync: false, owner: "aiden", order: {} },
  { id: "meteor", name: "隕石", emoji: "☄️", url: "https://example.com/m/", audience: [], category: "學科", status: "parked", sync: false, owner: "bingpu", order: {} },
];

test("HUB_CHILD_KEY 釘住：hub 落地與選人記憶共用同一把 key", () => {
  assert.equal(HUB_CHILD_KEY, "kids_current_child");
});

test("restoreForwardTarget：#restore= 開頭才轉送，search＋hash 都保留", () => {
  assert.equal(restoreForwardTarget("", "#restore=abc"), "study/#restore=abc");
  assert.equal(restoreForwardTarget("?child=aiden", "#restore=abc"), "study/?child=aiden#restore=abc");
  assert.equal(restoreForwardTarget("", "#other"), null);
  assert.equal(restoreForwardTarget("", ""), null);
  assert.equal(restoreForwardTarget("", "#x=1&restore=abc"), null, "restore 不在 hash 開頭不轉");
  assert.equal(restoreForwardTarget("?a=1", null), null);
});

test("knownChild：registry 裡查得到才算已知（test- 等合法但未知 id → null）", () => {
  assert.equal(knownChild(CHILDREN, "aiden"), "aiden");
  assert.equal(knownChild(CHILDREN, "test-aiden"), null);
  assert.equal(knownChild(CHILDREN, null), null);
  assert.equal(knownChild([], "aiden"), null);
});

test("homeApps：active＋audience 過濾、order 排序，兩 child 清單互異", () => {
  assert.deepEqual(homeApps(APPS, "aiden").map((a) => a.id), ["study", "math"]);
  assert.deepEqual(homeApps(APPS, "bingpu").map((a) => a.id), ["zhuyin"]);
});

test("homeApps：draft/parked 不上首頁；order 缺者排最後、同序依 id", () => {
  const apps = [
    { id: "b", status: "active", audience: ["aiden"], order: {} },
    { id: "a", status: "active", audience: ["aiden"], order: {} },
    { id: "c", status: "active", audience: ["aiden"], order: { aiden: 1 } },
    { id: "d", status: "draft", audience: ["aiden"], order: { aiden: 0 } },
  ];
  assert.deepEqual(homeApps(apps, "aiden").map((a) => a.id), ["c", "a", "b"]);
});

test("appHref：站內 path 必帶 ?child=；外鏈 url 原樣", () => {
  assert.equal(appHref(APPS[0], "aiden"), "study/?child=aiden");
  assert.equal(appHref(APPS[2], "bingpu"), "zhuyin/?child=bingpu");
  assert.equal(appHref(APPS[1], "aiden"), "https://example.com/math/");
});

test("parentGroups：依 status 固定順序分組、空組不出、全部 app 都在", () => {
  const groups = parentGroups(APPS);
  assert.deepEqual(groups.map((g) => g.status), ["active", "draft", "parked"]);
  assert.equal(groups.flatMap((g) => g.apps).length, APPS.length);
  assert.deepEqual(STATUS_ORDER, ["active", "draft", "parked", "retired"]);
});

test("healthRows：只列接同步的 app × 每個 child；join /v1/status、無紀錄＝null", () => {
  const keys = [{ child: "aiden", app: "study", rev: 5, lastWrite: "2026-07-12T06:00:00.000Z" }];
  const rows = healthRows(APPS, CHILDREN, keys);
  assert.deepEqual(rows.map((r) => [r.app.id, r.child.id]),
    [["study", "aiden"], ["study", "bingpu"], ["zhuyin", "aiden"], ["zhuyin", "bingpu"]]);
  assert.equal(rows[0].lastWrite, "2026-07-12T06:00:00.000Z");
  assert.equal(rows[0].rev, 5);
  assert.equal(rows[1].lastWrite, null, "無紀錄＝從未同步，不是錯誤");
  assert.deepEqual(healthRows(APPS, CHILDREN, undefined).map((r) => r.lastWrite), [null, null, null, null], "status 讀不到也不炸");
});

test("pickerDefault：上次選擇仍是已知 child 才預選", () => {
  assert.equal(pickerDefault(CHILDREN, "bingpu"), "bingpu");
  assert.equal(pickerDefault(CHILDREN, "gone-kid"), null);
  assert.equal(pickerDefault(CHILDREN, null), null);
});

test("hub 頁不變量：不掛 manifest（start_url 會吃掉圖示網址參數）", () => {
  assert.ok(!/rel=["']manifest["']/.test(html), "hub 不得掛 web app manifest");
});
