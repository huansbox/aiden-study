import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import model from '../learning-tasks/leisure-afternoon/source/content.js';
import reading from '../docs/mind-map-reading.js';
const {BRANCHES,cleanState,branchWords,mapWordCount,LEISURE_READINGS,STORAGE_KEY}=model;
const full=()=>BRANCHES.map(b=>b.choices.slice(0,b.min).map(c=>c.id));

test('漏掉任一主枝或只選一個園景不能完成；有效完整存檔可還原',()=>{
  const picks=full();assert.equal(cleanState({picks,step:4,finished:true}).finished,true);
  for(let i=0;i<BRANCHES.length;i++){
    const incomplete=full();incomplete[i]=incomplete[i].slice(0,-1);
    const state=cleanState({picks:incomplete,step:4,finished:true});
    assert.equal(state.finished,false);assert.equal(state.step,i);
  }
});
test('拒絕外部存檔的未知值、重複字卡及超量選項，舊作業存檔不混入',()=>{
  const raw={picks:[['<script>','visit-photo','visit-camera'],['lotus','lotus','fish','ducks']],step:99,finished:true};
  const state=cleanState(raw);
  assert.deepEqual(state.picks[0],['visit-photo']);assert.deepEqual(state.picks[1],['lotus','fish']);
  assert.equal(state.step,2);assert.equal(state.finished,false);
  assert.notEqual(STORAGE_KEY,'aiden_reading_mind_map_v1');
  assert.equal(cleanState({picks:[['陽光與司馬光']],finished:true}).picks.flat().length,0);
  for(const raw of [null,[],42,{step:-1},{picks:'bad',step:Infinity}])assert.equal(cleanState(raw).finished,false);
});
test('全部 240 種選法保留五枝、詩中四景與喜愛自然，抄寫不超過 60 字',()=>{
  const choices=BRANCHES.map(b=>b.min===2?b.choices.flatMap((c,i)=>b.choices.slice(i+1).map(d=>[c.id,d.id])):b.choices.map(c=>[c.id]));
  let total=0;
  function visit(picks){if(picks.length<5){for(const ids of choices[picks.length])visit([...picks,ids]);return;}
    assert.equal(cleanState({picks,step:4,finished:true}).finished,true);
    assert.ok(mapWordCount(picks)<=60);
    assert.ok(branchWords(BRANCHES[4],picks[4]).includes('喜愛自然'));
    const poem=branchWords(BRANCHES[2],picks[2]).join('');for(const noun of ['花','葉','筍','鴨'])assert.ok(poem.includes(noun));total++;
  }visit([]);assert.equal(total,240);
});
test('新文章注音依語境校正，存檔與短詞不受影響',()=>{
  reading.READING_PHRASES.push(...LEISURE_READINGS);
  const vs=String.fromCodePoint(0xE01E1);
  const text='相通，相機，看得懂';const once=reading.withReadingVariants(text);
  assert.equal(once,`相${vs}通，相${vs}機，看得${vs}懂`);assert.equal(reading.withReadingVariants(once),once);
  const picks=full(),before=JSON.stringify(picks);BRANCHES.forEach((b,i)=>branchWords(b,picks[i]).forEach(reading.withReadingVariants));assert.equal(JSON.stringify(picks),before);
});
test('部署成品與任務來源完全同步',()=>{
  execFileSync(process.execPath,['learning-tasks/leisure-afternoon/build.mjs','--check'],{cwd:new URL('../',import.meta.url),stdio:'pipe'});
});
