'use strict';
// 固定文本也是存檔白名單：不把瀏覽器存檔中的文字直接放進 HTML。
const STEPS = [
  {label:'中心', title:'這篇文章，你想用什麼名字記住？', prompt:'選一個你覺得能串起整篇文章的名字。', max:1,
    options:['陽光與司馬光','讀詩想起司馬光','詩中的景與人'],
    hint:'作者從午後陽光寫起，讀了司馬光的詩，又想起他的事蹟，最後寫下讀詩的感受。'},
  {label:'景色', title:'閉上眼睛，你看見了什麼？', prompt:'選 1～2 個最想畫進圖裡的景色。', max:2,
    options:['雨後初晴','南山清楚','葵花向陽','春末夏初'],
    hint:'「四月清和雨乍晴，南山當戶轉分明。更無柳絮因風起，惟有葵花向日傾。」文章說，這是春末夏初的景色。'},
  {label:'人物', title:'你想怎麼介紹司馬光？', prompt:'選 1～2 個你想記住的重點。', max:2,
    options:['主編通鑑','清廉正直','謙恭有禮','破缸救友'],
    hint:'文章提到他「破缸救友」、主編歷史巨著《資治通鑑》，也說他為官清廉、謙恭正直。清廉是不貪財；謙恭是待人有禮。'},
  {label:'故事', title:'妻子過世後，他怎麼辦？', prompt:'「典地葬妻」就是把土地典當換錢，辦妻子的喪事。選 1～2 個故事重點。', max:2,
    options:['不借錢排場','典地辦喪事','簡單辦喪事','做人要節儉'],
    hint:'家中沒錢辦喪事，兒子和親戚主張借錢辦得風光。司馬光不同意，教導兒子要節儉，最後把地典當換錢，簡單辦完喪事。'},
  {label:'感受', title:'讀完詩，作者心裡留下什麼？', prompt:'選 1～2 個你從文章讀到的感受。', max:2,
    options:['心中溫暖','心情晴朗','敬佩詩人'],
    hint:'開頭說，作者的心情受到太陽感染；結尾說，他沉浸在這位剛正不阿的詩人的詩裡，詩句帶著暖暖陽光，滿溢到心中。剛正不阿是正直、不隨便討好別人。'}
];
const KEY = 'aiden_reading_mind_map_v1';
const COLORS = [['#789b7d','#f0f6ec'],['#b99056','#fcf4e5'],['#7d91b2','#eef3fa'],['#b9847e','#fcf0ed']];
function cleanState(raw) {
  const picks = STEPS.map((step,i) => Array.isArray(raw?.picks?.[i])
    ? [...new Set(raw.picks[i].filter(x => step.options.includes(x)))].slice(0,step.max) : []);
  const firstEmpty = picks.findIndex(p => p.length === 0);
  const complete = firstEmpty === -1;
  const step = Number.isInteger(raw?.step) && raw.step >= 0 && raw.step < STEPS.length
    ? Math.min(raw.step,complete ? STEPS.length - 1 : firstEmpty) : Math.max(0, firstEmpty);
  return {picks,step,finished:complete && raw?.finished === true};
}
function mapWordCount(picks) {
  return picks.reduce((n,p,i) => n + (p.length && i ? STEPS[i].label.length : 0) + p.join('').length,0);
}
// Export only the small state contract for Node tests; browsers initialize below.
if (typeof module !== 'undefined') module.exports = {STEPS,cleanState,mapWordCount};
if (typeof document !== 'undefined') {
  let state = cleanState(null);
  let storageOK = true;
  try { state = cleanState(JSON.parse(localStorage.getItem(KEY))); } catch { storageOK = false; }
  const guide = document.getElementById('guide');
  function save() {
    try { localStorage.setItem(KEY,JSON.stringify(state)); storageOK = true; } catch { storageOK = false; }
  }
  function renderMap() {
    document.getElementById('map').innerHTML = `<svg class="map-lines" aria-hidden="true"></svg><div class="center-node">${state.picks[0][0] || '我的中心主題'}</div><div class="branches">${STEPS.slice(1).map((s,j) => {
      const i = j + 1, picks = state.picks[i];
      return `<section class="branch ${picks.length ? '' : 'empty'}" style="--branch:${COLORS[j][0]};--tint:${COLORS[j][1]}"><h3>${s.label}</h3><ul>${picks.length ? picks.map(p=>`<li>${p}</li>`).join('') : '<li>還沒選</li>'}</ul>${picks.length ? `<button data-edit="${i}">改一改${s.label}</button>` : ''}</section>`;
    }).join('')}</div>`;
    document.getElementById('word-count').textContent = `抄寫 ${mapWordCount(state.picks)} 字`;
    document.getElementById('save-status').textContent = storageOK ? '選擇會自動記在這個瀏覽器。' : '目前無法儲存；離開前請先截圖留下你的圖。';
    document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(Number(b.dataset.edit)));
    requestAnimationFrame(drawLines);
  }
  function drawLines() {
    const map=document.getElementById('map'), svg=map.querySelector('svg');
    if(!svg)return;
    const bounds=map.getBoundingClientRect(), center=map.querySelector('.center-node').getBoundingClientRect();
    const x=center.left+center.width/2-bounds.left, y=center.bottom-bounds.top;
    svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);
    svg.innerHTML=[...map.querySelectorAll('.branch')].map((node,i)=>{
      const box=node.getBoundingClientRect(), endX=box.left+box.width/2-bounds.left, endY=box.top-bounds.top;
      return `<path d="M ${x} ${y} V ${endY-12} H ${endX} V ${endY}" fill="none" stroke="${COLORS[i][0]}" stroke-width="2"/>`;
    }).join('');
  }
  new ResizeObserver(drawLines).observe(document.getElementById('map'));
  function edit(step) { state.step=step; state.finished=false; save(); render(); guide.scrollIntoView({block:'start'}); }
  function render() {
    document.body.classList.toggle('copy-mode',state.finished);
    document.getElementById('map-heading').textContent = state.finished ? '我的閱讀心智圖' : '我的圖，慢慢長大';
    const finish = document.getElementById('finish');
    finish.hidden = !state.finished;
    renderMap();
    if (state.finished) {
      guide.innerHTML='';
      finish.innerHTML='<h2>換你把圖畫到作業本上</h2><p>先寫中間的主題，再往外畫四條線。抄上短詞，就完成了！</p><p class="muted">也可以先用 iPad 截圖，把自己的圖留下來。</p><div class="actions"><button id="revise">回去改一改</button><button id="print">列印這張圖</button></div>';
      document.getElementById('revise').onclick=()=>edit(0);
      document.getElementById('print').onclick=()=>window.print();
      return;
    }
    const s=STEPS[state.step], picks=state.picks[state.step];
    guide.innerHTML=`<div class="step">第 ${state.step+1} / ${STEPS.length} 步 · ${s.label}</div><progress value="${state.step+1}" max="5" aria-label="目前步驟"></progress><h2 tabindex="-1" id="question">${s.title}</h2><p>${s.prompt}</p><details class="hint"><summary>想不起來？回頭讀一小段</summary><blockquote>${s.hint}</blockquote></details><div class="choices">${s.options.map((o,i)=>`<button class="choice" data-choice="${i}" aria-pressed="${picks.includes(o)}"><span>${o}</span><span class="mark">${picks.includes(o)?'已選':'選這個'}</span></button>`).join('')}</div><p id="feedback" role="status">${picks.length ? `已選 ${picks.length} 個，可以繼續，也可以換。` : '選好後，再往下一步。'}</p><div class="actions"><button id="back" ${state.step===0?'disabled':''}>上一步</button><button id="next" class="primary" ${!picks.length?'disabled':''}>${state.step===4?'完成，準備抄寫':'放好了，下一步'}</button></div>`;
    guide.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{
      const option=s.options[Number(b.dataset.choice)], index=picks.indexOf(option);
      if(index>=0) picks.splice(index,1);
      else if(s.max===1) picks.splice(0,picks.length,option);
      else if(picks.length<s.max) picks.push(option);
      else { document.getElementById('feedback').textContent='留下兩個就好。先點一下已選的字卡，就能換一個。';return; }
      save();renderMap();
      guide.querySelectorAll('[data-choice]').forEach(btn=>{
        const selected=picks.includes(s.options[Number(btn.dataset.choice)]);
        btn.setAttribute('aria-pressed',String(selected));btn.querySelector('.mark').textContent=selected?'已選':'選這個';
      });
      document.getElementById('next').disabled=!picks.length;
      document.getElementById('feedback').textContent=`已選 ${picks.length} 個${picks.length?'，可以繼續，也可以換。':'，請選一個重點。'}`;
    });
    document.getElementById('back').onclick=()=>{state.step--;save();render();document.getElementById('question').focus();};
    document.getElementById('next').onclick=()=>{
      if(!picks.length)return;
      if(state.step===4) { const missing=state.picks.findIndex(p=>!p.length); if(missing>=0)state.step=missing;else state.finished=true; }
      else state.step++;
      save();render();
      if(state.finished)window.scrollTo(0,0);else document.getElementById('question').focus();
    };
  }
  render();
}
