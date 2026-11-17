// import 帶版本參數：HTML 只能 bust 到 app.js 本身，子模組（尤其持有進度形狀的 daily.js）
// 得靠這裡的 ?v= 一起換版，否則快取拼出新 app.js＋舊 daily.js 的混版模組圖
import { generateProblem, calculateSteps, generateLayout, validateInput } from './division.js?v=20260715a';
import { resumeAudio, playCorrect, playError, playComplete } from './sound.js?v=20260715a';
import { loadProgress, saveResult, isDaily, getDailySummary, DAILY_GOAL, getMilestone, getMilestoneBadge } from './daily.js?v=20260715a';
import { launchFireworks } from './fireworks.js?v=20260715a';

const grid = document.getElementById('division-grid');
const hintEl = document.getElementById('hint');
const numpad = document.querySelector('.numpad');
const numpadBtns = document.querySelectorAll('.num-btn');
const streakEl = document.getElementById('streak');
const streakCountEl = streakEl.querySelector('.streak-count');
const totalStarsEl = document.getElementById('total-stars');
const badgeEl = document.getElementById('badge');
const progressEl = document.getElementById('progress');
const stepMeter = document.getElementById('step-meter');
const stepProgress = document.getElementById('step-progress');
const resultEl = document.getElementById('math-result');
const resultTitle = document.getElementById('math-result-title');
const resultDetail = document.getElementById('math-result-detail');
const resultCanvas = resultEl.querySelector('canvas');
const resultImage = resultEl.querySelector('img');
const bossLivesEl = document.getElementById('boss-lives');
const bossEntryEl = document.getElementById('boss-entry');
const bossBtnEl = document.getElementById('boss-btn');

// 平台接線（#33，index.html 內建立）：child 維度存檔 facade＋同步 client。
// store 把任何 key 映射到 math:progress:<child>，daily.js 的注入式 storage 介面因此免改。
const PLATFORM = window.MathPlatform;
const family = window.MathFamily;

let state = null;
let streak = 0;
let progress = null; // main() 等同步 boot pull 完成後才載入
let collectionRound;
function beginCollectionRound() {
  collectionRound = { roundId: crypto.randomUUID(), entryId: 'math' };
  family?.beginRound?.(collectionRound);
}

// Boss challenge state
const BOSS_STAGES = [
  { digitCount: 4, divisorMin: 7, reward: 2 },
  { digitCount: 5, divisorMin: 7, reward: 3 },
  { digitCount: 6, divisorMin: 7, reward: 5 },
];
let bossMode = null; // null | { stage, lives, totalErrors, starsEarned }

function scheduleBossTransition(action, delay) {
  const challenge = bossMode;
  setTimeout(() => {
    if (bossMode === challenge) action(challenge);
  }, delay);
}

