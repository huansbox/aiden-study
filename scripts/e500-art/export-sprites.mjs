import { connectBrowser } from '../../tests/helpers/collection-browser.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const base=path.dirname(fileURLToPath(import.meta.url)),out=path.resolve(base,'../../.scratch/e500-art/candidates');
await fs.mkdir(path.join(out,'assets'),{recursive:true});
const endpoint=process.argv[2];
const origin=process.argv.find(a=>/^http:\/\/127\.0\.0\.1:\d+$/.test(a))||'http://127.0.0.1:8877';
const first=await connectBrowser(endpoint);
const {targetId}=await first.send('Target.createTarget',{url:origin+'/index.html?sprites=1'},false);first.close();
const tab=await connectBrowser(endpoint,{targetId});
try{
 await tab.waitFor('window.renderReady===true',60000);
 const model=await tab.evaluate('window.e500.descriptor'),parts=model.steps.flatMap(s=>s.parts);
 assert.equal(parts.length,42);
 parts.forEach((p,i)=>assert.equal(p.id,`p${Math.floor(i/3)+1}-${i%3+1}`));
 const metadata={id:model.id,title:model.title,series:model.series,viewBox:model.viewBox,scale:2,steps:[]};
 const raw=Buffer.from(await tab.evaluate('window.e500.renderSelection(Array.from({length:42},(_,i)=>i))'),'base64');
 await sharp(raw).resize(1600,1000).png().toFile(path.join(out,'full-3d.png'));
 for(let i=0;i<parts.length;i++){
  const p=parts[i],packStart=i-i%3,fullMask=(1<<(i%3))-1,images=[];
  // Packs are sequential, but the three pieces inside a pack are free-order.
  // Retain every possible earlier-sibling visibility state for this piece.
  for(let mask=0;mask<=fullMask;mask++){
   const occludeWith=Array.from({length:packStart},(_,n)=>n);
   for(let bit=0;bit<i%3;bit++)if(mask&(1<<bit))occludeWith.push(packStart+bit);
   images.push(Buffer.from(await tab.evaluate(`window.e500.renderSelection([${i}],{occludeWith:${JSON.stringify(occludeWith)}})`),'base64'));
  }
  const png=images[0];
  const {data,info}=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,3200,'authoring camera must render at 4× before 2× export');
  assert.equal(info.height,2000);
  let left=info.width,top=info.height,right=-1,bottom=-1;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>2){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  if(right<0)throw Error(p.id+' invisible');
  left=Math.max(0,left-8);top=Math.max(0,top-8);right=Math.min(info.width-1,right+8);bottom=Math.min(info.height-1,bottom+8);
  const width=right-left+1,height=bottom-top+1,scale=info.width/800;
  const cropped=await Promise.all(images.map(image=>sharp(image).extract({left,top,width,height}).resize(Math.round(width/2),Math.round(height/2)).png().toBuffer()));
  const hashes=cropped.map(bytes=>createHash('sha256').update(bytes).digest('hex'));
  const sha256=hashes[fullMask],variants=[];
  await fs.writeFile(path.join(out,'assets',p.id+'.png'),cropped[fullMask]);
  for(let mask=0;mask<fullMask;mask++)if(hashes[mask]!==sha256){
   const file=`assets/${p.id}-v${mask}.png`;
   await fs.writeFile(path.join(out,file),cropped[mask]);variants.push({mask,file,sha256:hashes[mask]});
  }
  const imageBox={x:left/scale,y:top/scale,width:width/scale,height:height/scale};
  const box={x:imageBox.x-(Math.max(44,imageBox.width)-imageBox.width)/2,y:imageBox.y-(Math.max(44,imageBox.height)-imageBox.height)/2,width:Math.max(44,imageBox.width),height:Math.max(44,imageBox.height)};
  if(box.x<0||box.y<0||box.x+box.width>800||box.y+box.height>500)throw Error(p.id+' exceeds canvas');
  if(i%3===0)metadata.steps.push({title:model.steps[i/3].title,parts:[]});
  metadata.steps.at(-1).parts.push({id:p.id,name:p.name,z:i,box,imageBox,file:'assets/'+p.id+'.png',sha256,occlusionPeers:parts.slice(packStart,i).map(p=>p.id),variants});
  console.log(`${p.id} ${width}×${height}`);
 }
 metadata.assetDigest=createHash('sha256').update(metadata.steps.flatMap(s=>s.parts).flatMap(p=>[p.id+':'+p.sha256,...p.variants.map(v=>`${p.id}@${v.mask}:${v.sha256}`)]).join('\n')).digest('hex');
 await fs.writeFile(path.join(out,'metadata.json'),JSON.stringify(metadata,null,2)+'\n');
 const flat=metadata.steps.flatMap(s=>s.parts);
 const compose=async(list,destination)=>{
  const layers=[];
  const placed=new Set(list.map(p=>p.id));
  for(const p of [...list].sort((a,b)=>a.z-b.z)){
   const mask=p.occlusionPeers.reduce((mask,id,bit)=>mask|(placed.has(id)?1<<bit:0),0);
   const file=p.variants.find(v=>v.mask===mask)?.file||p.file;
   layers.push({input:await sharp(path.join(out,file)).resize(Math.round(p.imageBox.width*2),Math.round(p.imageBox.height*2)).png().toBuffer(),left:Math.round(p.imageBox.x*2),top:Math.round(p.imageBox.y*2)});
  }
  await sharp({create:{width:1600,height:1000,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).png().toFile(path.join(out,destination));
 };
 await compose(flat,'composited.png');
 for(const count of [3,6,21])await compose(flat.slice(0,count),`stage-${count}.png`);
 // The window pack has distant/near glazing that exposes painter-order bugs.
 for(const siblings of [[2],[2,0],[2,0,1]]){
  const indices=[...Array.from({length:24},(_,i)=>i),...siblings.map(i=>24+i)];
  const name='window-order-'+siblings.map(i=>i+1).join('-');
  await compose(indices.map(i=>flat[i]),name+'.png');
  const reference=Buffer.from(await tab.evaluate(`window.e500.renderSelection(${JSON.stringify(indices)})`),'base64');
  await sharp(reference).resize(1600,1000).png().toFile(path.join(out,name+'-3d.png'));
 }
 for(const file of ['full-3d','composited','stage-3','stage-6','stage-21'])await sharp(path.join(out,file+'.png')).flatten({background:'#eee3d1'}).png().toFile(path.join(out,file+'-on-beige.png'));
 const {data:actual}=await sharp(path.join(out,'composited.png')).raw().toBuffer({resolveWithObject:true});
 const {data:reference}=await sharp(path.join(out,'full-3d.png')).raw().toBuffer({resolveWithObject:true});
 let differs=0,visible=0;
 for(let i=0;i<actual.length;i+=4){if(reference[i+3]>5||actual[i+3]>5){visible++;if(Math.abs(actual[i]-reference[i])+Math.abs(actual[i+1]-reference[i+1])+Math.abs(actual[i+2]-reference[i+2])>70)differs++;}}
 console.log({visiblePixels:visible,materialOrOcclusionDifference:differs/visible});
 await fs.writeFile(path.join(out,'comparison.json'),JSON.stringify({visiblePixels:visible,materialOrOcclusionDifference:differs/visible,notes:'Difference includes shadows cast between groups and subpixel alpha resampling, as well as ordering. Inspect images, do not treat as a visual acceptance test.'},null,2));
 await fs.writeFile(path.join(out,'candidate-model.js'),`(function(root){const data=${JSON.stringify(metadata)};root.createE500SpriteCandidate=function(assetBase){if(!assetBase)throw Error('An explicit local asset base is required');return {...data,steps:data.steps.map(s=>({...s,parts:s.parts.map(p=>({...p,svg:'<g aria-hidden="true"><image x="'+p.imageBox.x+'" y="'+p.imageBox.y+'" width="'+p.imageBox.width+'" height="'+p.imageBox.height+'" href="'+assetBase.replace(/\\/$/,'')+'/'+p.file+'"/></g>'}))}))};};})(window);`);
 await fs.writeFile(path.join(out,'index.html'),`<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>E500 積木素材比對</title><style>body{margin:0;padding:24px;background:#eee3d1;font:16px system-ui;color:#303840}h1{font-size:24px}section{display:grid;grid-template-columns:1fr 1fr;gap:16px}.card{background:#f8f3ea;border-radius:16px;padding:16px}img,svg{width:100%;height:auto}p{margin:0}h2{font-size:18px}#live{border:1px solid #d5c9b6}</style><h1>E500：42 組積木素材</h1><p>左：完整模型。右：工作台使用的 42 組零件圖片合成；下方可看逐步拼裝。</p><section><div class="card"><h2>完整 3D</h2><img src="full-3d.png"></div><div class="card"><h2>42 張組合</h2><svg id="live" viewBox="0 0 800 500"></svg></div></section><section>${[3,6,21,42].map(n=>'<div class="card"><h2>'+n+' / 42</h2><img src="'+(n===42?'composited.png':'stage-'+n+'.png')+'"></div>').join('')}</section><script src="candidate-model.js"></script><script>const model=createE500SpriteCandidate('.');document.querySelector('#live').innerHTML=model.steps.flatMap(s=>s.parts).sort((a,b)=>a.z-b.z).map(p=>p.svg).join('');</script></html>`);
 if(process.argv.includes('--publish')){
  const published=path.resolve(base,'../../docs/shared/bricks/e500-v1');
  await fs.mkdir(path.join(published,'assets'),{recursive:true});
  for(const p of metadata.steps.flatMap(s=>s.parts))for(const asset of [p,...p.variants])await fs.copyFile(path.join(out,asset.file),path.join(published,asset.file));
  await fs.copyFile(path.join(out,'metadata.json'),path.join(published,'metadata.json'));
  console.log('Published 42 sprites and metadata: '+published);
 }
}finally{await tab.send('Target.closeTarget',{targetId},false);tab.close();}
