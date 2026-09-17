import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

test('14 段親錄的來源、處理報告與正式資產一致，沒有把訊號審計當成人工驗音', () => {
  const base = new URL('../docs-dev/zhuyin-parent-audio/', import.meta.url);
  const read = name => JSON.parse(readFileSync(new URL(name, base)));
  const hash = url => createHash('sha256').update(readFileSync(url)).digest('hex');
  const recipe = read('recipe.json'), build = read('build.json'), audit = read('audit.json');
  const acceptance = read('acceptance.json');
  assert.equal(acceptance.status, 'accepted');
  assert.equal(acceptance.reviewer, 'user');
  assert.match(acceptance.reviewedCommit, /^[a-f0-9]{40}$/);
  const content = JSON.parse(readFileSync(new URL('../docs/zhuyin/content.json', import.meta.url)));
  const keys = [...content.symbols.map(s => s.audio), ...content.syllables.flatMap(s => [s.audio, ...(s.word ? [s.word.audio] : [])])];
  const audio = new URL('../docs/zhuyin/assets/audio/', import.meta.url);
  assert.deepEqual(recipe.items.map(i => i.key), keys);
  assert.deepEqual(build.items.map(i => i.key), keys);
  assert.deepEqual(audit.items.map(i => i.key), keys);
  assert.deepEqual(readdirSync(audio).filter(f => !f.startsWith('.')).sort(), keys.map(k => k + '.m4a').sort());
  assert.equal(build.recipeSha256, hash(new URL('recipe.json', base)));
  assert.equal(build.pronunciationReviewed, false);
  assert.equal(build.iPadVerified, false);
  assert.deepEqual(audit.errors, []);
  for (const item of recipe.items) {
    assert.match(item.inputLabel, /MacBook Pro/);
    assert.equal(hash(new URL(item.source, base)), item.sourceSha256);
    const outputHash = hash(new URL(item.key + '.m4a', audio));
    assert.equal(build.items.find(i => i.key === item.key).sha256, outputHash);
    assert.equal(audit.items.find(i => i.key === item.key).sha256, outputHash);
  }
});
