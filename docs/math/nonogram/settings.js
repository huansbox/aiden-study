/**
 * 設定（主題／填色）— 純函式，無 DOM 依賴（localStorage 以 storage 參數注入，可單元測試）。
 *
 * 對應 PRD「設定與持久化」：本模組只負責 US 26 的「設定」面向（theme / fillMode），
 * 「進度」面向在 library.js。壞資料／未知值一律回落到預設，避免讀到舊版或被竄改的值。
 *
 * - theme：'playful'（童趣，預設）／'clean'（清爽）。
 * - fillMode：'mono'（單色，預設）／'letter'（按字母變色）。
 *   注意：fillMode 只影響「遊玩中」的塗色；過關慶祝一律按字母上色（見 app.js revealBoard）。
 */

// localStorage 鍵名（見 PRD「設定與持久化」）。
export const SETTINGS_KEY = 'nonogram:settings';

export const THEMES = ['playful', 'clean'];
export const FILL_MODES = ['mono', 'letter'];

export const DEFAULT_SETTINGS = { theme: 'playful', fillMode: 'mono' };

/**
 * 把任意輸入正規化成合法設定：未知／缺漏的欄位回落到預設。
 * @param {*} raw
 * @returns {{ theme: string, fillMode: string }}
 */
export function normalizeSettings(raw) {
  const theme = THEMES.includes(raw && raw.theme) ? raw.theme : DEFAULT_SETTINGS.theme;
  const fillMode = FILL_MODES.includes(raw && raw.fillMode) ? raw.fillMode : DEFAULT_SETTINGS.fillMode;
  return { theme, fillMode };
}

/**
 * 從 storage 讀出設定；壞資料／storage 不可用一律回預設（不丟錯）。
 * @param {{ getItem: (k: string) => string|null }} storage 如 localStorage
 * @returns {{ theme: string, fillMode: string }}
 */
export function loadSettings(storage) {
  try {
    return normalizeSettings(JSON.parse(storage.getItem(SETTINGS_KEY)));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * 把設定（正規化後）寫回 storage；storage 不可用（如隱私模式）時靜默略過。
 * @param {{ setItem: (k: string, v: string) => void }} storage 如 localStorage
 * @param {{ theme: string, fillMode: string }} settings
 */
export function saveSettings(storage, settings) {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
  } catch {
    /* 不影響遊玩 */
  }
}
