import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createLesson,current,act,restore,nextSteps,initialKnown,subtract,targetStatus,suggestedTarget,expectedPoints} from '../learning-tasks/number-line-difference/source/lesson-core.js';
import {diagramLayout} from '../learning-tasks/number-line-difference/source/diagram-layout.js';
const problems=JSON.parse(readFileSync(new URL('../learning-tasks/number-line-difference/source/problems.json',import.meta.url))).sets.pad;
const perform=(state,type,value)=>act(state,problems,type,value);
function givens(state){for(const g of problems[state.index].givens)for(const e of [['point',g.segment[0]],['point',g.segment[1]],['chip','given-'+g.segment],['place',g.segment]])assert.equal(perform(state,...e).ok,true);}
function step(state,s){for(const e of [['point',s.result[0]],['point',s.result[1]],['segment',s.long],['segment',s.short],['number',s.value]])assert.equal(perform(state,...e).ok,true,JSON.stringify({e,s,q:current(state)}));assert.equal(current(state).stage,'step-complete');}
function jumpTo(index){const state=createLesson(problems);state.index=index;givens(state);return state;}
const routeFor=p=>p.routes.find(r=>r.id===p.preferredRoute)||p.routes[0];
function legacyLog(version,count=problems.length,advance=true){
  const log=[],send=(type,value)=>log.push({type,value});
  for(const [i,p] of problems.slice(0,count).entries()){
    for(const g of p.givens){send('point',g.segment[0]);send('point',g.segment[1]);if(version===1)send('number',g.length);else{send('chip','given-'+g.segment);send('place',g.segment);}}
    for(const s of routeFor(p).steps){
      if(version===2){send('point',s.result[0]);send('point',s.result[1]);}
      send('segment',s.long);send('segment',s.short);send('number',s.value);
      if(version===1){send('point',s.result[0]);send('point',s.result[1]);send('number',s.value);}else{send('chip','result');send('place',s.result);}
    }
    if(advance||i<count-1)send('next','');
  }
  return log;
}

