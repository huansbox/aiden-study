import { CENTERS, AXLE_Y, CRANK_RADIUS, createMechanism, angularDelta } from './ct273-mechanism.mjs';

const $ = selector => document.querySelector(selector);
const lab = $('#lab'), scene = $('#scene');
let mechanism = createMechanism(), selected = null, chosenWheel = 0;
let interaction = null, flying = null, motion = null, epoch = 0, busy = false, suppressClickUntil = 0;
const reduced = () => $('#reduce-motion').checked || matchMedia('(prefers-reduced-motion: reduce)').matches;
const wheelArt = (radius = 80) => `<g transform="scale(${radius / 80})"><circle r="80" fill="#1c2429"/><circle r="72" fill="#515d61"/><circle r="62" fill="#263237"/><circle r="65" fill="none" stroke="#a0aaa9" stroke-width="4"/>${Array.from({length:8},(_,i)=>`<path d="M0 0V-57" transform="rotate(${i*45})" stroke="#849293" stroke-width="7"/>`).join('')}<circle r="19" fill="#a8b4b2" stroke="#d5dbd5" stroke-width="3"/><circle r="8" fill="#40514f"/><circle cx="${CRANK_RADIUS}" r="10" fill="#d4a346" stroke="#f4d68c" stroke-width="3"/></g>`;
const rodArt = () => `<path d="M0 0H330" stroke="#526268" stroke-width="24" stroke-linecap="round"/><path d="M0 -3H330" stroke="#c0cbc7" stroke-width="13" stroke-linecap="round"/>${[0,165,330].map(x=>`<circle cx="${x}" r="17" fill="#a7b6b2" stroke="#e6eae0" stroke-width="3"/><circle cx="${x}" r="8" fill="#435652"/>`).join('')}`;
const svg = (contents, box = '0 0 100 100') => `<svg viewBox="${box}" aria-hidden="true">${contents}</svg>`;
const partArt = part => part === 'rod' ? svg(`<g transform="translate(22 30)">${rodArt()}</g>`,'0 0 374 60') : svg(`<g transform="translate(50 50)">${wheelArt(44)}</g>`);
const hand = `<path d="M14 36V16c0-7 10-7 10 0v14-4c0-6 9-6 9 0v5-2c0-6 9-6 9 0v6-1c0-6 9-5 9 1v13c0 12-7 20-18 20-8 0-11-4-16-11L5 41c-4-7 3-11 8-5l7 9" fill="#fff5df" stroke="#60786b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
const curve = `<path d="M15 51A33 33 0 1 1 71 19M58 16l15 5 4-15" fill="none" stroke="#27766a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
const icons = {
  wheels: svg([20,50,80].map(x=>`<g transform="translate(${x} 45)">${wheelArt(18)}</g>`).join(''),'0 0 100 90'),
  rod: partArt('rod'),
  turn: svg(`<g transform="translate(50 44)">${wheelArt(24)}</g>${curve}`,'0 0 100 90'),
};
for (const node of document.querySelectorAll('[data-art]')) node.innerHTML = icons[node.dataset.art];
for (const button of document.querySelectorAll('[data-part]')) button.innerHTML = partArt(button.dataset.part) + '<span class="part-mark" aria-hidden="true"></span>';
$('#wheel-choice').innerHTML = CENTERS.map((_,i)=>`<button data-choose="${i}" aria-label="選第 ${i+1} 個大輪轉動" aria-pressed="false">${partArt(i)}</button>`).join('');

