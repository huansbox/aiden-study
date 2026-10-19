import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../docs/shared/collection-core.js";
import { collectionRuntime } from "./helpers/collection-runtime.mjs";
import { withExistingBuild } from "./helpers/existing-collection.mjs";
const C = globalThis.KidsCollectionCore;
const now = new Date("2026-10-19T12:00:00Z");
const target = (entryId = "study:science", quantity = 20) => ({ entryId, quantity, metric:C.ENTRIES[entryId].metric });
const record = (state, entryId = "study:science", at = now, serverAt = at) => C.apply(state, { type:"record", event:{ entryId, answered:true, occurredAt:at.toISOString() } }, serverAt);

test("20／40／60 題各一包，必做保持完成且加碼獨立顯示進度，不設日上限", () => {
  let state = C.apply(C.empty(), { type:"goals", expectedGoalRevision:0, targets:[target()] }, now);
  for (let n = 1; n <= 100; n++) {
    state = record(state);
    const daily = C.snapshot(state, "2026-10-19").daily, goal = daily.targets[0];
    assert.equal(daily.earned, Math.floor(n / 20), `第 ${n} 題`);
    assert.equal(goal.done, n >= 20);
    assert.equal(goal.bonusProgress, n % 20);
    assert.equal(goal.bonusCompleted, Math.max(0, Math.floor(n / 20) - 1));
    assert.equal(daily.limit, null);
  }
  assert.equal(new Set(state.grants.map((g) => g.id)).size, 5);
  assert.deepEqual(C.reconcile(state, now).grants, state.grants);
});

test("輪數活動按孩子設定份量反覆發包；空目標自由練習維持每日一包", () => {
  let state = C.apply(C.empty(), { type:"goals", expectedGoalRevision:0, targets:[target("spelling",2), target("math",3)] }, now);
  for (let n = 1; n <= 6; n++) {
    state = record(state, "spelling");
    assert.equal(state.grants.length, Math.floor((n - 1) / 2));
    state = C.apply(state, { type:"round", hasPractice:true, event:{ entryId:"spelling", roundId:`r${n}`, occurredAt:now.toISOString() } }, now);
    assert.equal(state.grants.length, Math.floor(n / 2));
  }
  for (let n = 1; n <= 6; n++) state = record(state, "math");
  assert.equal(state.grants.length, 5);
  let free = C.empty();
  for (let n = 0; n < 3; n++) free = C.apply(free, { type:"round", hasPractice:true, event:{ entryId:"spelling", roundId:`free${n}`, occurredAt:now.toISOString() } }, now);
  assert.equal(free.grants.length, 1);
});

test("同日目標修改沿差額語意，舊 first/all/goal 抵扣且上線當日補足、不回溯舊日", () => {
  let state = C.apply(C.empty(), { type:"goals", expectedGoalRevision:0, targets:[target()] }, now);
  const day = "2026-10-19", yesterday = "2026-10-18";
  state.days[day] = { rewardVersion:2, targets:[target()], counts:{ "study:science":{ answered:60, rounds:0 } }, rounds:0 };
  state.days[yesterday] = structuredClone(state.days[day]);
  state.grants = ["first","all"].map((kind,n) => ({ id:`${day}:${kind}`, date:day, kind, buildId:"legacy", packIndex:n }));
  const old = structuredClone(state.grants);
  state = C.reconcile(state, now);
  assert.equal(state.grants.length, 3); assert.deepEqual(state.grants.slice(0,2), old);
  assert.equal(C.snapshot(state,yesterday).daily.earned,0);
  assert.equal(state.days[yesterday].rewardVersion,2);
  const change = (list) => { state = C.apply(state, { type:"goals", expectedGoalRevision:state.goalRevision, targets:list }, now); };
  change([target("study:science",10)]); assert.equal(state.grants.length,6,"調小份量只補當日差額");
  const grants = structuredClone(state.grants);
  change([]); change([target("study:science",10)]); change([target("study:science",10)]);
  assert.deepEqual(state.grants,grants,"取消、恢復、重儲不重複領");
  change([target("study:science",30)]); assert.equal(state.grants.length,6,"調大不收回");
});

