// Release gates deliberately use the published PNGs, never synthetic fallback.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {vehicleIds,vehicleGlobals} from './helpers/working-vehicle-fixtures.mjs';
import {spinMatrix} from './helpers/svg-spin-plane.mjs';
const source=name=>readFileSync(new URL(`../docs/shared/${name}`,import.meta.url),'utf8');
function contextFor(ids) {
  const ctx=vm.createContext({console,Set});ctx.window=ctx;
  for(const file of ['collection-core.js',...ids.map(id=>`brick-${id}.js`),'brick-models.js','brick-workshop.js','brick-celebration.js','vehicle-mechanism.js']) vm.runInContext(source(file),ctx);
  return ctx;
}
const saved=model=>new Set(model.steps.slice(1).flatMap(step=>step.parts.map(part=>part.id)));
const matrix=(scene,unit,id)=>scene.match(new RegExp(`data-vehicle-move="${unit}" data-moving-part="${id}" transform="matrix\\(([^)]+)\\)"`))?.[1].split(' ').map(Number);
const apply=(m,p)=>[m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} ≈ ${b}`);
function transformFor(scene,unit,id) {return scene.match(new RegExp(`data-vehicle-move="${unit}" data-moving-part="${id}" transform="([^"]+)"`))?.[1];}
function groupInner(scene,part) {
  const start=scene.indexOf(`<g data-vehicle-part="${part}">`);assert.ok(start>=0,part);
  const rest=scene.slice(start),tags=rest.matchAll(/<g\b[^>]*>|<\/g>/g);let depth=0,content=0;
  for(const tag of tags) {
    if(tag[0].startsWith('</'))depth--;else {depth++;if(depth===1)content=tag.index+tag[0].length;}
    if(depth===0)return rest.slice(content,tag.index);
  }
  throw Error('Unclosed PNG group');
}
function embedded(svg) {
  // The browser parses these as HTML data attributes; librsvg needs XML syntax.
  return svg.replace(/\b(data-[a-z0-9-]+)(?=\s|>)/g,'$1=""').replace(/href="([^"]+)"/g,(_,src)=> {
    const bytes=readFileSync(new URL(`../docs/${src.split('?')[0]}`,import.meta.url));
    return `href="data:image/png;base64,${bytes.toString('base64')}"`;
  });
}
async function alphaContinuity(input) {
  const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const count=info.width*info.height,seen=new Uint8Array(count),queue=new Int32Array(count);let top=info.height,bottom=0,best=0;
  for(let index=0;index<count;index++) {
    if(data[index*4+3]<32)continue;const y=Math.floor(index/info.width);top=Math.min(top,y);bottom=Math.max(bottom,y);
    if(seen[index])continue;
    let read=0,end=1,area=0,lo=y,hi=y;queue[0]=index;seen[index]=1;
    while(read<end) {
      const current=queue[read++],row=Math.floor(current/info.width),column=current%info.width;area++;lo=Math.min(lo,row);hi=Math.max(hi,row);
      for(const next of [column>0?current-1:-1,column+1<info.width?current+1:-1,row>0?current-info.width:-1,row+1<info.height?current+info.width:-1]) {
        if(next>=0 && !seen[next] && data[next*4+3]>=32) {seen[next]=1;queue[end++]=next;}
      }
    }
    if(area>40)best=Math.max(best,hi-lo+1);
  }
  return best/(bottom-top+1);
}

