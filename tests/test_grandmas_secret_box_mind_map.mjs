import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import model from '../learning-tasks/grandmas-secret-box/source/content.js';
import previous from '../learning-tasks/giving-more-precious/source/content.js';
import reading from '../docs/mind-map-reading.js';

const {TITLE, STORAGE_KEY, MAX_NOTE_LENGTH, BRANCHES, BOX_READINGS, cleanState, saveNotes} = model;

test('順時針五枝保留盒子、跌傷、相片和陪伴之間的因果', () => {
  const [box, curiosity, accident, photos, visit] = BRANCHES.map(branch => branch.example.join('。'));
  assert.match(box, /枕頭旁.*小盒子.*腳步聲.*蓋/);
  assert.match(curiosity, /我想假裝.*打翻盒子.*媽媽猜.*珠寶/);
  assert.match(accident, /接電話.*跌傷.*醫院.*換洗衣服.*哥哥.*寶貝盒子.*陪她/);
  assert.match(photos, /哥哥.*手一滑.*掉到地上.*奶奶和爺爺的相片.*有一張.*牽手.*笑/);
  assert.match(visit, /奶奶.*想念爺爺.*相片.*「爺爺」.*醫院.*陪奶奶/);
  for (const branch of BRANCHES) {
    assert.equal(branch.prompts.length, branch.example.length);
    assert.deepEqual(saveNotes(branch, branch.example), branch.example);
  }
});

test('新篇進度獨立，能還原自寫與草稿，必填內容缺少時不能完成', () => {
  assert.notEqual(STORAGE_KEY, previous.STORAGE_KEY);
  assert.notEqual(STORAGE_KEY, previous.LEGACY_STORAGE_KEY);
  const custom = [' 我想看盒裡的東西 ', '媽媽以為那是珠寶'];
  const entries = BRANCHES.map((branch, index) => index === 1 ? custom : branch.example);
  const draft = {step: 1, notes: ['我想看看盒子', '']};
  const revising = cleanState({entries, step: 1, returnToMap: true, draft});
  assert.deepEqual(revising.entries[1], ['我想看盒裡的東西', '媽媽以為那是珠寶']);
  assert.deepEqual(revising.draft, draft);
  assert.equal(revising.returnToMap, true);
  assert.equal(cleanState({...revising, finished: true}).finished, true);
  assert.equal(cleanState({...revising, finished: true}).draft, null);
  assert.equal(cleanState({entries: [['沒填完', ' ']], step: 4, finished: true}).step, 0);
  assert.equal(cleanState({entries: [['沒填完', ' ']], step: 4, finished: true}).finished, false);
  assert.equal(saveNotes(BRANCHES[0], ['少一個答案']), null);
  assert.equal(saveNotes(BRANCHES[0], ['長'.repeat(MAX_NOTE_LENGTH + 1), '蓋起來'])[0].length, MAX_NOTE_LENGTH);
});

test('奶奶、爺爺、盒子與常見詞按語境顯示注音，文字資料保留原字', () => {
  reading.READING_PHRASES.push(...BOX_READINGS);
  const light = String.fromCodePoint(0xE01E1);
  const fourth = String.fromCodePoint(0xE01E2);
  assert.equal(reading.withReadingVariants('奶奶的祕密盒子、爺爺的相片、哥哥手一滑、媽媽笑得很開心'),
    `奶奶${light}的祕密盒子${light}、爺爺${light}的相片、哥哥${light}手一${fourth}滑、媽媽${light}笑得${light}很開心`);
  assert.doesNotMatch(JSON.stringify(BRANCHES), /[\u{E0100}-\u{E01EF}]/u);
});

test('文章索引、manifest、版本化資產與可編輯來源一致', () => {
  const registry = JSON.parse(readFileSync(new URL('../docs/registry.json', import.meta.url), 'utf8'));
  const path = 'grandmas-secret-box-mind-map/';
  assert.deepEqual(registry.mindMaps.find(article => article.id === 'grandmas-secret-box'), {
    id: 'grandmas-secret-box', title: TITLE, date: '2026-11-24', path
  });
  const entry = new URL('../docs/' + path, import.meta.url);
  const page = readFileSync(new URL('index.html', entry), 'utf8');
  const revisions = [...page.matchAll(/(?:style\.css|content\.js|app\.js)\?v=([^"]+)"/g)].map(match => match[1]);
  assert.equal(revisions.length, 3);
  assert.equal(new Set(revisions).size, 1);
  const manifest = JSON.parse(readFileSync(new URL('app.webmanifest', entry), 'utf8'));
  assert.equal(manifest.short_name, TITLE);
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  execFileSync(process.execPath, ['learning-tasks/grandmas-secret-box/build.mjs', '--check'], {
    cwd: new URL('../', import.meta.url), stdio: 'pipe'
  });
});