test("目標20調30後，45題實際還差45、60題還差30；另一科達標會減少抵扣",()=>{
  let state=C.apply(C.empty(),{type:"goals",expectedGoalRevision:0,targets:[target()]},now);
  for(let n=0;n<45;n++)state=record(state);
  assert.equal(state.grants.length,2);
  state=C.apply(state,{type:"goals",expectedGoalRevision:1,targets:[target("study:science",30)]},now);
  let daily=C.snapshot(state,"2026-10-19").daily;
  assert.equal(daily.rewardOffset,1);assert.equal(daily.targets[0].nextRewardRemaining,45);
  for(let n=0;n<15;n++)state=record(state);
  daily=C.snapshot(state,"2026-10-19").daily;
  assert.equal(state.grants.length,2);assert.equal(daily.targets[0].nextRewardRemaining,30);
  for(let n=0;n<30;n++)state=record(state);
  assert.equal(state.grants.length,3);

  let mixed=C.apply(C.empty(),{type:"goals",expectedGoalRevision:0,targets:[target()]},now);
  for(let n=0;n<45;n++)mixed=record(mixed);
  mixed=C.apply(mixed,{type:"goals",expectedGoalRevision:1,targets:[target("study:science",30),target("math",2)]},now);
  assert.equal(C.snapshot(mixed,"2026-10-19").daily.targets[0].nextRewardRemaining,45);
  mixed=record(record(mixed,"math"),"math");
  assert.equal(mixed.grants.length,2);
  daily=C.snapshot(mixed,"2026-10-19").daily;
  assert.equal(daily.rewardOffset,0);assert.equal(daily.targets[0].nextRewardRemaining,15);
  for(let n=0;n<15;n++)mixed=record(mixed);
  assert.equal(mixed.grants.length,3);
});

test("跨臺灣午夜補送新日期按份量發包，既有舊日 v2 保持每項一包", () => {
  const start = new Date("2026-10-19T15:59:00Z"), tomorrow = new Date("2026-10-19T16:01:00Z");
  let state = C.apply(C.empty(), { type:"goals", expectedGoalRevision:0, targets:[target("math",2)] }, start);
  for (let n = 0; n < 6; n++) state = record(state,"math",start,tomorrow);
  assert.equal(C.snapshot(state,"2026-10-19").daily.earned,3,"離線首次見到昨天仍按新規則份量");
  assert.equal(C.snapshot(state,"2026-10-20").daily.targets[0].progress,0);
  state = record(record(state,"math",tomorrow),"math",tomorrow);
  assert.equal(C.snapshot(state,"2026-10-20").daily.earned,1);
  state.days["2026-10-18"] = { rewardVersion:2, targets:[target("math",2)], counts:{math:{answered:6}}, rounds:0 };
  state = record(state,"nonogram",new Date("2026-10-18T12:00:00Z"),tomorrow);
  assert.equal(C.snapshot(state,"2026-10-18").daily.earned,1,"舊日延遲事件不改成三包");
});

test("v2 固定鐵軌不配包；首次來源為 p2，最後來源 ID 與 legacy 完全相同", () => {
  for (const modelId of C.MODERN_MODELS) {
    const state = C.empty(); state.grants = Array.from({length:15},(_,n)=>({id:`g${n}`,date:"2026-10-18",buildId:null,packIndex:null}));
    const next = withExistingBuild(state,modelId,{id:`${modelId}:select-${modelId}`,now}), build = next.builds[0];
    assert.equal(build.contentVersion,2); assert.equal(build.id,`${modelId}:select-${modelId}`);
    assert.equal(C.packStart(build),1); assert.equal(C.packCount(build),C.PACK_COUNTS[modelId]-1);
    assert.equal(C.packNumber(build,1),1); assert.equal(C.packSourceIndex(build,1),1);
    assert.deepEqual(C.requiredParts(build).slice(0,3).map((p)=>p.id),["p2-1","p2-2","p2-3"]);
    assert.equal(C.requiredParts(build).at(-1).id,`p${C.PACK_COUNTS[modelId]}-3`);
    assert.equal(next.grants.filter((g)=>g.buildId).length,C.PACK_COUNTS[modelId]-1);
    assert.equal(next.grants[0].packIndex,1);
    assert.throws(()=>C.apply(next,{type:"place",buildId:build.id,grantId:"g0",packIndex:0,partId:"p1-1"},now),/零件位置/);
    assert.throws(()=>C.apply(next,{type:"place",buildId:build.id,grantId:"g0",packIndex:1,partId:"p1-1"},now),/零件位置/);
  }
});

