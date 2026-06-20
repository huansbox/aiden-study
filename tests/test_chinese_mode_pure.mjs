// 國語改錯字 choice/handwriting mode 狀態純函式測試。
// 執行：node --test tests/test_chinese_mode_pure.mjs
// 做法：從 docs/index.html 抽出 <chinese-mode-pure> sentinel 區塊 eval。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
const m = html.match(/\/\/ <chinese-mode-pure>([\s\S]*?)\/\/ <\/chinese-mode-pure>/);
if (!m) throw new Error("docs/index.html 找不到 <chinese-mode-pure> 區塊");

const {
  normalizePracticeMode,
  modeChallengeKey,
  batchSizeForMode,
  nextBatchSizeForMode,
  getModeStat,
  hasModeStat,
  recordModeAnswer,
  recordsToModeStats,
  modeWrongCount,
  filterModeErrorBank,
  addModeError,
  removeModeError,
  removeAllModeErrors,
  shouldKeepModeError,
  shouldAddModeError,
  masteredListForMode,
  addModeMastered,
  removeQuestionFromAllModeMastered,
} = new Function(m[1] + `
return {
  normalizePracticeMode,
  modeChallengeKey,
  batchSizeForMode,
  nextBatchSizeForMode,
  getModeStat,
  hasModeStat,
  recordModeAnswer,
  recordsToModeStats,
  modeWrongCount,
  filterModeErrorBank,
  addModeError,
  removeModeError,
  removeAllModeErrors,
  shouldKeepModeError,
  shouldAddModeError,
  masteredListForMode,
  addModeMastered,
  removeQuestionFromAllModeMastered,
};`)();

test("normalizePracticeMode：未知或空值一律視為 choice", () => {
  assert.equal(normalizePracticeMode("handwriting"), "handwriting");
  assert.equal(normalizePracticeMode("choice"), "choice");
  assert.equal(normalizePracticeMode(undefined), "choice");
  assert.equal(normalizePracticeMode("other"), "choice");
});

test("modeChallengeKey：choice 沿用舊鍵，handwriting 不與舊鍵碰撞", () => {
  assert.equal(modeChallengeKey(13, null, "choice"), "13");
  assert.equal(modeChallengeKey(13, "L7-L8 改錯字", "choice"), "13/L7-L8 改錯字");
  assert.equal(modeChallengeKey(13, null, "handwriting"), "handwriting:13");
  assert.equal(modeChallengeKey(13, "L7-L8 改錯字", "handwriting"), "handwriting:13/L7-L8 改錯字");
});

test("batchSizeForMode：choice 維持 10 題，handwriting 改為 5 題", () => {
  assert.equal(batchSizeForMode("choice"), 10);
  assert.equal(batchSizeForMode("handwriting"), 5);
  assert.equal(batchSizeForMode("unknown"), 10);
});

test("nextBatchSizeForMode：批末文案與實際開批題數一致", () => {
  assert.equal(nextBatchSizeForMode(14, "choice"), 7);
  assert.equal(nextBatchSizeForMode(14, "handwriting"), 5);
  assert.equal(nextBatchSizeForMode(4, "handwriting"), 4);
});

test("stats：舊格式視為 choice，handwriting 初始為空", () => {
  const stats = { q1: { practiced: 3, correct: 1 } };
  assert.deepEqual(getModeStat(stats, "q1", "choice"), { practiced: 3, correct: 1 });
  assert.deepEqual(getModeStat(stats, "q1", "handwriting"), { practiced: 0, correct: 0 });
  assert.equal(modeWrongCount(stats, "q1", "choice"), 2);
  assert.equal(modeWrongCount(stats, "q1", "handwriting"), 0);
});

test("recordModeAnswer：choice 與 handwriting 統計互不污染", () => {
  let stats = {};
  stats = recordModeAnswer(stats, "q1", false, "choice");
  stats = recordModeAnswer(stats, "q1", true, "handwriting");
  stats = recordModeAnswer(stats, "q1", false, "handwriting");
  assert.deepEqual(getModeStat(stats, "q1", "choice"), { practiced: 1, correct: 0 });
  assert.deepEqual(getModeStat(stats, "q1", "handwriting"), { practiced: 2, correct: 1 });
});

