/**
 * 數織解謎 — UI 渲染 + 互動（#5 題庫 + 首頁 + 過關紀錄、#3 拖曳塗色 + 過關呈現）。
 *
 * 純函式邏輯在 ../nonogram.js（攤平／提示／比對／填錯）與 ../library.js
 * （題庫解析／過關紀錄／下一題），本檔只負責 DOM 與 localStorage。
 *
 * 流程：載入 wordlist → 首頁編號題庫（不顯示單字、標★）→ 點題進遊戲
 * → 拖曳連續塗格 → 檢查打字答案 → 過關標出多塗/漏塗並按字母上色
 * → 過關記到 localStorage →「下一題」走題庫順序。卡關可「看答案」（不計過關）。
 * 鍵盤抽屜（#4）留待後續切片。
 */

import {
  buildSolution,
  computeClues,
  checkAnswer,
  diffCells,
  letterDividerCols,
  validateWord,
} from '../nonogram.js';
import {
  parseWordlist,
  isSolved,
  markSolved,
  nextUnsolvedIndex,
  loadProgress,
  saveProgress,
} from '../library.js';
import { loadSettings, saveSettings } from '../settings.js';

const els = {
  home: document.getElementById('home'),
  game: document.getElementById('game'),
  allclear: document.getElementById('allclear'),
  library: document.getElementById('library'),
  customDisplay: document.getElementById('custom-display'),
  customKeyboard: document.getElementById('custom-keyboard'),
  customHint: document.getElementById('custom-hint'),
  customStartBtn: document.getElementById('custom-start-btn'),
  custom: document.getElementById('custom'),
  settingsToggle: document.getElementById('settings-toggle'),
  settings: document.getElementById('settings'),
  themeSeg: document.getElementById('theme-seg'),
  fillSeg: document.getElementById('fill-seg'),
  puzzleLabel: document.getElementById('puzzle-label'),
  homeBtn: document.getElementById('home-btn'),
  allclearHomeBtn: document.getElementById('allclear-home-btn'),
  board: document.getElementById('board'),
  colClues: document.getElementById('col-clues'),
  rowClues: document.getElementById('row-clues'),
  grid: document.getElementById('grid'),
  answer: document.getElementById('answer'),
  actions: document.getElementById('actions'),
  keyboard: document.getElementById('keyboard'),
  kbDrawer: document.getElementById('kb-drawer'),
  kbClose: document.getElementById('kb-close'),
  checkBtn: document.getElementById('check-btn'),
  revealBtn: document.getElementById('reveal-btn'),
  replayBtn: document.getElementById('replay-btn'),
  nextBtn: document.getElementById('next-btn'),
  hint: document.getElementById('hint'),
};

// 過關／看答案時按字母上色用的調色盤（依字母序循環）。
const LETTER_COLORS = ['#e8554e', '#f5a623', '#3fb55f', '#2b8fd6', '#9b59b6', '#e07ec0'];

// 自訂出題暫時從首頁隱藏（程式碼、事件、測試全保留）；要在首頁開回，改成 true 即可。
const SHOW_CUSTOM = false;

// ---- 狀態 ----
let words = [];        // 題庫單字（已過濾為可玩）
let solvedKeys = loadProgress(localStorage);
let settings = loadSettings(localStorage); // { theme, fillMode }
let currentIndex = -1; // 目前題目索引（-1 = 在首頁或自訂題）
let isCustom = false;   // 目前是否在玩自訂題（不記過關、無「下一題」題庫序）
let currentWord = '';
let solution = null;
let clues = null;
let dividerCols = new Set();
let typed = '';
// 揭曉狀態（過關或看答案）：一旦揭曉就鎖定塗色／打字，避免畫面與揭曉結果矛盾。
// 「不計過關」由「看答案時不呼叫 markSolved」直接保證，無需額外旗標。
let revealed = false;
// 鍵盤抽屜是否展開（#4）：摸格子即收回（見 grid pointerdown）。
let drawerOpen = false;

// ---- 視圖切換（首頁／遊戲／全部過關，三選一）----
function showView(name) {
  els.home.hidden = name !== 'home';
  els.game.hidden = name !== 'game';
  els.allclear.hidden = name !== 'allclear';
}

