import type { ProgressData } from "../types";

export const STORAGE_KEY = "english_nxt_v1";

export function defaultProgress(): ProgressData {
  return {
    settings: { dailyGoal: 20, volume: 100 },
    completed: {},
    review: {},
    sessions: {},
    stats: { streak: 0, totalLearned: 0 },
  };
}

export function loadProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as Partial<ProgressData>;
    const d = defaultProgress();
    return {
      settings: { ...d.settings, ...parsed.settings },
      completed: parsed.completed ?? {},
      review: parsed.review ?? {},
      sessions: parsed.sessions ?? {},
      stats: { ...d.stats, ...parsed.stats },
    };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(data: ProgressData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // quota exceeded — tiến độ vẫn hoạt động trong phiên hiện tại
  }
}
