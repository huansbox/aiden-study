import { generateProblem, calculateSteps, generateLayout, validateInput } from './division.js';
import { resumeAudio, playCorrect, playError, playComplete } from './sound.js';
import { loadProgress, saveResult, isDaily, getDailySummary, DAILY_GOAL, getMilestone, getMilestoneBadge } from './daily.js';
import { launchFireworks } from './fireworks.js';

const grid = document.getElementById('division-grid');
const hintEl = document.getElementById('hint');
const numpadBtns = document.querySelectorAll('.num-btn');
const streakEl = document.getElementById('streak');
const streakCountEl = streakEl.querySelector('.streak-count');
const starsEl = document.getElementById('stars');
const totalStarsEl = document.getElementById('total-stars');
const badgeEl = document.getElementById('badge');
const bossLivesEl = document.getElementById('boss-lives');
const bossEntryEl = document.getElementById('boss-entry');
const bossBtnEl = document.getElementById('boss-btn');

let state = null;
let streak = 0;
let progress = loadProgress(localStorage, new Date().toISOString().slice(0, 10));

// Boss challenge state
const BOSS_STAGES = [
  { digitCount: 4, divisorMin: 7, reward: 2 },
  { digitCount: 5, divisorMin: 7, reward: 3 },
  { digitCount: 6, divisorMin: 7, reward: 5 },
];
let bossMode = null; // null | { stage, lives, totalErrors, starsEarned }

function startNewProblem() {
  bossEntryEl.hidden = true;  // Reset: will be shown later if daily complete
  const { dividend, divisor } = generateProblem();
  const steps = calculateSteps(dividend, divisor);
  const layout = generateLayout(steps, dividend, divisor);

  const fillable = layout.cells
    .filter(c => c.fillable)
    .sort((a, b) => a.order - b.order);

  state = { dividend, divisor, steps, layout, fillable, currentIndex: 0, errors: 0, cellErrors: 0 };

  starsEl.hidden = true;

  // Adjust cell size for larger grids
  const digitCount = String(dividend).length;
  const bossCellSizes = { 4: '48px', 5: '44px', 6: '40px' };
  document.documentElement.style.setProperty(
    '--cell-size',
    bossCellSizes[digitCount] || ''
  );
  if (!bossCellSizes[digitCount]) {
    document.documentElement.style.removeProperty('--cell-size');
  }

  renderGrid();
  activateCurrent();
  updateHint();
  updateProgress();
  updateTotalStars();
  updateBadge();
  if (!isDaily(progress) && !bossMode) {
    bossEntryEl.hidden = false;
  }
}

// Layout row → CSS grid row (inserting line rows for division-line and sep-lines)
function toGridRow(layoutRow) {
  if (layoutRow === 0) return 1;
  if (layoutRow === 1) return 3;
  const offset = layoutRow - 2;
  const round = Math.floor(offset / 2);
  const isSubtract = offset % 2 === 1;
  return isSubtract ? 6 + round * 3 : 4 + round * 3;
}

function renderGrid() {
  const { layout, steps } = state;
  const numRounds = steps.rounds.length;
  const totalGridRows = 3 + numRounds * 3;

  const numCols = String(state.dividend).length + 1;
  grid.style.gridTemplateColumns = `repeat(${numCols}, var(--cell-size))`;
  grid.style.gridTemplateRows = `repeat(${totalGridRows}, auto)`;
  grid.innerHTML = '';

  for (const cell of layout.cells) {
    const el = document.createElement('div');
    el.className = 'cell';
    el.style.gridRow = String(toGridRow(cell.row));
    el.style.gridColumn = String(cell.col + 1);

    if (cell.fillable) {
      el.classList.add('cell--fillable');
      el.dataset.order = cell.order;
    } else {
      el.classList.add('cell--static');
      el.textContent = cell.value;
      if (cell.type === 'divisor') el.classList.add('cell--divisor');
    }

    grid.appendChild(el);
  }

  const divLine = document.createElement('div');
  divLine.className = 'division-line';
  divLine.style.gridRow = '2';
  grid.appendChild(divLine);

  for (let r = 0; r < numRounds; r++) {
    const productCells = layout.cells.filter(c => c.type === 'product' && c.roundIndex === r);
    if (productCells.length === 0) continue;

    const minCol = Math.min(...productCells.map(c => c.col));
    const maxCol = Math.max(...productCells.map(c => c.col));

    const sep = document.createElement('div');
    sep.className = 'sep-line';
    sep.style.gridRow = String(5 + r * 3);
    sep.style.gridColumn = `${minCol + 1} / ${maxCol + 2}`;
    grid.appendChild(sep);
  }
}

