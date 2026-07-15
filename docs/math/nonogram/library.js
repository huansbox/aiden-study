/**
 * 題庫與過關紀錄 — 純函式，無 DOM 依賴（localStorage 以 storage 參數注入，可單元測試）。
 *
 * - 題庫來源為 wordlist.txt（一行一字），由 parseWordlist 解析。
 * - 過關紀錄以「key 命名空間 builtin:」表示（見 PRD「設定與持久化」），
 *   避免與日後自訂題碰撞。key 用「單字」而非序號，這樣編輯／重排
 *   wordlist.txt 時既有的過關★不會跑掉（沿用 js/daily.js 注入 storage 的慣例）。
 */

import { isPlayable } from './nonogram.js';

// 過關紀錄的 key 前綴（內建題庫）。自訂題日後可用別的前綴。
export const BUILTIN_PREFIX = 'builtin:';
// localStorage 鍵名（見 PRD「設定與持久化」）。
export const PROGRESS_KEY = 'nonogram:progress';

/**
 * 解析 wordlist.txt 文字 → 可玩單字陣列。
 * 規則：一行一字、去前後空白、轉大寫、略過空行與 # 註解行、
 * 過濾掉不可玩的字（含 Q、標點等，見 font.js）。
 * @param {string} text wordlist.txt 內容
 * @returns {string[]}
 */
export function parseWordlist(text) {
  return String(text)
    .split('\n')
    .map((line) => line.trim().toUpperCase())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .filter((word) => isPlayable(word));
}

/**
 * 內建題庫某單字的過關紀錄 key（以單字為準，與題庫順序無關）。
 * @param {string} word 單字
 * @returns {string} 例：'builtin:AIDEN'
 */
export function builtinKey(word) {
  return BUILTIN_PREFIX + String(word).toUpperCase();
}

/**
 * 某單字是否已過關。
 * @param {string[]} solvedKeys 已過關 key 陣列
 * @param {string} word
 * @returns {boolean}
 */
export function isSolved(solvedKeys, word) {
  return solvedKeys.includes(builtinKey(word));
}

/**
 * 標記某單字過關，回傳新的已過關 key 陣列（不可變、idempotent）。
 * @param {string[]} solvedKeys
 * @param {string} word
 * @returns {string[]}
 */
export function markSolved(solvedKeys, word) {
  const key = builtinKey(word);
  return solvedKeys.includes(key) ? solvedKeys : [...solvedKeys, key];
}

/**
 * 從 current 往後（環狀）找第一個「還沒過關」的題目索引；
 * 全部都過關（或空題庫）時回 null，代表可進入「全部過關」畫面。
 * 注意：從 current+1 起算，不會回 current 本身（「下一題」語意＝換一題）。
 * @param {string[]} solvedKeys 已過關 key 陣列
 * @param {string[]} words 題庫單字
 * @param {number} current 目前題目索引
 * @returns {number|null}
 */
export function nextUnsolvedIndex(solvedKeys, words, current) {
  const total = words.length;
  for (let step = 1; step <= total; step++) {
    const i = (current + step) % total;
    if (!isSolved(solvedKeys, words[i])) return i;
  }
  return null;
}

/**
 * 從 storage 讀出已過關 key 陣列；壞資料／非陣列一律回 []。
 * @param {{ getItem: (k: string) => string|null }} storage 如 localStorage
 * @returns {string[]}
 */
export function loadProgress(storage) {
  try {
    const raw = JSON.parse(storage.getItem(PROGRESS_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

/**
 * 把已過關 key 陣列寫回 storage；storage 不可用（如隱私模式）時靜默略過。
 * @param {{ setItem: (k: string, v: string) => void }} storage 如 localStorage
 * @param {string[]} solvedKeys
 */
export function saveProgress(storage, solvedKeys) {
  try {
    storage.setItem(PROGRESS_KEY, JSON.stringify(solvedKeys));
  } catch {
    /* 不影響遊玩 */
  }
}
