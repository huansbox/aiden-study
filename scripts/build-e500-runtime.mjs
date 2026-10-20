// Generate the browser catalog from the independently rendered, checked-in parts.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { vehicleArtModels, vehiclePoseDefinitions } from './e500-art/vehicle-catalog.js';

const modelId = process.argv.find(arg => arg.startsWith('--model='))?.slice(8) || 'e500';
const definitions = { e500: {packs:14, global:'KidsBrickE500'}, emu3000: {packs:12, global:'KidsBrickEmu3000'}, r200: {packs:12, global:'KidsBrickR200'}, '700t': {packs:12, global:'KidsBrick700T'}, n700s: {packs:12, global:'KidsBrickN700S'}, emu900: {packs:12, global:'KidsBrickEmu900'}, 'breezy-blue': {packs:12, global:'KidsBrickBreezyBlue'}, ct273: {packs:14, global:'KidsBrickCT273'}, ...vehicleArtModels };
if (!Object.hasOwn(definitions, modelId)) throw Error('Unknown train model: ' + modelId);
const definition = definitions[modelId];
const directory = new URL(`../docs/shared/bricks/${modelId}-v1/`, import.meta.url);
const destination = new URL(`../docs/shared/brick-${modelId}.js`, import.meta.url);
const metadata = JSON.parse(await readFile(new URL("metadata.json", directory), "utf8"));
if (metadata.id !== modelId) throw Error('Model identity does not match its directory');
const digest = createHash("sha256");
const manifestEntries = [];
const steps = [];
const checkedAsset = async (file, sha256, expected) => {
  if (file !== expected) throw Error(`Invalid E500 asset: ${file}`);
  const bytes = await readFile(new URL(file, directory));
  if (createHash("sha256").update(bytes).digest("hex") !== sha256) throw Error(`E500 asset differs from its manifest: ${file}`);
  digest.update(file).update(bytes);
};
for (const [stepIndex, step] of metadata.steps.entries()) {
  const parts = [];
  for (const [partIndex, part] of step.parts.entries()) {
    if (part.id !== `p${stepIndex + 1}-${partIndex + 1}`) throw Error(`Invalid E500 part ID: ${part.id}`);
    await checkedAsset(part.file, part.sha256, `assets/${part.id}.png`);
    manifestEntries.push(`${part.id}:${part.sha256}`);
    const occlusionPeers = part.occlusionPeers || [];
    if (!Array.isArray(occlusionPeers) || occlusionPeers.some((id) => !parts.some((earlier) => earlier.id === id)) || new Set(occlusionPeers).size !== occlusionPeers.length)
      throw Error(`Invalid E500 occlusion peers: ${part.id}`);
    const fullMask = (1 << occlusionPeers.length) - 1;
    const variants = [];
    for (const variant of part.variants || []) {
      if (!Number.isInteger(variant.mask) || variant.mask < 0 || variant.mask >= fullMask || variants.some((entry) => entry.mask >= variant.mask))
        throw Error(`Invalid E500 variant mask: ${part.id}`);
      await checkedAsset(variant.file, variant.sha256, `assets/${part.id}-v${variant.mask}.png`);
      manifestEntries.push(`${part.id}@${variant.mask}:${variant.sha256}`);
      variants.push({ mask: variant.mask, file: variant.file });
    }
    const { id, name, z, box, imageBox, file } = part;
    if (part.motion) {
      const {pivot,basis,vector,base,tip,attach}=part.motion;
      if (!Array.isArray(pivot)||pivot.length!==2||!Array.isArray(basis)||basis.length!==4||![...pivot,...basis,...(vector||[]),...(base||[]),...(tip||[]),...(attach||[])].every(Number.isFinite)||Math.abs(basis[0]*basis[3]-basis[1]*basis[2])<.001||[vector,base,tip,attach].some(point=>point&&(!Array.isArray(point)||point.length!==2))||!!base!==!!tip) throw Error(`Invalid motion projection: ${part.id}`);
    }
    parts.push({ id, name, z, ...(part.motion?{motion:part.motion}:{}), box, imageBox, file, occlusionPeers, variants });
  }
  steps.push({ title: step.title, parts });
}
if (steps.length !== definition.packs || steps.some((step) => step.parts.length !== 3)) throw Error(`${modelId} needs ${definition.packs} packs of three groups`);
const mechanismPoses={};
const poseDefinition=vehiclePoseDefinitions[modelId];
if(metadata.mechanismPoses){
  if(!poseDefinition||Object.keys(metadata.mechanismPoses).join()!==poseDefinition.key)throw Error('Unexpected authored mechanism pose set');
  const {required,frames}=metadata.mechanismPoses[poseDefinition.key];
  const values=poseDefinition.values||poseDefinition.angles,parameter=poseDefinition.values?'value':'angle';
  if(JSON.stringify(required)!==JSON.stringify(poseDefinition.required)||!Array.isArray(frames)||frames.length!==values.length)throw Error('The complete mechanism module needs every authored pose');
  for(const [index,frame] of frames.entries()){
    if(frame[parameter]!==values[index]||JSON.stringify(frame.imageBox)!==JSON.stringify({x:0,y:0,width:800,height:500}))throw Error('Invalid mechanism pose');
    await checkedAsset(frame.file,frame.sha256,`mechanism-poses/${poseDefinition.key}-${index}.png`);
    manifestEntries.push(`mechanism:${poseDefinition.key}:${index}:${frame.sha256}`);
  }
  mechanismPoses[poseDefinition.key]={required,frames};
}
if(poseDefinition&&!mechanismPoses[poseDefinition.key])throw Error('Mechanism pose assets are missing; import a freshly downloaded render bundle');
const mechanismArt={};
const mechanismArtIds=definition.mechanismArt||[];
if(JSON.stringify(Object.keys(metadata.mechanismArt||{}))!==JSON.stringify(mechanismArtIds))throw Error('Complete mechanism artwork is missing or unexpected; import a fresh render bundle');
for(const id of mechanismArtIds){
  const artwork=metadata.mechanismArt[id];
  if(JSON.stringify(artwork.imageBox)!==JSON.stringify({x:0,y:0,width:800,height:500}))throw Error('Invalid complete mechanism image box');
  await checkedAsset(artwork.file,artwork.sha256,`mechanism-art/${id}.png`);
  manifestEntries.push(`mechanism-art:${id}:${artwork.sha256}`);
  mechanismArt[id]=artwork;
}
if (createHash("sha256").update(manifestEntries.join("\n")).digest("hex") !== metadata.assetDigest)
  throw Error("E500 asset digest differs from its manifest");