function releaseFixture() {
  const state = C.empty();
  state.builds = [{id:"completed-e500",modelId:"e500",contentVersion:1,placed:C.requiredParts({modelId:"e500"}).map((p)=>p.id),completedAt:"2026-10-18T12:00:00Z"},
    {id:"emu3000",modelId:"emu3000",contentVersion:1,placed:["p1-1","p1-2","p1-3","p2-2"],completedAt:null}];
  state.displayedBuildIds=["completed-e500"]; state.activeBuildId="emu3000"; state.revision=7;
  state.grants=Array.from({length:20},(_,n)=>({id:`source-${n}`,date:"2026-10-18",kind:"first",buildId:n<14?"completed-e500":n<18?"emu3000":null,packIndex:n<14?n:n<18?n-14:null}));
  return state;
}

test("撤回核對 revision／active ID 且只退未完成作品，完整／部分／待拼包全數退回", () => {
  const state=releaseFixture(), before=structuredClone(state), command={type:"release-build",expectedActiveBuildId:"emu3000",expectedRevision:7};
  assert.deepEqual(C.releaseSummary(C.snapshot(state)),{buildId:"emu3000",modelId:"emu3000",revision:7,releasable:true,total:20,assigned:4,completed:1,partial:1,waiting:2,unassigned:2});
  assert.throws(()=>C.apply(state,{...command,expectedRevision:6},now),/收藏已更新/);
  assert.throws(()=>C.apply(state,{...command,expectedActiveBuildId:"wrong"},now),/目前作品已變更/);
  const next=C.apply(state,command,now);
  assert.equal(next.grants.length,20); assert.equal(next.activeBuildId,null); assert.equal(next.grants.filter((g)=>!g.buildId).length,6);
  assert.deepEqual(next.builds,[before.builds[0]]); assert.deepEqual(next.displayedBuildIds,before.displayedBuildIds);
  assert.deepEqual(next.grants.map(({id,date,kind})=>({id,date,kind})),before.grants.map(({id,date,kind})=>({id,date,kind})));
  assert.throws(()=>C.apply({...state,activeBuildId:"completed-e500"},{...command,expectedActiveBuildId:"completed-e500"},now),/只能撤回/);
});

test("真 SQLite：退包重送／重新啟動不再退新作品，舊 select/place 離線重播不復活，孩子隔離", async () => {
  const dir=await mkdtemp(join(tmpdir(),"aiden-release-build-")); let runtime=await collectionRuntime({persist:dir}),seq=0;
  const call=async(type,data={},child="aiden")=>{
    const response=await runtime.fetch(new Request(`http://local/v1/collection/${child}${type?"/"+type:""}`,{method:type?"POST":"GET",headers:{Authorization:"Bearer test-token"},...(type?{body:JSON.stringify({commandId:`release-test-${++seq}`,...data})}:{})}));
    return {status:response.status,body:await response.json()};
  };
  try {
    await runtime.restoreFixture(releaseFixture());
    const oldSelection={commandId:"old-select",modelId:"emu3000"};
    assert.equal((await call("select-model",oldSelection)).status,200);
    const oldPlace={commandId:"old-place",buildId:"emu3000",grantId:"source-14",packIndex:0,partId:"p1-2"};
    assert.equal((await call("place",oldPlace)).status,200);
    const first=(await call("")).body, release={commandId:"stable-release",expectedActiveBuildId:first.activeBuild.id,expectedRevision:first.revision};
    const released=await call("release-build",release); assert.equal(released.status,200); assert.equal(released.body.snapshot.activeBuild,null);
    const practice={entryId:"spelling",answered:true,roundId:"new-pack-between-retries",occurredAt:new Date().toISOString()};
    assert.equal((await call("record",{generation:0,event:practice})).status,200);
    assert.equal((await call("round",{generation:0,event:practice})).status,200,"退包成功後合法領一個新包");
    const chosen=await call("select-model",{modelId:"ct273",commandId:"new-select",expectedSelectionGeneration:released.body.snapshot.selectionGeneration}), buildId=chosen.body.snapshot.activeBuild.id;
    assert.notEqual(buildId,first.activeBuild.id); assert.equal(chosen.body.snapshot.grants.filter((g)=>g.buildId===buildId).length,7);
    const placed=await call("place",{commandId:"new-place",buildId,grantId:"source-14",packIndex:1,partId:"p2-2"}); assert.equal(placed.status,200);
    const previous=structuredClone(placed.body.snapshot);
    assert.equal((await call("place",{commandId:"old-place-late",buildId:"emu3000",grantId:"source-14",packIndex:0,partId:"p1-2"})).status,400);
    assert.equal((await call("select-model",oldSelection)).body.duplicate,true);
    assert.equal((await call("place",oldPlace)).body.duplicate,true);
    assert.equal((await call("release-build",release)).body.duplicate,true);
    assert.deepEqual((await call("")).body,previous);
    assert.equal(C.verifyRelease(first,previous,first.activeBuild.id).added,1,"新增包與原包配新作不會讓維護核對卡住");
    assert.equal((await call("release-build",{...release,commandId:"release-mismatch"})).status,409);
    assert.equal((await call("release-build",{...release,expectedRevision:first.revision+1})).status,409,"同 commandId 不可改 payload");
    await runtime.dispose(); runtime=await collectionRuntime({persist:dir});
    assert.equal((await call("release-build",release)).body.duplicate,true);
    assert.deepEqual((await call("")).body,previous);
    assert.equal((await call("",{},"bingpu")).body.grants.length,0);
  } finally {await runtime.dispose();await rm(dir,{recursive:true,force:true});}
});

