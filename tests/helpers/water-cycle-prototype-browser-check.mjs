// Uses a caller-provided local file or an already running loopback server.
// Real HTMLAudioElement is muted only for automated QA; it still decodes/plays.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PLAYWRIGHT_PACKAGE||'playwright');
const base=process.env.WATER_PROTOTYPE_URL||pathToFileURL(resolve('docs/water-cycle/prototype/index.html')).href;
assert.match(base,/^(file:\/\/\/|http:\/\/127\.0\.0\.1:\d+\/water-cycle\/prototype\/)/);
assert.ok(process.env.OUTPUT_DIR,'Set OUTPUT_DIR for QA evidence.');
const output=resolve(process.env.OUTPUT_DIR);await mkdir(output,{recursive:true});
const report={base,realAudio:true,volume:0,results:[],limits:['Chromium emulation is not an iPad/Safari device test.','No child-comprehension observation or human listening assessment.','pagehide is a synthetic lifecycle event in this automation.']};
const browser=await chromium.launch({headless:true});
try{
  for(const [width,height]of[[1024,768],[1180,820],[768,1024],[390,844]]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{window.__testAudio=[];window.Audio=new Proxy(window.Audio,{construct(T,args){const a=Reflect.construct(T,args);a.volume=0;window.__testAudio.push(a);return a;}});});
    await page.goto(base);await page.locator('#start').click();
    await page.waitForFunction(()=>window.__testAudio[0].currentTime>0&&!window.__testAudio[0].paused);
    assert.equal(await page.locator('#subtitle').isVisible(),false);
    assert.equal(await page.evaluate(()=>window.__testAudio.length),1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const toScreen=async(x,y)=>{const r=await page.locator('#world').boundingBox();return{x:r.x+x*r.width/1200,y:r.y+y*r.height/800};};
    const clickSky=async(x,y)=>{const p=await toScreen(x,y);await page.mouse.click(p.x,p.y);};
    await page.locator('#wind').click();await clickSky(430,440);
    assert.equal(await page.locator('#wind').getAttribute('aria-pressed'),'false');
    await page.waitForTimeout(3100);assert.equal(await page.locator('.small-drop.show').count(),0);
    if(width===1024){
      // A real drag entering cool air reacts, and pointer cancellation restores
      // its original state instead of accidentally completing the action.
      const r=await page.locator('#wind').boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();
      const p=await toScreen(950,350);await page.mouse.move(p.x,p.y,{steps:10});
      assert.equal(await page.locator('#bird3.cold').count(),1);
      await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:1})));
      await page.mouse.up();assert.equal(await page.locator('#bird3.cold').count(),0);
    }
    await page.locator('#wind').click();await clickSky(850,300);
    assert.equal(await page.locator('#bird3.cold').count(),1);
    assert.equal(await page.locator('.small-drop.show').count(),0);
    await page.waitForTimeout(1000);assert.equal(await page.locator('.small-drop.show').count(),0);
    await page.waitForSelector('#formed-cloud.show',{timeout:6500});
    assert.equal(await page.locator('.small-drop.show').count(),8);
    await page.screenshot({path:resolve(output,`cloud-${width}x${height}.png`)});
    await page.locator('#next').click();
    assert.equal(await page.locator('#scene4 .drop').count(),8);
    const targets=await page.locator('#scene4 .drop').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return{w:b.width,h:b.height,hit:document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('button')===n};}));
    assert.ok(targets.every(t=>t.w>=47.9&&t.h>=47.9&&t.hit),'All water-drop centers reachable with 48px hit targets');
    if(width===1024){
      // Ordinary friends can rain first, leaving the unique star small.
      await page.locator('[data-drop=d3]').click();await page.locator('[data-drop=d5]').click();
      await page.waitForSelector('.drop.growing');
      assert.equal(await page.locator('.drop').count(),7);
      await page.waitForSelector('.drop.falling');await page.waitForTimeout(1700);
      assert.equal(await page.locator('.drop.hero.floating').count(),1);assert.equal(await page.locator('.landed-hero').count(),0);
      await page.locator('[data-drop=d1]').click();await page.locator('[data-drop=d2]').click();
      await page.waitForSelector('.drop.hero.growing');const growingWidth=(await page.locator('.drop.hero').boundingBox()).width;
      await page.waitForSelector('.drop.hero.floating');assert.ok((await page.locator('.drop.hero').boundingBox()).width>=growingWidth);
      // A real drag also merges. Both input paths exercise the same water model.
      const a=await page.locator('.drop.hero').boundingBox(),b=await page.locator('[data-drop=d7]').boundingBox();
      await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.up();
      await page.waitForSelector('.landed-hero');assert.equal(await page.locator('.drop.hero').count(),0);
      assert.equal(await page.locator('#bird4.follow').count(),1);
      await page.screenshot({path:resolve(output,'rain-hero-landed.png')});
      await page.locator('#previous').click();assert.equal(await page.locator('#formed-cloud.show').count(),1);
      await page.locator('#replay').click();assert.equal(await page.locator('.small-drop.show').count(),0);
      await page.locator('#next').click();assert.equal(await page.locator('.landed-hero').count(),1,'replaying scene 3 preserves scene 4');
      await page.locator('#replay').click();assert.equal(await page.locator('#scene4 .drop').count(),8);
      await page.locator('[data-drop=d1]').focus();await page.keyboard.press('Enter');await page.locator('[data-drop=d2]').focus();await page.keyboard.press('Enter');
      await page.waitForSelector('.drop.hero.growing');
      await page.locator('#listen').click();await page.waitForFunction(()=>window.__testAudio[0].currentTime>0);
      await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
      assert.equal(await page.evaluate(()=>window.__testAudio[0].getAttribute('src')),null);
      await page.waitForTimeout(1800);assert.equal(await page.evaluate(()=>window.__testAudio[0].paused),true);
    }
    await page.screenshot({path:resolve(output,`rain-${width}x${height}.png`)});
    assert.deepEqual(errors,[]);
    report.results.push({width,height,passed:true});await context.close();console.log(`PASS ${width}x${height}`);
  }
  // A fresh visit can skip directly to the rain scene without pretending that
  // the child made a cloud, and without locking controls behind completion.
  const page=await browser.newPage();await page.goto(base);await page.locator('#next').click();await page.locator('#start').click();
  await page.locator('#captions').click();assert.match(await page.locator('#subtitle').textContent(),/先來看看雲裡/);
  assert.equal(await page.locator('#scene4 .drop').count(),8);await page.close();
}finally{await browser.close();}
await writeFile(resolve(output,'browser-report.json'),JSON.stringify(report,null,2)+'\n');
