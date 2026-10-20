// Existing local server only. All speech uses the real HTMLAudioElement at volume 0.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium, webkit } = require(process.env.CODEX_PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.WATER_CYCLE_URL || 'http://127.0.0.1:8788/water-cycle/';
assert.match(base,/^http:\/\/127\.0\.0\.1:\d+\/water-cycle\/$/,'Use an existing isolated loopback server.');
assert.ok(process.env.OUTPUT_DIR,'Set OUTPUT_DIR to a local QA output directory.');
const output = resolve(process.env.OUTPUT_DIR);
await mkdir(output,{recursive:true});
const report={base,realAudio:true,volume:0,results:[],screenshots:[],limits:['Browser emulation is not an iPad device test.','No child comprehension or all-clip human listening assessment.']};
let browser;
async function freshTouchHelpRegression(browser) {
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await context.addInitScript(()=>{window.__wcAudio=[];window.Audio=new Proxy(window.Audio,{construct(T,args){const a=Reflect.construct(T,args);a.volume=0;window.__wcAudio.push(a);return a;}});});
  const page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base);
  assert.equal(await page.locator('[data-command="welcome"]').getAttribute('data-voice'),'zh-home');
  const touch=async(type,x=0,y=0)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:['touchStart','touchMove'].includes(type)?[{x,y,id:1}]:[]});
  const begin=async()=>{const target=page.locator('[data-command="start-zh"]');await target.scrollIntoViewIfNeeded();const box=await target.boundingBox();const x=box.x+box.width/2,y=box.y+box.height/2;await touch('touchStart',x,y);await page.waitForTimeout(750);assert.equal(await page.evaluate(()=>window.__wcAudio[0].getAttribute('src')),null,'Holding alone must not request or play speech.');return {x,y,box};};
  const normalTap=async()=>{const box=await page.locator('[data-command="start-zh"]').boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);await page.locator('.story').waitFor();};
  // The first user gesture in this fresh mobile context is a held touch, then release.
  await begin();await touch('touchEnd');
  await page.waitForFunction(()=>window.__wcAudio[0].src.endsWith('zh-start.mp3')&&!window.__wcAudio[0].paused&&window.__wcAudio[0].currentTime>0);
  assert.equal(await page.locator('.home').count(),1,'Long release gives help without entering the mode.');
  await normalTap();await page.locator('[data-command="home"]').first().click();
  // Moving outside cancels the gesture; the following normal tap must work.
  const moved=await begin();await touch('touchMove',385,Math.max(10,moved.box.y-30));await touch('touchEnd');
  assert.equal(await page.locator('.home').count(),1);assert.equal(await page.evaluate(()=>window.__wcAudio[0].getAttribute('src')),null);
  await page.locator('[data-command="start-zh"]').scrollIntoViewIfNeeded();await normalTap();await page.locator('[data-command="home"]').first().click();
  // Native touchCancel has no compatible click, so stale suppression must not consume the next tap.
  await begin();await touch('touchCancel');
  assert.equal(await page.evaluate(()=>window.__wcAudio[0].getAttribute('src')),null);
  await normalTap();await page.locator('[data-command="home"]').first().click();
  // Keyboard activation is not a pointer compatibility click.
  await page.locator('[data-command="start-zh"]').focus();await page.keyboard.press('Enter');await page.locator('.story').waitFor();
  assert.deepEqual(errors,[]);
  report.results.push({browser:'chromium',freshMobileTouch:true,passed:true,checks:['first held touch plays only on release','no accidental mode entry','move-out cancellation','native touchCancel then normal tap','keyboard Enter']});
  await context.close();console.log('PASS chromium fresh mobile touch: first release playback, move/cancel cleanup, normal tap and keyboard.');
}
async function exercise(engine,name,viewports){
  browser=await engine.launch({headless:true,timeout:15000});
  try{
    for(const [width,height] of viewports){
      const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
      await context.addInitScript(()=>{
        window.__wcAudio=[];
        window.Audio=new Proxy(window.Audio,{construct(target,args){const audio=Reflect.construct(target,args);audio.volume=0;window.__wcAudio.push(audio);return audio;}});
      });
      const page=await context.newPage();
      const errors=[],responses=[],expectedFailures=[];
      let plannedFailure=false;
      page.on('pageerror',error=>errors.push(error.message));
      page.on('console',message=>{if(message.type()==='error'){if(plannedFailure&&/ERR_FAILED|503/.test(message.text()))expectedFailures.push(message.text());else errors.push(message.text());}});
      page.on('response',response=>{if(response.status()>=400){if(plannedFailure&&response.url().endsWith('zh-home.mp3'))expectedFailures.push(response.status());else responses.push(`${response.status()} ${response.url()}`);}});
      const click=async selector=>{await page.locator(selector).first().click();};
      const cue=async text=>assert.match(await page.locator('.spoken').innerText(),text);
      const playing=async()=>page.waitForFunction(()=>window.__wcAudio[0]?.readyState>=2&&!window.__wcAudio[0].paused&&window.__wcAudio[0].currentTime>0,null,{timeout:15000});
      const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false,`${name} ${width}x${height} horizontal overflow: ${JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('body *')].map(el=>({tag:el.tagName,cls:el.className?.baseVal??el.className,right:el.getBoundingClientRect().right})).filter(el=>el.right>innerWidth+1).slice(0,10)))}`);
      const controlsReachable=async()=>{
        for(const selector of ['[data-command="home"]','[data-command="replay"]','[data-command="pause"]','[data-command="slow"]','[data-command="next"]','.action','.journey-map button']){
          const el=page.locator(selector).first();if(!await el.count())continue;
          await el.scrollIntoViewIfNeeded();const box=await el.boundingBox();
          assert.ok(box&&box.x>=0&&box.x+box.width<=width+1&&box.height>=44,`Unreachable or small control ${selector}: ${JSON.stringify(box)}`);
        }
      };
      async function shot(label){if(width!==1024)return;await page.evaluate(()=>scrollTo(0,0));const file=`${name}-${width}-${label}.png`;await page.screenshot({path:resolve(output,file),fullPage:true});report.screenshots.push(file);}
      await page.goto(base);
      await page.locator('[data-command="start-zh"]').waitFor();
      await noOverflow();await shot('home');
      for(const lang of ['zh','en']){
        if(name==='chromium'&&lang==='zh') await page.route('**/assets/audio/zh-evap-intro.mp3',async route=>{await new Promise(resolve=>setTimeout(resolve,700));await route.continue();});
        await click(`[data-command="start-${lang}"]`);
        if(name==='chromium'&&lang==='zh'){
          await click('[data-command="pause"]');
          await page.waitForTimeout(1000);
          assert.equal(await page.evaluate(()=>window.__wcAudio[0].paused),true,'Pause while MP3 is loading must stay paused after it loads.');
          assert.match(await page.locator('[data-audio-status]').innerText(),/已暫停/);
          await page.unroute('**/assets/audio/zh-evap-intro.mp3');
          await click('[data-command="pause"]');
        }
        await playing();
        assert.equal(await page.evaluate(()=>window.__wcAudio[0] instanceof HTMLAudioElement),true);
        // Actual pause, resume, slower playback and replay.
        await click('[data-command="pause"]');
        assert.equal(await page.evaluate(()=>window.__wcAudio[0].paused),true);
        const pausedTime=await page.evaluate(()=>window.__wcAudio[0].currentTime);
        await page.waitForTimeout(120);
        assert.ok(Math.abs(await page.evaluate(()=>window.__wcAudio[0].currentTime)-pausedTime)<.03);
        await click('[data-command="pause"]');await playing();
        await click('[data-command="slow"]');assert.equal(await page.evaluate(()=>window.__wcAudio[0].playbackRate),.8);
        await click('[data-command="replay"]');await playing();
        assert.equal(await page.evaluate(()=>window.__wcAudio[0].playbackRate),.8);
        await click('[data-command="slow"]');
        // Long press gives the Chinese button explanation and suppresses its normal action.
        const timeButton=page.locator('[data-action="time"]');const box=await timeButton.boundingBox();
        await timeButton.focus();await page.keyboard.press('F1');
        await page.waitForFunction(()=>window.__wcAudio[0].src.endsWith('zh-evap-time.mp3'));
        assert.equal(await page.locator('[data-action="time"]').count(),1);
        await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(750);await page.mouse.up();
        await page.waitForFunction(()=>window.__wcAudio[0].src.endsWith('zh-evap-time.mp3'));
        assert.equal(await page.locator('[data-action="time"]').count(),1);
        await click('[data-action="time"]');await cue(lang==='zh'?/水變少/:/less water/);
        await click('[data-action="look"]');await cue(lang==='zh'?/看不見的水蒸氣/:/cannot see water vapor/);
        await noOverflow();await controlsReachable();
        await shot(`${lang}-evap`);
        if(lang==='en'){
          await click('[data-action="compare"]');await cue(/Which loses more/);
          await click('[data-action="cooler"]');await cue(/warmer water loses more/);
          assert.equal(await page.locator('.science-scene').getAttribute('aria-label'),'Interactive diagram: evap. evap compare result.');
          await click('[data-command="support"]');assert.equal(await page.locator('.support-content').count(),1);
          await page.waitForFunction(()=>window.__wcAudio[0].src.endsWith('zh-evap-compare-result.mp3'));
          assert.match(await page.locator('.support-content').innerText(),/蒸發/);
          await click('[data-command="support"]');assert.equal(await page.locator('.support-content').count(),0);
          await shot('english');
        }
        await click('[data-command="scene-1"]');
        await page.waitForFunction(lang=>window.__wcAudio[0].src.endsWith(`${lang}-cloud-intro.mp3`),lang);
        await click('[data-action="cool"]');await cue(lang==='zh'?/還沒有下雨/:/does not always make rain/);
        await noOverflow();
        await click('[data-command="scene-2"]');
        await click('[data-action="grow"]');await click('[data-action="grow"]');await click('[data-action="grow"]');
        await cue(lang==='zh'?/落到地面就是雨/:/ground as rain/);
        await noOverflow();
        await click('[data-command="scene-3"]');
        assert.match(await page.locator('.science-scene').getAttribute('aria-label'),lang==='zh'?/尚未選擇/:/not been chosen/);
        assert.doesNotMatch(await page.locator('.science-scene').textContent(),/Cold air|冷空氣/);
        await shot(`${lang}-snow-unselected`);
        await click('[data-action="cold"]');await cue(lang==='zh'?/仍是雪/:/Snow reaches/);
        await click('[data-action="warm"]');await cue(lang==='zh'?/完全融化/:/melts into drops/);await shot(`${lang}-snow`);
        await noOverflow();
        await click('[data-command="scene-4"]');
        if(name==='chromium'&&lang==='zh'&&width===1024){
          await page.route('**/assets/audio/zh-hail-water-action.mp3',async route=>{await new Promise(resolve=>setTimeout(resolve,700));await route.continue();});
          await click('[data-command="instruction"]');await playing();
          await page.evaluate(()=>{const audio=window.__wcAudio[0];audio.currentTime=audio.duration-.04;});
          await page.waitForFunction(()=>window.__wcAudio[0].src.endsWith('zh-hail-water-action.mp3'));
          await click('[data-command="pause"]');await page.waitForTimeout(1000);
          assert.equal(await page.evaluate(()=>window.__wcAudio[0].paused),true);
          assert.equal(await page.locator('.audio-error').count(),0);
          await page.unroute('**/assets/audio/zh-hail-water-action.mp3');
          await click('[data-command="pause"]');await playing();
          await page.evaluate(()=>{const audio=window.__wcAudio[0];audio.currentTime=audio.duration-.04;});
          await page.waitForFunction(()=>window.__wcAudio[0].src.endsWith('zh-hail-test.mp3'));await playing();
        }
        await click('[data-action="test"]');await cue(lang==='zh'?/箭頭和冰冷的水滴/:/Turn on both/);
        await click('[data-action="wind"]');await click('[data-action="test"]');await cue(lang==='zh'?/箭頭和冰冷的水滴/:/Turn on both/);
        await click('[data-action="water"]');await cue(lang==='zh'?/都準備好了/:/Both are ready/);
        await click('[data-action="test"]');await cue(lang==='zh'?/一層又一層/:/grows in layers/);await shot(`${lang}-hail`);
        if(lang==='en'){
          await click('[data-action="wind"]');await click('[data-action="test"]');
          assert.equal(await page.locator('.trial-result.tried').count(),4,'All four wind/water pairs remain in the record.');
          await shot('english-hail-record');
        }
        await noOverflow();await controlsReachable();
        await click('[data-command="reset"]');assert.equal(await page.locator('[data-action="wind"]').getAttribute('aria-pressed'),'false');
        assert.equal(await page.locator('[data-action="water"]').getAttribute('aria-pressed'),'false');
        await click('[data-command="scene-5"]');
        for(const action of ['river','soil','lake'])await click(`[data-action="${action}"]`);
        await cue(lang==='zh'?/固定圈/:/different paths/);
        await noOverflow();await controlsReachable();
        await click('[data-command="next"]');await page.locator('.review').waitFor();await noOverflow();await shot(`${lang}-review`);
        assert.equal(await page.locator('.review-footer [data-command="scene-0"]').getAttribute('data-voice'),'zh-restart');
        await click('[data-command="home"]');
        assert.equal(await page.evaluate(()=>window.__wcAudio[0].paused&&!window.__wcAudio[0].getAttribute('src')),true);
      }
      // A deliberate 503 verifies the user-facing error and a successful real retry.
      plannedFailure=true;
      if(name==='webkit'){
        // WebKit native media loading bypasses Playwright request routing. Exercise a real decoder failure instead.
        await click('[data-command="welcome"]');await playing();
        await page.evaluate(()=>{const audio=window.__wcAudio[0];audio.pause();audio.src='data:audio/mpeg;base64,AAAA';audio.load();audio.play().catch(()=>{});});
        expectedFailures.push('Native invalid-MPEG decode error');
      } else {
        await page.route('**/assets/audio/zh-home.mp3',route=>route.fulfill({status:503,body:'temporary local QA failure'}));
        await click('[data-command="welcome"]');
      }
      await page.locator('.audio-error').waitFor();
      assert.equal(await page.locator('[data-command="welcome"] span').innerText(),'再聽一次');
      if(name!=='webkit') await page.unroute('**/assets/audio/zh-home.mp3');
      await click('[data-command="welcome"]');await playing();plannedFailure=false;
      // Pagehide is dispatched explicitly: this checks the lifecycle handler, not genuine background-tab policy.
      await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide')));
      assert.equal(await page.evaluate(()=>window.__wcAudio[0].paused&&!window.__wcAudio[0].getAttribute('src')),true);
      assert.deepEqual(errors,[]);assert.deepEqual(responses,[]);
      assert.ok(expectedFailures.length>0);
      report.results.push({browser:name,width,height,passed:true,expectedAudioFailure:true,lifecycleEvent:'synthetic pagehide; native audio stopped'});
      await context.close();console.log(`PASS ${name} ${width}x${height}: both stories, real muted audio, retry, controls, no overflow.`);
    }
    if(name==='chromium')await freshTouchHelpRegression(browser);
  } finally {await browser.close();browser=null;}
}
try{
  if(process.env.WATER_CYCLE_BROWSER==='touch'){
    browser=await chromium.launch({headless:true,timeout:15000,args:['--autoplay-policy=user-gesture-required']});
    await freshTouchHelpRegression(browser);await browser.close();browser=null;
  }else{
    if(process.env.WATER_CYCLE_BROWSER!=='webkit') await exercise(chromium,'chromium',[[1024,768],[1180,820],[768,1024],[390,844]]);
    try{await exercise(webkit,'webkit',[[1024,768]]);}catch(error){if(/Executable doesn't exist|browserType.launch/.test(error.message))report.webkitUnavailable=error.message.split('\n')[0];else throw error;}
  }
}catch(error){report.failure=error.stack;throw error;}finally{await writeFile(resolve(output,'browser-report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();}
