// Capture the actual full model and validate preview interactions.
import assert from 'node:assert/strict';
import { connectBrowser } from '../../tests/helpers/collection-browser.mjs';
import { mkdir,writeFile } from 'node:fs/promises';
const [endpoint,origin='http://127.0.0.1:8878']=process.argv.slice(2);
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error('Use the local art preview only');
const first=await connectBrowser(endpoint);
const {targetId}=await first.send('Target.createTarget',{url:origin+'/index.html'},false);first.close();
const browser=await connectBrowser(endpoint,{targetId});
const destination=new URL('../../.scratch/e500-art/full/',import.meta.url);
await mkdir(destination,{recursive:true});
try{
 await browser.send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
 await browser.waitFor('window.renderReady===true',60000);
 const info=await browser.evaluate('({parts:e500.descriptor.steps.flatMap(s=>s.parts),bounds:e500.model.userData,meshes:(()=>{let n=0;e500.model.traverse(o=>{if(o.isMesh)n++});return n})()})');
 assert.equal(info.parts.length,42);assert.ok(info.parts.every(p=>p.id&&p.name&&Number.isFinite(p.z)));
 for(const count of [6,21,42]){
  await browser.evaluate(`e500.setCount(${count})`);
  const data=await browser.evaluate('e500.renderer.domElement.toDataURL("image/png").split(",")[1]');
  await writeFile(new URL(`stage-${count}.png`,destination),Buffer.from(data,'base64'));
 }
 const before=await browser.evaluate('e500.camera.position.toArray()');
 await browser.send('Input.dispatchMouseEvent',{type:'mousePressed',x:600,y:430,button:'left',buttons:1,clickCount:1});
 for(let i=1;i<=8;i++)await browser.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:600+i*10,y:430,button:'left',buttons:1});
 await browser.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:680,y:430,button:'left',buttons:0,clickCount:1});
 await browser.evaluate('new Promise(resolve=>setTimeout(resolve,400))');
 assert.notDeepEqual(await browser.evaluate('e500.camera.position.toArray()'),before);
 await browser.click('#reset-view');
 await browser.screenshot(new URL('page.png',destination).pathname.replace(/^\/([A-Z]:)/i,'$1'),{fullPage:true});
 await browser.send('Emulation.setDeviceMetricsOverride',{width:768,height:1024,deviceScaleFactor:1,mobile:true});
 await browser.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
 assert.ok(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'));
 await browser.screenshot(new URL('portrait.png',destination).pathname.replace(/^\/([A-Z]:)/i,'$1'),{fullPage:true});
 console.log(JSON.stringify(info));
}finally{await browser.send('Target.closeTarget',{targetId},false);browser.close();}
