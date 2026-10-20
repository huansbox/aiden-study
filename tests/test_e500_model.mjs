import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { vehicleArtModels, vehiclePoseDefinitions } from '../scripts/e500-art/vehicle-catalog.js';

const root = new URL("../", import.meta.url);
for (const [modelId, globalName, packs, series] of [
  ['e500', 'KidsBrickE500', 14, '臺灣火車系列'],
  ['emu3000', 'KidsBrickEmu3000', 12, '臺灣火車系列'],
  ['r200', 'KidsBrickR200', 12, '臺灣火車系列'],
  ['700t', 'KidsBrick700T', 12, '臺灣高速鐵路'],
  ['n700s', 'KidsBrickN700S', 12, '日本新幹線'],
  ['emu900', 'KidsBrickEmu900', 12, '臺灣火車系列'],
  ['breezy-blue', 'KidsBrickBreezyBlue', 12, '臺灣火車系列'],
  ['ct273', 'KidsBrickCT273', 14, '臺灣火車系列'],
  ...Object.entries(vehicleArtModels).map(([id, definition])=>[id,definition.global,definition.packs,definition.series]),
]) {
const source = fs.readFileSync(new URL(`docs/shared/brick-${modelId}.js`, root), "utf8");
const context = vm.createContext({});
vm.runInContext(source, context);
const model = context[globalName];
const parts = model.steps.flatMap(step => step.parts);
const assetPath = part => new URL(`docs/shared/bricks/${modelId}-v1/${part.file}`, root);

test(`${modelId} has ${packs} complete semantic packs and stable placement identities`, () => {
  assert.equal(model.id, modelId);
  assert.equal(model.series, series);
  assert.equal(model.viewBox, "0 0 800 500");
  if(vehicleArtModels[modelId])assert.equal(model.previewFormat,'png');
  const movingIds=modelId==='jet-plane'?['p6-3','p7-3']:Object.keys(vehicleArtModels[modelId]?.motionUnits||{});
  for(const id of movingIds)assert.ok(parts.find(part=>part.id===id)?.motion,`${id} keeps its actual projected hinge`);
  assert.equal(model.steps.length, packs);
  assert.equal(parts.length, packs * 3);
  assert.equal(new Set(parts.map(p => p.name)).size, packs * 3);
  model.steps.forEach((step, i) => {
    assert.ok(step.title);
    assert.equal(step.parts.length, 3);
    step.parts.forEach((part, j) => {
      assert.equal(part.id, `p${i + 1}-${j + 1}`);
      assert.deepEqual(Array.from(part.occlusionPeers), Array.from(step.parts.slice(0, j), p => p.id));
      assert.equal(new Set(part.variants.map(v => v.mask)).size, part.variants.length);
      for (const variant of part.variants) assert.ok(Number.isInteger(variant.mask) && variant.mask >= 0 && variant.mask < (1 << j) - 1);
      if(part.motion) {
        assert.equal(part.motion.pivot.length,2);
        assert.equal(part.motion.basis.length,4);
        assert.ok([...part.motion.pivot,...part.motion.basis].every(Number.isFinite));
        const [a,b,c,d]=part.motion.basis;
        assert.ok(Math.abs(a*d-b*c)>.001,'motion plane has an invertible perspective basis');
      }
    });
  });
});

test(`${modelId}: every independently cropped image fits its touch target and decodes as transparent PNG`, async () => {
  for (const p of parts) {
    const b = p.box, image = p.imageBox;
    assert.ok(Number.isFinite(p.z), p.id);
    assert.ok(Object.values(b).every(Number.isFinite), p.id);
    assert.ok(b.width >= 44 && b.height >= 44, p.id);
    assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.width <= 800 && b.y + b.height <= 500, p.id);
    assert.ok(image.x >= b.x && image.y >= b.y && image.x + image.width <= b.x + b.width && image.y + image.height <= b.y + b.height, p.id);
    assert.ok(image.width < 800 && image.height < 500, `${p.id} is independently cropped`);
    assert.doesNotMatch(p.svg, /NaN|undefined|<script|\bid=|url\(/, p.id);
    assert.equal((p.svg.match(/<image\b/g) || []).length, 1, p.id);
    assert.ok(p.svg.includes(`x="${image.x}" y="${image.y}" width="${image.width}" height="${image.height}"`), p.id);
    for (const asset of [p, ...p.variants]) {
    assert.doesNotMatch(asset.svg, /NaN|undefined|<script|\bid=|url\(/, asset.file);
    assert.equal((asset.svg.match(/<image\b/g) || []).length, 1, asset.file);
    const raster = sharp(fs.readFileSync(assetPath(asset)));
    const info = await raster.metadata();
    assert.equal(info.format, "png", p.id);
    assert.ok(info.hasAlpha, p.id);
    assert.ok(Math.abs(info.width - image.width * 2) <= 1 && Math.abs(info.height - image.height * 2) <= 1, `${p.id} has a 2x image`);
    const pixels = await raster.ensureAlpha().raw().toBuffer();
    let opaque = 0, transparent = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] > 100) opaque++;
      if (pixels[i] === 0) transparent++;
    }
    assert.ok(opaque > 100 && transparent > 100, `${p.id} has visible artwork and transparent surroundings`);
    }
  }
});

