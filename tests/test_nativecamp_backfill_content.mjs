import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import '../docs/nativecamp/core.js';

const root = new URL('../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const core = globalThis.NativeCampCore;
const normalized = text => text.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const sourceFor = id => read(`learning-tasks/nativecamp-${id}/source/lesson-source.json`);
const specs = [
  { id: '2026-09-10', teacher: 'Anastasia', voice: 'cedar', concepts: ['animal-homes', 'animal-food', 'pretend-animal'] },
  { id: '2026-09-11', teacher: 'Edon', voice: 'marin', concepts: ['weather-verbs', 'weather-negative', 'season-order', 'day-night-length'] },
  { id: '2026-09-12', teacher: 'Lena', voice: 'cedar', concepts: ['can-actions', 'watch-grow', 'tree-details'] },
];
const questions = concept => [...concept.try, ...concept.say];
const conceptFor = (id, concept) => sourceFor(id).concepts.find(c => c.id === concept);
const orderText = (q, order) => order.map(id => q.tokens.find(t => t.id === id).text).join(' ');
const sentences = q => [q.answerText, ...(q.accepted || []), ...(q.acceptedOrders || []).map(order => orderText(q, order))];
function onlySentences(q, expected) {
  const allowed = new Set(expected.map(normalized));
  for (const sentence of sentences(q)) assert.ok(allowed.has(normalized(sentence)), `${q.id}: unsupported answer ${sentence}`);
}
function expectedBundle(source) {
  const lesson = structuredClone(source), jobs = [];
  for (const c of lesson.concepts) for (const q of [...questions(c), ...(c.tryRevision?.questions || [])]) {
    const spoken = q.spokenQuestion;
    delete q.spokenQuestion;
    q.audio = { question: `audio/${lesson.id}-${q.id}-q.mp3`, answer: `audio/${lesson.id}-${q.id}-a.mp3` };
    jobs.push({ file: `${lesson.id}-${q.id}-q.mp3`, text: spoken }, { file: `${lesson.id}-${q.id}-a.mp3`, text: q.answerText });
  }
  return { lesson, jobs };
}

for (const spec of specs) {
  const { id, concepts, voice, teacher } = spec;
  test(`[source] ${id}: three distinct variants per mode, full sentences, one distractor and no private content`, () => {
    const source = sourceFor(id);
    assert.equal(source.id, id);
    assert.equal(source.date, id);
    assert.deepEqual(source.concepts.map(c => c.id), concepts);
    assert.ok(!/https?:|chat_hash|base64|source[\\/]private|\.webm|sk-[a-zA-Z0-9]/.test(JSON.stringify(source)), id);
    core.validateLesson(expectedBundle(source).lesson);
    for (const c of source.concepts) for (const mode of ['try', 'say']) {
      assert.equal(c[mode].length, 3);
      assert.equal(new Set(c[mode].map(q => JSON.stringify(q.scene))).size, 3);
      for (const q of c[mode]) {
        assert.ok(!normalized(q.spokenQuestion).includes(normalized(q.answerText)), `${q.id} speaks its completed answer`);
        assert.ok(!normalized(q.scene.text).includes(normalized(q.answerText)), `${q.id} displays its completed answer`);
        assert.ok(!/[\u3400-\u9fff]|\p{Extended_Pictographic}/u.test(JSON.stringify(q)), q.id);
        assert.ok(!/https?:|chat_hash|base64|source[\\/]private|\.webm|sk-[a-zA-Z0-9]/.test(JSON.stringify(q)), q.id);
        if (mode === 'say') {
          assert.ok(q.accepted.length > 0);
          continue;
        }
        assert.equal(q.type, 'order');
        const tokens = new Map(q.tokens.map(t => [t.id, t.text]));
        assert.equal(tokens.size, q.tokens.length);
        assert.ok(q.acceptedOrders.some(order => normalized(orderText(q, order)) === normalized(q.answerText)));
        for (const order of q.acceptedOrders) {
          assert.equal(q.tokens.length - order.length, 1, `${q.id} must leave exactly one word`);
          assert.equal(new Set(order).size, order.length);
          assert.ok(order.every(token => tokens.has(token)));
          assert.equal(core.checkAnswer(q, order), true);
          // Visually identical words may use different IDs; both selections must work.
          for (let a = 0; a < order.length; a++) for (let b = a + 1; b < order.length; b++) {
            if (normalized(tokens.get(order[a])) !== normalized(tokens.get(order[b]))) continue;
            const swapped = [...order];
            [swapped[a], swapped[b]] = [swapped[b], swapped[a]];
            assert.equal(core.checkAnswer(q, swapped), true, `${q.id} rejects equivalent word cards`);
          }
        }
      }
    }
  });

  test(`[generated] ${id}: catalog, source, runtime and speech jobs agree`, () => {
    const expected = expectedBundle(sourceFor(id));
    const lesson = read(`docs/nativecamp/lessons/${id}.json`);
    const jobs = read(`learning-tasks/nativecamp-${id}/source/speech-jobs.json`);
    const entries = read('docs/nativecamp/lessons/catalog.json').lessons.filter(entry => entry.id === id);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].date, id);
    assert.equal(entries[0].teacher, teacher);
    core.validateLesson(lesson);
    assert.deepEqual(lesson, expected.lesson);
    assert.deepEqual(jobs, expected.jobs);
    assert.equal(new Set(jobs.map(job => job.file)).size, expected.jobs.length);
  });

  test(`[audio] ${id}: every recording matches its text, hash and normal-speed OpenAI voice`, () => {
    const jobs = read(`learning-tasks/nativecamp-${id}/source/speech-jobs.json`);
    const manifest = read(`learning-tasks/nativecamp-${id}/source/nativecamp-audio-manifest.json`);
    assert.equal(manifest.lessonId, id);
    assert.equal(manifest.status, 'complete');
    assert.equal(manifest.voice.engine, 'OpenAI Speech API');
    assert.equal(manifest.voice.name, voice);
    assert.equal(manifest.voice.speed, 1);
    assert.match(manifest.voice.model, /^gpt-4o-mini-tts(?:-|$)/);
    assert.equal(manifest.voice.voiceCloning, false);
    assert.ok(!/slow|\b135\b/i.test(manifest.voice.instructions));
    assert.ok(!/nativecamp\.net|chat_hash|base64|source[\\/]private|sk-[a-zA-Z0-9]/.test(JSON.stringify(manifest)), id);
    const speech = new Map(manifest.tts.map(item => [item.file, item]));
    assert.equal(manifest.tts.length, jobs.length);
    assert.equal(speech.size, jobs.length);
    for (const job of jobs) {
      assert.ok(job.file.startsWith(`${id}-`));
      const entry = speech.get(`audio/${job.file}`);
      assert.ok(entry, job.file);
      assert.equal(entry.text, job.text);
      assert.equal(entry.voice, voice);
      assert.equal(entry.model, manifest.voice.model);
      assert.equal(entry.settings.speed, 1);
      assert.equal(entry.settings.instructions, manifest.voice.instructions);
      assert.equal(entry.settings.response_format, 'mp3');
      const bytes = readFileSync(new URL(`docs/nativecamp/audio/${job.file}`, root));
      assert.equal(bytes.length, entry.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
      assert.equal(entry.codec, 'mp3');
      assert.equal(entry.decode, 'passed');
      assert.equal(entry.nonSilent, true);
      assert.ok(entry.durationSeconds >= 0.4 && entry.rmsDbfs > -60);
    }
  });
}