const data = {
  id: metadata.id, title: metadata.title, series: metadata.series,
  ...(Object.hasOwn(vehicleArtModels, modelId) ? {previewFormat:'png'} : {}),
  ...(Object.keys(mechanismPoses).length ? {mechanismPoses} : {}),
  ...(Object.keys(mechanismArt).length ? {mechanismArt} : {}),
  viewBox: metadata.viewBox, assetVersion: digest.digest("hex").slice(0, 16), steps,
};
const poseSource=Object.keys(mechanismPoses).length ? `  for (const rig of Object.values(data.mechanismPoses)) for (const frame of rig.frames) {
    const b = frame.imageBox;
    frame.src = base + frame.file + '?v=' + data.assetVersion;
    frame.svg = '<g aria-hidden="true"><image x="' + b.x + '" y="' + b.y + '" width="' + b.width + '" height="' + b.height + '" href="' + escapeAttribute(frame.src) + '"/></g>';
  }
` : '';
const mechanismArtSource=Object.keys(mechanismArt).length ? `  for (const artwork of Object.values(data.mechanismArt)) {
    const b = artwork.imageBox;
    artwork.src = base + artwork.file + '?v=' + data.assetVersion;
    artwork.svg = '<g aria-hidden="true"><image x="' + b.x + '" y="' + b.y + '" width="' + b.width + '" height="' + b.height + '" href="' + escapeAttribute(artwork.src) + '"/></g>';
  }
` : '';
const source = `// Generated by scripts/build-e500-runtime.mjs. Edit scripts/e500-art/ to change the model.
(function (root) {
  "use strict";
  const data = ${JSON.stringify(data)};
  const scriptUrl = typeof document !== "undefined" && document.currentScript?.src;
  const base = scriptUrl ? new URL("bricks/${modelId}-v1/", scriptUrl).href : "shared/bricks/${modelId}-v1/";
  const escapeAttribute = value => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  for (const step of data.steps) for (const part of step.parts) {
    const b = part.imageBox;
    const artwork = file => '<g aria-hidden="true"><image x="' + b.x + '" y="' + b.y + '" width="' + b.width + '" height="' + b.height + '" href="' + escapeAttribute(base + file + '?v=' + data.assetVersion) + '"/></g>';
    part.svg = artwork(part.file);
    for (const variant of part.variants) variant.svg = artwork(variant.file);
  }
${poseSource}${mechanismArtSource}  root.${definition.global} = data;
})(typeof window === "undefined" ? globalThis : window);
`;
if (process.argv.includes("--check")) {
  if ((await readFile(destination, "utf8")).replace(/\r\n/g, "\n") !== source) throw Error("E500 runtime is stale; run node scripts/build-e500-runtime.mjs");
  console.log(`${modelId} runtime matches all ${definition.packs * 3} checked-in groups.`);
} else {
  await writeFile(destination, source);
  console.log(`Generated ${modelId} runtime (${Buffer.byteLength(source)} bytes).`);
}