test(`${modelId}: all six within-pack placement orders visibly advance the assembled model`, async () => {
  const images = new Map();
  for (const p of parts) for (const asset of [p, ...p.variants]) {
    images.set(asset.file, await sharp(fs.readFileSync(assetPath(asset))).resize(Math.round(p.imageBox.width), Math.round(p.imageBox.height)).toBuffer());
  }
  const canvas = () => sharp({ create: { width: 800, height: 500, channels: 4, background: "#f3efe5" } });
  const compose = selection => {
    const placed = new Set(selection.map(p => p.id));
    const overlays = [...selection].sort((a,b) => a.z-b.z).map(p => {
      const mask = p.occlusionPeers.reduce((value,id,bit) => value | (placed.has(id) ? 1 << bit : 0), 0);
      const file = p.variants.find(v => v.mask === mask)?.file || p.file;
      return {input:images.get(file),left:Math.round(p.imageBox.x),top:Math.round(p.imageBox.y)};
    });
    return canvas().composite(overlays).raw().toBuffer();
  };
  for (let pack = 0; pack < packs; pack++) {
    const completed = parts.slice(0,pack*3);
    const initial = await compose(completed);
    for (const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]) {
      let previous = initial;
      const selection = [...completed];
      for (const index of order) {
        const part = parts[pack*3+index];selection.push(part);
        const current = await compose(selection);
        let changed = 0;
        for (let i = 0; i < current.length; i += 4) if (Math.abs(current[i] - previous[i]) + Math.abs(current[i + 1] - previous[i + 1]) + Math.abs(current[i + 2] - previous[i + 2]) > 30) changed++;
        assert.ok(changed > 100, `${part.id}, order ${order}: ${changed} visibly changed pixels`);
        previous = current;
      }
    }
  }
});

test(`${modelId}: asset URLs remain local under root and repository-prefixed Pages deployments`, () => {
  for (const prefix of ["", "/aiden-study"]) {
    const another = vm.createContext({ window: {}, URL, document: { currentScript: { src: `https://example.test${prefix}/shared/brick-${modelId}.js?v=release` } } });
    vm.runInContext(source, another);
    for (const p of another.window[globalName].steps.flatMap(step => step.parts)) {
      for (const asset of [p, ...p.variants]) assert.ok(asset.svg.includes(`href="https://example.test${prefix}/shared/bricks/${modelId}-v1/${asset.file}?v=${model.assetVersion}"`), p.id);
    }
    for(const rig of Object.values(another.window[globalName].mechanismPoses||{}))for(const frame of rig.frames)
      assert.ok(frame.svg.includes(`href="https://example.test${prefix}/shared/bricks/${modelId}-v1/${frame.file}?v=${model.assetVersion}"`),frame.file);
    for(const artwork of Object.values(another.window[globalName].mechanismArt||{}))
      assert.ok(artwork.svg.includes(`href="https://example.test${prefix}/shared/bricks/${modelId}-v1/${artwork.file}?v=${model.assetVersion}"`),artwork.file);
  }
});

test(`${modelId}: checked-in runtime matches the asset manifest and image bytes`, () => {
  execFileSync(process.execPath, [fileURLToPath(new URL("scripts/build-e500-runtime.mjs", root)), "--check", `--model=${modelId}`]);
  const another = vm.createContext({ window: {} });
  vm.runInContext(source, another);
  assert.equal(JSON.stringify(another.window[globalName]), JSON.stringify(model));
});

if(vehiclePoseDefinitions[modelId])test(`${modelId} poses contain the actual moving geometry with the complete module requirement`,async()=>{
  const definition=vehiclePoseDefinitions[modelId],rig=model.mechanismPoses?.[definition.key];
  assert.ok(rig);
  assert.equal(Array.from(rig.required).join(','),definition.required.join(','));
  assert.equal(rig.frames.length,definition.angles.length);
  assert.ok(new Set(rig.frames.map(frame=>frame.sha256)).size>=4);
  for(const [index,frame] of rig.frames.entries()){
    assert.equal(frame.angle,definition.angles[index]);
    assert.equal(frame.file,`mechanism-poses/${definition.key}-${index}.png`);
    assert.equal(JSON.stringify(frame.imageBox),JSON.stringify({x:0,y:0,width:800,height:500}));
    const info=await sharp(fs.readFileSync(assetPath(frame))).metadata();
    assert.equal(info.format,'png');assert.ok(info.hasAlpha);
    assert.equal(info.width,1600);assert.equal(info.height,1000);
    assert.match(frame.svg,/<image x="0" y="0" width="800" height="500"/);
    assert.ok(frame.src.includes(`${frame.file}?v=${model.assetVersion}`));
  }
});

if(vehicleArtModels[modelId]?.mechanismArt)test(`${modelId} keeps complete original moving-part PNGs independently of the fixed vehicle`,async()=>{
  const ids=vehicleArtModels[modelId].mechanismArt;
  assert.equal(Object.keys(model.mechanismArt||{}).join(','),ids.join(','));
  for(const id of ids){
    const artwork=model.mechanismArt[id];
    assert.equal(artwork.file,`mechanism-art/${id}.png`);
    assert.equal(JSON.stringify(artwork.imageBox),JSON.stringify({x:0,y:0,width:800,height:500}));
    const raster=sharp(fs.readFileSync(assetPath(artwork))),info=await raster.metadata();
    assert.equal(info.format,'png');assert.ok(info.hasAlpha);
    assert.equal(info.width,1600);assert.equal(info.height,1000);
    const pixels=await raster.ensureAlpha().raw().toBuffer();let opaque=0,transparent=0;
    for(let index=3;index<pixels.length;index+=4){if(pixels[index]>100)opaque++;if(pixels[index]===0)transparent++;}
    assert.ok(opaque>100&&transparent>100,`${id} retains visible source artwork and transparent surroundings`);
    assert.match(artwork.svg,/<image x="0" y="0" width="800" height="500"/);
    assert.ok(artwork.src.includes(`${artwork.file}?v=${model.assetVersion}`));
  }
});

}
