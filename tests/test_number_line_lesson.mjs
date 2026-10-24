import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createLesson,current,act,restore,nextSteps,shortestRoutes,initialKnown,subtract} from '../learning-tasks/number-line-difference/source/lesson-core.js';
const problems=JSON.parse(readFileSync(new URL('../learning-tasks/number-line-difference/source/problems.json',import.meta.url))).sets.pad;
function perform(state,type,value){return act(state,problems,type,value);}
function givens(state){const p=problems[state.index];for(const g of p.givens){for(const point of g.segment)assert.equal(perform(state,'point',point).ok,true);assert.equal(perform(state,'number',g.length).ok,true);}}
function step(state,s){for(const [type,value] of [['segment',s.long],['segment',s.short],['number',s.value],['point',s.result[0]],['point',s.result[1]],['number',s.value]])assert.equal(perform(state,type,value).ok,true,JSON.stringify({type,value,s,current:current(state)}));}
function jumpTo(index){const state=createLesson(problems);state.index=index;givens(state);return state;}
test('同一步兩次錯誤留在原步，正確才往下且重設提示計數',()=>{const state=createLesson(problems),q=current(state);perform(state,'point','B');assert.equal(q.stage,'given-start');assert.equal(q.errors,1);perform(state,'point','D');assert.equal(q.errors,2);perform(state,'point','A');assert.equal(q.stage,'given-end');assert.equal(q.errors,0);perform(state,'point','A');assert.equal(q.stage,'given-end');assert.equal(q.errors,1);});
test('同值錯段不被當成正確減數，長短必須有合法包含關係',()=>{assert.equal(subtract('AC','BD'),null);assert.equal(subtract('AD','BD'),'AB');const varied=structuredClone(problems);varied[2].preferredRoute=null;const state=createLesson(varied);state.index=2;const send=(type,value)=>act(state,varied,type,value);for(const g of varied[2].givens){send('point',g.segment[0]);send('point',g.segment[1]);send('number',g.length);}for(const [type,value] of [['segment','AD'],['segment','AC'],['number',12],['point','C'],['point','D'],['number',12]])assert.equal(send(type,value).ok,true);send('segment','BD');assert.equal(current(state).stage,'short');assert.equal(send('segment','AC').ok,false,'甲丙和丙丁同為12，錯段仍不能相減');assert.equal(current(state).stage,'short');assert.equal(send('segment','CD').ok,true);});
test('中階第1/2題照左右路引導，第3題接受兩路',()=>{const left=jumpTo(2),right=jumpTo(3);assert.equal(nextSteps(problems[2],current(left))[0].result,'AB');assert.equal(nextSteps(problems[3],current(right))[0].result,'CD');for(const route of problems[4].routes){const state=jumpTo(4);for(const s of route.steps)step(state,s);assert.equal(current(state).stage,'question-complete');assert.equal(current(state).steps.length,2);}});
test('進階接受全部最短三次合法路線與無相依步驟換序',()=>{const p=problems[5],routes=shortestRoutes(initialKnown(p),p.target);assert.equal(routes.length,5);for(const route of routes){assert.equal(route.length,3);const state=jumpTo(5);for(const s of route)step(state,s);assert.equal(current(state).stage,'question-complete');assert.deepEqual(current(state).steps,route);}});
test('必須把新結果的弧線與長度標回，六題後才finished；操作記錄可續做',()=>{let state=createLesson(problems),log=[];const send=(type,value)=>{log.push({type,value});return perform(state,type,value);};for(let i=0;i<6;i++){for(const g of problems[i].givens){send('point',g.segment[1]);send('point',g.segment[0]);send('number',g.length);}while(current(state).stage!=='question-complete'){const s=nextSteps(problems[i],current(state))[0];send('segment',s.long);send('segment',s.short);send('number',s.value);assert.equal(state.finished,false);assert.equal(current(state).stage,'mark-start');send('point',s.result[0]);send('point',s.result[1]);send('number',s.value);const restored=restore(problems,{version:1,log});assert.deepEqual(restored.state,state);state=restored.state;}assert.equal(state.finished,false);send('next','');}assert.equal(state.finished,true);assert.deepEqual(state.completedIds,['p1','p2','p3','p4','p5','p6']);assert.deepEqual(restore(problems,{version:1,log}).state,state);});

test('CI 核對 Pad 來源與部署產物，三份紙本 PDF 保持 byte 一致',()=>{
  execFileSync(process.execPath,['learning-tasks/number-line-difference/build.mjs','--check'],{cwd:new URL('../',import.meta.url),stdio:'pipe'});
  for(const [source,built] of [['number-line-transition.pdf','transition.pdf'],['number-line-independent.pdf','independent.pdf'],['number-line-parent-answers.pdf','answers.pdf']]){
    const pdf=readFileSync(new URL('../learning-tasks/number-line-difference/output/pdf/'+source,import.meta.url));
    assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
    assert.deepEqual(readFileSync(new URL('../docs/number-line-difference/print/'+built,import.meta.url)),pdf);
  }
});

const platformCode=readFileSync(new URL('../learning-tasks/number-line-difference/source/platform.js',import.meta.url),'utf8').replace('export async function','async function')+';openPlatform';
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