// ---- 首頁：編號題庫 ----
function showHome() {
  currentIndex = -1;
  isCustom = false;
  setSettingsOpen(false); // 回首頁時設定浮層恢復收合
  closeDrawer();          // 回首頁時收起鍵盤抽屜
  renderLibrary();
  showView('home');
}

// ---- 全部過關畫面 ----
function showAllClear() {
  currentIndex = -1;
  showView('allclear');
}

// 在題庫區放一行訊息（載入中／載入失敗）。
function showLibraryMessage(text) {
  els.library.innerHTML = '';
  const msg = document.createElement('p');
  msg.className = 'library-msg';
  msg.textContent = text;
  els.library.appendChild(msg);
}

function renderLibrary() {
  if (words.length === 0) {
    showLibraryMessage('題庫載入失敗 😢 請重新整理頁面再試一次');
    return;
  }
  els.library.innerHTML = '';
  words.forEach((word, index) => {
    const done = isSolved(solvedKeys, word);
    const card = document.createElement('button');
    card.className = 'puzzle-card';
    card.dataset.index = index;
    if (done) card.classList.add('is-solved');

    const num = document.createElement('span');
    num.className = 'puzzle-card__num';
    num.textContent = `第 ${index + 1} 題`;
    card.appendChild(num);

    const star = document.createElement('span');
    star.className = 'puzzle-card__star';
    star.textContent = done ? '★' : '☆';
    card.appendChild(star);

    els.library.appendChild(card);
  });
}

els.library.addEventListener('click', (e) => {
  const card = e.target.closest('.puzzle-card');
  if (!card) return;
  loadPuzzle(Number(card.dataset.index));
});

// ---- 共用：以一個單字開始一局（題庫題與自訂題共用渲染流程）----
function startPuzzle(word, label) {
  currentWord = word;
  solution = buildSolution(currentWord);
  clues = computeClues(solution.cells);
  dividerCols = new Set(letterDividerCols(solution.letterRanges));
  typed = '';
  revealed = false;

  els.puzzleLabel.textContent = label;
  els.checkBtn.hidden = false;
  els.revealBtn.hidden = false;
  els.replayBtn.hidden = true;
  els.nextBtn.hidden = true;
  clearHint();
  // 每題從「鍵盤收起」開始。
  drawerOpen = false;
  els.kbDrawer.classList.remove('is-open');
  renderColClues();
  renderRowClues();
  renderGrid();
  renderAnswer();
  fitGrid();

  showView('game');
}

// ---- 載入並開始題庫某題 ----
function loadPuzzle(index) {
  if (index < 0 || index >= words.length) return;
  currentIndex = index;
  isCustom = false;
  startPuzzle(words[index], `第 ${index + 1} 題`);
}

// ---- 自訂題：臨時遊玩，不寫題庫、不記過關、無題庫「下一題」序 ----
function loadCustomPuzzle(word) {
  currentIndex = -1;
  isCustom = true;
  startPuzzle(word, '自訂題');
}

// ---- 格盤渲染（欄列數一律由 JS 設定，非 CSS 寫死）----
// 字母為比例字寬，邊界由 letterRanges 推算（每個非首字母的左緣），不能假設固定間隔。
function isLetterDivider(col) {
  return dividerCols.has(col);
}

function renderColClues() {
  els.colClues.innerHTML = '';
  clues.cols.forEach((clue, c) => {
    const div = document.createElement('div');
    div.className = 'col-clue';
    if (isLetterDivider(c)) div.classList.add('col-clue--divider');
    if (clue.length === 1 && clue[0] === 0) {
      div.classList.add('is-zero');
      div.textContent = '0';
    } else {
      clue.forEach((n) => {
        const span = document.createElement('span');
        span.textContent = n;
        div.appendChild(span);
      });
    }
    els.colClues.appendChild(div);
  });
}

function renderRowClues() {
  els.rowClues.innerHTML = '';
  clues.rows.forEach((clue) => {
    const div = document.createElement('div');
    div.className = 'row-clue';
    if (clue.length === 1 && clue[0] === 0) {
      div.classList.add('is-zero');
      div.textContent = '0';
    } else {
      div.textContent = clue.join(' ');
    }
    els.rowClues.appendChild(div);
  });
}

