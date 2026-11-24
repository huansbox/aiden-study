import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as mechanism from '../docs/parent/ct273-mechanism.mjs';

// Event-sequence harness: assertions inspect visible control state, not module locals.
function labHarness() {
  const nodes=new Map(), captured=new Set();
  function node(selector) {
    if(nodes.has(selector))return nodes.get(selector);
    const n={style:{},dataset:{},attrs:new Map(),events:new Map(),checked:false,innerHTML:'',disabled:false,
      classList:{toggle(){}},setAttribute(k,v){this.attrs.set(k,v);},removeAttribute(k){this.attrs.delete(k);},
      querySelector(s){return node(`${selector} ${s}`);},addEventListener(k,v){this.events.set(k,v);},focus(){},
      setPointerCapture(id){captured.add(id);},hasPointerCapture(id){return captured.has(id);},releasePointerCapture(id){captured.delete(id);},
      getScreenCTM(){return {a:1,d:1};},getBoundingClientRect(){return {x:100,y:50,width:80,height:80};},
    };
    nodes.set(selector,n);return n;
  }
  const parts=['0','1','2','rod'].map(part=>{const n=node(`[data-part="${part}"]`);n.dataset.part=part;return n;});
  const doc={querySelector:node,querySelectorAll:selector=>selector==='[data-part]'?parts:[],body:{append(){}}};
  const context=vm.createContext({...mechanism,document:doc,matchMedia:()=>({matches:true}),window:{addEventListener(){}},
    DOMPoint:class {constructor(x,y){this.x=x;this.y=y;}matrixTransform(){return this;}},console,Date});
  const source=readFileSync(new URL('../docs/parent/ct273-lab.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'');
  vm.runInContext(source,context);
  function fire(name,part='0',extra={}) {
    const target={closest:selector=>selector==='[data-part]'?node(`[data-part="${part}"]`):null};
    node('#lab').events.get(name)({target,pointerId:4,button:0,detail:1,clientX:100,clientY:50,preventDefault(){},...extra});
  }
  return {node,fire};
}

test('Esc or cancelled pointer cannot reselect a piece when its trailing native click arrives',()=>{
  for(const cancellation of ['Escape','pointercancel','lostpointercapture']) {
    const h=labHarness();h.fire('pointerdown');
    assert.equal(h.node('#place').disabled,false);
    if(cancellation==='Escape')h.fire('keydown','0',{key:'Escape'});else h.fire(cancellation);
    h.fire('pointerup');h.fire('click');
    assert.equal(h.node('#place').disabled,true);
    assert.equal(h.node('[data-part="0"]').attrs.get('aria-pressed'),'false');
    assert.equal(h.node('#part-count').textContent,'0 / 4');
    h.fire('pointerdown','1');h.fire('pointerup','1');h.fire('click','1');
    assert.equal(h.node('#place').disabled,false,'a fresh attempt remains usable');
  }
});

test('keyboard picking and reduced-motion installation still work after cancelling',()=>{
  const h=labHarness();
  h.fire('click','2',{detail:0});
  assert.equal(h.node('#place').disabled,false);
  h.fire('keydown','2',{key:'Escape'});
  h.fire('click','2',{detail:0});
  h.node('#place').events.get('click')();
  assert.equal(h.node('#part-count').textContent,'1 / 4');
  assert.equal(h.node('[data-part="2"]').disabled,true);
  assert.equal(h.node('[data-part="rod"]').disabled,true);
});
