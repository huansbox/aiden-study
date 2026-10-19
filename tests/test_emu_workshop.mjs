import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {uiHarness} from './helpers/train-workshop-ui.mjs';
const ctx=vm.createContext({console,Set});ctx.window=ctx;
for(const file of ['brick-emu3000.js','brick-emu900.js','emu-mechanism.js','train-workshop.js']) vm.runInContext(readFileSync(new URL(`../docs/shared/${file}`,import.meta.url),'utf8'),ctx);
const models={emu3000:ctx.KidsBrickEmu3000,emu900:ctx.KidsBrickEmu900};
const first=(id,n)=>models[id].steps.flatMap(step=>step.parts).slice(0,n).map(part=>part.id);
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const harness=(modelId,placed=[],options={})=>uiHarness(placed,{modelId,packs:12,...options});

test('EMU old arbitrary partial groups resume the same earned pack without changing identities',()=>{
  for(const modelId of Object.keys(models)) for(const version of [1,2]) {
    const start=version===2?1:0, model=models[modelId], total=(12-start)*3;
    for(let count=0;count<total;count++) {
      const ids=model.steps.slice(start).flatMap(step=>step.parts).slice(0,count).map(part=>part.id);
      if(count%3===0) ids.push(`p${start+Math.floor(count/3)+1}-3`);
      const snapshot={activeBuild:{id:'old',modelId,contentVersion:version,placed:ids},grants:Array.from({length:12-start},(_,i)=>({id:`saved-${i}`,buildId:'old',packIndex:i+start}))};
      const before=JSON.stringify(snapshot),v=ctx.KidsTrainWorkshop.describe(model,snapshot);
      const expected=model.steps.findIndex((step,index)=>index>=start&&step.parts.some(part=>!ids.includes(part.id)));
      assert.equal(v.packIndex,expected);assert.equal(v.grant.id,`saved-${expected-start}`);assert.equal(JSON.stringify(snapshot),before);
    }
  }
});

test('both EMUs finish every original ID once in v1/v2, retaining three groups per pack',async()=>{
  for(const modelId of Object.keys(models)) for(const contentVersion of [1,2]) {
    const start=contentVersion===2?2:1,h=harness(modelId,[],{contentVersion,packs:13-start});await settle();
    try {
      for(let pack=start;pack<=12;pack++) {
        for(const number of [3,1,2]) {
          const id=`p${pack}-${number}`,before=h.calls.length;
          h.click('part',id);h.click('place');await settle();
          if(modelId==='emu900'&&pack===8) {assert.equal(h.calls.length,before);assert.match(h.host.innerHTML,/接好後保存/);h.click('place');await settle();}
          assert.equal(h.calls.length,before+1);h.click('place');await settle();assert.equal(h.calls.length,before+1);
        }
        if(pack<12) {assert.match(h.host.innerHTML,/本包 3 \/ 3/);h.click('before');assert.match(h.host.innerHTML,/回看/);h.click('before');h.click('next');await settle();}
      }
      assert.equal(h.calls.length,(13-start)*3);assert.equal(new Set(h.state.activeBuild.placed).size,(13-start)*3);assert.equal(h.state.grants.length,13-start);assert.equal(h.finalCandidate,true);
      assert.ok(h.calls.every(call=>call.buildId===`existing-${modelId}`&&call.grantId===`earned-${call.packIndex-(contentVersion===2?1:0)}`));
    } finally {h.mounted.destroy();}
  }
});

test('EMU3000 headlight needs the saved head module and both light groups; play never writes',()=>{
  const feature=ctx.KidsEmuMechanism.create(models.emu3000),head=['p7-1','p7-2','p7-3','p12-1','p12-2'];
  for(const missing of head) {const ids=new Set(head.filter(id=>id!==missing));feature.sync(ids);feature.trial('light');assert.doesNotMatch(feature.scene(ids),/data-train-lit/);assert.match(feature.controls(ids),/disabled/);}
  const ids=new Set(head);feature.sync(ids);feature.trial('light');assert.match(feature.scene(ids),/data-train-lit="true"/);
  assert.doesNotMatch(feature.scene(ids,{before:true}),/data-train-lit/);feature.endTrial();assert.doesNotMatch(feature.scene(ids),/data-train-lit/);assert.deepEqual([...ids],head);
});

test('EMU900 left stage is unsaved, cancellation removes it and saved doors reopen as both leaves',async()=>{
  const h=harness('emu900',first('emu900',21));await settle();
  try {
    h.click('part','p8-2');h.click('place');await settle();assert.equal(h.calls.length,0);assert.match(h.host.innerHTML,/data-train-staged="true"/);assert.match(h.host.innerHTML,/data-train-leaf="left"/);assert.doesNotMatch(h.host.innerHTML,/data-train-leaf="right"/);
    h.fire('keydown',{key:'Escape',preventDefault(){},target:{closest:()=>null}});assert.doesNotMatch(h.host.innerHTML,/data-train-staged="true"/);
    h.click('part','p8-2');h.click('place');await settle();assert.equal(h.calls.length,0);
    h.click('pause');h.click('resume');h.click('part','p8-2');h.click('place');await settle();assert.equal(h.calls.length,1);assert.equal(h.calls[0].partId,'p8-2');
    const reopened=harness('emu900',[...h.state.activeBuild.placed]);await settle();
    try {reopened.featureClick('unit','p8-2');assert.match(reopened.host.innerHTML,/data-train-leaf="left"/);assert.match(reopened.host.innerHTML,/data-train-leaf="right"/);reopened.featureClick('open',null,'doors');assert.match(reopened.host.innerHTML,/translate\(-59 0\)/);assert.match(reopened.host.innerHTML,/translate\(59 0\)/);assert.equal(reopened.calls.length,0);} finally {reopened.mounted.destroy();}
  } finally {h.mounted.destroy();}
});

