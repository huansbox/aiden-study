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
const archived=[15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32];
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
  p.archivedStudyUnits=[15,16,17,18,19,20,21,22,23];
  assert.deepEqual(F.homeEntries(settings,'aiden',registry).filter(e=>e.app==='study').map(e=>e.id).sort(),['study:math','study:science','study:social'],'隱藏已考單元後，新發布數學、自然與社會仍開放');
  p.archivedStudyUnits=archived;
  assert.equal(F.homeEntries(settings,'aiden',registry).some(e=>e.app==='study'),false);
  assert.equal(F.availableEntry('study:math',p),false,'全部已發布數學隱藏後，入口關閉');
  assert.equal(F.availableStudyUnit(24),true);
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
  vm.runInContext(source.replace(/("id":24[^\n]*"published":)true/,'$1false'),candidate);
  assert.equal(candidate.KidsFamilyCore.availableStudyUnit(24),false,'候選單元未發布時不開放');
  const priorArchive=archived.filter(id=>id<24||id>28);
  assert.equal(F.availableEntry('study:math',{...p,terms:['g4-s1'],archivedStudyUnits:priorArchive}),true,'發布新單元後，原科目與目標會自行恢復');
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
  p.archivedStudyUnits=[22,23,31,32];
  assert.equal(e.node('page-quiz').classList.contains('hidden'),false,'變更設定不突然中斷正在作答的批次');
  e.app.leaveQuiz();assert.match(e.node('page-home').innerHTML,/目前沒有開放的內容/);
});

