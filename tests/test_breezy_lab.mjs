import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as mechanism from '../docs/parent/breezy-mechanism.mjs';

test('each pane needs its own frame, and either complete pair may be built first',()=>{
  for(const first of ['window','door']){
    const m=mechanism.createMechanism(),second=first==='window'?'door':'window';
    assert.equal(m.install(`${first}-pane`),false);
    assert.equal(m.move(first,1),false);
    assert.equal(m.install(`${first}-frame`),true);
    assert.equal(m.install(`${second}-pane`),false);
    assert.equal(m.install(`${first}-pane`),true);
    assert.equal(m.move(first,.7),true);
    assert.equal(m.state.installed.size,2);
    assert.equal(m.state.open[first],.7);
    assert.equal(m.state.open[second],0);
    assert.equal(m.install(`${second}-frame`),true);assert.equal(m.install(`${second}-pane`),true);
    for(const {id} of mechanism.PARTS)assert.equal(m.install(id),false);
    assert.equal(m.state.installed.size,4);
  }
});

test('open and close are bounded and never add or remove assembly progress',()=>{
  const m=mechanism.createMechanism();for(const {id} of mechanism.PARTS)m.install(id);
  const installed=[...m.state.installed];
  for(const kind of ['window','door']){
    m.move(kind,99);assert.equal(m.state.open[kind],1);
    m.move(kind,-99);assert.equal(m.state.open[kind],0);
    m.move(kind,.43);assert.equal(m.state.open[kind],.43);
    for(const bad of [NaN,Infinity,undefined])assert.equal(m.move(kind,bad),false);
    assert.equal(m.state.open[kind],.43);
  }
  assert.deepEqual([...m.state.installed],installed);
  assert.equal(m.install('p7-1'),false);assert.equal(m.move('unknown',1),false);
});

test('removing one pane preserves both frames and the other operable pair',()=>{
  const m=mechanism.createMechanism();for(const {id} of mechanism.PARTS)m.install(id);
  m.move('window',1);m.move('door',.5);m.removePane('window');
  assert.deepEqual([...m.state.installed],['window-frame','door-frame','door-pane']);
  assert.equal(m.state.open.window,0);assert.equal(m.state.open.door,.5);
  assert.equal(m.move('window',1),false);assert.equal(m.install('window-pane'),true);
  assert.equal(m.state.open.window,0);
  assert.equal(mechanism.createMechanism().state.installed.size,0,'reopening starts a fresh isolated model');
});

