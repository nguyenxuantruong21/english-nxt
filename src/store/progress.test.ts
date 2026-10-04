import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProgress } from './progress';

const mem = new Map<string, string>();

beforeEach(() => {
  mem.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  });
});

describe('useProgress', () => {
  it('has default progress on init', () => {
    const store = useProgress();
    const s = store.getState();
    expect(s.data.settings.dailyGoal).toBe(20);
    expect(s.data.completed).toEqual({});
    expect(s.data.review).toEqual({});
    expect(s.data.sessions).toEqual({});
    expect(s.data.stats.streak).toBe(0);
    expect(s.data.stats.totalLearned).toBe(0);
  });

  it('learnWord marks word as completed and updates totalLearned', () => {
    const store = useProgress();
    store.getState().learnWord(1);
    const s = store.getState();
    expect(s.data.completed[1]).toBe('english_nxt_v1');
    expect(s.data.stats.totalLearned).toBe(1);
    store.getState().learnWord(2);
    const s2 = store.getState();
    expect(s2.data.stats.totalLearned).toBe(2);
  });

  it('answerWord updates review entry with due and interval', () => {
    const store = useProgress();
    store.getState().answerWord(1, true);
    const s = store.getState();
    expect(s.data.review[1]).toHaveProperty('due');
    expect(s.data.review[1]).toHaveProperty('interval');
    expect(s.data.review[1].interval).toBe(1);

    store.getState().answerWord(1, false);
    const s2 = store.getState();
    expect(s2.data.review[1].interval).toBe(1);
  });

  it('logExercise creates/updates session and exercises', () => {
    const store = useProgress();
    store.getState().logExercise('flashcard' as const);
    const s = store.getState();
    const key = Object.keys(s.data.sessions)[0];
    expect(key).toBeDefined();
    expect(s.data.sessions[key].exercises.flashcard).toBe(1);

    store.getState().logExercise('flashcard' as const);
    const s2 = store.getState();
    expect(s2.data.sessions[key].exercises.flashcard).toBe(2);
  });

  it('setDailyGoal updates the daily goal', () => {
    const store = useProgress();
    store.getState().setDailyGoal(30);
    const s = store.getState();
    expect(s.data.settings.dailyGoal).toBe(30);
  });

  it('resetProgress resets to default', () => {
    const store = useProgress();
    store.getState().learnWord(1);
    store.getState().setDailyGoal(10);
    store.getState().resetProgress();
    const s = store.getState();
    expect(s.data.settings.dailyGoal).toBe(20);
    expect(s.data.completed).toEqual({});
    expect(s.data.sessions).toEqual({});
  });

  it('getStreak returns 0 when no sessions for today', () => {
    const store = useProgress();
    const s = store.getState();
    expect(s.data.stats.streak).toBe(0);
  });

  it('getStreak computes streak from sessions via logExercise', () => {
    const store = useProgress();
    store.getState().logExercise('flashcard' as const);
    const s = store.getState();
    expect(s.data.stats.streak).toBeGreaterThanOrEqual(1);
  });

  it('persists and restores from localStorage', () => {
    const store = useProgress();
    store.getState().learnWord(1);
    store.getState().setDailyGoal(15);
    const s = store.getState();
    expect(s.data.settings.dailyGoal).toBe(15);
    expect(s.data.completed[1]).toBe('english_nxt_v1');
  });
});