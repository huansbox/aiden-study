import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync,statSync} from "node:fs";
import sharp from "sharp";
const ids=["e500","emu3000","r200","700t","n700s","emu900","breezy-blue","ct273"];
const ctx=vm.createContext({});ctx.window=ctx;
for(const id of ids)vm.runInContext(readFileSync(new URL(`../docs/shared/brick-${id}.js`,import.meta.url),"utf8"),ctx);
for(const file of ["brick-models.js","brick-workshop.js"])vm.runInContext(readFileSync(new URL(`../docs/shared/${file}`,import.meta.url),"utf8"),ctx);

test("eight complete train previews need eight images; half-built trains retain exact parts and fixed rails",async()=>{
  let imageRequests=0,totalBytes=0;
  for(const id of ids) {
    const model=ctx.KidsBrickModels.get(id),html=ctx.KidsBrickWorkshop.thumbnail(id,{complete:true,ghosts:false});
    assert.match(html,new RegExp(`bricks/${id}-v1/preview\\.webp`));
    assert.doesNotMatch(html,/<svg|<image/);
    assert.match(html,/loading="lazy" decoding="async"/);
    imageRequests+=(html.match(/<img /g)||[]).length;
    const file=new URL(`../docs/shared/bricks/${id}-v1/preview.webp`,import.meta.url);
    const info=await sharp(readFileSync(file)).metadata();
    assert.equal(info.width,800);assert.equal(info.height,500);
    totalBytes+=statSync(file).size;
    const partial=ctx.KidsBrickWorkshop.thumbnail(id,{placed:["p2-2"],ghosts:false,build:{modelId:id,contentVersion:2}});
    assert.equal((partial.match(/brick-thumbnail__placed/g)||[]).length,4,"three fixed rails and one saved body part");
    assert.match(partial,/<svg/);
  }
  assert.equal(imageRequests,8);
  assert.ok(totalBytes<400000,"the full eight-train picker stays below 400 KB");
});
