import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import "../docs/shared/collection-core.js";
import { collectionRuntime } from "./helpers/collection-runtime.mjs";
const C = globalThis.KidsCollectionCore;
const taskId = "number-line-difference", completedQuestionIds = ["p1", "p2", "p3", "p4", "p5", "p6"];
const now = new Date("2026-10-24T08:00:00Z"), child = "test-number-line-reward";
const completion = (occurredAt = now.toISOString()) => ({ type: "task-complete", event: { taskId, completedQuestionIds, occurredAt } });

test("只有固定六題都完成才有任務包，紙本或重複題號不構成資格", () => {
  for (const ids of [completedQuestionIds.slice(0, 5), [...completedQuestionIds.slice(0, 5), "p5"], [...completedQuestionIds.slice(0, 5), "transition-6"]]) {
    assert.throws(() => C.apply(C.empty(), { ...completion(), event: { ...completion().event, completedQuestionIds: ids } }, now), /全部六題/);
  }
  assert.throws(() => C.apply(C.empty(), { ...completion(), event: { ...completion().event, taskId: "toString" } }, now), /全部六題/);
  assert.throws(() => C.apply(C.empty(), completion("2026-10-25T08:00:00Z"), now), /完成時間/);
  const state = C.apply(C.empty(), completion(), now);
  assert.equal(state.grants.length, 1);
  assert.equal(state.grants[0].id, "task:number-line-difference:first");
  assert.equal(state.grants[0].kind, "task");
  assert.deepEqual(state.days, {}, "任務不建立每日紀錄或 round");
  assert.equal(C.ENTRIES[taskId], undefined);
});

test("任務首次包跨日重做仍一包，與同日長除法和題庫數學的應得、已領完全分開", () => {
  const goals = ["math", "study:math"].map((entryId) => ({ entryId, metric: "answered", quantity: 1 }));
  let state = C.apply(C.empty(), { type: "goals", expectedGoalRevision: 0, targets: goals }, now);
  const before = structuredClone(state);
  state = C.apply(state, completion(), now);
  assert.deepEqual(state.days, before.days);
  let daily = C.snapshot(state, "2026-10-24").daily;
  assert.equal(daily.earned, 0); assert.equal(daily.rewardOffset, 0); assert.equal(daily.first, false);
  for (const entryId of ["math", "study:math"]) state = C.apply(state, { type: "record", event: { entryId, answered: true, occurredAt: now.toISOString() } }, now);
  daily = C.snapshot(state, "2026-10-24").daily;
  assert.equal(state.grants.length, 3);
  assert.equal(daily.earned, 2); assert.equal(daily.rewardOffset, 0);
  assert.equal(state.days["2026-10-24"].rounds, 0);
  assert.deepEqual(daily.targets.map((t) => t.progress), [1, 1]);
  const tomorrow = new Date("2026-10-25T08:00:00Z");
  state = C.apply(state, completion(tomorrow.toISOString()), tomorrow);
  assert.equal(state.grants.length, 3);
  assert.equal(C.snapshot(state, "2026-10-25").daily.earned, 0);
  assert.equal(C.snapshot(state).taskRewards[taskId].completedAt, now.toISOString());
});

test("任務完成不觸發已有每日進度的 reconcile；自由練習仍可獨立領首次包", () => {
  const state = C.empty();
  state.days["2026-10-24"] = { rewardVersion: 2, goalRevision: 0, targets: [], counts: {}, rounds: 1 };
  const completed = C.apply(state, completion(), now);
  assert.deepEqual(completed.days, state.days);
  assert.deepEqual(completed.grants.map((g) => g.kind), ["task"]);
  const reconciled = C.reconcile(completed, now);
  assert.equal(reconciled.grants.length, 2);
  assert.equal(C.snapshot(reconciled, "2026-10-24").daily.earned, 1);
  assert.deepEqual(C.reconcile(reconciled, now), reconciled);

  const free = C.apply(C.apply(C.empty(), completion(), now), { type: "round", hasPractice: true, event: { entryId: "spelling", roundId: "independent-free-round", occurredAt: now.toISOString() } }, now);
  assert.equal(free.grants.length, 2);
  assert.equal(C.snapshot(free, "2026-10-24").daily.earned, 1);
});

