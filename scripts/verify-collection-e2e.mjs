// Start a fresh tests/helpers/serve-family.mjs and an isolated agent-browser session.
// Usage: node scripts/verify-collection-e2e.mjs <local-CDP-websocket> <local-test-origin>
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { connectBrowser } from '../tests/helpers/collection-browser.mjs';
const [endpoint, origin] = process.argv.slice(2);
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin || '')) throw Error('Only an isolated local test origin is accepted');
const control=await fetch(origin+'/test/controls');
if (!(await control.text()).includes('隔離測試控制')) throw Error('Not the isolated family test server');
await fetch(origin+'/test/study-preview?questions=18');
const browser=await connectBrowser(endpoint);
const checks=[];
let second, secondContext;
const passed=(label)=>{checks.push(label);console.log('PASS '+label);};
const state=()=>browser.evaluate('KidsCollection.create("aiden").snapshot()');
const settled=()=>browser.waitFor('KidsCollection.create("aiden").snapshot().sync.pending===0 && KidsCollection.create("aiden").snapshot().sync.status==="ready"');
const inStudyRound=()=>browser.evaluate('!document.querySelector("#page-quiz").classList.contains("hidden")');
async function answerSyntheticStudy() {
  const text=await browser.evaluate('document.querySelector(".q-text").innerText');
  assert.match(text,/合成/,'never answer private or production questions');
  if(await browser.evaluate('Boolean(document.querySelector("#q-options .opt-btn"))')) await browser.click('#q-options [data-value="2"]',true);
  else {
    if(await browser.evaluate('Boolean(document.querySelector(".choice-btn"))')) await browser.click('.choice-btn[data-val=">"]');
    else {
      const answer=text.match(/請輸入 (\d+)/)?.[1];
      assert.ok(answer,'known synthetic numeric prompt');
      for(const digit of answer) await browser.click('#numpad [data-key="'+digit+'"]');
    }
    await browser.click('#fib-submit',true);
  }
  await browser.waitFor('document.querySelector("#next-btn:not(.hidden)")');
  assert.equal(await browser.evaluate('Boolean(document.querySelector("#family-reward"))'),false,'no reward during answer feedback');
  await browser.click('#next-btn',true);
}
await mkdir('.scratch/collection-e2e',{recursive:true});
try {
  await browser.send('Storage.clearDataForOrigin',{origin,storageTypes:'all'});
  await browser.send('Emulation.setDeviceMetricsOverride',{width:1024,height:768,deviceScaleFactor:1,mobile:true});
  await browser.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await browser.navigate(origin+'/parent/?k=test-token');
  await browser.waitFor('document.querySelector("[data-parent-view=settings]")');
  await browser.click('[data-parent-view="settings"]');
  await browser.waitFor('document.querySelector("#save-daily-goals")');
  assert.equal((await state()).grants.length,0,'old activity must not grant packs');
  await browser.click('#save-daily-goals',true);
  await browser.waitFor('document.querySelector("#daily-goals-status").textContent.startsWith("已儲存")');
  assert.deepEqual((await state()).daily.targets.map(t=>[t.entryId,t.quantity]),[['study:math',10],['spelling',1]]);
  passed('parent configures math 10 + spelling 1 round once; no old-statistics backfill');
  await browser.navigate(origin+'/?child=aiden');
  await browser.waitFor('document.querySelector(".daily-goal")');
  assert.equal(await browser.evaluate('document.querySelectorAll("[data-view=results]").length'),1);
  await browser.screenshot('.scratch/collection-e2e/home.png');
  await browser.click('[data-entry="study:math"] a');
  await browser.waitFor('document.querySelector(".sub-btn")');
  await browser.click('button[onclick="window._startFull(15)"]');
  await browser.waitFor('document.querySelector("#page-quiz:not(.hidden) .q-text")');
  let answers=0;
  while(await inStudyRound()) {
    await answerSyntheticStudy();
    answers++;
    if(answers>20) throw Error('Study round did not end');
  }
  assert.equal(answers,9,'balanced 18-question fixture has a 9-question first batch');
  assert.equal((await state()).grants.length,0,'9 questions do not meet a 10-question target');
  await browser.click('#page-summary .primary');
  while(await inStudyRound()) await answerSyntheticStudy();
  await settled();
  await browser.waitFor('document.querySelector("#family-reward")?.textContent.includes("拼裝")');
  assert.equal((await state()).grants.length,1);
  passed('real Study answer controls: threshold during batch, first pack only displayed at round end');
  await browser.navigate(origin+'/spelling/?child=aiden');
  await browser.waitFor('document.querySelector("#spell-next")');
  let cards=0;
  while(await browser.evaluate('Boolean(document.querySelector("#spell-next"))')) {
    await browser.click('#spell-next',true); cards++;
    if(cards>60) throw Error('Spelling round did not end');
  }
  await settled();
  await browser.waitFor('document.querySelector("#family-reward")?.textContent.includes("拼裝")');
  assert.equal((await state()).grants.length,2);
  assert.equal((await state()).daily.targets.find(t=>t.entryId==='spelling').progress,1);
  passed('real spelling full round grants second pack');
  await browser.navigate(origin+'/?child=aiden&view=collection');
  await browser.waitFor('document.querySelector("[data-action=start-model][data-model=car]")');
  await browser.click('[data-action="start-model"][data-model="car"]',true);
  await browser.waitFor('document.querySelector("[data-action=part]")');
  await browser.click('[data-action="part"][data-part="p1-1"]',true);
  await browser.click('[data-action="target"][data-part="p1-1"]',true);
  await browser.waitFor('KidsCollection.create("aiden").snapshot().activeBuild.placed.length===1');
  await browser.drag('[data-action="part"][data-part="p1-2"]','[data-action="target"][data-part="p1-2"]',{touch:true,cancel:true});
  assert.equal((await state()).activeBuild.placed.length,1);
  await browser.drag('[data-action="part"][data-part="p1-2"]','[data-action="target"][data-part="p1-2"]',{touch:true});
  await browser.waitFor('KidsCollection.create("aiden").snapshot().activeBuild.placed.length===2');
  await settled();
  assert.equal(await browser.evaluate('document.querySelectorAll(".brick-svg-part--placed").length'),2);
  await browser.screenshot('.scratch/collection-e2e/workshop.png',{fullPage:true});
  passed('real SQLite-backed touch click + cancel + drag preserve visible placed pieces');
  await browser.click('[data-action="close"]',true);
  await browser.waitFor('document.querySelector("[data-view=results]")');
  await browser.click('[data-view="results"]',true);
  await browser.waitFor('document.querySelectorAll(".brick-svg-part--placed").length===2');
  passed('defer and reopen resumes the exact partial build');
  await browser.click('[data-action="view"][data-view="shelf"]',true);
  await browser.waitFor('document.querySelector(".brick-catalog")');
  await browser.click('[data-action="view"][data-view="workshop"]',true);
  await browser.waitFor('document.querySelectorAll(".brick-svg-part--placed").length===2');
  passed('workshop and collection-room navigation stays inside unified results');
  await fetch(origin+'/test/mode?offline=1');
  await browser.click('[data-action="part"][data-part="p1-3"]',true);
  await browser.waitFor(`document.querySelector('button[data-action="target"][data-part="p1-3"]')`);
  await browser.click('[data-action="target"][data-part="p1-3"]',true);
  await browser.waitFor('KidsCollection.create("aiden").snapshot().sync.status==="offline"');
  assert.equal((await state()).activeBuild.placed.length,3);
  await browser.navigate(origin+'/?child=aiden&view=collection');
  await browser.waitFor('document.querySelectorAll(".brick-svg-part--placed").length===3');
  assert.ok((await state()).sync.pending>0);
  await fetch(origin+'/test/mode?offline=0');
  await browser.evaluate('window.dispatchEvent(new Event("online"))');
  await settled();
  passed('offline placement survives reload and merges after reconnect');
  secondContext=(await browser.send('Target.createBrowserContext',{},false)).browserContextId;
  const {targetId}=await browser.send('Target.createTarget',{url:'about:blank',browserContextId:secondContext},false);
  second=await connectBrowser(endpoint,{targetId});
  await second.navigate(origin+'/parent/?k=test-token');
  await second.navigate(origin+'/?child=aiden&view=collection');
  await second.waitFor('document.querySelectorAll(".brick-svg-part--placed").length===3');
  await second.click('[data-action="part"][data-part="p2-1"]');
  await second.waitFor(`document.querySelector('button[data-action="target"][data-part="p2-1"]')`);
  await second.click('button[data-action="target"][data-part="p2-1"]');
  await second.waitFor('KidsCollection.create("aiden").snapshot().activeBuild.placed.length===4 && KidsCollection.create("aiden").snapshot().sync.pending===0');
  await browser.navigate(origin+'/?child=aiden&view=collection');
  await browser.waitFor('document.querySelectorAll(".brick-svg-part--placed").length===4');
  passed('independent browser storage resumes and returns the same saved build');
  await fetch(origin+'/test/collection-fixture?child=aiden&days=12');
  await browser.navigate(origin+'/?child=aiden&view=collection');
  await browser.waitFor('KidsCollection.create("aiden").snapshot().grants.length===14');
  // Finish the two already-open packs before the UI offers the remaining packs.
  let placed=(await state()).activeBuild.placed.length;
  while(placed<42) {
    if(await browser.evaluate('Boolean(document.querySelector("[data-action=allocate]"))')) await browser.click('[data-action="allocate"]');
    await browser.waitFor('document.querySelector(".brick-part:not(:disabled)")');
    const id=await browser.evaluate('document.querySelector(".brick-part:not(:disabled)").dataset.part');
    await browser.click('[data-action="part"][data-part="'+id+'"]');
    await browser.waitFor('document.querySelector(\'button[data-action="target"][data-part="'+id+'"]\')');
    await browser.click('button[data-action="target"][data-part="'+id+'"]');
    await browser.waitFor('KidsCollection.create("aiden").snapshot().activeBuild.placed.length>'+placed);
    placed=(await state()).activeBuild.placed.length;
    if(placed===21) await browser.screenshot('.scratch/collection-e2e/half-built.png',{fullPage:true});
  }
  await settled();
  assert.ok((await state()).activeBuild.completedAt);
  await browser.waitFor('document.querySelector("[data-action=display]")');
  await browser.click('[data-action="display"][data-displayed="true"]');
  await browser.waitFor('KidsCollection.create("aiden").snapshot().displayedBuildIds.includes("car")');
  await browser.screenshot('.scratch/collection-e2e/collection.png',{fullPage:true});
  passed('12 synthetic past-day packs plus 2 real earned packs produce a permanent 42-part displayed car');
  await fetch(origin+'/test/collection-fixture?child=aiden&days=13');
  await browser.navigate(origin+'/?child=aiden&view=collection');
  await browser.waitFor('KidsCollection.create("aiden").snapshot().grants.length===15');
  const beforeReset=await state();
  const reset=await fetch(origin+'/test/activity-reset?child=aiden').then(r=>r.json());
  assert.equal(reset.generation,1);
  await browser.navigate(origin+'/?child=aiden');
  await browser.waitFor('KidsFamily.summary("aiden").total.answered===0');
  const afterReset=await state();
  assert.deepEqual(afterReset.grants,beforeReset.grants);
  assert.deepEqual(afterReset.builds,beforeReset.builds);
  assert.deepEqual(afterReset.displayedBuildIds,['car']);
  const rejected=await browser.evaluate(`KidsFamily.request('/v1/collection/aiden/record',{method:'POST',body:JSON.stringify({commandId:'late-before-reset',generation:0,event:{entryId:'study:math',answered:true,occurredAt:new Date().toISOString()}})}).then(()=>0,e=>e.status)`);
  assert.equal(rejected,409);
  passed('real generation reset preserves unbuilt packs, completed models and display; rejects delayed old events');
  await browser.navigate(origin+'/?child=bingpu&view=collection');
  await browser.waitFor('window.KidsCollection && KidsCollection.create("bingpu").snapshot().sync.status==="ready"');
  const other=await browser.evaluate('KidsCollection.create("bingpu").snapshot()');
  assert.equal(other.grants.length,0); assert.equal(other.builds.length,0);
  passed('other child remains isolated');
  await browser.navigate(origin+'/?child=aiden&view=collection');
  await browser.waitFor('document.querySelector("[data-results-tab=records]")');
  await browser.click('[data-results-tab="records"]');
  assert.equal(await browser.evaluate('document.querySelectorAll(".family-badge").length'),8);
  assert.match(await browser.evaluate('document.querySelector("#hub").innerText'),/里程碑/);
  passed('unified results retains learning records and all 8 milestones');
  await browser.click('[data-results-tab="collection"]');
  await browser.waitFor('document.querySelector("[data-action=choose-next]")');
  await browser.click('[data-action="choose-next"]');
  assert.equal(await browser.evaluate('document.querySelector("[data-action=start-model][data-model=car]").disabled'),true);
  await browser.click('[data-action="start-model"][data-model="train"]');
  await browser.waitFor('KidsCollection.create("aiden").snapshot().activeBuild?.modelId==="train"');
  assert.deepEqual((await state()).displayedBuildIds,['car']);
  assert.equal((await state()).grants.filter(g=>g.buildId==='train').length,1);
  passed('finished car cannot be selected again; next train receives the saved pack and display stays intact');
  await verifyUnavailableActivity();
} finally {
  await writeFile('.scratch/collection-e2e/result.json',JSON.stringify({checks,physicalIPad:false,at:new Date().toISOString()},null,2));
  second?.close();
  if(secondContext) await browser.send('Target.disposeBrowserContext',{browserContextId:secondContext},false);
  browser.close();
}