// Exercise event sequences with visible nodes, without reaching into module state.
function harness({animated=false}={}){
  const nodes=new Map(),captured=new Set(),windows=new Map(),animations=[];
  function node(selector){
    if(nodes.has(selector))return nodes.get(selector);
    const n={style:{},dataset:{},attrs:new Map(),events:new Map(),checked:false,disabled:false,hidden:false,value:'0',innerHTML:'',textContent:'',
      classList:{toggle(){}},setAttribute(k,v){this.attrs.set(k,v);},removeAttribute(k){this.attrs.delete(k);},
      querySelector:s=>node(`${selector} ${s}`),querySelectorAll:()=>[],addEventListener(k,v){this.events.set(k,v);},focus(){},
      setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id),
      getScreenCTM:()=>({a:1,d:1}),getBoundingClientRect:()=>({x:100,y:50,width:80,height:80}),
    };nodes.set(selector,n);return n;
  }
  const parts=mechanism.PARTS.map(part=>{const n=node(`[data-part="${part.id}"]`);n.dataset.part=part.id;return n;});
  const ranges=['window','door'].map(kind=>{const n=node(`[data-range="${kind}"]`);n.dataset.range=kind;return n;});
  const removes=['window','door'].map(kind=>{const n=node(`[data-remove="${kind}"]`);n.dataset.remove=kind;return n;});
  const doc={querySelector:node,querySelectorAll:s=>s==='[data-part]'?parts:s==='[data-range]'?ranges:s==='[data-remove]'?removes:[],body:{append(){}},
    createElement:()=>({style:{},setAttribute(){},remove(){},animate(){let resolve,reject;const finished=new Promise((a,b)=>{resolve=a;reject=b;});const a={finished,resolve,cancel:()=>reject(Error('cancelled'))};animations.push(a);return a;}})};
  const isolated=()=>{throw Error('prototype must not access family APIs or storage');};
  const window={KidsBrickBreezyBlue:{steps:[]},addEventListener:(name,fn)=>windows.set(name,fn)};
  const context=vm.createContext({...mechanism,document:doc,window,matchMedia:()=>({matches:!animated}),fetch:isolated,
    localStorage:new Proxy({},{get:isolated}),sessionStorage:new Proxy({},{get:isolated}),indexedDB:new Proxy({},{get:isolated}),
    DOMPoint:class{constructor(x,y){this.x=x;this.y=y;}matrixTransform(){return this;}},Date,console});
  vm.runInContext(readFileSync(new URL('../docs/parent/breezy-lab.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,''),context);
  function fire(name,id='window-frame',extra={}){
    const target={closest:s=>s==='[data-part]'?node(`[data-part="${id}"]`):null};
    node('#lab').events.get(name)({target,pointerId:3,button:0,detail:1,clientX:100,clientY:50,preventDefault(){},...extra});
  }
  const pick=id=>fire('click',id,{detail:0});
  const install=id=>{pick(id);node('#place').events.get('click')();};
  return{node,fire,pick,install,animations,windows};
}

test('a trailing native click cannot reselect a cancelled piece',()=>{
  for(const reason of ['Escape','pointercancel','lostpointercapture']){
    const h=harness();h.fire('pointerdown');assert.equal(h.node('#place').disabled,false);
    if(reason==='Escape')h.fire('keydown','window-frame',{key:'Escape'});else h.fire(reason);
    h.fire('pointerup');h.fire('click');
    assert.equal(h.node('#place').disabled,true);assert.equal(h.node('#part-count').textContent,'0 / 4');
    h.install('door-frame');assert.equal(h.node('#part-count').textContent,'1 / 4');
  }
});

test('a working half can open, compare, return, and be disassembled without completing the other half',()=>{
  const h=harness();
  assert.equal(h.node('[data-part="window-pane"]').disabled,true);
  h.install('window-frame');assert.equal(h.node('[data-part="window-pane"]').disabled,false);
  h.install('window-pane');assert.equal(h.node('#part-count').textContent,'2 / 4');
  const range=h.node('[data-range="window"]');range.value='75';range.events.get('input')();
  assert.equal(h.node('#window-pane').attrs.get('aria-valuenow'),'75');
  h.node('#compare').events.get('click')();assert.equal(h.node('#window-pane').style.display,'none');assert.equal(range.disabled,true);
  h.node('#compare').events.get('click')();assert.equal(h.node('#window-pane').style.display,'');assert.equal(range.value,'75');
  h.node('[data-remove="window"]').events.get('click')();assert.equal(h.node('#part-count').textContent,'1 / 4');
  assert.equal(h.node('#window-frame').style.display,'');assert.equal(h.node('#window-pane').style.display,'none');
  h.install('window-pane');assert.equal(h.node('#window-pane').attrs.get('aria-valuenow'),'0');
  assert.equal(h.node('[data-part="door-pane"]').disabled,true);
});

test('reset, resize and comparison during a joining animation never install a stale piece',async()=>{
  for(const reason of ['reset','resize','compare']){
    const h=harness({animated:true});h.install('window-frame');assert.equal(h.animations.length,1);
    if(reason==='resize')h.windows.get('resize')();else h.node(`#${reason}`).events.get('click')();
    h.animations[0].resolve();await new Promise(resolve=>setImmediate(resolve));
    assert.equal(h.node('#part-count').textContent,'0 / 4');
    assert.equal(h.node('#window-frame').style.display,'none');
    if(reason==='compare')h.node('#compare').events.get('click')();
    h.install('door-frame');h.animations[1].resolve();await new Promise(resolve=>setImmediate(resolve));
    assert.equal(h.node('#part-count').textContent,'1 / 4');
  }
});

test('prototype declares network isolation and loads no family or collection scripts',()=>{
  const html=readFileSync(new URL('../docs/parent/breezy-lab.html',import.meta.url),'utf8');
  assert.match(html,/connect-src 'none'/);
  const scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(scripts,['../shared/brick-breezy-blue.js','breezy-lab.js']);
});