test('當日隱藏保留原累積完整份量、部分進度與 targets，其他科門檻不增加；恢復與自由輪不重領',()=>{
  const p=F.defaults().children.aiden, visibility={date,profile:p};
  const targets=[goal('study:social'),goal('study:math')];
  let state=C.apply(C.empty(),{type:'goals',expectedGoalRevision:0,targets},now,visibility);
  const answer=(entryId,count=1,at=now)=>{for(let n=0;n<count;n++)state=C.apply(state,{type:'record',event:{entryId,answered:true,occurredAt:at.toISOString()}},now,visibility);};
  answer('study:social',10);answer('study:math',3);
  p.archivedStudyUnits=[22,23,31,32];state=C.reconcile(state,now,visibility);
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
  record();p.archivedStudyUnits=[22,23,31,32];
  for(let n=0;n<2;n++)state=C.apply(state,{type:'round',hasPractice:true,event:{entryId:'spelling',roundId:`free-${n}`,occurredAt:now.toISOString()}},now,visibility);
  assert.equal(state.grants.length,1);
  p.archivedStudyUnits=[];record();assert.equal(state.grants.length,1,'自由輪已領1包，恢復不重領');
  record();record();assert.equal(state.grants.length,2);
  p.archivedStudyUnits=[22,23,31,32];
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

test('昨日先讀目標再離線自由練習，隔日補送沿用昨日承諾；恢復及已領不重複',()=>{
  const yesterday=new Date('2026-11-05T04:00:00Z'), oldDate=C.dateKey(yesterday);
  const p=F.defaults().children.aiden;
  p.archivedStudyUnits=archived;
  const hidden={date:oldDate,profile:p};
  let state=C.apply(C.empty(),{type:'goals',expectedGoalRevision:0,targets:[goal('study:math')]},yesterday);
  state=C.reconcile(state,yesterday,hidden); // server collection GET, before any practice exists
  assert.equal(C.snapshot(state,oldDate,hidden).daily.targets.length,0);
  const original=plain(state.configs);
  p.archivedStudyUnits=[];
  state=C.reconcile(state,yesterday,hidden); // restoration must preserve the earlier free-round promise
  assert.equal(C.snapshot(state,oldDate,hidden).daily.targets.length,1);
  const today={date,profile:p};
  state=C.reconcile(state,now,today);
  const round={type:'round',hasPractice:true,event:{entryId:'spelling',roundId:'offline',occurredAt:yesterday.toISOString()}};
  state=C.apply(state,round,now,today);
  assert.equal(C.snapshot(state,oldDate,today).daily.earned,1,'昨日自由輪應領1包');
  assert.deepEqual(state.configs,original);
  assert.deepEqual(state.days[oldDate].targets,original[0].targets);
  p.archivedStudyUnits=archived;
  state=C.reconcile(state,now,today);
  state=C.apply(state,round,now,today);
  assert.equal(C.snapshot(state,oldDate,today).daily.earned,1,'昨日已領不重發');
  assert.equal(C.snapshot(state,oldDate,today).daily.targets.length,1,'今日隱藏不改昨日最後有效範圍');
});

test('未有可信昨日snapshot的補送明確沿用原targets，不推測當年隱藏狀態',()=>{
  const yesterday=new Date('2026-11-05T04:00:00Z'),p=F.defaults().children.aiden;
  let state=C.apply(C.empty(),{type:'goals',expectedGoalRevision:0,targets:[goal('study:math',1)]},yesterday);
  assert.equal(state.days[C.dateKey(yesterday)],undefined);
  p.archivedStudyUnits=archived;
  const visibility={date,profile:p};
  state=C.apply(state,{type:'round',hasPractice:true,event:{entryId:'spelling',roundId:'never-online',occurredAt:yesterday.toISOString()}},now,visibility);
  assert.equal(C.snapshot(state,C.dateKey(yesterday),visibility).daily.earned,0);
  state=C.apply(state,{type:'record',event:{entryId:'study:math',answered:true,occurredAt:yesterday.toISOString()}},now,visibility);
  assert.equal(C.snapshot(state,C.dateKey(yesterday),visibility).daily.earned,1);
});

test('summary重新挑戰先重讀設定，隱藏後不得清通關進度；等待有回饋且連點只啟動一次',async()=>{
  const p=F.defaults().children.aiden;
  let pending=null,refreshes=0,starts=0;
  const family={ready:Promise.resolve(),profile:()=>p,task:()=>null,allowed:()=>true,setActive(){},record(){},beginRound(){starts++;},finishRound(){},refreshSettings(){refreshes++;return pending||Promise.resolve();}};
  const e=await boot(undefined,'test-child',{family,search:'?child=test-child&subject=social&term=g4-s1'});
  e.app.importPrivatePack(JSON.stringify(socialSyntheticPack()));
  await Promise.resolve();await Promise.resolve();
  e.app.State.setStudyTerm('g4-s1');e.app.State.setSubject('social');
  await e.window._startFull(22);
  const ids=e.app.questionIdsFor(22);
  e.app.state.mastered[22]=ids.slice();
  const before=plain({mastered:e.app.state.mastered,challenge:e.app.state.challenge});
  let release;pending=new Promise(resolve=>{release=resolve;});
  const baseline=refreshes;
  const first=e.window._resetAndStartFull(22),second=e.window._resetAndStartFull(22);
  assert.equal(refreshes,baseline+1,'快速連點共用同一個開始檢查');
  assert.match(e.node('study-start-status').textContent,/確認.*練習範圍/);
  assert.equal(e.node('study-start-status').classList.contains('hidden'),false);
  p.archivedStudyUnits=[22];release();await Promise.all([first,second]);
  assert.deepEqual(plain({mastered:e.app.state.mastered,challenge:e.app.state.challenge}),before);
  assert.equal(e.node('page-quiz').classList.contains('hidden'),true);
  pending=null;p.archivedStudyUnits=[];
  let resume;pending=new Promise(resolve=>{resume=resolve;});
  const count=starts,a=e.window._startFull(22),b=e.window._startFull(22);
  resume();await Promise.all([a,b]);assert.equal(starts,count+1);
});

test('真SQLite今日view無record即保存規則；隔日補送及重送不漏包不重領',async()=>{
  const runtime=await collectionRuntime();
  const call=async(path,body,method=body?'POST':'GET')=>{
    const response=await runtime.fetch(new Request('http://local/v1/'+path,{method,headers:{Authorization:'Bearer test-token'},...(body?{body:JSON.stringify(body)}:{})}));
    const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));return result;
  };
  try {
    const today=C.dateKey(),yesterday=C.dateKey(Date.now()-86400000);
    const occurredAt=new Date(Date.now()-86400000).toISOString();
    // Historical goal config is an old-client state with no daily records.
    const original=C.empty();original.goalRevision=1;original.configs=[{revision:1,effectiveDate:yesterday,targets:[goal('study:math')]}];
    await runtime.restoreFixture(original);
    let settings=await call('settings');settings.data.children.aiden.archivedStudyUnits=archived;
    settings=await call('settings',{...settings,writeId:'late-hide'},'PUT');
    const view=await call('collection/aiden');assert.equal(view.daily.targets.length,0);assert.equal(view.daily.rulesConfirmed,true);
    const persisted=await runtime.inspectFixture();
    assert.equal(persisted.days[today].rounds,0);
    assert.deepEqual(persisted.days[today].counts,{});
    // Move the persisted, server-created day forward in the fixture clock without inventing a profile.
    persisted.days[yesterday]=persisted.days[today];delete persisted.days[today];
    await runtime.restoreFixture(persisted);
    settings.data.children.aiden.archivedStudyUnits=[];
    await call('settings',{...settings,writeId:'late-restore'},'PUT');
    const event={entryId:'spelling',roundId:'yesterday-offline',occurredAt};
    await call('collection/aiden/record',{commandId:'late-record',generation:0,event:{...event,answered:true},visibility:{date:yesterday,profile:{}}});
    const command={commandId:'late-round',generation:0,event};
    await call('collection/aiden/round',command);
    assert.equal((await call('collection/aiden/round',command)).duplicate,true);
    const past=await call('collection/aiden?date='+yesterday);
    assert.equal(past.daily.earned,1);assert.equal(past.daily.targets.length,0);
    assert.equal((await call('collection/aiden')).daily.targets.length,1);
    assert.deepEqual((await runtime.inspectFixture()).days[yesterday].targets,original.configs[0].targets);
  } finally {await runtime.dispose();}
});

