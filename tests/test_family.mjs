import test from "node:test";
import assert from "node:assert/strict";
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
