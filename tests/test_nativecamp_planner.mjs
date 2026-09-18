import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { lessonFixture, weeklyFixture, legacyProgress } from './helpers/nativecamp-weekly.mjs';
import { practiceWindow, normalizeSnapshot, planWeekly, generationBrief, writeWeeklyPlan } from '../learning-tasks/shared/nativecamp/plan_weekly.mjs';

const C = globalThis.NativeCampCore, L = globalThis.NativeCampCatalog;
const releaseDate = '2026-09-27';
function inputs() {
  const lesson = lessonFixture('2026-09-15', ['weak', 'success', 'second', 'third', 'unpractised']);
  const older = lessonFixture('2026-09-13', ['older', 'old-success']);
  const lessons = { [lesson.id]: lesson, [older.id]: older };
  const catalog = Object.values(lessons).map(item => ({ id: item.id, date: item.date, teacher: 'Teacher' }));
  return { lessons, catalog, lesson, older };
}
function answer(progress, lesson, conceptId, date, outcome = 'independent') {
  const next = C.nextQuestion(progress, lesson, 'try', date, conceptId);
  if (outcome === 'helped') progress = C.markPending(progress, lesson, 'try', date, conceptId, next.question.id, 'help');
  return C.submitTry(progress, lesson, date, conceptId, next.question.id, outcome === 'incorrect' ? 'are' : 'is').progress;
}
const plan = (progress, data = inputs(), date = releaseDate) => planWeekly({ progress, ...data, releaseDate: date });
const sourceIds = result => result.concepts.map(item => item.sourceConcept.conceptId);
const reverseKeys = value => Array.isArray(value) ? value.map(reverseKeys) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reverseKeys(item)])) : value;

test('Taipei calendar dates form a Sunday half-open window including year and leap boundaries', () => {
  assert.deepEqual(practiceWindow('2026-09-20'), { start: '2026-09-13', endExclusive: '2026-09-20' });
  assert.deepEqual(practiceWindow('2027-01-03'), { start: '2026-12-27', endExclusive: '2027-01-03' });
  assert.deepEqual(practiceWindow('2028-03-05'), { start: '2028-02-27', endExclusive: '2028-03-05' });
  assert.throws(() => practiceWindow('2026-09-21'));
  assert.throws(() => practiceWindow('2026-02-30'));
});

test('late practice of old lessons counts; release Sunday, pending hints and untouched concepts do not', () => {
  const data = inputs(); let progress = C.createProgress();
  progress = answer(progress, data.lesson, 'weak', '2026-09-20', 'incorrect');
  progress = answer(progress, data.lesson, 'success', '2026-09-26');
  progress = answer(progress, data.lesson, 'second', '2026-09-27');
  progress = C.markPending(progress, data.lesson, 'try', '2026-09-26', 'third', 'third-try-1', 'help');
  const result = plan(progress, data);
  assert.deepEqual(sourceIds(result), ['weak', 'success']);
  assert.equal(result.concepts[0].currentWindow, true);
  assert.equal(result.concepts[0].sourceConcept.date, '2026-09-15');
  assert.equal(plan(C.createProgress(), data).reason, 'no-new-practice');
  assert.equal(plan(null, data).reason, 'no-synced-progress');
});

test('first difficulty survives later success, keeps a successful sample and at most one earlier concept', () => {
  const data = inputs(); let progress = C.createProgress();
  progress = answer(progress, data.lesson, 'weak', '2026-09-20', 'incorrect');
  progress = answer(progress, data.lesson, 'weak', '2026-09-21');
  progress = answer(progress, data.lesson, 'weak', '2026-09-21');
  for (const id of ['second', 'third']) progress = answer(progress, data.lesson, id, '2026-09-23', 'helped');
  progress = answer(progress, data.lesson, 'success', '2026-09-22');
  progress = answer(progress, data.older, 'older', '2026-09-19', 'incorrect');
  progress = answer(progress, data.older, 'old-success', '2026-09-18');
  const result = plan(progress, data);
  assert.equal(result.concepts.length, 4);
  assert.ok(sourceIds(result).includes('success'));
  assert.equal(result.concepts.filter(item => !item.currentWindow).length, 1);
  // Use just the known source to prove its first error was not erased by later success.
  delete progress.lessons[data.lesson.id].try.second;
  delete progress.lessons[data.lesson.id].try.third;
  assert.equal(plan(progress, data).concepts.find(item => item.sourceConcept.conceptId === 'weak').needsPractice, true);
});

