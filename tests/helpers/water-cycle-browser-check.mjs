// Uses an existing isolated loopback server; real HTMLAudioElement, muted for QA.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const require=createRequire(import.meta.url);
const {chromium,webkit}=require(process.env.CODEX_PLAYWRIGHT_PACKAGE||'playwright');
const base=process.env.WATER_CYCLE_URL||'http://127.0.0.1:8788/water-cycle/';
assert.match(base,/^http:\/\/127\.0\.0\.1:\d+\/water-cycle\/$/);
assert.ok(process.env.OUTPUT_DIR,'Set OUTPUT_DIR to the QA artifact directory.');
const output=resolve(process.env.OUTPUT_DIR);await mkdir(output,{recursive:true});
const report={base,realAudio:true,volume:0,results:[],screenshots:[],limits:['Browser emulation is not an iPad device test.','No child comprehension or all-clip human listening assessment.','Background stopping uses pagehide/visibility handlers, not device power policy.']};
const scenes=['pond','clouds','rain','snow','storm','river'];
const selector=s=>'[data-command="'+s+'"]';
async function init(page){
  await page.addInitScript(()=>{window.__bookAudio=[];window.__bookPlayCount=0;window.Audio=new Proxy(window.Audio,{construct(T,args){const a=Reflect.construct(T,args);a.volume=0;const realPlay=a.play.bind(a);a.play=()=>{window.__bookPlayCount++;return realPlay();};window.__bookAudio.push(a);return a;}});});
}
async function playing(page,id){
  await page.waitForFunction(id=>{const a=window.__bookAudio[0];return a.src.endsWith(id+'.mp3')&&!a.paused&&a.currentTime>0;},id,{timeout:15000});
}
async function audioId(page,id){
  await page.waitForFunction(id=>window.__bookAudio[0].src.endsWith(id+'.mp3'),id);
}
async function viewportCheck(page){
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow');
  const issues=await page.locator('main button:not([hidden])').evaluateAll(buttons=>buttons.flatMap(b=>{
    const r=b.getBoundingClientRect();const visible=getComputedStyle(b).display!=='none';
    if(!visible||b.classList.contains('terrain'))return [];
    if(r.width<48||r.height<48)return [b.getAttribute('aria-label')||b.textContent];
    const x=Math.max(0,Math.min(innerWidth-1,r.x+r.width/2)),y=Math.max(0,Math.min(innerHeight-1,r.y+r.height/2));
    const hit=document.elementFromPoint(x,y);
    return !hit||!b.contains(hit)?['Covered: '+(b.dataset.action||b.dataset.command)]:[];
  }));
  assert.deepEqual(issues,[],'Touch targets must be large and reachable');
}
async function next(page){await page.locator(selector('next')).click();}
async function exercise(engine,name,viewports){
  const browser=await engine.launch({headless:true});
  try{for(const [width,height]of viewports){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    const page=await context.newPage();await init(page);const errors=[],failed=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
    const snap=async label=>{if(width===1024&&height===768){const file=name+'-1024x768-'+label+'.png';await page.screenshot({path:resolve(output,file)});report.screenshots.push(file);}};
    await page.goto(base);await viewportCheck(page);await snap('cover');
    await page.locator(selector('start-zh')).first().click();await playing(page,'zh-book-pond-intro');
    assert.equal(await page.evaluate(()=>window.__bookAudio.length),1,'One audio object');
    assert.equal(await page.locator('.subtitle').isVisible(),false);
    await viewportCheck(page);const waterBefore=await page.locator('.puddle').boundingBox();await page.locator('[data-action="sun"]').click();await playing(page,'zh-book-pond-sun');
    const scale=await page.locator('.puddle').evaluate(el=>Number(el.style.getPropertyValue('--water-scale')));assert.ok(scale<1);await snap('pond-smaller');
    const waterAfter=await page.locator('.puddle').boundingBox();assert.ok(waterAfter.width<waterBefore.width&&waterAfter.height<waterBefore.height);assert.notEqual(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('button')?.dataset.action,{x:waterBefore.x+2,y:waterBefore.y+waterBefore.height/2}),'puddle','Dry sand must not retain the puddle hit area');
    const helloAudio=await page.evaluate(()=>({src:window.__bookAudio[0].src,plays:window.__bookPlayCount}));await page.locator(selector('hello')).click();assert.deepEqual(await page.evaluate(()=>({src:window.__bookAudio[0].src,plays:window.__bookPlayCount})),helloAudio,'Greeting is visual only');
    await page.locator('[data-action="puddle"]').click();await audioId(page,'zh-book-pond-puddle');
    await next(page);await viewportCheck(page);
    const c=page.locator('[data-drag="cloud"]'),cb=await c.boundingBox();
    await page.mouse.move(cb.x+cb.width/2,cb.y+cb.height/2);await page.mouse.down();await page.mouse.move(cb.x+cb.width/2+35,cb.y+cb.height/2+20,{steps:6});await page.mouse.up();
    await audioId(page,'zh-book-clouds-touch');
    assert.ok(await page.locator('.tiny-drop').count()>0);
    await next(page);await viewportCheck(page);
    const a=await page.locator('.drop-a').boundingBox(),b=await page.locator('.drop-b').boundingBox();
    await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:8});await page.mouse.up();
    await audioId(page,'zh-book-rain-merge');await snap('rain');await page.locator('[data-action="leaf"]').click();await audioId(page,'zh-book-rain-leaf');
    await next(page);await viewportCheck(page);await page.locator('[data-action="snowflake"]').click();await audioId(page,'zh-book-snow-touch');
    await page.locator('[data-action="mitten"]').click();await audioId(page,'zh-book-snow-catch');await snap('snow-catch');
    await next(page);await viewportCheck(page);
    for(const cue of ['lift','grow','fall']){await page.locator('[data-action="ice"]').click();await audioId(page,'zh-book-storm-'+cue);if(cue==='grow'||cue==='fall')await snap('storm-'+cue);}
    await next(page);await viewportCheck(page);
    for(const [route,x,y] of [['river',58,62],['soil',60,95],['pool',23,75]]){await page.mouse.click(width*x/100,height*y/100);await audioId(page,'zh-book-river-'+route);}
    const screenshot=name+'-'+width+'x'+height+'.png';await page.screenshot({path:resolve(output,screenshot)});report.screenshots.push(screenshot);
    await next(page);await playing(page,'zh-book-ending');await viewportCheck(page);
    await page.locator(selector('language')).click();await playing(page,'en-book-ending');
    await page.locator(selector('again')).click();await playing(page,'en-book-pond-intro');
    await page.locator(selector('menu')).click();await page.locator('[data-setting="page"]').selectOption('3');
    await playing(page,'en-book-snow-intro');await page.locator('[data-action="mitten"]').click();await page.locator('[data-action="warm"]').click();await playing(page,'en-book-snow-warm');
    await page.locator(selector('menu')).click();await page.locator('[data-setting="slow"]').check();await page.locator('[data-setting="subtitles"]').check();
    await page.locator(selector('close')).click();await page.locator(selector('replay')).first().click();await playing(page,'en-book-snow-warm');
    assert.equal(await page.evaluate(()=>window.__bookAudio[0].playbackRate),.8);
    assert.equal(await page.locator('.subtitle').isVisible(),true);
    await page.locator(selector('pause')).click();assert.equal(await page.evaluate(()=>window.__bookAudio[0].paused),true);
    await page.locator(selector('pause')).click();await playing(page,'en-book-snow-warm');
    await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal(await page.evaluate(()=>window.__bookAudio[0].getAttribute('src')),null);
    await page.locator(selector('replay')).first().click();await playing(page,'en-book-snow-warm');
    await page.locator(selector('back')).click();await playing(page,'en-book-rain-intro');
    await page.locator('[data-action="merge"]').first().focus();await page.keyboard.press('Enter');await audioId(page,'en-book-rain-merge');
    await page.locator(selector('menu')).click();await page.locator(selector('home')).click();
    assert.equal(await page.evaluate(()=>window.__bookAudio[0].getAttribute('src')),null);
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
    report.results.push({browser:name,width,height,passed:true,checks:['all scene interactions','cloud drag','rain drop collision','keyboard alternative','48px touch targets','no overlap or horizontal overflow','real single audio playback','slow/pause/resume','switch page/language/home','background handler','hidden subtitles and parent settings']});
    await context.close();console.log('PASS '+name+' '+width+'x'+height);
  }}finally{await browser.close();}
}


