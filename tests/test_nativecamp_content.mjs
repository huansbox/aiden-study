import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readPrivateAudioPack, loadPrivateAudioPack } from '../learning-tasks/nativecamp-review-pilot/source/load_nativecamp_audio.mjs';

const app = new URL('../docs/nativecamp/', import.meta.url);
const lesson = JSON.parse(readFileSync(new URL('lessons/2026-09-15.json', app), 'utf8'));
const manifest = JSON.parse(readFileSync(new URL('../learning-tasks/nativecamp-review-pilot/source/nativecamp-audio-manifest.json', import.meta.url), 'utf8'));
const modes = ['try', 'say'];
const questions = lesson.concepts.flatMap(c => modes.flatMap(mode => c[mode]));
const normalize = text => text.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const speech = new Map(manifest.tts.map(item => [item.file, item]));

test('lesson has complete, distinct original variants and closed Try answers', () => {
  assert.equal(lesson.schemaVersion, 1);
  assert.equal(lesson.id, '2026-09-15');
  assert.deepEqual(lesson.concepts.map(c => c.id), ['is-are', 'odd-even', 'too-many']);
  assert.equal(new Set(questions.map(q => q.id)).size, 18);
  let orderCount = 0;
  for (const concept of lesson.concepts) {
    for (const mode of modes) {
      assert.equal(concept[mode].length, 3);
      assert.equal(new Set(concept[mode].map(q => JSON.stringify(q.scene))).size, 3);
      for (const q of concept[mode]) {
        assert.match(q.id, new RegExp(`^${concept.id}-${mode}-[123]$`));
        assert.ok(q.prompt && q.instruction && q.answerText);
        assert.ok(['cats', 'dogs', 'trees', 'books', 'toys', 'numbers', 'hats'].includes(q.scene.kind));
        if (q.scene.kind === 'numbers') assert.ok(Number.isInteger(q.scene.number));
        else assert.ok(Number.isInteger(q.scene.count) && q.scene.count >= 1 && q.scene.count <= 20);
        if (mode === 'say') {
          assert.ok(Array.isArray(q.accepted) && q.accepted.length > 0);
          continue;
        }
        if (q.type === 'choice') {
          assert.equal(new Set(q.choices.map(c => c.id)).size, q.choices.length);
          assert.ok(q.choices.some(c => c.id === q.answer));
          assert.ok(q.choices.length >= 2);
        } else {
          assert.equal(q.type, 'order');
          orderCount++;
          const ids = q.tokens.map(t => t.id);
          assert.equal(new Set(ids).size, ids.length);
          for (const order of q.acceptedOrders) assert.deepEqual([...order].sort(), [...ids].sort());
          const token = new Map(q.tokens.map(t => [t.id, t.text]));
          assert.ok(q.acceptedOrders.some(order => normalize(order.map(id => token.get(id)).join(' ')) === normalize(q.answerText)));
        }
      }
    }
  }
  assert.ok(orderCount >= 2);
});

test('scene counts, grammar, parity and stated capacities agree with answers', () => {
  const numbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  for (const concept of lesson.concepts) for (const q of [...concept.try, ...concept.say]) {
    if (concept.id === 'is-are') {
      assert.match(q.answerText, q.scene.count === 1 ? /^There is / : /^There are /);
      if (q.scene.count > 1) assert.ok(q.answerText.toLowerCase().includes(numbers[q.scene.count]));
      if (q.type === 'choice') assert.equal(q.answer, q.scene.count === 1 ? 'is' : 'are');
    } else if (concept.id === 'odd-even') {
      const count = q.scene.kind === 'numbers' ? q.scene.number : q.scene.count;
      const parity = count % 2 ? 'odd' : 'even';
      assert.ok(q.answerText.toLowerCase().startsWith(numbers[count] + ' '));
      assert.match(q.answerText, new RegExp(`\\b${parity}\\b`));
      if (q.type === 'choice') assert.equal(q.answer, parity);
    } else {
      const capacity = q.scene.heading.match(/room for (\d+) (\w+)/);
      assert.ok(capacity, `${q.id} needs a visible, objective capacity`);
      assert.ok(q.scene.count > Number(capacity[1]));
      assert.equal(capacity[2], q.scene.kind);
      assert.ok(q.answerText.includes('too many ' + q.scene.kind));
    }
  }
});

test('all spoken questions and answers resolve to verified files without cloze or order leaks', () => {
  const references = new Set();
  let privateCount = 0;
  for (const q of questions) for (const role of ['question', 'answer']) {
    const ref = q.audio[role];
    if (typeof ref === 'object') {
      assert.equal(role, 'question');
      assert.deepEqual(Object.keys(ref), ['private']);
      assert.match(ref.private, /^[a-z0-9-]{1,80}$/);
      privateCount++;
      continue;
    }
    assert.match(ref, /^audio\/[a-z0-9-]+\.mp3$/);
    const entry = speech.get(ref);
    assert.ok(entry, ref);
    references.add(ref);
    const bytes = readFileSync(new URL(ref, app));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
    assert.equal(bytes.length, entry.bytes);
    assert.equal(entry.codec, 'mp3');
    assert.equal(entry.decode, 'passed');
    assert.ok(entry.durationSeconds >= 0.4 && entry.rmsDbfs > -60);
    if (role === 'answer') assert.equal(entry.text, q.answerText);
    if (role === 'question' && (q.type === 'order' || q.prompt.includes('___'))) {
      assert.ok(!normalize(entry.text).includes(normalize(q.answerText)), `${q.id} speaks its answer`);
    }
  }
  assert.equal(privateCount, 1);
  assert.equal(references.size, 35);
  assert.deepEqual(readdirSync(new URL('audio/', app)).sort(), [...references].map(ref => ref.slice(6)).sort());
  const text = JSON.stringify(lesson);
  assert.ok(!/[\u3400-\u9fff]|\p{Extended_Pictographic}/u.test(text));
  assert.ok(!/https?:|signature=|base64|source\/private|\.webm/.test(text));
});

test('local private-pack loader validates all entries before writing KV', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'nativecamp-pack-'));
  const path = join(dir, 'pack.json');
  const good = { contentType: 'audio/mpeg', base64: Buffer.concat([Buffer.from('ID3'), Buffer.alloc(200)]).toString('base64') };
  const writes = [];
  const kv = { async put(...args) { writes.push(args); } };
  try {
    writeFileSync(path, JSON.stringify({ 'sample-question': good }));
    assert.deepEqual(Object.keys(await readPrivateAudioPack(path)), ['sample-question']);
    await loadPrivateAudioPack(kv, path);
    assert.equal(writes[0][0], 'c:nativecamp:audio:sample-question');
    writes.length = 0;
    writeFileSync(path, JSON.stringify({ 'sample-question': good, '../escape': good }));
    await assert.rejects(loadPrivateAudioPack(kv, path), /Invalid private audio clip id/);
    assert.equal(writes.length, 0);
    writeFileSync(path, JSON.stringify({ 'sample-question': { ...good, base64: 'not audio' } }));
    await assert.rejects(readPrivateAudioPack(path), /Invalid MP3 payload/);
  } finally { unlinkSync(path); rmdirSync(dir); }
});
