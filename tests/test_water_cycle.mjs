import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { newExperiment, act, canGrowHail, snowAtGround } from '../learning-tasks/water-cycle/source/model.mjs';
import { sceneArt } from '../learning-tasks/water-cycle/source/art.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(repo, 'learning-tasks/water-cycle/source');
const task = path.dirname(source);
const output = path.join(repo, 'docs/water-cycle');
const content = JSON.parse(await readFile(path.join(source,'content.json'),'utf8'));
const run = (scene, actions) => actions.reduce(act,newExperiment(scene));

test('puddle observation precedes the invisible-water explanation; reset restores the puddle', () => {
  assert.equal(run('evap',['look']).reveal,false);
  const later = run('evap',['time']);
  assert.equal(later.time,true);
  assert.equal(later.complete,false);
  const found = act(later,'look');
  assert.equal(found.complete,true);
  assert.equal(found.cue,'evap-result');
  assert.equal(newExperiment('evap').time,false);
});

test('cloud formation alone gives no falling rain; drops grow before rain reaches ground', () => {
  const cloud = run('cloud',['cool']);
  assert.equal(cloud.cooled,true);
  assert.match(sceneArt(cloud,true),/No rain yet/);
  assert.doesNotMatch(sceneArt(cloud,true),/class="fall"/);
  let rain = newExperiment('rain');
  assert.equal(rain.complete,false);
  rain=act(rain,'grow');
  assert.equal(rain.complete,false);
  rain=act(rain,'grow');
  assert.equal(rain.complete,false);
  rain=act(rain,'grow');
  assert.equal(rain.complete,true);
  assert.match(sceneArt(rain,true),/Rain reaches the ground/);
  assert.equal(act(rain,'grow').drops,3);
});

test('NWS warm-layer comparison: snow survives cold air and fully melts in a thick warm layer', () => {
  assert.equal(snowAtGround(null),null);
  assert.equal(snowAtGround('cold'),'snow');
  assert.equal(snowAtGround('warm'),'rain');
  assert.match(sceneArt(newExperiment('snow')),/下方空氣尚未選擇/);
  assert.doesNotMatch(sceneArt(newExperiment('snow')),/通過冷空氣|>冷空氣<|translate\(395 225\)|translate\(395 330\)/);
  assert.match(sceneArt(newExperiment('snow'),true),/air below has not been chosen/);
  const cold = run('snow',['cold']);
  const warm = act(cold,'warm');
  assert.equal(warm.air,'warm');
  assert.match(sceneArt(warm,true),/Rain below/);
  assert.equal(act(warm,'cold').cue,'snow-cold');
  assert.match(content.voices['zh-snow-intro'],/冰晶/);
  assert.match(content.voices['zh-snow-warm'],/完全融化/);
});

test('NOAA hail model requires both updraft and supercooled liquid drops, in either order', () => {
  for (const [wind,water,expected] of [[false,false,false],[true,false,false],[false,true,false],[true,true,true]]) {
    assert.equal(canGrowHail({wind,water}),expected);
    const state=run('hail',[...(wind?['wind']:[]),...(water?['water']:[]),'test']);
    assert.equal(state.hail,expected);
    assert.equal(state.complete,expected);
    assert.equal(state.cue,expected?'hail-result':'hail-missing');
  }
  const grown=run('hail',['water','wind','test']);
  assert.equal(grown.hail,true);
  assert.equal(act(grown,'wind').hail,false);
  assert.equal(act(act(grown,'water'),'test').complete,false);
  assert.equal(run('hail',['wind','water']).cue,'hail-ready');
  assert.equal(run('hail',['water','wind']).cue,'hail-ready');
});

test('advanced evaporation makes a prediction while keeping the comparison conditions fixed', () => {
  assert.equal(run('evap',['compare']).compareStarted,false);
  const setup=run('evap',['time','look','compare']);
  assert.equal(setup.comparePrediction,null);
  assert.equal(setup.cue,'evap-compare-intro');
  const prediction=act(setup,'cooler');
  assert.equal(prediction.comparePrediction,'cooler');
  assert.equal(prediction.cue,'evap-compare-result');
  assert.match(sceneArt(prediction,true),/Same time · Same start · Same air and wind/);
  assert.match(sceneArt(prediction,true),/More water lost/);
  assert.match(sceneArt(prediction,true),/Not a measurement/);
  assert.equal(act(prediction,'compare').comparePrediction,null);
  assert.equal(newExperiment('evap').compareStarted,false);
});

