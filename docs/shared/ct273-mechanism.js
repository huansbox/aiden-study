(() => {
  "use strict";
  const global = typeof window === "undefined" ? globalThis : window;
  const wheelIds = ["p3-1","p3-2","p3-3"], rodId = "p12-1";
  const centers = [285,450,615], axleY = 236, crank = 29;
  const normalize = angle => ((angle % 360) + 360) % 360;
  const delta = (from,to) => ((to-from+540)%360)-180;
  const wheel = (radius=80) => `<g transform="scale(${radius/80})"><circle r="80" fill="#1c2429"/><circle r="72" fill="#515d61"/><circle r="62" fill="#263237"/><circle r="65" fill="none" stroke="#a0aaa9" stroke-width="4"/>${Array.from({length:8},(_,i)=>`<path d="M0 0V-57" transform="rotate(${i*45})" stroke="#849293" stroke-width="7"/>`).join("")}<circle r="19" fill="#a8b4b2" stroke="#d5dbd5" stroke-width="3"/><circle r="8" fill="#40514f"/><circle cx="29" r="10" fill="#d4a346" stroke="#f4d68c" stroke-width="3"/></g>`;
  const rod = () => `<path d="M0 0H330" stroke="#526268" stroke-width="24" stroke-linecap="round"/><path d="M0 -3H330" stroke="#c0cbc7" stroke-width="13" stroke-linecap="round"/>${[0,165,330].map(x=>`<circle cx="${x}" r="17" fill="#a7b6b2" stroke="#e6eae0" stroke-width="3"/><circle cx="${x}" r="8" fill="#435652"/>`).join("")}`;
  const gesture = () => `<span class="ct-gesture" role="img" aria-label="沿輪緣轉動大輪"><svg viewBox="0 0 150 80" aria-hidden="true"><g transform="translate(50 41)">${wheel(25)}</g><path d="M15 48A35 35 0 1 1 71 15m-13-4 15 5 4-15" fill="none" stroke="#27766a" stroke-width="5" stroke-linecap="round"/><path d="M63 47V25c0-6 8-6 8 0v14-6c0-5 8-5 8 0v8-6c0-5 8-5 8 0v6c0-5 8-5 8 0v12c0 10-6 17-16 17-8 0-11-5-17-13l-7-9c-4-6 2-10 6-4l6 8" fill="#fff5df" stroke="#60786b" stroke-width="2.5"/><path d="M111 40h25m-8-8 8 8-8 8" fill="none" stroke="#27766a" stroke-width="4"/></svg></span>`;
  function create() {
    let placed = new Set(), detached = false, chosen = 0;
    const angles = [0,0,0];
    const hasWheel = ids => wheelIds.some(id=>ids.has(id));
    const linked = (ids=placed) => ids.has(rodId) && wheelIds.every(id=>ids.has(id)) && !detached;
    const pins = () => centers.map((x,i)=>({x:x+crank*Math.cos(angles[i]*Math.PI/180),y:axleY+crank*Math.sin(angles[i]*Math.PI/180)}));
    function sync(ids) {
      if(ids.has(rodId) && !placed.has(rodId)) { angles.fill(angles[0]); detached=false; }
      placed=new Set(ids);
      if(!placed.has(rodId))detached=false;
      wheelIds.forEach((id,i)=>{if(!placed.has(id))angles[i]=0;});
      if(!placed.has(wheelIds[chosen]))chosen=Math.max(0,wheelIds.findIndex(id=>placed.has(id)));
    }
    function part(id) {
      if(id===rodId){const p=pins()[0];return {box:{x:p.x-24,y:p.y-26,width:378,height:52},svg:`<g transform="translate(${p.x} ${p.y})">${rod()}</g>`,variants:[],occlusionPeers:[]};}
      const i=wheelIds.indexOf(id);
      return i<0?null:{box:{x:centers[i]-80,y:axleY-80,width:160,height:160},svg:`<g transform="translate(${centers[i]} ${axleY}) rotate(${angles[i]})">${wheel()}</g>`,variants:[],occlusionPeers:[]};
    }
    function scene(ids,{disabled=false}={}) {
      // Only saved parts are pictured as train parts; the pale jig is a workbench.
      const frame = ["p4-1","p4-2"].map((id,i)=>{
        const left=i===0?83:451,right=i===0?451:820;
        if(!ids.has(id))return `<path d="M${left+20} 151H${right-20}" stroke="#bec9b7" stroke-width="8" stroke-linecap="round" stroke-dasharray="6 12"/>`;
        return `<g data-ct-frame="${id}"><path d="M${left} 115H${right}V173H${left}Z" fill="#52615b" stroke="#364b42" stroke-width="3"/><path d="M${left} 115l19-18h${right-left-38}l19 18" fill="#a2ada1" stroke="#728074" stroke-width="3"/>${Array.from({length:7},(_,n)=>`<ellipse cx="${left+39+n*46}" cy="102" rx="13" ry="6" fill="#c4ccbd" stroke="#7c8f7a" stroke-width="2"/>`).join("")}</g>`;
      }).join("");
      return `<g aria-hidden="true"><path d="M62 329H841" stroke="#b2bbaa" stroke-width="7" stroke-linecap="round"/>
        ${frame}
        ${ids.has("p2-1")?[112,150].map(x=>`<g transform="translate(${x} 292)">${wheel(26)}</g>`).join(""):""}${ids.has("p2-2")?`<g transform="translate(776 283)">${wheel(35)}</g>`:""}</g>
        ${centers.map((x,i)=>ids.has(wheelIds[i])?`<g data-ct-wheel="${i}" class="ct-wheel${chosen===i?" is-chosen":""}" transform="translate(${x} ${axleY})" tabindex="${disabled?-1:0}" role="slider" aria-disabled="${disabled}" aria-label="第 ${i+1} 個大輪，方向鍵轉動" aria-valuemin="0" aria-valuemax="360" aria-valuenow="${Math.round(angles[i])}"><circle class="ct-wheel-focus" r="86"/><g data-ct-rotor="${i}" transform="rotate(${angles[i]})">${wheel()}</g></g>`:`<g transform="translate(${x} ${axleY})" aria-hidden="true"><circle r="76" fill="#dce2d7" stroke="#a6b3a5" stroke-width="3" stroke-dasharray="6 7"/><circle r="15" fill="#a6b3a5"/><path d="M-7 0H7M0 -7V7" stroke="#f4f6e8" stroke-width="4"/></g>`).join("")}
        ${ids.has(rodId) && !detached?`<g data-ct-rod transform="translate(${pins()[0].x} ${pins()[0].y})" aria-label="連起三輪的連桿">${rod()}${[0,165,330].map(x=>`<circle cx="${x}" r="5" fill="#e0b663"/>`).join("")}</g>`:""}`;
    }
    function controls(ids,{disabled=false}={}) {
      if(!hasWheel(ids))return "";
      const off=disabled?'disabled':"";
      return `<div class="ct-turn-controls"><span data-ct-caption>${linked(ids)?"一起轉":`轉轉看 ${chosen+1}`}</span><button data-e500-action="ct-prev" aria-label="往回轉四分之一圈" ${off}>↶</button><input type="range" data-ct-angle min="0" max="360" step="1" value="${Math.round(angles[chosen])}" aria-label="${linked(ids)?"三個大輪":`第 ${chosen+1} 個大輪`}的角度" ${off}><button data-e500-action="ct-next" aria-label="往前轉四分之一圈" ${off}>↷</button>${ids.has(rodId)?`<button data-e500-action="ct-detach" aria-label="${detached?"接回連桿，一起轉動":"暫時試拆連桿，各自轉動，不改拼裝進度"}" aria-pressed="${detached}" ${off}>${detached?"接回":"試拆"}</button>`:""}</div>`;
    }
    function turn(index,amount) {
      if(!placed.has(wheelIds[index]) || !Number.isFinite(amount))return;
      chosen=index;
      const value=normalize(angles[index]+amount);
      if(linked())angles.fill(value);else angles[index]=value;
    }
    function update(host) {
      angles.forEach((angle,i)=>{
        host.querySelector(`[data-ct-rotor="${i}"]`)?.setAttribute("transform",`rotate(${angle})`);
        const node=host.querySelector(`[data-ct-wheel="${i}"]`);
        node?.setAttribute("aria-valuenow",String(Math.round(angle)));node?.classList.toggle("is-chosen",i===chosen);
      });
      const p=pins()[0];host.querySelector("[data-ct-rod]")?.setAttribute("transform",`translate(${p.x} ${p.y})`);
      const range=host.querySelector("[data-ct-angle]");
      if(range){range.value=String(Math.round(angles[chosen]));range.setAttribute("aria-label",`${linked()?"三個大輪":`第 ${chosen+1} 個大輪`}的角度`);}
      const caption=host.querySelector("[data-ct-caption]");if(caption)caption.textContent=linked()?"一起轉":`轉轉看 ${chosen+1}`;
    }
    return {sync,part,scene,controls,gesture,hasWheel,pins,turn,update,delta,
      isPart:id=>wheelIds.includes(id)||id===rodId,
      align(){if(wheelIds.every(id=>placed.has(id)))angles.fill(angles[0]);},
      choose(index){if(placed.has(wheelIds[index]))chosen=index;},
      trial(){if(placed.has(rodId)){detached=!detached;if(!detached)angles.fill(angles[0]);}},
      endTrial(){detached=false;if(placed.has(rodId))angles.fill(angles[0]);},
      pointerAngle(point,index){const x=point.x-centers[index],y=point.y-axleY;return Math.hypot(x,y)<18?null:Math.atan2(y,x)*180/Math.PI;},
      get chosen(){return chosen;},get angle(){return angles[chosen];},
    };
  }
  global.KidsCT273Mechanism=Object.freeze({create,wheelIds:Object.freeze(wheelIds),rodId});
})();
