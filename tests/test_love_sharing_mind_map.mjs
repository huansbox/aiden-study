import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import model from '../learning-tasks/love-sharing/source/content.js';
import previous from '../learning-tasks/leisure-afternoon/source/content.js';
import reading from '../docs/mind-map-reading.js';
const {BRANCHES,cleanState,branchWords,mapWordCount,LOVE_READINGS,STORAGE_KEY}=model;
const full=()=>BRANCHES.map(b=>[b.choices[0].id]);

test('愛的分享：五個段落都完成才能抄寫；回改後仍可還原',()=>{
  const picks=full();
  assert.deepEqual(cleanState({picks,step:4,finished:true}),{picks,step:4,finished:true});
  for(let i=0;i<5;i++){
    const incomplete=full();incomplete[i]=[];
    assert.deepEqual(cleanState({picks:incomplete,step:4,finished:true}),{picks:incomplete,step:i,finished:false});
  }
  assert.equal(cleanState({picks,step:1,finished:false}).step,1);
});

test('愛的分享：壞存檔不能跳過段落，前兩篇的選擇不混入',()=>{
  const bad={picks:[['unknown',BRANCHES[0].choices[0].id,BRANCHES[0].choices[0].id,BRANCHES[0].choices[1].id]],step:99,finished:true};
  const state=cleanState(bad);
  assert.deepEqual(state.picks[0],[BRANCHES[0].choices[0].id]);
  assert.equal(state.step,1);assert.equal(state.finished,false);
  assert.notEqual(STORAGE_KEY,previous.STORAGE_KEY);assert.notEqual(STORAGE_KEY,'aiden_reading_mind_map_v1');
  assert.deepEqual(cleanState({picks:previous.BRANCHES.map(b=>b.choices.map(c=>c.id)),finished:true}).picks,[[],[],[],[],[]]);
  for(const raw of [null,[],42,{step:-1},{picks:'bad',step:Infinity}])assert.equal(cleanState(raw).finished,false);
});

test('愛的分享：全部 32 種選法保留轉變、受訓實習、服務人、陪伴復健與分享；最多 60 字',()=>{
  let total=0;
  function visit(picks){
    if(picks.length<5){for(const c of BRANCHES[picks.length].choices)visit([...picks,[c.id]]);return;}
    assert.equal(cleanState({picks,step:4,finished:true}).finished,true);
    assert.ok(mapWordCount(picks)<=60);
    const words=BRANCHES.map((b,i)=>branchWords(b,picks[i]).join(''));
    // 依使用者照片各段核對；不能讓任一組選詞省略這些閱讀重點。
    assert.match(words[0],/冷漠/);assert.match(words[0],/親切/);
    assert.match(words[0],/嘟嘟/);assert.match(words[0],/陪伴|愛/);
    for(const term of ['嘟嘟','訓','考','實習'])assert.ok(words[1].includes(term));
    assert.match(words[2],/病人/);assert.match(words[2],/安養院|長者/);
    assert.match(words[3],/解憂|孤單/);assert.match(words[3],/復健/);
    for(const term of ['每週六','奶奶','愛'])assert.ok(words[4].includes(term));
    total++;
  }
  visit([]);assert.equal(total,32);
});

test('愛的分享：得、長依語境選音，顯示符號不進入短詞或存檔',()=>{
  reading.READING_PHRASES.push(...LOVE_READINGS);
  const vs=String.fromCodePoint(0xE01E1);
  const text='變得親切、服務長者、重新、相處';
  const expected=`變得${vs}親切、服務長${vs}者、重${vs}新、相${vs}處`;
  assert.equal(reading.withReadingVariants(text),expected);
  assert.equal(reading.withReadingVariants(expected),expected);
  const before=JSON.stringify(BRANCHES),picks=full(),saved=JSON.stringify(picks);
  BRANCHES.forEach((b,i)=>branchWords(b,picks[i]).forEach(reading.withReadingVariants));
  assert.equal(JSON.stringify(picks),saved);assert.equal(JSON.stringify(BRANCHES),before);
});

test('愛的分享：文章索引有獨立入口，來源與部署成品同步',()=>{
  const registry=JSON.parse(readFileSync(new URL('../docs/registry.json',import.meta.url),'utf8'));
  assert.deepEqual(registry.mindMaps.find(a=>a.id==='love-sharing'),{id:'love-sharing',title:'愛的分享',date:'2026-09-29',path:'love-sharing-mind-map/'});
  for(const id of ['early-summer','leisure-afternoon'])assert.ok(registry.mindMaps.some(a=>a.id===id));
  execFileSync(process.execPath,['learning-tasks/love-sharing/build.mjs','--check'],{cwd:new URL('../',import.meta.url),stdio:'pipe'});
});
