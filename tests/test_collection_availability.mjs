import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../docs/shared/collection-core.js";
import { collectionRuntime } from "./helpers/collection-runtime.mjs";
import { withExistingBuild } from "./helpers/existing-collection.mjs";
const C = globalThis.KidsCollectionCore;
const ready = ["e500", "ct273", "breezy-blue", "emu3000", "emu900", "700t", "n700s"];
const hidden = ["r200", "car", "train", "plane"];

test("新選開放七款重設計車；R200 與舊模型的新選仍拒絕且不改 grant、作品或世代", () => {
  assert.deepEqual([...C.AVAILABLE_MODELS], ready);
  const state = C.empty();
  state.grants = [{ id: "saved-reward", date: "2026-10-18", kind: "first", buildId: null, packIndex: null }];
  const original = structuredClone(state);
  for (const modelId of hidden) {
    assert.throws(() => C.apply(state, { type: "select-model", modelId }), error => error.status === 409 && /尚未開放新選/.test(error.message));
    assert.deepEqual(state, original);
  }
  for (const modelId of ready) {
    const next = C.apply(state, { type: "select-model", modelId, commandId: "new-choice" });
    assert.equal(next.builds[0].modelId, modelId);
    assert.equal(next.builds[0].contentVersion, 2);
    assert.equal(next.grants[0].packIndex, 1);
  }
});

test("所有未開放車款的 v1/v2 半成品仍能確認、配包與保存原 part ID", () => {
  for (const modelId of hidden) for (const contentVersion of [1, 2]) {
    let state = C.empty();
    state.grants = [{ id: "original-pack", date: "2026-10-18", kind: "first", buildId: null, packIndex: null }];
    state = withExistingBuild(state, modelId, { contentVersion });
    const before = structuredClone(state), grant = state.grants[0];
    state = C.apply(state, { type: "select-model", modelId });
    assert.deepEqual(state.builds, before.builds);
    assert.deepEqual(state.grants, before.grants);
    const partId = `p${grant.packIndex + 1}-2`;
    state = C.apply(state, { type: "place", buildId: state.activeBuildId, grantId: grant.id, packIndex: grant.packIndex, partId });
    assert.deepEqual(state.builds[0].placed, [partId]);
    assert.equal(state.builds[0].id, before.activeBuildId);
    assert.equal(state.builds[0].contentVersion, contentVersion);
    assert.deepEqual(state.grants, before.grants);
  }
});

test("真 SQLite API：拒絕未送達新選；舊半成品續拼、已成功選車重送與 R200 完成展示重啟後保留", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aiden-availability-"));
  let runtime = await collectionRuntime({ persist: dir }), sequence = 0;
  const call = async (type = "", data = {}) => {
    const response = await runtime.fetch(new Request(`http://local/v1/collection/aiden${type ? "/" + type : ""}`, {
      method: type ? "POST" : "GET", headers: { Authorization: "Bearer test-token" },
      ...(type ? { body: JSON.stringify({ commandId: `availability-${++sequence}`, ...data }) } : {}),
    }));
    return { status: response.status, body: await response.json() };
  };
  try {
    await runtime.seedFixtures({ days: 30 });
    const untouched = (await call()).body;
    for (const modelId of hidden) {
      const rejected = await call("select-model", { modelId });
      assert.equal(rejected.status, 409, modelId);
      assert.match(rejected.body.error, /尚未開放新選/);
      assert.deepEqual((await call()).body, untouched);
    }
    let saved = withExistingBuild({ ...C.empty(), ...untouched }, "r200", { id: "finished-r200", contentVersion: 1 });
    for (const grant of saved.grants.filter(g => g.buildId === "finished-r200")) for (const n of [3, 1, 2]) {
      saved = C.apply(saved, { type: "place", buildId: grant.buildId, grantId: grant.id, packIndex: grant.packIndex, partId: `p${grant.packIndex + 1}-${n}` });
    }
    saved = C.apply(saved, { type: "display", buildId: "finished-r200", displayed: true });
    const finished = structuredClone(saved.builds[0]);
    saved = withExistingBuild(saved, "train", { id: "saved-legacy-train", contentVersion: 1 });
    await runtime.restoreFixture(saved);
    const before = (await call()).body;
    const confirmation = { commandId: "old-offline-selection", modelId: "train" };
    const confirmed = await call("select-model", confirmation);
    assert.equal(confirmed.status, 200);
    assert.deepEqual(confirmed.body.snapshot.builds, before.builds);
    assert.deepEqual(confirmed.body.snapshot.grants, before.grants);
    for (const grant of before.grants.filter(g => g.buildId === "saved-legacy-train")) for (const n of [2, 3, 1]) {
      assert.equal((await call("place", { buildId: grant.buildId, grantId: grant.id, packIndex: grant.packIndex, partId: `p${grant.packIndex + 1}-${n}` })).status, 200);
    }
    const complete = (await call()).body;
    assert.ok(complete.activeBuild.completedAt);
    assert.deepEqual(complete.builds[0], finished);
    assert.deepEqual(complete.grants, before.grants);
    assert.deepEqual(complete.displayedBuildIds, ["finished-r200"]);
    await runtime.dispose(); runtime = await collectionRuntime({ persist: dir });
    const repeated = await call("select-model", confirmation);
    assert.equal(repeated.status, 200);
    assert.equal(repeated.body.duplicate, true);
    assert.deepEqual(repeated.body.snapshot, complete);
    assert.equal((await call("select-model", { modelId: "r200" })).status, 409);
    const chosen = await call("select-model", { modelId: "e500" });
    assert.equal(chosen.status, 200);
    assert.deepEqual(chosen.body.snapshot.builds.slice(0, 2), complete.builds);
  } finally { await runtime.dispose(); await rm(dir, { recursive: true, force: true }); }
});

test("真 SQLite API：七款開放車都能建立 v2 作品、從原 p2 配包，重送不重建", async () => {
  const runtime=await collectionRuntime();
  const call=async(command)=>{
    const response=await runtime.fetch(new Request("http://local/v1/collection/aiden/select-model",{
      method:"POST",headers:{Authorization:"Bearer test-token"},body:JSON.stringify(command),
    }));
    return {status:response.status,body:await response.json()};
  };
  try {
    for(const modelId of ready) {
      const before=C.empty();
      before.grants=[{id:`earned-${modelId}`,date:"2026-10-18",kind:"first",buildId:null,packIndex:null}];
      await runtime.restoreFixture(before);
      const command={commandId:`ready-selection-${modelId}`,modelId,expectedSelectionGeneration:0};
      const selected=await call(command);
      assert.equal(selected.status,200,modelId);
      const snapshot=selected.body.snapshot;
      assert.equal(snapshot.activeBuild.modelId,modelId);
      assert.equal(snapshot.activeBuild.contentVersion,2);
      assert.equal(snapshot.selectionGeneration,1);
      assert.equal(snapshot.grants[0].id,`earned-${modelId}`);
      assert.equal(snapshot.grants[0].packIndex,1);
      assert.equal(snapshot.grants[0].buildId,snapshot.activeBuild.id);
      const repeated=await call(command);
      assert.equal(repeated.body.duplicate,true);
      assert.deepEqual(repeated.body.snapshot,snapshot);
    }
  } finally {await runtime.dispose();}
});
