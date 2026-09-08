import {test} from 'node:test';
import assert from 'node:assert/strict';
import model from '../docs/mind-map.js';
import reading from '../docs/mind-map-reading.js';
const {STEPS,cleanState,mapWordCount}=model;

test('多音字按語境選音，重複渲染不增加選擇符號',()=>{
  const {withReadingVariants}=reading;
  const vs=String.fromCodePoint(0xE01E1);
  const result=withReadingVariants('長大、典當、巨著、覺得、不阿；當戶、喪事、為官');
  assert.equal(result,`長${vs}大、典當${vs}、巨著${vs}、覺得${vs}、不阿${vs}；當戶、喪事、為官`);
  assert.equal(withReadingVariants(result),result);
});
test('顯示用選音不改選項與抄寫字數',()=>{
  const picks=STEPS.map(s=>[s.options[0]]), before=JSON.stringify(picks), count=mapWordCount(picks);
  picks.forEach(words=>words.forEach(reading.withReadingVariants));
  assert.equal(JSON.stringify(picks),before);
  assert.equal(mapWordCount(picks),count);
});

test('存檔不接受陌生文字、重複選項或超過字卡上限',()=>{
  const state=cleanState({picks:[['<script>','陽光與司馬光','讀詩想起司馬光'],['雨後初晴','雨後初晴','葵花向陽','春末夏初']],step:4,finished:true});
  assert.deepEqual(state.picks[0],['陽光與司馬光']);
  assert.deepEqual(state.picks[1],['雨後初晴','葵花向陽']);
  assert.equal(state.step,2);
  assert.equal(state.finished,false);
});
test('缺少任何分支時不能還原為完成畫面；完整選擇可以恢復',()=>{
  const picks=STEPS.map(s=>[s.options[0]]);
  assert.equal(cleanState({picks,step:4,finished:true}).finished,true);
  picks[2]=[];
  assert.equal(cleanState({picks,step:4,finished:true}).finished,false);
  for(const raw of [null,[],42,{step:-1},{picks:'bad',step:100}]) {
    assert.equal(cleanState(raw).step,0);
    assert.equal(cleanState(raw).finished,false);
  }
});
test('所有可完成的組合，包括分支標籤，最多抄寫 60 字',()=>{
  const longest=STEPS.map(s=>[...s.options].sort((a,b)=>b.length-a.length).slice(0,s.max));
  assert.ok(mapWordCount(longest)<=60);
  assert.equal(mapWordCount([[],[],[],[],[]]),0);
});
