import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import '../docs/nativecamp/core.js';

const root = new URL('../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const ids = ['2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-12-mel', '2026-09-13', '2026-09-17', 'weekly-2026-09-14'];
const C = globalThis.NativeCampCore;
const normalized = text => text.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

test('[source] revised questions accept natural alternatives and do not speak tested grammar', () => {
  const source = id => read(`learning-tasks/nativecamp-${id}/source/lesson-source.json`);
  const concept = (id, name) => source(id).concepts.find(c => c.id === name).tryRevision.questions;
  for (const name of ['season-actions', 'story-weather', 'activity-places']) {
    for (const q of concept('2026-09-13', name).slice(0, 2)) {
      const words = new Map(q.tokens.map(t => [t.id, t.text]));
      const order = q.acceptedOrders[0], start = order.findIndex(key => ['in', 'at'].includes(words.get(key)));
      assert.equal(C.checkAnswer(q, [...order.slice(start), ...order.slice(0, start)]), true);
    }
  }
  for (const [id, name] of [['2026-09-13', 'list-commas'], ['weekly-2026-09-14', 'week-list-commas']]) {
    const q = concept(id, name)[1], order = [...q.acceptedOrders[0]];
    const tokens = new Map(q.tokens.map(t => [t.id, t.text]));
    const beforeAnd = order.findIndex(key => tokens.get(key) === 'and') - 1;
    order[beforeAnd] = q.tokens.find(t => t.text === tokens.get(order[beforeAnd]).replace(/,$/, '')).id;
    assert.equal(C.checkAnswer(q, order), true);
  }
  assert.doesNotMatch(concept('2026-09-09', 'daily-routines')[2].spokenQuestion, /in the morning/i);
  for (const q of concept('2026-09-10', 'pretend-animal')) assert.doesNotMatch(q.spokenQuestion, /\b(?:an orangutan|a frog|an octopus)\b/i);
});

for (const id of ids) {
  test(`[source] ${id}: revised closed sentence practice has build, change and one-word repair`, () => {
    const source = read(`learning-tasks/nativecamp-${id}/source/lesson-source.json`);
    const lesson = read(`docs/nativecamp/lessons/${id}.json`);
    C.validateLesson(lesson);
    const expected = structuredClone(source), expectedJobs = [];
    for (const concept of expected.concepts) {
      assert.equal(concept.tryRevision.id, 'variety-v1');
      const revised = concept.tryRevision.questions;
      assert.deepEqual(revised.map(q => q.stage), ['build', 'change', 'fix']);
      assert.deepEqual(revised.map(q => q.type), ['order', 'order', 'repair']);
      assert.equal(new Set(revised.map(q => JSON.stringify(q.scene))).size, 3);
      for (const [index, q] of revised.entries()) {
        assert.equal(q.id, `${concept.id}-v2-try-${index + 1}`);
        assert.ok(!normalized(q.spokenQuestion).includes(normalized(q.answerText)), `${q.id} speaks its answer`);
        assert.ok(!normalized(JSON.stringify(q.scene)).includes(normalized(q.answerText)), `${q.id} displays its answer`);
        assert.doesNotMatch(JSON.stringify(q), /[\u3400-\u9fff]|\p{Extended_Pictographic}|https?:|chat_hash|base64|source[\\/]private|\.webm/u);
        if (q.type === 'order') {
          const tokens = new Map(q.tokens.map(t => [t.id, t.text]));
          for (const order of q.acceptedOrders) {
            assert.equal(C.checkAnswer(q, order), true);
            assert.ok(q.tokens.length - order.length >= 1 && q.tokens.length - order.length <= 2);
            for (let a = 0; a < order.length; a++) for (let b = a + 1; b < order.length; b++) {
              if (tokens.get(order[a]) !== tokens.get(order[b])) continue;
              const swapped = [...order]; [swapped[a], swapped[b]] = [swapped[b], swapped[a]];
              assert.equal(C.checkAnswer(q, swapped), true, `${q.id} rejects identical cards`);
            }
          }
          assert.ok(q.acceptedOrders.some(order => normalized(order.map(key => tokens.get(key)).join(' ')) === normalized(q.answerText)));
        } else {
          assert.equal(C.checkAnswer(q, q.answer), true);
          for (const word of q.sentence) for (const choice of q.choices) {
            assert.equal(C.checkAnswer(q, { wordId: word.id, choiceId: choice.id }), word.id === q.answer.wordId && choice.id === q.answer.choiceId);
          }
        }
      }
      for (const q of [...concept.try, ...concept.say, ...revised]) {
        const spoken = q.spokenQuestion; delete q.spokenQuestion;
        q.audio = { question: `audio/${id}-${q.id}-q.mp3`, answer: `audio/${id}-${q.id}-a.mp3` };
        expectedJobs.push({ file: `${id}-${q.id}-q.mp3`, text: spoken }, { file: `${id}-${q.id}-a.mp3`, text: q.answerText });
      }
    }
    assert.deepEqual(lesson, expected);
    assert.deepEqual(read(`learning-tasks/nativecamp-${id}/source/speech-jobs.json`), expectedJobs);
  });

  test(`[audio] ${id}: both versions and Say retain complete verified normal-speed audio`, () => {
    const jobs = read(`learning-tasks/nativecamp-${id}/source/speech-jobs.json`);
    const manifest = read(`learning-tasks/nativecamp-${id}/source/nativecamp-audio-manifest.json`);
    assert.equal(manifest.status, 'complete');
    const entries = new Map(manifest.tts.map(row => [row.file, row]));
    assert.equal(entries.size, jobs.length);
    for (const job of jobs) {
      const row = entries.get(`audio/${job.file}`); assert.ok(row, job.file);
      assert.equal(row.text, job.text);
      assert.equal(row.settings.speed, 1);
      assert.equal(row.voice, manifest.voice.name);
      assert.equal(row.decode, 'passed');
      assert.ok(row.durationSeconds >= .4 && row.rmsDbfs > -60);
      const bytes = readFileSync(new URL(`docs/nativecamp/audio/${job.file}`, root));
      assert.equal(bytes.length, row.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256);
    }
  });
}
