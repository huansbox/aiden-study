// Deterministic completed previews from the checked-in full-mask part artwork.
// Keep the interactive half-built train in individual parts; lists need one image.
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { vehicleArtModels } from './e500-art/vehicle-catalog.js';
const knownIds=["e500","emu3000","r200","700t","n700s","emu900","breezy-blue","ct273",...Object.keys(vehicleArtModels)];
const requested=process.argv.find(arg=>arg.startsWith('--model='))?.slice(8);
if(requested&&!knownIds.includes(requested))throw Error('Unknown model: '+requested);
const ids=requested?[requested]:knownIds;
for(const id of ids) {
  const directory=new URL(`../docs/shared/bricks/${id}-v1/`,import.meta.url);
  const metadata=JSON.parse(await readFile(new URL("metadata.json",directory),"utf8"));
  const parts=metadata.steps.flatMap(step=>step.parts).sort((a,b)=>a.z-b.z);
  const layers=await Promise.all(parts.map(async part=>{
    const b=part.imageBox,encoded=(await readFile(new URL(part.file,directory))).toString("base64");
    return `<image x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" href="data:image/png;base64,${encoded}"/>`;
  }));
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="${metadata.viewBox}">${layers.join("")}</svg>`;
  const vehicle=Object.hasOwn(vehicleArtModels,id);
  const image=sharp(Buffer.from(svg));
  const bytes=await (vehicle?image.png({compressionLevel:9}):image.webp({quality:88,alphaQuality:100})).toBuffer();
  const destination=new URL(vehicle?"preview.png":"preview.webp",directory);
  if(process.argv.includes("--check")) {
    if(!(await readFile(destination)).equals(bytes))throw Error(`${id} preview is stale; run node scripts/build-brick-previews.mjs`);
  } else await writeFile(destination,bytes);
  console.log(`${id}: ${parts.length} part images → one ${bytes.length}-byte preview`);
}
