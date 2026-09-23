import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "../docs/shared/family-core.js";
import worker from "../worker/worker.mjs";
import { kvStub } from "../worker/kv-stub.mjs";
const C = globalThis.KidsFamilyCore;
const day = "2026-09-15";
const task = { id: "first-task", app: "study", unit: 15, quantity: 2 };
const req = (env, path, method = "GET", body, token = "test-token") =>
  worker.fetch(
    new Request("https://test.invalid/v1/" + path, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        Origin: "https://kids.linshuhuan.com",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
    env,
  );
const env = () => ({ TOKEN: "test-token", KV: kvStub() });
const stream = (answered = 2, seconds = 10) => ({
  version: 1,
  days: {
    [day]: { completed: answered + 1, answered, correct: answered, seconds },
  },
  tasks: { ["first-task@" + day]: answered },
  done: answered >= 2 ? { ["first-task@" + day]: 1 } : {},
});
test("台灣午夜切換日期；單日空安排覆蓋週表，刪除才恢復", () => {
  assert.equal(C.dateKey(new Date("2026-09-14T16:00:00Z")), day);
  const profile = C.defaults().children.aiden;
  profile.weekly[2] = [task];
  assert.equal(C.todayTasks(profile, day)[0].occurrence, "first-task@" + day);
  profile.overrides[day] = [];
  assert.equal(C.todayTasks(profile, day).length, 0);
  delete profile.overrides[day];
  assert.equal(C.todayTasks(profile, day).length, 1);
  assert.equal(C.todayTasks(profile, "2026-09-16").length, 0);
});
test("隱藏內容不派發，但安排與原資料保留；兩兄弟預設不同", () => {
  const data = C.defaults(),
    p = data.children.aiden;
  p.weekly[2] = [task, { ...task, id: "old", unit: 1 }];
  assert.deepEqual(
    C.todayTasks(p, day).map((t) => t.id),
    ["first-task"],
  );
  p.apps = [];
  assert.equal(C.todayTasks(p, day).length, 0);
  assert.equal(p.weekly[2].length, 2);
  assert.deepEqual(data.children.bingpu.apps, ["zhuyin"]);
});
test("設定拒絕不合法日期、數量和不存在的單字組別", () => {
  const data = C.defaults();
  data.children.aiden.overrides["2026-02-30"] = [];
  assert.throws(() => C.validateSettings(data));
  for (const quantity of [0, 1.5, 101])
    assert.throws(() => C.validateTask({ ...task, quantity }));
  assert.throws(() =>
    C.validateTask({ id: "x", app: "spelling", batch: 20, quantity: 5 }),
  );
});
test("Worker 設定保存、重送去重、過期版本衝突、驗證與授權", async () => {
  const e = env(),
    body = { data: C.defaults(), rev: 0, writeId: "write-one" };
  assert.equal((await req(e, "settings", "GET", null, "wrong")).status, 401);
  assert.equal((await req(e, "settings")).status, 200);
  body.data.children.aiden.avatar = "flat";
  const saved = await (await req(e, "settings", "PUT", body)).json();
  assert.equal(saved.rev, 1);
  assert.equal((await (await req(e, "settings", "PUT", body)).json()).rev, 1);
  assert.equal(
    (await req(e, "settings", "PUT", { ...body, writeId: "write-two" })).status,
    409,
  );
  assert.equal(
    (await (await req(e, "settings")).json()).data.children.aiden.avatar,
    "flat",
  );
  assert.equal(
    (await req(e, "settings", "PUT", { ...body, data: {} })).status,
    400,
  );
});
test("活動重送、舊快照不翻倍、不倒退，跨孩子隔離", async () => {
  const e = env(),
    path = "activity/aiden/study/device-one";
  for (const method of ["PUT", "POST", "PUT"])
    assert.equal((await req(e, path, method, stream())).status, 200);
  await req(e, path, "PUT", stream(1, 3));
  const data = await (await req(e, "activity/aiden")).json();
  assert.equal(data.streams.length, 1);
  assert.equal(C.summarize(data.streams, day).total.answered, 2);
  assert.equal(C.summarize(data.streams, day).total.seconds, 10);
  assert.equal(
    (await (await req(e, "activity/bingpu")).json()).streams.length,
    0,
  );
  assert.equal(
    (await req(e, "activity/aiden/unknown/device-one", "PUT", stream())).status,
    404,
  );
});

test("重置隔離所有 App、任務與徽章；拒絕舊版 PUT / beacon，不影響另一個孩子", async () => {
  const e = env();
  for (const app of ["zhuyin", "math", "nativecamp"])
    await req(e, `activity/bingpu/${app}/old`, "PUT", stream(50, 600));
  await req(e, "activity/aiden/study/keep", "PUT", stream(10, 300));
  await e.KV.put("c:activity-generation:bingpu", "1");
  const reset = await (await req(e, "activity/bingpu")).json();
  assert.equal(reset.generation, 1);
  assert.equal(C.summarize(reset.streams).total.seconds, 0);
  assert.equal(C.summarize(reset.streams).finishedTasks, 0);
  assert.deepEqual(C.earnedBadges(C.summarize(reset.streams)), []);
  for (const method of ["PUT", "POST"]) {
    const rejected = await req(e, "activity/bingpu/zhuyin/old", method, stream(99));
    assert.equal(rejected.status, 409);
    assert.equal((await rejected.json()).generation, 1);
  }
  assert.equal((await req(e, "activity/bingpu?generation=0&cursor=old")).status, 409);
  const fresh = { ...stream(1, 5), generation: 1 };
  for (let i = 0; i < 2; i++)
    assert.equal((await req(e, "activity/bingpu/zhuyin/old", "PUT", fresh)).status, 200);
  assert.equal(C.summarize((await (await req(e, "activity/bingpu")).json()).streams).total.answered, 1);
  assert.equal(C.summarize((await (await req(e, "activity/aiden")).json()).streams).total.answered, 10);
  await e.KV.put("c:activity-generation:bingpu", "2");
  assert.equal((await req(e, "activity/bingpu/zhuyin/old", "PUT", fresh)).status, 409);
  assert.equal((await (await req(e, "activity/bingpu")).json()).streams.length, 0);
});

test("統計世代只接受非負安全整數；合併不得把舊數字加回新世代", () => {
  for (const generation of [-1, null, "1", 1.5, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => C.validateStream({ ...stream(), generation }));
  const fresh = C.emptyStream(1), old = stream(100, 999);
  assert.deepEqual(C.mergeStreams(old, fresh), fresh);
  assert.deepEqual(C.mergeStreams(fresh, old), fresh);
});
test("不同寫入串流相加；閱讀卡不算作答、時間不發成就，任務徽章永久", () => {
  const a = stream(2, 800),
    b = stream(3, 1000);
  const s = C.summarize(
    [
      { app: "study", data: a },
      { app: "spelling", data: b },
    ],
    day,
  );
  assert.equal(s.total.answered, 5);
  assert.equal(s.total.completed, 7);
  assert.equal(s.finishedTasks, 1);
  assert.deepEqual(
    C.earnedBadges(s).map((x) => x.id),
    ["tasks-1"],
  );
  const later = C.summarize([{ app: "study", data: a }], "2026-10-01");
  assert.equal(later.today.answered, 0);
  assert.equal(C.earnedBadges(later)[0].id, "tasks-1");
});
test("統計與儲存資料壞掉需拒絕；服務失敗維持 CORS", async () => {
  const e = env(),
    invalid = stream();
  invalid.days[day].correct = 999;
  assert.equal(
    (await req(e, "activity/aiden/study/d", "PUT", invalid)).status,
    400,
  );
  await e.KV.put(
    "c:family:settings",
    JSON.stringify({ rev: "bad", data: C.defaults() }),
  );
  const response = await req(e, "settings");
  assert.equal(response.status, 500);
  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    "https://kids.linshuhuan.com",
  );
});
test("累積超過一頁的練習仍能完整讀取，單次最多 200 串流", async () => {
  const e = env();
  for (let i = 0; i < 205; i++)
    await e.KV.put(
      `m:aiden:study:s-${String(i).padStart(3, "0")}`,
      JSON.stringify(stream(1)),
    );
  const first = await (await req(e, "activity/aiden")).json();
  assert.equal(first.streams.length, 200);
  assert.ok(first.nextCursor);
  const second = await (
    await req(
      e,
      "activity/aiden?cursor=" + encodeURIComponent(first.nextCursor),
    )
  ).json();
  assert.equal(second.streams.length, 5);
  assert.equal(second.nextCursor, null);
  assert.equal(
    C.summarize([...first.streams, ...second.streams], day).total.answered,
    205,
  );
});

const registry = {
  mindMaps: JSON.parse(readFileSync(new URL("../docs/registry.json", import.meta.url), "utf8")).mindMaps,
  apps: C.APPS.map((id) => ({ id, status: "active", path: id + "/" })),
};
test("心智圖依日期開最新文章；不受舊設定或目錄順序影響，且不改寫來源與設定", () => {
  const settings = C.defaults();
  settings.children.aiden.mindMap = { enabled: true, title: "舊文章", url: "/mind-map.html" };
  const catalog = { ...registry, mindMaps: [
    { id: "old", title: "舊篇", date: "2026-09-08", path: "old/" },
    { id: "new", title: "新篇", date: "2026-09-22", path: "new/" },
    { id: "last-week", title: "上週", date: "2026-09-15", path: "last-week/" },
  ] };
  const before = structuredClone({ settings, catalog });
  const entry = C.homeEntries(settings, "aiden", catalog).find((e) => e.id === "mind-map");
  assert.equal(entry.path, "new/");
  assert.equal(entry.title, "心智圖");
  assert.equal(entry.subtitle, undefined);
  assert.equal(entry.mark, undefined);
  assert.deepEqual(C.mindMapArticles(catalog).slice(1).map((a) => a.id), ["last-week", "old"]);
  assert.deepEqual({ settings, catalog }, before);
  settings.children.aiden.mindMap.enabled = false;
  assert.ok(!C.homeEntries(settings, "aiden", catalog).some((e) => e.id === "mind-map"));
});
test("只有一篇或沒有文章時，過去文章清單為空", () => {
  assert.deepEqual(C.mindMapArticles({ mindMaps: registry.mindMaps.slice(0, 1) }).slice(1), []);
  assert.deepEqual(C.mindMapArticles({}), []);
  assert.ok(!C.homeEntries(C.defaults(), "aiden", { ...registry, mindMaps: [] }).some((e) => e.id === "mind-map"));
});
test("首頁依學期拆科、每科一張；網站對象與排序、心智圖隱藏", () => {
  const settings = C.defaults(),
    p = settings.children.aiden;
  assert.deepEqual(
    C.homeEntries(settings, "aiden", registry).map((e) => e.id),
    [
      "study:math",
      "study:science",
      "spelling",
      "math",
      "nonogram",
      "mind-map",
      "website:stroke",
    ],
  );
  p.terms = ["g3-s2", "g4-s1"];
  p.homeOrder = ["website:stroke", "study:social"];
  const entries = C.homeEntries(settings, "aiden", registry);
  assert.deepEqual(
    entries.slice(0, 2).map((e) => e.id),
    ["website:stroke", "study:social"],
  );
  assert.equal(entries.filter((e) => e.id === "study:math").length, 1);
  assert.equal(entries.find((e) => e.id === "study:math").term, "g4-s1");
  assert.equal(
    C.taskLabel({ app: "study", unit: 10, quantity: 5 }),
    "第 4 單元 · 5 題",
  );
  for (const [unit, subject] of [
    [1, "science"],
    [4, "science"],
    [5, "math"],
    [9, "math"],
    [10, "social"],
    [12, "social"],
    [13, "chinese"],
    [14, "chinese"],
    [15, "math"],
    [19, "math"],
    [20, "science"],
    [21, "science"],
  ])
    assert.equal(C.taskEntryId({ app: "study", unit }), "study:" + subject);
  settings.websites[0].children = ["bingpu"];
  p.mindMap.enabled = false;
  assert.ok(
    !C.homeEntries(settings, "aiden", registry).some(
      (e) => e.id === "website:stroke" || e.id === "mind-map",
    ),
  );
  assert.ok(
    C.homeEntries(settings, "bingpu", registry).some(
      (e) => e.id === "website:stroke",
    ),
  );
});
test("網站網址驗證與名稱保存；空清單不回填預設", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,hi",
    "http://example.com/",
    "https://u:p@example.com/",
    "//example.com/",
    "https://example.com/?k=secret",
    "https://example.com/ a",
  ]) {
    const settings = C.defaults();
    settings.websites[0].url = url;
    assert.throws(() => C.validateSettings(settings), url);
  }
  const settings = C.defaults();
  settings.websites[0].title = "<img src=x onerror=alert(1)>";
  assert.equal(
    C.validateSettings(settings).websites[0].title,
    settings.websites[0].title,
  );
  settings.websites = [];
  settings.children.aiden.homeOrder = [];
  settings.children.aiden.mindMap.enabled = false;
  assert.deepEqual(C.validateSettings(settings), settings);
});
test("舊客戶端改設定保留新欄位；新客戶端可真正移除網站與停用心智圖", async () => {
  const e = env(),
    settings = C.defaults();
  settings.websites = [
    {
      id: "reading",
      title: "閱讀",
      url: "https://example.com/",
      children: ["aiden"],
    },
  ];
  settings.children.aiden.mindMap.title = "下週文章";
  settings.children.aiden.homeOrder = ["website:reading", "study:math"];
  await req(e, "settings", "PUT", {
    data: settings,
    rev: 0,
    writeId: "new-client",
  });
  const old = structuredClone(settings);
  delete old.websites;
  for (const p of Object.values(old.children)) {
    delete p.mindMap;
    delete p.homeOrder;
  }
  old.children.aiden.avatar = "flat";
  const saved = await (
    await req(e, "settings", "PUT", {
      data: old,
      rev: 1,
      writeId: "old-client",
    })
  ).json();
  assert.deepEqual(saved.data.websites, settings.websites);
  assert.deepEqual(
    saved.data.children.aiden.mindMap,
    settings.children.aiden.mindMap,
  );
  assert.deepEqual(
    saved.data.children.aiden.homeOrder,
    settings.children.aiden.homeOrder,
  );
  assert.equal(saved.data.children.aiden.avatar, "flat");
  saved.data.websites = [];
  saved.data.children.aiden.mindMap.enabled = false;
  const removed = await (
    await req(e, "settings", "PUT", {
      data: saved.data,
      rev: 2,
      writeId: "remove",
    })
  ).json();
  assert.deepEqual(removed.data.websites, []);
  assert.equal(removed.data.children.aiden.mindMap.enabled, false);
  // 舊雲端資料第一次 GET 也補齊設定，不必另寫一次遷移。
  await e.KV.put("c:family:settings", JSON.stringify({ rev: 4, data: old }));
  const upgraded = await (await req(e, "settings")).json();
  assert.equal(upgraded.rev, 4);
  assert.equal(upgraded.data.websites[0].id, "stroke");
});