function renderGrid() {
  els.grid.style.gridTemplateColumns = `repeat(${solution.cols}, var(--cell))`;
  els.grid.style.gridTemplateRows = `repeat(${solution.rows}, var(--cell))`;
  els.grid.innerHTML = '';
  for (let r = 0; r < solution.rows; r++) {
    for (let c = 0; c < solution.cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (isLetterDivider(c)) cell.classList.add('cell--divider');
      cell.dataset.r = r;
      cell.dataset.c = c;
      // 預先帶上該欄所屬字母的顏色：填色設為「按字母變色」時遊玩中即生效（CSS 控制）。
      cell.style.setProperty('--letter-color', letterColor(letterIndexForCol(c)));
      els.grid.appendChild(cell);
    }
  }
}

// 格盤填滿卡片可用寬度：欄寬由 JS 算（CSS 不寫死），row-clues 寬度為內容驅動（提示位數），
// 一律實測再扣掉，避免硬編固定 px 把多位數提示的格子夾到極小（見 PRD「格盤尺寸動態計算」）。
// 鍵盤抽屜為卡片下方 in-flow 區塊，開合不影響格盤寬度，故格寬只取決於寬度。
function fitGrid() {
  if (!solution) return;
  requestAnimationFrame(() => {
    if (!solution) return;
    const gridBorder = 4; // .grid 左右各 2px
    const cs = getComputedStyle(els.game);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const cardInner = els.game.clientWidth - padX;
    const rowCluesW = els.rowClues.offsetWidth;
    let cell = Math.floor((cardInner - rowCluesW - gridBorder) / solution.cols);
    cell = Math.max(14, Math.min(cell, 56)); // 下限好點、上限不過胖
    els.board.style.setProperty('--cell', `${cell}px`);
  });
}

// ---- 鍵盤抽屜開合 ----
// 抽屜是「緊接遊戲卡片下方」的 in-flow 區塊（CSS .kb-drawer 用 max-height 滑開），
// 開啟時往下長出、貼著卡片，內容不被遮蓋、卡片與鍵盤間無死空白（空白落在鍵盤下方）。
function openDrawer() {
  if (revealed) return; // 揭曉後鍵盤已鎖定，不再叫出
  drawerOpen = true;
  els.kbDrawer.classList.add('is-open');
  // 矮螢幕下鍵盤可能在摺線下，捲到可見（已展開的高度，故延後到 transition 後）。
  setTimeout(() => els.kbDrawer.scrollIntoView({ behavior: 'smooth', block: 'end' }), 260);
}
function closeDrawer() {
  drawerOpen = false;
  els.kbDrawer.classList.remove('is-open');
}

// 視窗縮放／轉向時重算格寬（僅在遊戲畫面）。
window.addEventListener('resize', () => {
  if (!els.game.hidden) fitGrid();
});

// ---- 按字母上色：依欄索引找出所屬字母序，回傳對應顏色 ----
function letterIndexForCol(col) {
  const ranges = solution.letterRanges;
  for (let i = 0; i < ranges.length; i++) {
    if (col >= ranges[i].start && col < ranges[i].start + ranges[i].width) return i;
  }
  return 0;
}
function letterColor(letterIndex) {
  return LETTER_COLORS[letterIndex % LETTER_COLORS.length];
}

// 讀出目前格盤塗色狀態為二維布林陣列（供 diffCells 比對）。
function readFilled() {
  const filled = [];
  for (let r = 0; r < solution.rows; r++) {
    const row = [];
    for (let c = 0; c < solution.cols; c++) row.push(false);
    filled.push(row);
  }
  els.grid.querySelectorAll('.cell.filled').forEach((cell) => {
    filled[Number(cell.dataset.r)][Number(cell.dataset.c)] = true;
  });
  return filled;
}

// ---- 拖曳連續塗 ----
// pointerdown 由第一格現況決定本次「塗」或「擦」並鎖定；pointermove 以
// document.elementFromPoint 命中格子（觸控有隱式指標捕捉，不能用 e.target）。
let painting = false;
let paintMode = null; // true = 塗、false = 擦

function paintCell(cell) {
  if (!cell) return;
  cell.classList.toggle('filled', paintMode);
}

function cellAtPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const cell = el.closest('.cell');
  return cell && els.grid.contains(cell) ? cell : null;
}

