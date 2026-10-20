import { newExperiment, act } from './model.mjs';
import { icon, sceneArt } from './art.mjs';

const root = document.querySelector('#app');
const content = await fetch('./content.json').then(r => { if (!r.ok) throw Error('content'); return r.json(); }).catch(() => null);
if (!content) { root.innerHTML = '<p class="loading">故事還沒載入，請重新整理頁面。</p>'; throw Error('Story content unavailable'); }
const escape = text => String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
let mode = null, page = 0, experiment = null, visited = new Set(), support = false, turn = 1;
const audio = new Audio();
audio.preload = 'none';
let queue = [], last = ['zh-home'], status = 'idle', slow = false, playSerial = 0;
let helpHold = null, helpGesture = null, suppressClick = null;
function audioUI() {
  for (const el of document.querySelectorAll('[data-audio-status]')) {
    el.textContent = status === 'playing' ? (mode === 'en' ? 'Listening…' : '正在說故事……') : status === 'loading' ? '聲音載入中……可以先暫停。' : status === 'paused' ? '已暫停，按播放繼續' : status === 'error' ? '聲音未開始，請按「再聽一次」；也可先看圖繼續。' : '按喇叭，再聽一次';
    el.classList.toggle('audio-error', status === 'error');
  }
  const pause = document.querySelector('[data-command="pause"]');
  if (pause) { pause.innerHTML = `${icon(status === 'paused' ? 'play' : 'pause')}<span>${status === 'paused' ? '繼續' : '暫停'}</span>`; pause.setAttribute('aria-label', status === 'paused' ? '繼續語音' : '暫停語音'); }
  document.querySelector('[data-command="slow"]')?.setAttribute('aria-pressed', String(slow));
  const welcomeLabel = document.querySelector('[data-command="welcome"] span');
  if (welcomeLabel) welcomeLabel.textContent = status === 'error' ? '再聽一次' : '先聽怎麼玩';
}
function stopAudio() { playSerial++; queue = []; audio.pause(); audio.removeAttribute('src'); audio.load(); status = 'idle'; audioUI(); }
async function nextClip(serial) {
  if (serial !== playSerial) return;
  if (!queue.length) { status = 'idle'; audioUI(); return; }
  audio.src = `assets/audio/${queue.shift()}.mp3`;
  audio.playbackRate = slow ? .8 : 1;
  status = 'loading'; audioUI();
  try { await audio.play(); if (serial === playSerial && status !== 'paused') { status = 'playing'; audioUI(); } }
  catch { if (serial === playSerial && status !== 'paused') { status = 'error'; queue = []; audioUI(); } }
}
function speak(ids) {
  const requested = Array.isArray(ids) ? ids : [ids];
  stopAudio(); last = requested; queue = [...requested];
  nextClip(playSerial);
}
audio.addEventListener('ended', () => nextClip(playSerial));
audio.addEventListener('error', () => { if (audio.getAttribute('src')) { status = 'error'; queue = []; audioUI(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearHelpGesture(); suppressClick=null; stopAudio(); } });
window.addEventListener('pagehide', stopAudio);
function button(command, symbol, label, voice, extra = '') {
  return `<button type="button" data-command="${command}" ${voice ? `data-voice="zh-${voice}"` : ''} ${extra}>${icon(symbol)}<span>${escape(label)}</span></button>`;
}
function controls() {
  return `<div class="audio-controls" role="group" aria-label="語音控制">${button('replay','sound','再聽一次','replay')}${button('pause','pause','暫停','pause')}${button('slow','slow','慢慢聽','slow','aria-pressed="false"')}</div>`;
}
function home() {
  stopAudio(); mode = null; visited = new Set(); support = false;
  document.documentElement.lang = 'zh-Hant';
  root.innerHTML = `<main class="home"><div class="home-art" aria-hidden="true"></div><div class="home-paper"><p class="eyebrow">WATER · A WORLD OF PATHS</p><h1>一滴水的<span>旅行</span></h1><p class="home-lead">跟著水，看看世界。<br>一起猜、動手試，再發現一件事。</p><div class="home-listen">${button('welcome','sound','先聽怎麼玩','home')}<p data-audio-status role="status"></p></div><div class="mode-picks"><button data-command="start-zh" data-voice="zh-start" class="mode-pick">${icon('people')}<span><strong>一起探索</strong><small>中文故事 · 親子輪流玩</small></span>${icon('next')}</button><button data-command="start-en" data-voice="zh-explore" class="mode-pick advanced">${icon('search')}<span><strong>深入研究</strong><small>English · Look, try, compare</small></span>${icon('next')}</button></div><p class="tiny">6 個小故事，可自由選站、隨時回頭。<br>長按後放開，或聚焦後按 F1，可聽中文操作說明。</p></div><details class="parent-info"><summary>給家長：怎麼陪玩、科學與語音說明</summary><div><p>兩個孩子先各自猜一猜，再輪流操作。可以指圖回答，不必說出術語或念英文。英文以短句為起點；是否適合孩子仍需試玩觀察。</p><p>畫面採用放大、時間加快和簡化模型。水蒸氣不可見；小點是示意。雪由冰晶長大，經暖層可能融化。冰雹情境簡化為雲內成長，不是天氣預報。水滴嚮導是故事角色。</p><p>旁白為 AI 合成語音。可重播、暫停、以 0.8 倍速播放；切頁、回首頁或切到背景會停止。若聲音未開始，請按再聽一次，並檢查連線與裝置音量。可在沒有聲音時繼續操作；6 歲孩子請由家長陪同。</p><p>查核來源：<a href="https://www.usgs.gov/water-science-school/science/evaporation-and-water-cycle" target="_blank" rel="noopener">USGS 蒸發</a>、<a href="https://www.usgs.gov/water-science-school/science/condensation-and-water-cycle" target="_blank" rel="noopener">USGS 凝結</a>、<a href="https://www.weather.gov/lmk/winter-precip" target="_blank" rel="noopener">NWS 雨雪</a>、<a href="https://www.noaa.gov/jetstream/hail" target="_blank" rel="noopener">NOAA 冰雹</a>。</p></div></details></main>`;
}
function header() {
  return `<header class="topbar">${button('home','home','首頁','home-control')}<a class="brand" href="#" data-command="home">一滴水的旅行<small>${mode === 'en' ? 'LOOK · TRY · COMPARE' : '一起探索 · 輪流發現'}</small></a>${controls()}</header>`;
}
function map() {
  return `<nav class="journey-map" aria-label="六站旅行地圖">${content.scenes.map((scene, i) => `<button data-command="scene-${i}" data-voice="zh-map" aria-label="第 ${i+1} 站：${scene.zh}${visited.has(scene.id) ? '，已探索' : ''}" ${page===i ? 'aria-current="step"' : ''}>${icon(scene.icon)}<span class="map-word">${mode === 'en' ? ['Puddle','Cloud','Rain','Snow','Hail','Paths'][i] : ['水窪','雲','雨','雪','冰雹','水的路'][i]}</span><span class="map-number">${visited.has(scene.id) ? '✓' : i+1}</span></button>`).join('')}</nav>`;
}
function go(index, autoplay = true) {
  stopAudio(); page = Math.max(0,Math.min(6,index)); support = false;
  if (page < 6) experiment = newExperiment(content.scenes[page].id);
  render();
  root.querySelector('h1')?.focus({ preventScroll: true });
  if (autoplay) speak([`${mode}-${page===6?'review':experiment.cue}`,...(mode==='en'&&page===4?['en-hail-compare']:[])]);
}
function availableActions(scene) {
  if (mode === 'en' && scene.id === 'evap' && experiment.reveal) {
    return experiment.compareStarted ? scene.advanced.actions : scene.advanced.actions.filter(a=>a.id==='compare');
  }
  return scene.actions.filter(a=>scene.id!=='evap' || a.id !== (experiment.time ? 'time' : 'look'));
}
function trialRecord() {
  if (mode !== 'en' || experiment.scene !== 'hail') return '';
  return `<section class="trial-record" aria-label="Four combinations: wind and supercooled drops"><button data-command="comparison-help" data-voice="zh-hail-compare">What is missing? ${icon('sound')}</button><div class="trial-grid">${['00','10','01','11'].map(key=>{
    const tried=Object.hasOwn(experiment.hailTrials,key), grew=experiment.hailTrials[key];
    const meaning=`${key[0]==='1'?'Strong':'No'} updraft; ${key[1]==='1'?'with':'no'} supercooled drops; ${tried?(grew?'ice grew':'ice did not grow'):'not tried yet'}`;
    return `<div class="trial" aria-label="${meaning}"><span class="trial-pair"><span class="${key[0]==='1'?'present':'absent'}">${icon('up')}</span><span class="${key[1]==='1'?'present':'absent'}">${icon('coldDrop')}</span></span><strong class="trial-result ${tried?'tried':''}">${tried?(grew?'✓':'×'):'?'}</strong></div>`;
  }).join('')}</div><p>↑ updraft · drops · ✓ grows · × cannot grow</p></section>`;
}
function render() {
  if (page === 6) return review();
  const scene = content.scenes[page];
  const currentText = content.voices[`${mode}-${experiment.cue}`];
  const actions = availableActions(scene);
  root.innerHTML = `<div class="story">${header()}<main class="story-main"><div class="chapter-heading"><p class="eyebrow">${mode === 'en' ? 'A DROP’S JOURNEY' : '水的六站旅行'} · ${String(page+1).padStart(2,'0')} / 06</p><h1 tabindex="-1">${escape(scene[mode])}</h1>${mode==='zh'?`<span class="turn">${icon('people')}<span>輪流操作<br><strong>${turn === 1 ? '第一位' : '第二位'}</strong></span></span>`:'<span class="turn predict">Predict · Try · Compare</span>'}</div><div class="workbench"><section class="stage" aria-label="互動科學圖解">${sceneArt(experiment,mode==='en')}<span class="paper-corner" aria-hidden="true"></span><div class="actions" role="group" aria-label="動手試試">${actions.map(a=>`<button data-action="${a.id}" data-voice="zh-${a.voice}" ${['wind','water'].includes(a.id) ? `aria-pressed="${experiment[a.id]}"` : ''} class="action ${experiment.air===a.id||experiment.path===a.id ? 'selected' : ''}">${icon(a.icon)}<span>${escape(a[mode])}</span>${['wind','water'].includes(a.id)&&experiment[a.id]?'<b class="check" aria-label="已準備">✓</b>':''}</button>`).join('')}</div></section><aside class="narrative ${mode==='en'&&scene.id==='hail'?'has-trials':''}"><div class="narrative-number">${String(page+1).padStart(2,'0')}</div><p class="narrative-kicker">${experiment.complete ? (mode==='en'?'LOOK WHAT HAPPENED':'看看發生什麼事') : (mode==='en'?'LISTEN & TRY':'先聽聽，再試試')}</p><p class="spoken" lang="${mode==='en'?'en':'zh-Hant'}" aria-live="polite">${escape(currentText)}</p>${trialRecord()}<div class="voice-state"><span class="voice-dot" aria-hidden="true"></span><span data-audio-status role="status"></span></div>${button('instruction','sound',mode==='en'?'操作提示':'聽操作提示',null,'class="instruction"')}${mode==='en' ? button('support','help','中文小幫手','help',`class="support-toggle" aria-expanded="${support}"`) : ''}${support?`<div class="support-content"><p>${escape(content.voices[`zh-${experiment.cue}`])}</p><dl>${scene.words.map(([en,zh])=>`<div><dt>${escape(en)}</dt><dd>${escape(zh)}</dd></div>`).join('')}</dl><p>${escape(scene.support)}</p></div>`:''}</aside></div><div class="story-bottom">${button('back','back','上一站','back',page===0?'disabled':'')}${button('reset','replay','再試一次','reset','class="reset"')}<p class="free-path">${experiment.complete ? (mode==='en'?'Try another way, or keep going.':'換個方法再試試，或繼續旅行。') : (mode==='en'?'Take your time. You can visit any stop.':'慢慢試，隨時可以換一站。')}</p>${button('next','next',page===5?'旅行回顧':'下一站',page===5?'finish':'next','class="next"')}</div>${map()}</main><p class="control-tip">長按後放開聽中文說明 · 鍵盤聚焦後按 F1</p></div>`;
  audioUI();
}
function review() {
  root.innerHTML = `<div class="story">${header()}<main class="review"><p class="eyebrow">MANY PATHS · ONE WORLD</p><h1>${mode==='en'?'Water has many paths.':'水的旅行，有好多條路。'}</h1><p class="review-intro">${mode==='en'?'Choose a stop. Tell the story with the pictures.':'選一張圖，輪流說說你發現的事。也可以指圖回答。'}</p><div class="review-paths">${content.scenes.map((s,i)=>`<button data-command="scene-${i}" data-voice="zh-map">${icon(s.icon)}<small>0${i+1}</small><strong>${escape(mode==='en'?s.words.at(-1)[0]:['看不見的水','小水滴聚成雲','水滴長大落下','雪花可能融化','兩個成長條件','不同的路線'][i])}</strong><span>${visited.has(s.id)?'已探索 · 再玩一次':'選這一站'}</span></button>`).join('')}</div><p class="review-text" lang="${mode==='en'?'en':'zh-Hant'}">${escape(content.voices[`${mode}-review`])}</p><p data-audio-status role="status"></p><div class="review-footer">${button('home','home','回首頁，換個版本','home-control')}${button('scene-0','replay','再旅行一次','restart')}</div></main></div>`;
  audioUI();
}
function start(language) { mode = language; visited = new Set(); turn=1; go(0); }
root.addEventListener('click', event => {
  const el = event.target.closest('button, [data-command]');
  if (!el || el.disabled) return;
  const suppress = event.detail > 0 && suppressClick?.el === el;
  suppressClick = null;
  if(suppress) { event.preventDefault(); return; }
  event.preventDefault();
  const command = el.dataset.command;
  if(el.dataset.action) {
    experiment = act(experiment,el.dataset.action);
    if(experiment.complete) visited.add(experiment.scene);
    turn=turn===1?2:1;
    const actionId = el.dataset.action;
    render(); root.querySelector(`[data-action="${actionId}"]`)?.focus({ preventScroll: true }); speak(`${mode}-${experiment.cue}`); return;
  }
  if(command==='home') return home();
  if(command==='start-zh') return start('zh');
  if(command==='start-en') return start('en');
  if(command==='welcome') return speak('zh-home');
  if(command?.startsWith('scene-')) return go(Number(command.slice(6)));
  if(command==='next') return go(page+1);
  if(command==='back') return go(page-1);
  if(command==='reset') return go(page);
  if(command==='replay') return speak(last);
  if(command==='slow') { slow=!slow; audio.playbackRate=slow ? 0.8 : 1; audioUI(); return; }
  if(command==='pause') {
    if(status==='playing'||status==='loading') { status='paused'; audio.pause(); audioUI(); }
    else if(status==='paused') {
      const serial=playSerial;status='loading';audioUI();
      audio.play().then(()=>{if(serial===playSerial&&status!=='paused'){status='playing';audioUI();}}).catch(()=>{if(serial===playSerial&&status!=='paused'){status='error';audioUI();}});
    }
    else speak(last);
    return;
  }
  if(command==='instruction') return speak(availableActions(content.scenes[page]).map(a=>`zh-${a.voice}`));
  if(command==='comparison-help') return speak('en-hail-compare');
  if(command==='support') { support=!support; render(); root.querySelector('[data-command="support"]')?.focus({preventScroll:true}); if(support) speak(`zh-${experiment.cue}`); }
});
function clearHelpGesture() {
  clearTimeout(helpHold); helpHold=null;
  helpGesture?.el.classList.remove('help-ready'); helpGesture=null;
}
function isInside(el,x,y) {
  const r=el.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
}
root.addEventListener('pointerdown',event=> {
  clearHelpGesture(); suppressClick=null;
  const el=event.target.closest('[data-voice]');
  if(!el||el.disabled||event.button!==0) return;
  helpGesture={el,id:event.pointerId,x:event.clientX,y:event.clientY,ready:false};
  helpHold=setTimeout(()=>{if(helpGesture?.el===el){helpGesture.ready=true;el.classList.add('help-ready');}},650);
});
root.addEventListener('pointermove',event=> {
  if(!helpGesture||event.pointerId!==helpGesture.id)return;
  if(!isInside(helpGesture.el,event.clientX,event.clientY)||Math.hypot(event.clientX-helpGesture.x,event.clientY-helpGesture.y)>12)clearHelpGesture();
});
root.addEventListener('pointerout',event=>{if(helpGesture&&!helpGesture.el.contains(event.relatedTarget))clearHelpGesture();});
root.addEventListener('pointercancel',()=>{clearHelpGesture();suppressClick=null;});
root.addEventListener('pointerleave',clearHelpGesture);
root.addEventListener('pointerup',event=> {
  const gesture=helpGesture;
  const ready=gesture&&gesture.id===event.pointerId&&gesture.ready&&gesture.el.isConnected&&isInside(gesture.el,event.clientX,event.clientY);
  clearHelpGesture();
  if(ready){suppressClick={el:gesture.el};speak(gesture.el.dataset.voice);}
});
root.addEventListener('contextmenu',event=>{if(event.target.closest('[data-voice]'))event.preventDefault();});
root.addEventListener('keydown', event=>{if(event.key==='F1'&&event.target.dataset.voice){event.preventDefault();speak(event.target.dataset.voice);}});
home();