test('advanced hail comparisons retain all four actual trials; changing conditions does not rewrite past results', () => {
  let s=run('hail',['test','wind','test','water','test','wind','test']);
  assert.deepEqual(s.hailTrials,{'00':false,'10':false,'11':true,'01':false});
  const previous=s;
  s=act(s,'water');
  assert.deepEqual(s.hailTrials,previous.hailTrials);
  assert.notEqual(s.hailTrials,previous.hailTrials);
  assert.deepEqual(newExperiment('hail').hailTrials,{});
});

test('ground routes can be compared in any order, and no fixed circle is required', () => {
  const river=run('ground',['river']);
  assert.equal(river.complete,true);
  const soil=act(river,'soil');
  assert.equal(soil.path,'soil');
  assert.equal(river.path,'river'); // previous trial was not mutated
  const lake=act(soil,'lake');
  assert.deepEqual(lake.paths,['river','soil','lake']);
  assert.equal(act(lake,'river').paths.length,3);
  assert.equal(newExperiment('ground').path,null);
  assert.deepEqual(newExperiment('ground').paths,[]);
});

test('each story can finish; every reachable narration exists in both languages with a prepared MP3', async () => {
  const trials={evap:['time','look','compare','cooler','warmer'],cloud:['cool'],rain:['grow','grow','grow'],snow:['cold','warm'],hail:['test','wind','test','water','test','wind','test'],ground:['river','soil','lake']};
  const cues=new Set(['review']);
  for(const [scene,actions] of Object.entries(trials)){
    let state=newExperiment(scene);cues.add(state.cue);
    for(const action of actions){state=act(state,action);cues.add(state.cue);}
    assert.ok(scene==='hail'||state.complete);
  }
  for(const lang of ['zh','en']){
    const jobs=JSON.parse(await readFile(path.join(source,`speech-${lang}.json`),'utf8'));
    assert.deepEqual(jobs,Object.entries(content.voices).filter(([id])=>id.startsWith(`${lang}-`)).map(([id,text])=>({file:`${id}.mp3`,text})));
    for(const cue of cues){
      assert.ok(content.voices[`${lang}-${cue}`],`${lang}-${cue}`);
      assert.ok((await readFile(path.join(task,`assets/audio/${lang}-${cue}.mp3`))).length>1000);
    }
  }
  for(const scene of content.scenes) for(const action of scene.actions) assert.ok(content.voices[`zh-${action.voice}`]);
  for(const scene of content.scenes) for(const action of scene.advanced?.actions||[]) assert.ok(content.voices[`zh-${action.voice}`]);
  for(const control of ['home','start','explore','replay','pause','slow','back','next','reset','restart','home-control','help','map','finish','audio-error']) assert.ok(content.voices[`zh-${control}`]);
});

test('a fresh mode or replay has independent state and does not inherit hail, precipitation or routes', () => {
  const first=run('hail',['wind','water','test']);
  const fresh=newExperiment('hail');
  assert.equal(first.hail,true);assert.equal(fresh.hail,false);
  assert.equal(fresh.wind,false);assert.equal(fresh.water,false);
  assert.equal(fresh.complete,false);
  const water=run('ground',['soil']);
  const next=newExperiment('ground');
  water.paths.push('lake');assert.deepEqual(next.paths,[]);
});

test('public files and every binary asset are byte-identical to their editable source', async () => {
  for(const name of ['index.html','style.css','app.mjs','model.mjs','art.mjs','content.json']) assert.deepEqual(await readFile(path.join(output,name)),await readFile(path.join(source,name)),name);
  async function checkAssets(relative=''){
    const entries=await readdir(path.join(task,'assets',relative),{withFileTypes:true});
    for(const entry of entries){if(entry.name.startsWith('.')||entry.name.endsWith('.part'))continue;const key=path.join(relative,entry.name);if(entry.isDirectory()) await checkAssets(key);else assert.deepEqual(await readFile(path.join(task,'assets',key)),await readFile(path.join(output,'assets',key)),key);}
  }
  await checkAssets();
});
