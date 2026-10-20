import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {uiHarness} from './helpers/train-workshop-ui.mjs';
import {vehicleIds,vehicleFixture,vehicleGlobals} from './helpers/working-vehicle-fixtures.mjs';
import {spinMatrix} from './helpers/svg-spin-plane.mjs';
import '../docs/shared/collection-core.js';
const C=globalThis.KidsCollectionCore;
const ctx=vm.createContext({console,Set});ctx.window=ctx;
vm.runInContext(readFileSync(new URL('../docs/shared/vehicle-mechanism.js',import.meta.url),'utf8'),ctx);
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const ids=(from,to)=>Array.from({length:to-from+1},(_,i)=>[1,2,3].map(n=>`p${from+i}-${n}`)).flat();
const complete=id=>ids(2,id==='jet-plane'?11:10);
const create=id=>ctx.KidsVehicleMechanism.create(vehicleFixture(id));
// Independent behavior requirements: each engine/tool has its saved supports.
const requirements={
  'jet-plane':{wings:['p3-2',...ids(5,5)],'fan-left':ids(5,6),'fan-right':[...ids(5,5),...ids(7,7)]},
  excavator:{boom:['p4-1',...ids(7,7)],stick:ids(7,8),bucket:[...ids(7,8),'p9-1','p9-2'],turntable:ids(4,10).filter(part=>part!=='p9-3')},
  'snow-blower':{auger:ids(7,8),chute:ids(7,9),snow:[...ids(7,9),'p10-3']},
  'mobile-crane':{supports:ids(4,4),telescope:[...ids(4,4),...ids(6,7)],hoist:[...ids(4,4),...ids(6,9)]},
  'cement-mixer':{drum:ids(5,8),gutter:ids(5,8),pour:[...ids(5,8),'p10-3']},
  'recycling-truck':{bin:[...ids(5,6),...ids(8,9)],tip:[...ids(5,7),'p10-1']},
};
function prerequisites(feature,id,kind) {
  if(id==='mobile-crane' && kind!=='supports') feature.move('supports',1);
  if(id==='cement-mixer' && kind==='pour') feature.move('gutter',1);
}

