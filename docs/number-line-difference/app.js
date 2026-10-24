import {act,restore,current,label,knownFor,nextSteps,expectedPoints,suggestedTarget} from './lesson-core.js?v=20261024-direct-touch-v2';
import {openPlatform} from './platform.js?v=20261024-direct-touch-v2';
import {diagramLayout} from './diagram-layout.js?v=20261024-direct-touch-v2';

const root=document.getElementById('app'),preview=new URLSearchParams(location.search).get('preview')==='1';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let problems,state,log,platform,notice='',reviewIndex=null,claiming=false,rewardError='',writable=true;
let suppressPointerClick=false;
// 觸控拖曳後，瀏覽器不一定再派 click。直接處理 pointerup，並攔下同一次操作衍生的 click。
root.addEventListener('pointerdown',()=>{suppressPointerClick=false;},true);
root.addEventListener('click',e=>{if(suppressPointerClick&&e.detail>0){suppressPointerClick=false;e.preventDefault();e.stopImmediatePropagation();}},true);
const names={beginner:'初階',intermediate:'中階',advanced:'挑戰'};
function save(){
  const ok=writable&&platform.save({version:2,log});
  document.getElementById('save-status').textContent=preview?'家長試玩：離開後不保存，也不領拼裝包。':ok?'每一步已保存在這台裝置，可離開後續做。':'這台裝置無法儲存進度；請先留在此頁，讓家長協助。';
}
function written(p,q){const known=knownFor(p,q);return q.steps.map(s=>`<div class="written-equation">${label(p,s.result)} ＝ ${label(p,s.long)} <strong>${known[s.long]}</strong> − ${label(p,s.short)} <strong>${known[s.short]}</strong> ＝ <strong>${s.value}</strong></div>`).join('');}
function hint(p,q){
  if(q.errors<2)return '';
  if(['target-start','target-end'].includes(q.stage)){
    const target=suggestedTarget(p,q);
    if(!target&&q.point)return `先再點 ${label(p,q.point)} 取消。這一步可先求 ${label(p,nextSteps(p,q)[0].result)}，再選它的兩端。`;
    if(q.point)return `已選 ${label(p,q.point)}，再點 ${label(p,[...target].find(id=>id!==q.point))}，先求 ${label(p,target)}。`;
    return `這一步可先求 ${label(p,target)}；點 ${[...target].map(id=>label(p,id)).join('、')} 兩端。`;
  }
  if(['given-start','given-end'].includes(q.stage)){
    const points=expectedPoints(p,q);
    return `找 ${points.map(id=>p.points.find(point=>point.id===id).label).join('、')}，點這一步要畫的兩端。`;
  }
  if(q.stage==='given-value'){const g=p.givens[q.givenIndex];return `題目寫著 ${label(p,g.segment)}＝${g.length}，把數字片 ${g.length} 放進這條弧線的框。`;}
  const step=nextSteps(p,q).find(s=>s.result===q.target);
  if(q.stage==='long')return `點圖上的 ${label(p,step.long)}；它是這一步的長段。`;
  if(q.stage==='short')return `點圖上的 ${label(p,step.short)}；它包含在長段裡，並共用一個端點。`;
  if(q.stage==='answer')return `${knownFor(p,q)[q.long]} − ${knownFor(p,q)[q.short]}，拿掉短段後剩多少？`;
  if(q.stage==='result-place')return `把剛算出的數字片 ${q.pending.value}，放回 ${label(p,q.target)} 的紅框。`;
  return '';
}
function instruction(p,q){
  if(q.stage==='given-start')return `畫已知的 ${label(p,p.givens[q.givenIndex].segment)}：先點一端。`;
  if(q.stage==='given-end')return '再點另一端，畫出這一段弧線。';
  if(q.stage==='given-value')return `把數字片拖到 ${label(p,p.givens[q.givenIndex].segment)} 的空格。也可先點數字，再點框。`;
  if(q.stage==='target-start'){
    const specified=p.level==='beginner'||p.preferredRoute?nextSteps(p,q)[0]:null;
    return specified?`這一步先求 ${label(p,specified.result)}：點它的兩端。`:'這一步想求哪一段？先點它的兩端。';
  }
  if(q.stage==='target-end')return '再點另一端，標出這一步要算的段。重點同一端可取消。';
  if(q.stage==='long')return `要算 ${label(p,q.target)}。點圖上的長段，填第一個亮框。`;
  if(q.stage==='short')return '再點圖上的短段，填第二個亮框。';
  if(q.stage==='answer')return '自己算一算，用數字鍵盤填結果。';
  if(q.stage==='result-place')return `把結果數字片拖回 ${label(p,q.target)} 紅框；不用再點端點。`;
  return `${label(p,p.target)}＝${p.answer}，這一題的圖和算式都完成了。`;
}
function diagram(p,q,interactive){
  const layout=diagramLayout(p),{width,height,baseline,positions:x}=layout;
  const pointsActive=interactive&&['given-start','given-end','target-start','target-end'].includes(q.stage);
  const targetHint=['target-start','target-end'].includes(q.stage)?suggestedTarget(p,q):null;
  const expected=q.stage.startsWith('target')?(targetHint?[...targetHint]:q.point?[q.point]:[]):expectedPoints(p,q);
  const hinted=q.errors>=2?expected:[],step=nextSteps(p,q).find(s=>s.result===q.target);
  const segmentHint=q.errors>=2?(q.stage==='long'?step?.long:q.stage==='short'?step?.short:null):null;
  const slot=(s,cx,cy,target=false)=>`<g class="number-slot ${target?'target-slot':''} ${q.selectedChip?'ready':''}" data-slot="${s}" role="button" tabindex="0" aria-label="${label(p,s)} 的${target?'結果':'長度'}空格"><rect x="${cx-32}" y="${cy-21}" width="64" height="42" rx="9"/><text x="${cx}" y="${cy+7}" text-anchor="middle">□</text></g>`;
  const arcs=q.arcs.map(arc=>{
    const a=layout.segments[arc.segment],active=q.long===arc.segment||q.short===arc.segment;
    const canSelect=interactive&&arc.length!==null;
    const attrs=`data-segment="${arc.segment}"${canSelect?` role="button" tabindex="0" aria-label="線段 ${label(p,arc.segment)} 長度 ${arc.length}"`:''}`;
    const classes=`${arc.derived?'derived':''} ${active?'chosen':''} ${segmentHint===arc.segment?'hinted':''}`;
    return {paths:`<g class="segment ${classes}"><path class="arc" d="${a.path}"/>${canSelect?`<path class="arc-hit" d="${a.path}" ${attrs}/>`:''}</g>`,labels:`<g class="segment ${classes}">${arc.length===null?`<text class="empty-name" x="${a.mid}" y="${a.labelY-29}" text-anchor="middle">${label(p,arc.segment)}</text>${interactive?slot(arc.segment,a.mid,a.labelY):''}`:`<g class="segment-label" ${attrs}><rect x="${a.mid-49}" y="${a.labelY-20}" width="98" height="36" rx="9"/><text x="${a.mid}" y="${a.labelY+5}" text-anchor="middle">${label(p,arc.segment)} ${arc.length}</text></g>`}</g>`};
  });
  const target=q.target?layout.segments[q.target]:null;
  return `<svg class="number-line" viewBox="0 0 ${width} ${height}" role="group" aria-label="${p.points.map(point=>point.label).join('、')}，由左到右的數線"><line class="baseline" x1="43" y1="${baseline}" x2="677" y2="${baseline}"/>${arcs.map(a=>a.paths).join('')}${arcs.map(a=>a.labels).join('')}${target?`<line class="target-line" x1="${target.a}" y1="${baseline}" x2="${target.b}" y2="${baseline}"/>${slot(q.target,target.slotX+32,target.slotY+21,true)}`:''}${p.points.map(point=>`<g class="point ${q.point===point.id?'selected':''} ${pointsActive&&hinted.includes(point.id)?'hinted':''}" ${pointsActive?`role="button" tabindex="0" data-point="${point.id}" aria-label="端點 ${point.label}"`:''}><rect x="${x[point.id]-25}" y="${baseline-23}" width="50" height="63" fill="transparent"/><circle cx="${x[point.id]}" cy="${baseline}" r="9"/><text x="${x[point.id]}" y="${baseline+33}" text-anchor="middle">${point.label}</text></g>`).join('')}</svg>`;
}
function chips(p,q){return `<div class="givens" aria-label="題目已知長度；數字片可以拖曳">${p.givens.map(g=>`<div class="given"><span>${label(p,g.segment)}＝</span><button class="number-chip ${q.selectedChip==='given-'+g.segment?'selected':''}" data-chip="given-${g.segment}" aria-label="${label(p,g.segment)} 的數字片 ${g.length}" aria-pressed="${q.selectedChip==='given-'+g.segment}" ${q.stage==='given-value'?'':'disabled'}>${g.length}</button></div>`).join('')}</div>`;}
function equation(p,q){
  if(!q.target)return '';
  const known=knownFor(p,q),term=(s,phase)=>`<div class="equation-slot ${q.stage===phase?'active':''}">${s?`<small>${label(p,s)}</small><strong>${known[s]}</strong>`:'<span>□</span>'}</div>`;
  return `<div class="equation" aria-label="本步算式"><strong class="equation-target">${label(p,q.target)}<br>＝</strong>${term(q.long,'long')}<span>−</span>${term(q.short,'short')}<span>＝</span>${q.stage==='answer'?'<input id="number" class="number-input" aria-label="減法結果" inputmode="none" pattern="[0-9]*" maxlength="3" autocomplete="off" aria-describedby="instruction hint">':q.stage==='result-place'?`<button class="number-chip result-chip ${q.selectedChip==='result'?'selected':''}" data-chip="result" aria-label="結果數字片 ${q.pending.value}" aria-pressed="${q.selectedChip==='result'}">${q.pending.value}</button>`:'<span class="answer-blank">□</span>'}</div>`;
}
function controls(p,q){
  if(q.stage==='question-complete')return `<button id="next" class="primary">${state.index===problems.length-1?'完成六題':'下一題'}</button>`;
  const eq=equation(p,q);
  if(q.stage==='answer')return `<form id="number-form">${eq}<div class="keypad" aria-label="數字鍵盤">${[1,2,3,4,5,6,7,8,9,'清除',0,'退一格'].map(n=>`<button type="button" data-key="${n}" aria-label="${typeof n==='number'?'數字 '+n:n}">${n==='退一格'?'⌫':n}</button>`).join('')}</div><button class="primary submit" type="submit">確認結果</button></form>`;
  return eq||'<p class="action-note">直接點圖上的端點。弧線代表兩端之間的長度。</p>';
}
function submit(type,value){
  const result=act(state,problems,type,value);log.push({type,value});
  if(result.ok)notice='';
  else if(result.reason==='longer-route')notice=`這段算得出，但這條路會多算一步；試試 ${problems[state.index].minSubtractions} 次內能到目標的路。`;
  else if(result.reason==='guided-route')notice='這段也能算；這一題先照上方指示選本步要算的段。';
  else if(result.reason==='known')notice='這段的長度已知，已標在圖上。請選這一步要算的未知段。';
  else if(type==='point'&&result.reason==='unavailable')notice='這段目前還不能直接算。看看已知段的端點，再選一次。';
  else if(type==='point')notice='這個端點不在目前要畫的已知段上，再看看段名。';
  else if(type==='segment')notice=current(state).stage==='long'?'這一段不能填進目前的亮框。找能搭配已知短段、相減後留下本步目標的長段。':'這一段不能填進目前的亮框。找共用一端、包含在長段裡，扣掉後留下本步目標的短段。';
  else if(type==='place')notice='這個數字片和空格不合，再看一次題目；已畫的線會留下。';
  else notice='再算一次，數線與算式會留在這裡。';
  save();render();
}
function activate(element,fn){
  let press=null;
  element.addEventListener('pointerdown',e=>{if(e.button===0&&e.isPrimary!==false)press={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};});
  element.addEventListener('pointermove',e=>{if(press&&press.id===e.pointerId&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>10)press.moved=true;});
  element.addEventListener('pointercancel',()=>{press=null;});
  element.addEventListener('pointerup',e=>{
    if(!press||press.id!==e.pointerId)return;
    const valid=!press.moved&&Math.hypot(e.clientX-press.x,e.clientY-press.y)<=10;press=null;suppressPointerClick=true;
    if(valid){e.preventDefault();fn();}
  });
  element.addEventListener('click',fn);
  element.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();fn();}});
}
function bindChips(){
  root.querySelectorAll('[data-chip]:not([disabled])').forEach(chip=>{
    chip.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();submit('chip',chip.dataset.chip);}});
    chip.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;
      const start={x:e.clientX,y:e.clientY},id=e.pointerId;let ghost=null,moved=false;
      chip.setPointerCapture(id);
      const cleanup=()=>{ghost?.remove();document.body.classList.remove('dragging');chip.removeEventListener('pointermove',move);chip.removeEventListener('pointerup',up);chip.removeEventListener('pointercancel',cancel);if(chip.hasPointerCapture(id))chip.releasePointerCapture(id);};
      const move=event=>{
        if(event.pointerId!==id)return;
        if(!moved&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>8){moved=true;ghost=chip.cloneNode(true);ghost.removeAttribute('data-chip');ghost.setAttribute('aria-hidden','true');ghost.classList.add('drag-ghost');document.body.append(ghost);document.body.classList.add('dragging');}
        if(ghost){event.preventDefault();ghost.style.left=event.clientX+'px';ghost.style.top=event.clientY+'px';}
      };
      const up=event=>{
        if(event.pointerId!==id)return;
        suppressPointerClick=true;
        const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-slot]'),value=chip.dataset.chip;
        cleanup();
        if(!moved){submit('chip',value);return;}
        if(target){act(state,problems,'chip',value);log.push({type:'chip',value});submit('place',target.dataset.slot);}
        else{notice='把數字片放到圖上的空格。這一步會留著。';render();}
      };
      const cancel=()=>{cleanup();};
      chip.addEventListener('pointermove',move);chip.addEventListener('pointerup',up);chip.addEventListener('pointercancel',cancel);
    });
  });
}
function rewardMessage(){const r=platform.reward();if(preview)return '試玩完成，不會讀寫孩子收藏或領包。';if(r.status==='earned')return '首次完成的 1 包拼裝包已存入收藏。重做仍可練習，拼裝包只發一次。';if(r.status==='pending')return '六題已完成，首次拼裝包正在等待同步。成果已保存在這台裝置；連線後會自動補送。';if(r.status==='error'||rewardError)return '六題已完成，但拼裝包還沒保存：'+(r.message||rewardError);return '六題已完成，正在確認首次拼裝包。';}
function updateReward(){const box=document.getElementById('reward');if(box){box.classList.toggle('pending',platform.reward().status==='pending');box.querySelector('p').textContent=rewardMessage();}}
async function claim(){if(preview||claiming||platform.reward().status==='earned')return;claiming=true;rewardError='';try{await platform.finish([...state.completedIds]);}catch(error){rewardError=error.message;}finally{claiming=false;updateReward();}}
function renderFinish() {
  root.dataset.stage='finished';
  root.innerHTML=`<section class="finish-card"><p class="eyebrow">固定六題 · 全部完成</p><h1>畫線、相減，再把結果標回圖</h1><p>你已經完成六題。到紙上也照這個順序做。</p><div id="reward" class="reward" role="status"><p>${esc(rewardMessage())}</p>${!preview?'<button id="retry">重新同步</button>':''}</div><div class="review-grid">${problems.map((p,i)=>`<article class="review-item"><h2>第 ${i+1} 題 · ${names[p.level]}</h2>${written(p,state.questions[i])}<button data-review="${i}">重看這張圖</button></article>`).join('')}</div><div class="actions"><button id="finish-restart">重做六題</button><a href="${document.getElementById('home').href}">回學習首頁</a></div><p>下一步：下載頁面下方的過渡卷，再試獨立卷。</p></section>`;
  root.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>{reviewIndex=Number(b.dataset.review);render();});
  root.querySelector('#finish-restart').onclick=()=>document.getElementById('restart-dialog').showModal();
  root.querySelector('#retry')?.addEventListener('click',async()=>{rewardError='';try{await platform.retry();await claim();}catch(error){rewardError=error.message;}updateReward();});
  // 畫面先就緒，才允許把整份完成送進既有收藏 outbox。
  requestAnimationFrame(()=>{if(state.finished&&reviewIndex===null)void claim();});
}

