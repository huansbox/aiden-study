import {act,restore,current,label,knownFor,nextSteps,expectedPoints} from './lesson-core.js';
import {openPlatform} from './platform.js';

const root=document.getElementById('app'), params=new URLSearchParams(location.search);
const preview=params.get('preview')==='1';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let problems,state,log,platform,notice='',reviewIndex=null,claiming=false,saveOK=true,rewardError='';
const names={beginner:'初階',intermediate:'中階',advanced:'挑戰'};
const save=()=>{saveOK=platform.save({version:1,log});document.getElementById('save-status').textContent=preview?'家長試玩：離開後不保存，也不領拼裝包。':saveOK?'每一步已保存在這台裝置，可離開後續做。':'這台裝置無法儲存進度；請先留在此頁，讓家長協助。';};
function written(p,q){const known=knownFor(p,q);return q.steps.map(s=>`<div class="written-equation">${label(p,s.long)} <strong>${known[s.long]}</strong> − ${label(p,s.short)} <strong>${known[s.short]}</strong> ＝ ${label(p,s.result)} <strong>${s.value}</strong></div>`).join('');}
function hint(p,q) {
  if(q.errors<2)return '';
  if(q.stage.endsWith('start')||q.stage.endsWith('end'))return `找 ${expectedPoints(p,q).map(id=>p.points.find(point=>point.id===id).label).join(' 或 ')}，點亮框的端點。`;
  if(q.stage==='given-value')return `題目寫著 ${label(p,p.givens[q.givenIndex].segment)}＝${p.givens[q.givenIndex].length}，把這個數標在弧線上。`;
  if(q.stage==='long')return `可先用 ${label(p,nextSteps(p,q)[0].long)} 當長段。`;
  if(q.stage==='short')return `用 ${label(p,nextSteps(p,q).find(s=>s.long===q.long).short)}；它在長段裡面，並共用同一個端點。`;
  if(q.stage==='answer')return `${knownFor(p,q)[q.long]} − ${knownFor(p,q)[q.short]}，想想拿掉短段後剩多少。`;
  if(q.stage==='mark-value')return `剛剛算出 ${label(p,q.pending.result)}＝${q.pending.value}，把 ${q.pending.value} 標回弧線。`;
  return '';
}
function pointHints(p,q){return q.errors>=2 && (q.stage.endsWith('start')||q.stage.endsWith('end')) ? expectedPoints(p,q) : [];}
function segmentHints(p,q){if(q.errors<2)return [];const steps=nextSteps(p,q);return q.stage==='long'?[steps[0]?.long]:q.stage==='short'?[steps.find(s=>s.long===q.long)?.short]:[];}
function diagram(p,q,interactive=true) {
  const baseline=Math.max(145,65+q.arcs.length*35), width=600, x=id=>60+p.points.findIndex(point=>point.id===id)*480/(p.points.length-1);
  const hinted=pointHints(p,q), segHint=segmentHints(p,q), pickable=interactive&&(q.stage.endsWith('start')||q.stage.endsWith('end'));
  return `<svg class="number-line" viewBox="0 0 ${width} ${baseline+65}" role="group" aria-label="${p.points.map(point=>point.label).join('、')}，從左到右排列的數線"><line x1="45" y1="${baseline}" x2="555" y2="${baseline}" stroke="#243b3b" stroke-width="3"/>${q.arcs.map((arc,i)=>{const [a,b]=arc.segment,mid=(x(a)+x(b))/2,h=40+i*35;return `<path class="arc ${arc.derived?'derived':''} ${segHint.includes(arc.segment)?'hinted':''}" d="M ${x(a)} ${baseline-7} Q ${mid} ${baseline-2*h} ${x(b)} ${baseline-7}"/><text class="arc-label" x="${mid}" y="${baseline-h-12}" text-anchor="middle">${esc(label(p,arc.segment))} ${arc.length===null?'？':arc.length}</text>`;}).join('')}${p.points.map(point=>`<g class="point ${q.point===point.id?'selected':''} ${hinted.includes(point.id)?'hinted':''} ${pickable?'':'disabled'}" ${pickable?`role="button" tabindex="0" data-point="${point.id}" aria-label="端點 ${point.label}"`:''}><rect x="${x(point.id)-27}" y="${baseline-24}" width="54" height="65" fill="transparent"/><circle cx="${x(point.id)}" cy="${baseline}" r="11"/><text x="${x(point.id)}" y="${baseline+40}" text-anchor="middle">${point.label}</text></g>`).join('')}</svg>`;
}
function instruction(p,q) {
  if(q.stage==='given-start')return `畫出已知的 ${label(p,p.givens[q.givenIndex].segment)}。先點其中一個端點。`;
  if(q.stage==='given-end')return '再點這一段的另一個端點，連成弧線。';
  if(q.stage==='given-value')return `在 ${label(p,p.givens[q.givenIndex].segment)} 的弧線上標長度。`;
  if(q.stage==='long'){
    const route=p.preferredRoute&&p.preferredRoute!=='direct'?nextSteps(p,q)[0]:null;
    return route?`先求 ${label(p,route.result)}。選一條可以使用的長段。`:'選一條長段，準備減掉裡面的一小段。';
  }
  if(q.stage==='short')return `長段選了 ${label(p,q.long)}。選要減掉的短段。`;
  if(q.stage==='answer')return '把兩段的長度列成減法，填入結果。';
  if(q.stage==='mark-start')return `把新求出的 ${label(p,q.pending.result)} 標回圖。先點一個端點。`;
  if(q.stage==='mark-end')return '再點另一個端點，為新求出的線段畫弧線。';
  if(q.stage==='mark-value')return `把剛求出的長度標在 ${label(p,q.pending.result)} 弧線上。`;
  return `${label(p,p.target)}＝${p.answer}，圖和算式都完成了。`;
}
function numeric(p,q) {
  const known=knownFor(p,q);
  return `<form id="number-form"><div class="equation">${q.stage==='answer'?`<div class="term"><small>${label(p,q.long)}</small><strong>${known[q.long]}</strong></div><span>−</span><div class="term"><small>${label(p,q.short)}</small><strong>${known[q.short]}</strong></div><span>＝</span>`:`<div class="term"><small>${q.stage==='given-value'?label(p,p.givens[q.givenIndex].segment):label(p,q.pending.result)}</small><strong>長度</strong></div><span>＝</span>`}<input id="number" class="number-input" aria-label="${q.stage==='answer'?'減法結果':'弧線長度'}" inputmode="none" pattern="[0-9]*" maxlength="3" autocomplete="off" aria-describedby="instruction hint"></div><div class="keypad" aria-label="數字鍵盤">${[1,2,3,4,5,6,7,8,9,'清除',0,'退一格'].map(n=>`<button type="button" data-key="${n}" aria-label="${typeof n==='number'?'數字 '+n:n}">${n==='退一格'?'⌫':n}</button>`).join('')}</div><button class="primary submit" type="submit">${q.stage==='answer'?'確認減法':'標上長度'}</button></form>`;
}
function controls(p,q) {
  if(q.stage==='question-complete')return `<button id="next" class="primary">${state.index===problems.length-1?'完成六題':'下一題'}</button>`;
  if(q.stage==='long'||q.stage==='short')return `<div class="choices">${q.arcs.filter(a=>a.length!==null).map(a=>`<button data-segment="${a.segment}" class="${segmentHints(p,q).includes(a.segment)?'hinted':''}" aria-label="線段 ${label(p,a.segment)} 長度 ${a.length}"><span class="segment-name">${label(p,a.segment)}</span><span class="segment-value">${a.length}</span></button>`).join('')}</div><p class="diagram-note">長、短段要共用一端，短段要包含在長段裡。</p>`;
  if(['given-value','answer','mark-value'].includes(q.stage))return numeric(p,q);
  return `<div class="point-buttons" aria-label="也可以在這裡選端點">${p.points.map(point=>`<button data-point="${point.id}" class="${q.point===point.id?'selected':''} ${pointHints(p,q).includes(point.id)?'hinted':''}">${point.label}</button>`).join('')}</div>`;
}
function submit(type,value) {
  const result=act(state,problems,type,value);log.push({type,value});
  notice=result.ok?'':type==='point'?'這個端點不在目前要畫的線段上，再看看段名。':type==='segment'?'這兩段不能在這一步求出需要的線段。看看端點和包含關係。':'再算一次，數線與算式會留在這裡。';
  save();render();
}
function rewardMessage(){const r=platform.reward();if(preview)return '試玩完成，不會讀寫孩子收藏或領包。';if(r.status==='earned')return '首次完成的 1 包拼裝包已存入收藏。重做仍可練習，拼裝包只發一次。';if(r.status==='pending')return '六題已完成，首次拼裝包正在等待同步。成果已保存在這台裝置；連線後會自動補送。';if(rewardError)return '六題已完成，但拼裝包還沒保存：'+rewardError;return '六題已完成，正在確認首次拼裝包。';}
function updateReward(){const box=document.getElementById('reward');if(box){box.classList.toggle('pending',platform.reward().status==='pending');box.querySelector('p').textContent=rewardMessage();}}
async function claim(){if(preview||claiming||platform.reward().status==='earned')return;claiming=true;rewardError='';try{await platform.finish([...state.completedIds]);}catch(error){rewardError=error.message;}finally{claiming=false;updateReward();}}
function renderFinish() {
  root.innerHTML=`<section class="finish-card"><p class="eyebrow">固定六題 · 全部完成</p><h1>畫線、相減，再把結果標回圖</h1><p>你已經完成六題。到紙上也照這個順序做。</p><div id="reward" class="reward" role="status"><p>${rewardMessage()}</p>${!preview?'<button id="retry">重新同步</button>':''}</div><div class="review-grid">${problems.map((p,i)=>`<article class="review-item"><h2>第 ${i+1} 題 · ${names[p.level]}</h2>${written(p,state.questions[i])}<button data-review="${i}">重看這張圖</button></article>`).join('')}</div><div class="actions"><button id="finish-restart">重做六題</button><a href="${document.getElementById('home').href}">回學習首頁</a></div><p>下一步：下載頁面下方的過渡卷，再試獨立卷。</p></section>`;
  root.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>{reviewIndex=Number(b.dataset.review);render();});
  root.querySelector('#finish-restart').onclick=()=>document.getElementById('restart-dialog').showModal();
  root.querySelector('#retry')?.addEventListener('click',async()=>{await platform.retry();await claim();updateReward();});
  // 畫面先就緒，才允許把整份完成送進既有收藏 outbox。
  requestAnimationFrame(()=>{if(state.finished&&reviewIndex===null)void claim();});
}
function render() {
  if(state.finished&&reviewIndex===null){renderFinish();return;}
  const index=reviewIndex??state.index,p=problems[index],q=state.questions[index];
  root.innerHTML=`${reviewIndex!==null?'<div class="review-banner"><button id="close-review">回六題總覽</button>重看已完成的圖與算式</div>':''}<div class="lesson-top"><div><p class="eyebrow">第 ${index+1} / 6 題 · ${names[p.level]} · ${p.minSubtractions} 次長−短</p><h1>求 ${label(p,p.target)} 的長度</h1></div><progress max="6" value="${state.completedIds.length}" aria-label="已完成題數"></progress></div><div class="layout"><section class="diagram-card" aria-label="數線和已完成的算式"><div class="givens">${p.givens.map((g,i)=>`<span class="given ${reviewIndex===null&&q.stage.startsWith('given')&&q.givenIndex===i?'active':''}">${label(p,g.segment)}＝${g.length}</span>`).join('')}</div>${diagram(p,q,reviewIndex===null)}<p class="diagram-note">數線不一定按比例畫；用段名和端點判斷長短。</p>${q.steps.length?`<div class="work"><h2>已完成的算式</h2>${written(p,q)}</div>`:''}</section><section class="action-card"><p class="step-count">${q.stage.startsWith('given')?'先把已知長度標上圖':q.stage==='question-complete'?'這一題完成':`第 ${q.steps.length+1} 次相減`}</p><h2 id="instruction" class="prompt">${instruction(p,q)}</h2>${index===0&&q.stage.startsWith('given')?'<p class="intro">弧線代表兩個端點之間的一段。點端點畫弧線，再用數字標出這一段的長度。</p>':''}${index===4&&q.stage==='long'&&q.steps.length===0?'<p class="intro">這題可以先求左側，也可以先求右側。選你想走的路。</p>':''}${index===5&&q.stage==='long'&&q.steps.length===0?'<p class="intro">要做三次相減。每次求到的新線段，都可以接著用。</p>':''}<p id="hint" class="hint">${hint(p,q)}</p><p class="feedback" role="status">${esc(notice)}</p>${reviewIndex===null?controls(p,q):'<p>圖上的每一條新弧線，都對應一個已完成的減法。</p>'}</section></div>`;
  root.querySelector('#close-review')?.addEventListener('click',()=>{reviewIndex=null;render();});
  if(reviewIndex!==null)return;
  root.querySelectorAll('[data-point]').forEach(b=>{b.onclick=()=>submit('point',b.dataset.point);if(b.tagName.toLowerCase()==='g')b.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();submit('point',b.dataset.point);}};});
  root.querySelectorAll('[data-segment]').forEach(b=>b.onclick=()=>submit('segment',b.dataset.segment));
  root.querySelector('#next')?.addEventListener('click',()=>{submit('next','');window.scrollTo(0,0);});
  const input=root.querySelector('#number');
  if(input){
    root.querySelectorAll('[data-key]').forEach(b=>b.onclick=()=>{const k=b.dataset.key;input.value=k==='清除'?'':k==='退一格'?input.value.slice(0,-1):(input.value+k).slice(0,3);});
    input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,3);});
    root.querySelector('#number-form').onsubmit=e=>{e.preventDefault();submit('number',input.value);};
  }
}
document.getElementById('restart').onclick=()=>document.getElementById('restart-dialog').showModal();
document.getElementById('cancel-restart').onclick=()=>document.getElementById('restart-dialog').close();
document.getElementById('confirm-restart').onclick=()=>{({state,log}=restore(problems,null));reviewIndex=null;notice='';document.getElementById('restart-dialog').close();save();render();window.scrollTo(0,0);};
try {
  const response=await fetch('problems.json');if(!response.ok)throw Error('題目未能載入，請重新整理。');
  problems=(await response.json()).sets.pad;
  platform=await openPlatform(preview);
  ({state,log}=restore(problems,platform.load()));
  document.getElementById('mode').textContent=preview?'家長試玩 · 不保存':'固定六題';
  if(platform.child)document.getElementById('home').href='../?child='+platform.child;
  platform.subscribe(updateReward);save();render();
  platform.ready?.then(updateReward);
} catch(error) {
  root.innerHTML=`<section class="finish-card"><h1>還沒準備好</h1><p>${esc(error.message)}</p><p><a href="../">回學習首頁</a> · <a href="?preview=1">家長試玩</a></p></section>`;
  document.getElementById('restart').hidden=true;
}