for(const id of vehicleIds) {
  test(`${id}: new v2 selection gives fixed scene free and exact earned body packs`,()=>{
    const initial=C.empty();initial.grants=Array.from({length:12},(_,n)=>({id:`reward-${n}`,date:'2026-10-20',kind:'first',buildId:null,packIndex:null}));
    const before=structuredClone(initial), selected=C.apply(initial,{type:'select-model',modelId:id,commandId:`choice-${id}`});
    assert.deepEqual(initial,before);
    const build=selected.builds[0],count=id==='jet-plane'?10:9;
    assert.equal(build.contentVersion,2);assert.equal(C.packCount(build),count);
    assert.equal(C.requiredParts(build).length,count*3);
    assert.ok(C.requiredParts(build).every(part=>!part.id.startsWith('p1-')));
    assert.deepEqual(selected.grants.filter(g=>g.buildId).map(g=>g.packIndex),Array.from({length:count},(_,i)=>i+1));
    assert.deepEqual(selected.grants.map(g=>g.id),before.grants.map(g=>g.id));
    assert.throws(()=>C.apply(selected,{type:'place',buildId:build.id,grantId:'reward-0',packIndex:0,partId:'p1-1'}),/零件位置/);
  });

  test(`${id}: each original body group saves once and final placement remains collection-owned`,async()=>{
    const count=id==='jet-plane'?10:9,h=uiHarness([],{modelId:id,contentVersion:2,packs:count});await settle();
    try {
      assert.match(h.host.innerHTML,/data-placed="p1-1"/);
      for(let pack=2;pack<=count+1;pack++) {
        for(const n of [3,1,2]) {h.click('part',`p${pack}-${n}`);h.click('place');await settle();h.click('place');}
        if(pack<=count) {h.click('next');await settle();}
      }
      assert.equal(h.calls.length,count*3);assert.equal(new Set(h.state.activeBuild.placed).size,count*3);
      assert.equal(h.finalCandidate,true);assert.equal(h.state.grants.length,count);
      assert.ok(h.calls.every(call=>call.grantId===`earned-${call.packIndex-1}`));
    } finally {h.mounted.destroy();}
  });

  test(`${id}: every missing support locks its tool and no uninstalled artwork is invented`,()=>{
    for(const [kind,required] of Object.entries(requirements[id])) for(const missing of required) {
      const feature=create(id),saved=new Set(complete(id).filter(part=>part!==missing));
      feature.sync(saved);prerequisites(feature,id,kind);feature.trial('open',kind);
      assert.equal(feature.value(kind),0,`${kind} requires ${missing}`);
      assert.doesNotMatch(feature.scene(saved),new RegExp(`data-vehicle-part="${missing}"`));
      assert.doesNotMatch(feature.scene(saved),new RegExp(`data-train-operate="${kind}"`));
    }
    const feature=create(id),saved=new Set(complete(id)),before=JSON.stringify([...saved]);feature.sync(saved);
    for(const kind of Object.keys(requirements[id])) {prerequisites(feature,id,kind);feature.move(kind,1);assert.equal(feature.value(kind),1);feature.move(kind,NaN);assert.equal(feature.value(kind),1);}
    assert.equal(JSON.stringify([...saved]),before);
    feature.endTrial();assert.ok(Object.keys(requirements[id]).every(kind=>feature.value(kind)===0));
  });

  test(`${id}: read-only replay, pointer cancellation, keyboard and reduced motion do not save or finish again`,async()=>{
    const h=uiHarness(complete(id),{modelId:id,contentVersion:2,packs:id==='jet-plane'?10:9,inspection:true,motion:true});await settle();
    try {
      const before=JSON.stringify(h.state),kind=Object.keys(requirements[id])[0];
      assert.match(h.host.innerHTML,/data-train-range=/);
      h.featureClick('open',null,kind);assert.match(h.host.innerHTML,/aria-valuenow="100"/);
      h.featureClick('close',null,kind);
      const pane={dataset:{trainOperate:kind},getAttribute:()=>"false"};
      const target={closest:selector=>selector==='[data-train-operate]'?pane:null,matches:()=>false};
      h.fire('keydown',{key:'End',target,preventDefault(){}});assert.match(h.host.innerHTML,/aria-valuenow="100"/);
      h.fire('keydown',{key:'Home',target,preventDefault(){}});
      h.fire('pointerdown',{pointerId:42,clientX:0,clientY:80,target,preventDefault(){}});
      h.fire('pointermove',{pointerId:42,clientX:110,clientY:-30,preventDefault(){}});
      h.fire('pointercancel',{pointerId:42});assert.match(h.host.innerHTML,/aria-valuenow="0"/);
      for(const action of ['place','part','allocate','next','pause']) h.click(action,'p2-1');
      assert.equal(JSON.stringify(h.state),before);assert.equal(h.calls.length,0);assert.equal(h.finalCandidate,false);
    } finally {h.mounted.destroy();}
    const reduced=uiHarness([],{modelId:id,contentVersion:2,packs:1});await settle();
    reduced.click('part','p2-1');reduced.click('place');await settle();
    assert.equal(reduced.animations.length,0);assert.equal(reduced.calls.length,1);reduced.mounted.destroy();
  });

  test(`${id}: current pack only loads present artwork, missing images block placement until retry`,async()=>{
    const h=uiHarness([],{modelId:id,contentVersion:2,packs:1,manualImages:true});
    try {
      assert.ok(h.images.every(image=>!/\/p(?:[3-9]|1[01])-/.test(image.url)));
      h.images[0].onerror();for(const image of h.images.slice(1))image.onload();await settle();
      h.click('part','p2-1');h.click('place');await settle();assert.equal(h.calls.length,0);
      const previous=h.images.length;h.click('retry');
      for(const image of h.images.slice(previous))image.onload();await settle();
      h.click('part','p2-1');h.click('place');await settle();assert.equal(h.calls.length,1);
    } finally {h.mounted.destroy();}
  });
}