test('weekly practice maps back to its ordinary source and old reviews count by actual date', () => {
  const original = lessonFixture('2026-09-15', ['is-are', 'odd-even', 'too-many', 'other']);
  const earlier = lessonFixture('2026-09-13', ['earlier']), weekly = weeklyFixture();
  const lessons = { [original.id]: original, [earlier.id]: earlier, [weekly.id]: weekly };
  const catalog = Object.values(lessons).map(item => ({ id: item.id, date: item.date, teacher: 'Teacher', ...(item.kind ? { kind: item.kind, weekly: item.weekly } : {}) }));
  let progress = C.validateProgress(legacyProgress());
  progress = C.startLesson(progress, weekly, '2026-09-20');
  const next = C.nextQuestion(progress, weekly, 'try', '2026-09-22');
  progress = C.submitTry(progress, weekly, '2026-09-22', next.concept.id, next.question.id, 'are').progress;
  const result = planWeekly({ progress, lessons, catalog, releaseDate });
  const mapped = result.concepts.find(item => item.currentWindow);
  assert.equal(mapped.sourceConcept.lessonId, original.id);
  assert.equal(mapped.sourceConcept.conceptId, next.concept.sourceConcept.conceptId);
  assert.equal(mapped.needsPractice, true);
  assert.equal(planWeekly({ progress: legacyProgress(), lessons, catalog, releaseDate: '2026-09-27' }).reason, 'no-new-practice');
});

test('unknown lessons, concepts, question IDs and mismatched frozen sources fail explicitly', () => {
  const data = inputs(); const progress = answer(C.createProgress(), data.lesson, 'weak', '2026-09-20');
  for (const edit of [
    value => { value.lessons.unknown = value.lessons[data.lesson.id]; },
    value => { value.lessons[data.lesson.id].try.unknown = value.lessons[data.lesson.id].try.weak; },
    value => { value.lessons[data.lesson.id].try.weak.initial[0].questionId = 'unknown'; },
  ]) { const copy = structuredClone(progress); edit(copy); assert.throws(() => plan(copy, data)); }
  assert.throws(() => normalizeSnapshot({ rev: 'bad', data: progress }, data.lessons));
  assert.deepEqual(normalizeSnapshot({ rev: 2, data: progress, token: 'never-copy' }, data.lessons), progress);
});

test('published release dates deduplicate the legacy September 20 pack', () => {
  const weekly = weeklyFixture(), original = lessonFixture('2026-09-15', ['is-are', 'odd-even', 'too-many', 'other']), older = lessonFixture('2026-09-13', ['earlier']);
  const lessons = { [weekly.id]: weekly, [original.id]: original, [older.id]: older };
  const catalog = Object.values(lessons).map(item => ({ id: item.id, date: item.date, teacher: 'Teacher', ...(item.kind ? { kind: item.kind, weekly: item.weekly } : {}) }));
  assert.equal(planWeekly({ progress: C.createProgress(), lessons, catalog, releaseDate: '2026-09-20' }).reason, 'already-published');
});

