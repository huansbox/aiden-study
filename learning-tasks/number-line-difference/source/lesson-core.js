// 固定教學的幾何狀態機；線段身分與數字分開判斷。
export const TASK_ID = 'number-line-difference';
export const segment = (a, b) => [a, b].sort().join('');
export const label = (p, s) => [...s].map(id => p.points.find(point => point.id === id)?.label || id).join('');
export const initialKnown = p => Object.fromEntries(p.givens.map(g => [g.segment, g.length]));

export function subtract(long, short) {
  if (long === short || long.length !== 2 || short.length !== 2) return null;
  const [a,b] = long, [c,d] = short;
  if (a === c && d < b) return segment(d,b);
  if (b === d && a < c) return segment(a,c);
  return null;
}
export function legalSteps(known) {
  const result = [];
  for (const long of Object.keys(known)) for (const short of Object.keys(known)) {
    const out = subtract(long,short), value = known[long] - known[short];
    if (out && !(out in known) && value > 0) result.push({long,short,result:out,value});
  }
  return result;
}
// 列出所有最短減法路線，保留互不相依步驟的換序。
export function shortestRoutes(known, target, maxDepth = 3) {
  if (target in known) return [[]];
  let frontier = [{known,steps:[]}];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const next = [], found = [];
    for (const node of frontier) for (const step of legalSteps(node.known)) {
      const steps = [...node.steps,step], more = {...node.known,[step.result]:step.value};
      if (step.result === target) found.push(steps);
      else next.push({known:more,steps});
    }
    if (found.length) return found;
    frontier = next;
  }
  return [];
}
export function createQuestion() {
  return {stage:'given-start',givenIndex:0,point:null,arcs:[],steps:[],long:null,short:null,pending:null,errors:0,totalErrors:0};
}
export function createLesson(problems) {
  return {version:1,index:0,finished:false,completedIds:[],questions:problems.map(createQuestion)};
}
export const current = state => state.questions[state.index];
export function knownFor(p,q) {
  return {...initialKnown(p),...Object.fromEntries(q.steps.map(step => [step.result,step.value]))};
}
export function nextSteps(p,q) {
  if (p.preferredRoute && p.preferredRoute !== 'direct') {
    const route = p.routes.find(route => route.id === p.preferredRoute);
    return route?.steps[q.steps.length] ? [route.steps[q.steps.length]] : [];
  }
  const routes = shortestRoutes(knownFor(p,q),p.target,p.minSubtractions-q.steps.length);
  const distinct = new Map();
  for (const route of routes) if (route.length) distinct.set(route[0].long+route[0].short,route[0]);
  return [...distinct.values()];
}
export function expectedPoints(p,q) {
  const s = q.stage.startsWith('given') ? p.givens[q.givenIndex]?.segment : q.pending?.result;
  return s ? [...s].filter(point => point !== q.point) : [];
}
export function act(state,problems,type,value) {
  if (state.finished) return {ok:false};
  const p = problems[state.index], q = current(state);
  let ok = false;
  if (type === 'point' && ['given-start','given-end','mark-start','mark-end'].includes(q.stage)) {
    ok = expectedPoints(p,q).includes(value);
    if (ok) {
      if (q.stage.endsWith('start')) { q.point=value; q.stage=q.stage.replace('start','end'); }
      else {
        const seg = segment(q.point,value); q.point=null;
        q.arcs.push({segment:seg,length:null,derived:q.stage.startsWith('mark')});
        q.stage=q.stage.startsWith('given')?'given-value':'mark-value';
      }
    }
  } else if (type === 'number' && ['given-value','answer','mark-value'].includes(q.stage)) {
    const answer = q.stage === 'given-value' ? p.givens[q.givenIndex].length : q.pending.value;
    ok = String(value).trim() !== '' && Number(value) === answer;
    if (ok && q.stage === 'given-value') {
      q.arcs.at(-1).length=answer; q.givenIndex++;
      q.stage=q.givenIndex < p.givens.length ? 'given-start' : 'long';
    } else if (ok && q.stage === 'answer') q.stage='mark-start';
    else if (ok) {
      q.arcs.at(-1).length=answer; q.steps.push(q.pending); q.pending=null; q.long=null; q.short=null;
      q.stage=knownFor(p,q)[p.target] !== undefined ? 'question-complete' : 'long';
      if (q.stage === 'question-complete') state.completedIds.push(p.id);
    }
  } else if (type === 'segment' && q.stage === 'long') {
    ok=nextSteps(p,q).some(step => step.long === value);
    if (ok) { q.long=value; q.stage='short'; }
  } else if (type === 'segment' && q.stage === 'short') {
    const step=nextSteps(p,q).find(step => step.long===q.long && step.short===value);
    ok=!!step;
    if (ok) { q.short=value; q.pending={...step}; q.stage='answer'; }
  } else if (type === 'next' && q.stage === 'question-complete') {
    ok=true;
    if (state.index === problems.length-1) state.finished=true;
    else state.index++;
  }
  if (ok) q.errors=0;
  else { q.errors++; q.totalErrors++; }
  return {ok};
}

// 從操作重播還原，避免壞掉或舊版存檔跳過必需操作。
export function restore(problems,saved) {
  const state=createLesson(problems), log=[];
  if (saved?.version !== 1 || !Array.isArray(saved.log) || saved.log.length>12000) return {state,log};
  for (const event of saved.log) {
    if (!event || !['point','number','segment','next'].includes(event.type) || !['string','number'].includes(typeof event.value)) break;
    if (state.finished) break;
    act(state,problems,event.type,event.value); log.push(event);
  }
  return {state,log};
}