async function reviewRegression(){
  const browser=await chromium.launch({headless:true});
  try{
    for(const [width,height] of [[1024,768],[768,1024]]){
      const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
      const page=await context.newPage();await init(page);await page.goto(base);await page.locator(selector('start-en')).click();
      const jump=async value=>{await page.locator(selector('menu')).click();await page.locator('[data-setting="page"]').selectOption(String(value));};
      await page.keyboard.press('ArrowRight');assert.equal(await page.locator('main').getAttribute('data-page'),'clouds');assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'cloud');
      await page.keyboard.press('Enter');await audioId(page,'en-book-clouds-touch');await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'merge');
      await page.keyboard.press('Enter');assert.equal(await page.locator('.rain-drop:visible').count(),0);assert.equal(await page.locator('.merged-drop:visible').count(),1);await page.locator('.merged-drop').click();await audioId(page,'en-book-rain-merge');
      await jump(3);assert.equal(await page.locator('.snow-cloud').count(),1);assert.equal(await page.locator('.caught-snow').count(),0);assert.equal(await page.locator('[data-action="warm"]').count(),0);
      await page.locator('[data-action="mitten"]').click();assert.equal(await page.locator('.caught-snow').count(),1);await page.locator('[data-action="warm"]').click();assert.equal(await page.locator('.mitten-water').count(),1);
      await jump(4);await viewportCheck(page);
      const inCloud=await page.evaluate(()=>{const c=document.querySelector('.storm-cloud .paper-shape > path').getBoundingClientRect(),i=document.querySelector('.ice .paper-shape > path').getBoundingClientRect();return {fits:i.top>=c.top&&i.bottom<=c.bottom,c:{top:c.top,bottom:c.bottom},i:{top:i.top,bottom:i.bottom}};});assert.equal(inCloud.fits,true,JSON.stringify(inCloud));
      await page.locator('[data-action="ice"]').click();await page.locator('[data-action="ice"]').click();const grown=await page.locator('.ice').boundingBox();
      const drag=async dy=>{const r=await page.locator('.ice').boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2,r.y+r.height/2+dy,{steps:6});await page.mouse.up();};
      await drag(-45);await page.waitForTimeout(70);assert.equal(await page.locator('.landed-hail').count(),0,'Upward drag must keep grown ice aloft');assert.ok((await page.locator('.ice').boundingBox()).width>=grown.width-1);
      await drag(60);await page.locator('.landed-hail').waitFor();assert.ok((await page.locator('.landed-hail').boundingBox()).width>=grown.width-1,'Falling hail must keep its grown size');assert.equal(await page.locator('.wind-on').count(),1,'Wind still exists when it cannot hold the hail');assert.equal(await page.locator('.new-ice').count(),1,'A separate new seed is available while the old hail remains on the ground');
      await page.locator('.new-ice').click();assert.equal(await page.locator('.landed-hail').count(),1);
      await jump(5);
      for(const [x,y,expected] of [[45,80,['river','pool']],[60,95,['soil']],[58,62,['river']],[23,75,['pool']],[20,59,['soil']]]){
        const actual=await page.evaluate(({x,y})=>document.elementFromPoint(innerWidth*x/100,innerHeight*y/100)?.closest('button')?.dataset.action,{x,y});assert.ok(expected.includes(actual),x+','+y+' hit '+actual);await page.mouse.click(width*x/100,height*y/100);await audioId(page,'en-book-river-'+actual);
      }
      const file='review-'+width+'x'+height+'-river.png';await page.screenshot({path:resolve(output,file)});report.screenshots.push(file);await viewportCheck(page);
      report.results.push({browser:'chromium',width,height,reviewRegression:true,passed:true,checks:['keyboard page focus and Enter','one reduced-motion merged rain drop and replay','cloud above snow and empty/caught/melted mitten','initial ice contained in cloud','grown upward hold, downward fall, preserved large hail and wind','separate new seed','actual painted water/soil coordinates']});await context.close();console.log('PASS review '+width+'x'+height);
    }
    const context=await browser.newContext({viewport:{width:1024,height:768},reducedMotion:'no-preference'});const page=await context.newPage();await init(page);await page.goto(base);await page.locator(selector('start-zh')).first().click();await page.locator(selector('menu')).click();await page.locator('[data-setting="page"]').selectOption('2');await page.locator('.drop-a').click();await page.waitForTimeout(640);
    const sequence=await page.evaluate(()=>{const a=document.querySelector('.drop-a').getBoundingClientRect(),b=document.querySelector('.drop-b').getBoundingClientRect();return {distance:Math.abs(a.x-b.x),mergedOpacity:Number(getComputedStyle(document.querySelector('.merged-drop')).opacity)};});assert.ok(sequence.distance<50,'Two drops must visibly move together');await page.waitForTimeout(350);assert.ok(await page.locator('.merged-drop').evaluate(el=>Number(getComputedStyle(el).opacity))>.8,'One large merged drop appears before falling');const mergedY=(await page.locator('.merged-drop').boundingBox()).y;await page.waitForTimeout(800);assert.ok((await page.locator('.merged-drop').boundingBox()).y>mergedY+40,'The one merged drop falls');report.results.push({browser:'chromium',normalMotion:true,reviewRegression:true,passed:true,checks:['two drops converge','one larger merged drop appears','merged drop falls']});await context.close();
  }finally{await browser.close();}
}