test('failed right-door save stays staged and cannot open until the original group is saved',async()=>{
  const h=harness('emu900',first('emu900',21));await settle();
  try {
    h.click('part','p8-1');h.click('place');await settle();h.failSave();h.click('place');await settle();assert.equal(h.state.activeBuild.placed.length,21);assert.match(h.host.innerHTML,/無法保存/);assert.doesNotMatch(h.host.innerHTML,/data-train-operate="doors"/);
    h.allowSave();h.click('part','p8-1');h.click('place');await settle();assert.equal(h.state.activeBuild.placed.length,22);assert.equal(h.calls.length,2);assert.match(h.host.innerHTML,/data-train-operate="doors"/);
    h.state.sync={status:'offline',pending:1};h.mounted.update(h.state);assert.match(h.host.innerHTML,/已存本機，待連線/);
    h.featureClick('open',null,'doors');assert.equal(h.state.activeBuild.placed.length,22);assert.equal(h.calls.length,2);
  } finally {h.mounted.destroy();}
});

test('an absent or left-only door cannot slide; each saved pair opens in opposite directions',()=>{
  const feature=ctx.KidsEmuMechanism.create(models.emu900),ids=new Set();feature.sync(ids);feature.stage('p8-1');feature.move('doors',1);assert.equal(feature.value('doors'),0);
  ids.add('p8-1');feature.sync(ids);feature.move('doors',1);assert.match(feature.scene(ids),/translate\(-59 0\)/);assert.match(feature.scene(ids),/translate\(59 0\)/);
  assert.doesNotMatch(feature.scene(new Set(),{before:true}),/data-train-leaf/);
  feature.choose('p8-3');feature.move('doors',1);assert.equal(feature.value('doors'),0);assert.doesNotMatch(feature.scene(ids),/data-train-leaf/);
});

test('unearned and failed pictures cannot place EMU groups, and future lamps never block the nose pack',async()=>{
  for(const modelId of Object.keys(models)) {
    for(const options of [{packs:0},{failImages:true}]) {const h=harness(modelId,[],options);await settle();h.click('part','p1-1');h.click('place');await settle();assert.equal(h.calls.length,0);h.mounted.destroy();}
    const count=modelId==='emu3000'?18:21,h=harness(modelId,first(modelId,count));await settle();
    try {assert.ok(h.images.every(image=>!image.url.includes('/p12-')));assert.doesNotMatch(h.host.innerHTML,/準備中/);} finally {h.mounted.destroy();}
  }
});

test('cancelled joining motion and rapid double-place do not stage or save twice',async()=>{
  const h=harness('emu900',first('emu900',21),{motion:true});await settle();
  try {
    h.click('part','p8-1');h.click('place');h.click('place');assert.equal(h.animations.length,1);h.click('pause');h.animations[0].resolve();await settle();assert.equal(h.calls.length,0);assert.doesNotMatch(h.host.innerHTML,/data-train-staged="true"/);
    h.click('resume');h.click('part','p8-1');h.click('place');h.animations.at(-1).resolve();await settle();assert.equal(h.calls.length,0);
    h.click('place');h.click('place');h.animations.at(-1).resolve();await settle();assert.equal(h.calls.length,1);
  } finally {h.mounted.destroy();}
});

test('completed EMU inspection plays the selected saved work without placement, grants or another celebration',async()=>{
  for(const modelId of Object.keys(models)) {
    const saved=first(modelId,36),h=harness(modelId,saved,{inspection:true,packs:0});await settle();
    try {
      assert.match(h.host.innerHTML,/完成作品零件觀察/);assert.match(h.host.innerHTML,/回到作品/);assert.doesNotMatch(h.host.innerHTML,/class="tray"|data-e500-action="allocate"|data-e500-action="place"|稍後再拼/);
      h.featureClick(modelId==='emu3000'?'light':'open',null,'doors');
      assert.match(h.host.innerHTML,modelId==='emu3000'?/data-train-lit="true"/:/translate\(59 0\)/);
      for(const action of ['place','allocate','flush','next','pause','before'])h.click(action);
      h.click('part','p1-1');await settle();assert.equal(h.calls.length,0);assert.equal(h.finalCandidate,false);assert.deepEqual(h.state.activeBuild.placed,saved);
      h.mounted.update({...h.state,activeBuild:{id:'another-child-build',modelId:'e500',placed:[]}});assert.match(h.host.innerHTML,/36<small> \/ 36/);
      h.click('mechanism');h.click('mechanism');assert.doesNotMatch(h.host.innerHTML,/data-train-lit="true"|translate\(59 0\)/);
    } finally {h.mounted.destroy();}
  }
});
