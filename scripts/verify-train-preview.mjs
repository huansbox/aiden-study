// Run against a fresh isolated serve-family.mjs, never production family data.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {connectBrowser} from '../tests/helpers/collection-browser.mjs';
const [endpoint,origin]=process.argv.slice(2);
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin||''))throw Error('Isolated local origin required');
assert.match(await fetch(origin+'/test/controls').then(r=>r.text()),/隔離測試控制/);
const browser=await connectBrowser(endpoint,origin), checks=[];
const pass=label=>{checks.push(label);console.log('PASS '+label);};
const report=()=>fetch(origin+'/test/study-preview/snapshot').then(r=>r.json());
assert.equal((await report()).kvSentinelsUnchanged,true,'start a fresh isolated server before running the trial check');
const cloud=async()=>Promise.all(['aiden','bingpu'].map(async child=>{
  const r=await fetch(origin+'/v1/collection/'+child,{headers:{Authorization:'Bearer test-token'}});
  assert.equal(r.status,200);return r.json();
}));
const count=()=>browser.evaluate('Number(document.querySelector(".brick-progress")?.getAttribute("aria-valuenow"))');
const {identifier}=await browser.send('Page.addScriptToEvaluateOnNewDocument',{source:`
  if(location.pathname.endsWith('/parent/train-preview.html')) {
    window.__forbidden=[];
    const stores=[localStorage,sessionStorage];
    window.__stored=()=>stores.map(store=>Object.fromEntries(Object.keys(store).sort().map(key=>[key,store.getItem(key)])));
    window.__before=__stored();
    for(const name of ['KidsCollection','KidsFamily','KidsAuth','KidsSyncV1','localStorage','sessionStorage','indexedDB','fetch','XMLHttpRequest'])
      Object.defineProperty(window,name,{configurable:true,get(){__forbidden.push(name);throw Error('Trial accessed '+name);}});
    window.__audio=[];
    const NativeAudio=window.AudioContext;
    window.AudioContext=class extends NativeAudio {
      constructor(){super();__audio.push(this);this.probe=this.createAnalyser();this.probe.connect(this.destination);}
      createGain(){const gain=super.createGain(),connect=gain.connect.bind(gain);gain.connect=target=>connect(target===this.destination?this.probe:target);return gain;}
    };
    window.__peak=()=>{const samples=new Float32Array(2048);__audio.at(-1)?.probe.getFloatTimeDomainData(samples);return Math.max(...samples.map(Math.abs));};
  }
`});
async function assertIsolated(){
  assert.deepEqual(await browser.evaluate('__forbidden'),[]);
  assert.equal(await browser.evaluate('JSON.stringify(__before)===JSON.stringify(__stored())'),true);
}
async function place(id,touch=false){
  await browser.waitFor('!document.querySelector(".brick-svg-part--just-placed")');
  await browser.click(`[data-action=part][data-part="${id}"]`,touch);
  await browser.waitFor(`document.querySelector('button[data-action=target][data-part="${id}"]')`);
  await browser.click(`button[data-action=target][data-part="${id}"]`,touch);
  await browser.waitFor('!document.querySelector(".brick-svg-part--just-placed")');
  // Use the same inter-gesture spacing as the shared touch-drag driver.
  if(touch)await new Promise(resolve=>setTimeout(resolve,500));
}
await mkdir('.scratch/train-preview',{recursive:true});
try {
  await browser.send('Emulation.setDeviceMetricsOverride',{width:1024,height:768,deviceScaleFactor:1,mobile:true});
  await browser.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await browser.navigate(origin+'/parent/?k=test-token&child=aiden');
  await browser.waitFor('document.querySelector("#daily-goals a")');
  await browser.click('[data-child="bingpu"]');
  await browser.waitFor('document.querySelector("#daily-goals a")?.getAttribute("href").includes("child=bingpu")');
  const beforeCloud=await cloud();
  const requestIndex=(await report()).requests.length;
  await browser.click('#daily-goals a');
  await browser.waitFor('document.querySelector(".brick-part:not(:disabled)")');
  assert.equal(await browser.evaluate('new URL(document.querySelector("#back-parent").href).searchParams.get("child")'),'bingpu');
  assert.equal(await count(),0);
  pass('parent trial link opens isolated first-pack mode and preserves return child');

  for(const model of ['e500','emu3000','r200','700t','n700s']) {
    if(model!=='e500'){
      await assertIsolated();
      await browser.navigate(origin+'/parent/train-preview.html?child=bingpu&model='+model);
    }
    await browser.waitFor('document.querySelector(".brick-part:not(:disabled)")');
    for(const id of ['p1-3','p1-1','p1-2'])await place(id,true);
    await browser.waitFor('document.querySelector("[data-action=allocate]")');
    assert.equal(await count(),3);
    await browser.click('[data-action=allocate]',true);
    await browser.waitFor('document.querySelector(".brick-tray__heading")?.textContent.includes("第 2 包")');
    assert.equal(await count(),3);
    pass(model+': touch placement in arbitrary order opens the next sample pack');

    if(model==='emu3000') {
      let placed=3;
      while(placed<36) {
        await browser.waitFor('!document.querySelector(".brick-svg-part--just-placed")');
        if(await browser.evaluate('Boolean(document.querySelector("[data-action=allocate]"))'))await browser.click('[data-action=allocate]');
        await browser.waitFor('document.querySelector(".brick-part:not(:disabled)")');
        const id=await browser.evaluate('document.querySelector(".brick-part:not(:disabled)").dataset.part');
        await place(id);
        placed++;
        if(placed<36)await browser.waitFor(`Number(document.querySelector('.brick-progress')?.getAttribute('aria-valuenow'))===${placed}`);
      }
      await browser.waitFor('document.querySelector("[data-celebration]")');
      await browser.click('[data-action=celebration-skip]');
      await browser.click('[data-action=display]');
      await browser.waitFor('document.querySelector(".brick-shelf-item.is-displayed")');
      assert.match(await browser.evaluate('document.querySelector(".brick-workshop h1").textContent'),/示範收藏室/);
      pass('EMU3000 all 12 sample packs / 36 groups complete and enter sample display shelf');
    }

    await browser.click('#start-last',true);
    await browser.waitFor('document.querySelector(".brick-part:not(:disabled)")');
    const total=model==='e500'?42:36, last=model==='e500'?'p14-3':'p12-3';
    assert.equal(await count(),total-1);
    assert.match(await browser.evaluate('document.querySelector(".brick-target-guide").textContent'),/最後一片，放這裡/);
    await browser.send('Emulation.setDeviceMetricsOverride',{width:768,height:1024,deviceScaleFactor:1,mobile:true});
    assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
    await browser.drag(`[data-action=part][data-part="${last}"]`,'.brick-target-guide__hit',{touch:true});
    await browser.waitFor('document.querySelector("[data-celebration]") && __peak()>0.001');
    await browser.click('.brick-celebration__sound',true);
    await browser.waitFor('__peak()<0.00001');
    await browser.click('.brick-celebration__sound',true);
    await browser.waitFor('__peak()>0.001');
    await browser.click('[data-action=celebration-skip]',true);
    await browser.waitFor('document.querySelector("[data-action=display]")');
    await browser.click('[data-action=celebration-replay]',true);
    await browser.waitFor('document.querySelector("[data-celebration]")');
    await browser.waitFor('document.querySelector("[data-action=display]")');
    await browser.click('#start-first',true);
    await browser.waitFor('document.querySelector(".brick-progress")');
    assert.equal(await count(),0);
    assert.equal(await browser.evaluate('__audio.every(audio=>audio.state==="closed")'),true);
    await assertIsolated();
    pass(model+': portrait drag, real sound, mute/unmute, skip/replay and reset pass without child/storage access');
    await browser.send('Emulation.setDeviceMetricsOverride',{width:1024,height:768,deviceScaleFactor:1,mobile:true});
  }
  await browser.click('#start-last');
  await browser.waitFor('document.querySelector(".brick-part:not(:disabled)")');
  await browser.evaluate('document.querySelector("#train-model").value="emu3000";document.querySelector("#train-model").dispatchEvent(new Event("change",{bubbles:true}));');
  await browser.waitFor('document.querySelector(".brick-stage-card h2")?.textContent.includes("EMU3000")');
  assert.equal(await count(),35);
  await browser.screenshot('.scratch/train-preview/parent-train-preview.png',{fullPage:true});
  await place('p12-3');
  await browser.waitFor('document.querySelector("[data-celebration]")');
  await browser.click('[data-action=close]');
  assert.match(await browser.evaluate('document.querySelector("#train-workshop").textContent'),/試拼已結束/);
  assert.equal(await browser.evaluate('__audio.every(audio=>audio.state==="closed")'),true);
  await browser.click('#start-first');
  await browser.waitFor('document.querySelector(".brick-part:not(:disabled)")');
  await place('p1-1');
  await assertIsolated();
  await browser.send('Page.reload');
  await browser.waitFor('document.querySelector(".brick-progress")?.getAttribute("aria-valuenow")==="0"');
  await assertIsolated();
  const requests=(await report()).requests.slice(requestIndex);
  assert.deepEqual(requests.filter(r=>/^\/(api|v1)\//.test(r.pathname)),[]);
  assert.deepEqual(await cloud(),beforeCloud);
  assert.equal((await report()).kvSentinelsUnchanged,true);
  pass('model switch / close / reload reset correctly; zero API requests and both children plus KV sentinels unchanged');
  await browser.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  pass('390px mobile and Pad layouts have no horizontal page overflow');
} finally {
  await browser.send('Page.removeScriptToEvaluateOnNewDocument',{identifier});
  await browser.send('Emulation.clearDeviceMetricsOverride');
  await writeFile('.scratch/train-preview/e2e-result.json',JSON.stringify({checks,physicalIPad:false,at:new Date().toISOString()},null,2)+'\n');
  browser.close();
}