for(const id of vehicleIds) test(`${id}: published source/runtime counts, PNGs, preview and motion metadata are complete`,()=>{
  const ctx=contextFor([id]),model=ctx[vehicleGlobals[id]],count=id==='jet-plane'?11:10;
  assert.ok(model,`${id} must ship its own model`);assert.equal(model.id,id);assert.equal(model.steps.length,count);
  const build={modelId:id,contentVersion:2};assert.equal(ctx.KidsCollectionCore.packCount(build),count-1);
  assert.equal(model.previewFormat,'png');assert.equal(model.viewBox,'0 0 800 500');
  const folder=new URL(`../docs/shared/bricks/${id}-v1/`,import.meta.url),metadata=JSON.parse(readFileSync(new URL('metadata.json',folder),'utf8'));
  assert.equal(metadata.id,id);
  for(const step of model.steps) for(const part of step.parts) {
    assert.match(part.svg,new RegExp(`${id}-v1/assets/${part.id}\\.png`));
    const file=new URL(`assets/${part.id}.png`,folder);assert.ok(existsSync(file));
    const buffer=readFileSync(file);assert.equal(buffer.subarray(1,4).toString(),'PNG');
    if(part.motion) {
      const {pivot,basis}=part.motion;assert.equal(pivot.length,2);assert.equal(basis.length,4);
      assert.ok([...pivot,...basis].every(Number.isFinite));assert.ok(Math.abs(basis[0]*basis[3]-basis[1]*basis[2])>.01);
    }
  }
  const thumb=ctx.KidsBrickWorkshop.thumbnail(id,{complete:true});assert.match(thumb,/preview\.png/);assert.doesNotMatch(thumb,/<svg|<image/);
  assert.ok(existsSync(new URL('preview.png',folder)));
  for(const [kind,pose] of Object.entries(model.mechanismPoses || {})) {
    assert.ok(pose.frames.length>=4,kind);assert.ok(pose.required.every(part=>saved(model).has(part)));
    const declared=metadata.mechanismPoses[kind];assert.equal(declared.frames.length,pose.frames.length);
    const hashes=new Set();
    for(const frame of declared.frames) {
      const bytes=readFileSync(new URL(frame.file,folder));assert.equal(bytes.subarray(1,4).toString(),'PNG');
      assert.equal(bytes.readUInt32BE(16),1600);assert.equal(bytes.readUInt32BE(20),1000);
      const digest=createHash('sha256').update(bytes).digest('hex');assert.equal(digest,frame.sha256);hashes.add(digest);
    }
    assert.ok(hashes.size>=4,`${kind} needs actual distinct rendered poses`);
  }
  for(const [part,art] of Object.entries(model.mechanismArt || {})) {
    assert.ok(saved(model).has(part));const declared=metadata.mechanismArt[part],bytes=readFileSync(new URL(declared.file,folder));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),declared.sha256);assert.match(art.svg,/\.png\?v=/);
  }
  const requiredPoses={'excavator':['turntable'],'snow-blower':['auger'],'cement-mixer':['drum']}[id] || [];
  for(const key of requiredPoses) assert.ok(model.mechanismPoses?.[key],`${id} cannot ship with missing ${key} poses`);
  const celebration=ctx.KidsBrickCelebration.render(model,{build});assert.match(celebration,/積木作品/);assert.doesNotMatch(celebration,/積木列車/);
  assert.equal((celebration.match(/brick-celebration__rail-section/g)||[]).length,0,'vehicle grounds never repeat as railway track');
});

test('published jet-plane turbines use the geometry-projected center and keep their real plane attached',()=>{
  const ctx=contextFor(['jet-plane']),model=ctx.KidsBrickJetPlane,feature=ctx.KidsVehicleMechanism.create(model);feature.sync(saved(model));
  const part=model.steps[5].parts[2],motion=part.motion;assert.ok(motion,'real engine axis metadata required');
  feature.move('fan-left',1/6);const scene=feature.scene(saved(model)),m=spinMatrix(scene,'fan-left');assert.ok(m);
  const pivot=apply(m,motion.pivot);close(pivot[0],motion.pivot[0]);close(pivot[1],motion.pivot[1]);
  const u=apply(m,[motion.pivot[0]+motion.basis[0],motion.pivot[1]+motion.basis[1]]);
  close(u[0],motion.pivot[0]+motion.basis[2]);close(u[1],motion.pivot[1]+motion.basis[3]);
  spinMatrix(scene,'fan-right').forEach((n,i)=>close(n,[1,0,0,1,0,0][i]));
});

test('published excavator hydraulic bases stay fixed while their tips follow the joint plane',()=>{
  const ctx=contextFor(['excavator']),model=ctx.KidsBrickExcavator,feature=ctx.KidsVehicleMechanism.create(model);feature.sync(saved(model));feature.move('boom',.5);
  const part=model.steps[6].parts[1],hinge=model.steps[6].parts[2];assert.ok(part.motion?.base && part.motion?.tip && hinge.motion?.basis);
  const scene=feature.scene(saved(model)),link=matrix(scene,'boom','p7-2'),arm=matrix(scene,'boom','p7-1');assert.ok(link && arm);
  const base=apply(link,part.motion.base),tip=apply(link,part.motion.tip),expected=apply(arm,part.motion.tip);
  close(base[0],part.motion.base[0]);close(base[1],part.motion.base[1]);close(tip[0],expected[0]);close(tip[1],expected[1]);
});