test("recordsToModeStats：OLD_KEY records migration 輸出 choice stats", () => {
  const stats = recordsToModeStats([
    { questionId: "q1", correct: false },
    { questionId: "q1", correct: true },
    { questionId: "q2", correct: true },
    { correct: true },
  ], "choice");
  assert.deepEqual(getModeStat(stats, "q1", "choice"), { practiced: 2, correct: 1 });
  assert.deepEqual(getModeStat(stats, "q1", "handwriting"), { practiced: 0, correct: 0 });
  assert.equal(hasModeStat(stats, "q1", "choice"), true);
  assert.equal(hasModeStat(stats, "q1", "handwriting"), false);
});

test("errorBank：舊 flat 條目只算 choice，新條目按 questionId + mode 去重", () => {
  let bank = [{ questionId: "q1", unit: 13 }];
  bank = addModeError(bank, "q1", 13, "choice");
  bank = addModeError(bank, "q1", 13, "handwriting");
  bank = addModeError(bank, "q1", 13, "handwriting");
  assert.equal(filterModeErrorBank(bank, 13, "choice").length, 1);
  assert.equal(filterModeErrorBank(bank, 13, "handwriting").length, 1);
  assert.equal(filterModeErrorBank(bank, [13, 14], "handwriting").length, 1);
});

test("removeModeError：只移除指定 mode，同題另一 mode 保留", () => {
  const bank = [
    { questionId: "q1", unit: 13, mode: "choice" },
    { questionId: "q1", unit: 13, mode: "handwriting" },
  ];
  const next = removeModeError(bank, "q1", "handwriting");
  assert.deepEqual(next, [{ questionId: "q1", unit: 13, mode: "choice" }]);
  assert.deepEqual(removeAllModeErrors(bank, "q1"), []);
});

test("shouldKeepModeError：choice 沿用錯兩次門檻，handwriting 一次錯也保留", () => {
  const stats = {
    q1: { modes: { choice: { practiced: 1, correct: 0 } } },
    q2: { modes: { choice: { practiced: 2, correct: 0 } } },
    q3: { modes: { handwriting: { practiced: 1, correct: 0 } } },
  };
  assert.equal(shouldKeepModeError(stats, { questionId: "q1", unit: 13, mode: "choice" }), false);
  assert.equal(shouldKeepModeError(stats, { questionId: "q2", unit: 13, mode: "choice" }), true);
  assert.equal(shouldKeepModeError(stats, { questionId: "q3", unit: 13, mode: "handwriting" }), true);
  assert.equal(shouldKeepModeError(stats, { questionId: "q3", unit: 13 }), true);
});

test("shouldAddModeError：choice 要錯兩次，handwriting 第一次錯即可加入", () => {
  const stats = {
    q1: { modes: { choice: { practiced: 1, correct: 0 } } },
    q2: { modes: { choice: { practiced: 2, correct: 0 } } },
    q3: { modes: { handwriting: { practiced: 1, correct: 0 } } },
  };
  assert.equal(shouldAddModeError(stats, "q1", "choice"), false);
  assert.equal(shouldAddModeError(stats, "q2", "choice"), true);
  assert.equal(shouldAddModeError(stats, "q3", "handwriting"), true);
});

test("mastered：舊 unit 陣列只算 choice，handwriting 獨立", () => {
  let mastered = { "13": ["q1"] };
  assert.deepEqual(masteredListForMode(mastered, 13, "choice"), ["q1"]);
  assert.deepEqual(masteredListForMode(mastered, 13, "handwriting"), []);
  mastered = addModeMastered(mastered, 13, "q1", "handwriting");
  mastered = addModeMastered(mastered, 13, "q2", "choice");
  assert.deepEqual(masteredListForMode(mastered, 13, "choice"), ["q1", "q2"]);
  assert.deepEqual(masteredListForMode(mastered, 13, "handwriting"), ["q1"]);
});

test("removeQuestionFromAllModeMastered：flag 題時清掉所有 mode mastered", () => {
  const mastered = {
    "13": { modes: { choice: ["q1", "q2"], handwriting: ["q1"] } },
  };
  const next = removeQuestionFromAllModeMastered(mastered, 13, "q1");
  assert.deepEqual(masteredListForMode(next, 13, "choice"), ["q2"]);
  assert.deepEqual(masteredListForMode(next, 13, "handwriting"), []);
});
