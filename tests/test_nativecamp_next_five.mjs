import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import '../docs/nativecamp/core.js';
import '../docs/nativecamp/catalog.js';
import { legacyProgress } from './helpers/nativecamp-weekly.mjs';

const C = globalThis.NativeCampCore, L = globalThis.NativeCampCatalog;
const root = new URL('../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const normalized = text => text.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const lessonFor = id => read(`docs/nativecamp/lessons/${id}.json`);
const day = '2026-09-27';
const specs = [
  { id: '2026-09-21', teacher: 'Alex', voice: 'marin' },
  { id: '2026-09-20', teacher: 'Kyla', voice: 'cedar' },
  { id: '2026-09-19-zibuyile', teacher: 'Zibuyile', voice: 'marin' },
  { id: '2026-09-19', teacher: 'Edon', voice: 'cedar' },
  { id: '2026-09-18', teacher: 'Zeus', voice: 'marin' },
];

function expectedBundle(source) {
  const lesson = structuredClone(source), jobs = [];
  for (const concept of lesson.concepts) for (const question of [...concept.try, ...concept.say]) {
    const spoken = question.spokenQuestion;
    delete question.spokenQuestion;
    question.audio = {
      question: `audio/${lesson.id}-${question.id}-q.mp3`,
      answer: `audio/${lesson.id}-${question.id}-a.mp3`,
    };
    jobs.push({ file: `${lesson.id}-${question.id}-q.mp3`, text: spoken },
      { file: `${lesson.id}-${question.id}-a.mp3`, text: question.answerText });
  }
  return { lesson, jobs };
}

function finish(progress, lesson) {
  for (const mode of ['try', 'say']) for (const concept of lesson.concepts) {
    for (const question of concept[mode].slice(0, 2)) {
      if (mode === 'say') {
        progress = C.markPending(progress, lesson, mode, day, concept.id, question.id, 'reveal');
        progress = C.submitSay(progress, lesson, day, concept.id, question.id, 'gotIt').progress;
      } else progress = C.submitTry(progress, lesson, day, concept.id, question.id, question.acceptedOrders[0]).progress;
    }
  }
  return progress;
}

for (const { id, teacher, voice } of specs) {
  test(`[source] ${id}: full sentences, bounded distractors, one-word repairs and generated speech agree`, () => {
    const source = read(`learning-tasks/nativecamp-${id}/source/lesson-source.json`);
    const lesson = lessonFor(id), expected = expectedBundle(source);
    C.validateLesson(lesson);
    assert.equal(source.id, id);
    assert.equal(source.date, id.slice(0, 10));
    assert.deepEqual(lesson, expected.lesson);
    assert.deepEqual(read(`learning-tasks/nativecamp-${id}/source/speech-jobs.json`), expected.jobs);
    assert.equal(new Set(expected.jobs.map(job => job.file)).size, expected.jobs.length);
    const entries = read('docs/nativecamp/lessons/catalog.json').lessons.filter(entry => entry.id === id);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].date, source.date);
    assert.equal(entries[0].teacher, teacher);
    const tasks = read('learning-tasks/catalog.json').tasks.filter(task => task.id === `nativecamp-${id}`);
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].eventDate, source.date);
    assert.doesNotMatch(JSON.stringify(source), /[\u3400-\u9fff]|\p{Extended_Pictographic}|https?:|chat_hash|base64|source[\\/]private|\.webm|sk-[a-zA-Z0-9]/u);
    for (const concept of source.concepts) {
      assert.equal(concept.tryRevision, undefined, `${id} is a new lesson, not a revision`);
      assert.deepEqual(concept.try.map(question => [question.stage, question.type]), [
        ['build', 'order'], ['change', 'order'], ['fix', 'repair'],
      ]);
      assert.notEqual(normalized(concept.try[0].answerText), normalized(concept.try[1].answerText));
      for (const mode of ['try', 'say']) {
        assert.equal(concept[mode].length, 3);
        for (const question of concept[mode]) {
          assert.ok(normalized(question.answerText).split(' ').length >= 3, `${question.id}: full answer`);
          assert.ok(!normalized(question.spokenQuestion).includes(normalized(question.answerText)), `${question.id}: question speaks the completed answer`);
          if (question.type === 'order') {
            const tokens = new Map(question.tokens.map(token => [token.id, token.text]));
            assert.ok(question.tokens.every(token => !/\s/.test(token.text)), `${question.id}: single-word cards`);
            assert.ok(question.acceptedOrders.some(order => normalized(order.map(key => tokens.get(key)).join(' ')) === normalized(question.answerText)), question.id);
            for (const order of question.acceptedOrders) {
              const extra = question.tokens.length - order.length;
              assert.ok(extra >= 1 && extra <= 2, `${question.id}: one or two distractors`);
              assert.equal(C.checkAnswer(question, order), true);
              assert.equal(C.checkAnswer(question, order.slice(0, -1)), false, `${question.id}: incomplete sentence is not accepted`);
            }
          } else if (question.type === 'repair') {
            const replacement = question.choices.find(choice => choice.id === question.answer.choiceId).text;
            const repaired = question.sentence.map(token => token.id === question.answer.wordId ? replacement : token.text).join(' ');
            assert.equal(normalized(repaired), normalized(question.answerText), question.id);
            assert.notEqual(normalized(question.sentence.map(token => token.text).join(' ')), normalized(question.answerText));
            assert.equal(C.checkAnswer(question, question.answer), true);
          } else {
            assert.equal(mode, 'say');
            assert.ok(question.accepted.length > 0, `${question.id}: parent needs accepted answers`);
            assert.ok(question.instruction?.trim(), `${question.id}: full-sentence scaffold`);
          }
        }
      }
    }
  });

  test(`[audio] ${id}: every question and answer has verified normal-speed OpenAI audio and current ASR`, () => {
    const manifest = read(`learning-tasks/nativecamp-${id}/source/nativecamp-audio-manifest.json`);
    const jobs = read(`learning-tasks/nativecamp-${id}/source/speech-jobs.json`);
    assert.equal(manifest.lessonId, id);
    assert.equal(manifest.status, 'complete');
    assert.equal(manifest.voice.engine, 'OpenAI Speech API');
    assert.equal(manifest.voice.name, voice);
    assert.equal(manifest.voice.speed, 1);
    assert.equal(manifest.voice.voiceCloning, false);
    assert.match(manifest.voice.model, /^gpt-4o-mini-tts(?:-|$)/);
    assert.doesNotMatch(manifest.voice.instructions, /slow|\b135\b/i);
    const entries = new Map(manifest.tts.map(entry => [entry.file, entry]));
    assert.equal(manifest.tts.length, jobs.length);
    assert.equal(entries.size, jobs.length);
    for (const job of jobs) {
      assert.ok(job.file.startsWith(`${id}-`));
      const entry = entries.get(`audio/${job.file}`);
      assert.ok(entry, job.file);
      assert.equal(entry.text, job.text);
      assert.equal(entry.voice, voice);
      assert.equal(entry.settings.speed, 1);
      const bytes = readFileSync(new URL(`docs/nativecamp/${entry.file}`, root));
      assert.equal(bytes.length, entry.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
      assert.equal(entry.codec, 'mp3');
      assert.equal(entry.decode, 'passed');
      assert.ok(entry.durationSeconds >= 0.4 && entry.rmsDbfs > -60);
    }
    const asr = read(`learning-tasks/nativecamp-${id}/source/nativecamp-tts-asr.json`);
    assert.equal(asr.lessonId, id);
    assert.equal(asr.audioUploaded, false);
    assert.equal(asr.initialPrompt, null);
    assert.equal(asr.samples.length, jobs.length);
    assert.equal(new Set(asr.samples.map(sample => sample.file)).size, jobs.length);
    for (const sample of asr.samples) {
      const entry = entries.get(sample.file);
      assert.ok(entry, sample.file);
      assert.equal(sample.sha256, entry.sha256);
      assert.equal(sample.expectedText, entry.text);
      assert.ok(sample.recognizedText.trim(), sample.file);
    }
  });

  test(`[progress] ${id}: interleaved Build then Change skips successful Fix and retains an initial error`, () => {
    const lesson = lessonFor(id);
    let progress = C.createProgress();
    const stages = [];
    for (let next; (next = C.nextQuestion(progress, lesson, 'try', day));) {
      assert.ok(stages.length < lesson.concepts.length * 3, 'practice must finish');
      stages.push(next.question.stage);
      progress = C.submitTry(progress, lesson, day, next.concept.id, next.question.id, next.question.acceptedOrders[0]).progress;
    }
    assert.deepEqual(stages, [...lesson.concepts.map(() => 'build'), ...lesson.concepts.map(() => 'change')]);
    assert.equal(C.summarizeLesson(progress, lesson, day).try.done, true);
    assert.equal(C.summarizeLesson(progress, lesson, day).say.done, false);
    assert.equal(C.nextQuestion(progress, lesson, 'try', '2026-09-28'), null);

    const concept = lesson.concepts[0], [build, change, fix] = concept.try;
    let mistaken = C.submitTry(C.createProgress(), lesson, day, concept.id, build.id, build.acceptedOrders[0].slice(0, -1)).progress;
    const retry = C.submitTry(mistaken, lesson, day, concept.id, build.id, build.acceptedOrders[0]);
    assert.equal(retry.recorded, false);
    mistaken = C.submitTry(retry.progress, lesson, day, concept.id, change.id, change.acceptedOrders[0]).progress;
    assert.equal(C.nextQuestion(mistaken, lesson, 'try', day, concept.id).question.id, fix.id);
    mistaken = C.submitTry(mistaken, lesson, day, concept.id, fix.id, fix.answer).progress;
    assert.deepEqual(mistaken.lessons[id].try[concept.id].initial.map(attempt => attempt.outcome), ['incorrect', 'independent', 'independent']);
    assert.equal(C.nextQuestion(mistaken, lesson, 'try', day, concept.id), null);
  });
}

