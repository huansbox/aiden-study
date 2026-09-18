import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import '../docs/nativecamp/core.js';

const root = new URL('../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const ids = ['2026-09-13', '2026-09-17', 'weekly-2026-09-14'];
const catalog = read('docs/nativecamp/lessons/catalog.json').lessons;
const normalized = text => text.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const sourceFor = id => read(`learning-tasks/nativecamp-${id}/source/lesson-source.json`);
const lessonFor = id => read(`docs/nativecamp/lessons/${id}.json`);
const questions = lesson => lesson.concepts.flatMap(c => [...c.try, ...c.say]);

for (const id of ids) {
  test(`${id}: complete original sentence questions and speech jobs agree`, () => {
    const source = sourceFor(id), lesson = lessonFor(id);
    const jobs = read(`learning-tasks/nativecamp-${id}/source/speech-jobs.json`);
    assert.equal(globalThis.NativeCampCore.validateLesson(lesson), lesson);
    assert.equal(catalog.filter(entry => entry.id === id).length, 1);
    assert.equal(new Set(questions(lesson).map(q => q.id)).size, questions(lesson).length);
    const expected = structuredClone(source), expectedJobs = [];
    for (const c of expected.concepts) for (const mode of ['try', 'say']) {
      assert.equal(c[mode].length, 3);
      assert.equal(new Set(c[mode].map(q => JSON.stringify(q.scene))).size, 3);
      for (const q of c[mode]) {
        const spoken = q.spokenQuestion;
        delete q.spokenQuestion;
        q.audio = { question: `audio/${id}-${q.id}-q.mp3`, answer: `audio/${id}-${q.id}-a.mp3` };
        expectedJobs.push({ file: `${id}-${q.id}-q.mp3`, text: spoken }, { file: `${id}-${q.id}-a.mp3`, text: q.answerText });
        assert.ok(!normalized(spoken).includes(normalized(q.answerText)), `${q.id} speaks the completed answer`);
        assert.ok(!/[\u3400-\u9fff]|\p{Extended_Pictographic}/u.test(JSON.stringify(q)));
        assert.ok(!/https?:|chat_hash|base64|source\/private|\.webm/.test(JSON.stringify(q)));
        if (mode === 'say') {
          assert.match(q.instruction, /full sentence/i);
          assert.ok(q.accepted.length > 0);
        } else if (q.type === 'order') {
          const tokens = new Map(q.tokens.map(t => [t.id, t.text]));
          assert.equal(tokens.size, q.tokens.length);
          assert.ok(q.acceptedOrders.some(order => normalized(order.map(key => tokens.get(key)).join(' ')) === normalized(q.answerText)));
          for (const order of q.acceptedOrders) {
            assert.equal(new Set(order).size, order.length);
            assert.ok(order.every(key => tokens.has(key)));
            assert.ok(q.tokens.length - order.length >= 1 && q.tokens.length - order.length <= 2);
          }
          // Identical word cards must be interchangeable without rejecting the same sentence.
          for (const order of q.acceptedOrders) for (let a = 0; a < order.length; a++) for (let b = a + 1; b < order.length; b++) {
            if (tokens.get(order[a]) !== tokens.get(order[b])) continue;
            const swapped = [...order]; [swapped[a], swapped[b]] = [swapped[b], swapped[a]];
            assert.ok(q.acceptedOrders.some(answer => JSON.stringify(answer) === JSON.stringify(swapped)), `${q.id} rejects identical word cards`);
          }
        } else {
          assert.equal(q.type, 'choice');
          assert.equal(q.choices.filter(choice => choice.id === q.answer).length, 1);
          assert.equal(q.choices.find(choice => choice.id === q.answer).text, q.answerText);
        }
      }
    }
    assert.deepEqual(lesson, expected);
    assert.deepEqual(jobs, expectedJobs);
    assert.equal(new Set(jobs.map(job => job.file)).size, jobs.length);
  });

  test(`${id}: official recordings match all authored questions and answers`, () => {
    const jobs = read(`learning-tasks/nativecamp-${id}/source/speech-jobs.json`);
    const manifest = read(`learning-tasks/nativecamp-${id}/source/nativecamp-audio-manifest.json`);
    const speech = new Map(manifest.tts.map(item => [item.file, item]));
    assert.equal(speech.size, jobs.length);
    for (const job of jobs) {
      const entry = speech.get('audio/' + job.file);
      assert.ok(entry, job.file);
      assert.equal(entry.text, job.text);
      const bytes = readFileSync(new URL('docs/nativecamp/audio/' + job.file, root));
      assert.equal(bytes.length, entry.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
      assert.equal(entry.codec, 'mp3');
      assert.equal(entry.decode, 'passed');
      assert.ok(entry.durationSeconds >= 0.4 && entry.rmsDbfs > -60);
    }
  });
}

test('weekly candidates cover every current-week concept and only two supported earlier concepts', () => {
  const weekly = lessonFor('weekly-2026-09-14');
  assert.deepEqual(weekly.weekly, { weekStart: '2026-09-14', weekEnd: '2026-09-20', opensOn: '2026-09-20', conceptCount: 4, earlierCount: 1 });
  const references = new Set();
  for (const concept of weekly.concepts) {
    const ref = concept.sourceConcept, original = lessonFor(ref.lessonId);
    assert.equal(ref.date, original.date);
    assert.ok(ref.date <= weekly.weekly.weekEnd);
    assert.ok(original.concepts.some(c => c.id === ref.conceptId), JSON.stringify(ref));
    assert.ok(!references.has(`${ref.lessonId}/${ref.conceptId}`));
    references.add(`${ref.lessonId}/${ref.conceptId}`);
    const oldQuestions = new Set(questions(original).map(q => q.id));
    for (const q of [...concept.try, ...concept.say]) assert.ok(!oldQuestions.has(q.id));
  }
  for (const id of ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17']) {
    for (const c of lessonFor(id).concepts) assert.ok(references.has(`${id}/${c.id}`), `${id}/${c.id} cannot be prioritized`);
  }
  assert.deepEqual(weekly.concepts.filter(c => c.sourceConcept.date < weekly.weekly.weekStart).map(c => c.sourceConcept.conceptId).sort(), ['list-commas', 'season-actions']);
  assert.deepEqual(catalog.find(entry => entry.id === weekly.id).weekly, weekly.weekly);
});

test('new quantity, parity and capacity answers follow their visible evidence', () => {
  const numbers = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split(' ');
  for (const id of ['2026-09-17', 'weekly-2026-09-14']) for (const c of sourceFor(id).concepts) for (const q of [...c.try, ...c.say]) {
    if (c.id.includes('supplies-together')) {
      const match = q.scene.text.match(/^Mia: (\d+) (\w+)\. Leo: (\d+) \2\.$/);
      assert.ok(match);
      assert.equal(q.answerText, `They have ${numbers[Number(match[1]) + Number(match[3])]} ${match[2]}.`);
    } else if (c.id === 'week-odd-even') {
      assert.equal(q.answerText, `${numbers[q.scene.number][0].toUpperCase() + numbers[q.scene.number].slice(1)} is an ${q.scene.number % 2 ? 'odd' : 'even'} number.`);
    } else if (c.id === 'week-too-many') {
      const capacity = Number(q.scene.heading.match(/room for (\d+)/)[1]);
      assert.ok(q.scene.count > capacity);
      assert.equal(q.answerText, `There are too many ${q.scene.kind}.`);
    }
  }
});

test('season plans include counterexamples and list speaking does not grade spoken punctuation', () => {
  const michael = sourceFor('2026-09-13');
  assert.ok(questions(michael).some(q => q.answerText === 'I eat ice cream in winter.'));
  for (const id of ['2026-09-13', 'weekly-2026-09-14']) {
    const c = sourceFor(id).concepts.find(c => c.id.endsWith('list-commas'));
    assert.ok(c.try.every(q => q.type === 'choice'));
    assert.ok(c.say.every(q => /Do not say the word comma/.test(q.spokenQuestion)));
    assert.ok(c.say.every(q => !/comma/.test(q.answerText)));
  }
});

test('opposite relationships accept both subject choices and natural predicate-first sentences', () => {
  const concept = lessonFor('weekly-2026-09-14').concepts.find(c => c.id === 'week-opposites');
  for (const q of concept.try) for (const answer of [
    ['w0', 'w1', 'w2', 'w3', 'w4', 'w5'],
    ['w5', 'w1', 'w2', 'w3', 'w4', 'w0'],
    ['w2', 'w3', 'w4', 'w5', 'w1', 'w0'],
    ['w2', 'w3', 'w4', 'w0', 'w1', 'w5'],
  ]) assert.equal(globalThis.NativeCampCore.checkAnswer(q, answer), true, `${q.id}: ${answer.join(',')}`);
});