async function verifyUnavailableActivity() {
  const fixture=await fetch(origin+'/test/nativecamp-finished?child=bingpu');
  assert.equal(fixture.status,200);
  await browser.navigate(origin+'/parent/');
  await browser.waitFor('document.querySelector("[data-parent-view=settings]")');
  await browser.click('[data-parent-view="settings"]');
  await browser.click('[data-child="bingpu"]');
  for(const app of ['spelling','nativecamp']) {
    if(!await browser.evaluate('document.querySelector("[data-app='+app+']").checked')) await browser.click('[data-app="'+app+'"]');
  }
  await browser.click('#save');
  await browser.waitFor('document.querySelector("#save-status").textContent.includes("已儲存")');
  await browser.waitFor('document.querySelector("[data-daily-entry=nativecamp]")');
  const selected=await browser.evaluate('[...document.querySelectorAll("[data-daily-entry]:checked")].map(e=>e.dataset.dailyEntry)');
  for(const id of selected.filter(id=>!['spelling','nativecamp'].includes(id))) await browser.click('[data-daily-entry="'+id+'"]');
  for(const id of ['spelling','nativecamp']) {
    if(!await browser.evaluate('document.querySelector("[data-daily-entry='+id+']").checked')) await browser.click('[data-daily-entry="'+id+'"]');
  }
  await browser.click('#save-daily-goals');
  await browser.waitFor('KidsCollection.create("bingpu").snapshot().daily.targets.length===2 && KidsCollection.create("bingpu").snapshot().goalRevision>0');
  await browser.navigate(origin+'/nativecamp/?child=bingpu&lesson=2026-09-15');
  await browser.waitFor('document.querySelector(".finished-card")');
  assert.equal((await browser.evaluate('KidsCollection.create("bingpu").snapshot()')).grants.length,0);
  await browser.navigate(origin+'/spelling/?child=bingpu');
  await browser.waitFor('document.querySelector("#spell-next")');
  let cards=0;
  while(await browser.evaluate('Boolean(document.querySelector("#spell-next"))')) {
    await browser.click('#spell-next');
    if(++cards>60) throw Error('Spelling round did not end');
  }
  await browser.waitFor('KidsCollection.create("bingpu").snapshot().grants.length===1');
  await browser.navigate(origin+'/parent/');
  await browser.waitFor('document.querySelector("[data-parent-view=settings]")');
  await browser.click('[data-parent-view="settings"]');
  await browser.click('[data-child="bingpu"]');
  await browser.waitFor('document.querySelector("[data-daily-entry=nativecamp]")?.checked');
  await browser.click('[data-daily-entry="nativecamp"]');
  await browser.click('#save-daily-goals');
  await browser.waitFor('KidsCollection.create("bingpu").snapshot().grants.length===2');
  const adjusted=await browser.evaluate('KidsCollection.create("bingpu").snapshot()');
  assert.equal(adjusted.daily.targets.length,1);
  assert.equal(adjusted.daily.targets[0].progress,1);
  await browser.click('#save-daily-goals');
  await browser.waitFor('KidsCollection.create("bingpu").snapshot().goalRevision>'+adjusted.goalRevision);
  assert.equal((await browser.evaluate('KidsCollection.create("bingpu").snapshot()')).grants.length,2);
  passed('finished Native Camp grants nothing; parent removes unavailable goal and preserved spelling progress completes today without a third pack');
}
