import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read = name => readFileSync(new URL('../docs/'+name,import.meta.url),'utf8');

function harness() {
  const context=vm.createContext({structuredClone});
  context.window=context;
  // Reading any real progress or storage is a failure, even before a write.
  for(const name of ['KidsCollection','KidsFamily','KidsAuth','KidsSyncV1','localStorage','sessionStorage','indexedDB','fetch','XMLHttpRequest'])
    Object.defineProperty(context,name,{get(){throw Error('Preview accessed '+name);}});
  for(const file of ['brick-e500.js','brick-emu3000.js','brick-r200.js','brick-700t.js','brick-n700s.js','brick-models.js'])
    vm.runInContext(read('shared/'+file),context);
  vm.runInContext(read('parent/train-preview.js'),context);
  return {models:context.KidsBrickModels.models,create:context.KidsTrainPreview.createCollection};
}

for(const id of ['e500','emu3000','r200','700t','n700s']) {
  test(`${id}: trial progresses pack by pack through completion, without family or storage access`,async()=>{
    const h=harness(), model=h.models.find(m=>m.id===id), c=h.create(model);
    assert.equal(c.snapshot().grants.filter(g=>g.buildId).length,1);
    await c.allocate();
    assert.equal(c.snapshot().grants.filter(g=>g.buildId).length,1,'finish this pack before opening the next');
    await assert.rejects(c.placePart({packIndex:1,partId:'p2-1'}));
    for(const [packIndex,step] of model.steps.entries()){
      for(const part of [...step.parts].reverse()){
        await c.placePart({packIndex,partId:part.id});
        await c.placePart({packIndex,partId:part.id});
      }
      await c.allocate();
    }
    const completed=c.snapshot().activeBuild;
    assert.equal(completed.placed.length,model.steps.length*3);
    assert.ok(completed.completedAt);
    await c.setDisplayed(completed.id,true);
    assert.deepEqual(c.snapshot().displayedBuildIds,[completed.id]);
    await c.setDisplayed(completed.id,false);
    assert.deepEqual(c.snapshot().displayedBuildIds,[]);
    assert.equal(h.create(model).snapshot().activeBuild.placed.length,0,'a new trial resets');
  });
  test(`${id}: final-piece trial completes independently of another trial`,async()=>{
    const h=harness(), model=h.models.find(m=>m.id===id), a=h.create(model,'last'), b=h.create(model,'last');
    const before=b.snapshot(), last=model.steps.at(-1).parts.at(-1);
    assert.equal(before.activeBuild.placed.length,model.steps.length*3-1);
    let changes=0;
    const unsubscribe=a.subscribe(()=>changes++);
    await a.placePart({packIndex:model.steps.length-1,partId:last.id});
    assert.ok(a.snapshot().activeBuild.completedAt);
    assert.deepEqual(b.snapshot(),before);
    assert.equal(changes,1);
    unsubscribe();
    await a.setDisplayed(a.snapshot().activeBuild.id,true);
    assert.equal(changes,1,'unmounted trial stops receiving updates');
    const copy=a.snapshot();copy.activeBuild.placed.length=0;
    assert.equal(a.snapshot().activeBuild.placed.length,model.steps.length*3);
  });
}

test('preview entry has no family runtime and prohibits API connections',()=>{
  const html=read('parent/train-preview.html');
  assert.match(html,/connect-src 'none'/);
  assert.doesNotMatch(html,/(?:src|href)="[^\"]*(?:family-|collection-|auth|sync-v1)/);
  assert.match(read('parent/parent.js'),/href="train-preview\.html\?child=\$\{owner\}">火車試拼/);
});
