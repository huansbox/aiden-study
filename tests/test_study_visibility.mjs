import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import '../docs/shared/family-core.js';
import '../docs/shared/collection-core.js';
import {boot} from './helpers/study-harness.mjs';
import {socialSyntheticPack} from './helpers/synthetic-study-pack.mjs';
import {collectionRuntime} from './helpers/collection-runtime.mjs';
const F=globalThis.KidsFamilyCore,C=globalThis.KidsCollectionCore;
const plain=x=>JSON.parse(JSON.stringify(x));
const archived=[15,16,17,18,19,20,21,22,23];
const registry=JSON.parse(readFileSync(new URL('../docs/registry.json',import.meta.url)));
const goal=(entryId,quantity=10)=>({entryId,quantity,metric:'answered'});
const now=new Date('2026-11-06T04:00:00Z'), date=C.dateKey(now);

test('每位孩子隱藏只影響已發布單元；另一學期、原課表、恢復及候選發布互相獨立',()=>{
  const settings=F.defaults(),p=settings.children.aiden;
  const task={id:'old-math',app:'study',unit:15,quantity:5};
  p.weekly[5]=[task];p.overrides[date]=[task];
  p.archivedStudyUnits=[15];
  assert.equal(F.availableEntry('study:math',p),true,'部分隱藏仍有本科內容');
  assert.equal(F.todayTasks(p,date).length,0);
  p.archivedStudyUnits=archived;
  assert.equal(F.homeEntries(settings,'aiden',registry).some(e=>e.app==='study'),false);
  assert.equal(F.availableEntry('study:math',p),false,'候選 unit24 不讓入口假開放');
  assert.equal(F.availableStudyUnit(24),false);
  p.terms.push('g3-s2');
  assert.equal(F.homeEntries(settings,'aiden',registry).find(e=>e.id==='study:math').term,'g3-s2');
  const sibling={...p,archivedStudyUnits:[]};
  assert.equal(F.availableStudyUnit(15,sibling),true);
  p.archivedStudyUnits=[];
  assert.deepEqual(F.todayTasks(p,date).map(t=>t.id),['old-math']);
  assert.deepEqual(p.weekly[5],[task]);assert.deepEqual(p.overrides[date],[task]);
  assert.throws(()=>F.validateSettings({...settings,children:{...settings.children,aiden:{...p,archivedStudyUnits:[15,15]}}}));
  const candidate=vm.createContext({});
  const source=readFileSync(new URL('../docs/shared/family-core.js',import.meta.url),'utf8');
  vm.runInContext(source.replace(/("id":24[^\n]*"published":)false/,'$1true'),candidate);
  assert.equal(candidate.KidsFamilyCore.availableEntry('study:math',{...p,terms:['g4-s1'],archivedStudyUnits:archived}),true,'發布新單元後，原科目與目標會自行恢復');
});

test('Study 真 State/Picker：隱藏後接續、混合錯題與直呼開始皆封鎖，原半批/錯題/標記恢復可用',async()=>{
  const p=F.defaults().children.aiden;
  const family={ready:Promise.resolve(),profile:()=>p,task:()=>null,allowed:()=>true,setActive(){},record(){},beginRound(){},finishRound(){}};
  const e=await boot(undefined,'test-child',{family,search:'?child=test-child&subject=social&term=g4-s1'});
  const pack=socialSyntheticPack();e.app.importPrivatePack(JSON.stringify(pack));
  e.app.State.setStudyTerm('g4-s1');e.app.State.setSubject('social');
  e.window._startFull(22);
  const first=e.app.quiz.queue[0];
  e.app.submitAnswer('not-the-answer');
  e.app.leaveQuiz();
  const before=plain({challenge:e.app.state.challenge,errorBank:e.app.state.errorBank,mastered:e.app.state.mastered,stats:e.app.state.stats});
  p.archivedStudyUnits=[22];e.app.renderHome();
  assert.doesNotMatch(e.node('page-home').innerHTML,/window\._startFull\(22\)/);
  const oldQueue=plain(e.app.quiz.queue);
  e.window._startFull(22);e.window._startError('22,23');
  assert.deepEqual(plain(e.app.quiz.queue),oldQueue);
  assert.equal(e.node('page-quiz').classList.contains('hidden'),true);
  assert.deepEqual(plain({challenge:e.app.state.challenge,errorBank:e.app.state.errorBank,mastered:e.app.state.mastered,stats:e.app.state.stats}),before);
  p.archivedStudyUnits=[];e.app.renderHome();e.window._startFull(22);
  assert.ok(e.app.quiz.queue.includes(first));
  p.archivedStudyUnits=[22,23];
  assert.equal(e.node('page-quiz').classList.contains('hidden'),false,'變更設定不突然中斷正在作答的批次');
  e.app.leaveQuiz();assert.match(e.node('page-home').innerHTML,/目前沒有開放的內容/);
});

