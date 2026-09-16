// 候選與正式來源隔離；驗資料覆蓋、來源／審計對應，不能證明發音正確。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const base = new URL('../docs-dev/zhuyin-audio-candidates/', import.meta.url);
const read = name => JSON.parse(readFileSync(new URL(name, base), 'utf8'));
const hash = url => createHash('sha256').update(readFileSync(url)).digest('hex');
const contentUrl = new URL('../docs/zhuyin/content.json', import.meta.url);
const content = JSON.parse(readFileSync(contentUrl, 'utf8'));
const recipe = read('recipe.json'), build = read('build.json'), audit = read('audit.json');
const keys = [...content.symbols.map(s => s.audio),
  ...content.syllables.flatMap(s => [s.audio, ...(s.word ? [s.word.audio] : [])])];

test('候選覆蓋全部內容 key；生成、來源、審計 hash 均對應本次成品', () => {
  assert.equal(recipe.status, 'candidate-unreviewed');
  assert.equal(audit.pronunciationReviewed, false);
  assert.equal(audit.iPadVerified, false);
  assert.deepEqual(recipe.items.map(i => i.key), keys);
  assert.deepEqual(build.items.map(i => i.key), keys);
  assert.deepEqual(audit.items.map(i => i.key), keys);
  assert.deepEqual(readdirSync(new URL('audio/', base)).sort(), keys.map(k => k + '.m4a').sort());
  assert.deepEqual(audit.errors, []);
  assert.deepEqual(audit.missing, []);
  assert.deepEqual(audit.orphans, []);
  assert.equal(build.contentSha256, hash(contentUrl));
  assert.equal(build.recipeSha256, hash(new URL('recipe.json', base)));
  assert.equal(build.scriptSha256, hash(new URL('../scripts/zhuyin_audio.py', import.meta.url)));
  for (const item of build.items) {
    assert.equal(item.sha256, hash(new URL(item.file, base)), item.key);
    assert.equal(item.sourceSha256, hash(new URL(item.source, base)), item.key);
    assert.equal(audit.items.find(i => i.key === item.key).sha256, item.sha256, item.key);
  }
});

test('真實內容搭配候選 key：兩活動可出題、分段與四聲無缺段、詞語對應存在', () => {
  const html = readFileSync(new URL('../docs/zhuyin/index.html', import.meta.url), 'utf8');
  const core = html.match(/\/\/ <zhuyin-core-pure>([\s\S]*?)\/\/ <\/zhuyin-core-pure>/)[1];
  const { zyBuildPool, zyBuildBatch, zyDemoChain, zyToneOptions } = new Function(core +
    '\nreturn { zyBuildPool, zyBuildBatch, zyDemoChain, zyToneOptions };')();
  const hasAudio = k => keys.includes(k);
  const symbols = Object.fromEntries(content.symbols.map(s => [s.glyph, s.audio]));
  const progress = { schemaVersion: 1, cards: Object.fromEntries(content.symbols.map(s =>
    ['sym:' + s.glyph, { introduced: true }])) };
  const pool = zyBuildPool(content.circles[0].entryOrder, symbols, content.syllables, progress);
  for (const kind of ['sym', 'syl']) {
    const selected = pool.filter(c => c.kind === kind);
    assert.equal(zyBuildBatch({ pool: selected, progress, hasAudio, max: 99, rng: () => 0 }).length, selected.length);
  }
  for (const s of content.syllables) {
    assert.deepEqual(zyDemoChain(s, symbols, hasAudio), [symbols[s.onset], symbols[s.rime], s.audio]);
    assert.ok(zyToneOptions(s, content.syllables, hasAudio).every(o => hasAudio(o.audio)));
    if (s.word) assert.ok(hasAudio(s.word.audio));
  }
});
