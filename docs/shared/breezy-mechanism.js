(() => {
  "use strict";
  const global = typeof window === "undefined" ? globalThis : window;
  const groups = {window:["p7-1","p7-2","p7-3"],door:["p8-1","p8-2"]};
  const kindOf = id => groups.window.includes(id) ? "window" : groups.door.includes(id) ? "door" : null;
  const base = typeof document !== "undefined" && document.currentScript?.src
    ? new URL("breezy-art/",document.currentScript.src).href : "shared/breezy-art/";
  const files = ["body","window-frame","window-upper","window-lower","door-frame","door-pane"];
  const sources = files.map(name=>`${base}${name}.png?v=1`);
  const image = name => `<image pointer-events="none" x="0" y="0" width="900" height="470" href="${sources[files.indexOf(name)]}"/>`;
  const boxes = {window:{frame:{x:126,y:107,width:322,height:264},pane:{x:169,y:155,width:236,height:174}},door:{frame:{x:552,y:71,width:236,height:348},pane:{x:594,y:119,width:152,height:258}}};
  const travel = {window:84,door:122};
  const pane = kind => kind === "window" ? image("window-upper")+image("window-lower") : image("door-pane");
  const svg = (art,box) => `<svg viewBox="${box}" aria-hidden="true">${art}</svg>`;
  const thumb = (kind,frame=false) => {const b=boxes[kind].frame;return svg(frame?image(`${kind}-frame`):pane(kind),`${b.x} ${b.y} ${b.width} ${b.height}`);};
  const hand = '<path d="M18 38V14c0-7 10-7 10 0v17-5c0-6 9-6 9 0v7-5c0-6 9-6 9 0v7c0-6 9-6 9 0v15c0 12-8 20-20 20-9 0-12-5-18-13L6 43c-4-7 3-11 8-5l8 10" fill="#fff1d5" stroke="#47757a" stroke-width="3" stroke-linejoin="round"/>';
  const gesture = (kind="window") => `<span class="bb-gesture" role="img" aria-label="${kind==='window'?'上下開窗':'左右拉門'}">${thumb(kind)}${svg(hand,'0 0 65 75')}<b aria-hidden="true">${kind==='window'?'↕':'↔'}</b></span>`;
  function create() {
    let placed = new Set(), selectedKind="window";
    const staged = new Set(), detached = new Set(), open = new Map();
    const chosen={window:groups.window[0],door:groups.door[0]};
    const complete = (id,ids=placed) => ids.has(id) && !detached.has(id);
    function sync(ids) {
      for(const id of [...staged]) if(ids.has(id)) staged.delete(id);
      for(const id of [...detached]) if(!ids.has(id)) detached.delete(id);
      for(const id of open.keys()) if(!ids.has(id)) open.delete(id);
      placed = new Set(ids);
    }
    function choose(id) { const kind=kindOf(id);if(kind){chosen[kind]=id;selectedKind=kind;} }
    function part(id) {
      const kind=kindOf(id);if(!kind)return null;
      const frame=!placed.has(id)&&!staged.has(id);
      return {box:boxes[kind][frame || placed.has(id)?"frame":"pane"],svg:frame?image(`${kind}-frame`):placed.has(id)?image(`${kind}-frame`)+pane(kind):pane(kind),variants:[],occlusionPeers:[]};
    }
    function scene(ids,{disabled=false,before=false}={}) {
      // This close-up represents one chosen window group and one door group.
      // Body-only art deliberately excludes roof, wheels, steps and fittings.
      const body=["p6-1","p6-2","p6-3"].every(id=>ids.has(id));
      return `<defs><clipPath id="bb-window-hole"><rect x="165" y="151" width="244" height="182"/></clipPath><clipPath id="bb-door-hole"><rect x="590" y="115" width="160" height="266"/></clipPath></defs>
        ${body?`<g data-bb-body aria-hidden="true">${image("body")}</g>`:''}
        ${Object.keys(groups).map(kind=>{
          const id=chosen[kind],done=complete(id,ids),frame=ids.has(id)||(!before&&staged.has(id)),b=boxes[kind].frame,value=open.get(id)||0;
          return `<g data-bb-group="${id}">${frame?image(`${kind}-frame`):`<rect x="${b.x+22}" y="${b.y+28}" width="${b.width-44}" height="${b.height-50}" rx="5" fill="#e7ede41a" stroke="#c9ac64" stroke-width="3" stroke-dasharray="9 8"/>`}
          ${done?`<g data-bb-operate="${kind}" class="bb-moving" role="slider" aria-label="${kind==='window'?'上下拖動車窗':'左右拖動車門'}" tabindex="${disabled?-1:0}" aria-disabled="${disabled}" aria-orientation="${kind==='window'?'vertical':'horizontal'}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(value*100)}">
          <g clip-path="url(#bb-${kind}-hole)"><g data-bb-slide="${kind}" transform="translate(${kind==='window'?0:-value*travel.door} ${kind==='window'?-value*travel.window:0})">${image(kind==='window'?'window-lower':'door-pane')}</g>${kind==='window'?image('window-upper'):''}</g>
          <rect class="bb-focus" x="${b.x+15}" y="${b.y+20}" width="${b.width-30}" height="${b.height-35}" rx="8"/><rect x="${b.x+15}" y="${b.y+20}" width="${b.width-30}" height="${b.height-35}" fill="transparent"/></g>`:''}</g>`;
        }).join('')}`;
    }
    function instructions(id) {
      const kind=kindOf(id)||selectedKind,step=placed.has(id)?2:staged.has(id)?1:0;
      return `<div class="bb-instructions" role="img" aria-label="先接框，再${kind==='window'?'向下':'向右'}滑入，接好後${kind==='window'?'上下開窗':'左右拉門'}">${[thumb(kind,true),thumb(kind),gesture(kind)].map((art,i)=>`<span class="${step===i?'active':''}"><b>${i+1}</b>${art}${i<2?`<em>${i===0?'↓':kind==='window'?'↓':'→'}</em>`:''}</span>${i<2?'<i>→</i>':''}`).join('')}</div>`;
    }
    function controls(ids,{disabled=false}={}) {
      const off=disabled?'disabled':'';
      return `<div class="bb-controls">${Object.entries(groups).map(([kind,list])=>{
        const available=list.filter(id=>ids.has(id));if(!available.length)return '';
        const id=chosen[kind],done=complete(id,ids),value=open.get(id)||0;
        return `<div class="bb-unit-controls">${available.map(unit=>`<button data-e500-action="bb-unit" data-part="${unit}" aria-label="查看第 ${list.indexOf(unit)+1} 組${kind==='window'?'窗戶':'車門'}" aria-pressed="${unit===id}" ${off}>${thumb(kind)}<b>${list.indexOf(unit)+1}</b></button>`).join('')}${ids.has(id)?`<span class="bb-slide-controls">${gesture(kind)}<button data-e500-action="bb-open" data-kind="${kind}" aria-label="${kind==='window'?'向上開窗':'向左開門'}" ${off} ${done?'':'disabled'}>${kind==='window'?'↑':'←'}</button><input type="range" data-bb-range="${kind}" aria-label="${kind==='window'?'車窗':'車門'}開啟程度" min="0" max="100" step="1" value="${Math.round(value*100)}" ${off} ${done?'':'disabled'}><button data-e500-action="bb-close" data-kind="${kind}" aria-label="${kind==='window'?'向下關窗':'向右關門'}" ${off} ${done?'':'disabled'}>${kind==='window'?'↓':'→'}</button><button data-e500-action="bb-detach" data-kind="${kind}" aria-label="${detached.has(id)?'接回':'試拆'}${kind==='window'?'窗扇':'門扇'}，不改拼裝進度" aria-pressed="${detached.has(id)}" ${off}>${detached.has(id)?'接回':'試拆'}</button></span>`:''}</div>`;
      }).join('')}</div>`;
    }
    function move(kind,value) {
      const id=chosen[kind];if(!complete(id)||!Number.isFinite(value))return;
      open.set(id,Math.max(0,Math.min(1,value)));
    }
    function update(host) {
      for(const kind of Object.keys(groups)) {
        const value=open.get(chosen[kind])||0;
        host.querySelector(`[data-bb-slide="${kind}"]`)?.setAttribute('transform',`translate(${kind==='window'?0:-value*travel.door} ${kind==='window'?-value*travel.window:0})`);
        host.querySelector(`[data-bb-operate="${kind}"]`)?.setAttribute('aria-valuenow',String(Math.round(value*100)));
        const range=host.querySelector(`[data-bb-range="${kind}"]`);if(range)range.value=String(Math.round(value*100));
      }
    }
    return {sync,choose,part,scene,controls,instructions,gesture,move,update,sources,travel,
      isPart:id=>!!kindOf(id),hasPart:ids=>[...ids].some(kindOf),
      stage(id){if(!kindOf(id)||placed.has(id)||staged.has(id))return false;staged.add(id);return true;},
      hasStaged:()=>staged.size>0,
      entry(id){return kindOf(id)==='door'&&staged.has(id)?{x:-70,y:0}:{x:0,y:staged.has(id)?-75:-13};},
      arrow(id){return kindOf(id)==='door'&&staged.has(id)?'right':'down';},
      value:kind=>open.get(chosen[kind])||0,
      get current(){return chosen[selectedKind];},
      trial(kind){const id=chosen[kind];if(!placed.has(id))return;if(detached.has(id))detached.delete(id);else detached.add(id);open.set(id,0);},
      endTrial(){detached.clear();},
    };
  }
  global.KidsBreezyMechanism=Object.freeze({create});
})();
