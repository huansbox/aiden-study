import { PARTS, TRAVEL, createMechanism } from './breezy-mechanism.mjs';

const $=selector=>document.querySelector(selector), lab=$('#lab'), scene=$('#scene');
let mechanism=createMechanism(),selected=null,before=false,busy=false,interaction=null,flying=null,motion=null,epoch=0,suppressClickUntil=0;
const reduced=()=>$('#reduce-motion').checked || matchMedia('(prefers-reduced-motion: reduce)').matches;
const partById=id=>PARTS.find(part=>part.id===id);
const svg=(body,box='0 0 100 100')=>`<svg viewBox="${box}" aria-hidden="true">${body}</svg>`;
const hand=`<path d="M18 38V14c0-7 10-7 10 0v17-5c0-6 9-6 9 0v7-5c0-6 9-6 9 0v7c0-6 9-6 9 0v15c0 12-8 20-20 20-9 0-12-5-18-13L6 43c-4-7 3-11 8-5l8 10" fill="#fff1d5" stroke="#47757a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
const lock=svg('<rect x="25" y="43" width="50" height="43" rx="8" fill="none" stroke="currentColor" stroke-width="7"/><path d="M35 43V28a15 15 0 0 1 30 0v15" fill="none" stroke="currentColor" stroke-width="7"/>');
function frameArt(kind) {
  const b=partById(`${kind}-frame`).box;
  return `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="10" fill="none" stroke="#415a61" stroke-width="17"/><rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="10" fill="none" stroke="#b6c8c7" stroke-width="11"/><path d="M${b.x+12} ${b.y+15}V${b.y+b.height-15}M${b.x+b.width-12} ${b.y+15}V${b.y+b.height-15}" stroke="#637f85" stroke-width="6"/>${[b.x,b.x+b.width].flatMap(x=>[b.y+28,b.y+b.height-28].map(y=>`<circle cx="${x}" cy="${y}" r="4" fill="#f5f2db" stroke="#668089" stroke-width="2"/>`)).join('')}${kind==='window'?'<path d="M152 241H422" stroke="#b1c5c5" stroke-width="8"/>':''}`;
}
const glass=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#91b4b7" fill-opacity=".82" stroke="#cedad2" stroke-width="6"/><path d="M${x+17} ${y+10}l-10 ${h-20}m20-${h-20}-10 ${h-20}" fill="none" stroke="#d6e8df" stroke-opacity=".65" stroke-width="5"/>`;
const upperGlass=()=>glass(169,155,236,82);
const lowerGlass=()=>glass(169,247,236,82)+'<rect x="263" y="307" width="48" height="10" rx="5" fill="#e3e3d3" stroke="#69858a" stroke-width="3"/>';
const doorArt=()=>`<rect x="594" y="119" width="152" height="258" rx="5" fill="#377f9d" stroke="#c0cfcc" stroke-width="8"/>${glass(609,140,120,95)}<rect x="610" y="255" width="116" height="101" rx="5" fill="#2d718e" stroke="#5395ac" stroke-width="3"/><path d="M723 258v47" stroke="#183f56" stroke-width="15" stroke-linecap="round"/><path d="M725 258v47" stroke="#dbe1d1" stroke-width="8" stroke-linecap="round"/>`;
const art=part=>part.endsWith('-frame')?frameArt(partById(part).kind):part==='window-pane'?upperGlass()+lowerGlass():doorArt();
const partArt=part=>{const b=partById(part).box;return svg(art(part),`${b.x-14} ${b.y-14} ${b.width+28} ${b.height+28}`);};
const gesture=kind=>svg(`<rect x="13" y="11" width="65" height="68" rx="5" fill="#5a91a2" stroke="#9eafb0" stroke-width="7"/><g transform="translate(49 27) scale(.6)">${hand}</g><path d="${kind==='window'?'M102 13V71m-9-9 9 9 9-9m-18-40 9-9 9 9':'M91 44H143m-9-9 9 9-9 9m-34-18-9 9 9 9'}" fill="none" stroke="#39796b" stroke-width="5" stroke-linecap="round"/>`,kind==='window'?'0 0 126 90':'0 0 155 90');
const icons={frame:partArt('window-frame'),pane:partArt('window-pane'),play:gesture('window'),'window-play':gesture('window'),'door-play':gesture('door'),before:svg('<rect x="13" y="13" width="74" height="74" rx="9" fill="none" stroke="#789794" stroke-width="7" stroke-dasharray="9 7"/>')};
for(const el of document.querySelectorAll('[data-art]'))el.innerHTML=icons[el.dataset.art];
for(const el of document.querySelectorAll('[data-part]'))el.innerHTML=partArt(el.dataset.part)+'<span class="part-mark" aria-hidden="true"></span>';
const model=window.KidsBrickBreezyBlue;
$('#train-preview').innerHTML=model.steps.flatMap(step=>step.parts).sort((a,b)=>a.z-b.z).map(part=>part.svg).join('');

