import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {uiHarness} from './helpers/train-workshop-ui.mjs';
const ctx=vm.createContext({console,Set});ctx.window=ctx;
for(const file of ['brick-breezy-blue.js','breezy-mechanism.js','train-workshop.js'])vm.runInContext(readFileSync(new URL(`../docs/shared/${file}`,import.meta.url),'utf8'),ctx);
const model=ctx.KidsBrickBreezyBlue,first=n=>model.steps.flatMap(s=>s.parts).slice(0,n).map(p=>p.id);
const harness=(placed=[],options={})=>uiHarness(placed,{modelId:'breezy-blue',packs:12,...options});
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('old Breezy saves preserve build, grants and arbitrary within-pack gaps at every boundary',()=>{
  for(const placed of [...Array.from({length:36},(_,n)=>first(n)),[...first(18),'p7-3'],[...first(21),'p8-2']]){
    const snapshot={activeBuild:{id:'old-breezy-build',modelId:'breezy-blue',placed},grants:Array.from({length:12},(_,packIndex)=>({id:`old-${packIndex}`,buildId:'old-breezy-build',packIndex}))};
    const before=JSON.stringify(snapshot),v=ctx.KidsTrainWorkshop.describe(model,snapshot);
    const expected=model.steps.findIndex(step=>step.parts.some(p=>!placed.includes(p.id)));
    assert.equal(v.packIndex,expected);assert.equal(v.grant.id,`old-${expected}`);
    assert.deepEqual(Array.from(v.remaining,p=>p.id),Array.from(model.steps[expected].parts.filter(p=>!placed.includes(p.id)),p=>p.id));
    assert.equal(JSON.stringify(snapshot),before);
  }
});

test('all 12 earned packs finish exactly 36 original groups; frames never consume a grant',async()=>{
  const h=harness();await settle();
  try{
    for(let pack=1;pack<=12;pack++){
      for(const piece of [3,1,2]){
        const id=`p${pack}-${piece}`,twoSteps=pack===7 || pack===8&&piece<3;
        h.click('part',id);const before=h.calls.length;h.click('place');await settle();
        if(twoSteps){assert.equal(h.calls.length,before);assert.match(h.host.innerHTML,/接好後保存/);h.click('place');await settle();}
        assert.equal(h.calls.length,before+1);h.click('place');await settle();assert.equal(h.calls.length,before+1);
      }
      if(pack<12){h.click('next');await settle();}
    }
    assert.equal(new Set(h.state.activeBuild.placed).size,36);assert.equal(h.state.grants.length,12);
    assert.equal(h.finalCandidate,true);
    for(const c of h.calls){assert.equal(c.buildId,'existing-breezy-blue');assert.equal(c.grantId,`earned-${c.packIndex}`);assert.match(c.partId,/^p\d+-[123]$/);}
    assert.match(h.host.innerHTML,/36<small> \/ 36/);
  }finally{h.mounted.destroy();}
});

test('old partial windows reopen assembled, while only missing groups need frame and pane',async()=>{
  const saved=[...first(18),'p7-3'],h=harness([...saved]);await settle();
  try{
    h.click('bb-unit','p7-3');assert.match(h.host.innerHTML,/data-bb-operate="window"/);
    h.click('part','p7-1');h.click('place');await settle();
    assert.deepEqual(h.state.activeBuild.placed,saved);assert.equal(h.calls.length,0);
    h.click('pause');h.click('resume');h.click('part','p7-1');h.click('place');await settle();
    assert.equal(h.calls.length,1);assert.equal(h.calls[0].partId,'p7-1');
    const reopened=harness([...h.state.activeBuild.placed]);await settle();
    assert.match(reopened.host.innerHTML,/本包 2 \/ 3/);assert.equal(reopened.calls.length,0);reopened.mounted.destroy();
  }finally{h.mounted.destroy();}
});

test('failed pane save stays retryable and never unlocks opening until original ID is saved',async()=>{
  const h=harness(first(21));await settle();
  try{
    h.click('part','p8-1');h.click('place');await settle();h.failSave();h.click('place');await settle();
    assert.equal(h.state.activeBuild.placed.length,21);assert.doesNotMatch(h.host.innerHTML,/data-bb-operate="door"/);
    assert.match(h.host.innerHTML,/無法保存/);h.allowSave();h.click('part','p8-1');h.click('place');await settle();
    assert.equal(h.state.activeBuild.placed.length,22);assert.match(h.host.innerHTML,/data-bb-operate="door"/);
  }finally{h.mounted.destroy();}
});

