import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createLesson,current,act,restore,nextSteps,shortestRoutes,initialKnown,subtract,targetStatus} from '../learning-tasks/number-line-difference/source/lesson-core.js';
import {diagramLayout} from '../learning-tasks/number-line-difference/source/diagram-layout.js';
const problems=JSON.parse(readFileSync(new URL('../learning-tasks/number-line-difference/source/problems.json',import.meta.url))).sets.pad;
function perform(state,type,value){return act(state,problems,type,value);}
function givens(state){for(const g of problems[state.index].givens)for(const [type,value] of [['point',g.segment[0]],['point',g.segment[1]],['chip','given-'+g.segment],['place',g.segment]])assert.equal(perform(state,type,value).ok,true);}
function step(state,s){for(const [type,value] of [['point',s.result[0]],['point',s.result[1]],['segment',s.long],['segment',s.short],['number',s.value],['chip','result'],['place',s.result]])assert.equal(perform(state,type,value).ok,true,JSON.stringify({type,value,s,q:current(state)}));}
function jumpTo(index){const state=createLesson(problems);state.index=index;givens(state);return state;}

test('標圖必須用數字片；錯放兩次才提示，選片不重設同一步錯誤',()=>{
  const state=createLesson(problems),q=current(state);
  perform(state,'point','B');perform(state,'point','D');assert.equal(q.errors,2);assert.equal(q.stage,'given-start');
  perform(state,'point','A');assert.equal(q.errors,0);perform(state,'point','C');
  assert.equal(perform(state,'number',10).ok,false);assert.equal(q.stage,'given-value');
  perform(state,'chip','given-BD');assert.equal(perform(state,'place','AC').ok,false);
  assert.equal(q.errors,2);assert.equal(q.arcs[0].length,null);
  perform(state,'chip','given-AC');assert.equal(q.errors,2);assert.equal(perform(state,'place','AC').ok,true);
  assert.equal(q.arcs[0].length,10);assert.equal(q.stage,'given-start');assert.equal(q.errors,0);
});
test('先選未知目標，合法非最短和目前不可算分開；連續選錯目標保留兩錯提示計數',()=>{
  const state=jumpTo(5),p=problems[5];
  step(state,p.routes.find(r=>r.id==='right').steps[0]);
  assert.equal(targetStatus(p,current(state),'AC'),'longer-route');
  assert.equal(targetStatus(p,current(state),'BC'),'unavailable');
  for(let i=0;i<2;i++){perform(state,'point','A');assert.equal(perform(state,'point','C').reason,'longer-route');assert.equal(current(state).stage,'target-start');}
  assert.equal(current(state).errors,2);perform(state,'point','B');assert.equal(current(state).errors,2);
  perform(state,'point','D');assert.equal(current(state).errors,0);assert.equal(current(state).target,'BD');
});
test('中階第1/2題是引導順序；另一條同長路線不誤稱多算一步，第3題兩路都可',()=>{
  const left=jumpTo(2),right=jumpTo(3);
  assert.equal(nextSteps(problems[2],current(left))[0].result,'AB');
  assert.equal(targetStatus(problems[2],current(left),'CD'),'guided-route');
  assert.equal(nextSteps(problems[3],current(right))[0].result,'CD');
  assert.equal(targetStatus(problems[3],current(right),'AB'),'guided-route');
  for(const route of problems[4].routes){const state=jumpTo(4);for(const s of route.steps)step(state,s);assert.equal(current(state).stage,'question-complete');}
});
test('同值錯段仍不能填入；結果數字正確後還要標回原本的目標框，不再重點端點',()=>{
  assert.equal(subtract('AC','BD'),null);assert.equal(subtract('AD','BD'),'AB');
  const state=jumpTo(5),route=problems[5].routes.find(r=>r.id==='outer');
  step(state,route.steps[0]);step(state,route.steps[1]);
  const s=route.steps[2];perform(state,'point','B');perform(state,'point','C');perform(state,'segment','BE');
  assert.equal(perform(state,'segment','AC').ok,false,'AC 和 CE 同為7，必須點 CE 才有共端點且包含');
  assert.equal(current(state).stage,'short');perform(state,'segment','CE');perform(state,'number',s.value);
  assert.equal(current(state).stage,'result-place');assert.equal(current(state).steps.length,2);
  assert.equal(perform(state,'point','B').ok,false);perform(state,'chip','result');
  assert.equal(perform(state,'place','CE').ok,false);assert.equal(current(state).stage,'result-place');
  perform(state,'chip','result');perform(state,'place','BC');assert.equal(current(state).stage,'question-complete');assert.equal(current(state).arcs.at(-1).segment,'BC');
});
test('進階完整接受題庫列出的5條最短路線與獨立步驟換序',()=>{
  const p=problems[5];assert.equal(shortestRoutes(initialKnown(p),p.target).length,5);
  for(const route of p.routes){const state=jumpTo(5);for(const s of route.steps)step(state,s);assert.equal(current(state).stage,'question-complete');assert.deepEqual(current(state).steps,route.steps);}
});
test('只有結果回圖且六題按下一題後才 finished，v2 任一操作階段均可重載續做',()=>{
  let state=createLesson(problems);const log=[];
  const send=(type,value)=>{assert.equal(perform(state,type,value).ok,true);log.push({type,value});const restored=restore(problems,{version:2,log});assert.equal(restored.writable,true);assert.deepEqual(restored.state,state);state=restored.state;};
  for(const p of problems){
    for(const g of p.givens)for(const e of [['point',g.segment[1]],['point',g.segment[0]],['chip','given-'+g.segment],['place',g.segment]])send(...e);
    while(current(state).stage!=='question-complete'){
      const s=nextSteps(p,current(state))[0];
      for(const e of [['point',s.result[0]],['point',s.result[1]],['segment',s.long],['segment',s.short],['number',s.value]])send(...e);
      assert.equal(state.finished,false);assert.equal(current(state).stage,'result-place');
      send('chip','result');send('place',s.result);
    }
    assert.equal(state.finished,false);send('next','');
  }
  assert.equal(state.finished,true);assert.deepEqual(state.completedIds,['p1','p2','p3','p4','p5','p6']);
});
function legacyLog(count=6,advance=true){
  const log=[],send=(type,value)=>log.push({type,value});
  for(const p of problems.slice(0,count)){
    for(const g of p.givens){send('point',g.segment[0]);send('point',g.segment[1]);send('number',g.length);}
    const route=p.routes.find(r=>r.id===p.preferredRoute)||p.routes[0];
    for(const s of route.steps)for(const e of [['segment',s.long],['segment',s.short],['number',s.value],['point',s.result[0]],['point',s.result[1]],['number',s.value]])send(...e);
    if(advance||p!==problems[count-1])send('next','');
  }
  return log;
}
test('v1 完成題／整份完成可遷移，部分題從標圖開始；不修改v1，v2可再次還原',()=>{
  const saved={version:1,log:[...legacyLog(2),{type:'point',value:'A'},{type:'point',value:'C'},{type:'number',value:12}]},copy=structuredClone(saved);
  const partial=restore(problems,null,saved);assert.deepEqual(saved,copy);assert.equal(partial.resetCurrent,true);assert.equal(partial.state.index,2);assert.deepEqual(partial.state.completedIds,['p1','p2']);assert.equal(current(partial.state).stage,'given-start');assert.deepEqual(restore(problems,{version:2,log:partial.log}).state,partial.state);
  const completed=restore(problems,null,{version:1,log:legacyLog(2,false)});assert.equal(completed.state.index,1);assert.equal(current(completed.state).stage,'question-complete');
  const full=restore(problems,null,{version:1,log:legacyLog()});assert.equal(full.state.finished,true);assert.equal(full.state.completedIds.length,6);
});
test('未知／較新或壞掉的v2格式不可寫回；v1只接受舊版真正可完成的單端點',()=>{
  for(const saved of [{version:3,log:[]},{version:2,log:'broken'},{version:2,log:[{type:'cheat',value:'p1'}]}])assert.equal(restore(problems,saved).writable,false);
  for(const bad of ['', 'AC']){
    const log=legacyLog(1);log[0]={type:'point',value:bad};
    assert.deepEqual(restore(problems,null,{version:1,log}).state.completedIds,[]);
  }
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
test('preview完全不碰storage或家庭模組；正式adapter只寫v2並保留v1/未知格式',async()=>{
  const previewOpen=vm.runInNewContext(platformCode,{}),preview=await previewOpen(true);
  assert.equal(preview.load(),null);assert.equal(preview.save({version:2,log:[]}),true);await preview.finish(['p1']);assert.equal(preview.reward().status,'preview');
  const oldKey='learning-task:number-line-difference:v1:aiden',newKey='learning-task:number-line-difference:v2:aiden';
  const old=JSON.stringify({version:1,log:legacyLog(1)}),data=new Map([[oldKey,old]]),writes=[];
  const open=vm.runInNewContext(platformCode,{URLSearchParams,location:{search:'?child=aiden'},localStorage:{getItem:key=>data.get(key)??null,setItem(key,value){writes.push(key);data.set(key,value);}},window:{KidsAuth:{ready:Promise.resolve(),state:{status:'connected'}},KidsCollection:{create:()=>({snapshot:()=>({}),ready:Promise.resolve()})}},document:{createElement:()=>({}),head:{append(script){script.onload();}}}});
  const adapter=await open(false);assert.equal(adapter.load(),null);assert.equal(adapter.loadLegacy().version,1);
  assert.equal(adapter.save({version:2,log:[]}),true);assert.deepEqual(writes,[newKey]);assert.equal(data.get(oldKey),old);
  for(const unsupported of ['null','{bad json',JSON.stringify({version:3,log:[]}),JSON.stringify({version:2,log:'different format'})]){data.set(newKey,unsupported);assert.equal(restore(problems,adapter.load()).writable,false);assert.equal(adapter.save({version:2,log:[]}),false);assert.equal(data.get(newKey),unsupported);}
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
    await platform.finish(['p1','p2','p3','p4','p5','p6']);listener();
    assert.equal(seen.at(-1).status,'error');assert.equal(seen.at(-1).message,message);
  }
  snapshot={taskRewards:{'number-line-difference':{status:'pending'}},sync:{status:'error',message:'另一筆操作失敗'}};listener();
  assert.equal(seen.at(-1).status,'pending','仍在 outbox 的 task 不假裝已被明拒');
  snapshot={taskRewards:{'number-line-difference':{status:'earned'}},sync:{status:'error',message:'另一筆操作失敗'}};
  await platform.retry();listener();assert.equal(seen.at(-1).status,'earned','已領資格不被其他同步錯誤蓋掉');
});