test('[catalog] actual September 19 Edon and Zibuyile remain separate in calendar, preview and parent navigation', async () => {
  const ids = ['2026-09-19', '2026-09-19-zibuyile'];
  const catalog = L.validateCatalog(read('docs/nativecamp/lessons/catalog.json'));
  const entries = catalog.filter(entry => ids.includes(entry.id));
  assert.equal(entries.length, 2);
  const paths = [];
  const lessons = await L.readLessons(entries, { fetchImpl: async path => {
    paths.push(path);
    return new Response(JSON.stringify(read(`docs/nativecamp/${path.replace(/^\.\//, '')}`)));
  } });
  assert.deepEqual(paths.sort(), ids.map(id => `./lessons/${id}.json`).sort());
  const child = L.calendar(entries, ids[0], { date: day, month: '2026-09', childView: true, lessons });
  const cell = child.match(/<td[^>]*data-date="2026-09-19">([\s\S]*?)<\/td>/)[1];
  for (const id of ids) {
    assert.equal(lessons[id].date, '2026-09-19');
    assert.equal(L.select(entries, `?lesson=${id}`).id, id);
    assert.ok(cell.includes(`lesson=${id}"`));
    assert.ok(L.navigation(entries, id, { page: 'preview.html' }).includes(`href="preview.html?child=aiden&amp;lesson=${id}"`));
    assert.ok(L.navigation(entries, id, { buttons: true }).includes(`data-lesson="${id}"`));
  }
  assert.match(cell, />Edon<\/span>/);
  assert.match(cell, />Zibuyile<\/span>/);
  const files = ids.flatMap(id => read(`learning-tasks/nativecamp-${id}/source/speech-jobs.json`).map(job => job.file));
  assert.equal(new Set(files).size, files.length, 'same-day lessons cannot overwrite audio');
  await assert.rejects(L.readLesson(entries.find(entry => entry.id === ids[1]), {
    fetchImpl: async () => new Response(JSON.stringify(lessons[ids[0]])),
  }), /does not match/);
});