test('reordering catalog weekly object keys does not change a valid plan', () => {
  const weekly = weeklyFixture(), original = lessonFixture('2026-09-15', ['is-are', 'odd-even', 'too-many', 'other']), older = lessonFixture('2026-09-13', ['earlier']);
  const lessons = { [weekly.id]: weekly, [original.id]: original, [older.id]: older };
  const catalog = Object.values(lessons).map(item => ({ id: item.id, date: item.date, teacher: 'Teacher', ...(item.kind ? { kind: item.kind, weekly: item.weekly } : {}) }));
  const progress = answer(C.createProgress(), original, 'is-are', '2026-09-25');
  const expected = planWeekly({ progress, lessons, catalog, releaseDate });
  const reordered = catalog.map(entry => entry.kind === 'weekly' ? { ...entry, weekly: reverseKeys(entry.weekly) } : entry);
  assert.equal(expected.status, 'planned');
  assert.deepEqual(planWeekly({ progress, lessons, catalog: reordered, releaseDate }), expected);
});

test('new public contracts separate practice from publication and retain all late-practised concepts', async () => {
  const data = inputs(); let progress = C.createProgress();
  for (const id of ['weak', 'success', 'second', 'third']) progress = answer(progress, data.lesson, id, '2026-09-21');
  const result = plan(progress, data), brief = generationBrief(result, data.lessons);
  assert.doesNotMatch(JSON.stringify(brief), /needsPractice|lastPracticed|snapshotHash|currentWindow|"outcome"|"child"/);
  const weekly = { ...brief.bundle, concepts: brief.concepts.map(({ originalConcept, ...concept }) => ({ ...concept, try: structuredClone(originalConcept.try), say: structuredClone(originalConcept.say) })) };
  assert.equal(C.validateLesson(weekly), weekly);
  const entries = L.validateCatalog({ schemaVersion: 1, lessons: [{ id: weekly.id, date: weekly.date, kind: 'weekly', weekly: weekly.weekly }] });
  assert.equal((await L.readLesson(entries[0], { fetchImpl: async () => new Response(JSON.stringify(weekly)) })).date, releaseDate);
  const started = C.startLesson(progress, weekly, releaseDate);
  for (const mode of ['try', 'say']) assert.equal(C.practiceConcepts(started, weekly, mode).length, 4);
  const frozen = structuredClone(started.weekly[weekly.id]);
  const continued = C.startLesson(started, weekly, '2026-10-04');
  assert.deepEqual(continued.weekly[weekly.id], frozen);
  assert.deepEqual(C.validateProgress(continued), continued);
  const mismatch = structuredClone(entries[0]); mismatch.weekly.practiceStart = '2026-09-13';
  await assert.rejects(L.readLesson(mismatch, { fetchImpl: async () => new Response(JSON.stringify(weekly)) }));
  for (const edit of [value => { value.weekly.practiceEnd = '2026-09-28'; }, value => { value.weekly.conceptCount = 5; }, value => { value.weekly.schemaVersion = 3; }, value => { value.concepts[0].sourceConcept.date = releaseDate; }]) {
    const copy = structuredClone(weekly); edit(copy); assert.throws(() => C.validateLesson(copy));
  }
});

function temporaryRepo(t) {
  const repoRoot = mkdtempSync(join(tmpdir(), 'nativecamp-planner-'));
  t.after(() => rmSync(repoRoot, { recursive: true, force: true }));
  const data = inputs(), destination = join(repoRoot, 'docs/nativecamp/lessons');
  mkdirSync(destination, { recursive: true });
  writeFileSync(join(destination, 'catalog.json'), JSON.stringify({ schemaVersion: 1, lessons: data.catalog }));
  for (const lesson of Object.values(data.lessons)) writeFileSync(join(destination, `${lesson.id}.json`), JSON.stringify(lesson));
  return { repoRoot, data, privateRoot: join(repoRoot, '.local/nativecamp-weekly') };
}
function registerBundle(repoRoot, lesson) {
  const destination = join(repoRoot, 'docs/nativecamp/lessons'), path = join(destination, 'catalog.json');
  const catalog = JSON.parse(readFileSync(path, 'utf8'));
  catalog.lessons.push({ id: lesson.id, date: lesson.date, kind: lesson.kind, weekly: lesson.weekly });
  writeFileSync(path, JSON.stringify(catalog));
  writeFileSync(join(destination, `${lesson.id}.json`), JSON.stringify(lesson));
}

