import test from 'node:test';
import assert from 'node:assert/strict';
import '../docs/study/math-interactions.js';
import '../docs/study/math-geometry.js';
import '../docs/study/math-operations.js';
import '../docs/study/private-pack.js';
import {operationQuestions,operationResponses,wrongOperationResponse} from './helpers/synthetic-math-operations.mjs';
import {syntheticPack} from './helpers/synthetic-study-pack.mjs';
import {boot,storage} from './helpers/study-harness.mjs';
const P=globalThis.StudyPrivatePack,M=globalThis.StudyMathOperations,plain=x=>JSON.parse(JSON.stringify(x));
function packWith(qs) {const p=syntheticPack();p.revision++;p.questions.push(...qs);for(const q of qs)p.explanations[q.id]='Synthetic mathematical feedback.';return p;}

test('seven bounded operations parse; wrong units and changed semantics cannot reuse progress IDs',()=>{
  for(const q of operationQuestions()) {
    const p=packWith([q]);assert.equal(P.parse(JSON.stringify(p)).questions.at(-1).type,q.type);
    const module=M.moduleFor(q);assert.equal(module.complete(q,module.initial(q)),false);
    assert.equal(module.grade(q,operationResponses[q.type]),true,q.type);
    assert.equal(module.complete(q,wrongOperationResponse(q.type)),true,q.type);
    assert.equal(module.grade(q,wrongOperationResponse(q.type)),false,q.type);
    const invalid=structuredClone(q);invalid.unit=19;assert.throws(()=>P.parse(JSON.stringify(packWith([invalid]))));
    const changed=structuredClone(p);changed.revision++;changed.questions.at(-1).interaction.extra=true;assert.throws(()=>P.parse(JSON.stringify(changed),[],p));
    const reordered=structuredClone(q);reordered.interaction=Object.fromEntries(Object.entries(q.interaction).reverse());assert.equal(P.semantic(reordered),P.semantic(q));
  }
  const image=operationQuestions().at(-1), changed=structuredClone(image);changed.interaction.scene.width=800;
  assert.throws(()=>P.parse(JSON.stringify(packWith([changed]))),/校準/);
  changed.interaction.scene={...image.interaction.scene,image:image.interaction.scene.image.replace('AAAA','AAAB')};
  assert.throws(()=>P.parse(JSON.stringify(packWith([changed]))));
});

test('each operation keeps an unfinished child draft, grades once, clears on retry and rewards only at batch end',async()=>{
  for(const q of operationQuestions()) {
    const events=[],family={allowed:()=>true,ready:Promise.resolve(),profile:()=>({terms:['g4-s1']}),task:()=>null,setActive(){},beginRound(){},record:e=>events.push(['record',e]),finishRound:()=>events.push(['finish'])};
    const ports={family,publishedStudyUnits:[24,25,26,27,28],search:'?child=aiden&subject=math&term=g4-s1'};
    let e=await boot(storage(),'aiden',ports);e.app.importPrivatePack(JSON.stringify(packWith([q])));e.app.State.saveBatch(String(q.unit),[q.id]);e.app.startQuiz('full',q.unit);
    e.app.submitAnswer(M.moduleFor(q).initial(q));assert.equal(e.app.quiz.isAnswered,false);
    e.app.quiz._operationState=structuredClone(operationResponses[q.type]);e.app.quiz._operationBinding.dispatch('noop');
    const stored=JSON.parse(e.st.getItem('study:operation-draft:aiden'));assert.equal(stored.id,q.id);
    const sibling=await boot(e.st,'bingpu',{...ports,search:'?child=bingpu&subject=math&term=g4-s1'});sibling.app.startQuiz('full',q.unit);
    assert.equal(M.moduleFor(q).complete(q,plain(sibling.app.quiz._operationState)),false,'no sibling draft reuse');
    e=await boot(e.st,'aiden',ports);e.app.startQuiz('full',q.unit);
    assert.equal(M.moduleFor(q).grade(q,plain(e.app.quiz._operationState)),true,'reload retains work');
    e.app.submitAnswer(wrongOperationResponse(q.type));assert.equal(e.app.quiz.answered.at(-1).correct,false);assert.equal(e.st.getItem('study:operation-draft:aiden'),'');
    e.app.advance();assert.equal(M.moduleFor(q).complete(q,plain(e.app.quiz._operationState)),false);
    e.app.submitAnswer(operationResponses[q.type]);e.app.submitAnswer(operationResponses[q.type]);
    assert.equal(e.app.State.doneCount(q.unit),1);assert.equal(events.filter(x=>x[0]==='record').length,2);assert.equal(events.filter(x=>x[0]==='finish').length,0);
    e.app.advance();assert.equal(events.filter(x=>x[0]==='finish').length,1);
  }
});
test('component clicks stop bubbling before replacing their DOM target',()=>{
 const q=operationQuestions()[0],listeners=new Map();let state=M.moduleFor(q).initial(q),stopped=false;
 const target={disabled:false,dataset:{mathAction:'key',mathValue:'7'}};target.closest=()=>target;
 const element={innerHTML:'',contains:x=>x===target,querySelector:()=>null,addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)};
 const binding=M.bind({q,element,getState:()=>state,setState:s=>state=s});
 listeners.get('click')({target,stopPropagation(){stopped=true;}});
 assert.equal(stopped,true);assert.equal(state.fields[0],'7');binding.destroy();assert.equal(listeners.size,0);
});
