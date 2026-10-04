import type { DaySession, ProgressData } from "../types";

export const INTERVALS = [1, 3, 7, 14, 30];
export const STALE_DAYS = 7;

export interface ReviewEntry {
  due: string;
  interval: number;
}

export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function nextInterval(current: number, ok: boolean): number {
  if (!ok) return 1;
  if (current <= 0) return 1;
  return Math.min(current + 1, INTERVALS.length);
}

export function isDue(entry: ReviewEntry, today: string): boolean {
  return daysBetween(entry.due, today) >= 0;
}

export function restartIfStale(entry: ReviewEntry, today: string): number {
  const overdue = daysBetween(entry.due, today);
  if (overdue > STALE_DAYS) return 1;
  return entry.interval;
}

export function computeStreak(
  sessions: ProgressData["sessions"],
  today: string,
): number {
  if (!sessions[today]) return 0;
  let streak = 0;
  const [y, m, d] = today.split("-").map(Number);
  const cursor = new Date(y, m - 1, d);
  for (;;) {
    const key = todayStr(cursor);
    if (!sessions[key]) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const emptySession = (): DaySession => ({
  learned: 0,
  reviewed: 0,
  exercises: { flashcard: 0, mcq: 0, listen: 0, cloze: 0, dictation: 0 },
});

export function dailyStats(p: ProgressData, today: string) {
  const session = p.sessions[today] ?? emptySession();
  const dueCount = Object.values(p.review).filter((e) =>
    isDue(e, today),
  ).length;
  return {
    goal: p.settings.dailyGoal,
    learnedToday: session.learned,
    reviewedToday: session.reviewed,
    dueCount,
    remaining: Math.max(0, p.settings.dailyGoal - session.learned),
    session,
  };
}