test('[progress] completing either actual September 19 course never completes or reopens the other', () => {
  const pair = [lessonFor('2026-09-19'), lessonFor('2026-09-19-zibuyile')];
  for (const [done, remaining] of [pair, [...pair].reverse()]) {
    let progress = finish(C.createProgress(), done);
    const saved = structuredClone(progress.lessons[done.id]);
    assert.equal(L.finished(progress, done, day), true);
    assert.equal(L.finished(progress, remaining, day), false);
    const concept = remaining.concepts[0], question = concept.try[0];
    progress = C.submitTry(progress, remaining, day, concept.id, question.id, question.acceptedOrders[0]).progress;
    progress = C.validateProgress(JSON.parse(JSON.stringify(progress)));
    assert.deepEqual(progress.lessons[done.id], saved);
    assert.equal(C.nextQuestion(progress, done, 'try', day), null);
    assert.equal(C.nextQuestion(progress, done, 'say', day), null);
    assert.equal(C.nextQuestion(progress, remaining, 'try', day, concept.id).question.stage, 'change');
    assert.equal(C.summarizeLesson(progress, remaining, day).say.concepts[0].attempted, 0);
  }
});

test('[regression] adding first answers to all five courses preserves existing initial, review and pending history', () => {
  let progress = C.validateProgress(legacyProgress());
  const original = structuredClone(progress.lessons);
  for (const { id } of specs) {
    const lesson = lessonFor(id), concept = lesson.concepts[0], question = concept.try[0];
    progress = C.submitTry(progress, lesson, day, concept.id, question.id, question.acceptedOrders[0]).progress;
  }
  progress = C.validateProgress(JSON.parse(JSON.stringify(progress)));
  for (const [id, state] of Object.entries(original)) assert.deepEqual(progress.lessons[id], state);
  assert.equal(Object.keys(progress.lessons).length, Object.keys(original).length + specs.length);
});
