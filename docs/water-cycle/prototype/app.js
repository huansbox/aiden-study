(function () {
  'use strict';
  const M=window.WaterPrototype, words=window.WATER_NARRATION;
  const $=id=>document.getElementById(id);
  const session=M.createSession();
  const audio=new Audio();audio.preload='auto';
  let audioToken=0, audioWatchdog=null, sound=true, started=false, captions=false, currentCue='intro3', pageActive=!document.hidden, interruptedVoice=null;
  const voice=M.createNarration();
  const endingReady={3:false,4:false};
  let effectContext=null, effects=[], selected=null, drag=null, scale=1, lastTime=0;
  const dropNodes=new Map(), littleDrops=[];
  const heard=new Set();
  function stopAudio(){audioToken++;clearTimeout(audioWatchdog);audio.onended=audio.onerror=audio.onloadedmetadata=null;M.clearNarration(voice);audio.pause();audio.removeAttribute('src');audio.load();}
  function stopEffects(){for(const source of effects){try{source.stop();}catch{}}effects=[];}
  function stopAll(){stopAudio();stopEffects();}
  function showCue(id){
    currentCue=id;$('subtitle').textContent=words[id];$('status').textContent=words[id];
    if(id==='cloudNext')endingReady[3]=true;
    if(id==='rainNext')endingReady[4]=true;
    renderEnding();
  }
  function playCue(id){
    audio.pause();clearTimeout(audioWatchdog);const token=++audioToken;showCue(id);
    const failed=()=>{if(token!==audioToken)return;audio.pause();captions=true;updateControls();finishCue(token);};
    // Broken, stalled or rejected audio must not hide the next-page invitation.
    audioWatchdog=setTimeout(failed,30000);
    audio.onended=()=>finishCue(token);audio.onerror=failed;
    audio.onloadedmetadata=()=>{
      if(token!==audioToken||!Number.isFinite(audio.duration))return;
      clearTimeout(audioWatchdog);audioWatchdog=setTimeout(failed,(audio.duration+3)*1000);
    };
    audio.src='assets/audio/'+id+'.mp3?v=20261023-endings1';
    audio.play().catch(failed);
  }
  function speak(id){
    if(!started||!sound||document.hidden||!pageActive){stopAudio();showCue(id);return;}
    const next=M.requestNarration(voice,id);if(next)playCue(next);
  }
  function finishCue(token){
    if(token!==audioToken)return;
    audioToken++;
    clearTimeout(audioWatchdog);audio.onended=audio.onerror=audio.onloadedmetadata=null;
    const next=M.finishNarration(voice);if(next)playCue(next);else revealCompleted();
  }
  function revealCompleted(){for(const scene of [3,4])if(M.pageComplete(session,scene))endingReady[scene]=true;renderEnding();}
  function narrationSnapshot(){return {cue:currentCue,pending:[...voice.pending]};}
  function repeatNarration(saved=narrationSnapshot()){
    const story=session.scene===3?['condense','cloudNext']:session.scene===4?['heroFall','reunion','rainNext']:[];
    const pending=saved.pending.filter(id=>story.includes(id));
    // Reconstruct required continuations even if a mute or lifecycle stop cleared
    // the queue. Replaying one sentence must not erase the story's next beat.
    if(session.scene===3&&session.wind.phase==='cloud'&&saved.cue!=='cloudNext')pending.push('cloudNext');
    if(session.scene===4&&session.rain.heroLanded){
      if(saved.cue==='heroFall')pending.push('reunion');
      if(saved.cue!=='rainNext')pending.push('rainNext');
    }
    stopAll();speak(saved.cue);
    for(const id of story)if(pending.includes(id)&&id!==saved.cue)speak(id);
  }
  function unlockEffects(){
    if(!sound)return;
    try{
      effectContext ||= new (window.AudioContext||window.webkitAudioContext)();
      // Must run synchronously inside the start/sound/listen click gesture.
      effectContext.resume().catch(()=>{});
    }catch{/* Narration remains usable without WebAudio. */}
  }
  function effect(kind){
    if(!sound||!started||document.hidden||!pageActive||effectContext?.state!=='running')return;
    try{
      const oscillator=effectContext.createOscillator(),gain=effectContext.createGain();
      oscillator.connect(gain);gain.connect(effectContext.destination);
      const now=effectContext.currentTime;
      oscillator.type='sine';oscillator.frequency.setValueAtTime(kind==='splash'?480:720,now);
      oscillator.frequency.exponentialRampToValueAtTime(kind==='splash'?80:370,now+.22);
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.12,now+.02);gain.gain.exponentialRampToValueAtTime(.0001,now+.38);
      oscillator.start();oscillator.stop(now+.4);effects.push(oscillator);
      oscillator.onended=()=>{effects=effects.filter(source=>source!==oscillator);};
    }catch{/* Narration remains usable without WebAudio. */}
  }
  function updateControls(){
    $('sound').textContent=sound?'聲音 開':'聲音 關';$('sound').setAttribute('aria-label',sound?'關閉聲音':'開啟聲音');$('sound').setAttribute('aria-pressed',sound);
    $('captions').setAttribute('aria-pressed',captions);$('captions').setAttribute('aria-label',captions?'隱藏字幕':'顯示字幕');$('subtitle').hidden=!captions;
    $('previous').disabled=session.scene===3;$('next').disabled=session.scene==='end';$('page-number').textContent=session.scene===3?'③':session.scene===4?'④':'END';
    $('next').setAttribute('aria-label',session.scene===3?'下一幕：一起進雲裡':'下一頁：試玩結尾');
    $('replay').hidden=session.scene==='end';
  }
  function resize(){
    const w=window.innerWidth,h=window.innerHeight;scale=Math.min(w/1200,h/800);
    $('world').style.transform=`translate(${(w-1200*scale)/2}px,${(h-800*scale)/2}px) scale(${scale})`;
    render();
  }
  function point(event){const r=$('world').getBoundingClientRect();return{x:(event.clientX-r.left)/scale,y:(event.clientY-r.top)/scale};}
  function cancelDrag(restore=true){
    if(drag){
      if(restore&&drag.kind==='drop')M.moveDrop(session.rain,drag.id,drag.fromX,drag.fromY);
      if(restore&&drag.kind==='wind'&&session.wind.phase==='air'){
        // Cancellation restores both position and cooling history; it is not a route choice.
        Object.assign(session.wind,drag.windBefore);
        if(session.wind.environment!=='cool'&&voice.active==='cool')stopAudio();
      }
      if(drag.element.hasPointerCapture?.(drag.pointerId))drag.element.releasePointerCapture(drag.pointerId);
      drag=null;
    }
    selected=null;render();
  }
  function start(){unlockEffects();if(started)return;started=true;$('start-cover').hidden=true;session.visited[session.scene]=true;speak(sceneIntro());lastTime=performance.now();}
  function sceneIntro(){
    if(session.scene==='end')return session.rain.heroLanded?'endReunion':'endWaiting';
    if(session.scene===3)return session.wind.phase==='cloud'?'cloudNext':session.wind.phase==='air'?(session.wind.environment==='cool'?'cool':'intro3'):'condense';
    return session.rain.heroLanded?'rainNext':M.rainIntro(session.rain,session.wind.phase==='cloud');
  }
  function changeScene(scene){
    if(scene===session.scene)return;
    cancelDrag();stopAll();interruptedVoice=null;M.setScene(session,scene);
    if(scene===3&&session.wind.phase==='air'&&session.wind.environment==='cool')session.wind.coldMs=0;
    $('scene3').hidden=scene!==3;$('scene4').hidden=scene===3;
    revealCompleted();session.visited[scene]=true;speak(sceneIntro());updateControls();render();lastTime=performance.now();
  }
  function windEvents(events){for(const event of events){if(event==='cloud'){speak('cloudNext');continue;}if(event==='leaveCool'){if(voice.active==='cool')stopAudio();continue;}speak(event);}}
  function moveWind(x,y,settled=false){windEvents(M.moveWind(session.wind,x,y));if(settled)windEvents(M.settleWind(session.wind));render();}
  function chooseDrop(id){
    if(session.scene!==4||!M.movable(session.rain,id))return;
    if(selected&&selected!==id){if(M.beginMerge(session.rain,selected,id))selected=null;}
    else selected=selected===id?null:id;
    render();
  }
  function beginPointer(event,kind,id){
    if(!started||session.scene==='end'||event.button!==0||drag)return;
    event.preventDefault();
    const p=point(event), d=kind==='wind'?session.wind:M.movable(session.rain,id);
    if(!d||kind==='wind'&&d.phase!=='air')return;
    drag={kind,id,pointerId:event.pointerId,element:event.currentTarget,origin:p,fromX:d.x,fromY:d.y,windBefore:kind==='wind'?{...d}:null,moved:false,offsetX:p.x-d.x,offsetY:p.y-d.y};
    event.currentTarget.setPointerCapture(event.pointerId);render();
  }
  function pointerMove(event){
    if(!drag||drag.pointerId!==event.pointerId)return;
    const p=point(event);
    if(Math.hypot(p.x-drag.origin.x,p.y-drag.origin.y)*scale>7)drag.moved=true;
    if(!drag.moved)return;
    if(drag.kind==='wind')moveWind(p.x-drag.offsetX,p.y-drag.offsetY);
    else{M.moveDrop(session.rain,drag.id,p.x-drag.offsetX,p.y-drag.offsetY);render();}
  }
  function pointerUp(event){
    if(!drag||drag.pointerId!==event.pointerId)return;
    const done=drag;drag=null;
    if(done.element.hasPointerCapture(event.pointerId))done.element.releasePointerCapture(event.pointerId);
    if(!done.moved){if(done.kind==='wind')selected=selected==='wind'?null:'wind';else chooseDrop(done.id);}
    else if(done.kind==='drop'){const hit=M.collision(session.rain,done.id);if(hit)M.beginMerge(session.rain,done.id,hit);selected=null;}
    else {selected=null;windEvents(M.settleWind(session.wind));}
    render();
  }
  function setupPointer(element,kind,id){
    element.addEventListener('pointerdown',event=>beginPointer(event,kind,id));
    element.addEventListener('click',event=>{if(event.detail!==0)return;if(kind==='wind'){selected=selected==='wind'?null:'wind';render();}else chooseDrop(id);});
  }
  setupPointer($('wind'),'wind');
  window.addEventListener('pointermove',pointerMove);window.addEventListener('pointerup',pointerUp);
  window.addEventListener('pointercancel',()=>cancelDrag());
  $('world').addEventListener('click',event=>{
    if(!started||session.scene!==3||selected!=='wind'||event.target.closest('button'))return;
    const p=point(event);moveWind(p.x,p.y,true);selected=null;render();
  });
  for(const [id,x,y]of[['warm-place',460,420],['cool-place',850,300]])$(id).addEventListener('click',()=>{if(selected==='wind'){moveWind(x,y,true);selected=null;render();}});
  $('start').addEventListener('click',start);
  $('sound').addEventListener('click',()=>{sound=!sound;if(sound){unlockEffects();if(!started)start();else repeatNarration();}else{stopAll();revealCompleted();}updateControls();});
  $('listen').addEventListener('click',()=>{unlockEffects();if(!started)start();else repeatNarration();});
  $('captions').addEventListener('click',()=>{captions=!captions;updateControls();});
  $('previous').addEventListener('click',()=>changeScene(session.scene==='end'?4:3));$('next').addEventListener('click',()=>changeScene(session.scene===3?4:'end'));
  $('continue').addEventListener('click',()=>changeScene(session.scene===3?4:'end'));
  $('back-to-cloud').addEventListener('click',()=>changeScene(4));
  $('restart-story').addEventListener('click',()=>{
    cancelDrag();stopAll();interruptedVoice=null;Object.assign(session,M.createSession());endingReady[3]=endingReady[4]=false;heard.clear();
    $('scene3').hidden=false;$('scene4').hidden=true;speak(sceneIntro());updateControls();render();lastTime=performance.now();
  });
  $('replay').addEventListener('click',()=>{cancelDrag();stopAll();interruptedVoice=null;M.replayScene(session);endingReady[session.scene]=false;for(const cue of [...heard])if(cue.startsWith(session.scene+':'))heard.delete(cue);speak(sceneIntro());render();lastTime=performance.now();});
  window.addEventListener('keydown',event=>{
    if(event.key==='Escape'){cancelDrag();return;}
    if(event.key==='ArrowRight'&&selected!=='wind'){changeScene(session.scene===3?4:'end');return;}
    if(event.key==='ArrowLeft'&&selected!=='wind'){changeScene(session.scene==='end'?4:3);return;}
    if(selected==='wind'&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){
      event.preventDefault();moveWind(session.wind.x+({ArrowLeft:-70,ArrowRight:70}[event.key]||0),session.wind.y+({ArrowUp:-70,ArrowDown:70}[event.key]||0));
    }
  });
  window.addEventListener('keyup',event=>{if(selected==='wind'&&event.key.startsWith('Arrow'))windEvents(M.settleWind(session.wind));});
  function onHidden(){
    if(!pageActive)return;
    pageActive=false;cancelDrag();interruptedVoice=voice.active?narrationSnapshot():null;stopAll();revealCompleted();lastTime=0;
  }
  function onVisible(){
    if(document.hidden||pageActive)return;
    pageActive=true;lastTime=performance.now();
    const saved=interruptedVoice;interruptedVoice=null;
    if(!started)return;
    if(session.scene===3&&session.wind.phase==='air'&&session.wind.environment==='cool'){
      session.wind.coldMs=0;speak('cool');
    }else if(saved)repeatNarration(saved);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)onHidden();else onVisible();});
  window.addEventListener('pageshow',onVisible);
  window.addEventListener('pagehide',onHidden);window.addEventListener('blur',()=>cancelDrag());
  const offsets=[[-112,-52],[1,-70],[110,-40],[-135,30],[-65,73],[70,70],[145,35],[0,20]];
  offsets.forEach(([x,y],i)=>{const node=document.createElement('div');node.className='sprite small-drop'+(i===7?' hero':'');$('condensed-drops').append(node);littleDrops.push({node,x,y});});
  function renderWind(){
    const w=session.wind,visible=w.phase!=='air';
    $('tracking-ring').style.left=w.x+'px';$('tracking-ring').style.top=w.y+'px';$('tracking-ring').style.opacity=visible?0:1;
    $('wind').style.left=(w.x+55)+'px';$('wind').style.top=(w.y+105)+'px';$('wind').hidden=visible;$('wind').classList.toggle('held',drag?.kind==='wind');$('wind').setAttribute('aria-pressed',selected==='wind');
    $('bird3').classList.toggle('cold',w.environment==='cool'&&!visible);$('scene3').querySelector('.cool-lines').classList.toggle('active',w.environment==='cool');
    const cx=Math.max(470,Math.min(930,w.x)),cy=Math.max(235,Math.min(470,w.y));
    $('formed-cloud').style.left=cx+'px';$('formed-cloud').style.top=cy+'px';$('formed-cloud').classList.toggle('show',w.phase==='cloud');
    for(const d of littleDrops){d.node.style.left=(cx+d.x)+'px';d.node.style.top=(cy+d.y)+'px';d.node.classList.toggle('show',visible);}
    for(const id of ['warm-place','cool-place']){$(id).tabIndex=selected==='wind'?0:-1;$(id).classList.toggle('chosen',selected==='wind');}
  }
  function renderRain(){
    const r=session.rain,alive=new Set();
    for(const d of r.drops){
      alive.add(d.id);let node=dropNodes.get(d.id);
      if(!node){node=document.createElement('button');node.innerHTML='<span class="sprite"></span>';node.dataset.drop=d.id;setupPointer(node,'drop',d.id);$('rain-drops').append(node);dropNodes.set(d.id,node);}
      const fraction=d.status==='growing'?Math.min(1,d.age/700):1;
      const volume=d.status==='growing'?d.fromVolume+(d.volume-d.fromVolume)*fraction:d.volume;
      const size=M.radius(volume)*2.2,hitSize=Math.max(size,48/scale);
      node.className='drop '+d.status+(d.hero?' hero':'')+(drag?.id===d.id?' held':'');
      node.style.left=d.x+'px';node.style.top=d.y+'px';node.style.width=hitSize+'px';node.style.height=hitSize+'px';node.style.setProperty('--delay',(-Number(d.id.slice(1))*.4)+'s');
      const picture=node.firstElementChild;picture.style.width=size+'px';picture.style.height=size+'px';picture.style.position='absolute';picture.style.left=(hitSize-size)/2+'px';picture.style.top=(hitSize-size)/2+'px';
      node.disabled=session.scene==='end'||d.status!=='floating';node.setAttribute('aria-pressed',selected===d.id);node.setAttribute('aria-label',(d.hero?'金星小滴':'水滴朋友')+'，'+(d.volume===1?'小小的':d.volume<4?'變大了一點':'大水滴')+(session.scene==='end'?'。還沒到地面':'。選它再選朋友，或拖去碰另一滴'));
    }
    for(const [id,node]of dropNodes)if(!alive.has(id)){node.remove();dropNodes.delete(id);}
    const fallingHero=r.drops.find(d=>d.hero&&d.status==='falling')||r.landed.find(d=>d.hero);
    $('bird4').classList.toggle('follow',!!fallingHero);
    $('bird4').style.left=fallingHero?Math.max(20,Math.min(930,fallingHero.x-210))+'px':'';
    $('ripples').replaceChildren();
    for(const d of r.landed){
      const puddle=document.createElement('div');puddle.className='puddle'+(d.hero?' hero-puddle':'');puddle.dataset.landed=d.id;puddle.dataset.volume=d.volume;
      puddle.style.left=d.x+'px';puddle.style.top='734px';puddle.style.width=(68*Math.sqrt(d.volume))+'px';puddle.style.height=(18*Math.sqrt(d.volume))+'px';$('ripples').append(puddle);
      if(d.age<3500){const ripple=document.createElement('div');ripple.className='ripple';ripple.style.left=d.x+'px';ripple.style.top='729px';ripple.style.opacity=Math.max(0,1-d.age/3500);ripple.style.width=(80+d.age*.045)+'px';$('ripples').append(ripple);}
      if(d.hero){const hero=document.createElement('div');hero.className='sprite landed-hero';hero.style.left=d.x+'px';hero.style.top='730px';$('ripples').append(hero);}
    }
  }
  function renderEnding(){
    const scene=session.scene,isEnd=scene==='end',state=M.endingState(session.rain);
    $('page-ending').hidden=!started||isEnd||!endingReady[scene]||!M.pageComplete(session,scene);
    $('page-ending-copy').textContent=scene===3?'小滴和朋友們，變成一朵雲了。':'小滴落地了，小麻雀也找到它了。';
    $('continue').textContent=scene===3?'下一頁：一起進雲裡':'下一頁：跟小滴到地面';
    $('end-panel').hidden=!isEnd;
    $('end-story').textContent=state.complete?'小滴和小麻雀重逢了。': '金星小滴還沒到地面，回雲裡可以繼續幫忙。';
    $('end-water').textContent=state.landed?'落下的水，留在下面的水窪裡。':'還沒有水滴落到地面。';
    $('end-remaining').hidden=!state.complete||!state.remaining;
    $('book').classList.toggle('at-end',isEnd);
    $('book').classList.toggle('rain-page',scene!==3);
  }
  function render(){renderWind();renderRain();renderEnding();}
  function rainEvents(events){
    for(const event of events){
      if(event.type==='merge'){
        effect('merge');if(event.volume<M.RAIN_VOLUME&&!heard.has('4:merge')){heard.add('4:merge');speak('merge');}
      }
      if(event.type==='fall'){
        if(event.hero)speak('heroFall');
        else if(!session.rain.heroLanded&&!session.rain.drops.some(d=>d.hero&&d.status==='falling'))speak('normalFall');
        else speak('rain');
      }
      if(event.type==='small'&&!heard.has('4:small')){heard.add('4:small');speak('small');}
      if(event.type==='land'){effect('splash');if(event.hero){speak('reunion');speak('rainNext');}}
      if(event.type==='refill')speak('refill');
    }
  }
  function frame(now){
    const dt=lastTime?Math.min(now-lastTime,80):0;lastTime=now;
    if(started&&!document.hidden&&pageActive){if(session.scene===3)windEvents(M.tickWind(session.wind,dt,voice.active!=='cool'));else if(session.scene===4)rainEvents(M.tickRain(session.rain,dt));render();}
    requestAnimationFrame(frame);
  }
  window.addEventListener('resize',resize);updateControls();resize();requestAnimationFrame(frame);
})();