test('private plans resume without changing selection, recover missing briefs and reject tampering', async t => {
  const { repoRoot, data, privateRoot } = temporaryRepo(t);
  const progress = answer(C.createProgress(), data.lesson, 'weak', '2026-09-21');
  const summary = await writeWeeklyPlan({ repoRoot, snapshot: { rev: 1, data: progress, secret: 'not-saved' }, releaseDate });
  assert.deepEqual(summary, { status: 'planned', releaseDate, lessonId: `weekly-${releaseDate}`, conceptCount: 1 });
  const folder = join(privateRoot, releaseDate), bytes = readFileSync(join(folder, 'plan.json'), 'utf8');
  assert.doesNotMatch(readFileSync(join(folder, 'progress.json'), 'utf8'), /not-saved|secret/);
  rmSync(join(folder, 'generation-brief.json'));
  assert.equal((await writeWeeklyPlan({ repoRoot, snapshot: C.createProgress(), releaseDate })).status, 'resumed');
  assert.equal(readFileSync(join(folder, 'plan.json'), 'utf8'), bytes);
  assert.equal(existsSync(join(folder, 'generation-brief.json')), true);
  const bad = JSON.parse(bytes); bad.concepts[0].needsPractice = true;
  writeFileSync(join(folder, 'plan.json'), JSON.stringify(bad));
  await assert.rejects(writeWeeklyPlan({ repoRoot, snapshot: progress, releaseDate }), /saved-plan-invalid/);
});

test('reordering saved plan and brief object keys preserves read-only resumption', async t => {
  const { repoRoot, data, privateRoot } = temporaryRepo(t);
  const progress = answer(C.createProgress(), data.lesson, 'weak', '2026-09-21');
  await writeWeeklyPlan({ repoRoot, snapshot: progress, releaseDate });
  const paths = ['plan.json', 'generation-brief.json'].map(name => join(privateRoot, releaseDate, name));
  const reordered = paths.map(path => JSON.stringify(reverseKeys(JSON.parse(readFileSync(path, 'utf8'))), null, 2));
  paths.forEach((path, index) => writeFileSync(path, reordered[index]));
  const result = await writeWeeklyPlan({ repoRoot, snapshot: progress, releaseDate });
  assert.equal(result.status, 'resumed');
  paths.forEach((path, index) => assert.equal(readFileSync(path, 'utf8'), reordered[index]));
});

test('explicit resume restores a missing brief after its own local draft enters the catalog', async t => {
  const { repoRoot, data, privateRoot } = temporaryRepo(t);
  const progress = answer(C.createProgress(), data.lesson, 'weak', '2026-09-21');
  await writeWeeklyPlan({ repoRoot, snapshot: progress, releaseDate });
  const folder = join(privateRoot, releaseDate), planPath = join(folder, 'plan.json'), briefPath = join(folder, 'generation-brief.json');
  const planBytes = readFileSync(planPath, 'utf8'), brief = JSON.parse(readFileSync(briefPath, 'utf8'));
  const draft = { ...brief.bundle, concepts: brief.concepts.map(({ originalConcept, ...concept }) => ({ ...concept, try: originalConcept.try, say: originalConcept.say })) };
  registerBundle(repoRoot, draft);
  rmSync(briefPath);
  assert.equal((await writeWeeklyPlan({ repoRoot, releaseDate, resume: true })).status, 'resumed');
  assert.deepEqual(JSON.parse(readFileSync(briefPath, 'utf8')), brief);
  assert.equal(readFileSync(planPath, 'utf8'), planBytes);
  await assert.rejects(writeWeeklyPlan({ repoRoot, releaseDate, resume: true, snapshot: progress }), /resume-uses-saved-progress/);
  // Excluding the draft must not silently accept catalog metadata for another plan.
  const catalogPath = join(repoRoot, 'docs/nativecamp/lessons/catalog.json');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  catalog.lessons.at(-1).weekly.conceptCount = 2;
  writeFileSync(catalogPath, JSON.stringify(catalog));
  rmSync(briefPath);
  await assert.rejects(writeWeeklyPlan({ repoRoot, releaseDate, resume: true }), /saved-draft-mismatch/);
  assert.equal(existsSync(briefPath), false);
});