test('標圖保留真數字片操作；錯放兩次才提示，選片不重設同一步錯誤',()=>{
  const state=createLesson(problems),q=current(state);
  perform(state,'point','B');perform(state,'point','D');assert.equal(q.errors,2);assert.equal(q.stage,'given-start');
  perform(state,'point','A');assert.equal(q.errors,0);perform(state,'point','C');
  assert.equal(perform(state,'number',10).ok,false);assert.equal(q.stage,'given-value');
  perform(state,'chip','given-BD');assert.equal(perform(state,'place','AC').ok,false);
  assert.equal(q.errors,2);assert.equal(q.arcs[0].length,null);
  perform(state,'chip','given-AC');assert.equal(q.errors,2);assert.equal(perform(state,'place','AC').ok,true);
  assert.equal(q.arcs[0].length,10);assert.equal(q.stage,'given-start');assert.equal(q.errors,0);
});
test('第3題左路、第4題右路，第5題兩條最短路線均合法；原因不混淆',()=>{
  for(const [index,wanted,other] of [[0,'AB','CD'],[1,'CD','AB'],[2,'AB','CD'],[3,'CD','AB']]){
    const state=jumpTo(index),p=problems[index];assert.equal(nextSteps(p,current(state))[0].result,wanted);assert.equal(targetStatus(p,current(state),other),'guided-route');assert.equal(targetStatus(p,current(state),'AC'),'known');
  }
  for(const route of problems[4].routes){const state=jumpTo(4);for(const [i,s]of route.steps.entries()){if(i)perform(state,'next','');step(state,s);}assert.equal(current(state).target,'BC');assert.deepEqual(current(state).steps,route.steps);}
  const state=jumpTo(4);assert.equal(targetStatus(problems[4],current(state),'BC'),'unavailable');step(state,problems[4].routes[0].steps[0]);perform(state,'next','');assert.equal(targetStatus(problems[4],current(state),'CD'),'longer-route');assert.equal(targetStatus(problems[4],current(state),'AB'),'known');
});
test('目標錯誤計數跨首點累積；提示沿用首點且不限制第5題另一條路',()=>{
  const p=problems[4],state=jumpTo(4),q=current(state);
  for(let i=0;i<2;i++){perform(state,'point','B');assert.equal(perform(state,'point','C').reason,'unavailable');}
  assert.equal(q.errors,2);assert.ok(expectedPoints(p,q).length>2);
  perform(state,'point','C');assert.equal(q.errors,2);assert.equal(suggestedTarget(p,q),'CD');perform(state,'point','C');
  const alternate=p.routes.find(route=>route.steps[0].result!==suggestedTarget(p,q));for(const[i,s]of alternate.steps.entries()){if(i)perform(state,'next','');step(state,s);}assert.equal(q.target,'BC');
});
test('答對立即回填弧線與完整步驟，仍停在本次相減；只有下一步才進下一次',()=>{
  const state=jumpTo(2),p=problems[2],q=current(state),s=p.routes[0].steps[0];step(state,s);
  assert.equal(state.index,2);assert.equal(state.finished,false);assert.deepEqual(q.steps,[s]);assert.deepEqual(q.arcs.at(-1),{segment:s.result,length:s.value,derived:true});assert.deepEqual(q.pending,s);assert.equal(q.target,s.result);assert.equal(q.long,s.long);assert.equal(q.short,s.short);
  assert.equal(perform(state,'chip','result').ok,false);assert.equal(perform(state,'place',s.result).ok,false);assert.equal(q.steps.length,1);
  perform(state,'next','');assert.equal(q.stage,'target-start');assert.equal(q.target,null);assert.equal(q.pending,null);assert.equal(nextSteps(p,q)[0].result,'BC');
});
test('線段以身分而非同值配對，答錯不會提交；最終相減也停步等下一題',()=>{
  assert.equal(subtract('AC','BD'),null);assert.equal(subtract('AD','BD'),'AB');
  const state=jumpTo(3),p=problems[3],q=current(state),s=routeFor(p).steps[0];
  perform(state,'point',s.result[0]);perform(state,'point',s.result[1]);perform(state,'segment',s.long);
  assert.equal(perform(state,'segment','BD').ok,false);assert.equal(q.stage,'short');perform(state,'segment',s.short);
  assert.equal(perform(state,'number',s.value+1).ok,false);assert.equal(q.steps.length,0);assert.equal(q.arcs.length,3);
  perform(state,'number',s.value);perform(state,'next','');step(state,routeFor(p).steps[1]);assert.equal(q.stage,'step-complete');assert.deepEqual(state.completedIds,['p4']);assert.equal(state.index,3);perform(state,'next','');assert.equal(state.index,4);
});
test('只有5題末步按完成才finished，v3每一操作階段均可重載續做',()=>{
  let state=createLesson(problems);const log=[];
  const send=(type,value)=>{assert.equal(perform(state,type,value).ok,true);log.push({type,value});const restored=restore(problems,{version:3,log});assert.equal(restored.writable,true);assert.deepEqual(restored.state,state);state=restored.state;};
  for(const p of problems){
    for(const g of p.givens)for(const e of [['point',g.segment[1]],['point',g.segment[0]],['chip','given-'+g.segment],['place',g.segment]])send(...e);
    for(const [i,s] of routeFor(p).steps.entries()){
      if(i)send('next','');for(const e of [['point',s.result[0]],['point',s.result[1]],['segment',s.long],['segment',s.short],['number',s.value]])send(...e);
      assert.equal(state.finished,false);assert.equal(current(state).stage,'step-complete');
    }
    assert.equal(state.finished,false);send('next','');
  }
  assert.equal(state.finished,true);assert.deepEqual(state.completedIds,['p1','p2','p3','p4','p5']);
});
test('v2各標圖階段與部分算式可續做，pending result-place自動回填但保持停步',()=>{
  const full=legacyLog(2,3,false);
  for(const length of [0,1,2,3,4,10,12,15,18,full.length-2,full.length-1,full.length]){
    const saved={version:2,log:full.slice(0,length)},copy=structuredClone(saved),r=restore(problems,null,saved);assert.equal(r.writable,true);assert.deepEqual(saved,copy);assert.deepEqual(restore(problems,{version:3,log:r.log}).state,r.state);
  }
  // 第3題第一步的正確 number，舊版後面還沒拖回結果。
  const prefix=legacyLog(2,2),p=problems[2],s=routeFor(p).steps[0];
  for(const g of p.givens)for(const e of [['point',g.segment[0]],['point',g.segment[1]],['chip','given-'+g.segment],['place',g.segment]])prefix.push({type:e[0],value:e[1]});
  for(const e of [['point',s.result[0]],['point',s.result[1]],['segment',s.long],['segment',s.short],['number',s.value]])prefix.push({type:e[0],value:e[1]});
  const r=restore(problems,null,{version:2,log:prefix});assert.equal(r.state.index,2);assert.equal(current(r.state).stage,'step-complete');assert.deepEqual(current(r.state).steps,[s]);assert.equal(current(r.state).arcs.at(-1).length,s.value);assert.deepEqual(r.state.completedIds,['p1','p2']);
  const continued=restore(problems,null,{version:2,log:[...prefix,{type:'chip',value:'result'},{type:'place',value:s.result},{type:'point',value:'B'}]});assert.equal(current(continued.state).stage,'target-end');assert.equal(current(continued.state).point,'B');assert.equal(current(continued.state).steps.length,1);
});
test('v2已進舊p6或舊6題全完成均保留前5題並轉為finished',()=>{
  for(const tail of [[],[{type:'point',value:'A'}],[{type:'point',value:'A'},{type:'point',value:'E'},{type:'chip',value:'given-AE'},{type:'place',value:'AE'},{type:'next',value:''}]]){
    const saved={version:2,log:[...legacyLog(2),...tail]},copy=structuredClone(saved),r=restore(problems,null,saved);assert.equal(r.state.finished,true);assert.equal(r.state.completedIds.length,5);assert.equal(r.state.questions.length,5);assert.deepEqual(saved,copy);assert.deepEqual(restore(problems,{version:3,log:r.log}).state,r.state);
  }
  const done=restore(problems,null,{version:2,log:legacyLog(2,5,false)});assert.equal(done.state.finished,false);assert.equal(current(done.state).stage,'step-complete');assert.equal(done.state.completedIds.length,5);
});
test('v1完成題可遷移、部分題重新標圖；前5題完整且已往舊第6題即可finished',()=>{
  const saved={version:1,log:[...legacyLog(1,2),{type:'point',value:'A'},{type:'point',value:'C'},{type:'number',value:12}]},copy=structuredClone(saved),partial=restore(problems,null,saved);
  assert.deepEqual(saved,copy);assert.equal(partial.resetCurrent,true);assert.equal(partial.state.index,2);assert.deepEqual(partial.state.completedIds,['p1','p2']);assert.equal(current(partial.state).stage,'given-start');assert.deepEqual(restore(problems,{version:3,log:partial.log}).state,partial.state);
  const completed=restore(problems,null,{version:1,log:legacyLog(1,2,false)});assert.equal(completed.state.index,1);assert.equal(current(completed.state).stage,'step-complete');
  const full=restore(problems,null,{version:1,log:legacyLog(1)});assert.equal(full.state.finished,true);assert.equal(full.state.completedIds.length,5);
  for(const bad of ['', 'AC']){const log=legacyLog(1,1);log[0]={type:'point',value:bad};assert.deepEqual(restore(problems,null,{version:1,log}).state.completedIds,[]);}
});
test('新key只接受v3；較新、無法讀取及不明log都不能覆寫',()=>{
  for(const saved of [{version:4,log:[]},{version:2,log:[]},{version:'unreadable'},{version:3,log:'broken'},{version:3,log:[{type:'cheat',value:'p1'}]}])assert.equal(restore(problems,saved).writable,false);
  for(const legacy of [{version:4,log:[]},{version:'unreadable'},{version:2,log:'broken'},{version:2,log:[{type:'cheat',value:'p1'}]}])assert.equal(restore(problems,null,legacy).writable,false);
});
test('固定版面涵蓋所有路線、上下面都有弧線、標籤在畫布內；每個目標框不壓當時任何可能已知弧線或數字',()=>{
  for(const p of problems){
    const a=diagramLayout(p),again=diagramLayout(structuredClone(p));assert.deepEqual(a,again);
    assert.ok(Object.values(a.segments).some(s=>s.side===1));assert.ok(Object.values(a.segments).some(s=>s.side===-1));
    for(const s of Object.values(a.segments)){assert.ok(s.labelY-20>=0);assert.ok(s.labelY+16<=a.height);}
    for(const route of p.routes){
      const known=p.givens.map(g=>g.segment);
      for(const step of route.steps){
        const target=a.segments[step.result],r={x:target.slotX,y:target.slotY,w:64,h:42};
        assert.ok(r.y+r.h<=a.height);
        for(const s of known){
          const arc=a.segments[s],start=a.baseline+arc.side*8,control=2*arc.peak-start;
          for(let n=0;n<=1000;n++){const t=n/1000,x=arc.a+(arc.b-arc.a)*t,y=(1-t)**2*start+2*(1-t)*t*control+t*t*start;assert.ok(!(x>r.x-2&&x<r.x+r.w+2&&y>r.y-2&&y<r.y+r.h+2),`${p.id} ${step.result} 的框壓到 ${s}`);}
          const lr={x:arc.mid-49,y:arc.labelY-20,w:98,h:36};assert.ok(!(r.x<lr.x+lr.w&&r.x+r.w>lr.x&&r.y<lr.y+lr.h&&r.y+r.h>lr.y),`${p.id}: ${step.result}/${s} label`);
        }
        known.push(step.result);
      }
    }
  }
});
test('CI 核對 Pad 來源與部署產物，三份紙本 PDF 保持 byte 一致',()=>{
  execFileSync(process.execPath,['learning-tasks/number-line-difference/build.mjs','--check'],{cwd:new URL('../',import.meta.url),stdio:'pipe'});
  for(const [source,built] of [['number-line-transition.pdf','transition.pdf'],['number-line-independent.pdf','independent.pdf'],['number-line-parent-answers.pdf','answers.pdf']]){
    const pdf=readFileSync(new URL('../learning-tasks/number-line-difference/output/pdf/'+source,import.meta.url));
    assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
    assert.deepEqual(readFileSync(new URL('../docs/number-line-difference/print/'+built,import.meta.url)),pdf);
  }
});