test('純core：短暫清空goals不承諾自由輪，今日view或練習回應的既有承諾保留',()=>{
  const spelling={entryId:'spelling',metric:'rounds',quantity:3};
  for(const promise of ['none','view','practice']) {
    const visibility={date,profile:F.defaults().children.aiden};
    let state=C.empty();
    const goals=targets=>{state=C.apply(state,{type:'goals',expectedGoalRevision:state.goalRevision,targets},now,visibility);};
    goals([spelling]);goals([]);
    assert.ok(Array.isArray(state.days[date].availableEntryIds));
    assert.notEqual(state.days[date].freeRoundEligible,true);
    if(promise==='view')state=C.reconcile(state,now,visibility);
    if(promise==='practice')state=C.apply(state,{type:'record',event:{entryId:'spelling',answered:true,occurredAt:now.toISOString()}},now,visibility);
    goals([spelling]);
    state=C.apply(state,{type:'round',hasPractice:true,event:{entryId:'spelling',roundId:'after-restore',occurredAt:now.toISOString()}},now,visibility);
    assert.equal(state.grants.length,promise==='none'?0:1,promise);
    assert.equal(C.snapshot(state,date,visibility).daily.targets[0].progress,1);
  }
});

test('真SQLite：goals清空及duplicate後恢復，沒有GET不發自由包；GET承諾同日保留',async()=>{
  const runtime=await collectionRuntime();
  const spelling={entryId:'spelling',metric:'rounds',quantity:3};
  const call=async(type='',body)=>{
    const response=await runtime.fetch(new Request('http://local/v1/collection/aiden'+(type?'/'+type:''),{
      method:body?'POST':'GET',headers:{Authorization:'Bearer test-token'},...(body?{body:JSON.stringify(body)}:{})}));
    const value=await response.json();assert.equal(response.status,200,JSON.stringify(value));return value;
  };
  try {
    for(const promise of [false,true]) {
      await runtime.restoreFixture(C.empty());
      const prefix='goals-promise-'+promise;
      await call('goals',{commandId:prefix+'-initial',expectedGoalRevision:0,targets:[spelling]});
      const empty={commandId:prefix+'-empty',expectedGoalRevision:1,targets:[]};
      await call('goals',empty);
      assert.equal((await call('goals',empty)).duplicate,true);
      assert.notEqual((await runtime.inspectFixture()).days[C.dateKey()].freeRoundEligible,true,'duplicate goals cannot promise a free round');
      if(promise)await call();
      const restored={commandId:prefix+'-restore',expectedGoalRevision:2,targets:[spelling]};
      await call('goals',restored);
      assert.equal((await call('goals',restored)).duplicate,true);
      const event={entryId:'spelling',roundId:prefix+'-round',occurredAt:new Date().toISOString()};
      await call('record',{commandId:prefix+'-record',generation:0,event:{...event,answered:true}});
      const round={commandId:prefix+'-finish',generation:0,event};
      const result=await call('round',round);
      assert.equal(result.snapshot.daily.earned,promise?1:0);
      assert.equal(result.snapshot.daily.targets[0].progress,1);
      assert.equal((await call('round',round)).snapshot.daily.earned,promise?1:0);
    }
  } finally {await runtime.dispose();}
});

