// Static request/transfer inventory, independent of browser/network timing.
import { readFile,stat } from "node:fs/promises";
const ids=["e500","emu3000","r200","700t","n700s","emu900","breezy-blue","ct273"];
const rows=[];
for(const id of ids) {
  const directory=new URL(`../docs/shared/bricks/${id}-v1/`,import.meta.url);
  const model=JSON.parse(await readFile(new URL("metadata.json",directory),"utf8"));
  const all=model.steps.flatMap(step=>step.parts),assets=part=>[part.file,...(part.variants || []).map(variant=>variant.file)];
  const previous=all.flatMap(assets),current=[...model.steps[0].parts.map(part=>part.file),...model.steps[1].parts.flatMap(assets)];
  const bytes=async files=>(await Promise.all(files.map(async file=>(await stat(new URL(file,directory))).size))).reduce((a,b)=>a+b,0);
  rows.push({model:id,allPartImages:all.length,oldWorkshopGateRequests:previous.length,oldWorkshopGateBytes:await bytes(previous),newFirstBodyPackRequests:current.length,newFirstBodyPackBytes:await bytes(current),previewBytes:await bytes(["preview.webp"])});
}
console.log(JSON.stringify({models:rows,oldShelfRequests:rows.reduce((n,row)=>n+row.oldWorkshopGateRequests,0),oldShelfBytes:rows.reduce((n,row)=>n+row.oldWorkshopGateBytes,0),newShelfRequests:8,newShelfBytes:rows.reduce((n,row)=>n+row.previewBytes,0)},null,2));
