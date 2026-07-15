const KEY = 'aiden-math-progress';
export const DAILY_GOAL = 5;

function freshState(date) {
  // schemaVersion＝雲端同步 schema-block 比對用（#33）：資料本體自帶，缺了保護永遠不觸發
  return { schemaVersion: 1, date, dailyCompleted: 0, dailyResults: [], totalProblems: 0, totalStars: 0 };
}

export function loadProgress(storage, today) {
  const raw = storage.getItem(KEY);
  if (!raw) return freshState(today);

  // 壞 JSON／非物件（含同步 adopt 可能寫進來的 "null"）一律視同無存檔——這裡拋出去會把 app 永久卡死
  let saved = null;
  try { saved = JSON.parse(raw); } catch (e) {}
  if (!saved || typeof saved !== 'object') return freshState(today);
  if (saved.date === today) return saved;

  // New day: keep totals, reset daily
  return {
    schemaVersion: 1,
    date: today,
    dailyCompleted: 0,
    dailyResults: [],
    totalProblems: saved.totalProblems || 0,
    totalStars: saved.totalStars || 0,
  };
}

export function saveResult(storage, progress, result) {
  const updated = {
    ...progress,
    dailyCompleted: progress.dailyCompleted + 1,
    dailyResults: [...progress.dailyResults, result],
    totalProblems: progress.totalProblems + 1,
    totalStars: progress.totalStars + result.stars,
  };
  storage.setItem(KEY, JSON.stringify(updated));
  return updated;
}

export function isDaily(progress) {
  return progress.dailyCompleted < DAILY_GOAL;
}

export function getDailySummary(progress) {
  const totalStars = progress.dailyResults.reduce((sum, r) => sum + r.stars, 0);
  return { totalStars, problemCount: progress.dailyResults.length };
}

const MILESTONES = [5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export function getMilestone(before, after) {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    const m = MILESTONES[i];
    if (before < m && after >= m) return m;
  }
  return null;
}

const BADGES = [
  { threshold: 100, emoji: '💎', label: '100 題' },
  { threshold: 90, emoji: '🏅', label: '90 題' },
  { threshold: 80, emoji: '🏅', label: '80 題' },
  { threshold: 70, emoji: '🏅', label: '70 題' },
  { threshold: 60, emoji: '🏅', label: '60 題' },
  { threshold: 50, emoji: '🏅', label: '50 題' },
  { threshold: 40, emoji: '🏅', label: '40 題' },
  { threshold: 30, emoji: '🏅', label: '30 題' },
  { threshold: 20, emoji: '🏅', label: '20 題' },
  { threshold: 15, emoji: '🥇', label: '15 題' },
  { threshold: 10, emoji: '🥈', label: '10 題' },
  { threshold: 5, emoji: '🥉', label: '5 題' },
];

export function getMilestoneBadge(totalProblems) {
  for (const b of BADGES) {
    if (totalProblems >= b.threshold) return { emoji: b.emoji, label: b.label };
  }
  return null;
}
