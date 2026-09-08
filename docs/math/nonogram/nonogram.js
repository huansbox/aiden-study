/**
 * 數織核心邏輯 — 純函式，無 DOM 依賴。
 *
 * 單向管線：單字 → 解答點陣 → 提示；外加答案比對。
 * 不含數織求解器／唯一解驗證（過關靠打字答案，見 PRD「Out of Scope」）。
 */

import { FONT } from './font.js';

// 每個字母固定 5 列；欄寬為比例字寬（3／4／5 欄，依字模而定），字母之間不留空白欄。
export const LETTER_ROWS = 5;

/**
 * 把單字攤平成 5 × (各字模欄寬總和) 的布林點陣。
 * @param {string} word 單字（大小寫不敏感）
 * @returns {{ word: string, rows: number, cols: number,
 *            cells: boolean[][], letterRanges: {char: string, start: number, width: number}[] }}
 */
export function buildSolution(word) {
  const chars = [...String(word).toUpperCase()];
  if (chars.length === 0) throw new Error('buildSolution: 空字串無法生成謎題');

  // 逐字累加左緣位置；欄寬取自各字模（同一字模各列等長）。
  const letterRanges = [];
  let start = 0;
  for (const char of chars) {
    const glyph = FONT[char];
    if (!glyph) throw new Error(`buildSolution: 缺少字模 "${char}"`);
    const width = glyph[0].length;
    letterRanges.push({ char, start, width });
    start += width;
  }

  const cols = start;
  const cells = [];
  for (let r = 0; r < LETTER_ROWS; r++) {
    const row = [];
    for (const char of chars) {
      const glyphRow = FONT[char][r];
      for (let c = 0; c < glyphRow.length; c++) {
        row.push(glyphRow[c] === '1');
      }
    }
    cells.push(row);
  }

  return { word: chars.join(''), rows: LETTER_ROWS, cols, cells, letterRanges };
}

/**
 * 由字母欄範圍算出要畫分隔線的欄索引（每個非首字母的左緣）。
 * @param {{ start: number, width: number }[]} letterRanges buildSolution(...).letterRanges
 * @returns {number[]} 需畫左側分隔線的欄索引（升冪）
 */
export function letterDividerCols(letterRanges) {
  return letterRanges.slice(1).map((range) => range.start);
}

// 一條（行或列）布林序列 → 連續塗色段長度；全空回 [0]。
function lineRuns(line) {
  const runs = [];
  let count = 0;
  for (const filled of line) {
    if (filled) {
      count++;
    } else if (count > 0) {
      runs.push(count);
      count = 0;
    }
  }
  if (count > 0) runs.push(count);
  return runs.length > 0 ? runs : [0];
}

/**
 * 算出每行、每列的連續塗色段長度陣列。
 * @param {boolean[][]} cells 解答點陣（buildSolution(...).cells）
 * @returns {{ rows: number[][], cols: number[][] }}
 */
export function computeClues(cells) {
  const rows = cells.map(lineRuns);
  const numCols = cells.length > 0 ? cells[0].length : 0;
  const cols = [];
  for (let c = 0; c < numCols; c++) {
    cols.push(lineRuns(cells.map((row) => row[c])));
  }
  return { rows, cols };
}

/**
 * 大小寫不敏感、忽略前後空白地比對單字。
 * @param {string} typed 玩家輸入
 * @param {string} word 正解單字
 * @returns {boolean}
 */
export function checkAnswer(typed, word) {
  return String(typed).trim().toUpperCase() === String(word).trim().toUpperCase();
}

/**
 * 比對玩家塗色與正解，回傳「多塗」「漏塗」的格座標（過關後標示用）。
 *
 * - extra（多塗）：玩家塗了、但正解不該塗的格。
 * - missing（漏塗）：正解該塗、但玩家沒塗的格。
 * 兩串皆以列優先（row-major）排序；完全正確時兩者皆為空陣列。
 * `filled` 可為稀疏／缺列的二維陣列，缺省格一律視為未塗（false）。
 *
 * @param {boolean[][]} filled 玩家塗色（filled[r][c] 為真表示已塗）
 * @param {{ cells: boolean[][] }} solution buildSolution(...) 的解答
 * @returns {{ extra: {r: number, c: number}[], missing: {r: number, c: number}[] }}
 */
export function diffCells(filled, solution) {
  const sol = solution.cells;
  const extra = [];
  const missing = [];
  for (let r = 0; r < sol.length; r++) {
    const solRow = sol[r];
    const filledRow = (filled && filled[r]) || [];
    for (let c = 0; c < solRow.length; c++) {
      const shouldFill = solRow[c] === true;
      const isFilled = filledRow[c] === true;
      if (isFilled && !shouldFill) extra.push({ r, c });
      else if (!isFilled && shouldFill) missing.push({ r, c });
    }
  }
  return { extra, missing };
}

/**
 * 單字是否可生成謎題：直接試跑 buildSolution，能成功即可玩。
 * 以 buildSolution 為單一事實來源（空字串、含 Q 或其他未收錄字元都會丟錯 → false），
 * 避免「哪些字合法」的規則散成兩份而漂移（見 font.js「刻意不收錄 Q」）。
 * @param {string} word
 * @returns {boolean}
 */
export function isPlayable(word) {
  try {
    buildSolution(word);
    return true;
  } catch {
    return false;
  }
}

/**
 * 驗證自訂出題輸入，回傳 { ok, word? , reason? }。
 * 螢幕鍵盤已限制只能輸入 A–Z/0–9，故實務上唯一會踩到的不可玩字元是 Q；
 * 但仍把 reason 分成三類，讓 UI 能給對應訊息、且純邏輯可單元測試：
 *   - 'empty'       空字串／全空白 → 不出題（不算錯，無需責備訊息）。
 *   - 'has-q'       含 Q（刻意未收錄）→ 給友善提示「這個字母還不支援喔」。
 *   - 'unsupported' 其他無法生成（標點等非鍵盤輸入）→ 一般性擋下。
 * @param {string} word
 * @returns {{ ok: true, word: string } | { ok: false, reason: 'empty'|'has-q'|'unsupported' }}
 */
export function validateWord(word) {
  const normalized = String(word).trim().toUpperCase();
  if (normalized.length === 0) return { ok: false, reason: 'empty' };
  if (normalized.includes('Q')) return { ok: false, reason: 'has-q' };
  if (!isPlayable(normalized)) return { ok: false, reason: 'unsupported' };
  return { ok: true, word: normalized };
}