scene.innerHTML = `<defs><linearGradient id="frame-fill" x2="0" y2="1"><stop stop-color="#829088"/><stop offset="1" stop-color="#46534f"/></linearGradient></defs>
  <ellipse cx="450" cy="326" rx="360" ry="14" fill="#233b3310"/>
  <g aria-hidden="true"><path d="M62 329H841" stroke="#8c958a" stroke-width="9" stroke-linecap="round"/><path d="M67 321H836" stroke="#ccd1c1" stroke-width="5"/>
  ${[112,150,776].map((x,i)=>`<g transform="translate(${x} ${i===2?283:292})">${wheelArt(i===2?35:26)}</g>`).join('')}
  <path d="M83 115H820V173H83Z" fill="url(#frame-fill)" stroke="#44544d" stroke-width="3"/>
  <path d="M83 115l19-18h701l17 18" fill="#a2ada1" stroke="#728074" stroke-width="3"/>
  ${Array.from({length:15},(_,i)=>`<ellipse cx="${122+i*46}" cy="102" rx="13" ry="6" fill="#c4ccbd" stroke="#7c8f7a" stroke-width="2"/>`).join('')}
  <path d="M82 149H820" stroke="#b6c0b1" stroke-width="3"/><path d="M113 174V252M789 174V245" stroke="#647467" stroke-width="19"/>
  <rect x="97" y="182" width="68" height="46" rx="8" fill="#435250"/><path d="M105 192H157M105 201H157M105 210H157" stroke="#7a8b80" stroke-width="4"/>
  <rect x="697" y="126" width="96" height="33" rx="5" fill="#283b36" stroke="#bda35e" stroke-width="2"/><text x="745" y="149" font-size="18" font-family="system-ui" font-weight="700" text-anchor="middle" fill="#e4d29a">CT273</text></g>
  ${CENTERS.map((x,i)=>`<g data-socket="${i}" transform="translate(${x} ${AXLE_Y})" aria-hidden="true"><path d="M-16 -63V4H16V-63" fill="#687b6c"/><circle class="socket" r="76"/><circle class="axle" r="15"/><path d="M-7 0H7M0 -7V7" stroke="#f4f6e8" stroke-width="4"/></g>`).join('')}
  ${CENTERS.map((x,i)=>`<g class="wheel" data-wheel="${i}" transform="translate(${x} ${AXLE_Y})" role="slider" aria-label="第 ${i+1} 個大輪，方向鍵轉動" aria-valuemin="0" aria-valuemax="360"><circle class="wheel-focus" r="87"/><g data-rotor="${i}">${wheelArt()}</g></g>`).join('')}
  <g id="linkage" aria-label="連起三輪的連桿">${rodArt()}${[0,165,330].map(x=>`<circle cx="${x}" r="5" fill="#e0b663"/>`).join('')}</g><g id="guide"></g>`;