test('[source] all three backfilled lessons contain exactly 60 original questions', () => {
  assert.equal(specs.reduce((count, { id }) => count + sourceFor(id).concepts.reduce((n, c) => n + questions(c).length, 0), 0), 60);
});

test('[source] September 10 animal counts determine live/lives and eat/eats, not animal stereotypes', () => {
  for (const concept of ['animal-homes', 'animal-food']) for (const q of questions(conceptFor('2026-09-10', concept))) {
    assert.equal(q.scene.heading, 'Story card');
    const match = q.scene.text.match(/^Animals?: (one|two|three) (\w+)\. (Home|Food): (.+)\.$/);
    assert.ok(match, q.id);
    const [, count, animal, kind, detail] = match;
    const singular = count === 'one';
    const verb = kind === 'Home' ? (singular ? 'lives' : 'live') : (singular ? 'eats' : 'eat');
    const subject = `The ${animal}`;
    const value = detail.replace(/ for lunch$/, '');
    const predicate = `${verb}${kind === 'Home' ? ' in' : ''} ${value}`;
    assert.equal(q.answerText, `${subject} ${predicate}.`);
    const subjects = [subject, `${singular ? 'This' : 'These'} ${animal}`, singular ? 'It' : 'They'];
    const variants = subjects.map(s => `${s} ${predicate}`);
    if (value === 'trees') variants.push(`${subject} ${verb} in the trees`);
    if (detail.endsWith(' for lunch')) variants.push(`${subject} ${predicate} for lunch`);
    onlySentences(q, variants);
    if (q.tokens) {
      const used = new Set(q.acceptedOrders[0]);
      const distractor = q.tokens.find(token => !used.has(token.id)).text;
      assert.equal(distractor, verb.endsWith('s') ? verb.slice(0, -1) : `${verb}s`);
    }
  }
});

