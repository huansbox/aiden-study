import { newScene, interact } from './model.mjs?v=20261021-storybook';
import { sceneArt, drop, sun } from './art.mjs?v=20261021-storybook';

const root = document.querySelector('#app');
const content = await fetch('./content.json?v=20261021-storybook').then(r => { if (!r.ok) throw Error('content'); return r.json(); }).catch(() => null);
if (!content) { root.innerHTML='<p class="loading">故事還沒載入，請重新整理頁面。</p>'; throw Error('Story unavailable'); }
const esc = t => String(t).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
let lang='zh', page=-1, state=null, subtitles=false, slow=false, panel=false, cloudOffset={x:0,y:0}, drag=null, swallowUntil=0, swallowAction=null, tapCandidate=null, touchClickUntil=0;
const audio = new Audio(); audio.preload='none';
let status='idle', serial=0, last='', effectTimer;
const symbols = {
  back:'<path d="m16 6-6 6 6 6"/>', next:'<path d="m8 6 6 6-6 6"/>',
  replay:'<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>', pause:'<path d="M8 5v14M16 5v14"/>',
  play:'<path d="m8 5 11 7-11 7Z"/>', menu:'<path d="M5 6h14M5 12h14M5 18h14"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${symbols[name]}</svg>`;
const control = (cmd,name,label,extra='') => `<button class="control" data-command="${cmd}" aria-label="${label}" title="${label}" ${extra}>${icon(name)}</button>`;
const voiceId = cue => `${lang}-book-${cue}`;
const currentCue = () => page===6?'ending':state?.cue || 'pond-intro';
function audioUI() {
  const pause=root.querySelector('[data-command="pause"]');
  if(pause) { pause.innerHTML=icon(status==='paused'||status==='idle'?'play':'pause'); pause.setAttribute('aria-label',status==='paused'?'繼續語音 / Resume':'暫停或播放語音 / Pause or play'); }
  root.querySelector('.audio-retry')?.toggleAttribute('hidden',status!=='error');
  root.querySelector('.audio-controls')?.setAttribute('data-status',status);
}
function stopAudio() { serial++; audio.pause(); audio.removeAttribute('src'); audio.load(); status='idle'; audioUI(); }
async function playCurrent(token) {
  status='loading'; audioUI();
  try { await audio.play(); if(token===serial && status!=='paused') { status='playing';audioUI(); } }
  catch { if(token===serial && status!=='paused') {status='error';audioUI();} }
}
function speak(id=voiceId(currentCue())) {
  stopAudio();last=id;audio.src=`assets/audio/${id}.mp3`;audio.playbackRate=slow?.8:1;playCurrent(serial);
}
audio.addEventListener('ended',()=>{status='idle';audioUI();});
audio.addEventListener('error',()=>{if(audio.getAttribute('src')){status='error';audioUI();}});
function cancelDrag(){if(drag){drag.el.classList.remove('dragging');drag=null;}}
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelDrag();stopAudio();}});
window.addEventListener('pagehide',()=>{cancelDrag();stopAudio();});
const navigation = () => `<div class="quiet-controls"><div class="audio-controls" role="group" aria-label="語音控制">${control('replay','replay','重聽 / Replay')}${control('pause','pause','暫停 / Pause')}</div>${control('menu','menu','家長選單 / Parent menu')}</div><button hidden class="audio-retry" data-command="replay" role="status">聲音未開始 · 點此重聽</button>`;
function background(name){return `<div class="scene-background" aria-hidden="true" style="--scene-image:url('assets/story/${name}.png')"></div>`;}
function render() {
  document.documentElement.lang=lang==='en'?'en':'zh-Hant';
  if(page===-1) {
    root.innerHTML=`<main class="book cover" data-page="cover">${background('pond')}<div class="cover-sun" aria-hidden="true">${sun()}</div><button class="cover-drop cue" data-command="start-zh" aria-label="點小水滴，開始中文旅行">${drop()}</button><div class="cover-title"><h1>一滴水的旅行</h1><div class="entrances"><button data-command="start-zh">開始旅行</button><button data-command="start-en" lang="en">English</button></div></div><div class="quiet-controls">${control('menu','menu','家長選單 / Parent menu')}</div></main>`;
  } else if(page===6) {
    root.innerHTML=`<main class="book ending" data-page="ending">${background('river')}<div class="ending-drop" aria-hidden="true">${drop()}</div><div class="ending-title"><h1>${lang==='en'?'Where next, Little Drop?':'小水滴，下次去哪裡？'}</h1><div class="entrances"><button data-command="again">${lang==='en'?'Play again':'再旅行一次'}</button><button data-command="language">${lang==='en'?'中文故事':'English'}</button></div></div>${navigation()}${control('back','back','上一頁 / Previous page','data-nav="back"')}<span class="page-number">7 / 7</span></main>`;
  } else {
    const chapter=content.pages[page];
    root.innerHTML=`<main class="book scene scene-${chapter.id} ${state.rain?'rain-on':''} ${state.rain&&state.cue!=='rain-merge'?'rain-idle':''} ${state.cloud?'cloud-open':''} ${state.melted?'snow-melted':''}" data-page="${chapter.id}" aria-label="${esc(chapter[lang])}">${background(chapter.background)}<h1 class="sr-only">${esc(chapter[lang])}</h1><div class="picture" aria-label="點畫中的物件，或用 Tab 選擇再按 Enter。${page===2?'水滴也可以拖在一起。':''}">${sceneArt(state,lang==='en')}<div class="effects" aria-hidden="true"></div></div>${navigation()}${control('back','back','上一頁 / Previous page','data-nav="back"')}${control('next','next','下一頁 / Next page','data-nav="next"')}<span class="page-number">${page+1} / 7</span><p class="subtitle" ${subtitles?'':'hidden'}>${esc(content.voices[voiceId(state.cue)])}</p></main>`;
    applyCloudOffset();
  }
  root.insertAdjacentHTML('beforeend','<dialog class="parent-panel" aria-labelledby="parent-heading"></dialog>');
  audioUI();
}
function go(index,play=true) {
  stopAudio();cancelDrag();clearTimeout(effectTimer);page=Math.max(-1,Math.min(6,index));panel=false;cloudOffset={x:0,y:0};
  state=page>=0&&page<6?newScene(content.pages[page].id):null;
  render();const focus=root.querySelector('[data-action], [data-command="start-zh"], [data-command="again"]');focus?.focus({preventScroll:true});if(play&&page>=0)speak();
}
function applyCloudOffset(){const el=root.querySelector('[data-drag="cloud"]');if(el)el.style.setProperty('--drag-x',cloudOffset.x+'px'),el.style.setProperty('--drag-y',cloudOffset.y+'px');}
function showPanel() {
  stopAudio(); panel=true;
  const dialog=root.querySelector('dialog');
  dialog.innerHTML=`<div class="panel-heading"><h2 id="parent-heading">給家長 / Grown-ups</h2>${control('close','close','關閉 / Close')}</div><p>直接碰畫裡的物件。拖曳都有點選替代操作；可以自由翻頁，沒有答題門檻。</p><div class="settings"><label><input type="checkbox" data-setting="subtitles" ${subtitles?'checked':''}> 顯示字幕</label><label><input type="checkbox" data-setting="slow" ${slow?'checked':''}> 慢慢聽（0.8 倍速）</label><button data-command="language">${lang==='en'?'換成中文':'Switch to English'}</button></div><label class="page-picker">翻到哪一頁？<select data-setting="page"><option value="-1">封面</option>${content.pages.map((p,i)=>`<option value="${i}" ${page===i?'selected':''}>${i+1} · ${p.zh} / ${p.en}</option>`).join('')}<option value="6" ${page===6?'selected':''}>7 · 下次去哪裡？</option></select></label>${page>=0? `<h3>這一頁的故事</h3><p lang="${lang==='en'?'en':'zh-Hant'}">${esc(content.voices[voiceId(currentCue())])}</p>${lang==='en'?`<p>${esc(content.voices['zh-book-'+currentCue()])}</p><button data-command="chinese">聽中文</button>`:''}`:''}${state?`<details><summary>這一頁的科學與陪玩</summary><p>${esc(content.pages[page].parent)}</p></details>`:''}<details><summary>陪玩方式、來源與 AI 說明</summary><p>適合家長陪 6 歲、9 歲中文共看；英文用短句，可獨立或陪同。讓孩子指圖或操作回應即可。可多玩幾次，隨時換頁；不用記術語。</p><p>這是原創紙張拼貼互動故事。背景圖片與預製旁白由 AI 產生，互動角色由程式繪製。水滴嚮導是虛構角色，不是水分子的樣子；水蒸氣不可見。動畫使用時間加快、放大與簡化，不能當作精確量測。雲不是裝水的袋子，水也不必走固定一圈。</p><p>切頁或切到背景會停止語音。重聽可重新播放；語音失敗時按畫面上的重試。所有故事旁白都有預先準備的稿與音檔。</p><p>科學來源：<a href="https://www.usgs.gov/water-science-school/science/evaporation-and-water-cycle" target="_blank" rel="noopener">USGS 蒸發</a>、<a href="https://www.usgs.gov/water-science-school/science/condensation-and-water-cycle" target="_blank" rel="noopener">USGS 凝結</a>、<a href="https://www.weather.gov/lmk/winter-precip" target="_blank" rel="noopener">NWS 雪</a>、<a href="https://www.noaa.gov/jetstream/hail" target="_blank" rel="noopener">NOAA 冰雹</a>。</p></details><button data-command="home">回封面</button>`;
  dialog.showModal();
  dialog.addEventListener('close',()=>{panel=false;},{once:true});
}
function effects(action) {
  const holder=root.querySelector('.effects');if(!holder)return;
  const effectAction=action.startsWith('ice-')?'ice':action;
  const positions={sun:[76,24],puddle:[49,77],cloud:[50,35],merge:[50,40],leaf:[77,76],snowflake:[48,35],mitten:[68,70],warm:[69,66],ice:[50,state.falling?74:state.ice===2?36:45],river:[58,62],soil:[79,85],pool:[23,75]};
  const [x,y]=positions[effectAction]||[50,50]; holder.style.setProperty('--fx-x',x+'%');holder.style.setProperty('--fx-y',y+'%');
  const kind=action==='merge'?'rain':effectAction==='ice'?(state.falling?'hail':'spark'):['snowflake','mitten'].includes(action)?'snow':action==='soil'?'soak':['puddle','pool','river'].includes(action)?'ripple':'spark';
  holder.className='effects effect-'+kind;
  holder.innerHTML=Array.from({length:kind==='rain'?18:kind==='snow'?12:6},(_,i)=>`<i style="--i:${i};--drift:${((i*37)%160)-80}px;--delay:${(i%6)*.12}s"></i>`).join('');
  if(action==='leaf')root.querySelector('.leaf')?.classList.add('wiggle');
  if(action==='sun')root.querySelector('.sun')?.classList.add('shining');
  clearTimeout(effectTimer);effectTimer=setTimeout(()=>{holder.innerHTML='';},5500);
}
function act(action) {
  if(!state)return;
  const focused=document.activeElement?.dataset.action;
  const puddleBefore=root.querySelector('.puddle')?.getBoundingClientRect();state=interact(state,action);render();effects(action);
  if(action==='sun'&&puddleBefore&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const water=root.querySelector('.puddle'),after=water.getBoundingClientRect();water.animate([{width:puddleBefore.width+'px',height:puddleBefore.height+'px'},{width:after.width+'px',height:after.height+'px'}],{duration:3500,easing:'ease-out',fill:'both'});}
  if(focused)root.querySelector(`[data-action="${focused}"]`)?.focus({preventScroll:true});
  speak();
}
root.addEventListener('click',event=>{
  const el=event.target.closest('button');if(!el)return;
  if((event.isTrusted&&event.detail>0&&performance.now()<touchClickUntil)||(event.detail>0&&performance.now()<swallowUntil&&el.dataset.action===swallowAction)){event.preventDefault();return;}
  if(el.dataset.action){act(el.dataset.action);return;}
  const cmd=el.dataset.command;
  if(cmd==='hello'){el.classList.remove('hello');void el.offsetWidth;el.classList.add('hello');el.classList.toggle('smiling');return;}
  if(cmd==='start-zh'||cmd==='start-en'){lang=cmd.endsWith('en')?'en':'zh';go(0);return;}
  if(cmd==='home'){go(-1,false);return;}
  if(cmd==='again'){go(0);return;}
  if(cmd==='back'){go(page-1);return;}
  if(cmd==='next'){go(page+1);return;}
  if(cmd==='menu'){showPanel();return;}
  if(cmd==='close'){root.querySelector('dialog').close();return;}
  if(cmd==='language'){lang=lang==='en'?'zh':'en';go(page<0?0:page);return;}
  if(cmd==='chinese'){speak('zh-book-'+currentCue());return;}
  if(cmd==='replay'){speak(last||voiceId(currentCue()));return;}
  if(cmd==='pause'){
    if(status==='playing'||status==='loading'){status='paused';audio.pause();audioUI();}
    else if(status==='paused')playCurrent(serial);else speak(last||voiceId(currentCue()));
  }
});
root.addEventListener('change',event=>{
  const el=event.target;
  if(el.dataset.setting==='subtitles'){subtitles=el.checked;root.querySelector('.subtitle')?.toggleAttribute('hidden',!subtitles);}
  if(el.dataset.setting==='slow'){slow=el.checked;audio.playbackRate=slow?.8:1;}
  if(el.dataset.setting==='page')go(Number(el.value));
});
root.addEventListener('pointerdown',event=>{
  const button=event.target.closest('button');
  tapCandidate=event.pointerType==='touch'&&button?{el:button,id:event.pointerId,x:event.clientX,y:event.clientY}:null;
  const el=event.target.closest('[data-drag]');if(!el||event.button!==0)return;
  drag={el,id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,dy:0,kind:el.dataset.drag};
  el.setPointerCapture(event.pointerId);
});
root.addEventListener('pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;
  drag.dx=event.clientX-drag.x;drag.dy=event.clientY-drag.y;
  if(Math.hypot(drag.dx,drag.dy)<8)return;
  drag.el.classList.add('dragging');
  const limitX=innerWidth*.24,limitY=innerHeight*.18;
  drag.el.style.setProperty('--drag-x',Math.max(-limitX,Math.min(limitX,drag.dx+(drag.kind==='cloud'?cloudOffset.x:0)))+'px');
  drag.el.style.setProperty('--drag-y',Math.max(-limitY,Math.min(limitY,drag.dy+(drag.kind==='cloud'?cloudOffset.y:0)))+'px');
});
root.addEventListener('pointerup',event=>{
  const tap=tapCandidate;tapCandidate=null;
  const activateTap=()=>{if(tap?.id===event.pointerId&&tap.el.isConnected&&Math.hypot(event.clientX-tap.x,event.clientY-tap.y)<10){const r=tap.el.getBoundingClientRect();if(event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom){touchClickUntil=performance.now()+500;tap.el.click();}}};
  if(!drag||drag.id!==event.pointerId){activateTap();return;}
  const d=drag;drag=null;if(d.el.hasPointerCapture(event.pointerId))d.el.releasePointerCapture(event.pointerId);d.el.classList.remove('dragging');
  if(Math.hypot(d.dx,d.dy)<10){activateTap();return;}
  swallowUntil=performance.now()+180;swallowAction=d.kind;
  let action=d.kind;
  if(d.kind==='cloud'){
    cloudOffset={x:Math.max(-innerWidth*.24,Math.min(innerWidth*.24,cloudOffset.x+d.dx)),y:Math.max(-innerHeight*.18,Math.min(innerHeight*.18,cloudOffset.y+d.dy))};action='cloud';
  }else if(d.kind==='merge'){
    const other=[...root.querySelectorAll('[data-drag="merge"]')].find(el=>el!==d.el);
    const a=d.el.getBoundingClientRect(),b=other.getBoundingClientRect();
    if(Math.hypot(a.x+a.width/2-b.x-b.width/2,a.y+a.height/2-b.y-b.height/2)>Math.max(a.width,b.width)*.8) {render();return;}
  }else if(d.kind==='ice'){if(d.dy<-15)action='ice-up';else if(d.dy>15)action='ice-down';else{render();return;}}
  // Keep the captured node alive until the native touch/click sequence has ended.
  const pendingState=state;setTimeout(()=>{if(state===pendingState)act(action);},40);
});
root.addEventListener('pointercancel',event=>{tapCandidate=null;if(!drag||drag.id!==event.pointerId)return;cancelDrag();swallowUntil=0;swallowAction=null;render();});
document.addEventListener('keydown',event=>{
  if(panel||event.altKey||event.ctrlKey||event.metaKey||event.target.matches('input,select'))return;
  if(event.key==='ArrowRight'&&page>=0){event.preventDefault();go(page+1);}
  if(event.key==='ArrowLeft'&&page>=0){event.preventDefault();go(page-1);}
});
render();
