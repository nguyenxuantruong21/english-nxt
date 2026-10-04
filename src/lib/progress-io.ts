import type { ProgressData } from '../types';
import { todayStr } from './review';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export type ImportResult =
  | { ok: true; data: ProgressData }
  | { ok: false; error: string };

const INVALID = 'File không đúng định dạng tiến độ english_nxt';

export function parseProgressJson(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'File không phải JSON hợp lệ' };
  }
  if (!isRecord(parsed)) return { ok: false, error: INVALID };

  const { settings, completed, review, sessions, stats } = parsed;
  if (!isRecord(settings) || typeof settings.dailyGoal !== 'number' || !Number.isFinite(settings.dailyGoal)) {
    return { ok: false, error: 'Thiếu settings.dailyGoal hợp lệ' };
  }
  if (!isRecord(completed) || !isRecord(review) || !isRecord(sessions)) {
    return { ok: false, error: INVALID };
  }

  const totalLearned = Object.keys(completed).length;
  const nextStats =
    isRecord(stats) && typeof stats.streak === 'number' && typeof stats.totalLearned === 'number'
      ? { streak: stats.streak, totalLearned: stats.totalLearned }
      : { streak: 0, totalLearned };

  return {
    ok: true,
    data: {
      settings: { dailyGoal: settings.dailyGoal },
      completed: completed as ProgressData['completed'],
      review: review as ProgressData['review'],
      sessions: sessions as ProgressData['sessions'],
      stats: nextStats,
    },
  };
}

export function progressExport(data: ProgressData): { filename: string; content: string } {
  return {
    filename: `english-nxt-progress-${todayStr()}.json`,
    content: JSON.stringify(data, null, 2),
  };
}
