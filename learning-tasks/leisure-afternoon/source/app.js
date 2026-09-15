'use strict';
READING_PHRASES.push(...LEISURE_READINGS);
let state=cleanState(null), storageOK=true;
try{state=cleanState(JSON.parse(localStorage.getItem(STORAGE_KEY)));}catch{storageOK=false;}
const guide=document.getElementById('guide');
const colors=['#648570','#ad874e','#7388aa','#aa7c76','#87789b'];
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));storageOK=true;}catch{storageOK=false;}}
function renderMap(){
  document.getElementById('map').innerHTML=`<svg class="map-lines" aria-hidden="true"></svg><div class="center-node">${TITLE}</div>${BRANCHES.map((b,i)=>{
    const words=branchWords(b,state.picks[i]);
    return `<section class="branch branch-${i} ${words.length?'':'empty'}" style="--color:${colors[i]}"><h3><button data-edit="${i}" aria-label="修改${b.label}">${b.label}</button></h3><ul>${(words.length?words:['還沒選']).map((w,j)=>`<li class="map-leaf leaf-${j}">${w}</li>`).join('')}</ul></section>`;
  }).join('')}`;
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(Number(b.dataset.edit)));
  document.getElementById('save-status').textContent=storageOK?'選擇會記在這個瀏覽器。':'無法儲存；離開前請先截圖留存。';
  annotateReading(document.getElementById('map'));requestAnimationFrame(drawLines);
}
function drawLines(){
  const map=document.getElementById('map'),svg=map.querySelector('svg');if(!svg)return;
  const area=map.getBoundingClientRect();
  const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left-area.left,right:r.right-area.left,top:r.top-area.top,bottom:r.bottom-area.top,width:r.width,height:r.height};};
  const center=rect(map.querySelector('.center-node')),cx=(center.left+center.right)/2,cy=(center.top+center.bottom)/2;
  svg.setAttribute('viewBox',`0 0 ${area.width} ${area.height}`);
  svg.innerHTML=[...map.querySelectorAll('.branch')].map((b,i)=>{
    const label=rect(b.querySelector('h3')),lx=(label.left+label.right)/2,upper=i<2;
    const ly=upper?label.bottom+8:label.top-8;
    const angle=Math.atan2(ly-cy,lx-cx);
    const sx=cx+Math.cos(angle)*(center.width/2+3),sy=cy+Math.sin(angle)*(center.height/2+3);
    let d=`M ${sx} ${sy} L ${lx} ${ly}`;
    const leaves=[...b.querySelectorAll('.map-leaf')].map(rect);
    const fromY=upper?label.top-8:label.bottom+8;
    if(i===4){
      const forkY=fromY+3;
      leaves.forEach(r=>{const x=(r.left+r.right)/2;d+=` M ${lx} ${fromY} L ${lx} ${forkY} L ${x} ${forkY} L ${x} ${r.top-7}`;});
    }else{
      const left=i%2===0;
      const gutter=left?Math.max(...leaves.map(r=>r.right))+9:Math.min(...leaves.map(r=>r.left))-9;
      leaves.forEach(r=>{const x=left?r.right+8:r.left-8,y=(r.top+r.bottom)/2;
        d+=` M ${lx} ${fromY} L ${gutter} ${fromY} L ${gutter} ${y} L ${x} ${y}`;
      });
    }
    return `<path d="${d}" fill="none" stroke="${colors[i]}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join('');
}
function edit(step){state.step=step;state.finished=false;save();render();document.getElementById('question').focus({preventScroll:true});window.scrollTo(0,0);}
function feedback(){
  const b=BRANCHES[state.step],p=state.picks[state.step];
  document.getElementById('next').disabled=!isReady(b,p);
  document.getElementById('feedback').textContent=isReady(b,p)?'放好了，可以繼續，也可以換。':b.min===2?`已選 ${p.length} 個，還要選 ${b.min-p.length} 個。`:'選一組你想留下的短詞。';
}
function render(){
  document.body.classList.toggle('copy-mode',state.finished);
  const finish=document.getElementById('finish');finish.hidden=!state.finished;
  document.getElementById('map-title').textContent=state.finished?'我的閱讀心智圖':'五條主枝，一步一步拼';
  renderMap();
  if(state.finished){
    guide.innerHTML='';finish.innerHTML='<p class="finish-note">五個重點都到齊了。從中間開始抄。</p><div class="actions"><button id="revise">回去改一改</button><button id="print">列印這張圖</button></div>';
    document.getElementById('revise').onclick=()=>edit(0);document.getElementById('print').onclick=()=>window.print();
  }else{
    const b=BRANCHES[state.step];
    guide.innerHTML=`<div class="step">第 ${state.step+1} / ${BRANCHES.length} 步 · ${b.label}</div><progress max="5" value="${state.step+1}" aria-label="目前步驟"></progress><h2 id="question" tabindex="-1">${b.question}</h2><p class="prompt">${b.prompt}</p><details class="hint"><summary>回頭讀一小段</summary><p>${b.hint}</p></details><div class="choices ${b.id==='garden'?'garden-choices':''}">${b.choices.map(c=>`<button class="choice" data-choice="${c.id}" aria-pressed="${state.picks[state.step].includes(c.id)}"><span class="choice-words">${c.words.map(w=>`<span>${w}</span>`).join('')}</span><span class="mark">${state.picks[state.step].includes(c.id)?'已選':'選這組'}</span></button>`).join('')}</div><p id="feedback" class="feedback" role="status"></p><div class="actions"><button id="back" ${state.step===0?'disabled':''}>上一步</button><button id="next" class="primary">${state.step===BRANCHES.length-1?'完成心智圖':'下一步'}</button></div>`;
    guide.querySelectorAll('[data-choice]').forEach(btn=>btn.onclick=()=>{
      const picks=state.picks[state.step],id=btn.dataset.choice,index=picks.indexOf(id);
      if(index>=0)picks.splice(index,1);else if(b.max===1)picks.splice(0,picks.length,id);else if(picks.length<b.max)picks.push(id);
      else{document.getElementById('feedback').textContent='留下兩個就好；先取消一個，就能換。';return;}
      save();renderMap();
      guide.querySelectorAll('[data-choice]').forEach(button=>{const selected=picks.includes(button.dataset.choice);button.setAttribute('aria-pressed',String(selected));button.querySelector('.mark').textContent=selected?'已選':'選這組';});feedback();
    });
    document.getElementById('back').onclick=()=>edit(state.step-1);
    document.getElementById('next').onclick=()=>{
      if(!isReady(b,state.picks[state.step]))return;
      if(state.step===BRANCHES.length-1){const missing=BRANCHES.findIndex((branch,i)=>!isReady(branch,state.picks[i]));if(missing>=0){edit(missing);return;}state.finished=true;save();render();window.scrollTo(0,0);}
      else edit(state.step+1);
    };feedback();
  }
  annotateReading(document.querySelector('main'));
}
new ResizeObserver(drawLines).observe(document.getElementById('map'));
document.fonts.load('700 22px ZihiReading').then(fonts=>{if(!fonts.length)throw new Error('Font unavailable');document.getElementById('font-status').hidden=true;drawLines();}).catch(()=>{document.getElementById('font-status').textContent='注音字型未能載入，連線後請重新整理。';drawLines();});
window.addEventListener('beforeprint',drawLines);window.addEventListener('afterprint',drawLines);
annotateReading(document.querySelector('header'));render();
