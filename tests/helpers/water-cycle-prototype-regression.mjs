// Focused review regressions using real media decoding and user input.
// No server is started and no browser/runtime is installed by this helper.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url);
const engines=require(process.env.CODEX_PLAYWRIGHT_PACKAGE||'playwright');
const base=process.env.WATER_PROTOTYPE_URL||'http://127.0.0.1:8794/water-cycle/prototype/';
assert.match(base,/^(file:\/\/\/|http:\/\/127\.0\.0\.1:\d+\/water-cycle\/prototype\/)/);
assert.ok(process.env.OUTPUT_DIR,'Set OUTPUT_DIR for QA evidence.');
const output=resolve(process.env.OUTPUT_DIR);await mkdir(output,{recursive:true});
const report={base,results:[],limits:['Real audio is decoded and played at volume 0; this is not human listening.','Desktop WebKit is not an iPad device test.']};
for(const engine of (process.env.WATER_PROTOTYPE_WEBKIT==='1'?['chromium','webkit']:['chromium'])){
  const browser=await engines[engine].launch({headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1024,height:768},reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
      window.__qa={audio:[],contexts:[],effects:[],inClick:false};
      window.addEventListener('click',()=>{window.__qa.inClick=true;},true);
      window.addEventListener('click',()=>{window.__qa.inClick=false;});
      window.Audio=new Proxy(window.Audio,{construct(Target,args){
        const audio=Reflect.construct(Target,args);audio.volume=0;
        const cue=()=>new URL(audio.src||location.href).pathname.split('/').pop().replace('.mp3','');
        const log=type=>window.__qa.audio.push({type,cue:cue(),time:performance.now(),position:audio.currentTime,duration:audio.duration});
        const play=audio.play.bind(audio);audio.play=()=>{log('request');return play();};
        for(const type of ['playing','ended','error'])audio.addEventListener(type,()=>log(type));
        return audio;
      }});
      const NativeContext=window.AudioContext||window.webkitAudioContext;
      const WrappedContext=new Proxy(NativeContext,{construct(Target,args){
        const ctx=Reflect.construct(Target,args);window.__qa.contexts.push({type:'create',click:window.__qa.inClick});
        const resume=ctx.resume.bind(ctx);ctx.resume=()=>{window.__qa.contexts.push({type:'resume',click:window.__qa.inClick});return resume();};
        const oscillator=ctx.createOscillator.bind(ctx);ctx.createOscillator=()=>{window.__qa.effects.push({state:ctx.state,time:performance.now()});return oscillator();};
        return ctx;
      }});
      if(window.AudioContext)window.AudioContext=WrappedContext;else window.webkitAudioContext=WrappedContext;
    });
    await page.goto(base);await page.locator('#start').click();
    await page.waitForFunction(()=>window.__qa.audio.some(e=>e.type==='playing'));
    await page.locator('#sound').click();await page.locator('#sound').click();await page.locator('#listen').click();
    const unlock=await page.evaluate(()=>window.__qa.contexts);
    assert.equal(unlock.filter(e=>e.type==='create').length,1);assert.ok(unlock.length>=4&&unlock.every(e=>e.click),'AudioContext creation and resumes occur synchronously in clicks');
    const screen=async(x,y)=>{const b=await page.locator('#world').boundingBox();return{x:b.x+x*b.width/1200,y:b.y+y*b.height/800};};
    const dragTo=async(locator,x,y)=>{const b=await locator.boundingBox(),p=await screen(x,y);await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(p.x,p.y,{steps:8});await page.mouse.up();};
    const sky=async(x,y)=>{await page.locator('#wind').click();const p=await screen(x,y);await page.mouse.click(p.x,p.y);};
    const wind=await page.locator('#wind').boundingBox();
    await page.mouse.move(wind.x+wind.width/2,wind.y+wind.height/2);await page.mouse.down();await page.mouse.move(wind.x+wind.width/2+20,wind.y+wind.height/2,{steps:3});
    assert.equal(await page.evaluate(()=>window.__qa.audio.some(e=>e.cue==='warm')),false,'moving toward the destination does not give premature advice');
    await page.mouse.up();await page.waitForFunction(()=>window.__qa.audio.some(e=>e.cue==='warm'&&e.type==='request'));
    await sky(850,300);await page.waitForSelector('#formed-cloud.show',{timeout:10000});
    const coldLog=await page.evaluate(()=>window.__qa.audio);
    const coldEnd=coldLog.find(e=>e.cue==='cool'&&e.type==='ended'),condense=coldLog.find(e=>e.cue==='condense'&&e.type==='request');
    assert.ok(coldEnd&&condense&&coldEnd.time<=condense.time,'complete cold sentence precedes visible condensation narration');
    assert.ok(coldEnd.duration>4.3&&coldEnd.position>=coldEnd.duration-.05,'decoder reached the end of the full clip (MP3 padding differs by engine)');
    await page.locator('#next').click();await page.locator('#previous').click();await page.locator('#next').click();
    assert.match(await page.locator('#status').textContent(),/到剛才那朵雲/,'an untouched revisited cloud does not claim growth');
    const clickDrop=async id=>page.locator(`[data-drop="${id}"]`).click();
    const merge=async(a,b)=>{
      const old=await page.locator('.drop').evaluateAll(nodes=>nodes.map(n=>n.dataset.drop));
      await clickDrop(a);await clickDrop(b);
      await page.waitForFunction(ids=>[...document.querySelectorAll('.drop')].some(n=>!ids.includes(n.dataset.drop)),old);
      return page.locator('.drop').evaluateAll((nodes,ids)=>nodes.find(n=>!ids.includes(n.dataset.drop)).dataset.drop,old);
    };
    const floating=async id=>page.waitForSelector(`[data-drop="${id}"].floating`);
    await merge('d1','d2');await page.waitForFunction(()=>window.__qa.audio.some(e=>e.cue==='small'&&e.type==='request'),null,{timeout:12000});
    const smallLog=await page.evaluate(()=>window.__qa.audio);
    assert.ok(smallLog.find(e=>e.cue==='merge'&&e.type==='ended').time<=smallLog.find(e=>e.cue==='small'&&e.type==='request').time);
    await page.locator('#replay').click();
    let id=await merge('d3','d2');await floating(id);id=await merge(id,'d5');await page.waitForSelector(`[data-drop="${id}"]`,{state:'detached'});
    id=await merge('d7','d4');await floating(id);id=await merge(id,'d8');await page.waitForSelector(`[data-drop="${id}"]`,{state:'detached'});
    assert.equal(await page.locator('.drop.floating').count(),4,'two volume-five departures still leave four selectable units');
    assert.equal(await page.locator('.drop.hero').count(),1);
    await dragTo(page.locator('.drop.hero'),1050,350);
    for(let i=0;i<3;i++){
      const hero=await page.locator('.drop.hero').getAttribute('data-drop');
      const friend=await page.locator('.drop.floating:not(.hero)').first().getAttribute('data-drop');
      id=await merge(friend,hero);if(i<2)await floating(id);
    }
    await page.waitForSelector('.landed-hero');
    assert.equal(await page.locator('.drop.floating').count(),4,'the star can rain and four new friends remain');
    const reunionPosition=await page.evaluate(()=>({hero:parseFloat(document.querySelector('.landed-hero').style.left),bird:parseFloat(document.querySelector('#bird4').style.left)}));
    assert.ok(reunionPosition.hero>800);assert.ok(Math.abs(reunionPosition.hero-(reunionPosition.bird+125))<130,'sparrow follows the actual right-side landing');
    await page.screenshot({path:resolve(output,`${engine}-right-reunion.png`)});
    // Cause another rain during the star's protected speech/reunion.
    const friends=await page.locator('.drop').evaluateAll(nodes=>nodes.map(n=>n.dataset.drop));
    const a=await merge(friends[0],friends[1]),b=await merge(friends[2],friends[3]);await floating(a);await floating(b);await merge(a,b);
    await page.waitForFunction(()=>window.__qa.audio.some(e=>e.cue==='reunion'&&e.type==='ended'),null,{timeout:25000});
    const storyLog=await page.evaluate(()=>window.__qa.audio);
    const heroRequest=storyLog.find(e=>e.cue==='heroFall'&&e.type==='request'),heroEnd=storyLog.find(e=>e.cue==='heroFall'&&e.type==='ended');
    const reunionRequest=storyLog.find(e=>e.cue==='reunion'&&e.type==='request'),reunionEnd=storyLog.find(e=>e.cue==='reunion'&&e.type==='ended');
    assert.ok(heroRequest&&heroEnd&&reunionRequest&&reunionEnd&&heroEnd.time<=reunionRequest.time);
    assert.deepEqual(storyLog.slice(storyLog.indexOf(heroRequest),storyLog.indexOf(reunionEnd)).filter(e=>e.type==='request').map(e=>e.cue),['heroFall','reunion']);
    await page.waitForFunction(()=>{const log=window.__qa.audio;return log.slice(log.findIndex(e=>e.cue==='reunion'&&e.type==='ended')+1).some(e=>e.cue==='refill'&&e.type==='request');});
    const effects=await page.evaluate(()=>window.__qa.effects);assert.ok(effects.length>0&&effects.every(e=>e.state==='running'));
    assert.equal(await page.evaluate(()=>window.__qa.contexts.filter(e=>e.type==='create').length),1,'rAF effects never create another context');
    await page.locator('#replay').click();id=await merge('d1','d2');await floating(id);await merge('d3',id);await page.waitForSelector('.landed-hero');
    await page.locator('#previous').click();const resetTime=await page.evaluate(()=>performance.now());
    await page.waitForTimeout(7000);
    assert.equal(await page.evaluate(t=>window.__qa.audio.some(e=>e.type==='request'&&e.cue==='reunion'&&e.time>t),resetTime),false,'page changes discard the waiting reunion');
    assert.deepEqual(errors,[]);
    report.results.push({engine,passed:true,coolEndedBeforeCondense:true,heroFallEndedBeforeReunion:true,contextUnlockedInClick:true,rightLanding:reunionPosition,audio:await page.evaluate(()=>window.__qa.audio)});
    console.log(`PASS focused ${engine}`);await context.close();
  }finally{await browser.close();}
}
await writeFile(resolve(output,'regression-report.json'),JSON.stringify(report,null,2)+'\n');
