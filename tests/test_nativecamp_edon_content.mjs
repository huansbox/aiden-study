import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import '../docs/nativecamp/core.js';

const core = globalThis.NativeCampCore;
const app = new URL('../docs/nativecamp/', import.meta.url);
const tasks = new URL('../learning-tasks/', import.meta.url);
const read = url => JSON.parse(readFileSync(url, 'utf8'));
const normalize = text => text.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const specs = [
  ['2026-09-14', ['grandparents', 'story-topic']],
  ['2026-09-16', ['family-roles', 'short-forms', 'opposites']],
];

for (const [id, concepts] of specs) {
  const source = read(new URL(`nativecamp-${id}/source/lesson-source.json`, tasks));
  const lesson = read(new URL(`lessons/${id}.json`, app));
  const jobs = read(new URL(`nativecamp-${id}/source/speech-jobs.json`, tasks));
  const manifest = read(new URL(`nativecamp-${id}/source/nativecamp-audio-manifest.json`, tasks));
  const speech = new Map(manifest.tts.map(item => [item.file, item]));
  test(`${id}: source, generated lesson, and speech jobs agree without changing old IDs`, () => {
    assert.equal(core.validateLesson(lesson), lesson);
    assert.deepEqual(lesson.concepts.map(c => c.id), concepts);
    assert.equal(lesson.id, id);
    assert.equal(lesson.date, id);
    const expected = structuredClone(source), expectedJobs = [];
    for (const concept of expected.concepts) for (const mode of ['try', 'say']) {
      assert.equal(concept[mode].length, 3);
      assert.equal(new Set(concept[mode].map(q => JSON.stringify(q.scene))).size, 3);
      for (const q of concept[mode]) {
        const spoken = q.spokenQuestion;
        delete q.spokenQuestion;
        q.audio = { question: `audio/${id}-${q.id}-q.mp3`, answer: `audio/${id}-${q.id}-a.mp3` };
        expectedJobs.push({ file: `${id}-${q.id}-q.mp3`, text: spoken }, { file: `${id}-${q.id}-a.mp3`, text: q.answerText });
        assert.ok(!normalize(spoken).includes(normalize(q.answerText)), `${q.id} speaks its completed answer`);
        if (mode === 'say') assert.ok(q.accepted.length > 0);
        else if (q.type === 'choice') assert.equal(q.choices.filter(c => c.id === q.answer).length, 1);
        else {
          const tokens = new Map(q.tokens.map(t => [t.id, t.text]));
          assert.ok(q.acceptedOrders.some(order => normalize(order.map(k => tokens.get(k)).join(' ')) === normalize(q.answerText)));
        }
      }
    }
    assert.deepEqual(lesson, expected);
    assert.deepEqual(jobs, expectedJobs);
    assert.ok(!/[\u3400-\u9fff]|\p{Extended_Pictographic}/u.test(JSON.stringify(lesson)));
    assert.ok(!/https?:|chat_hash|base64|source\/private|\.webm/.test(JSON.stringify(lesson)));
  });

  test(`${id}: every dated public recording matches its verified production text`, () => {
    assert.equal(speech.size, concepts.length * 12);
    assert.equal(jobs.length, speech.size);
    for (const job of jobs) {
      assert.ok(job.file.startsWith(id + '-'));
      const ref = 'audio/' + job.file, entry = speech.get(ref);
      assert.ok(entry, ref);
      assert.equal(entry.text, job.text);
      const bytes = readFileSync(new URL(ref, app));
      assert.equal(bytes.length, entry.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
      assert.equal(entry.codec, 'mp3');
      assert.equal(entry.decode, 'passed');
      assert.ok(entry.durationSeconds >= 0.4 && entry.rmsDbfs > -60);
    }
  });
}

test('new family relations, opposites, and contractions have consistent, closed answers', () => {
  const relations = new Map([
    ["Mum's mum", 'grandmother'], ["Dad's mum", 'grandmother'],
    ["Mum's dad", 'grandfather'], ["Dad's dad", 'grandfather'],
    ["Mum's mum and dad", 'grandparents'], ["Dad's mum and dad", 'grandparents'],
    ["Mum's brother", 'uncle'], ["Dad's brother", 'uncle'],
    ["Mum's sister", 'aunt'], ["Dad's sister", 'aunt'],
    ["Aunt's son", 'cousin'], ["Uncle's daughter", 'cousin'],
  ]);
  const opposites = { old: 'young', young: 'old', hot: 'cold', cold: 'hot', big: 'small', small: 'big' };
  for (const [id] of specs) {
    const lesson = read(new URL(`lessons/${id}.json`, app));
    for (const c of lesson.concepts) for (const q of [...c.try, ...c.say]) {
      if (q.scene.kind === 'family-link') {
        const role = relations.get(q.scene.relation);
        assert.ok(role);
        assert.ok(q.answerText.endsWith(`my ${role}.`));
        assert.ok(!q.instruction.includes(role));
        if (q.type === 'choice') assert.equal(q.choices.find(x => x.id === q.answer).text, role);
      } else if (c.id === 'opposites') {
        const answer = opposites[q.scene.text];
        assert.ok(q.answerText.toLowerCase().startsWith(answer + ' '));
        assert.ok(!q.instruction.toLowerCase().includes(answer));
      } else if (c.id === 'short-forms') {
        assert.equal(q.answerText.replace(/^I'm /, 'I am ').replace(/^He's /, 'He is '), q.scene.text);
        assert.ok(!q.instruction.includes("I'm") && !q.instruction.includes("He's"));
      }
    }
  }
});

test('public audio directory contains exactly the three lesson manifests', () => {
  const manifests = [read(new URL('nativecamp-review-pilot/source/nativecamp-audio-manifest.json', tasks)),
    ...specs.map(([id]) => read(new URL(`nativecamp-${id}/source/nativecamp-audio-manifest.json`, tasks)))];
  const files = manifests.flatMap(m => m.tts.map(x => x.file.slice(6)));
  assert.equal(new Set(files).size, files.length, 'A new lesson must not replace an older lesson recording');
  assert.deepEqual(readdirSync(new URL('audio/', app)).sort(), files.sort());
});
