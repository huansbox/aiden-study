import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../'+path, import.meta.url),'utf8');
function harness() {
  const context = vm.createContext({});
  context.window = context;
  for(const key of ['localStorage','sessionStorage','indexedDB','fetch','XMLHttpRequest','KidsCollection','KidsFamily','KidsAuth'])
    Object.defineProperty(context,key,{get(){throw Error('Prototype touched '+key);}});
  vm.runInContext(read('docs/shared/brick-e500.js'),context);
  vm.runInContext(read('docs/parent/e500-lab-state.js'),context);
  return {model:context.KidsBrickE500,create:context.KidsE500LabState.createTrial};
}
const plain = value => JSON.parse(JSON.stringify(value));

for(const [preset,start,packIndex] of [['chassis',9,3],['half',21,7],['finish',39,13]]) {
  test(`${preset}: independent comparison trials start equally and accept exactly one real pack`,async()=>{
    const {model,create}=harness(), a=create(model,preset), b=create(model,preset);
    const original=plain(b.snapshot());
    assert.equal(a.snapshot().activeBuild.placed.length,start);
    assert.deepEqual(plain(a.snapshot()),original);
    let notifications=0;
    const unsubscribe=a.subscribe(()=>notifications++);
    for(const part of [...model.steps[packIndex].parts].reverse()) {
      await a.placePart({packIndex,partId:part.id});
      await a.placePart({packIndex,partId:part.id});
    }
    assert.equal(a.snapshot().activeBuild.placed.length,start+3);
    assert.equal(notifications,3,'repeating an installed piece is not a new placement');
    assert.equal(Boolean(a.snapshot().activeBuild.completedAt),preset==='finish');
    assert.deepEqual(plain(b.snapshot()),original,'trying one version must not move the other');
    const after=plain(a.snapshot());
    await a.allocate();
    assert.deepEqual(plain(a.snapshot()),after,'a comparison cannot consume another pack');
    await assert.rejects(a.placePart({packIndex:0,partId:'p1-1'}));
    await assert.rejects(a.placePart({packIndex,partId:'p1-1'}));
    await assert.rejects(a.placePart({packIndex,partId:'made-up'}));
    assert.deepEqual(plain(a.snapshot()),after);
    const copy=a.snapshot();copy.activeBuild.placed.length=0;copy.grants[0].buildId='other';
    assert.deepEqual(plain(a.snapshot()),after,'snapshots cannot mutate the trial');
    assert.equal(create(model,preset).snapshot().activeBuild.placed.length,start,'reset starts a fresh trial');
    unsubscribe();
    await a.setDisplayed(a.snapshot().activeBuild.id,true);
    assert.equal(notifications,3);
  });
}

test('only a completed trial can be put on the original workshop shelf',async()=>{
  const {model,create}=harness(), a=create(model,'half'), b=create(model,'finish');
  await a.setDisplayed(a.snapshot().activeBuild.id,true);
  assert.equal(a.snapshot().displayedBuildIds.length,0);
  for(const part of model.steps[13].parts) await b.placePart({packIndex:13,partId:part.id});
  await b.setDisplayed('some-real-build',true);
  assert.equal(b.snapshot().displayedBuildIds.length,0);
  await b.setDisplayed(b.snapshot().activeBuild.id,true);
  assert.equal(b.snapshot().displayedBuildIds.length,1);
});

test('standalone prototype only loads isolated local UI scripts and blocks data connections',()=>{
  const html=read('docs/parent/e500-lab.html');
  assert.match(html,/connect-src 'none'/);
  assert.match(html,/form-action 'none'/);
  assert.doesNotMatch(html,/(?:src|href)="[^\"]*(?:family-|collection-|auth|sync-v1)/);
  assert.doesNotMatch(read('docs/parent/e500-lab.js'),/\b(?:fetch|localStorage|sessionStorage|indexedDB|XMLHttpRequest)\b/);
  assert.match(html,/<html lang="zh-Hant">/);
});
