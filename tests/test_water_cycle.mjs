import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { newScene, interact } from '../learning-tasks/water-cycle/source/model.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(repo,'learning-tasks/water-cycle/source'), task=path.dirname(source), output=path.join(repo,'docs/water-cycle');
const content=JSON.parse(await readFile(path.join(source,'content.json'),'utf8'));
const run=(id,actions)=>actions.reduce(interact,newScene(id));

test('sunshine makes the puddle smaller over repeated visits; fresh pages restore it',()=>{
  const start=newScene('pond'), first=interact(start,'sun'), again=interact(first,'sun');
  assert.ok(first.puddle<start.puddle);assert.ok(again.puddle<first.puddle);
  assert.ok(run('pond',Array(20).fill('sun')).puddle>0,'Some visible water remains for continued play.');
  assert.equal(start.puddle,1);assert.equal(newScene('pond').puddle,1);
  assert.equal(interact(first,'puddle').puddle,first.puddle,'Ripple play does not evaporate more water.');
});

test('looking inside a cloud reveals drops without making rain; drops join in a separate rain scene',()=>{
  const cloud=run('clouds',['cloud']);
  assert.equal(cloud.cloud,true);assert.equal(cloud.rain,false);
  const rain=run('rain',['merge']);
  assert.equal(rain.rain,true);
  assert.equal(interact(rain,'leaf').rain,true,'Leaves can play while the rain outcome is retained.');
  assert.equal(newScene('rain').rain,false);
});

test('snow can fall, be caught and melt on a warm mitten, then be played again',()=>{
  const fallen=run('snow',['snowflake']),caught=interact(fallen,'mitten');
  assert.ok(caught.snow>fallen.snow);
  const melted=interact(caught,'warm');assert.equal(melted.melted,true);
  const more=interact(melted,'snowflake');assert.equal(more.melted,true);assert.equal(interact(more,'mitten').melted,false);
  assert.ok(more.snow>caught.snow);
});

test('a hail story first holds ice in the cloud, then grows it, then lets it fall; it can repeat',()=>{
  const first=run('storm',['ice']);assert.ok(first.ice>0);assert.equal(first.falling,false);
  const grown=interact(first,'ice');assert.ok(grown.ice>first.ice);assert.equal(grown.falling,false);
  const fallen=interact(grown,'ice');assert.equal(fallen.falling,true);assert.equal(fallen.ice,grown.ice);assert.equal(fallen.landed,true);assert.equal(interact(grown,'ice-up').falling,false);assert.equal(interact(grown,'ice-up').ice,grown.ice);assert.equal(interact(grown,'ice-down').falling,true);
  assert.equal(interact(fallen,'ice').falling,false);
  assert.equal(newScene('storm').ice,0);
});

test('water can choose any ground route, repeat it or change routes without a required cycle',()=>{
  for(const route of ['soil','pool','river']) assert.equal(run('river',[route]).path,route);
  const all=run('river',['pool','soil','river','pool']);
  assert.equal(all.path,'pool');assert.deepEqual(all.paths,['pool','soil','river']);
  const previous=run('river',['soil']);interact(previous,'pool');assert.deepEqual(previous.paths,['soil']);
  assert.deepEqual(newScene('river').paths,[]);
});

test('all reachable story lines have matching prepared bilingual jobs and real audio assets',async()=>{
  const cues=new Set(['ending']);
  const actions={pond:['sun','puddle'],clouds:['cloud'],rain:['merge','leaf'],snow:['snowflake','mitten','warm'],storm:['ice','ice','ice'],river:['river','soil','pool']};
  for(const page of content.pages){
    let s=newScene(page.id);cues.add(s.cue);
    for(const action of actions[page.id]){s=interact(s,action);cues.add(s.cue);}
    assert.ok(page.parent.length>20);
    const image=await readFile(path.join(task,'assets/story',page.background+'.png'));
    assert.equal(image.subarray(1,4).toString(),'PNG');
  }
  for(const lang of ['zh','en']){
    const jobs=JSON.parse(await readFile(path.join(source,'speech-'+lang+'.json'),'utf8'));
    assert.deepEqual(jobs,Object.entries(content.voices).filter(([id])=>id.startsWith(lang+'-book-')).map(([id,text])=>({file:id+'.mp3',text})));
    assert.equal(jobs.length,cues.size);
    for(const cue of cues){
      const id=lang+'-book-'+cue;assert.ok(content.voices[id],id);
      assert.ok((await readFile(path.join(task,'assets/audio',id+'.mp3'))).length>1000,id);
    }
  }
});

test('public files and binary assets match editable sources byte for byte',async()=>{
  for(const name of ['index.html','style.css','app.mjs','model.mjs','art.mjs','content.json'])assert.deepEqual(await readFile(path.join(output,name)),await readFile(path.join(source,name)),name);
  async function visit(relative=''){
    for(const entry of await readdir(path.join(task,'assets',relative),{withFileTypes:true})){
      if(entry.name.startsWith('.')||entry.name.endsWith('.part'))continue;
      const key=path.join(relative,entry.name);
      if(entry.isDirectory())await visit(key);else assert.deepEqual(await readFile(path.join(task,'assets',key)),await readFile(path.join(output,'assets',key)),key);
    }
  }await visit();
});