scene.innerHTML=`<defs><clipPath id="window-hole"><rect x="165" y="151" width="244" height="182"/></clipPath><clipPath id="door-hole"><rect x="590" y="115" width="160" height="266"/></clipPath></defs>
  <g aria-hidden="true"><ellipse cx="450" cy="434" rx="378" ry="16" fill="#24465018"/><rect x="57" y="68" width="786" height="334" rx="15" fill="#4386a2" stroke="#25647f" stroke-width="5"/><path d="M57 90l23-35h741l22 35Z" fill="#b6bdb6" stroke="#899d9c" stroke-width="4"/><path d="M60 356H841M60 369H841" stroke="#9ec3c6" stroke-width="5"/><path d="M88 402H815v18H88Z" fill="#33505b"/>
  ${[116,493,811].map(x=>`<path d="M${x} 92V351" stroke="#387791" stroke-width="3"/>`).join('')}
  ${Array.from({length:16},(_,i)=>`<ellipse cx="${91+i*46}" cy="67" rx="13" ry="5" fill="#d3d9cd" stroke="#8b9c9b" stroke-width="2"/>`).join('')}
  ${[135,190,709,764].map(x=>`<circle cx="${x}" cy="421" r="22" fill="#34464d"/><circle cx="${x}" cy="421" r="12" fill="#829596"/><circle cx="${x}" cy="421" r="5" fill="#d3d9ce"/>`).join('')}
  <rect x="159" y="146" width="255" height="192" rx="9" fill="#dce3ce"/><path d="M162 259h250v75H162Z" fill="#6e9b80"/><path d="M176 299H395" stroke="#a9c3a1" stroke-width="6"/><rect x="585" y="110" width="170" height="280" rx="7" fill="#dce3ce"/><path d="M587 346h165v42H587Z" fill="#a3aba0"/><path d="M591 349H751M591 365H751M591 381H751" stroke="#6c8a8a" stroke-width="4"/>
  <g id="empty-window"><rect x="148" y="135" width="278" height="214" rx="10" fill="#8faeaa70" stroke="#d7e4d4" stroke-width="5" stroke-dasharray="9 8"/></g><g id="empty-door"><rect x="574" y="99" width="192" height="298" rx="10" fill="#8faeaa70" stroke="#d7e4d4" stroke-width="5" stroke-dasharray="9 8"/></g></g>
  <g id="window-frame" aria-hidden="true">${frameArt('window')}</g><g id="door-frame" aria-hidden="true">${frameArt('door')}</g>
  <g id="window-pane" data-operate="window" class="moving" role="slider" aria-label="上下拖動車窗；方向鍵也可開合" aria-valuemin="0" aria-valuemax="100"><g clip-path="url(#window-hole)"><g id="window-slide">${lowerGlass()}</g>${upperGlass()}</g><rect class="focus-ring" x="148" y="135" width="278" height="214" rx="8"/><rect x="148" y="135" width="278" height="214" fill="transparent"/></g>
  <g id="door-pane" data-operate="door" class="moving" role="slider" aria-label="左右拖動車門；方向鍵也可開合" aria-valuemin="0" aria-valuemax="100"><g clip-path="url(#door-hole)"><g id="door-slide">${doorArt()}</g></g><rect class="focus-ring" x="574" y="99" width="192" height="298" rx="8"/><rect x="574" y="99" width="192" height="298" fill="transparent"/></g>
  <g id="breeze" aria-hidden="true" pointer-events="none" fill="none" stroke="#eaf0c2" stroke-width="5" stroke-linecap="round"><path d="M195 277c28-21 50 21 88 0s46-17 78-1M201 296c28-21 50 21 88 0s46-17 65 0"/></g><g id="guide"></g>`;

