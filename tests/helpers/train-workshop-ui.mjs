import vm from "node:vm";
import { readFileSync } from "node:fs";
const context = vm.createContext({console}); context.window=context;
for (const name of ["e500","ct273"]) vm.runInContext(readFileSync(new URL(`../../docs/shared/brick-${name}.js`,import.meta.url),"utf8"),context);
const models={e500:context.KidsBrickE500,ct273:context.KidsBrickCT273};
function snapshot(placed,packs,modelId) {
  return {activeBuild:{id:`existing-${modelId}`,modelId,placed},grants:Array.from({length:packs},(_,packIndex)=>({id:`earned-${packIndex}`,buildId:`existing-${modelId}`,packIndex}))};
}
export function uiHarness(placed = [], { packs = 14, motion = false, failImages = false, modelId = "e500" } = {}) {
  const model = models[modelId];
  const state = snapshot(placed, packs, modelId), calls = [], windows = new Map(), events = new Map(), images = [], animations = [], ghosts = [];
  let rejectSave = false, finalCandidate = false, soundCount = 0;
  const node = { innerHTML:"", disabled:false, value:"0", setAttribute(){}, focus(){}, classList:{toggle(){}}, getScreenCTM:()=>({a:1,inverse:()=>({a:1})}), getBoundingClientRect:()=>({x:10,y:10,width:100,height:70}) };
  const host = { innerHTML:"", addEventListener:(name,fn)=>events.set(name,fn), removeEventListener:name=>events.delete(name),
    querySelector:selector=>selector === "[data-e500-scene]" && !motion ? null : node,
    querySelectorAll:()=>[], setPointerCapture(){}, hasPointerCapture:()=>false };
  const collection = { snapshot:()=>state, async placePart(details) {
    calls.push(details); if(rejectSave) throw Error("無法保存，請再試一次");
    state.activeBuild.placed.push(details.partId); mounted.update(state);
  } };
  class TestImage { set src(value) {this.url=value;images.push(this);queueMicrotask(()=>failImages?this.onerror?.():this.onload?.());} }
  const ctx = vm.createContext({console,Set,Promise,Date,queueMicrotask,setTimeout,clearTimeout,
    Image:TestImage,matchMedia:()=>({matches:!motion}),DOMPoint:class {constructor(x,y){this.x=x;this.y=y;}matrixTransform(){return this;}},
    document:{body:{append(){}},createElement(){const ghost = {style:{},setAttribute(){},remove(){this.removed=true;},animate(){
      let resolve, reject;const finished=new Promise((yes,no)=>{resolve=yes;reject=no;});
      const animation={finished,resolve,cancel:()=>reject(Error("cancelled"))};animations.push(animation);return animation;
    }};ghosts.push(ghost);return ghost;}},
    addEventListener:(name,fn)=>windows.set(name,fn),removeEventListener:name=>windows.delete(name),
  });
  ctx.window=ctx;
  for (const file of ["ct273-mechanism.js", "train-workshop.js"]) vm.runInContext(readFileSync(new URL(`../../docs/shared/${file}`,import.meta.url),"utf8"),ctx);
  const mounted=ctx.KidsTrainWorkshop.mount(host,{model,collection,sound:{unlock(){},place(){soundCount++;}},onFinalPlacement:()=>{finalCandidate=true;}});
  const click=(action,part)=>events.get("click")?.({detail:0,target:{closest:()=>({dataset:{e500Action:action,part}})}});
  const fire=(name,event)=>events.get(name)?.(event);
  return {state,calls,host,mounted,click,fire,images,animations,ghosts,windows,get soundCount(){return soundCount;},get finalCandidate(){return finalCandidate;},failSave:()=>{rejectSave=true;},allowSave:()=>{rejectSave=false;}};
}