test('published crane telescoping interfaces stay joined and its real PNG cable stays continuous through hoist travel',async()=>{
  const ctx=contextFor(['mobile-crane']),model=ctx.KidsBrickMobileCrane,feature=ctx.KidsVehicleMechanism.create(model),parts=saved(model);
  const middle=model.steps[6].parts[1],outer=model.steps[6].parts[2],wire=model.steps[7].parts[1];
  assert.ok(middle.motion?.vector && outer.motion?.vector && wire.motion?.base);
  const unoccluded=model.mechanismArt?.['p8-2'];assert.ok(unoccluded,'occlusion-cut source wire cannot be stretched into a complete cable');
  const src=unoccluded.src || unoccluded.svg.match(/href="([^"]+)"/)[1];
  assert.ok(await alphaContinuity(readFileSync(new URL(`../docs/${src.split('?')[0]}`,import.meta.url)))>.98,'the real wire PNG contains a continuous cord and pulley housing');
  feature.sync(parts);feature.move('supports',1);
  for(const extension of [0,.5,1]) for(const lift of [.5,1]) {
    feature.move('telescope',extension);feature.move('hoist',lift);
    const scene=feature.scene(parts),m=matrix(scene,'telescope','p7-2'),o=matrix(scene,'telescope','p7-3');assert.ok(m && o);
    const middleEnd=apply(m,middle.motion.pivot.map((n,i)=>n+middle.motion.vector[i])),outerBase=apply(o,outer.motion.pivot);
    close(middleEnd[0],outerBase[0]);close(middleEnd[1],outerBase[1]);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><g transform="${transformFor(scene,'telescope','p8-2')}"><g transform="${transformFor(scene,'hoist','p8-2')}">${embedded(groupInner(scene,'p8-2'))}</g></g><g transform="${transformFor(scene,'telescope','p8-3')}"><g transform="${transformFor(scene,'hoist','p8-3')}">${embedded(groupInner(scene,'p8-3'))}</g></g></svg>`;
    assert.ok(await alphaContinuity(Buffer.from(svg))>.98,`the visible cord/housing/hook connects at extension ${extension}, hoist ${lift}`);
  }
});

test('published recycler restores complete body/door art and keeps both ends of the long door hinge attached',async()=>{
  const ctx=contextFor(['recycling-truck']),model=ctx.KidsBrickRecyclingTruck,feature=ctx.KidsVehicleMechanism.create(model),parts=saved(model);
  for(const pack of [5,6,7]) for(const n of [1,2,3]) assert.ok(model.mechanismArt?.[`p${pack}-${n}`]?.svg,'a moving rig must not retain old cab/body occlusion holes');
  const area=async src=> {
    const {data}=await sharp(readFileSync(new URL(`../docs/${src.split('?')[0]}`,import.meta.url))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let pixels=0;for(let i=3;i<data.length;i+=4)if(data[i]>32)pixels++;return pixels;
  };
  const door=model.steps[6].parts[0],art=model.mechanismArt['p7-1'];
  const oldSrc=door.variants.find(variant=>variant.mask===0)?.svg.match(/href="([^"]+)"/)[1] || door.svg.match(/href="([^"]+)"/)[1];
  assert.ok(await area(art.src)>await area(oldSrc)*2,'opening must reveal a complete door, rather than its old exposed white corners');
  feature.sync(parts);feature.move('tip',1);
  const scene=feature.scene(parts),shaft=matrix(scene,'tip','p7-2'),panel=matrix(scene,'tip','p7-1'),motion=model.steps[6].parts[1].motion;
  assert.ok(shaft && panel);
  const [xx,xy,yx,yy]=motion.basis,zx=Math.sqrt(1-xx*xx-yx*yx),zy=-(xx*xy+yx*yy)/zx;
  for(const end of [-60,60]) {
    const point=[motion.pivot[0]+zx*end,motion.pivot[1]+zy*end],fixed=apply(shaft,point),doorEdge=apply(panel,point);
    close(fixed[0],doorEdge[0]);close(fixed[1],doorEdge[1]);
  }
  assert.equal(transformFor(scene,'tip','p10-2'),'translate(0 0)','chassis reflectors stay on the chassis');
  assert.match(scene,/data-vehicle-beacon transform="matrix/);assert.match(scene,/data-vehicle-chassis-lights clip-path=/);
});

test('published thirteen-model picker is complete, ordered and leaves R200/legacy identities available only for old saves',()=>{
  const old=['e500','ct273','breezy-blue','emu3000','emu900','700t','n700s'],ctx=contextFor([...old,'r200',...vehicleIds]);
  assert.deepEqual(Array.from(ctx.KidsCollectionCore.AVAILABLE_MODELS),[...vehicleIds,...old]);
  assert.deepEqual(Array.from(ctx.KidsBrickModels.models.filter(model=>ctx.KidsCollectionCore.isModelAvailable(model.id)),model=>model.id).sort(),[...vehicleIds,...old].sort());
  for(const id of ['r200','car','train','plane']) {assert.ok(ctx.KidsBrickModels.get(id));assert.equal(ctx.KidsCollectionCore.isModelAvailable(id),false);}
  assert.deepEqual(Array.from(ctx.KidsBrickModels.models.slice(0,6),model=>model.id),vehicleIds);
});