test('純core：已有1/3輪後清空goals不補自由包；空目標GET才能承諾並補既有回合',()=>{
  const spelling={entryId:'spelling',metric:'rounds',quantity:3};
  for(const confirm of [false,true]) {
    const visibility={date,profile:F.defaults().children.aiden};
    let state=C.apply(C.empty(),{type:'goals',expectedGoalRevision:0,targets:[spelling]},now,visibility);
    state=C.apply(state,{type:'round',hasPractice:true,event:{entryId:'spelling',roundId:'partial',occurredAt:now.toISOString()}},now,visibility);
    assert.equal(state.grants.length,0);
    state=C.apply(state,{type:'goals',expectedGoalRevision:1,targets:[]},now,visibility);
    assert.equal(state.grants.length,0,'暫時清空不能把既有1/3進度變成自由包');
    if(confirm)state=C.reconcile(state,now,visibility);
    assert.equal(state.grants.length,confirm?1:0);
    state=C.apply(state,{type:'goals',expectedGoalRevision:2,targets:[spelling]},now,visibility);
    const view=C.snapshot(state,date,visibility);
    assert.equal(view.daily.earned,confirm?1:0);
    assert.equal(view.daily.targets[0].progress,1);
    assert.equal(view.daily.targets[0].nextRewardRemaining,confirm?5:2);
  }
});

test('真SQLite：已有1/3輪後goals清空及duplicate不補包；正常GET可補且恢復不回收',async()=>{
  const runtime=await collectionRuntime(),spelling={entryId:'spelling',metric:'rounds',quantity:3};
  const call=async(type='',body)=>{
    const response=await runtime.fetch(new Request('http://local/v1/collection/aiden'+(type?'/'+type:''),{
      method:body?'POST':'GET',headers:{Authorization:'Bearer test-token'},...(body?{body:JSON.stringify(body)}:{})}));
    const value=await response.json();assert.equal(response.status,200,JSON.stringify(value));return value;
  };
  try {
    for(const confirm of [false,true]) {
      await runtime.restoreFixture(C.empty());const prefix='partial-goals-'+confirm;
      await call('goals',{commandId:prefix+'-initial',expectedGoalRevision:0,targets:[spelling]});
      const event={entryId:'spelling',roundId:prefix+'-round',occurredAt:new Date().toISOString()};
      await call('record',{commandId:prefix+'-record',generation:0,event:{...event,answered:true}});
      assert.equal((await call('round',{commandId:prefix+'-finish',generation:0,event})).snapshot.daily.earned,0);
      const empty={commandId:prefix+'-empty',expectedGoalRevision:1,targets:[]};
      assert.equal((await call('goals',empty)).snapshot.daily.earned,0);
      const duplicate=await call('goals',empty);assert.equal(duplicate.duplicate,true);assert.equal(duplicate.snapshot.daily.earned,0);
      if(confirm)assert.equal((await call()).daily.earned,1);
      const restored={commandId:prefix+'-restore',expectedGoalRevision:2,targets:[spelling]};
      await call('goals',restored);const after=await call('goals',restored);
      assert.equal(after.duplicate,true);assert.equal(after.snapshot.daily.earned,confirm?1:0);
      assert.equal(after.snapshot.daily.targets[0].progress,1);
      assert.equal(after.snapshot.daily.targets[0].nextRewardRemaining,confirm?5:2);
    }
  } finally {await runtime.dispose();}
});
