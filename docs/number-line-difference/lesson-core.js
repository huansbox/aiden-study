// 固定教學的幾何狀態機；事件只記孩子的操作，不把答案數字當作線段身分。
export const TASK_ID = 'number-line-difference';
export const segment = (a,b) => [a,b].sort().join('');
export const label = (p,s) => [...s].map(id=>p.points.find(point=>point.id===id)?.label||id).join('');
export const initialKnown = p => Object.fromEntries(p.givens.map(g=>[g.segment,g.length]));
export function subtract(long,short) {
  if(long===short||long.length!==2||short.length!==2)return null;
  const [a,b]=long,[c,d]=short;
  if(a===c&&d<b)return segment(d,b);
  if(b===d&&a<c)return segment(a,c);
  return null;
}
export function legalSteps(known) {
  const result=[];
  for(const long of Object.keys(known))for(const short of Object.keys(known)){
    const out=subtract(long,short),value=known[long]-known[short];
    if(out&&!(out in known)&&value>0)result.push({long,short,result:out,value});
  }
  return result;
}
export function shortestRoutes(known,target,maxDepth=3) {
  if(target in known)return [[]];
  let frontier=[{known,steps:[]}];
  for(let depth=1;depth<=maxDepth;depth++){
    const next=[],found=[];
    for(const node of frontier)for(const step of legalSteps(node.known)){
      const steps=[...node.steps,step],more={...node.known,[step.result]:step.value};
      if(step.result===target)found.push(steps);else next.push({known:more,steps});
    }
    if(found.length)return found;
    frontier=next;
  }
  return [];
}
export function createQuestion(){return {stage:'given-start',givenIndex:0,point:null,arcs:[],steps:[],target:null,long:null,short:null,pending:null,selectedChip:null,errors:0,totalErrors:0};}
export function createLesson(problems){return {version:2,index:0,finished:false,completedIds:[],questions:problems.map(createQuestion)};}
export const current=state=>state.questions[state.index];
export function knownFor(p,q){return {...initialKnown(p),...Object.fromEntries(q.steps.map(s=>[s.result,s.value]))};}
export function nextSteps(p,q){
  if(p.preferredRoute&&p.preferredRoute!=='direct'){
    const route=p.routes.find(route=>route.id===p.preferredRoute);
    return route?.steps[q.steps.length]?[route.steps[q.steps.length]]:[];
  }
  const distinct=new Map();
  for(const route of shortestRoutes(knownFor(p,q),p.target,p.minSubtractions-q.steps.length))if(route.length)distinct.set(route[0].long+route[0].short,route[0]);
  return [...distinct.values()];
}
export function targetStatus(p,q,target){
  if(target in knownFor(p,q))return 'known';
  if(nextSteps(p,q).some(s=>s.result===target))return 'ok';
  if(legalSteps(knownFor(p,q)).some(s=>s.result===target))return p.preferredRoute?'guided-route':'longer-route';
  return 'unavailable';
}
// 提示只建議一段；nextSteps／expectedPoints 仍保留全部合法選擇。
export function suggestedTarget(p,q){
  return nextSteps(p,q).find(s=>!q.point||s.result.includes(q.point))?.result||null;
}
export function expectedPoints(p,q){
  const segments=q.stage.startsWith('given')?[p.givens[q.givenIndex]?.segment]:nextSteps(p,q).map(s=>s.result);
  return [...new Set(segments.filter(Boolean).filter(s=>!q.point||s.includes(q.point)).flatMap(s=>[...s]))].filter(id=>id!==q.point);
}
export function act(state,problems,type,value){
  if(state.finished)return {ok:false,reason:'finished'};
  const p=problems[state.index],q=current(state);
  let ok=false,reason='incorrect',resetErrors=true;
  if(type==='point'&&['given-start','given-end'].includes(q.stage)){
    ok=expectedPoints(p,q).includes(value);
    if(ok&&q.stage==='given-start'){q.point=value;q.stage='given-end';}
    else if(ok){q.arcs.push({segment:segment(q.point,value),length:null,derived:false});q.point=null;q.stage='given-value';}
  }else if(type==='point'&&['target-start','target-end'].includes(q.stage)){
    if(p.points.some(point=>point.id===value)){
      if(!q.point){q.point=value;q.stage='target-end';ok=true;resetErrors=false;}
      else if(q.point===value){q.point=null;q.stage='target-start';ok=true;resetErrors=false;}
      else{
        const target=segment(q.point,value);reason=targetStatus(p,q,target);q.point=null;
        ok=reason==='ok';q.stage=ok?'long':'target-start';
        if(ok)q.target=target;
      }
    }
  }else if(type==='chip'&&['given-value','result-place'].includes(q.stage)){
    ok=q.stage==='given-value'?p.givens.some(g=>'given-'+g.segment===value):value==='result';
    if(ok){q.selectedChip=value;resetErrors=false;}
  }else if(type==='place'&&['given-value','result-place'].includes(q.stage)){
    const target=q.stage==='given-value'?p.givens[q.givenIndex].segment:q.target;
    const chip=p.givens.find(g=>'given-'+g.segment===q.selectedChip);
    ok=value===target&&(q.stage==='given-value'?chip?.length===p.givens[q.givenIndex].length:q.selectedChip==='result');
    if(ok&&q.stage==='given-value'){
      q.arcs.at(-1).length=p.givens[q.givenIndex].length;q.givenIndex++;
      q.stage=q.givenIndex<p.givens.length?'given-start':'target-start';
    }else if(ok){
      q.arcs.push({segment:q.target,length:q.pending.value,derived:true});q.steps.push({...q.pending});
      q.pending=null;q.target=null;q.long=null;q.short=null;
      q.stage=p.target in knownFor(p,q)?'question-complete':'target-start';
      if(q.stage==='question-complete'&&!state.completedIds.includes(p.id))state.completedIds.push(p.id);
    }
    q.selectedChip=null;
  }else if(type==='segment'&&q.stage==='long'){
    ok=q.arcs.some(a=>a.segment===value&&a.length!==null)&&nextSteps(p,q).some(s=>s.result===q.target&&s.long===value);
    if(ok){q.long=value;q.stage='short';}
  }else if(type==='segment'&&q.stage==='short'){
    const step=nextSteps(p,q).find(s=>s.result===q.target&&s.long===q.long&&s.short===value);
    ok=!!step;
    if(ok){q.short=value;q.pending={...step};q.stage='answer';}
  }else if(type==='number'&&q.stage==='answer'){
    ok=/^\d{1,3}$/.test(String(value))&&Number(value)===q.pending.value;
    if(ok)q.stage='result-place';
  }else if(type==='next'&&q.stage==='question-complete'){
    ok=true;if(state.index===problems.length-1)state.finished=true;else state.index++;
  }
  if(ok){if(resetErrors)q.errors=0;}else{q.errors++;q.totalErrors++;}
  return {ok,reason};
}

