// hub 純函式測試（票 #31）。抽取：docs/index.html 的 <hub-pure>。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
const blk = html.match(/\/\/ <hub-pure>([\s\S]*?)\/\/ <\/hub-pure>/);
if (!blk) throw new Error("docs/index.html 找不到 <hub-pure> 區塊");
const {
  HUB_CHILD_KEY, restoreForwardTarget, knownChild, homeApps, appHref,
  parentGroups, healthRows, STATUS_ORDER,
} = new Function(blk[1] +
  "\nreturn { HUB_CHILD_KEY, restoreForwardTarget, knownChild, homeApps, appHref, parentGroups, healthRows, STATUS_ORDER };")();

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

test("restoreForwardTarget：hash 帶 restore=（非空 payload）就轉送，search＋hash 都保留", () => {
  assert.equal(restoreForwardTarget("", "#restore=abc"), "study/#restore=abc");
  assert.equal(restoreForwardTarget("?child=aiden", "#restore=abc"), "study/?child=aiden#restore=abc");
  // 判定對齊 study 的 readRestoreHash：hash 內任意位置的 restore= 也收（study 收得下的不擋在門口）
  assert.equal(restoreForwardTarget("", "#x=1&restore=abc"), "study/#x=1&restore=abc");
  assert.equal(restoreForwardTarget("", "#restore="), null, "空 payload 不轉（study 端也解不出東西）");
  assert.equal(restoreForwardTarget("", "#other"), null);
  assert.equal(restoreForwardTarget("", ""), null);
  assert.equal(restoreForwardTarget("?a=1", null), null);
});

test("knownChild：registry 裡查得到才回 child 物件（test- 等合法但未知 id → null）", () => {
  assert.equal(knownChild(CHILDREN, "aiden"), CHILDREN[0]);
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

test("healthRows：audience 內的組合恆出列（無紀錄＝從未同步）；audience 外無資料不出列", () => {
  const keys = [{ child: "aiden", app: "study", rev: 5, lastWrite: "2026-07-12T06:00:00.000Z" }];
  const rows = healthRows(APPS, CHILDREN, keys);
  assert.deepEqual(rows.map((r) => [r.app.id, r.child.id]),
    [["study", "aiden"], ["zhuyin", "bingpu"]],
    "study×bingpu／zhuyin×aiden 結構上不會同步，無資料不得掛永久紅燈");
  assert.equal(rows[0].lastWrite, "2026-07-12T06:00:00.000Z");
  assert.equal(rows[0].rev, 5);
  assert.equal(rows[1].lastWrite, null, "無紀錄＝從未同步，不是錯誤");
});

test("healthRows：audience 外但雲端真有資料（逃生門匯入到他 child）→ 照列不藏", () => {
  const keys = [{ child: "bingpu", app: "study", rev: 2, lastWrite: "2026-07-13T01:00:00.000Z" }];
  const rows = healthRows(APPS, CHILDREN, keys);
  assert.deepEqual(rows.map((r) => [r.app.id, r.child.id]),
    [["study", "aiden"], ["study", "bingpu"], ["zhuyin", "bingpu"]]);
  assert.equal(rows[1].rev, 2);
  assert.deepEqual(healthRows(APPS, CHILDREN, undefined).map((r) => [r.app.id, r.child.id]),
    [["study", "aiden"], ["zhuyin", "bingpu"]], "status 讀不到也不炸");
});

test("hub 頁不變量：不掛 manifest（start_url 會吃掉圖示網址參數）", () => {
  assert.ok(!/rel=["']manifest["']/.test(html), "hub 不得掛 web app manifest");
});

test("hub 頁不變量：#restore= 轉送與 hashchange 防護都走 restoreForwardTarget（測的與跑的同一份）", () => {
  const inline = html.slice(0, html.indexOf("</script>"));
  assert.ok(inline.includes("forwardRestore()"), "首段 script 必須執行轉送");
  assert.ok(inline.includes('addEventListener("hashchange"'), "停留中的 hub 分頁要接住同文件 hash 導航");
  assert.ok(!/location\.replace\("study\/"/.test(html), "轉送目標不得手拼複本，必須用 restoreForwardTarget");
});
