import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import model from '../learning-tasks/giving-more-precious/source/content.js';
import previous from '../learning-tasks/astrea/source/content.js';
import reading from '../docs/mind-map-reading.js';

const {TITLE, STORAGE_KEY, BRANCHES, GIVING_READINGS, cleanState, branchWords, mapWordCount} = model;

test('付出比收穫更可貴：所有選法保留兩次幫助的情節與結果，最多 60 字', () => {
  assert.equal(TITLE, '付出比收穫更可貴');
  const combinations = BRANCHES.reduce((sets, branch) =>
    sets.flatMap(picks => branch.choices.map(choice => [...picks, [choice.id]])), [[]]);
  assert.equal(combinations.length, 32);

  // 依第 20、21 頁正文核對兩則故事的起因、做法與結果。
  for (const picks of combinations) {
    assert.equal(cleanState({picks, step: 4, finished: true}).finished, true);
    assert.ok(mapWordCount(picks) <= 60);
    const [liszt, chopin, stage, girl, lesson] = BRANCHES.map((branch, i) =>
      branch.label + branchWords(branch, picks[i]).join(''));
    assert.match(liszt, /李斯特.*鍵盤魔王.*(提攜|樂助)後輩/);
    assert.match(chopin, /蕭邦.*流亡巴黎.*窮.*無名/);
    assert.match(stage, /讓舞臺.*熄燈換手.*一[夕夜]成名/);
    assert.match(girl, /姑娘.*為(生計|生活).*[冒假]稱學生/);
    assert.match(lesson, /李斯特收徒.*教(她彈|彈法).*將演奏/);
  }
});

test('付出比收穫更可貴：存檔獨立、只能保留合法選項、缺枝時回到該步', () => {
  assert.notEqual(STORAGE_KEY, previous.STORAGE_KEY);
  const picks = BRANCHES.map(branch => [branch.choices[0].id]);
  assert.deepEqual(cleanState({picks, step: 4, finished: true}), {picks, step: 4, finished: true});
  assert.deepEqual(cleanState({picks, step: 1, finished: false}), {picks, step: 1, finished: false});

  const unknown = ['unknown', ...picks[0], ...picks[0], BRANCHES[0].choices[1].id];
  const broken = [unknown, picks[1], ['obsolete'], ...picks.slice(3)];
  assert.deepEqual(cleanState({picks: broken, step: 4, finished: true}), {
    picks: [picks[0], picks[1], [], ...picks.slice(3)], step: 2, finished: false
  });
});

test('付出比收穫更可貴：字嗨按語境顯示讀音，選項仍為原字', () => {
  reading.READING_PHRASES.push(...GIVING_READINGS);
  const vs = String.fromCodePoint(0xE01E1);
  assert.equal(reading.withReadingVariants('音樂、彈琴、彈一遍、教她彈、教彈法、為生計、為生活、重新點亮'),
    `音樂${vs}、彈${vs}琴、彈${vs}一遍、教${vs}她彈${vs}、教${vs}彈${vs}法、為${vs}生計、為${vs}生活、重${vs}新點亮`);
  assert.doesNotMatch(JSON.stringify(BRANCHES), /[\u{E0100}-\u{E01EF}]/u);
});

test('付出比收穫更可貴：文章索引與來源／部署產物一致', () => {
  const registry = JSON.parse(readFileSync(new URL('../docs/registry.json', import.meta.url), 'utf8'));
  assert.deepEqual(registry.mindMaps.find(article => article.id === 'giving-more-precious'), {
    id: 'giving-more-precious', title: TITLE, date: '2026-11-17', path: 'giving-more-precious-mind-map/'
  });
  assert.ok(registry.mindMaps.some(article => article.id === 'astrea'));
  execFileSync(process.execPath, ['learning-tasks/giving-more-precious/build.mjs', '--check'], {
    cwd: new URL('../', import.meta.url), stdio: 'pipe'
  });
});