test('crane supports must deploy first; retracting them resets the telescoping arm and load',()=>{
  const feature=create('mobile-crane'),saved=new Set(complete('mobile-crane'));feature.sync(saved);
  for(const amount of [0,.01,.5,.99]) {
    feature.move('supports',amount);feature.move('telescope',1);feature.move('hoist',1);
    assert.equal(feature.value('telescope'),0,`supports ${amount} is not fully deployed`);assert.equal(feature.value('hoist'),0);
  }
  feature.move('supports',1);feature.move('telescope',1);feature.move('hoist',1);assert.equal(feature.value('hoist'),1);
  feature.move('supports',.99);assert.equal(feature.value('telescope'),0);assert.equal(feature.value('hoist'),0);
});

test('ten workshop SVG arrow presses fully deploy crane supports; one reverse press changes pose and locks/reset both tools',async()=>{
  const h=uiHarness(complete('mobile-crane'),{modelId:'mobile-crane',contentVersion:2,packs:9,inspection:true});await settle();
  try {
    const before=JSON.stringify(h.state),pane={dataset:{trainOperate:'supports'},getAttribute:()=>"false"};
    const target={closest:selector=>selector==='[data-train-operate]'?pane:null,matches:()=>false};
    const key=key=>h.fire('keydown',{key,target,preventDefault(){}});
    const range=kind=>h.host.innerHTML.match(new RegExp(`<input data-train-range="${kind}"[^>]*>`))[0];
    for(let press=0;press<10;press++)key('ArrowRight');
    assert.match(range('supports'),/value="100"/);
    for(const kind of ['telescope','hoist'])assert.doesNotMatch(range(kind),/disabled/,`${kind} unlocks after exactly ten presses`);
    assert.match(h.host.innerHTML,/data-vehicle-pose="supports"[^>]*supports-4\.png/);
    for(const kind of ['telescope','hoist']) {h.featureClick('open',null,kind);assert.match(range(kind),/value="100"/);}
    key('ArrowLeft');
    assert.match(range('supports'),/value="90"/);
    assert.match(h.host.innerHTML,/data-vehicle-pose="supports"[^>]*supports-3\.png/);
    for(const kind of ['telescope','hoist']) {assert.match(range(kind),/value="0"/);assert.match(range(kind),/disabled/);}
    for(let press=0;press<9;press++)key('ArrowLeft');
    assert.match(range('supports'),/value="0"/);assert.match(h.host.innerHTML,/data-vehicle-pose="supports"[^>]*supports-0\.png/);
    assert.equal(JSON.stringify(h.state),before);assert.equal(h.calls.length,0);
  } finally {h.mounted.destroy();}
});

test('only fully deployed crane supports show the final pose; scene and direct updates agree',()=>{
  const feature=create('mobile-crane'),saved=new Set(complete('mobile-crane'));feature.sync(saved);
  for(const [amount,index] of [[0,0],[.249,0],[.25,1],[.5,2],[.75,3],[.875,3],[.99,3],[.9999999999,3],[1,4]]) {
    feature.move('supports',amount);const scene=feature.scene(saved);let href;
    feature.update({querySelectorAll:()=>[],querySelector:selector=>selector==='[data-vehicle-pose="supports"]'?{setAttribute:(name,value)=>{if(name==='href')href=value;}}:null});
    assert.match(scene,new RegExp(`data-vehicle-pose="supports"[^>]*supports-${index}\\.png`));
    assert.match(href,new RegExp(`supports-${index}\\.png$`));
  }
  for(const [id,kind,index] of [['excavator','turntable',4],['snow-blower','auger',6],['cement-mixer','drum',6]]) {
    const other=create(id),parts=new Set(complete(id));other.sync(parts);other.move(kind,.875);
    assert.match(other.scene(parts),new RegExp(`data-vehicle-pose="${kind}"[^>]*${kind}-${index}\\.png`));
  }
});