test('opening, trying removal and comparison never alter saved IDs or consume packs',async()=>{
  const h=harness(first(21));await settle();
  try{
    for(const id of ['p8-1','p8-2','p8-3']){h.click('part',id);h.click('place');await settle();if(id!=='p8-3'){h.click('place');await settle();}}
    h.click('mechanism');const saved=JSON.stringify(h.state),count=h.calls.length;
    h.click('bb-open',null,'window');h.click('bb-detach',null,'window');h.click('bb-close',null,'door');h.click('before');
    assert.match(h.host.innerHTML,/data-bb-operate="window"/);assert.doesNotMatch(h.host.innerHTML,/data-bb-operate="door"/);
    h.click('before');assert.match(h.host.innerHTML,/data-bb-operate="door"/);
    assert.equal(JSON.stringify(h.state),saved);assert.equal(h.calls.length,count);
  }finally{h.mounted.destroy();}
});

test('window groups and door groups have independent travel; absent and trial panes cannot move',()=>{
  const m=ctx.KidsBreezyMechanism.create(),ids=new Set(['p7-1','p7-3','p8-2']);m.sync(ids);
  m.move('window',2);assert.equal(m.value('window'),1);m.choose('p7-3');assert.equal(m.value('window'),0);
  m.move('window',.5);m.choose('p8-2');m.move('door',.75);assert.equal(m.value('window'),.5);assert.equal(m.value('door'),.75);
  m.trial('door');m.move('door',1);assert.equal(m.value('door'),0);m.endTrial();m.move('door',-2);assert.equal(m.value('door'),0);
  m.choose('p7-2');m.move('window',1);assert.equal(m.value('window'),0);
  assert.doesNotMatch(m.scene(ids),/data-bb-body|data-bb-operate="window"/);
  m.stage('p7-2');assert.doesNotMatch(m.scene(ids),/data-bb-operate="window"/);
  assert.doesNotMatch(m.scene(new Set(),{before:true}),/window-frame\.png/);
});

test('cancelled frame or pane animation cannot save; another tab placing the same group wins once',async()=>{
  const h=harness(first(18),{motion:true});await settle();
  try{
    h.click('part','p7-1');h.click('place');h.windows.get('resize')();await settle();assert.equal(h.calls.length,0);
    h.click('part','p7-1');h.click('place');h.animations.at(-1).resolve();await settle();assert.equal(h.calls.length,0);
    h.click('place');h.state.activeBuild.placed.push('p7-1');h.mounted.update(h.state);h.animations.at(-1).resolve();await settle();
    assert.equal(h.calls.length,0);assert.equal(h.state.activeBuild.placed.filter(id=>id==='p7-1').length,1);
    assert.match(h.host.innerHTML,/本包 1 \/ 3/);assert.ok(h.ghosts.every(g=>g.removed));
  }finally{h.mounted.destroy();}
});

test('unearned packs and unavailable mechanism images cannot accept frame or pane',async()=>{
  for(const options of [{packs:6},{failImages:true}]){
    const h=harness(first(18),options);await settle();h.click('part','p7-1');h.click('place');h.click('place');await settle();
    assert.equal(h.calls.length,0);assert.equal(h.state.activeBuild.placed.length,18);h.mounted.destroy();
  }
});

test('formal brick art is reproducibly identified by the checked-in manifest',()=>{
  const base=new URL('../docs/shared/breezy-art/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',base),'utf8'));
  for(const image of Object.values(manifest.images))assert.equal(createHash('sha256').update(readFileSync(new URL(image.file,base))).digest('hex'),image.sha256);
});


test('v2 Breezy keeps frame and pane operations while completing only 33 body groups',async()=>{
  const h=harness([],{contentVersion:2,packs:11});await settle();
  try {
    assert.match(h.host.innerHTML,/data-placed="p1-1"/);
    for(let pack=2;pack<=12;pack++) {
      for(const part of [3,1,2]) {
        const id=`p${pack}-${part}`,twoSteps=pack===7 || pack===8&&part<3,before=h.calls.length;
        h.click('part',id);h.click('place');await settle();
        if(twoSteps){assert.equal(h.calls.length,before);h.click('place');await settle();}
        assert.equal(h.calls.length,before+1);
      }
      if(pack===7){h.click('bb-open',null,'window');assert.match(h.host.innerHTML,/data-bb-operate="window"/);}
      if(pack===8){h.click('bb-open',null,'door');assert.match(h.host.innerHTML,/data-bb-operate="door"/);}
      if(pack<12){h.click('next');await settle();}
    }
    assert.equal(h.calls.length,33);assert.equal(h.finalCandidate,true);
    assert.match(h.host.innerHTML,/33<small> \/ 33/);
    assert.ok(h.calls.every(call=>call.packIndex>=1));
  } finally {h.mounted.destroy();}
});
