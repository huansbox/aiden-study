'use strict';

const TITLE = '奶奶的祕密盒子';
const STORAGE_KEY = 'aiden_mind_map_grandmas_secret_box_20261124_v1';
const MAX_NOTE_LENGTH = 40;

// 字嗨 v1.500。相片的「相」使用字型預設的 ㄒㄧㄤˋ。
const BOX_READINGS = [
  ['奶奶', {1: 1}], ['爺爺', {1: 1}], ['哥哥', {1: 1}], ['媽媽', {1: 1}],
  ['盒子', {1: 1}], ['孩子', {1: 1}], ['為什麼', {0: 1}],
  ['笑得', {1: 1}], ['一個', {0: 1}], ['一聽', {0: 2}], ['一下', {0: 1}],
  ['一起', {0: 2}], ['一張', {0: 2}], ['一句', {0: 1}], ['一滑', {0: 2}]
];

const BRANCHES = [
  {
    title: '奶奶藏盒子',
    question: '奶奶在房間裡做什麼？',
    hint: '回到開頭，找找盒子平常放在哪裡。再看看奶奶聽到腳步聲時有什麼反應。',
    prompts: ['奶奶在哪裡看盒子？', '她聽到腳步聲就怎麼做？'],
    example: ['奶奶一個人在房裡打開枕頭旁的小盒子', '她一聽到腳步聲就趕緊蓋起來']
  },
  {
    title: '家人好奇',
    question: '家人對盒子有什麼反應？',
    hint: '找找「我」跑進房間想做什麼，再看看媽媽以為盒裡裝了什麼。',
    prompts: ['「我」想用什麼方法看看盒裡的東西？', '媽媽猜盒裡裝了什麼？'],
    example: ['我想假裝不小心打翻盒子，看看裡面裝什麼', '媽媽猜盒子裡藏著珠寶']
  },
  {
    title: '奶奶住院',
    question: '奶奶為什麼住院？家人回房間做什麼？',
    hint: '找找奶奶急著做什麼，也讀讀家人回房準備了什麼。哥哥看到小盒子後，說要帶它去做什麼？',
    prompts: ['奶奶是怎麼受傷住院的？', '家人回房準備了什麼？', '哥哥為什麼想把盒子帶去？'],
    example: ['奶奶趕去接電話時跌傷，住進醫院', '家人回房幫她準備換洗衣服', '哥哥覺得奶奶會想讓寶貝盒子陪她']
  },
  {
    title: '盒裡的相片',
    question: '盒子怎麼打開的？大家看到了什麼？',
    hint: '找找哥哥拿盒子時發生什麼事。讀到「六十大壽」時，看看奶奶六十歲生日的合照裡，兩人是什麼樣子。',
    prompts: ['是誰拿盒子？盒子怎麼打開的？', '裡面是誰的相片？看起來怎麼樣？'],
    example: ['哥哥手一滑，盒子掉到地上打開了', '盒裡有奶奶和爺爺的相片，有一張兩人牽手笑得很開心']
  },
  {
    title: '陪伴奶奶',
    question: '媽媽明白了什麼？家人怎麼陪奶奶？',
    hint: '回到最後，找找媽媽看到相片後說的話。想想家人帶的是相片，為什麼說是帶「爺爺」去醫院？',
    prompts: ['媽媽發現奶奶在想念誰？', '家人怎麼帶「爺爺」去陪奶奶？'],
    example: ['媽媽明白奶奶在想念爺爺', '我們把相片收進盒子，帶著「爺爺」去醫院陪奶奶']
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

if (typeof module !== 'undefined') {
  module.exports = {TITLE, STORAGE_KEY, MAX_NOTE_LENGTH, BRANCHES, BOX_READINGS, saveNotes, cleanState};
}