test('crane support poses replace all four beams/cylinders/pads together and missing art stays locked',()=>{
  const model=vehicleFixture('mobile-crane'),feature=ctx.KidsVehicleMechanism.create(model),saved=new Set(complete('mobile-crane'));feature.sync(saved);
  for(const [amount,index] of [[0,0],[.25,1],[.5,2],[.75,3],[1,4]]) {
    feature.move('supports',amount);const scene=feature.scene(saved);
    assert.match(scene,new RegExp(`data-vehicle-pose="supports"[^>]*href="[^"]*supports-${index}\\.png`));
    for(const part of ids(4,4))assert.doesNotMatch(scene,new RegExp(`data-vehicle-part="${part}"`));
  }
  for(const missing of ids(4,4)) {
    const partial=new Set([...saved].filter(id=>id!==missing));feature.sync(partial);
    assert.doesNotMatch(feature.scene(partial),/data-vehicle-pose="supports"/);
    assert.ok(feature.sourcesFor(partial).every(src=>!src.includes('mechanism-poses/supports-')));
    assert.doesNotMatch(feature.scene(partial),new RegExp(`data-vehicle-part="${missing}"`));
  }
  delete model.mechanismPoses;const unavailable=ctx.KidsVehicleMechanism.create(model);unavailable.sync(saved);unavailable.trial('open','supports');
  assert.equal(unavailable.value('supports'),0);assert.match(unavailable.controls(saved),/旋轉圖片尚未準備好/);
  for(const part of ids(4,4))assert.match(unavailable.scene(saved),new RegExp(`data-vehicle-part="${part}"`));
  for(let missing=0;missing<5;missing++) {
    const incomplete=vehicleFixture('mobile-crane');incomplete.mechanismPoses.supports.frames.splice(missing,1);
    const tool=ctx.KidsVehicleMechanism.create(incomplete);tool.sync(saved);tool.trial('open','supports');tool.move('telescope',1);tool.move('hoist',1);
    assert.equal(tool.value('supports'),0,`pose ${missing} is required`);assert.equal(tool.value('telescope'),0);assert.equal(tool.value('hoist'),0);
    assert.doesNotMatch(tool.scene(saved),/data-vehicle-pose="supports"/);
  }
});

test('each source path stays inside its own model and empty scenes expose no movable PNGs',()=>{
  for(const id of vehicleIds) {
    const feature=create(id);feature.sync(new Set());assert.deepEqual(Array.from(feature.sourcesFor(new Set())),[]);
    assert.doesNotMatch(feature.scene(new Set()),/<image|data-train-operate=/);
    const sources=feature.sourcesFor(new Set(['p7-1']));assert.equal(sources.length,1);assert.match(sources[0],new RegExp(`${id}-v1/assets/p7-1\\.png$`));
  }
  assert.equal(ctx.KidsVehicleMechanism.create({id:'plane'}),null);
  assert.equal(ctx.KidsVehicleMechanism.create({id:'r200'}),null);
});

test('production and parent entry points load all six scripts before the catalog and required feature before workshop',()=>{
  for(const page of ['index.html','parent/train-preview.html']) {
    const html=readFileSync(new URL(`../docs/${page}`,import.meta.url),'utf8');
    for(const id of vehicleIds) assert.ok(html.indexOf(`brick-${id}.js`)<html.indexOf('brick-models.js'));
    assert.ok(html.indexOf('vehicle-mechanism.js')<html.indexOf('train-workshop.js'));
    assert.match(html,/vehicle-mechanism\.css/);
  }
});

