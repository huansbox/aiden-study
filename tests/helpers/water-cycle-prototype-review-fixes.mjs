// Focused regressions for replayed story continuations, caption placement and
// resumed cooling. Uses the caller's server and existing browser installation.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PLAYWRIGHT_PACKAGE||'playwright');
const base=process.env.WATER_PROTOTYPE_URL||'http://127.0.0.1:8795/water-cycle/prototype/';
assert.match(base,/^(file:\/\/\/|http:\/\/127\.0\.0\.1:\d+\/water-cycle\/prototype\/)/);
assert.ok(process.env.OUTPUT_DIR,'Set OUTPUT_DIR for QA evidence.');
const output=resolve(process.env.OUTPUT_DIR);await mkdir(output,{recursive:true});
const report={base,results:[],limits:['Real HTMLAudioElement media plays at volume 0: decoding and ended events, not human listening.','Lifecycle events are dispatched with a controlled document.hidden value; this is not an OS background or iPad test.','Chromium viewports are desktop/touch emulation, not physical-device validation.']};
const browser=await chromium.launch({headless:true});
async function setup(mode='audio'){
  const context=await browser.newContext({viewport:{width:1024,height:768},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(mode=>{
    window.__qa={audio:[],instances:0};
    window.Audio=new Proxy(window.Audio,{construct(Target,args){
      const audio=Reflect.construct(Target,args);audio.volume=0;window.__qa.instances++;
      const cue=()=>new URL(audio.src||location.href).pathname.split('/').pop().replace('.mp3','');
      const log=type=>window.__qa.audio.push({type,cue:cue(),time:performance.now(),position:audio.currentTime,duration:audio.duration});
      const play=audio.play.bind(audio);audio.play=()=>{log('request');return mode==='rejected'?Promise.reject(new DOMException('QA rejection','NotAllowedError')):play();};
      for(const type of ['playing','ended','error'])audio.addEventListener(type,()=>log(type));
      return audio;
    }});
  },mode);
  await page.goto(base);
  return {page,context,errors};
}
const mark=page=>page.evaluate(()=>performance.now());
const logSince=(page,time)=>page.evaluate(t=>window.__qa.audio.filter(e=>e.time>=t),time);
const waitCue=(page,cue,type='request',after=0)=>page.waitForFunction(({cue,type,after})=>window.__qa.audio.some(e=>e.cue===cue&&e.type===type&&e.time>=after),{cue,type,after},{timeout:30000});
async function cool(page){
  await page.locator('#wind').click();const r=await page.locator('#world').boundingBox();
  await page.mouse.click(r.x+850*r.width/1200,r.y+300*r.height/800);
}
async function merge(page,a,b){
  const before=await page.locator('.drop').evaluateAll(nodes=>nodes.map(n=>n.dataset.drop));
  await page.locator(`[data-drop="${a}"]`).click();await page.locator(`[data-drop="${b}"]`).click();
  await page.waitForFunction(ids=>[...document.querySelectorAll('.drop')].some(n=>!ids.includes(n.dataset.drop)),before);
  return page.locator('.drop').evaluateAll((nodes,ids)=>nodes.find(n=>!ids.includes(n.dataset.drop)).dataset.drop,before);
}
async function landHero(page,friend='d3'){
  const id=await merge(page,'d1','d2');await page.waitForSelector(`[data-drop="${id}"].floating`);
  await merge(page,id,friend);await page.waitForSelector('.landed-hero');
}
async function hide(page){
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pagehide'));});
}
async function show(page){
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pageshow'));});
}
function fullEnding(log,cue){
  const event=log.find(e=>e.type==='ended'&&e.cue===cue);
  assert.ok(event&&event.duration>0&&event.position>=event.duration-.05,`${cue} reaches its real media end`);return event;
}
async function checkSceneCooling(page,time,label){
  await page.waitForTimeout(800);
  assert.equal(await page.locator('.small-drop.show').count(),0,`${label}: no immediate condensation`);
  assert.equal(await page.locator('#bird3').evaluate(n=>n.classList.contains('cold')),true);
  await waitCue(page,'condense','request',time);
  const log=await logSince(page,time),ended=fullEnding(log,'cool'),condense=log.find(e=>e.cue==='condense'&&e.type==='request');
  assert.ok(ended.time<=condense.time);assert.ok(condense.time-time>=4500,`${label}: full visible cold interval`);
  assert.equal(log.filter(e=>e.type==='request'&&e.cue==='cool').length,1,`${label}: resume events do not duplicate playback`);
  assert.equal(log.some(e=>e.type==='request'&&e.cue==='intro3'),false,`${label}: already-cold scene does not replay the warm opening`);
  return log;
}
try{
  {
    const {page,context,errors}=await setup();
    // A lifecycle round trip before Start must remain silent.
    await hide(page);await show(page);assert.equal((await logSince(page,0)).length,0);
    await page.locator('#start').click();await cool(page);
    await page.waitForSelector('#formed-cloud.show',{timeout:12000});
    assert.equal(await page.locator('#page-ending').isVisible(),false);
    let time=await mark(page);await page.locator('#listen').click();
    await waitCue(page,'cloudNext','request',time);
    const cloud=await logSince(page,time);
    assert.deepEqual(cloud.filter(e=>e.type==='request').map(e=>e.cue),['condense','cloudNext']);
    assert.ok(fullEnding(cloud,'condense').time<=cloud.find(e=>e.type==='request'&&e.cue==='cloudNext').time);
    assert.equal(await page.locator('#page-ending').isVisible(),true);
    await page.locator('#continue').click();await landHero(page);
    assert.equal(await page.locator('#page-ending').isVisible(),false);
    time=await mark(page);await page.locator('#listen').click();
    await waitCue(page,'reunion','request',time);
    const falling=await logSince(page,time);
    assert.deepEqual(falling.filter(e=>e.type==='request').map(e=>e.cue),['heroFall','reunion']);
    assert.ok(fullEnding(falling,'heroFall').time<=falling.find(e=>e.type==='request'&&e.cue==='reunion').time);
    const reunionTime=await mark(page);await page.locator('#listen').click();
    await waitCue(page,'rainNext','request',reunionTime);
    const reunion=await logSince(page,reunionTime);
    assert.deepEqual(reunion.filter(e=>e.type==='request').map(e=>e.cue),['reunion','rainNext']);
    assert.ok(fullEnding(reunion,'reunion').time<=reunion.find(e=>e.type==='request'&&e.cue==='rainNext').time);
    assert.equal(await page.locator('#page-ending').isVisible(),true);
    // Resume an interrupted fall after it already landed: the reunion survives.
    await page.locator('#replay').click();await landHero(page);await hide(page);
    time=await mark(page);await page.waitForTimeout(800);assert.deepEqual(await logSince(page,time),[]);
    await show(page);await waitCue(page,'rainNext','request',time);
    const resumed=await logSince(page,time);
    assert.deepEqual(resumed.filter(e=>e.type==='request').map(e=>e.cue),['heroFall','reunion','rainNext']);
    assert.ok(fullEnding(resumed,'heroFall').time<fullEnding(resumed,'reunion').time);
    assert.equal(await page.evaluate(()=>window.__qa.instances),1);assert.deepEqual(errors,[]);
    report.results.push({test:'relisten-and-background-story',passed:true,cloud,falling,reunion,resumed});
    console.log('PASS replayed condensation/fall/reunion and background continuation');await context.close();
  }
  {
    const {page,context,errors}=await setup();await page.locator('#start').click();await cool(page);
    await page.waitForTimeout(4000);await page.locator('#next').click();
    let time=await mark(page);await page.locator('#previous').click();
    const returned=await checkSceneCooling(page,time,'page return');
    await page.locator('#replay').click();await cool(page);await page.waitForTimeout(4000);await hide(page);
    time=await mark(page);await show(page);const resumed=await checkSceneCooling(page,time,'background return');
    // Navigating or replaying deliberately discards the former page's queue.
    await page.waitForSelector('#formed-cloud.show');await page.locator('#replay').click();
    time=await mark(page);await page.waitForTimeout(8500);
    assert.equal((await logSince(page,time)).some(e=>['cloudNext','condense'].includes(e.cue)),false);
    await cool(page);await page.waitForSelector('#formed-cloud.show',{timeout:12000});await page.locator('#next').click();
    time=await mark(page);await page.waitForTimeout(8500);
    assert.equal((await logSince(page,time)).some(e=>['cloudNext','condense'].includes(e.cue)),false);
    assert.deepEqual(errors,[]);report.results.push({test:'cold-return-audio-and-explicit-resets',passed:true,returned,resumed});
    console.log('PASS cold page/background returns and queue resets');await context.close();
  }
  {
    const {page,context,errors}=await setup('muted');await page.locator('#sound').click();await page.locator('#start').click();
    for(const route of ['page','background']){
      await page.locator('#replay').click();await cool(page);await page.waitForTimeout(4000);
      if(route==='page'){await page.locator('#next').click();await page.locator('#previous').click();}else{await hide(page);await show(page);}
      const time=Date.now();await page.waitForTimeout(1000);assert.equal(await page.locator('.small-drop.show').count(),0);
      assert.equal(await page.locator('#bird3').evaluate(n=>n.classList.contains('cold')),true);
      await page.waitForSelector('.small-drop.show',{timeout:7000});assert.ok(Date.now()-time>=4500,'muted return preserves a visible cold interval');
    }
    assert.equal((await logSince(page,0)).length,0);assert.deepEqual(errors,[]);
    report.results.push({test:'cold-return-muted',passed:true});console.log('PASS muted cold page/background return');await context.close();
  }
  for(const mode of ['muted','rejected']){
    const {page,context,errors}=await setup(mode);
    if(mode==='muted')await page.locator('#sound').click();await page.locator('#start').click();await page.locator('#next').click();
    if(mode==='muted')await page.locator('#captions').click();
    const measurements=[];
    async function measure(stage){
      for(const [width,height]of[[1024,768],[1180,820],[768,1024],[390,844]]){
        await page.setViewportSize({width,height});await page.waitForTimeout(150);
        assert.equal(await page.locator('#subtitle').isVisible(),true);
        const rects=await page.evaluate(()=>{
          const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
          return {subtitle:rect(document.querySelector('#subtitle')),obstacles:[...document.querySelectorAll('.puddle,.landed-hero,#bird4.follow,.drop.floating,#page-ending:not([hidden]),#end-panel:not([hidden]),.corner')].map(n=>({name:n.id||n.dataset.drop||n.className,rect:rect(n)}))};
        });
        const s=rects.subtitle;assert.ok(s.x>=0&&s.y>=0&&s.x+s.width<=width&&s.y+s.height<=height);
        for(const {name,rect:r}of rects.obstacles){
          const overlap=Math.max(0,Math.min(s.x+s.width,r.x+r.width)-Math.max(s.x,r.x))*Math.max(0,Math.min(s.y+s.height,r.y+r.height)-Math.max(s.y,r.y));
          assert.equal(overlap,0,`${mode} ${stage} ${width}x${height}: caption must not cover ${name}`);
        }
        measurements.push({stage,width,height,...rects});
        await page.screenshot({path:resolve(output,`${mode}-${stage}-${width}x${height}.png`)});
      }
      await page.setViewportSize({width:1024,height:768});
    }
    await measure('cloud-intro');const ordinary=await merge(page,'d3','d5');await page.waitForSelector(`[data-landed="${ordinary}"]`);
    await measure('ordinary-puddle');await landHero(page,'d7');await page.waitForSelector('#page-ending',{state:'visible'});
    await measure('reunion-cta');await page.locator('#continue').click();await measure('end');
    assert.deepEqual(errors,[]);report.results.push({test:'caption-layout',mode,passed:true,measurements});
    console.log(`PASS ${mode} captions across four viewports`);await context.close();
  }
}finally{
  await writeFile(resolve(output,'review-fixes-report.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();
}