els.grid.addEventListener('pointerdown', (e) => {
  if (revealed) return; // 過關／看答案後鎖定，避免改動格盤與揭曉狀態矛盾
  const cell = e.target.closest('.cell');
  if (!cell) return;
  e.preventDefault();
  // 摸格子即收回鍵盤（US 10）。鍵盤在格盤下方收合、不會動到格盤，故同一觸控仍照常塗這格。
  if (drawerOpen) closeDrawer();
  painting = true;
  paintMode = !cell.classList.contains('filled'); // 第一格決定塗/擦，整段沿用
  paintCell(cell);
});

els.grid.addEventListener('pointermove', (e) => {
  if (!painting) return;
  e.preventDefault();
  paintCell(cellAtPoint(e.clientX, e.clientY));
});

function endPaint() {
  painting = false;
  paintMode = null;
}
window.addEventListener('pointerup', endPaint);
window.addEventListener('pointercancel', endPaint);

// ---- 答案欄 + 螢幕鍵盤 ----
function renderAnswer() {
  els.answer.innerHTML = '';
  for (let i = 0; i < currentWord.length; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    if (revealed) {
      // 揭曉時整字按字母上色（過關慶祝／看答案皆然）
      slot.textContent = currentWord[i];
      slot.classList.add('revealed');
      slot.style.setProperty('--letter-color', letterColor(i));
      els.answer.appendChild(slot);
      continue;
    }
    const ch = typed[i];
    if (ch) {
      slot.textContent = ch;
      slot.classList.add('filled');
    } else if (i === typed.length) {
      slot.classList.add('active'); // 下一個要填的位置
    }
    els.answer.appendChild(slot);
  }
}

// A–Z + 0–9 + 刪除鍵；自訂出題與遊戲答案欄共用同一套螢幕鍵盤（限這些字元，
// 避免叫出系統鍵盤、也避免打進無法生成的字元，見 PRD US 11/23）。
function renderKeyboard(container) {
  container.innerHTML = '';
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const digits = '0123456789'.split('');
  [...letters, ...digits].forEach((ch) => {
    const btn = document.createElement('button');
    btn.className = 'key';
    btn.textContent = ch;
    btn.dataset.key = ch;
    container.appendChild(btn);
  });
  const del = document.createElement('button');
  del.className = 'key key--del';
  del.textContent = '⌫';
  del.dataset.key = 'DEL';
  container.appendChild(del);
}

els.keyboard.addEventListener('click', (e) => {
  if (revealed) return; // 過關／看答案後鎖定輸入
  const btn = e.target.closest('.key');
  if (!btn) return;
  const key = btn.dataset.key;
  if (key === 'DEL') {
    typed = typed.slice(0, -1);
  } else if (typed.length < currentWord.length) {
    typed += key;
  }
  clearHint();
  renderAnswer();
});

// 點答案欄叫出鍵盤抽屜；抽屜內「收起」收回（摸格子收回見 grid pointerdown）。
// 用 pointerdown 而非 click：觸控時若 tap 有微小位移，瀏覽器可能把它當 pan 手勢而
// 不合成 click（#answer 是 div、非原生可點元素），導致 iPad/觸控模擬下抽屜叫不出來。
// pointerdown 於觸控落下必觸發、不受位移抑制，滑鼠按下也照樣觸發。
els.answer.addEventListener('pointerdown', openDrawer);
els.kbClose.addEventListener('click', closeDrawer);

// ---- 自訂出題（首頁）----
// 用同一套螢幕鍵盤輸入 A–Z/0–9；空字串不出題；含 Q 給友善提示。
// 開始即玩，不寫題庫、不記過關（loadCustomPuzzle 負責 isCustom）。
const MAX_CUSTOM_LEN = 8; // 字夠長即可玩；過長在窄螢幕會被夾到太小，故設上限
let customTyped = '';

function renderCustomDisplay() {
  els.customDisplay.innerHTML = '';
  if (customTyped.length === 0) {
    const ph = document.createElement('span');
    ph.className = 'custom-placeholder';
    ph.textContent = '在這裡打字⋯';
    els.customDisplay.appendChild(ph);
    return;
  }
  for (const ch of customTyped) {
    const chip = document.createElement('span');
    chip.className = 'custom-chip';
    chip.textContent = ch;
    els.customDisplay.appendChild(chip);
  }
}