function getCellEl(order) {
  return grid.querySelector(`[data-order="${order}"]`);
}

function activateCurrent() {
  grid.querySelectorAll('.cell--active').forEach(el => el.classList.remove('cell--active'));
  if (state.currentIndex >= state.fillable.length) return;
  getCellEl(state.fillable[state.currentIndex].order)?.classList.add('cell--active');
}

function updateHint() {
  if (state.currentIndex >= state.fillable.length) {
    const { steps } = state;
    hintEl.textContent = steps.remainder > 0
      ? `答案：${steps.quotient} 餘 ${steps.remainder} ✓`
      : `答對了！答案是 ${steps.quotient}`;
    return;
  }

  const cell = state.fillable[state.currentIndex];
  const { divisor, steps } = state;
  const roundIdx = cell.type === 'quotient' ? cell.col - 1 : cell.roundIndex;
  const round = steps.rounds[roundIdx];

  // Show hint only after 2 wrong attempts on current cell
  if (state.cellErrors < 2) {
    hintEl.textContent = '填入正確的數字';
    return;
  }

  const hintMap = {
    quotient:  `${round.currentNumber} ÷ ${divisor} = ?`,
    product:   `${divisor} × ${round.quotientDigit} = ?`,
    subtract:  `${round.currentNumber} − ${round.product} = ?`,
    bringdown: `把 ${cell.value} 帶下來`,
  };

  hintEl.textContent = hintMap[cell.type] || '';
}

// Star rating: 0 errors = 3★, 1-2 = 2★, 3+ = 1★
function getStars(errors) {
  if (errors === 0) return 3;
  if (errors <= 2) return 2;
  return 1;
}

function updateStreak() {
  streakEl.hidden = streak === 0;
  streakCountEl.textContent = streak;
}

function showStars(count) {
  starsEl.hidden = false;
  starsEl.textContent = '★'.repeat(count) + '☆'.repeat(3 - count);
}

function showCelebration(stars) {
  const overlay = document.createElement('div');
  overlay.className = 'celebration';

  const content = document.createElement('div');
  content.className = 'celebration-content';

  const starsText = document.createElement('div');
  starsText.className = 'celebration-stars';
  starsText.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);

  const msg = document.createElement('div');
  msg.className = 'celebration-text';
  msg.textContent = streak >= 3 ? '太厲害了！' : '做得好！';

  content.appendChild(starsText);
  content.appendChild(msg);
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  setTimeout(() => overlay.remove(), 2500);
}

function showMilestone(milestone) {
  const badge = getMilestoneBadge(milestone);
  if (!badge) return;

  const overlay = document.createElement('div');
  overlay.className = 'celebration';

  const content = document.createElement('div');
  content.className = 'milestone-content';

  const emojiEl = document.createElement('div');
  emojiEl.className = 'milestone-emoji';
  emojiEl.textContent = badge.emoji;

  const title = document.createElement('div');
  title.className = 'milestone-title';
  title.textContent = `累計 ${milestone} 題！`;

  const sub = document.createElement('div');
  sub.className = 'milestone-sub';
  sub.textContent = milestone === 100 ? '太強了！' : '繼續加油！';

  content.appendChild(emojiEl);
  content.appendChild(title);
  content.appendChild(sub);
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  setTimeout(() => overlay.remove(), 3000);
}

function updateProgress() {
  const progressEl = document.getElementById('progress');
  if (!progressEl) return;
  if (isDaily(progress)) {
    progressEl.textContent = `第 ${progress.dailyCompleted}/${DAILY_GOAL} 題`;
  } else {
    progressEl.textContent = '自由練習';
  }
}

function updateTotalStars() {
  totalStarsEl.textContent = `⭐ ${progress.totalStars}`;
}

function updateBadge() {
  const badge = getMilestoneBadge(progress.totalProblems);
  if (badge) {
    badgeEl.textContent = `${badge.emoji} ${badge.label}`;
    badgeEl.hidden = false;
  } else {
    badgeEl.hidden = true;
  }
}

function startBossMode() {
  bossMode = { stage: 0, lives: 3, totalErrors: 0, starsEarned: 0 };
  bossBtnEl.textContent = '🚪 放棄挑戰';
  updateBossUI();
  startBossStageProblem();
}

