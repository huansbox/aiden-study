// Deterministic completed previews from the checked-in full-mask part artwork.
// Keep the interactive half-built train in individual parts; lists need one image.
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
const ids=["e500","emu3000","r200","700t","n700s","emu900","breezy-blue","ct273"];
for(const id of ids) {
  const directory=new URL(`../docs/shared/bricks/${id}-v1/`,import.meta.url);
  const metadata=JSON.parse(await readFile(new URL("metadata.json",directory),"utf8"));
  const parts=metadata.steps.flatMap(step=>step.parts).sort((a,b)=>a.z-b.z);
  const layers=await Promise.all(parts.map(async part=>{
    const b=part.imageBox,encoded=(await readFile(new URL(part.file,directory))).toString("base64");
    return `<image x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" href="data:image/png;base64,${encoded}"/>`;
  }));
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="${metadata.viewBox}">${layers.join("")}</svg>`;
  const bytes=await sharp(Buffer.from(svg)).webp({quality:88,alphaQuality:100}).toBuffer();
  const destination=new URL("preview.webp",directory);
  if(process.argv.includes("--check")) {
    if(!(await readFile(destination)).equals(bytes))throw Error(`${id} preview is stale; run node scripts/build-brick-previews.mjs`);
  } else await writeFile(destination,bytes);
  console.log(`${id}: ${parts.length} part images → one ${bytes.length}-byte preview`);
}