test('當日隱藏保留原累積完整份量、部分進度與 targets，其他科門檻不增加；恢復與自由輪不重領',()=>{
  const p=F.defaults().children.aiden, visibility={date,profile:p};
  const targets=[goal('study:social'),goal('study:math')];
  let state=C.apply(C.empty(),{type:'goals',expectedGoalRevision:0,targets},now,visibility);
  const answer=(entryId,count=1,at=now)=>{for(let n=0;n<count;n++)state=C.apply(state,{type:'record',event:{entryId,answered:true,occurredAt:at.toISOString()}},now,visibility);};
  answer('study:social',10);answer('study:math',3);
  p.archivedStudyUnits=[22,23];state=C.reconcile(state,now,visibility);
  let view=C.snapshot(state,date,visibility);
  assert.equal(view.daily.earned,1);assert.equal(view.daily.targets[0].nextRewardRemaining,7);
  assert.deepEqual(state.days[date].targets,targets);assert.deepEqual(view.goals.targets,targets);
  answer('study:math',7);assert.equal(state.grants.length,2,'數學只須原本10題，不是20題');
  p.archivedStudyUnits=archived;view=C.snapshot(state,date,visibility);
  assert.equal(view.daily.targets.length,0);assert.equal(view.daily.pausedTargets.length,2);
  state=C.apply(state,{type:'round',hasPractice:true,event:{entryId:'spelling',roundId:'free',occurredAt:now.toISOString()}},now,visibility);
  assert.equal(state.grants.length,2,'自由練習一輪與既有已領數對帳');
  p.archivedStudyUnits=[];state=C.reconcile(state,now,visibility);
  assert.equal(state.grants.length,2);assert.equal(C.snapshot(state,date,visibility).daily.targets.length,2);
  answer('study:math',10);assert.equal(state.grants.length,3);
  assert.equal(new Set(state.grants.map(g=>g.id)).size,3);
});

test('全部暫停的自由輪上限1包；恢復後部分進度續用；昨天補送不套今天隱藏設定',()=>{
  const p=F.defaults().children.aiden,visibility={date,profile:p};
  let state=C.apply(C.empty(),{type:'goals',expectedGoalRevision:0,targets:[goal('study:social',2)]},new Date('2026-11-05T04:00:00Z'));
  const record=(at=now)=>{state=C.apply(state,{type:'record',event:{entryId:'study:social',answered:true,occurredAt:at.toISOString()}},now,visibility);};
  record();p.archivedStudyUnits=[22,23];
  for(let n=0;n<2;n++)state=C.apply(state,{type:'round',hasPractice:true,event:{entryId:'spelling',roundId:`free-${n}`,occurredAt:now.toISOString()}},now,visibility);
  assert.equal(state.grants.length,1);
  p.archivedStudyUnits=[];record();assert.equal(state.grants.length,1,'自由輪已領1包，恢復不重領');
  record();record();assert.equal(state.grants.length,2);
  p.archivedStudyUnits=[22,23];
  const yesterday=new Date('2026-11-05T05:00:00Z');record(yesterday);record(yesterday);
  const old=C.snapshot(state,'2026-11-05',visibility);
  assert.equal(old.daily.targets.length,1);assert.equal(old.daily.earned,1);
});

test('Worker/真SQLite：可信設定、舊客戶端保留欄位、重送去重、當日恢復不重領',async()=>{
  const runtime=await collectionRuntime();let serial=0;
  const call=async(path,body,method=body?'POST':'GET')=>{
    const response=await runtime.fetch(new Request('http://local/v1/'+path,{method,headers:{Authorization:'Bearer test-token'},...(body?{body:JSON.stringify(body)}:{})}));
    const value=await response.json();assert.equal(response.status,200,JSON.stringify(value));return value;
  };
  try{
    const stored=await call('settings'),settings=stored.data;
    settings.children.aiden.archivedStudyUnits=archived;
    let saved=await call('settings',{rev:stored.rev,writeId:'visibility-1',data:settings},'PUT');
    const legacy=plain(saved.data);delete legacy.children.aiden.archivedStudyUnits;legacy.children.aiden.avatar='flat';
    saved=await call('settings',{rev:saved.rev,writeId:'visibility-legacy',data:legacy},'PUT');
    assert.deepEqual(saved.data.children.aiden.archivedStudyUnits,archived);
    const execute=(type,data)=>call('collection/aiden/'+type,{commandId:'visibility-'+(++serial),...data});
    let result=await execute('goals',{expectedGoalRevision:0,targets:[goal('study:math')]});
    assert.equal(result.snapshot.daily.targets.length,0);assert.equal(result.snapshot.goals.targets.length,1);
    const body={commandId:'same-record',generation:0,event:{entryId:'spelling',answered:true,roundId:'free',occurredAt:new Date().toISOString()},visibility:{profile:{apps:['study'],terms:['g4-s1'],archivedStudyUnits:[]}}};
    await execute('record',body);
    const round={commandId:'same-round',generation:0,event:{entryId:'spelling',roundId:'free',occurredAt:new Date().toISOString()}};
    result=await execute('round',round);assert.equal(result.snapshot.daily.earned,1);
    result=await execute('round',round);assert.equal(result.duplicate,true);assert.equal(result.snapshot.daily.targets.length,0);
    saved.data.children.aiden.archivedStudyUnits=[];
    await call('settings',{rev:saved.rev,writeId:'visibility-restore',data:saved.data},'PUT');
    const restored=await call('collection/aiden');
    assert.equal(restored.daily.targets.length,1);assert.equal(restored.daily.earned,1);
    assert.equal(restored.daily.targets[0].quantity,10);
  }finally{await runtime.dispose();}
});