function startBossStageProblem() {
  const stageConfig = BOSS_STAGES[bossMode.stage];
  const { dividend, divisor } = generateProblem(stageConfig.digitCount, stageConfig.divisorMin);
  const steps = calculateSteps(dividend, divisor);
  const layout = generateLayout(steps, dividend, divisor);

  const fillable = layout.cells
    .filter(c => c.fillable)
    .sort((a, b) => a.order - b.order);

  state = { dividend, divisor, steps, layout, fillable, currentIndex: 0, errors: 0, cellErrors: 0 };

  starsEl.hidden = true;

  // Adjust cell size for boss grids
  const digitCount = String(dividend).length;
  const bossCellSizes = { 4: '48px', 5: '44px', 6: '40px' };
  document.documentElement.style.setProperty(
    '--cell-size',
    bossCellSizes[digitCount] || ''
  );

  renderGrid();
  activateCurrent();
  hintEl.textContent = '填入正確的數字';
  updateBossUI();
}

function updateBossUI() {
  if (!bossMode) {
    bossLivesEl.hidden = true;
    streakEl.hidden = streak === 0;
    return;
  }

  streakEl.hidden = true;
  starsEl.hidden = true;
  bossLivesEl.hidden = false;

  const hearts = '❤️'.repeat(bossMode.lives) + '🖤'.repeat(3 - bossMode.lives);
  bossLivesEl.textContent = hearts;

  const progressEl = document.getElementById('progress');
  progressEl.textContent = `第${bossMode.stage + 1}關 ${BOSS_STAGES[bossMode.stage].digitCount}位÷1位`;
}

function onBossError() {
  bossMode.lives--;
  bossMode.totalErrors++;
  updateBossUI();

  if (bossMode.lives <= 0) {
    setTimeout(() => showBossDefeat(), 500);
  }
}

function onBossProblemComplete() {
  const stageConfig = BOSS_STAGES[bossMode.stage];
  bossMode.starsEarned += stageConfig.reward;

  // Save stars to progress
  progress.totalStars += stageConfig.reward;
  localStorage.setItem('aiden-math-progress', JSON.stringify(progress));
  updateTotalStars();

  if (bossMode.stage < BOSS_STAGES.length - 1) {
    showBossStageClear(bossMode.stage, stageConfig.reward);
    bossMode.stage++;
    setTimeout(() => {
      startBossStageProblem();
    }, 2500);
  } else {
    const perfectBonus = bossMode.totalErrors === 0 ? 5 : 0;
    if (perfectBonus > 0) {
      bossMode.starsEarned += perfectBonus;
      progress.totalStars += perfectBonus;
      localStorage.setItem('aiden-math-progress', JSON.stringify(progress));
      updateTotalStars();
    }
    setTimeout(() => showBossVictory(bossMode.starsEarned, perfectBonus), 500);
  }
}

function showBossStageClear(stageIndex, reward) {
  const overlay = document.createElement('div');
  overlay.className = 'celebration';

  const content = document.createElement('div');
  content.className = 'celebration-content';

  const title = document.createElement('div');
  title.className = 'celebration-stars';
  title.textContent = `第${stageIndex + 1}關 通過！`;

  const sub = document.createElement('div');
  sub.className = 'celebration-text';
  sub.textContent = `+${reward}⭐`;

  content.appendChild(title);
  content.appendChild(sub);
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  setTimeout(() => overlay.remove(), 2000);
}

function showBossVictory(totalStars, perfectBonus) {
  const overlay = document.createElement('div');
  overlay.className = 'fireworks-overlay';

  const canvas = document.createElement('canvas');
  canvas.className = 'fireworks-canvas';
  overlay.appendChild(canvas);

  const content = document.createElement('div');
  content.className = 'fireworks-content';
  content.innerHTML = `
    <div class="fireworks-title">🏆 魔王挑戰通關！</div>
    <div class="fireworks-stars">⭐ × ${totalStars}</div>
    ${perfectBonus > 0 ? `<div class="boss-perfect">零失誤 +${perfectBonus}⭐</div>` : ''}
  `;
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  const cleanup = launchFireworks(canvas, 4000);

  setTimeout(() => {
    cleanup();
    overlay.remove();
    exitBossMode();
  }, 5000);
}