const eventTypes=['point','chip','place','number','segment','next'];
const validEvent=e=>e&&eventTypes.includes(e.type)&&['string','number'].includes(typeof e.value);
// v1 只在此以舊語意驗證。不能把舊 point/number 直接送入新狀態機。
function legacyCompleted(problems,saved){
  const completed=[];let index=0,stage='given-start',given=0,point=null,long=null,pending=null,steps=[];
  if(saved?.version!==1||!Array.isArray(saved.log)||saved.log.length>12000)return {completed,index:0,finished:false,partial:false};
  for(const event of saved.log){
    if(!event||!['point','number','segment','next'].includes(event.type)||!['string','number'].includes(typeof event.value))break;
    const p=problems[index],v=event.value;if(!p)break;
    const candidates=nextSteps(p,{steps});
    if(event.type==='point'&&['given-start','given-end','mark-start','mark-end'].includes(stage)){
      const wanted=stage.startsWith('given')?p.givens[given].segment:pending.result;
      if(![...wanted].includes(v)||v===point)continue;
      if(stage.endsWith('start')){point=v;stage=stage.replace('start','end');}
      else{point=null;stage=stage.startsWith('given')?'given-value':'mark-value';}
    }else if(event.type==='number'&&['given-value','answer','mark-value'].includes(stage)){
      const value=stage==='given-value'?p.givens[given].length:pending.value;
      if(String(v).trim()===''||Number(v)!==value)continue;
      if(stage==='given-value'){given++;stage=given<p.givens.length?'given-start':'long';}
      else if(stage==='answer')stage='mark-start';
      else{steps.push({...pending});pending=null;long=null;stage=steps.at(-1).result===p.target?'question-complete':'long';if(stage==='question-complete')completed.push({index,steps:[...steps]});}
    }else if(event.type==='segment'&&stage==='long'&&candidates.some(s=>s.long===v)){long=v;stage='short';}
    else if(event.type==='segment'&&stage==='short'){
      const step=candidates.find(s=>s.long===long&&s.short===v);if(step){pending={...step};stage='answer';}
    }else if(event.type==='next'&&stage==='question-complete'){
      if(index===problems.length-1)return {completed,index,finished:true,partial:false};
      index++;stage='given-start';given=0;point=null;long=null;pending=null;steps=[];
    }
  }
  return {completed,index,finished:false,partial:stage!=='given-start'||given>0};
}
export function restore(problems,saved,legacy=null){
  const state=createLesson(problems),log=[];
  if(saved!==null&&saved!==undefined){
    if(saved.version!==2||!Array.isArray(saved.log)||saved.log.length>12000||!saved.log.every(validEvent))return {state,log,writable:false};
    for(const event of saved.log){if(state.finished)break;act(state,problems,event.type,event.value);log.push({...event});}
    return {state,log,writable:true};
  }
  const migrated=legacyCompleted(problems,legacy);
  const send=(type,value)=>{act(state,problems,type,value);log.push({type,value});};
  for(const done of migrated.completed){
    const p=problems[done.index];
    for(const g of p.givens){send('point',g.segment[0]);send('point',g.segment[1]);send('chip','given-'+g.segment);send('place',g.segment);}
    for(const s of done.steps){send('point',s.result[0]);send('point',s.result[1]);send('segment',s.long);send('segment',s.short);send('number',s.value);send('chip','result');send('place',s.result);}
    if(done.index<migrated.index||migrated.finished)send('next','');
  }
  return {state,log,writable:true,migrated:legacy?.version===1,resetCurrent:migrated.partial&&current(state).stage!=='question-complete'};
}