test("收藏備份還原、退包與重新配包保留首次任務資格", () => {
  let state = C.apply(C.empty(), completion(), now);
  state = C.apply(state, { type: "select-model", modelId: "e500", commandId: "task-model" }, now);
  const original = C.snapshot(state, "2026-10-24"), buildId = state.activeBuildId;
  state = C.apply(state, { type: "release-build", expectedRevision: state.revision, expectedActiveBuildId: buildId }, now);
  C.verifyRelease(original, C.snapshot(state, "2026-10-24"), buildId);
  state = JSON.parse(JSON.stringify(state));
  state = C.apply(state, { type: "select-model", modelId: "ct273", commandId: "task-model-again", expectedSelectionGeneration: state.selectionGeneration }, now);
  state = C.apply(state, completion(), now);
  assert.equal(state.grants.length, 1);
  assert.equal(state.grants[0].buildId, state.activeBuildId);
  assert.deepEqual(C.snapshot(state).taskRewards[taskId], { status: "earned", grantId: "task:number-line-difference:first", completedAt: now.toISOString() });
});

async function request(runtime, type, body, selectedChild = child) {
  const response = await runtime.fetch(new Request(`http://local/v1/collection/${selectedChild}${type ? "/" + type : ""}`, {
    method: type ? "POST" : "GET", headers: { Authorization: "Bearer test-token", "Content-Type": "application/json" },
    ...(type ? { body: JSON.stringify(body) } : {}),
  }));
  return { status: response.status, body: await response.json() };
}

test("SQLite 同操作、不同裝置、跨日重送與持久重啟都只有同一任務包", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aiden-task-reward-"));
  assert.ok(resolve(dir).startsWith(resolve(tmpdir()) + sep));
  let runtime = await collectionRuntime({ persist: dir });
  const first = { ...completion(new Date(Date.now() - 86400000).toISOString()), commandId: "task-device-one" };
  try {
    const earned = await request(runtime, "task-complete", first);
    assert.equal(earned.status, 200); assert.equal(earned.body.duplicate, false);
    for (const command of [first, { ...completion(new Date().toISOString()), commandId: "task-device-two", generation: 999 }]) {
      const duplicate = await request(runtime, "task-complete", command);
      assert.equal(duplicate.status, 200); assert.equal(duplicate.body.duplicate, true);
      assert.equal(duplicate.body.snapshot.grants.length, 1);
      assert.equal(duplicate.body.snapshot.revision, earned.body.snapshot.revision);
    }
    const invalid = await request(runtime, "task-complete", { ...first, event: { ...first.event, completedQuestionIds: ["p1"] } });
    assert.equal(invalid.status, 400, "重送也必須通過完整資格驗證");
    await runtime.KV.put(`c:activity-generation:${child}`, "2");
    await runtime.dispose(); runtime = await collectionRuntime({ persist: dir });
    const restored = await request(runtime);
    assert.equal(restored.status, 200);
    assert.equal(restored.body.taskRewards[taskId].status, "earned");
    assert.equal(restored.body.grants.length, 1);
    assert.equal(restored.body.daily.earned, 0);
    assert.equal((await request(runtime, "task-complete", { ...first, commandId: "task-after-restart" })).body.duplicate, true);
    const sibling = await request(runtime, null, null, "test-other-number-line");
    assert.equal(sibling.body.taskRewards[taskId].status, "unearned");
    assert.equal(sibling.body.grants.length, 0);
  } finally { await runtime.dispose(); await rm(dir, { recursive: true, force: true }); }
});