function startNewProblem() {
  beginCollectionRound();
  family?.setActive(true);
  bossEntryEl.hidden = true;  // Reset: will be shown later if daily complete
  const { dividend, divisor } = generateProblem();
  const steps = calculateSteps(dividend, divisor);
  const layout = generateLayout(steps, dividend, divisor);

  const fillable = layout.cells
    .filter(c => c.fillable)
    .sort((a, b) => a.order - b.order);

  state = { dividend, divisor, steps, layout, fillable, currentIndex: 0, errors: 0, cellErrors: 0 };

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
  stepMeter.max = state.fillable.length;
  stepMeter.value = state.currentIndex;
  stepProgress.textContent = `已填 ${state.currentIndex} / ${state.fillable.length} 格`;
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

function showRoundResult({ title, detail, delay, next, fireworks = false, image }) {
  numpad.hidden = true;
  bossBtnEl.disabled = true;
  resultTitle.textContent = title;
  resultDetail.textContent = detail;
  resultImage.hidden = !image;
  if (image) resultImage.src = image;
  resultEl.hidden = false;
  const animate = fireworks && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  resultCanvas.hidden = !animate;
  const cleanup = animate ? launchFireworks(resultCanvas, 4000) : null;
  family?.finishRound(collectionRound);

  setTimeout(() => {
    cleanup?.();
    resultEl.hidden = true;
    numpad.hidden = false;
    bossBtnEl.disabled = false;
    next();
  }, delay);
}

function updateProgress() {
  if (isDaily(progress)) {
    progressEl.textContent = `每日練習已完成 ${progress.dailyCompleted} / ${DAILY_GOAL} 題`;
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
  beginCollectionRound();
  bossMode = { stage: 0, lives: 3, totalErrors: 0, starsEarned: 0 };
  bossBtnEl.textContent = '🚪 放棄挑戰';
  updateBossUI();
  startBossStageProblem();
}

function startBossStageProblem() {
  family?.setActive(true);
  const stageConfig = BOSS_STAGES[bossMode.stage];
  const { dividend, divisor } = generateProblem(stageConfig.digitCount, stageConfig.divisorMin);
  const steps = calculateSteps(dividend, divisor);
  const layout = generateLayout(steps, dividend, divisor);

  const fillable = layout.cells
    .filter(c => c.fillable)
    .sort((a, b) => a.order - b.order);

  state = { dividend, divisor, steps, layout, fillable, currentIndex: 0, errors: 0, cellErrors: 0 };

  // Adjust cell size for boss grids
  const digitCount = String(dividend).length;
  const bossCellSizes = { 4: '48px', 5: '44px', 6: '40px' };
  document.documentElement.style.setProperty(
    '--cell-size',
    bossCellSizes[digitCount] || ''
  );

  renderGrid();
  activateCurrent();
  updateHint();
  updateBossUI();
}

function updateBossUI() {
  if (!bossMode) {
    bossLivesEl.hidden = true;
    streakEl.hidden = streak === 0;
    return;
  }

  streakEl.hidden = true;
  bossLivesEl.hidden = false;

  const hearts = '❤️'.repeat(bossMode.lives) + '🖤'.repeat(3 - bossMode.lives);
  bossLivesEl.textContent = hearts;

  progressEl.textContent = `魔王挑戰 第 ${bossMode.stage + 1} / ${BOSS_STAGES.length} 關`;
}

function onBossError() {
  bossMode.lives--;
  bossMode.totalErrors++;
  updateBossUI();

  if (bossMode.lives <= 0) {
    scheduleBossTransition(showBossDefeat, 500);
  }
}

function onBossProblemComplete() {
  const stageConfig = BOSS_STAGES[bossMode.stage];
  bossMode.starsEarned += stageConfig.reward;

  // Save stars to progress
  progress.totalStars += stageConfig.reward;
  PLATFORM.saveProgress(progress);
  updateTotalStars();

  if (bossMode.stage < BOSS_STAGES.length - 1) {
    hintEl.textContent += `。第 ${bossMode.stage + 1} 關完成。`;
    scheduleBossTransition((challenge) => {
      challenge.stage++;
      startBossStageProblem();
    }, 2500);
  } else {
    const perfectBonus = bossMode.totalErrors === 0 ? 5 : 0;
    if (perfectBonus > 0) {
      bossMode.starsEarned += perfectBonus;
      progress.totalStars += perfectBonus;
      PLATFORM.saveProgress(progress);
      updateTotalStars();
    }
    scheduleBossTransition((challenge) => showBossVictory(challenge.starsEarned, perfectBonus), 500);
  }
}

function showBossVictory(totalStars, perfectBonus) {
  showRoundResult({
    title: '魔王挑戰通關！',
    detail: `獲得 ${totalStars} 顆星星${perfectBonus ? `（含零失誤加 ${perfectBonus} 顆）` : ''}`,
    delay: 5000, next: exitBossMode, fireworks: true,
  });
}

function showBossDefeat() {
  const stageReached = bossMode.stage + 1;
  showRoundResult({
    title: '魔王挑戰結束',
    detail: `挑戰到第 ${stageReached} 關，獲得 ${bossMode.starsEarned} 顆星星`,
    delay: 3000, next: exitBossMode,
  });
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
  showRoundResult({
    title: '今日練習完成！',
    detail: `完成 ${summary.problemCount} 題，獲得 ${summary.totalStars} 顆星星`,
    delay: 5000, next: startNewProblem, fireworks: true, image: randomCelebrationImage(),
  });
}

function onProblemComplete() {
  family?.setActive(false);
  family?.record({answered:true,correct:state.errors===0});
  playComplete();

  if (bossMode) {
    onBossProblemComplete();
    return;
  }

  const stars = getStars(state.errors);
  streak++;

  const prevTotal = progress.totalProblems;
  progress = saveResult(PLATFORM.store, progress, { stars, errors: state.errors });

  updateStreak();
  updateTotalStars();
  updateBadge();
  updateProgress();

  const milestone = getMilestone(prevTotal, progress.totalProblems);

  if (progress.dailyCompleted === DAILY_GOAL) {
    showDailyComplete();
  } else {
    showRoundResult({
      title: '這一題完成！',
      detail: `獲得 ${stars} 顆星星${milestone ? `，累計完成 ${milestone} 題！` : ''}`,
      delay: milestone ? 3500 : 3000, next: startNewProblem,
    });
  }
}

function handleDigit(digit) {
  if (!state || state.currentIndex >= state.fillable.length || bossMode?.lives === 0) return;

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

// Boss button click handler
bossBtnEl.addEventListener('click', () => {
  resumeAudio();
  if (bossMode) {
    exitBossMode();
  } else {
    startBossMode();
  }
});

async function main() {
  // 身分不可解（?child= 指名但 sync-v1.js 沒載到）→ index.html 已換上錯誤畫面，這裡不得動存檔
  if (PLATFORM.blocked) return;
  // 開啟時 pull 完成才讀進度（adopt 直寫本機存檔；離線／無 token 靜默走本機）
  await PLATFORM.ready;
  await family?.ready;
  if (family && !family.allowed()) {family.block();return;}
  progress = loadProgress(PLATFORM.store, new Date().toISOString().slice(0, 10));
  // adopt（含 conflict-adopt）＝整包取遠端：存檔已被 saveData 覆蓋，重讀＋重繪表頭即可。
  // 做題中換 progress 無妨——progress 只在題目完成時讀寫（totals），LWW 由下一次存檔收斂
  PLATFORM.onAdopt(() => {
    progress = loadProgress(PLATFORM.store, new Date().toISOString().slice(0, 10));
    if (!bossMode) {
      updateTotalStars();
      updateBadge();
      updateProgress();
    }
    if (!isDaily(progress) && !bossMode) bossEntryEl.hidden = false;
  });

  // Show boss entry if daily already complete
  if (!isDaily(progress)) {
    bossEntryEl.hidden = false;
  }

  startNewProblem();
}

main();