test("舊狀態預設選車世代0，撤回後未曾送達的舊 client select 不得替孩子選車",()=>{
  const state=releaseFixture();delete state.selectionGeneration;
  assert.equal(C.snapshot(state).selectionGeneration,0);
  const released=C.apply(state,{type:"release-build",expectedRevision:state.revision,expectedActiveBuildId:state.activeBuildId},now);
  assert.equal(released.selectionGeneration,1);
  for(const old of [{type:"select-model",modelId:"r200",commandId:"old-missing-generation"},{type:"select-model",modelId:"r200",commandId:"old-explicit-zero",expectedSelectionGeneration:0}])assert.throws(()=>C.apply(released,old,now),error=>error.status===409);
  assert.equal(released.activeBuildId,null);
  const fresh=C.apply(released,{type:"select-model",modelId:"ct273",commandId:"fresh-choice",expectedSelectionGeneration:1},now);
  assert.equal(fresh.selectionGeneration,2);assert.equal(fresh.builds.at(-1).modelId,"ct273");
});

test("真 SQLite：自然 20／40／60 題各一包，重送同事件不增加進度或包，兩孩子份量隔離", async () => {
  const runtime=await collectionRuntime();let seq=0;
  const call=async(child,type,data)=>{
    const response=await runtime.fetch(new Request(`http://local/v1/collection/${child}/${type}`,{method:"POST",headers:{Authorization:"Bearer test-token"},body:JSON.stringify({commandId:`portions-${++seq}`,...data})}));
    const body=await response.json();assert.equal(response.status,200,JSON.stringify(body));return body.snapshot;
  };
  try {
    await call("aiden","goals",{expectedGoalRevision:0,targets:[target()]});
    await call("bingpu","goals",{expectedGoalRevision:0,targets:[target("study:science",3)]});
    const occurredAt=new Date().toISOString();let last;
    for(let n=1;n<=60;n++) {
      const data={commandId:`science-answer-${n}`,generation:0,event:{entryId:"study:science",answered:true,occurredAt}};
      last=await call("aiden","record",data);
      if([19,20,39,40,59,60].includes(n)) {
        assert.equal(last.daily.earned,Math.floor(n/20));
        const duplicate=await call("aiden","record",data);
        assert.equal(duplicate.daily.targets[0].progress,n);
        assert.deepEqual(duplicate.grants,last.grants);
      }
    }
    assert.equal(last.daily.targets[0].done,true);assert.equal(last.daily.targets[0].bonusCompleted,2);
    const sibling=await call("bingpu","record",{generation:0,event:{entryId:"study:science",answered:true,occurredAt}});
    assert.equal(sibling.daily.targets[0].quantity,3);assert.equal(sibling.daily.targets[0].progress,1);assert.equal(sibling.grants.length,0);
  } finally {await runtime.dispose();}
});
