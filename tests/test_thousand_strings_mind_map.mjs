import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import model from '../learning-tasks/thousand-strings/source/content.js';
import previous from '../learning-tasks/love-sharing/source/content.js';
import leisure from '../learning-tasks/leisure-afternoon/source/content.js';
import reading from '../docs/mind-map-reading.js';
const {TITLE,STORAGE_KEY,BRANCHES,STRINGS_READINGS,cleanState,branchWords,mapWordCount}=model;
const full=()=>BRANCHES.map(b=>[b.choices[0].id]);

test('一千根琴弦：各段核心都完成才能抄寫；回改與完成進度可還原',()=>{
  const picks=full();
  assert.deepEqual(cleanState({picks,step:4,finished:true}),{picks,step:4,finished:true});
  assert.equal(cleanState({picks,step:1,finished:false}).step,1);
  for(let i=0;i<5;i++){
    const incomplete=full();incomplete[i]=[];
    assert.deepEqual(cleanState({picks:incomplete,step:4,finished:true}),{picks:incomplete,step:i,finished:false});
  }
});

test('一千根琴弦：未知、重複與超量選詞被拒絕，前三篇存檔不混入',()=>{
  const [first,second]=BRANCHES[0].choices.map(c=>c.id);
  const state=cleanState({picks:[['unknown',first,first,second]],step:99,finished:true});
  assert.deepEqual(state.picks[0],[first]);assert.equal(state.step,1);assert.equal(state.finished,false);
  for(const key of [previous.STORAGE_KEY,leisure.STORAGE_KEY,'aiden_reading_mind_map_v1'])assert.notEqual(STORAGE_KEY,key);
  assert.deepEqual(cleanState({picks:previous.BRANCHES.map(b=>b.choices.map(c=>c.id)),finished:true}).picks,[[],[],[],[],[]]);
  for(const raw of [null,[],42,{step:-1},{picks:'bad',step:Infinity}])assert.equal(cleanState(raw).finished,false);
});

test('一千根琴弦：32 種選法保留白紙轉折、希望力量與運動邀請，不超過 60 字',()=>{
  assert.equal(TITLE,'一千根琴弦');
  let total=0;
  function visit(picks){
    if(picks.length<5){for(const c of BRANCHES[picks.length].choices)visit([...picks,[c.id]]);return;}
    assert.equal(cleanState({picks,step:4,finished:true}).finished,true);
    assert.ok(mapWordCount(picks)<=60);
    const words=BRANCHES.map((b,i)=>branchWords(b,picks[i]).join(''));
    // 獨立依據：家長提供課文的開頭、師徒故事、白紙轉折與老師最後的邀請。
    assert.match(words[0],/行動不便/);assert.match(words[0],/自卑|失去信心/);
    assert.match(words[1],/盲人/);assert.match(words[1],/賣藝/);assert.match(words[1],/練琴|練琴藝/);
    assert.match(words[2],/千/);assert.match(words[2],/斷/);assert.match(words[2],/弦/);assert.match(words[2],/光明|看見/);
    assert.match(words[3],/白紙|空白/);assert.match(words[3],/希望/);assert.match(words[3],/力量/);
    assert.match(words[4],/不放棄/);assert.match(words[4],/運動/);assert.match(words[4],/一起/);
    total++;
  }
  visit([]);assert.equal(total,32);
});

test('一千根琴弦：多音字依語境選音，畫面選音符號不進入存檔',()=>{
  reading.READING_PHRASES.push(...STRINGS_READINGS);
  const vs=String.fromCodePoint(0xE01E1);
  const text='彈斷千弦，重見光明，重新看見，彈琴，興趣，相依，磨難，處境，因為，為什麼，不倒下，老少，答應，變得，孩子';
  const expected=`彈${vs}斷千弦，重${vs}見光明，重${vs}新看見，彈${vs}琴，興${vs}趣，相${vs}依，磨難${vs}，處${vs}境，因為${vs}，為${vs}什麼，不倒${vs}下，老少${vs}，答${vs}應${vs}，變得${vs}，孩子${vs}`;
  assert.equal(reading.withReadingVariants(text),expected);
  assert.equal(reading.withReadingVariants(expected),expected);
  const before=JSON.stringify(BRANCHES),picks=full(),saved=JSON.stringify(picks);
  BRANCHES.forEach((b,i)=>branchWords(b,picks[i]).forEach(reading.withReadingVariants));
  assert.equal(JSON.stringify(picks),saved);assert.equal(JSON.stringify(BRANCHES),before);
});

test('一千根琴弦：獨立文章已登錄，前三篇保留，來源與部署成品同步',()=>{
  const registry=JSON.parse(readFileSync(new URL('../docs/registry.json',import.meta.url),'utf8'));
  assert.deepEqual(registry.mindMaps.find(a=>a.id==='thousand-strings'),{id:'thousand-strings',title:TITLE,date:'2026-10-06',path:'thousand-strings-mind-map/'});
  for(const id of ['early-summer','leisure-afternoon','love-sharing'])assert.ok(registry.mindMaps.some(a=>a.id===id));
  execFileSync(process.execPath,['learning-tasks/thousand-strings/build.mjs','--check'],{cwd:new URL('../',import.meta.url),stdio:'pipe'});
});