function announce(text){$('#announcer').textContent=text;}
function paint(){
  const {installed,open}=mechanism.state;
  for(const part of PARTS){
    const done=installed.has(part.id),node=$(`#${part.id}`),button=$(`[data-part="${part.id}"]`);
    node.style.display=done && !before?'':'none';button.disabled=before || busy || !mechanism.canInstall(part.id);
    button.classList.toggle('installed',done);button.setAttribute('aria-pressed',String(selected===part.id));
    button.setAttribute('aria-label',done?`${part.name}，已接好`:`拿起${part.name}${!part.frame && !installed.has(`${part.kind}-frame`)?'，先裝框':''}`);
    button.querySelector('.part-mark').innerHTML=done?'✓':!part.frame && !installed.has(`${part.kind}-frame`)?lock:'';
    if(!part.frame){node.setAttribute('tabindex',done && !before && !selected && !busy?'0':'-1');node.setAttribute('aria-disabled',String(!done || before || !!selected || busy));node.setAttribute('aria-orientation',part.kind==='window'?'vertical':'horizontal');node.setAttribute('aria-valuenow',String(Math.round(open[part.kind]*100)));}
  }
  for(const kind of ['window','door']){
    $(`#empty-${kind}`).style.display=installed.has(`${kind}-frame`) && !before?'none':'';
    const done=installed.has(`${kind}-pane`),control=$(`[data-control="${kind}"]`),range=$(`[data-range="${kind}"]`);
    control.hidden=!done;range.value=String(Math.round(open[kind]*100));range.disabled=before || !!selected || busy;
    for(const button of control.querySelectorAll('button'))button.disabled=range.disabled;
  }
  $('#window-slide').setAttribute('transform',`translate(0 ${-open.window*TRAVEL.window})`);
  $('#door-slide').setAttribute('transform',`translate(${-open.door*TRAVEL.door} 0)`);
  $('#breeze').style.opacity=installed.has('window-pane') && !before?String(open.window):'0';
  $('#part-count').textContent=`${installed.size} / 4`;
  const hasPane=installed.has('window-pane')||installed.has('door-pane'),step=hasPane?2:installed.size?1:0;
  for(const [i,id] of ['frame','pane','play'].entries()){const node=$(`#step-${id}`);node.classList.toggle('active',i===step);node.classList.toggle('done',i<step);if(i===step)node.setAttribute('aria-current','step');else node.removeAttribute('aria-current');}
  $('#play-controls').hidden=!hasPane;$('#place').disabled=!selected||busy||before;$('#place').hidden=installed.size===4;
  $('#place').textContent=selected && !partById(selected).frame?(partById(selected).kind==='window'?'↓ 嵌入':'→ 嵌入'):'↓ 接上';$('#cancel').hidden=!selected||busy;
  $('#compare').setAttribute('aria-pressed',String(before));$('#compare').setAttribute('aria-label',before?'回到目前半成品':'回看尚未安裝門窗的車身');
  $('#view-caption').textContent=before?'開始前':'車側特寫';paintGuide();
}
function paintGuide(){
  const node=$('#guide'),picture=$('#picture-guide');
  if(before){node.innerHTML='';picture.innerHTML=icons.before+'<span>回看</span>';picture.setAttribute('aria-label','尚未裝上四件門窗的車身');return;}
  if(selected){
    const part=partById(selected),b=part.box,vertical=part.kind==='window',arrow=part.frame?`M${b.x+b.width/2} ${b.y-54}v38m-10-10 10 10 10-10`:vertical?`M${b.x+b.width+38} ${b.y-25}v80m-10-10 10 10 10-10`:`M${b.x-66} ${b.y+b.height/2}h48m-10-10 10 10-10 10`;
    node.innerHTML=`<g class="ghost">${art(selected)}</g><g data-target role="button" tabindex="${busy?-1:0}" aria-disabled="${busy}" aria-label="${part.frame?'接上':'嵌入'}${part.name}"><rect class="join-target" x="${b.x-8}" y="${b.y-8}" width="${b.width+16}" height="${b.height+16}" rx="12"/><path class="guide-arrow" d="${arrow}"/></g>`;
    picture.innerHTML=svg(`<g transform="translate(10 5) scale(.65)">${hand}</g><g transform="translate(92 10)"><rect width="54" height="58" rx="5" fill="none" stroke="#8bacae" stroke-width="8"/>${part.frame?'':'<path d="M6 6h42v45H6Z" fill="#4e90a8"/>'}</g><path d="M165 38h30m-8-8 8 8-8 8" stroke="#c9873b" stroke-width="4" fill="none"/><rect x="216" y="9" width="62" height="60" rx="5" fill="none" stroke="#c9873b" stroke-width="3" stroke-dasharray="7 6"/><path d="${part.frame?'M247 20v35m-9-9 9 9 9-9':vertical?'M292 7v54m-8-8 8 8 8-8':'M229 39h39m-8-8 8 8-8 8'}" stroke="#c9873b" stroke-width="4" fill="none"/>`,'0 0 320 80')+`<span>${part.frame?'接上':'滑入'}</span>`;
    picture.setAttribute('aria-label',`${part.name}：${part.frame?'對準框的接點':vertical?'從上方滑入窗框軌道':'由左側滑入門框軌道'}；可拖曳或點接點`);return;
  }
  node.innerHTML='';
  const installed=mechanism.state.installed,kind=installed.has('window-pane')?'window':installed.has('door-pane')?'door':null;
  picture.innerHTML=kind?gesture(kind)+'<span>拉拉看</span>':icons.frame+icons.pane+'<span>拿起・嵌入</span>';
  picture.setAttribute('aria-label',kind?kind==='window'?'上下拖動已裝好的窗扇，觀察開口':'左右拖動已裝好的門扇，觀察開口':'先拿起窗框或門框，裝好後再拿對應門窗');
}
function select(id){if(busy||before||!mechanism.canInstall(id))return;selected=id;paint();}
function screenBox(id){const b=partById(id).box,m=scene.getScreenCTM(),p=new DOMPoint(b.x,b.y).matrixTransform(m);return{x:p.x,y:p.y,width:b.width*m.a,height:b.height*m.d,scale:m.a};}
function ghost(id,box){if(!flying){flying=document.createElement('div');flying.className='flying-part';flying.setAttribute('aria-hidden','true');document.body.append(flying);}const b=partById(id).box;flying.innerHTML=svg(art(id),`${b.x} ${b.y} ${b.width} ${b.height}`);Object.assign(flying.style,{left:'0',top:'0',width:`${box.width}px`,height:`${box.height}px`});return flying;}
function cancel(){epoch++;const old=interaction;interaction=null;if(old&&lab.hasPointerCapture(old.id))lab.releasePointerCapture(old.id);motion?.cancel();motion=null;flying?.remove();flying=null;busy=false;}
async function install(id,from){
  if(busy||before||selected!==id||!mechanism.canInstall(id))return;
  busy=true;const token=++epoch,target=screenBox(id),part=partById(id);paint();
  if(!reduced()){
    const source=$(`[data-part="${id}"]`).getBoundingClientRect(),start=from||{x:source.x+(source.width-target.width)/2,y:source.y+(source.height-target.height)/2};
    const entry=part.frame?{x:target.x,y:target.y-15}:part.kind==='window'?{x:target.x,y:target.y-75*target.scale}:{x:target.x-70*target.scale,y:target.y};
    motion=ghost(id,target).animate([{transform:`translate(${start.x}px,${start.y}px)`},{transform:`translate(${entry.x}px,${entry.y}px)`,offset:.6},{transform:`translate(${target.x}px,${target.y}px)`}],{duration:from?320:560,easing:'cubic-bezier(.2,.65,.3,1)',fill:'forwards'});
    try{await motion.finished;}catch{return;}
  }
  if(epoch!==token)return;mechanism.install(id);flying?.remove();flying=null;motion=null;busy=false;selected=null;paint();announce(`${part.name}接好了${part.frame?'':'，可以拉拉看'}`);
  (part.frame?$(`[data-part="${part.kind}-pane"]`):$(`[data-range="${part.kind}"]`))?.focus({preventScroll:true});
}
function move(kind,value){if(before||busy||selected)return;mechanism.move(kind,value);paint();}
lab.addEventListener('click',event=>{
  if(Date.now()<suppressClickUntil)return;
  const part=event.target.closest('[data-part]');if(part&&!part.disabled){if(event.detail===0)select(part.dataset.part);return;}
  if(event.target.closest('[data-target]')&&selected)void install(selected);
});
$('#place').addEventListener('click',()=>{if(selected)void install(selected);});
$('#cancel').addEventListener('click',()=>{const old=selected;cancel();selected=null;paint();$(`[data-part="${old}"]`)?.focus();});
$('#reset').addEventListener('click',()=>{cancel();mechanism=createMechanism();selected=null;before=false;paint();announce('已全部拆下，可以重新試拼。');});
$('#compare').addEventListener('click',()=>{cancel();selected=null;before=!before;paint();});
for(const button of document.querySelectorAll('[data-move]'))button.addEventListener('click',()=>{const[kind,direction]=button.dataset.move.split(':');move(kind,mechanism.state.open[kind]+Number(direction)*.25);});
for(const range of document.querySelectorAll('[data-range]'))range.addEventListener('input',()=>move(range.dataset.range,Number(range.value)/100));
for(const button of document.querySelectorAll('[data-remove]'))button.addEventListener('click',()=>{if(busy||before||selected)return;cancel();const kind=button.dataset.remove;mechanism.removePane(kind);paint();$(`[data-part="${kind}-pane"]`).focus({preventScroll:true});announce(`已拆下${kind==='window'?'窗扇':'門扇'}，框留在車身上。`);});
lab.addEventListener('keydown',event=>{
  if(event.key==='Escape'){const old=selected;cancel();selected=null;paint();if(old)$(`[data-part="${old}"]`).focus();return;}
  if(event.target.closest('[data-target]')&&['Enter',' '].includes(event.key)){event.preventDefault();if(selected)void install(selected);return;}
  const node=event.target.closest('[data-operate]');if(!node)return;const kind=node.dataset.operate,value=mechanism.state.open[kind],delta=kind==='window'?{ArrowUp:.1,ArrowDown:-.1}:{ArrowLeft:.1,ArrowRight:-.1};
  if(delta[event.key]!==undefined||['Home','End'].includes(event.key)){event.preventDefault();move(kind,event.key==='Home'?0:event.key==='End'?1:value+delta[event.key]);}
});
lab.addEventListener('pointerdown',event=>{
  if(event.button!==0||event.isPrimary===false||busy||before||interaction)return;
  const part=event.target.closest('[data-part]');
  if(part&&!part.disabled){select(part.dataset.part);interaction={kind:'part',id:event.pointerId,part:part.dataset.part,x:event.clientX,y:event.clientY,moved:false};lab.setPointerCapture(event.pointerId);return;}
  const node=event.target.closest('[data-operate]');if(node&&!selected){const kind=node.dataset.operate;interaction={kind:'operate',id:event.pointerId,unit:kind,x:event.clientX,y:event.clientY,value:mechanism.state.open[kind],scale:scene.getScreenCTM().a};lab.setPointerCapture(event.pointerId);}
});
lab.addEventListener('pointermove',event=>{
  if(!interaction||interaction.id!==event.pointerId)return;
  const active=interaction;
  if(active.kind==='operate'){event.preventDefault();const distance=active.unit==='window'?active.y-event.clientY:active.x-event.clientX;move(active.unit,active.value+distance/(active.scale*TRAVEL[active.unit]));return;}
  if(!active.moved&&Math.hypot(event.clientX-active.x,event.clientY-active.y)<8)return;
  event.preventDefault();active.moved=true;const box=screenBox(active.part),margin=20;
  active.near=event.clientX>=box.x-margin&&event.clientX<=box.x+box.width+margin&&event.clientY>=box.y-margin&&event.clientY<=box.y+box.height+margin;
  active.position=active.near?{x:box.x,y:box.y-12}:{x:event.clientX-box.width/2,y:event.clientY-box.height/2};
  ghost(active.part,box).style.transform=`translate(${active.position.x}px,${active.position.y}px)`;$('.join-target')?.classList.toggle('near',active.near);
});
lab.addEventListener('pointerup',event=>{
  if(!interaction||interaction.id!==event.pointerId)return;const old=interaction;interaction=null;if(lab.hasPointerCapture(event.pointerId))lab.releasePointerCapture(event.pointerId);
  if(old.kind==='operate'){suppressClickUntil=Date.now()+350;return;}if(!old.moved)return;
  suppressClickUntil=Date.now()+350;if(old.near)void install(old.part,old.position);else{cancel();selected=null;paint();announce('零件放回托盤，再試一次。');}
});
for(const name of ['pointercancel','lostpointercapture'])lab.addEventListener(name,event=>{if(interaction?.id===event.pointerId){cancel();selected=null;paint();}});
for(const name of ['blur','resize','pagehide'])window.addEventListener(name,()=>{if(interaction||busy){cancel();selected=null;paint();}});
paint();