function announce(text) { $('#announcer').textContent = text; }
function paint() {
  const {installed, linked, angles} = mechanism.state, count = installed.filter(Boolean).length;
  for (let i=0;i<3;i++) {
    const wheel = $(`[data-wheel="${i}"]`);
    wheel.style.display = installed[i] ? '' : 'none';
    wheel.setAttribute('tabindex',installed[i] && selected === null ? '0':'-1');
    wheel.setAttribute('aria-disabled',String(selected !== null || busy));
    wheel.setAttribute('aria-valuenow',String(Math.round(angles[i])));
    wheel.setAttribute('aria-valuetext',`${Math.round(angles[i])} 度${linked?'，三輪一起轉':''}`);
    wheel.classList.toggle('selected-wheel', installed[i] && chosenWheel===i && selected===null);
    $(`[data-rotor="${i}"]`).setAttribute('transform',`rotate(${angles[i]})`);
    $(`[data-socket="${i}"]`).style.display = installed[i]?'none':'';
    const choice = $(`[data-choose="${i}"]`);
    choice.disabled = !installed[i] || selected!==null || busy;
    choice.setAttribute('aria-pressed',String(chosenWheel===i));
  }
  const pin = mechanism.pins()[0];
  $('#linkage').style.display = linked?'':'none';
  $('#linkage').setAttribute('transform',`translate(${pin.x} ${pin.y})`);
  $('#coupling-state').textContent = linked ? '一起轉' : count===3 ? '各自轉' : `${count} / 3`;
  $('#part-count').textContent = `${count+Number(linked)} / 4`;
  const step = linked?2:count===3?1:0;
  for (const [i,id] of ['wheels','rod','turn'].entries()) {
    const node=$(`#step-${id}`); node.classList.toggle('active',i===step);node.classList.toggle('done',i<step);
    if(i===step)node.setAttribute('aria-current','step');else node.removeAttribute('aria-current');
    node.querySelector('.step-number').textContent=i<step?'✓':String(i+1);
  }
  for (const button of document.querySelectorAll('[data-part]')) {
    const part=button.dataset.part, done=part==='rod'?linked:installed[Number(part)];
    button.disabled=done || busy || (part==='rod' && count<3);
    button.classList.toggle('installed',done);
    button.setAttribute('aria-pressed',String(selected===part));
    button.querySelector('.part-mark').textContent=done?'✓':part==='rod'?'':String(Number(part)+1);
  }
  $('#place').disabled=selected===null || busy;
  $('#place').hidden=linked;$('#cancel').hidden=selected===null || busy;$('#detach').hidden=!linked;
  $('#turn-controls').hidden=count===0;
  $('#turn-caption').textContent=linked?'一起轉':'轉轉看';
  $('#angle').disabled=selected!==null || busy;
  $('#angle').value=String(Math.round(angles[chosenWheel]));
  $('#angle').setAttribute('aria-label',linked?'三個大輪的角度':`第 ${chosenWheel+1} 個大輪的角度`);
  $('#backward').disabled=$('#forward').disabled=selected!==null || busy;
  $('#wheel-choice').hidden=linked;
  paintGuide();
}
function paintGuide() {
  const guide=$('#guide'), picture=$('#picture-guide');
  if(selected!==null) {
    const target=destination(selected);
    guide.innerHTML=selected==='rod'
      ? `<g data-target role="button" tabindex="0" aria-label="將連桿接到三個輪子的接點"><rect class="join-target" x="${target.x}" y="${target.y}" width="${target.width}" height="${target.height}" rx="20"/>${mechanism.pins().map(p=>`<circle cx="${p.x}" cy="${p.y}" r="15" fill="none" stroke="#bd8c18" stroke-width="4"/>`).join('')}<path class="target-arrow" d="M450 ${target.y-47}v34m-10-10 10 10 10-10"/></g>`
      : `<g data-target role="button" tabindex="0" aria-label="將第 ${Number(selected)+1} 個大輪接到輪軸"><circle class="join-target" cx="${CENTERS[Number(selected)]}" cy="${AXLE_Y}" r="84"/><path class="target-arrow" d="M${CENTERS[Number(selected)]} 108v33m-10-10 10 10 10-10"/></g>`;
    picture.innerHTML=svg(`<g transform="translate(20 14) scale(.58)">${hand}</g><g transform="translate(93 38)">${selected==='rod'?`<g transform="scale(.23) translate(-165 0)">${rodArt()}</g>`:wheelArt(24)}</g><path d="M135 38h39m-10-9 10 9-10 9" stroke="#b98a25" fill="none" stroke-width="4"/><circle cx="198" cy="38" r="22" fill="none" stroke="#b98a25" stroke-width="3" stroke-dasharray="4 4"/>`,'0 0 230 75')+'<span>接上</span>';
    picture.setAttribute('aria-label','把選好的零件拖到金色接點，或點接點接上');
  } else {
    guide.innerHTML='';
    const count=mechanism.state.installed.filter(Boolean).length;
    if(mechanism.state.linked || count===3) {
      picture.innerHTML=svg(`<g transform="translate(2 1)">${curve}</g><g transform="translate(50 43)">${wheelArt(23)}</g><g transform="translate(60 22) scale(.6)">${hand}</g>${mechanism.state.linked?`<path d="M109 43h26m-8-7 8 7-8 7" fill="none" stroke="#568075" stroke-width="4"/>${[162,200].map(x=>`<g transform="translate(${x} 43)">${wheelArt(18)}</g>`).join('')}`:''}`,'0 0 230 75')+`<span>${mechanism.state.linked?'一起轉':'轉轉看'}</span>`;
      picture.setAttribute('aria-label',mechanism.state.linked?'沿著任一大輪轉動，三輪與連桿會一起動':'三個輪子可以各自轉動，再拿起連桿接上');
    } else {
      picture.innerHTML=svg(`<g transform="translate(26 38)">${wheelArt(24)}</g><g transform="translate(40 14) scale(.6)">${hand}</g><path d="M108 38h47m-9-9 9 9-9 9" stroke="#6e8a76" fill="none" stroke-width="4"/><circle cx="198" cy="38" r="25" fill="none" stroke="#b98a25" stroke-width="3" stroke-dasharray="5 5"/><path d="M190 38h16m-8-8v16" stroke="#b98a25" stroke-width="4"/>`,'0 0 230 75')+'<span>拿起・接上</span>';
      picture.setAttribute('aria-label','從零件盤拿起大輪，接到輪軸上');
    }
  }
}
function destination(part) {
  if(part==='rod'){const p=mechanism.pins()[0];return {x:p.x-24,y:p.y-26,width:378,height:52};}
  return {x:CENTERS[Number(part)]-80,y:AXLE_Y-80,width:160,height:160};
}
function screenBox(part) {
  const box=destination(part), matrix=scene.getScreenCTM();
  const p=new DOMPoint(box.x,box.y).matrixTransform(matrix);
  return {x:p.x,y:p.y,width:box.width*matrix.a,height:box.height*matrix.d};
}
function select(part) {
  const {installed,linked}=mechanism.state;
  if(busy || (part==='rod' ? linked || !installed.every(Boolean) : installed[Number(part)]))return;
  selected=part;
  if(part==='rod')mechanism.align();
  paint();
}
function ghost(part,box) {
  if(!flying){flying=document.createElement('div');flying.className='flying-part';flying.setAttribute('aria-hidden','true');document.body.append(flying);}
  flying.innerHTML=part==='rod'?svg(`<g transform="translate(24 26)">${rodArt()}</g>`,'0 0 378 52'):svg(`<g transform="translate(80 80)">${wheelArt()}</g>`,'0 0 160 160');
  Object.assign(flying.style,{left:'0',top:'0',width:`${box.width}px`,height:`${box.height}px`});
  return flying;
}
function cancel() {
  epoch++;const old=interaction;interaction=null;
  if(old && lab.hasPointerCapture(old.id))lab.releasePointerCapture(old.id);
  motion?.cancel();motion=null;flying?.remove();flying=null;busy=false;
}
async function install(part,from) {
  if(busy || selected!==part)return;
  busy=true;const token=++epoch,target=screenBox(part);
  paint();
  if(!reduced()) {
    const source=$(`[data-part="${part}"]`).getBoundingClientRect();
    const start=from || {x:source.x+(source.width-target.width)/2,y:source.y+(source.height-target.height)/2};
    const node=ghost(part,target);
    motion=node.animate([{transform:`translate(${start.x}px,${start.y}px)`},{transform:`translate(${target.x}px,${target.y-12}px)`,offset:.78},{transform:`translate(${target.x}px,${target.y}px)`}],{duration:from?220:450,easing:'cubic-bezier(.2,.65,.3,1)',fill:'forwards'});
    try{await motion.finished;}catch{return;}
  }
  if(token!==epoch)return;
  if(part==='rod')mechanism.connect();else{mechanism.install(Number(part));chosenWheel=Number(part);}
  flying?.remove();flying=null;motion=null;busy=false;selected=null;paint();
  announce(part==='rod'?'連桿接好了，轉一個輪子，三個會一起轉':`第 ${Number(part)+1} 個大輪接好了`);
  (part==='rod'?$('#angle'):document.querySelector('[data-part]:not(:disabled)'))?.focus({preventScroll:true});
}
function point(event) {return new DOMPoint(event.clientX,event.clientY).matrixTransform(scene.getScreenCTM().inverse());}
function pointerAngle(event,index) {const p=point(event),dx=p.x-CENTERS[index],dy=p.y-AXLE_Y;return Math.hypot(dx,dy)<18?null:Math.atan2(dy,dx)*180/Math.PI;}
function turn(index,delta) {if(busy || selected!==null)return;chosenWheel=index;mechanism.turn(index,delta);paint();}