test('published receipts never regenerate saved plans and resume requires a saved plan', async t => {
  const { repoRoot, data, privateRoot } = temporaryRepo(t);
  await assert.rejects(writeWeeklyPlan({ repoRoot, releaseDate, resume: true }), /saved-plan-missing/);
  const progress = answer(C.createProgress(), data.lesson, 'weak', '2026-09-21');
  await writeWeeklyPlan({ repoRoot, snapshot: progress, releaseDate });
  const folder = join(privateRoot, releaseDate), briefPath = join(folder, 'generation-brief.json');
  rmSync(briefPath);
  writeFileSync(join(folder, 'automation.json'), JSON.stringify({ status: 'published', releaseDate, lessonId: `weekly-${releaseDate}` }));
  assert.deepEqual(await writeWeeklyPlan({ repoRoot, releaseDate, resume: true }), { status: 'skipped', reason: 'already-published', releaseDate });
  assert.equal(existsSync(briefPath), false);
});

test('without a saved plan the writer still skips an existing legacy release', async t => {
  const { repoRoot, privateRoot } = temporaryRepo(t), date = '2026-09-20';
  const legacy = lessonFixture(date, ['old-review']);
  Object.assign(legacy, { id: 'weekly-2026-09-14', kind: 'weekly', weekly: { weekStart: '2026-09-14', weekEnd: date, opensOn: date, conceptCount: 1, earlierCount: 0 } });
  legacy.concepts[0].sourceConcept = { lessonId: '2026-09-15', conceptId: 'weak', date: '2026-09-15' };
  registerBundle(repoRoot, legacy);
  assert.deepEqual(await writeWeeklyPlan({ repoRoot, releaseDate: date, snapshot: C.createProgress() }), { status: 'skipped', reason: 'already-published', releaseDate: date });
  assert.equal(existsSync(join(privateRoot, date, 'plan.json')), false);
});

test('writer rejects public snapshots, wrong private roots and concurrent writers', async t => {
  const { repoRoot, data, privateRoot } = temporaryRepo(t);
  const progress = answer(C.createProgress(), data.lesson, 'weak', '2026-09-21');
  const publicPath = join(repoRoot, 'docs/progress.json'); writeFileSync(publicPath, JSON.stringify(progress));
  await assert.rejects(writeWeeklyPlan({ repoRoot, snapshotPath: publicPath, releaseDate }), /private-path-required/);
  await assert.rejects(writeWeeklyPlan({ repoRoot, snapshot: progress, releaseDate, privateRoot: join(repoRoot, 'docs') }), /private-path-required/);
  const folder = join(privateRoot, releaseDate); mkdirSync(folder, { recursive: true }); writeFileSync(join(folder, '.planner-lock'), '');
  await assert.rejects(writeWeeklyPlan({ repoRoot, snapshot: progress, releaseDate }), /planner-busy/);
  assert.equal(existsSync(join(folder, '.planner-lock')), true);
});

test('CLI errors never echo raw progress or secrets', () => {
  const result = spawnSync(process.execPath, ['learning-tasks/shared/nativecamp/plan_weekly.mjs', '--stdin', '--release', releaseDate], { input: '{secret:very-private-value}', encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.doesNotMatch(result.stderr, /secret|very-private/);
});
