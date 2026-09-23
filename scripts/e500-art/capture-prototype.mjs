// Capture the actual local 3D study; no generated concept image is substituted.
import { connectBrowser } from '../../tests/helpers/collection-browser.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const [endpoint,origin='http://127.0.0.1:8878']=process.argv.slice(2);
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error('Use the local art preview only');
const browser=await connectBrowser(endpoint,origin+'/prototype.html');
await mkdir(new URL('../../.scratch/e500-art/prototype/',import.meta.url),{recursive:true});
const destination=new URL('../../.scratch/e500-art/prototype/',import.meta.url);
try{
  await browser.send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:2,mobile:false});
  await browser.waitFor('window.renderReady===true');
  await browser.evaluate('stylePrototype.renderer.setPixelRatio(2)');
  const info=await browser.evaluate('({groups:stylePrototype.groups.map(g=>g.name),meshes:stylePrototype.meshCount})');
  if(info.groups.length<3||info.meshes<40)throw Error('The expected multi-piece model did not load');
  for(const view of ['assembled','exploded','wheels']){
    await browser.click('[data-view="'+view+'"]');
    await browser.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const data=await browser.evaluate('stylePrototype.renderer.domElement.toDataURL("image/png").split(",")[1]');
    await writeFile(new URL(view+'.png',destination),Buffer.from(data,'base64'));
  }
  await browser.click('[data-view="assembled"]');
  await browser.screenshot(new URL('page.png',destination).pathname.replace(/^\/([A-Z]:)/i,'$1'),{fullPage:true});
  await browser.send('Emulation.setDeviceMetricsOverride',{width:768,height:1024,deviceScaleFactor:1,mobile:true});
  if(!await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'))throw Error('Portrait preview overflows');
  await browser.screenshot(new URL('portrait.png',destination).pathname.replace(/^\/([A-Z]:)/i,'$1'),{fullPage:true});
  await browser.send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
  console.log(JSON.stringify(info));
}finally{browser.close();}