lab.addEventListener('click',event=>{
  if(Date.now()<suppressClickUntil)return;
  const part=event.target.closest('[data-part]');
  // Pointer selection happens on pointerdown. Its later click must not pick a
  // cancelled piece back up (for example Esc while the pointer is still held).
  if(part && !part.disabled){if(event.detail===0)select(part.dataset.part);return;}
  if(event.target.closest('[data-target]')){if(selected!==null)void install(selected);return;}
  const choose=event.target.closest('[data-choose]');
  if(choose && !choose.disabled){chosenWheel=Number(choose.dataset.choose);paint();return;}
  const wheel=event.target.closest('[data-wheel]');
  if(wheel && selected===null && !busy){chosenWheel=Number(wheel.dataset.wheel);paint();}
});
$('#place').addEventListener('click',()=>{if(selected!==null)void install(selected);});
$('#cancel').addEventListener('click',()=>{const old=selected;cancel();selected=null;paint();$(`[data-part="${old}"]`)?.focus();});
$('#reset').addEventListener('click',()=>{cancel();mechanism=createMechanism();selected=null;chosenWheel=0;paint();announce('已全部拆下，可以重新拼。');});
$('#detach').addEventListener('click',()=>{cancel();mechanism.disconnect();selected=null;paint();announce('連桿拆下了，輪子可以各自轉動。');$('[data-part="rod"]').focus({preventScroll:true});});
$('#backward').addEventListener('click',()=>turn(chosenWheel,-90));
$('#forward').addEventListener('click',()=>turn(chosenWheel,90));
$('#angle').addEventListener('input',event=>turn(chosenWheel,Number(event.target.value)-mechanism.state.angles[chosenWheel]));
lab.addEventListener('keydown',event=>{
  if(event.key==='Escape'){const old=selected;cancel();selected=null;paint();if(old!==null)$(`[data-part="${old}"]`)?.focus();return;}
  if(event.target.closest('[data-target]') && ['Enter',' '].includes(event.key)){event.preventDefault();if(selected!==null)void install(selected);return;}
  const wheel=event.target.closest('[data-wheel]');
  if(!wheel || selected!==null || busy)return;
  const index=Number(wheel.dataset.wheel);
  const delta={ArrowRight:15,ArrowUp:15,ArrowLeft:-15,ArrowDown:-15,Home:-mechanism.state.angles[index],End:359-mechanism.state.angles[index]}[event.key];
  if(delta!==undefined){event.preventDefault();turn(index,delta);}
});
lab.addEventListener('pointerdown',event=>{
  if(event.button!==0 || event.isPrimary===false || busy || interaction)return;
  const part=event.target.closest('[data-part]');
  if(part && !part.disabled){select(part.dataset.part);interaction={kind:'part',id:event.pointerId,part:part.dataset.part,x:event.clientX,y:event.clientY,moved:false};lab.setPointerCapture(event.pointerId);return;}
  const wheel=event.target.closest('[data-wheel]');
  if(wheel && selected===null){
    chosenWheel=Number(wheel.dataset.wheel);interaction={kind:'turn',id:event.pointerId,index:chosenWheel,last:pointerAngle(event,chosenWheel)};
    lab.setPointerCapture(event.pointerId);paint();
  }
});
lab.addEventListener('pointermove',event=>{
  if(!interaction || interaction.id!==event.pointerId)return;
  if(interaction.kind==='turn'){
    event.preventDefault();const angle=pointerAngle(event,interaction.index);
    if(angle!==null && interaction.last!==null)turn(interaction.index,angularDelta(interaction.last,angle));
    interaction.last=angle;return;
  }
  if(!interaction.moved && Math.hypot(event.clientX-interaction.x,event.clientY-interaction.y)<8)return;
  event.preventDefault();interaction.moved=true;
  const box=screenBox(interaction.part),margin=18;
  interaction.near=event.clientX>=box.x-margin && event.clientX<=box.x+box.width+margin && event.clientY>=box.y-margin && event.clientY<=box.y+box.height+margin;
  interaction.position=interaction.near?{x:box.x,y:box.y-12}:{x:event.clientX-box.width/2,y:event.clientY-box.height/2};
  ghost(interaction.part,box).style.transform=`translate(${interaction.position.x}px,${interaction.position.y}px)`;
  $('.join-target')?.classList.toggle('near',interaction.near);
});
lab.addEventListener('pointerup',event=>{
  if(!interaction || interaction.id!==event.pointerId)return;
  const old=interaction;interaction=null;if(lab.hasPointerCapture(event.pointerId))lab.releasePointerCapture(event.pointerId);
  if(old.kind==='turn'){suppressClickUntil=Date.now()+350;return;}
  if(!old.moved)return;
  suppressClickUntil=Date.now()+350;
  if(old.near)void install(old.part,old.position);
  else{cancel();selected=null;paint();announce('零件放回托盤，再試一次。');}
});
for(const name of ['pointercancel','lostpointercapture'])lab.addEventListener(name,event=>{if(interaction?.id===event.pointerId){cancel();selected=null;paint();}});
for(const name of ['blur','resize','pagehide'])window.addEventListener(name,()=>{if(interaction || busy){cancel();selected=null;paint();}});
paint();
