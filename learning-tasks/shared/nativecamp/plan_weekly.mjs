// Offline weekly planning. Raw progress and ranking never go to stdout or docs/.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync, renameSync, rmSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual as same } from 'node:util';
import '../../../docs/nativecamp/core.js';
import '../../../docs/nativecamp/catalog.js';

const C = globalThis.NativeCampCore, L = globalThis.NativeCampCatalog;
const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const MODES = ['try', 'say'];
const LIMIT = 2 * 1024 * 1024;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const keyFor = source => `${source.lessonId}/${source.conceptId}`;
const fail = code => { throw new Error(code); };
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export function practiceWindow(releaseDate) {
  if (!validDate(releaseDate) || new Date(releaseDate).getUTCDay() !== 0) fail('invalid-release-date');
  return { start: new Date(Date.parse(releaseDate) - 7 * 86400000).toISOString().slice(0, 10), endExclusive: releaseDate };
}

function sourceConcept(lesson, concept, lessons) {
  const source = lesson.kind === 'weekly' ? concept.sourceConcept : { lessonId: lesson.id, conceptId: concept.id, date: lesson.date };
  const original = lessons[source.lessonId];
  if (!original || original.kind === 'weekly' || original.date !== source.date || !original.concepts.some(item => item.id === source.conceptId)) fail('unknown-source-concept');
  return source;
}

export function normalizeSnapshot(input, lessons) {
  // Accept the exact Wrangler KV envelope or a direct synthetic/core snapshot.
  if (input && Object.hasOwn(input, 'data')) {
    if (!Number.isInteger(input.rev) || input.rev < 0) fail('invalid-progress-envelope');
    input = input.data;
  }
  if (input === null) return null;
  let progress;
  try { progress = C.validateProgress(input); } catch { fail('invalid-progress'); }
  for (const [id, state] of Object.entries(progress.weekly)) {
    const lesson = lessons[id];
    if (!lesson || lesson.kind !== 'weekly' || state.startedOn < lesson.weekly.opensOn) fail('unknown-weekly-progress');
    for (const mode of MODES) {
      try { C.practiceConcepts(progress, lesson, mode); } catch { fail('changed-weekly-source'); }
    }
  }
  for (const [id, saved] of Object.entries(progress.lessons)) {
    const lesson = lessons[id];
    if (!lesson) fail('unknown-progress-lesson');
    if (lesson.kind === 'weekly' && !progress.weekly[id]) fail('missing-weekly-selection');
    for (const mode of MODES) for (const [conceptId, state] of Object.entries(saved[mode])) {
      const concept = lesson.concepts.find(item => item.id === conceptId);
      if (!concept) fail('unknown-progress-concept');
      sourceConcept(lesson, concept, lessons);
      for (const attempt of [...state.initial, ...state.reviews, ...(state.pending ? [state.pending] : [])]) {
        if (!concept[mode].some(question => question.id === attempt.questionId) || !C.isOpen(lesson, attempt.date)) fail('unknown-progress-question');
      }
    }
  }
  return progress;
}

export function planWeekly({ progress: input, catalog, lessons, releaseDate }) {
  const window = practiceWindow(releaseDate);
  const entries = L.validateCatalog(Array.isArray(catalog) ? { schemaVersion: 1, lessons: catalog } : catalog);
  for (const entry of entries) {
    const lesson = lessons[entry.id];
    C.validateLesson(lesson);
    if (lesson.date !== entry.date || (lesson.kind === 'weekly') !== (entry.kind === 'weekly')) fail('catalog-mismatch');
    if (lesson.kind === 'weekly' && !same(lesson.weekly, entry.weekly)) fail('catalog-mismatch');
    const sources = new Set();
    for (const concept of lesson.concepts) {
      const key = keyFor(sourceConcept(lesson, concept, lessons));
      if (sources.has(key)) fail('duplicate-source-concept');
      sources.add(key);
    }
  }
  const progress = normalizeSnapshot(input, lessons);
  const skip = reason => ({ status: 'skipped', reason, releaseDate });
  if (entries.some(entry => entry.kind === 'weekly' && entry.date === releaseDate)) return skip('already-published');
  if (!progress) return skip('no-synced-progress');
  const evidence = new Map();
  for (const [id, saved] of Object.entries(progress.lessons)) {
    const lesson = lessons[id];
    for (const mode of MODES) for (const [conceptId, state] of Object.entries(saved[mode])) {
      const concept = lesson.concepts.find(item => item.id === conceptId);
      const source = sourceConcept(lesson, concept, lessons), key = keyFor(source);
      for (const list of ['initial', 'reviews']) for (const attempt of state[list]) {
        if (attempt.date >= window.endExclusive) continue;
        const item = evidence.get(key) || { sourceConcept: { ...source }, lastPracticed: attempt.date, currentWindow: false, needsPractice: false, modes: { try: false, say: false } };
        item.lastPracticed = item.lastPracticed > attempt.date ? item.lastPracticed : attempt.date;
        item.currentWindow ||= attempt.date >= window.start;
        item.modes[mode] = true;
        // A later success never erases difficulty in a first attempt or weekly question.
        if (list === 'initial' && (attempt.helped || attempt.outcome !== (mode === 'try' ? 'independent' : 'gotIt'))) item.needsPractice = true;
        evidence.set(key, item);
      }
    }
  }
  const ranked = [...evidence.values()].sort((a, b) => Number(b.needsPractice) - Number(a.needsPractice) || b.lastPracticed.localeCompare(a.lastPracticed) || keyFor(a.sourceConcept).localeCompare(keyFor(b.sourceConcept)));
  const current = ranked.filter(item => item.currentWindow), older = ranked.filter(item => !item.currentWindow);
  if (!current.length) return skip('no-new-practice');
  const selected = [...current.slice(0, 4 - Math.min(1, older.length)), ...older.slice(0, 1)];
  if (selected.length > 1 && selected.every(item => item.needsPractice)) {
    // Keep a successful sample without dropping the last current-week concept.
    const successful = current.find(item => !item.needsPractice);
    const currentSlots = selected.filter(item => item.currentWindow);
    if (successful && currentSlots.length > 1) selected[selected.indexOf(currentSlots.at(-1))] = successful;
    else {
      const oldSuccess = older.find(item => !item.needsPractice);
      const oldSlot = selected.findIndex(item => !item.currentWindow);
      if (oldSuccess && oldSlot >= 0) selected[oldSlot] = oldSuccess;
    }
  }
  return { schemaVersion: 1, status: 'planned', child: 'aiden', releaseDate, lessonId: `weekly-${releaseDate}`, window, snapshotHash: hash(progress), concepts: selected };
}

