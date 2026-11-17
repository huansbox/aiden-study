import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import model from '../learning-tasks/giving-more-precious/source/content.js';
import previous from '../learning-tasks/astrea/source/content.js';
import reading from '../docs/mind-map-reading.js';

const {TITLE, STORAGE_KEY, LEGACY_STORAGE_KEY, MAX_NOTE_LENGTH, BRANCHES, GIVING_READINGS,
  cleanState, migrateLegacy, saveNotes} = model;

test('白話例子依原文保留兩次幫助的情節、人物與結果', () => {
  const [liszt, chopin, stage, girl, lesson] = BRANCHES.map(branch => branch.example.join('。'));
  assert.match(liszt, /鍵盤魔王.*願意幫助後輩/);
  assert.match(chopin, /離開波蘭.*巴黎.*很窮.*還沒出名/);
  assert.match(stage, /燈熄.*李斯特悄悄讓蕭邦上臺.*以為是李斯特.*叫好.*燈亮.*換了人.*一下子就出名/);
  assert.match(girl, /海報.*李斯特的學生.*沒見過.*請他原諒.*為了過日子/);
  assert.match(lesson, /先聽她彈.*教她怎麼彈.*收她當學生.*海報.*李斯特會親自到場/);

  for (const branch of BRANCHES) {
    assert.equal(branch.prompts.length, branch.example.length);
    assert.deepEqual(saveNotes(branch, branch.example), branch.example);
  }
});

test('舊存檔保留完成或編輯進度，挑過的枝對應白話例句', () => {
  const picks = [['support'], ['chopin-poor'], ['stage-debut'], ['girl-pretend'], ['lesson-method']];
  const entries = BRANCHES.map(branch => branch.example);
  assert.notEqual(STORAGE_KEY, LEGACY_STORAGE_KEY);
  assert.notEqual(STORAGE_KEY, previous.STORAGE_KEY);
  assert.deepEqual(migrateLegacy({picks, step: 4, finished: true}), {
    entries, step: 4, finished: true, returnToMap: false, draft: null
  });
  const partial = migrateLegacy({picks: [picks[0], ['unknown'], picks[2]], step: 3, finished: true});
  assert.equal(partial.step, 1);
  assert.equal(partial.finished, false);
  assert.deepEqual(partial.entries, [entries[0], null, entries[2], null, null]);
});

test('可保留自寫短句與編輯中草稿，空白或不完整的分枝不可算完成', () => {
  const custom = [' 大家都叫他鍵盤魔王！ ', '他會彈琴，也常幫人。'];
  const entries = [custom, ...BRANCHES.slice(1).map(branch => branch.example)];
  const draft = {step: 0, notes: ['保留這句', '  ']};
  const valid = cleanState({entries, draft, step: 0, returnToMap: true});
  assert.deepEqual(valid.entries[0], ['大家都叫他鍵盤魔王！', '他會彈琴，也常幫人。']);
  assert.equal(valid.returnToMap, true);
  assert.deepEqual(valid.draft, draft);
  assert.equal(cleanState({...valid, finished: true}).draft, null);
  assert.equal(cleanState({entries: [['第一句', ' ']], step: 4, finished: true}).finished, false);
  assert.equal(saveNotes(BRANCHES[0], ['第一句']), null);
  assert.equal(saveNotes(BRANCHES[0], ['長'.repeat(MAX_NOTE_LENGTH + 1), '夠了'])[0].length, MAX_NOTE_LENGTH);
  assert.equal(cleanState({entries: [['錯誤數量']], step: 4, draft: {step: 4, notes: ['舊草稿']}}).draft, null);
});

test('字嗨按語境選音，已存的文字仍為原字', () => {
  reading.READING_PHRASES.push(...GIVING_READINGS);
  const vs = String.fromCodePoint(0xE01E1);
  assert.equal(reading.withReadingVariants('音樂、彈鋼琴、日子過得、教她怎麼彈、她為了過日子'),
    '音樂' + vs + '、彈' + vs + '鋼琴、日子過得' + vs + '、教' + vs + '她怎麼彈' + vs + '、她為' + vs + '了過日子');
  assert.doesNotMatch(JSON.stringify(BRANCHES), /[\u{E0100}-\u{E01EF}]/u);
});

test('原入口保留，版本化的網頁資產與來源同步', () => {
  const registry = JSON.parse(readFileSync(new URL('../docs/registry.json', import.meta.url), 'utf8'));
  assert.deepEqual(registry.mindMaps.find(article => article.id === 'giving-more-precious'), {
    id: 'giving-more-precious', title: TITLE, date: '2026-11-17', path: 'giving-more-precious-mind-map/'
  });
  assert.ok(registry.mindMaps.some(article => article.id === 'astrea'));
  const page = readFileSync(new URL('../docs/giving-more-precious-mind-map/index.html', import.meta.url), 'utf8');
  const revisions = [...page.matchAll(/(?:style\.css|content\.js|app\.js)\?v=([^"]+)"/g)].map(match => match[1]);
  assert.equal(revisions.length, 3);
  assert.equal(new Set(revisions).size, 1);
  execFileSync(process.execPath, ['learning-tasks/giving-more-precious/build.mjs', '--check'], {
    cwd: new URL('../', import.meta.url), stdio: 'pipe'
  });
});
