// Local synthetic collection fixtures; never imported by the production Worker.
import { execFileSync } from "node:child_process";
let assetMode = { from:99, delay:0, fail:false }, baseline = false;
const integer = (value, fallback, max) => /^\d+$/.test(value || "") ? Math.min(max,Number(value)) : fallback;
export async function workshopFixture({url,res,runtime}) {
  if (url.pathname === "/test/workshop-fixture") {
    const C = globalThis.KidsCollectionCore;
    const modelId = url.searchParams.get("model") || "e500";
    if (!C.MODERN_MODELS.includes(modelId)) throw Error("invalid synthetic model");
    const version = url.searchParams.get("version") === "1" ? 1 : 2;
    const start = version === 2 ? 1 : 0, count = C.PACK_COUNTS[modelId]-start;
    const packs = integer(url.searchParams.get("packs"),count,60);
    let state = C.empty();
    state.grants = Array.from({length:packs},(_,i)=>({id:`synthetic-workshop-${i}`,date:C.dateKey(),kind:"first",buildId:null,packIndex:null}));
    const stage = url.searchParams.get("stage") || "start";
    if (stage !== "picker") {
      state = C.apply(state,{type:"select-model",modelId,commandId:`synthetic-${modelId}-${version}`});
      if (version === 1) {
        state.builds[0].contentVersion=1;
        state.grants.forEach((grant,i)=>{grant.buildId=i<count?state.activeBuildId:null;grant.packIndex=i<count?i:null;});
      }
      const end = stage === "finish" ? count*3-1 : integer(url.searchParams.get("placed"),0,count*3);
      for(let i=0;i<end;i++) {
        const index=start+Math.floor(i/3), partId=`p${index+1}-${i%3+1}`, grant=state.grants.find(g=>g.packIndex===index);
        if (!grant) break;
        state=C.apply(state,{type:"place",buildId:state.activeBuildId,grantId:grant.id,packIndex:index,partId});
      }
    }
    assetMode = {from:integer(url.searchParams.get("futureFrom"),5,99),delay:integer(url.searchParams.get("futureDelay"),0,30000),fail:url.searchParams.get("futureFail")==="1"};
    baseline = url.searchParams.get("baseline") === "1";
    await runtime.restoreFixture(state,"aiden");
    res.setHeader("Content-Type","text/html; charset=utf-8");
    res.setHeader("Cache-Control","no-store");
    res.end(`<!doctype html><meta charset="utf-8"><p>準備 synthetic 工坊…</p><script>
      for(const key of Object.keys(localStorage)) if(key==="collection:v1:aiden" || key.startsWith("collection:outbox:aiden:")) localStorage.removeItem(key);
      location.replace("/?k=test-token&child=aiden&view=collection&workshopMeasure=1");
    </script>`);
    return true;
  }
  const part=url.pathname.match(/\/shared\/bricks\/[^/]+\/assets\/p(\d+)-/);
  if (part && Number(part[1]) >= assetMode.from) {
    if(assetMode.delay) await new Promise(resolve=>setTimeout(resolve,assetMode.delay));
    if(assetMode.fail) {res.writeHead(503,{"Cache-Control":"no-store"});res.end();return true;}
  }
  return false;
}
export function workshopBaseline(pathname) {
  if (!baseline || !["/shared/train-workshop.js","/shared/brick-workshop.js"].includes(pathname)) return null;
  return execFileSync("git",["show",`3405178924bea0e3f6905a5e06d2512050ca5b18:docs${pathname}`],{maxBuffer:1024*1024});
}
export const workshopMeasurement = `<output id="workshop-timing" style="display:block;padding:8px;background:#fff" aria-live="polite">量測：啟動中</output><script>
  const measuredAt=performance.now();
  let readyAt=null;
  const result=document.getElementById("workshop-timing");
  const update=()=>{
    const usable=document.querySelector('.part-button:not(:disabled),.brick-part:not(:disabled)');
    if(readyAt===null && usable)readyAt=Math.round(performance.now()-measuredAt);
    const resources=performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/shared/bricks/'));
    result.textContent='量測：可操作 '+(readyAt===null?'等待中':readyAt+' ms')+'；已完成圖片請求 '+resources.length;
    result.dataset.readyMs=readyAt===null?'pending':String(readyAt);
  };
  const observer=new MutationObserver(update);observer.observe(document.getElementById('hub'),{childList:true,subtree:true});
  setInterval(update,250);
</script>`;