async function freshTouch(){
  const browser=await chromium.launch({headless:true});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    const page=await context.newPage();await init(page);await page.goto(base);
    const cdp=await context.newCDPSession(page);
    const touch=async(type,x=0,y=0)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:['touchStart','touchMove'].includes(type)?[{x,y,id:1}]:[]});
    const gesture=async(locator,dx,dy,cancel=false)=>{const b=await locator.boundingBox();const x=b.x+b.width/2,y=b.y+b.height/2;await touch('touchStart',x,y);for(let i=1;i<=6;i++)await touch('touchMove',x+dx*i/6,y+dy*i/6);await touch(cancel?'touchCancel':'touchEnd');};
    await page.locator(selector('start-zh')).first().tap();await playing(page,'zh-book-pond-intro');
    await page.locator('[data-action="sun"]').tap();await audioId(page,'zh-book-pond-sun');
    await page.locator(selector('menu')).tap();await page.locator('[data-setting="subtitles"]').tap();
    await page.locator('details').last().evaluate(el=>el.open=true);
    await page.evaluate(()=>{window.__touchCancels=0;document.addEventListener('pointercancel',()=>window.__touchCancels++);});
    await touch('touchStart',190,570);await touch('touchMove',190,300);await touch('touchEnd');
    assert.ok(await page.evaluate(()=>window.__touchCancels)>0,'Native modal scroll must exercise pointercancel');
    assert.equal(await page.locator('dialog').evaluate(el=>el.open),true,'Native scroll must not close or rebuild the dialog');
    assert.equal(await page.locator('[data-setting="subtitles"]').isChecked(),true);
    await page.locator('[data-setting="page"]').selectOption('1');await playing(page,'zh-book-clouds-intro');
    await gesture(page.locator('[data-drag="cloud"]'),35,25);await audioId(page,'zh-book-clouds-touch');
    await gesture(page.locator('[data-drag="cloud"]'),30,10,true);
    const plays=await page.evaluate(()=>window.__bookPlayCount);await page.locator('[data-action="cloud"]').tap();await page.waitForFunction(n=>window.__bookPlayCount===n+1,plays);await audioId(page,'zh-book-clouds-touch');
    await page.locator(selector('next')).tap();await playing(page,'zh-book-rain-intro');
    const a=await page.locator('.drop-a').boundingBox(),b=await page.locator('.drop-b').boundingBox();
    await gesture(page.locator('.drop-a'),b.x+b.width/2-a.x-a.width/2,b.y+b.height/2-a.y-a.height/2);await audioId(page,'zh-book-rain-merge');
    await page.locator(selector('menu')).tap();await page.locator('[data-setting="page"]').selectOption('4');await playing(page,'zh-book-storm-intro');
    await gesture(page.locator('[data-drag="ice"]'),0,-75);await audioId(page,'zh-book-storm-lift');
    await page.locator('[data-action="ice"]').tap();await audioId(page,'zh-book-storm-grow');
    await page.locator('[data-action="ice"]').tap();await audioId(page,'zh-book-storm-fall');
    report.results.push({browser:'chromium',freshMobileTouch:true,passed:true,checks:['first real touch entry and tap','native touch modal scroll emits pointercancel without closing or losing settings','CDP cloud drag','CDP drag cancellation then normal tap','CDP drop collision','CDP upward ice drag and repeated taps']});
    await context.close();console.log('PASS chromium fresh mobile touch and native scroll/cancel');
  }finally{await browser.close();}
}