// 依目前輸入更新顯示、提示與「開始玩」可用狀態（單一事實來源：validateWord）。
function refreshCustomState() {
  renderCustomDisplay();
  const result = validateWord(customTyped);
  els.customStartBtn.disabled = !result.ok;
  if (result.ok || result.reason === 'empty') {
    els.customHint.textContent = '';
    els.customHint.classList.remove('bad');
  } else {
    els.customHint.textContent =
      result.reason === 'has-q'
        ? 'Q 這個字母還不支援喔，換一個吧！'
        : '這個字沒辦法變成謎題，換一個吧！';
    els.customHint.classList.add('bad');
  }
}

els.customKeyboard.addEventListener('click', (e) => {
  const btn = e.target.closest('.key');
  if (!btn) return;
  const key = btn.dataset.key;
  if (key === 'DEL') {
    customTyped = customTyped.slice(0, -1);
  } else if (customTyped.length < MAX_CUSTOM_LEN) {
    customTyped += key;
  }
  refreshCustomState();
});

els.customStartBtn.addEventListener('click', () => {
  const result = validateWord(customTyped);
  if (!result.ok) return; // 空字串／含 Q 時按鈕本就 disabled，這裡再保險擋一次
  loadCustomPuzzle(result.word);
  customTyped = '';       // 開始後清空，回到首頁時是乾淨狀態
  refreshCustomState();
});

// ---- 設定（主題／填色）----
// 套用到 <html> 的 data 屬性，CSS 以 :root[data-theme] / :root[data-fill] 覆寫，
// 整個 app（首頁與遊戲）即時換樣；填色只影響遊玩中的格子，過關慶祝仍按字母上色。
function applySettings() {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.dataset.fill = settings.fillMode;
  syncSegActive(els.themeSeg, 'theme', settings.theme);
  syncSegActive(els.fillSeg, 'fill', settings.fillMode);
}

// 標出分段控制目前選中的按鈕（data-<key> 對應值者加 is-active）。
function syncSegActive(seg, key, value) {
  seg.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset[key] === value);
  });
}

els.themeSeg.addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  settings = { ...settings, theme: btn.dataset.theme };
  saveSettings(localStorage, settings);
  applySettings();
});

els.fillSeg.addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  settings = { ...settings, fillMode: btn.dataset.fill };
  saveSettings(localStorage, settings);
  applySettings();
});

// ---- 設定浮層開合（齒輪鈕）----
function setSettingsOpen(open) {
  els.settings.hidden = !open;
  els.settingsToggle.setAttribute('aria-expanded', String(open));
}
els.settingsToggle.addEventListener('click', (e) => {
  e.stopPropagation(); // 別讓下面的「點外面收起」立刻又把它關掉
  setSettingsOpen(els.settings.hidden);
});
// 點浮層以外處收起（點浮層內切換主題/填色不收）。
document.addEventListener('click', (e) => {
  if (els.settings.hidden) return;
  if (els.settings.contains(e.target) || els.settingsToggle.contains(e.target)) return;
  setSettingsOpen(false);
});

// ---- 檢查 ----
function clearHint() {
  els.hint.textContent = '';
  els.hint.classList.remove('ok', 'bad');
}

// ---- 揭曉格盤：按字母上色正解，並（可選）疊加多塗/漏塗記號 ----
// withDiff 為真時先讀玩家塗色比對，再清盤重畫；過關走比對、看答案不比對。
function revealBoard(withDiff) {
  const diff = withDiff ? diffCells(readFilled(), solution) : { extra: [], missing: [] };
  const extraSet = new Set(diff.extra.map((p) => `${p.r},${p.c}`));
  const missingSet = new Set(diff.missing.map((p) => `${p.r},${p.c}`));

  els.grid.querySelectorAll('.cell').forEach((cell) => {
    const r = Number(cell.dataset.r);
    const c = Number(cell.dataset.c);
    const key = `${r},${c}`;
    cell.classList.remove('filled', 'diff-extra', 'diff-missing', 'revealed');
    cell.style.removeProperty('--letter-color');

    if (solution.cells[r][c]) {
      // 正解塗色格 → 揭曉並按字母上色；玩家漏塗的標記出來
      cell.classList.add('revealed');
      cell.style.setProperty('--letter-color', letterColor(letterIndexForCol(c)));
      if (missingSet.has(key)) cell.classList.add('diff-missing');
    } else if (extraSet.has(key)) {
      // 正解不塗、玩家卻塗了 → 標記多塗
      cell.classList.add('diff-extra');
    }
  });

  revealed = true;
  closeDrawer();  // 揭曉後收起鍵盤，讓整片上色正解完整可見
  renderAnswer(); // 答案欄也按字母上色
}

