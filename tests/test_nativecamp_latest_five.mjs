import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import '../docs/nativecamp/core.js';
const C=globalThis.NativeCampCore;
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const norm=s=>s.toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
const specs=[['2026-09-22','Edon','cedar'],['2026-09-23','Bianca','marin'],['2026-09-24','Mia','cedar'],['2026-09-25','Edon','marin'],['2026-09-26','Danielle','cedar']];
for(const [id,teacher,voice] of specs){
 test(`${id}: new full-sentence practice is closed, English-only and natively staged`,()=>{
  const source=read(`learning-tasks/nativecamp-${id}/source/lesson-source.json`);
  const lesson=read(`docs/nativecamp/lessons/${id}.json`);
  C.validateLesson(lesson);
  assert.equal(source.id,id);assert.equal(source.date,id);
  assert.equal(read('docs/nativecamp/lessons/catalog.json').lessons.find(x=>x.id===id).teacher,teacher);
  assert.ok(read('learning-tasks/catalog.json').tasks.some(x=>x.id===`nativecamp-${id}`));
  const expected=structuredClone(source),jobs=[];
  for(const c of expected.concepts){
   assert.equal(c.tryRevision,undefined);
   assert.deepEqual(c.try.map(q=>[q.stage,q.type]),[['build','order'],['change','order'],['fix','repair']]);
   assert.notEqual(norm(c.try[0].answerText),norm(c.try[1].answerText));
   for(const mode of ['try','say']){
    assert.equal(c[mode].length,3);
    for(const q of c[mode]){
     assert.ok(norm(q.answerText).split(' ').length>=3,q.id+' needs a full answer');
     assert.ok(!norm(q.spokenQuestion).includes(norm(q.answerText)),q.id+' speaks its completed answer');
     if(q.type==='order'){
      const tokens=new Map(q.tokens.map(t=>[t.id,t.text]));
      assert.ok(q.tokens.every(t=>!/[\s]/.test(t.text)),q.id+' uses whole sentence chunks');
      assert.ok(q.acceptedOrders.some(order=>norm(order.map(x=>tokens.get(x)).join(' '))===norm(q.answerText)),q.id);
      const extras=q.tokens.length-q.acceptedOrders[0].length;
      assert.ok(extras>=1&&extras<=2,q.id+' distractor count');
     }else if(q.type==='repair'){
      const changed=q.sentence.map(t=>t.id===q.answer.wordId?q.choices.find(o=>o.id===q.answer.choiceId).text:t.text).join(' ');
      assert.equal(norm(changed),norm(q.answerText),q.id);
      assert.notEqual(norm(q.sentence.map(t=>t.text).join(' ')),norm(q.answerText),q.id+' is already correct');
     }else if(mode==='say'){
      assert.ok(q.accepted.length>0,q.id);
     }
     const spoken=q.spokenQuestion;delete q.spokenQuestion;
     q.audio={question:`audio/${id}-${q.id}-q.mp3`,answer:`audio/${id}-${q.id}-a.mp3`};
     jobs.push({file:`${id}-${q.id}-q.mp3`,text:spoken},{file:`${id}-${q.id}-a.mp3`,text:q.answerText});
    }
   }
  }
  assert.deepEqual(lesson,expected);
  assert.deepEqual(read(`learning-tasks/nativecamp-${id}/source/speech-jobs.json`),jobs);
  assert.doesNotMatch(JSON.stringify(lesson),/[\u3400-\u9fff]|\p{Extended_Pictographic}|chat_hash|base64|\.webm/u);
 });
 test(`${id}: every shipped question and answer has matching verified OpenAI audio`,()=>{
  const manifest=read(`learning-tasks/nativecamp-${id}/source/nativecamp-audio-manifest.json`);
  const jobs=read(`learning-tasks/nativecamp-${id}/source/speech-jobs.json`);
  assert.equal(manifest.status,'complete');assert.equal(manifest.voice.name,voice);
  const entries=new Map(manifest.tts.map(x=>[x.file,x]));assert.equal(entries.size,jobs.length);
  for(const job of jobs){
   const row=entries.get('audio/'+job.file);assert.ok(row,job.file);assert.equal(row.text,job.text);
   assert.equal(row.voice,voice);assert.equal(row.settings.speed,1);
   const bytes=readFileSync(new URL('../docs/nativecamp/'+row.file,import.meta.url));
   assert.equal(bytes.length,row.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);
   assert.equal(row.codec,'mp3');assert.equal(row.decode,'passed');assert.ok(row.durationSeconds>=0.4&&row.rmsDbfs>-60);
  }
  const asr=read(`learning-tasks/nativecamp-${id}/source/nativecamp-tts-asr.json`);
  assert.equal(asr.audioUploaded,false);assert.equal(asr.initialPrompt,null);
  assert.equal(asr.samples.length,jobs.length);
  for(const sample of asr.samples){assert.equal(sample.sha256,entries.get(sample.file).sha256);assert.equal(sample.expectedText,entries.get(sample.file).text);assert.ok(sample.recognizedText.trim());}
 });
 test(`${id}: independent Build and Change finish each new concept without forcing Fix`,()=>{
  const lesson=read(`docs/nativecamp/lessons/${id}.json`);let progress=C.createProgress();
  for(const c of lesson.concepts){for(const q of c.try.slice(0,2)){progress=C.submitTry(progress,lesson,'2026-09-26',c.id,q.id,q.acceptedOrders[0]).progress;}
   assert.equal(C.nextQuestion(progress,lesson,'try','2026-09-26',c.id),null);
  }
 });
}