const platformCode=readFileSync(new URL('../learning-tasks/number-line-difference/source/platform.js',import.meta.url),'utf8').replace('export async function','async function')+';openPlatform';
test('preview完全不碰storage或家庭模組；正式adapter只寫v3，v2優先、v1 fallback且舊資料不變',async()=>{
  const previewOpen=vm.runInNewContext(platformCode,{}),preview=await previewOpen(true);
  assert.equal(preview.load(),null);assert.equal(preview.save({version:3,log:[]}),true);await preview.finish(['p1']);assert.equal(preview.reward().status,'preview');
  const oldKey='learning-task:number-line-difference:v1:aiden',newKey='learning-task:number-line-difference:v3:aiden';
  const old=JSON.stringify({version:1,log:legacyLog(1)}),data=new Map([[oldKey,old]]),writes=[];
  const open=vm.runInNewContext(platformCode,{URLSearchParams,location:{search:'?child=aiden'},localStorage:{getItem:key=>data.get(key)??null,setItem(key,value){writes.push(key);data.set(key,value);}},window:{KidsAuth:{ready:Promise.resolve(),state:{status:'connected'}},KidsCollection:{create:()=>({snapshot:()=>({}),ready:Promise.resolve()})}},document:{createElement:()=>({}),head:{append(script){script.onload();}}}});
  const adapter=await open(false);assert.equal(adapter.load(),null);assert.equal(adapter.loadLegacy().version,1);
  const v2Key='learning-task:number-line-difference:v2:aiden',v2=JSON.stringify({version:2,log:[]});data.set(v2Key,v2);assert.equal(adapter.loadLegacy().version,2);assert.equal(adapter.loadLegacy(1).version,1);
  assert.equal(adapter.save({version:3,log:[]}),true);assert.deepEqual(writes,[newKey]);assert.equal(data.get(oldKey),old);assert.equal(data.get(v2Key),v2);
  for(const unsupported of ['null','{bad json',JSON.stringify({version:4,log:[]}),JSON.stringify({version:3,log:'different format'})]){data.set(newKey,unsupported);assert.equal(restore(problems,adapter.load()).writable,false);assert.equal(adapter.save({version:3,log:[]}),false);assert.equal(data.get(newKey),unsupported);}
});
test('task adapter 訂閱看得見明拒原因；pending 與 earned 優先，重試後可恢復',async()=>{
  let snapshot={taskRewards:{},sync:{status:'ready'}},listener;
  const collection={snapshot:()=>snapshot,ready:Promise.resolve(),subscribe(fn){listener=fn;return()=>{};},async completeTask(){return snapshot;},async refresh(){return snapshot;},async flush(){return snapshot;}};
  const open=vm.runInNewContext(platformCode,{URLSearchParams,location:{search:'?child=aiden'},window:{KidsAuth:{ready:Promise.resolve(),state:{status:'connected'},async refresh(){}},KidsCollection:{create:()=>collection}},document:{createElement:()=>({}),head:{append(script){script.onload();}}}});
  const platform=await open(false),seen=[];
  platform.subscribe(()=>seen.push(platform.reward()));
  assert.equal(platform.reward().status,'unearned');
  snapshot={taskRewards:{'number-line-difference':{status:'pending'}},sync:{status:'offline',message:'offline'}};listener();
  assert.equal(seen.at(-1).status,'pending');
  // flush() 明拒會刪掉 task outbox，completeTask() 仍 resolve；稍後自動補送也走同一訂閱。
  for(const message of ['任務完成時間不正確','不支援的收藏操作','任務資格衝突']){
    snapshot={taskRewards:{'number-line-difference':{status:'unearned'}},sync:{status:'error',message}};
    await platform.finish(['p1','p2','p3','p4','p5']);listener();
    assert.equal(seen.at(-1).status,'error');assert.equal(seen.at(-1).message,message);
  }
  snapshot={taskRewards:{'number-line-difference':{status:'pending'}},sync:{status:'error',message:'另一筆操作失敗'}};listener();
  assert.equal(seen.at(-1).status,'pending','仍在 outbox 的 task 不假裝已被明拒');
  snapshot={taskRewards:{'number-line-difference':{status:'earned'}},sync:{status:'error',message:'另一筆操作失敗'}};
  await platform.retry();listener();assert.equal(seen.at(-1).status,'earned','已領資格不被其他同步錯誤蓋掉');
});