test('projected turbine planes preserve their real pivot, ellipse basis and independent engine state',()=>{
  const model=vehicleFixture('jet-plane'),feature=ctx.KidsVehicleMechanism.create(model),saved=new Set(complete('jet-plane'));
  const part=model.steps[5].parts[2],{pivot,basis}=part.motion;
  feature.sync(saved);feature.move('fan-left',1/6);
  const scene=feature.scene(saved),read=kind=>spinMatrix(scene,kind);
  const m=read('fan-left'),apply=p=>[m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];
  const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} ≈ ${b}`);
  const center=apply(pivot);close(center[0],pivot[0]);close(center[1],pivot[1]);
  // A ninety-degree world-plane rotation maps its first basis to its second.
  const point=apply([pivot[0]+basis[0],pivot[1]+basis[1]]);
  close(point[0],pivot[0]+basis[2]);close(point[1],pivot[1]+basis[3]);
  read('fan-right').forEach((n,i)=>close(n,[1,0,0,1,0,0][i]));
});

test('mixer uses real pose PNGs only after complete drum/support/chute; no frames means no rotation',()=>{
  const model=vehicleFixture('cement-mixer'),feature=ctx.KidsVehicleMechanism.create(model);
  const saved=new Set(ids(5,7));feature.sync(saved);
  assert.ok(feature.sourcesFor(saved).every(src=>!src.includes('mechanism-poses')));
  assert.doesNotMatch(feature.scene(saved),/data-vehicle-drum-pose/);feature.move('drum',1);assert.equal(feature.value('drum'),0);
  ids(8,8).forEach(id=>saved.add(id));feature.sync(saved);
  assert.equal(feature.sourcesFor(saved).filter(src=>src.includes('mechanism-poses')).length,8);
  feature.move('drum',1);assert.match(feature.scene(saved),/drum-7\.png/);
  assert.doesNotMatch(feature.scene(saved),/data-vehicle-part="p6-|data-vehicle-part="p7-/);
  delete model.mechanismPoses;const missing=ctx.KidsVehicleMechanism.create(model);missing.sync(saved);missing.move('drum',1);
  assert.equal(missing.value('drum'),0);assert.match(missing.controls(saved),/旋轉圖片尚未準備好/);
});

test('vehicle controls stay inside the model column before the affected scene in build and read-only replay',async()=>{
  for(const id of vehicleIds) for(const inspection of [false,true]) {
    const placed=inspection?complete(id):id==='jet-plane'?ids(2,5):ids(2,8);
    const h=uiHarness(placed,{modelId:id,contentVersion:2,packs:id==='jet-plane'?10:9,inspection});await settle();
    try {
      if(!h.host.innerHTML.includes('data-vehicle-inline-controls')) {h.click('mechanism');await settle();}
      const html=h.host.innerHTML,area=html.indexOf('vehicle-model-area'),controls=html.indexOf('data-vehicle-inline-controls'),scene=html.indexOf('data-e500-scene'),tray=html.indexOf('<aside');
      assert.ok(area>=0 && controls>area && scene>controls,`${id}: controls immediately precede the model in the same area`);
      if(!inspection) assert.ok(tray>scene,'the tray cannot push controls below the entire bench');
      assert.equal((html.match(/data-vehicle-inline-controls/g)||[]).length,1);
    } finally {h.mounted.destroy();}
  }
});

test('snow auger and excavator upper structure use real pose sets without moving their fixed supports',()=>{
  for(const [id,kind,rigParts] of [['snow-blower','auger',['p8-1','p8-2']],['excavator','turntable',ids(4,10).filter(part=>part!=='p9-3')]]) {
    const model=vehicleFixture(id),feature=ctx.KidsVehicleMechanism.create(model),saved=new Set(complete(id));feature.sync(saved);feature.move(kind,1);
    const scene=feature.scene(saved);assert.match(scene,new RegExp(`data-vehicle-pose="${kind}"`));
    assert.match(scene,new RegExp(`${kind}-${id==='excavator'?4:7}\\.png`));
    if(id==='snow-blower') {assert.match(scene,/data-vehicle-part="p7-1"/);for(const part of rigParts) assert.doesNotMatch(scene,new RegExp(`data-vehicle-part="${part}"`));}
    else {feature.move('boom',1);assert.equal(feature.value('boom'),0);feature.move(kind,0);feature.move('boom',1);assert.equal(feature.value('boom'),1);}
  }
});

test('trial animations play once from the same PNGs and reduced motion keeps direct manipulation',()=>{
  const id='jet-plane',feature=create(id),saved=new Set(complete(id));feature.sync(saved);
  feature.trial('open','fan-left');const scene=feature.scene(saved);
  assert.match(scene,/<animateTransform data-vehicle-trial attributeName="transform" type="rotate" from="0" to="540" dur="1.1s"/);
  assert.doesNotMatch(scene,/<animate attributeName="transform"/);
  assert.doesNotMatch(feature.scene(saved),/data-vehicle-trial/,'ordinary repaint never repeats a trial');
  ctx.matchMedia=()=>({matches:true});
  try {
    feature.trial('open','fan-left');assert.doesNotMatch(feature.scene(saved),/<animate|<set /);
    assert.equal(feature.value('fan-left'),1);
  } finally {delete ctx.matchMedia;}
  for(const [modelId,kind] of [['snow-blower','auger'],['cement-mixer','drum'],['excavator','turntable'],['mobile-crane','supports']]) {
    const item=create(modelId),parts=new Set(complete(modelId));item.sync(parts);item.trial('open',kind);
    const animated=item.scene(parts),images=[...animated.matchAll(/<image[^>]*href="[^"]*mechanism-poses\/[^"]*"/g)];
    assert.equal(images.length,1,`${kind}: transparent frames share one image, so they cannot overlap`);
    assert.match(animated,/<set data-vehicle-trial attributeName="href"/);
    assert.doesNotMatch(animated,/attributeName="visibility"/);
    item.endTrial();assert.doesNotMatch(item.scene(parts),/data-vehicle-trial/);
    ctx.matchMedia=()=>({matches:true});
    try {
      item.trial('open',kind);const direct=item.scene(parts);
      assert.doesNotMatch(direct,/<set |<animate/);
      assert.match(direct,new RegExp(`${kind}-${modelId==='excavator'||modelId==='mobile-crane'?4:7}\\.png`));
    } finally {delete ctx.matchMedia;}
  }
});

test('trial turbine angles stay on their projected ellipse throughout 540 degrees and affect one engine',()=>{
  const model=vehicleFixture('jet-plane'),feature=ctx.KidsVehicleMechanism.create(model),saved=new Set(complete('jet-plane'));feature.sync(saved);feature.trial('open','fan-left');
  const scene=feature.scene(saved),{pivot,basis}=model.steps[5].parts[2].motion;
  const apply=(m,p)=>[m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];
  for(const fraction of [0,.125,.25,.5,.75,1]) {
    const angle=fraction*540,radians=angle*Math.PI/180,m=spinMatrix(scene,'fan-left',angle);
    const center=apply(m,pivot),edge=apply(m,[pivot[0]+basis[0],pivot[1]+basis[1]]);
    for(let i=0;i<2;i++) {
      assert.ok(Math.abs(center[i]-pivot[i])<1e-5);
      assert.ok(Math.abs(edge[i]-(pivot[i]+basis[i]*Math.cos(radians)+basis[i+2]*Math.sin(radians)))<1e-5);
    }
  }
  assert.equal(feature.value('fan-right'),0);assert.equal((scene.match(/<animateTransform/g)||[]).length,1);
});

test('direct manipulation removes live trial nodes before setting the fan angle or pose href',()=>{
  for(const [id,kind] of [['jet-plane','fan-left'],['excavator','turntable'],['snow-blower','auger'],['cement-mixer','drum'],['mobile-crane','supports']]) {
    const feature=create(id),saved=new Set(complete(id));feature.sync(saved);feature.trial('open',kind);feature.scene(saved);feature.move(kind,.25);
    let removed=false;const attributes={},node={dataset:{movingPart:id==='jet-plane'?'p6-3':'p4-1'},setAttribute:(name,value)=>{assert.ok(removed);attributes[name]=value;},value:'0'};
    const host={querySelectorAll:selector=>selector==='[data-vehicle-trial]'?[{remove(){removed=true;}}]:selector===`[data-vehicle-move="${kind}"]`?[node]:[],querySelector:selector=>selector===`[data-vehicle-pose="${kind}"]`?node:null};
    feature.update(host);assert.ok(removed);
    if(id==='jet-plane')assert.equal(attributes.transform,'rotate(135)');
    else assert.match(attributes.href,new RegExp(`${kind}-${id==='excavator'||id==='mobile-crane'?1:2}\\.png$`));
    feature.trial('close',kind);assert.doesNotMatch(feature.scene(saved),/data-vehicle-trial/);
  }
});
