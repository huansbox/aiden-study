'use strict';

const TITLE = '付出比收穫更可貴';
const STORAGE_KEY = 'aiden_mind_map_giving_more_precious_20261117_v1';

// 字嗨 v1.500 選音只用於畫面。
const GIVING_READINGS = [
  ['為了', {0: 1}], ['為什麼', {0: 1}], ['為生計', {0: 1}],
  ['為生活', {0: 1}], ['彈琴', {0: 1}], ['彈一遍', {0: 1}],
  ['教她彈', {0: 1, 2: 1}], ['教彈法', {0: 1, 1: 1}], ['彈法', {0: 1}], ['姑娘', {1: 1}],
  ['孩子', {1: 1}], ['重新', {0: 1}], ['音樂', {1: 1}],
  ['處境', {0: 1}], ['過得', {1: 1}], ['聽得', {1: 1}]
];

const BRANCHES = [
  {
    id: 'liszt', label: '李斯特', min: 1, max: 1,
    question: '李斯特有什麼美稱？他怎麼對待後輩？',
    prompt: '選一組，記下他的美稱和心意。',
    hint: '李斯特是匈牙利音樂家，有「鍵盤魔王」的美稱。他很有才華，也樂於提攜後輩，也就是照顧、幫助比自己年輕或資歷較淺的人。',
    choices: [
      {id: 'mentor', words: ['鍵盤魔王', '提攜後輩']},
      {id: 'support', words: ['鍵盤魔王', '樂助後輩']}
    ]
  },
  {
    id: 'chopin', label: '蕭邦', min: 1, max: 1,
    question: '蕭邦剛到巴黎時，過得怎麼樣？',
    prompt: '選一組，留下蕭邦當時的處境。',
    hint: '蕭邦從波蘭流亡到巴黎時，生活很窮，也還沒有名氣。這時李斯特已經很有名，常受邀演出。',
    choices: [
      {id: 'chopin-poor', words: ['流亡巴黎', '窮又無名']},
      {id: 'chopin-unknown', words: ['流亡巴黎', '窮困無名']}
    ]
  },
  {
    id: 'stage', label: '讓舞臺', min: 1, max: 1,
    question: '李斯特怎麼介紹蕭邦？結果如何？',
    prompt: '選一組，記下他怎麼做和後來的結果。',
    hint: '演奏會依當時的習慣熄了燈，李斯特趁黑暗讓蕭邦上臺彈琴。聽眾聽得入迷，以為還是李斯特。燈火重新點亮，大家才發現彈琴的是蕭邦，蕭邦也因此一夕成名。',
    choices: [
      {id: 'stage-switch', words: ['熄燈換手', '一夕成名']},
      {id: 'stage-debut', words: ['熄燈換手', '一夜成名']}
    ]
  },
  {
    id: 'girl', label: '姑娘', min: 1, max: 1,
    question: '姑娘為什麼說自己是李斯特的學生？',
    prompt: '選一組，留下她說謊的原因和做法。',
    hint: '一位姑娘為了維持生活，在演奏會海報上說自己是李斯特的學生。演奏會前一天，李斯特來找她。她哭著說出自己的苦衷，請他原諒。',
    choices: [
      {id: 'girl-livelihood', words: ['為生計', '冒稱學生']},
      {id: 'girl-pretend', words: ['為生活', '假稱學生']}
    ]
  },
  {
    id: 'lesson', label: '收徒', min: 1, max: 1,
    question: '李斯特聽了姑娘的苦衷，怎麼幫她？',
    prompt: '選一組，記下他給姑娘的幫助。',
    hint: '李斯特請她先彈一遍，指出哪裡可以改進，也親自示範彈法。他和氣地收她為學生，還請她在海報上加印李斯特將親自到場演奏的消息。',
    choices: [
      {id: 'lesson-teach', words: ['教她彈', '李斯特將演奏']},
      {id: 'lesson-method', words: ['教彈法', '李斯特將演奏']}
    ]
  }
];

function isReady(branch, picks) {
  return picks.length >= branch.min;
}

function cleanState(raw) {
  const picks = BRANCHES.map((branch, i) => {
    const saved = raw?.picks?.[i];
    if (!Array.isArray(saved)) return [];
    return [...new Set(saved)].filter(id => branch.choices.some(choice => choice.id === id)).slice(0, branch.max);
  });
  const missing = BRANCHES.findIndex((branch, i) => !isReady(branch, picks[i]));
  const limit = missing < 0 ? BRANCHES.length - 1 : missing;
  const step = Number.isInteger(raw?.step) && raw.step >= 0 ? Math.min(raw.step, limit) : limit;
  return {picks, step, finished: missing < 0 && raw?.finished === true};
}

function branchWords(branch, picks) {
  return picks.flatMap(id => branch.choices.find(choice => choice.id === id)?.words || []);
}

function mapWordCount(picks) {
  return TITLE.length + BRANCHES.reduce((count, branch, i) => {
    return count + branch.label.length + branchWords(branch, picks[i]).join('').length;
  }, 0);
}

if (typeof module !== 'undefined') {
  module.exports = {TITLE, STORAGE_KEY, BRANCHES, GIVING_READINGS, isReady, cleanState, branchWords, mapWordCount};
}