async function audioRecovery(){
  const browser=await chromium.launch({headless:true});
  try{const page=await browser.newPage();await init(page);
    let release;const held=new Promise(resolve=>release=resolve);
    await page.route('**/zh-book-pond-intro.mp3',async route=>{await held;await route.continue();});
    await page.goto(base);await page.locator(selector('start-zh')).first().click();await audioId(page,'zh-book-pond-intro');
    await page.locator(selector('pause')).click();release();await page.waitForTimeout(250);
    assert.equal(await page.evaluate(()=>window.__bookAudio[0].paused),true,'Pause while loading must remain paused');
    await page.locator(selector('pause')).click();await playing(page,'zh-book-pond-intro');
    await page.unroute('**/zh-book-pond-intro.mp3');
    await page.route('**/zh-book-pond-sun.mp3',route=>route.fulfill({status:503,body:'offline'}));
    await page.locator('[data-action="sun"]').click();await page.locator('.audio-retry:not([hidden])').waitFor();
    await page.unroute('**/zh-book-pond-sun.mp3');await page.locator('.audio-retry').click();await playing(page,'zh-book-pond-sun');
    await page.evaluate(()=>{const a=window.__bookAudio[0];a.pause();window.__realPlay=a.play;a.play=()=>Promise.reject(new DOMException('Blocked','NotAllowedError'));});
    await page.locator(selector('replay')).first().click();await page.locator('.audio-retry:not([hidden])').waitFor();
    await page.evaluate(()=>{window.__bookAudio[0].play=window.__realPlay;});await page.locator('.audio-retry').click();await playing(page,'zh-book-pond-sun');
    report.results.push({browser:'chromium',passed:true,checks:['pause during actual pending load','503 response then real media recovery','play rejection then real media retry']});
  }finally{await browser.close();}
}
try{
  const engine=process.env.WATER_CYCLE_ENGINE||'chromium';
  if(engine==='review'){await reviewRegression();}else if(engine==='touch'){await freshTouch();}else if(engine!=='webkit'){await exercise(chromium,'chromium',[[1280,800],[1024,768],[390,844],[844,390]]);await freshTouch();await audioRecovery();}
  if(engine==='webkit'||process.env.WATER_CYCLE_WEBKIT==='1')await exercise(webkit,'webkit',[[1024,768]]);
  await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
}catch(error){await writeFile(resolve(output,'report.json'),JSON.stringify({...report,error:String(error)},null,2)+'\n');throw error;}
