import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const M=require('../learning-tasks/water-cycle/source/prototype/model.js');
function advance(rain,ms){const events=[];for(let t=0;t<ms;t+=50)events.push(...M.tickRain(rain,Math.min(50,ms-t)));return events;}
const water=rain=>[...rain.drops,...rain.landed].reduce((sum,d)=>sum+d.volume,0);
function merge(rain,a,b){assert.equal(M.beginMerge(rain,a,b),true);advance(rain,1800);return rain.drops.find(d=>d.id==='d'+(rain.nextId-1));}

test('warm air stays invisible; cooling gives a bird-response interval before droplets and cloud',()=>{
  const w=M.createWind();
  for(const [x,y]of[[320,400],[500,460],[620,520]]){M.moveWind(w,x,y);M.tickWind(w,12000);assert.equal(w.phase,'air');assert.equal(w.coldMs,0);}
  assert.deepEqual(M.moveWind(w,850,300),['cool']);
  M.tickWind(w,1000);assert.equal(w.phase,'air','cold reaction must precede visible liquid');
  M.tickWind(w,3800);assert.equal(w.phase,'droplets');
  M.tickWind(w,1700);assert.equal(w.phase,'cloud');
});

test('returning to warm air cancels unfinished cooling, and multiple cool locations work',()=>{
  for(const [x,y]of[[750,470],[1000,200],[600,220]]){
    const w=M.createWind();M.moveWind(w,x,y);M.tickWind(w,2200);
    M.moveWind(w,450,460);M.tickWind(w,10000);assert.equal(w.phase,'air');
    M.moveWind(w,x,y);M.tickWind(w,1000);assert.equal(w.phase,'air','old cooling time must not carry across warm air');
    M.tickWind(w,3800);assert.equal(w.phase,'droplets');
  }
});

test('touching has a visible contact interval, produces one larger drop, and preserves water',()=>{
  const r=M.createRain(),total=water(r);
  assert.equal(M.beginMerge(r,'d1','d2'),true);
  advance(r,400);assert.equal(r.drops.length,8);assert.equal(r.drops.filter(d=>d.hero).length,1);
  advance(r,250);assert.equal(r.drops.length,7);
  const d=r.drops.find(d=>d.hero);assert.equal(d.volume,2);assert.equal(d.status,'growing');
  assert.equal(water(r),total);advance(r,1200);assert.equal(d.status,'floating');assert.equal(r.landed.length,0);
});

test('same number of joins can stay afloat or fall depending on water volume',()=>{
  const small=M.createRain(),large=M.createRain();
  merge(small,'d1','d2');merge(large,'d3','d5');
  advance(small,2500);advance(large,2500);
  assert.equal(small.landed.length,0);assert.equal(large.landed.length,1);
  assert.equal(large.landed[0].volume,4);assert.equal(large.landed[0].hero,false);
  assert.equal(large.drops.find(d=>d.hero).volume,1,'ordinary rain must leave the star character small in the cloud');
});

test('different merge orders preserve one star, one face carrier, and total volume through falling',()=>{
  for(const order of [['d1','d2','d3'],['d3','d2','d1']]){
    const r=M.createRain(),total=water(r);const first=merge(r,order[0],order[1]);
    const grown=merge(r,first.id,order[2]);assert.equal(grown.volume,4);assert.equal(grown.hero,true);
    assert.equal([...r.drops,...r.landed].filter(d=>d.hero).length,1);
    advance(r,2500);assert.equal(r.heroLanded,true);assert.equal(r.landed.filter(d=>d.hero).length,1);assert.equal(water(r),total);
  }
});

test('only the two selected available drops merge; repeated requests cannot spend the same water',()=>{
  const r=M.createRain();M.beginMerge(r,'d1','d2');
  assert.equal(M.beginMerge(r,'d1','d3'),false);assert.equal(M.beginMerge(r,'d4','d4'),false);
  assert.equal(M.beginMerge(r,'d3','d5'),true);advance(r,4000);
  assert.equal(water(r),12);assert.equal(r.drops.find(d=>d.hero).volume,2);
});

test('free page changes retain independent states; replay replaces only the current scene',()=>{
  const s=M.createSession();M.setScene(s,4);assert.equal(s.rain.drops.length,8,'skipping cooling must still give a playable cloud');
  merge(s.rain,'d1','d2');const rain=s.rain;
  M.setScene(s,3);M.moveWind(s.wind,850,300);M.tickWind(s.wind,4800);M.tickWind(s.wind,1700);
  M.setScene(s,4);assert.equal(s.rain,rain);assert.equal(s.rain.drops.find(d=>d.hero).volume,2);
  M.replayScene(s);assert.equal(s.rain.drops.find(d=>d.hero).volume,1);assert.equal(s.wind.phase,'cloud');
  M.setScene(s,3);M.replayScene(s);assert.equal(s.wind.phase,'air');assert.equal(s.rain.drops.length,8);
});

test('drag collision chooses a nearby available friend; moving through empty cloud is not a merge',()=>{
  const r=M.createRain();M.moveDrop(r,'d1',570,350);assert.equal(M.collision(r,'d1'),null);
  M.moveDrop(r,'d1',370,210);assert.equal(M.collision(r,'d1'),'d2');
  M.beginMerge(r,'d1','d2');assert.equal(M.moveDrop(r,'d1',800,200),false);
});

