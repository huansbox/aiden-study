'use strict';

const TITLE = '付出比收穫更可貴';
const LEGACY_STORAGE_KEY = 'aiden_mind_map_giving_more_precious_20261117_v1';
const STORAGE_KEY = 'aiden_mind_map_giving_more_precious_20261117_v2';
const MAX_NOTE_LENGTH = 40;

// 字嗨 v1.500。較長的詞組先選音，避免被詞中的短語截斷。
const GIVING_READINGS = [
  ['教她怎麼彈', {0: 1, 4: 1}], ['先聽她彈', {3: 1}], ['彈琴', {0: 1}],
  ['彈鋼琴', {0: 1}], ['彈奏', {0: 1}], ['彈一首', {0: 1}], ['彈得', {0: 1, 1: 1}],
  ['為了', {0: 1}], ['為什麼', {0: 1}], ['姑娘', {1: 1}], ['孩子', {1: 1}],
  ['音樂', {1: 1}], ['過得', {1: 1}]
];

const BRANCHES = [
  {
    title: '李斯特是誰',
    question: '李斯特是個怎樣的人？',
    hint: '李斯特是匈牙利的音樂家。「後輩」是比他年輕，或比他晚進入音樂圈的人。',
    prompts: ['大家怎麼叫他？', '他會做什麼，也願意做什麼？'],
    example: ['大家叫他「鍵盤魔王」', '他很會彈琴，也願意幫助後輩'],
    legacy: ['mentor', 'support']
  },
  {
    title: '蕭邦剛到巴黎',
    question: '蕭邦剛到巴黎時，日子過得怎麼樣？',
    hint: '「流亡」就是不得不離開自己的國家。回去找兩個地名，再看看蕭邦剛到時過得怎麼樣。',
    prompts: ['他從哪裡來？', '他遇到什麼困難？'],
    example: ['他不得不離開波蘭，來到巴黎', '他很窮，也還沒出名'],
    legacy: ['chopin-poor', 'chopin-unknown']
  },
  {
    title: '李斯特幫蕭邦',
    question: '李斯特怎麼讓大家認識蕭邦？',
    hint: '當時演奏會有熄燈的習慣。回去讀燈熄了和燈亮了的地方，你會找到李斯特的辦法。',
    prompts: ['熄燈時，李斯特做了什麼？', '大家以為是誰在彈？他們喜歡嗎？', '燈亮後發生了什麼事？'],
    example: ['燈熄了，李斯特悄悄讓蕭邦上臺彈琴', '大家以為是李斯特，聽完大聲叫好', '燈亮才發現換了人，蕭邦一下子就出名了'],
    legacy: ['stage-switch', 'stage-debut']
  },
  {
    title: '姑娘說了謊',
    question: '姑娘在海報上說了什麼？為什麼這樣說？',
    hint: '回去找這段的兩個地方。先看海報上寫了什麼，再找姑娘哭著說的話。',
    prompts: ['她在海報上說了什麼？是真的嗎？', '李斯特來找她時，她怎麼做？', '她為什麼要說謊？'],
    example: ['她在海報上說自己是李斯特的學生，其實兩人沒見過', '李斯特來找她，她哭著請他原諒', '她為了過日子才說謊'],
    legacy: ['girl-livelihood', 'girl-pretend']
  },
  {
    title: '李斯特幫姑娘',
    question: '李斯特聽了姑娘的話，怎麼幫她？',
    hint: '「親臨」就是本人到場。讀故事最後，找找李斯特先做什麼，後來又說了什麼。',
    prompts: ['他怎麼教姑娘？', '他後來怎麼跟姑娘說？', '他請她在海報上多印哪一句？'],
    example: ['先聽她彈，再教她怎麼彈', '李斯特和氣地收她當學生', '他請她在海報加一句：李斯特會親自到場'],
    legacy: ['lesson-teach', 'lesson-method', 'lesson-show']
  }
];

function asNote(value) {
  return typeof value === 'string' ? value.slice(0, MAX_NOTE_LENGTH) : '';
}

function notesFor(branch, values) {
  return branch.example.map((_, index) => asNote(values?.[index]));
}

function saveNotes(branch, values) {
  if (!Array.isArray(values) || values.length !== branch.example.length) return null;
  const notes = notesFor(branch, values).map(note => note.trim());
  return notes.every(Boolean) ? notes : null;
}

function cleanState(raw) {
  const entries = BRANCHES.map((branch, index) => saveNotes(branch, raw?.entries?.[index]));
  const firstMissing = entries.indexOf(null);
  const limit = firstMissing < 0 ? BRANCHES.length - 1 : firstMissing;
  const step = Number.isInteger(raw?.step) ? Math.max(0, Math.min(raw.step, limit)) : limit;
  const finished = firstMissing < 0 && raw?.finished === true;
  const returnToMap = !finished && firstMissing < 0 && raw?.returnToMap === true;
  const draft = !finished && raw?.draft?.step === step && Array.isArray(raw.draft.notes)
    ? {step, notes: notesFor(BRANCHES[step], raw.draft.notes)}
    : null;
  return {entries, step, finished, returnToMap, draft};
}

function migrateLegacy(raw) {
  const entries = BRANCHES.map((branch, index) => {
    const picks = raw?.picks?.[index];
    return Array.isArray(picks) && picks.some(id => branch.legacy.includes(id)) ? branch.example : null;
  });
  return cleanState({entries, step: raw?.step, finished: raw?.finished});
}

if (typeof module !== 'undefined') {
  module.exports = {TITLE, STORAGE_KEY, LEGACY_STORAGE_KEY, MAX_NOTE_LENGTH, BRANCHES, GIVING_READINGS,
    saveNotes, cleanState, migrateLegacy};
}