export function generationBrief(plan, lessons) {
  if (plan.status !== 'planned') fail('plan-not-ready');
  // Sort public authoring inputs by source identity, never by personal performance.
  const concepts = [...plan.concepts].sort((a, b) => keyFor(a.sourceConcept).localeCompare(keyFor(b.sourceConcept))).map(({ sourceConcept: source }) => {
    const original = lessons[source.lessonId].concepts.find(item => item.id === source.conceptId);
    return { id: `review-${hash(keyFor(source)).slice(0, 12)}`, title: original.title, sourceConcept: source, originalConcept: original };
  });
  return { schemaVersion: 1, bundle: { schemaVersion: 1, id: plan.lessonId, date: plan.releaseDate, title: 'Weekly Review', kind: 'weekly', weekly: { schemaVersion: 2, practiceStart: plan.window.start, practiceEnd: plan.window.endExclusive, opensOn: plan.releaseDate, conceptCount: concepts.length } }, concepts,
    instructions: ['Write three original Try it and three original Say it variants per concept.', 'Use complete sentences, one or two plausible distractors when appropriate, and natural accepted alternatives.', 'Change the evidence or situation; never republish an old question with a new ID.', 'Keep spokenQuestion and answerText aligned with the scene; use normal-speed OpenAI speech after review.', 'Copy only bundle metadata and authored id/title/sourceConcept/try/say to lesson-source.json. Never copy plan, progress, or originalConcept.'] };
}