els.checkBtn.addEventListener('click', () => {
  if (checkAnswer(typed, currentWord)) {
    els.hint.textContent = '🎉 答對了！過關！';
    els.hint.classList.remove('bad');
    els.hint.classList.add('ok');
    // 自訂題為臨時遊玩：不寫題庫過關紀錄（見 PRD「自訂出題為臨時遊玩」）。
    if (!isCustom) {
      solvedKeys = markSolved(solvedKeys, currentWord);
      saveProgress(localStorage, solvedKeys);
    }
    revealBoard(true); // 過關：上色正解 + 標出多塗/漏塗
    els.checkBtn.hidden = true;
    els.revealBtn.hidden = true;
    els.replayBtn.hidden = false;
    els.nextBtn.hidden = isCustom; // 自訂題無題庫「下一題」序，僅留重玩／回題庫
  } else {
    els.hint.textContent = '再試試 💪';
    els.hint.classList.remove('ok');
    els.hint.classList.add('bad');
  }
});

// ---- 看答案：揭曉正解點陣（不比對填錯），標記「已看答案」、不計過關 ----
els.revealBtn.addEventListener('click', () => {
  if (revealed) return;
  revealBoard(false);
  els.hint.textContent = '已看答案（這題不算過關）';
  els.hint.classList.remove('ok', 'bad');
  els.checkBtn.hidden = true;
  els.revealBtn.hidden = true;
  els.replayBtn.hidden = false;  // 可重玩
  els.nextBtn.hidden = isCustom; // 題庫題可下一題；自訂題無題庫序，僅重玩／回題庫
});

// ---- 重玩：重新載入同一題（清空塗色與答案）----
els.replayBtn.addEventListener('click', () => {
  if (isCustom) loadCustomPuzzle(currentWord);
  else if (currentIndex >= 0) loadPuzzle(currentIndex);
});

// ---- 下一題（跳到下一個未過關的題；全部過關才進全破畫面）----
// nextUnsolvedIndex 不含 current，回 null 代表「沒有其他未過關題」。此時要再分辨：
//   - 這題自己也真的過關了 → 整個題庫都破完 → 全部過關畫面。
//   - 這題還沒過關（剛按過「看答案」，不計過關）→ 唯一未破的就是這題，不可誤判全破；
//     跳到下一個編號讓孩子繼續玩／重玩（看答案另有「重玩」可回到本題）。
els.nextBtn.addEventListener('click', () => {
  const next = nextUnsolvedIndex(solvedKeys, words, currentIndex);
  if (next !== null) {
    loadPuzzle(next);
  } else if (isSolved(solvedKeys, currentWord)) {
    showAllClear();
  } else {
    loadPuzzle((currentIndex + 1) % words.length);
  }
});

els.homeBtn.addEventListener('click', showHome);
els.allclearHomeBtn.addEventListener('click', showHome);

// ---- 初始化：載入題庫 → 首頁 ----
async function init() {
  applySettings();
  renderKeyboard(els.keyboard);
  // 自訂出題暫時隱藏（SHOW_CUSTOM）；保留 DOM 與事件，僅在開啟時才渲染其鍵盤。
  els.custom.hidden = !SHOW_CUSTOM;
  if (SHOW_CUSTOM) {
    renderKeyboard(els.customKeyboard);
    refreshCustomState();
  }
  // 先顯示首頁並標示載入中，避免 fetch 期間整頁空白。
  showView('home');
  showLibraryMessage('載入中⋯');
  try {
    const res = await fetch('wordlist.txt', { cache: 'no-store' });
    if (!res.ok) throw new Error(`wordlist 載入失敗：HTTP ${res.status}`);
    words = parseWordlist(await res.text());
  } catch {
    words = [];
  }
  showHome();
}

init();