function render(){
  if(state.finished&&reviewIndex===null){renderFinish();return;}
  const index=reviewIndex??state.index,p=problems[index],q=state.questions[index],interactive=reviewIndex===null;
  root.dataset.stage=q.stage;root.dataset.question=p.id;
  root.innerHTML=`${interactive?'':'<div class="review-banner"><button id="close-review">回六題總覽</button>重看已完成的圖與算式</div>'}<div class="lesson-top"><div><p class="eyebrow">第 ${index+1} / 6 題 · ${names[p.level]} · ${p.minSubtractions} 次長−短</p><h1>最後要找：${label(p,p.target)} 的長度</h1></div><progress max="6" value="${state.completedIds.length}" aria-label="已完成題數"></progress></div><section class="lesson-card"><div class="step-heading"><p class="step-count">${q.stage.startsWith('given')?'先標已知長度':q.stage==='question-complete'?'這一題完成':`第 ${q.steps.length+1} 次相減`}</p><h2 id="instruction">${instruction(p,q)}</h2></div><div class="lesson-space"><div class="diagram-card">${chips(p,q)}${diagram(p,q,interactive)}<p class="diagram-note">數線不按比例畫，沒有單位；看段名與端點判斷。</p></div><div class="action-card">${interactive?controls(p,q):'<p>新弧線上的長度，來自你已完成的算式。</p>'}<p class="feedback" role="status">${esc(notice)}</p><p id="hint" class="hint">${hint(p,q)}</p></div></div>${q.steps.length?`<div class="work"><h2>已完成的算式</h2>${written(p,q)}</div>`:''}</section>`;
  root.querySelector('#close-review')?.addEventListener('click',()=>{reviewIndex=null;render();});
  if(!interactive)return;
  root.querySelectorAll('[data-point]').forEach(b=>activate(b,()=>submit('point',b.dataset.point)));
  root.querySelectorAll('[data-segment]').forEach(b=>activate(b,()=>submit('segment',b.dataset.segment)));
  root.querySelectorAll('[data-slot]').forEach(b=>activate(b,()=>submit('place',b.dataset.slot)));
  const next=root.querySelector('#next');if(next)activate(next,()=>{submit('next','');window.scrollTo(0,0);});
  bindChips();
  const input=root.querySelector('#number');
  if(input){
    root.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>{const k=b.dataset.key;input.value=k==='清除'?'':k==='退一格'?input.value.slice(0,-1):(input.value+k).slice(0,3);});
    input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,3);});
    root.querySelector('#number-form').onsubmit=e=>{e.preventDefault();submit('number',input.value);};
  }
}
document.getElementById('restart').onclick=()=>document.getElementById('restart-dialog').showModal();
document.getElementById('cancel-restart').onclick=()=>document.getElementById('restart-dialog').close();
document.getElementById('confirm-restart').onclick=()=>{if(!writable)return;({state,log}=restore(problems,null));reviewIndex=null;notice='';document.getElementById('restart-dialog').close();save();render();window.scrollTo(0,0);};
try{
  const response=await fetch('problems.json?v=20261024-direct-touch-v2');if(!response.ok)throw Error('題目未能載入，請重新整理。');
  problems=(await response.json()).sets.pad;platform=await openPlatform(preview);
  const saved=platform.load(),restored=restore(problems,saved,saved===null?platform.loadLegacy?.():null);
  ({state,log,writable}=restored);
  if(!writable)throw Error('這份進度是其他版本儲存的，已保留原資料。請重新整理，或請家長開啟相符版本。');
  if(restored.resetCurrent)notice='已保留完成題；這一題請重新標圖。';
  document.getElementById('mode').textContent=preview?'家長試玩 · 不保存':'固定六題';
  if(platform.child)document.getElementById('home').href='../?child='+platform.child;
  platform.subscribe(updateReward);save();render();platform.ready?.then(updateReward);
}catch(error){
  root.dataset.stage='unavailable';root.innerHTML=`<section class="finish-card"><h1>還沒準備好</h1><p>${esc(error.message)}</p><p><a href="../">回學習首頁</a> · <a href="?preview=1">家長試玩</a></p></section>`;
  document.getElementById('restart').hidden=true;
}