test('warm route feedback waits for a deliberate destination, never the start of a drag',()=>{
  const w=M.createWind();
  assert.deepEqual(M.moveWind(w,470,420),[]);
  assert.deepEqual(M.moveWind(w,650,420),[]);
  assert.deepEqual(M.moveWind(w,850,300),['cool']);
  assert.deepEqual(M.settleWind(w),[],'a successful cool route must not receive warm-route advice');
  M.moveWind(w,460,420);
  assert.deepEqual(M.settleWind(w),['warm']);
  assert.deepEqual(M.settleWind(w),[],'a held destination need not repeat the same advice');
});

test('cold reaction cannot condense before the local sentence or while delayed playback is unfinished',()=>{
  const w=M.createWind();M.moveWind(w,850,300);
  M.tickWind(w,4550);assert.equal(w.phase,'air','the 4.55s recording must have time to finish');
  M.tickWind(w,2000,false);assert.equal(w.phase,'air','late playback keeps the bird cold and water invisible');
  assert.deepEqual(M.tickWind(w,1,true),['condense']);
});

test('two oversized ordinary raindrops leave enough selectable water for the star and continued free play',()=>{
  const r=M.createRain();
  const first=merge(r,'d3','d2');merge(r,first.id,'d5');advance(r,2500);
  const second=merge(r,'d7','d4');merge(r,second.id,'d8');const events=advance(r,2500);
  assert.equal(r.landed.length,2);assert.ok(r.landed.every(d=>d.volume===5&&!d.hero));
  assert.equal(r.drops.reduce((n,d)=>n+d.volume,0),4,'the star still has enough water to rain');
  assert.equal(r.drops.filter(d=>d.hero).length,1);
  assert.equal(r.addedVolume,2);assert.ok(events.some(e=>e.type==='refill'));
  assert.ok(r.drops.every(d=>d.status==='floating'),'new water waits for a child choice');
  while(!r.heroLanded){
    const hero=r.drops.find(d=>d.hero),friend=r.drops.find(d=>d.id!==hero.id&&d.status==='floating');
    merge(r,hero.id,friend.id);advance(r,2500);
  }
  assert.equal([...r.drops,...r.landed].filter(d=>d.hero).length,1);
  assert.equal(r.drops.reduce((n,d)=>n+d.volume,0),4,'play continues after the reunion');
  assert.ok(r.drops.every(d=>!d.hero&&d.volume===1&&d.status==='floating'));
  assert.equal(water(r),12+r.addedVolume,'incoming water is explicit and merging does not create water');
  advance(r,15000);assert.equal(r.landed.length,3,'refills never start an automatic rain loop');
});

test('simultaneous departures replenish only the water needed by remaining small drops',()=>{
  const r=M.createRain();
  M.beginMerge(r,'d3','d5');M.beginMerge(r,'d7','d8');
  advance(r,4000);assert.equal(r.addedVolume,0,'four small drops already remain');
  merge(r,'d1','d2');merge(r,'d4','d6');
  const a=r.drops.find(d=>d.hero),b=r.drops.find(d=>!d.hero);
  M.beginMerge(r,a.id,b.id);advance(r,4000);
  assert.equal(r.addedVolume,4);assert.equal(r.drops.length,4);
  assert.equal(new Set([...r.drops,...r.landed].map(d=>d.id)).size,r.drops.length+r.landed.length);
});

test('small guidance is tied to completed small growth, and revisits describe the star state',()=>{
  const r=M.createRain();assert.equal(M.rainIntro(r,false),'skip4');assert.equal(M.rainIntro(r,true),'intro4');
  M.beginMerge(r,'d3','d2');const normalEvents=advance(r,1800);
  assert.ok(normalEvents.some(e=>e.type==='small'&&!e.hero));
  assert.equal(M.rainIntro(r,false),'skip4','a friend growing does not claim the star has grown');
  M.beginMerge(r,'d1','d4');const heroEvents=advance(r,1800);
  assert.equal(heroEvents.filter(e=>e.type==='small'&&e.hero).length,1);
  assert.equal(M.rainIntro(r,false),'small');
  assert.equal(advance(r,4000).filter(e=>e.type==='small').length,0,'idle floating does not keep giving advice');
});

test('ordinary simultaneous rain and replenishment cannot cut the fall-to-reunion story',()=>{
  const voice=M.createNarration();
  assert.equal(M.requestNarration(voice,'heroFall'),'heroFall');
  for(const id of ['normalFall','rain','small','merge'])assert.equal(M.requestNarration(voice,id),null);
  M.requestNarration(voice,'refill');M.requestNarration(voice,'reunion');M.requestNarration(voice,'rain');
  assert.equal(M.finishNarration(voice),'reunion');
  M.requestNarration(voice,'rain');M.requestNarration(voice,'refill');
  assert.equal(M.finishNarration(voice),'refill');assert.equal(M.finishNarration(voice),null);
});

test('small feedback follows the full first merge sentence; a new fall replaces obsolete growth advice',()=>{
  const voice=M.createNarration();
  M.requestNarration(voice,'merge');assert.equal(M.requestNarration(voice,'small'),null);
  assert.equal(M.finishNarration(voice),'small');
  M.requestNarration(voice,'merge');M.requestNarration(voice,'small');
  assert.equal(M.requestNarration(voice,'heroFall'),'heroFall');
  assert.equal(M.finishNarration(voice),null,'do not replay the previous small-drop advice after rain');
});

test('page, replay and hidden lifecycle resets discard every pending sentence',()=>{
  for(const active of ['cool','heroFall','reunion']){
    const voice=M.createNarration();M.requestNarration(voice,active);M.requestNarration(voice,'refill');M.requestNarration(voice,'reunion');
    M.clearNarration(voice);assert.equal(M.finishNarration(voice),null);
    assert.equal(M.requestNarration(voice,'skip4'),'skip4');assert.deepEqual(voice.pending,[]);
  }
});
