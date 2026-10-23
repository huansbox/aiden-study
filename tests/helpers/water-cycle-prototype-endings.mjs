// Focused ending checks through visible controls. Uses the caller's server/runtime.
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
const report={base,results:[],limits:['Audio failure is injected to verify recovery; it is not a media-decoding test.','Chromium touch emulation is not a real iPad test.']};
const browser=await chromium.launch({headless:true});
try{
  for(const mode of ['muted','rejected']){
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(rejected=>{
      window.__audioInstances=0;
      window.Audio=new Proxy(window.Audio,{construct(Target,args){
        const audio=Reflect.construct(Target,args);audio.volume=0;window.__audioInstances++;
        if(rejected)audio.play=()=>Promise.reject(new DOMException('QA playback rejection','NotAllowedError'));
        return audio;
      }});
    },mode==='rejected');
    await page.goto(base);if(mode==='muted')await page.locator('#sound').tap();await page.locator('#start').tap();
    await page.locator('#wind').tap();
    const world=await page.locator('#world').boundingBox();
    await page.touchscreen.tap(world.x+850*world.width/1200,world.y+300*world.height/800);
    await page.waitForSelector('#page-ending',{state:'visible',timeout:10000});
    assert.equal(await page.locator('#subtitle').isVisible(),mode==='rejected');
    assert.match(await page.locator('#continue').textContent(),/一起進雲裡/);
    await page.locator('#continue').tap();
    // Free navigation reports the unfinished star honestly, and preserves it.
    await page.locator('#next').tap();assert.match(await page.locator('#end-story').textContent(),/還沒到地面/);
    assert.match(await page.locator('#end-water').textContent(),/還沒有水滴/);
    await page.locator('#back-to-cloud').tap();assert.equal(await page.locator('.drop').count(),8);
    const merge=async(a,b)=>{
      const before=await page.locator('.drop').evaluateAll(nodes=>nodes.map(n=>n.dataset.drop));
      await page.locator(`[data-drop="${a}"]`).tap();await page.locator(`[data-drop="${b}"]`).tap();
      await page.waitForFunction(ids=>[...document.querySelectorAll('.drop')].some(n=>!ids.includes(n.dataset.drop)),before);
      return page.locator('.drop').evaluateAll((nodes,ids)=>nodes.find(n=>!ids.includes(n.dataset.drop)).dataset.drop,before);
    };
    // Ordinary water remains after its brief splash has disappeared.
    const ordinary=await merge('d3','d5');await page.waitForSelector(`[data-landed="${ordinary}"]`);
    await page.waitForTimeout(3800);assert.equal(await page.locator('.ripple').count(),0);
    assert.equal(await page.locator('.puddle').count(),1);assert.equal(await page.locator('.landed-hero').count(),0);
    const puddle=await page.locator('.puddle').evaluate(n=>({x:n.style.left,width:n.style.width,volume:n.dataset.volume}));
    const hero=await merge('d1','d2');await page.waitForSelector(`[data-drop="${hero}"].floating`);
    await merge(hero,'d7');await page.waitForSelector('.landed-hero');
    await page.waitForSelector('#page-ending',{state:'visible',timeout:10000});
    assert.match(await page.locator('#continue').textContent(),/跟小滴到地面/);
    await page.locator('#continue').tap();
    assert.match(await page.locator('#end-story').textContent(),/重逢/);
    assert.equal(await page.locator('.puddle').count(),2);assert.equal(await page.locator('#end-remaining').isVisible(),true);
    const same=await page.locator(`[data-landed="${ordinary}"]`).evaluate(n=>({x:n.style.left,width:n.style.width,volume:n.dataset.volume}));
    assert.deepEqual(same,puddle,'ending shows the actual landing, not a replacement illustration');
    const ground=await page.locator('.landed-hero').boundingBox(),panel=await page.locator('#end-panel').boundingBox();
    assert.ok(panel.y+panel.height<ground.y||panel.x+panel.width<ground.x||panel.x>ground.x+ground.width,'ending controls leave the reunited star visible');
    await page.screenshot({path:resolve(output,`${mode}-end.png`)});
    await page.locator('#back-to-cloud').tap();assert.equal(await page.locator('#page-ending').isVisible(),true);
    assert.equal(await page.locator('.puddle').count(),2);
    await page.locator('#continue').tap();await page.locator('#restart-story').tap();
    assert.equal(await page.locator('#scene3').isVisible(),true);assert.equal(await page.locator('#page-ending').isVisible(),false);
    assert.equal(await page.locator('.puddle').count(),0);assert.equal(await page.locator('.small-drop.show').count(),0);
    await page.locator('#next').tap();assert.equal(await page.locator('.drop').count(),8);
    assert.equal(await page.locator('.drop.hero').count(),1);assert.equal(await page.locator('.landed-hero').count(),0);
    assert.equal(await page.evaluate(()=>window.__audioInstances),1);assert.deepEqual(errors,[]);
    report.results.push({mode,passed:true,puddle});console.log(`PASS endings ${mode}`);await context.close();
  }
}finally{await browser.close();}
await writeFile(resolve(output,'endings-report.json'),JSON.stringify(report,null,2)+'\n');