function showBossDefeat() {
  const overlay = document.createElement('div');
  overlay.className = 'celebration';

  const content = document.createElement('div');
  content.className = 'milestone-content';

  const emoji = document.createElement('div');
  emoji.className = 'milestone-emoji';
  emoji.textContent = '💪';

  const title = document.createElement('div');
  title.className = 'milestone-title';
  const stageReached = bossMode.stage + 1;
  title.textContent = stageReached >= 2 ? `挑戰到第${stageReached}關！` : '下次再挑戰！';

  const sub = document.createElement('div');
  sub.className = 'milestone-sub';
  sub.textContent = bossMode.starsEarned > 0
    ? `獲得 ${bossMode.starsEarned}⭐`
    : '再試一次吧！';

  content.appendChild(emoji);
  content.appendChild(title);
  content.appendChild(sub);
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.remove();
    exitBossMode();
  }, 3000);
}

function exitBossMode() {
  bossMode = null;
  bossBtnEl.textContent = '⚔️ 魔王挑戰';
  document.documentElement.style.removeProperty('--cell-size');
  updateBossUI();
  startNewProblem();
  if (!isDaily(progress)) {
    bossEntryEl.hidden = false;
  }
}

const CELEBRATION_IMAGES = Array.from({ length: 10 }, (_, i) =>
  `assets/great-job-${String(i + 1).padStart(2, '0')}.webp`
);

function randomCelebrationImage() {
  return CELEBRATION_IMAGES[Math.floor(Math.random() * CELEBRATION_IMAGES.length)];
}

function showDailyComplete() {
  const summary = getDailySummary(progress);

  const overlay = document.createElement('div');
  overlay.className = 'fireworks-overlay';

  const canvas = document.createElement('canvas');
  canvas.className = 'fireworks-canvas';
  overlay.appendChild(canvas);

  const content = document.createElement('div');
  content.className = 'fireworks-content';
  content.innerHTML = `
    <img class="fireworks-img" src="${randomCelebrationImage()}" alt="你好棒" onerror="this.style.display='none'">
    <div class="fireworks-title">今日練習完成！</div>
    <div class="fireworks-stars">⭐ × ${summary.totalStars}</div>
  `;
  overlay.appendChild(content);

  document.body.appendChild(overlay);

  const cleanup = launchFireworks(canvas, 4000);

  setTimeout(() => {
    cleanup();
    overlay.remove();
    startNewProblem();
    bossEntryEl.hidden = false;
  }, 5000);
}

function onProblemComplete() {
  playComplete();

  if (bossMode) {
    onBossProblemComplete();
    return;
  }

  const stars = getStars(state.errors);
  streak++;

  const prevTotal = progress.totalProblems;
  progress = saveResult(localStorage, progress, { stars, errors: state.errors });

  updateStreak();
  updateTotalStars();
  updateBadge();
  updateProgress();

  const milestone = getMilestone(prevTotal, progress.totalProblems);

  if (progress.dailyCompleted === DAILY_GOAL) {
    showDailyComplete();
  } else if (milestone) {
    showMilestone(milestone);
    setTimeout(startNewProblem, 3500);
  } else {
    showCelebration(stars);
    setTimeout(startNewProblem, 3000);
  }
}

function handleDigit(digit) {
  if (!state || state.currentIndex >= state.fillable.length) return;

  const cell = state.fillable[state.currentIndex];
  const el = getCellEl(cell.order);
  if (!el) return;

  if (validateInput(cell, digit)) {
    playCorrect();
    el.classList.remove('cell--fillable', 'cell--active');
    el.classList.add('cell--filled');
    el.textContent = cell.value;

    state.currentIndex++;
    state.cellErrors = 0;
    activateCurrent();
    updateHint();

    if (state.currentIndex >= state.fillable.length) {
      onProblemComplete();
    }
  } else {
    playError();
    state.errors++;
    state.cellErrors++;

    el.classList.add('cell--error');
    el.addEventListener('animationend', () => el.classList.remove('cell--error'), { once: true });

    if (bossMode) {
      onBossError();
    } else {
      if (state.errors >= 3) streak = 0;
      updateStreak();
      updateHint();
    }
  }
}

// Number pad clicks
numpadBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    resumeAudio();
    handleDigit(Number(btn.dataset.digit));
  });
});

// Keyboard input
document.addEventListener('keydown', (e) => {
  if (e.key >= '0' && e.key <= '9') handleDigit(Number(e.key));
});

// Show boss entry if daily already complete
if (!isDaily(progress)) {
  bossEntryEl.hidden = false;
}

// Boss button click handler
bossBtnEl.addEventListener('click', () => {
  resumeAudio();
  if (bossMode) {
    exitBossMode();
  } else {
    startBossMode();
  }
});

startNewProblem();