test('[source] September 10 a/an follows the taught animal word sound', () => {
  const articles = { frog: 'a', honeybee: 'a', octopus: 'an', eagle: 'an', orangutan: 'an' };
  for (const q of questions(conceptFor('2026-09-10', 'pretend-animal'))) {
    const animal = q.scene.text.match(/^Your animal: (\w+)\.$/)?.[1];
    assert.ok(Object.hasOwn(articles, animal), q.id);
    const article = articles[animal];
    onlySentences(q, [`I am ${article} ${animal}`, `I'm ${article} ${animal}`]);
    if (q.tokens) assert.ok(q.tokens.some(token => token.text === (article === 'a' ? 'an' : 'a')));
  }
});

test('[source] September 11 affirmative weather changes and negatives preserve tense and card facts', () => {
  for (const concept of ['weather-verbs', 'weather-negative']) for (const q of questions(conceptFor('2026-09-11', concept))) {
    assert.equal(q.scene.heading, 'Made-up town');
    const positive = concept === 'weather-verbs';
    const match = positive
      ? q.scene.text.match(/^(\w+): (?:(\w+), then )?(\w+)\.$/)
      : q.scene.text.match(/^(\w+)\. (\w+)(?: weather)?: no\.$/);
    assert.ok(match, q.id);
    const season = match[1].toLowerCase();
    const weather = match[positive ? 3 : 2].toLowerCase();
    const predicate = weather === 'snow' ? (positive ? 'snows' : 'snow') : `${positive ? 'gets' : 'get'} ${weather}`;
    const seasons = season === 'fall' ? ['fall', 'autumn'] : [season];
    const forms = positive ? [predicate] : [`doesn't ${predicate}`, `does not ${predicate}`];
    const allowed = seasons.flatMap(s => forms.flatMap(form => [`It ${form} in ${s}`, `It ${form} in the ${s}`, `In ${s}, it ${form}`]));
    onlySentences(q, allowed);
    if (!positive) for (const sentence of sentences(q)) assert.doesNotMatch(sentence, /(?:doesn't|does not) (?:gets|snows)\b/i, q.id);
  }
});

test('[source] September 11 next-season answers complete the cycle without saying the next season first', () => {
  const next = { spring: 'summer', summer: 'fall', fall: 'winter', autumn: 'winter', winter: 'spring' };
  const aliases = value => value === 'fall' || value === 'autumn' ? ['fall', 'autumn'] : [value];
  for (const q of questions(conceptFor('2026-09-11', 'season-order'))) {
    assert.equal(q.scene.heading, 'Four-season calendar');
    const current = q.scene.text.match(/^Now: (\w+)\.$/)?.[1];
    assert.ok(Object.hasOwn(next, current), q.id);
    const allowed = aliases(next[current]).flatMap(after => aliases(current).flatMap(before => [
      `${after} comes after ${before}`, `${after} is after ${before}`, `After ${before} comes ${after}`,
    ]));
    onlySentences(q, allowed);
    for (const target of aliases(next[current])) {
      assert.doesNotMatch(q.spokenQuestion, new RegExp(`\\b${target}\\b`, 'i'), q.id);
      assert.doesNotMatch(q.instruction, new RegExp(`\\b${target}\\b`, 'i'), q.id);
    }
  }
});

test('[source] September 11 long/short and is/are match the visible day/night card, including natural order alternatives', () => {
  for (const q of questions(conceptFor('2026-09-11', 'day-night-length'))) {
    assert.equal(q.scene.heading, 'Made-up town');
    const match = q.scene.text.match(/^(\w+)\. (Days|Nights): (long|short)\.$/);
    assert.ok(match, q.id);
    const season = match[1].toLowerCase(), plural = match[2].toLowerCase(), length = match[3];
    const singular = plural.slice(0, -1);
    const allowed = /one /i.test(q.prompt) ? [
      `A ${season} ${singular} is ${length}`, `A ${singular} in ${season} is ${length}`, `In ${season}, a ${singular} is ${length}`,
    ] : [
      `The ${plural} are ${length} in ${season}`, `The ${plural} in ${season} are ${length}`,
      `In ${season}, the ${plural} are ${length}`, `${season} ${plural} are ${length}`, `The ${season} ${plural} are ${length}`,
    ];
    onlySentences(q, allowed);
    if (q.tokens) {
      const actual = q.acceptedOrders.map(order => normalized(orderText(q, order)));
      assert.ok(actual.includes(normalized(`The ${plural} in ${season} are ${length}`)), q.id);
      assert.ok(actual.includes(normalized(`The ${plural} are ${length} in ${season}`)), q.id);
    }
  }
});

test('[source] September 12 can actions, growth and tree details follow the visible scene', () => {
  for (const c of sourceFor('2026-09-12').concepts) for (const q of questions(c)) {
    if (c.id === 'can-actions') {
      const match = q.scene.text.match(/^You \+ a friend \/ (\w+) \/ (.+)$/);
      assert.ok(match, q.id);
      const sentence = `We can ${match[1]} ${match[2]}`;
      onlySentences(q, [sentence, `${sentence} together`]);
    } else if (c.id === 'watch-grow') {
      const objects = q.scene.text.match(/^You watch (.+)\. They get bigger\.$/)?.[1];
      assert.ok(objects, q.id);
      onlySentences(q, [`I watch ${objects} grow`, `I watch the ${objects} grow`]);
    } else if (c.id === 'tree-details') {
      const match = q.scene.text.match(/^Your tree \/ (apples) \/ (.+)$/);
      assert.ok(match, q.id);
      const details = match[2].split(' + ');
      const order = { tasty: 0, big: 1, small: 1, red: 2 };
      for (const detail of details) assert.ok(Object.hasOwn(order, detail), q.id);
      const adjectivePhrase = [...details].sort((a, b) => order[a] - order[b]).join(' ');
      onlySentences(q, [
        `My tree has ${adjectivePhrase} apples`, `My tree has some ${adjectivePhrase} apples`,
        `My tree has ${details.join(' and ')} apples`, `My tree has apples that are ${details.join(' and ')}`,
      ]);
    } else assert.fail(`No semantic rule for ${c.id}`);
  }
});