function inside(path, root) {
  const rel = relative(root, path);
  return rel !== '' && !rel.startsWith('..' + (process.platform === 'win32' ? '\\' : '/')) && rel !== '..' && !isAbsolute(rel);
}
function privatePath(path, root) {
  const absolute = resolve(path);
  if (!inside(absolute, root)) fail('private-path-required');
  // Existing junctions/symlinks must not redirect a private file into docs or Git.
  let existing = absolute;
  while (!existsSync(existing)) existing = dirname(existing);
  const realRoot = existsSync(root) ? realpathSync(root) : resolve(realpathSync(dirname(root)), root.slice(dirname(root).length + 1));
  if (existing !== root && !inside(realpathSync(existing), realRoot) && realpathSync(existing) !== realRoot && existsSync(root)) fail('private-path-required');
  return absolute;
}
const readJSON = path => {
  const bytes = readFileSync(path);
  if (bytes.length > LIMIT) fail('input-too-large');
  return JSON.parse(bytes.toString('utf8'));
};
function saveJSON(path, value) {
  const temporary = path + '.tmp';
  writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  renameSync(temporary, path);
}
export async function loadPublicInputs(repoRoot = REPO, { excludeLessonId } = {}) {
  const entries = L.validateCatalog(readJSON(join(repoRoot, 'docs/nativecamp/lessons/catalog.json')));
  const catalog = entries.filter(entry => entry.id !== excludeLessonId);
  const lessons = await L.readLessons(catalog, { base: join(repoRoot, 'docs/nativecamp'), fetchImpl: async path => new Response(readFileSync(path)) });
  return { catalog, lessons, excludedEntry: entries.find(entry => entry.id === excludeLessonId) };
}
export async function writeWeeklyPlan({ repoRoot = REPO, snapshotPath, snapshot, releaseDate, resume = false, privateRoot = join(repoRoot, '.local/nativecamp-weekly') }) {
  practiceWindow(releaseDate);
  if (resume && (snapshotPath !== undefined || snapshot !== undefined)) fail('resume-uses-saved-progress');
  privateRoot = resolve(privateRoot);
  const expected = resolve(repoRoot, '.local/nativecamp-weekly');
  if (privateRoot !== expected) fail('private-path-required');
  mkdirSync(privateRoot, { recursive: true });
  if (realpathSync(privateRoot) !== privateRoot) fail('private-path-required');
  const directory = privatePath(join(privateRoot, releaseDate), privateRoot);
  const planPath = privatePath(join(directory, 'plan.json'), privateRoot);
  mkdirSync(directory, { recursive: true });
  const lock = join(directory, '.planner-lock');
  let handle;
  try {
    // Exclusive creation prevents concurrent schedules from replacing a frozen plan.
    const { openSync, closeSync } = await import('node:fs');
    try { handle = openSync(lock, 'wx', 0o600); } catch { fail('planner-busy'); }
    closeSync(handle);
    const receiptPath = privatePath(join(directory, 'automation.json'), privateRoot);
    if (existsSync(receiptPath) && readJSON(receiptPath).status === 'published') return { status: 'skipped', reason: 'already-published', releaseDate };
    if (existsSync(planPath)) {
      const savedProgress = readJSON(privatePath(join(directory, 'progress.json'), privateRoot));
      const plan = readJSON(planPath);
      if (plan.lessonId !== `weekly-${releaseDate}` || plan.releaseDate !== releaseDate || plan.child !== 'aiden') fail('saved-plan-invalid');
      // A locally registered draft is an output of this plan, not a pre-existing
      // source pack. Rebuild only from the frozen snapshot and original sources.
      const inputs = await loadPublicInputs(repoRoot, { excludeLessonId: plan.lessonId });
      const rebuilt = planWeekly({ progress: savedProgress, ...inputs, releaseDate });
      if (!same(plan, rebuilt) || plan.status !== 'planned') fail('saved-plan-invalid');
      const brief = generationBrief(plan, inputs.lessons), briefPath = privatePath(join(directory, 'generation-brief.json'), privateRoot);
      const draft = inputs.excludedEntry;
      if (draft && (draft.kind !== 'weekly' || draft.date !== releaseDate || !same(draft.weekly, brief.bundle.weekly))) fail('saved-draft-mismatch');
      if (existsSync(briefPath) && !same(readJSON(briefPath), brief)) fail('saved-brief-invalid');
      if (!existsSync(briefPath)) saveJSON(briefPath, brief);
      return { status: 'resumed', releaseDate, lessonId: plan.lessonId, conceptCount: plan.concepts.length };
    }
    if (resume) fail('saved-plan-missing');
    const inputs = await loadPublicInputs(repoRoot);
    const progress = normalizeSnapshot(snapshotPath ? readJSON(privatePath(snapshotPath, privateRoot)) : snapshot, inputs.lessons);
    const proposed = planWeekly({ progress, ...inputs, releaseDate });
    if (proposed.status === 'skipped') return proposed;
    saveJSON(privatePath(join(directory, 'progress.json'), privateRoot), progress);
    saveJSON(planPath, proposed);
    saveJSON(privatePath(join(directory, 'generation-brief.json'), privateRoot), generationBrief(proposed, inputs.lessons));
    return { status: 'planned', releaseDate, lessonId: proposed.lessonId, conceptCount: proposed.concepts.length };
  } finally {
    if (handle !== undefined) rmSync(lock, { force: true });
  }
}

async function main() {
  const args = process.argv.slice(2), options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--stdin') options.stdin = true;
    else if (args[i] === '--resume') options.resume = true;
    else if (['--snapshot', '--release'].includes(args[i]) && args[i + 1]) options[args[i].slice(2)] = args[++i];
    else fail('invalid-arguments');
  }
  if (!options.release || [options.snapshot, options.stdin, options.resume].filter(Boolean).length !== 1) fail('invalid-arguments');
  let snapshot;
  if (options.stdin) {
    const chunks = []; let size = 0;
    for await (const chunk of process.stdin) { size += chunk.length; if (size > LIMIT) fail('input-too-large'); chunks.push(chunk); }
    snapshot = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  const result = await writeWeeklyPlan({ snapshotPath: options.snapshot, snapshot, releaseDate: options.release, resume: options.resume });
  process.stdout.write(JSON.stringify(result) + '\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(() => {
  // Never echo provider output, raw JSON, filesystem paths, or saved answers.
  process.stderr.write('Weekly planning failed. Check the private input and saved plan.\n');
  process.exitCode = 1;
});
