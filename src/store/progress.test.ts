import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mem } = vi.hoisted(() => {
  const mem = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  });
  return { mem };
});

import { useProgress } from './progress';
import { defaultProgress, STORAGE_KEY } from '../lib/storage';
import { INTERVALS, todayStr } from '../lib/review';
import type { ProgressData } from '../types';

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

beforeEach(() => {
  mem.clear();
  useProgress.setState({ data: defaultProgress(), storageError: false });
});

describe('useProgress singleton', () => {
  it('exposes the zustand store API on the hook itself', () => {
    expect(typeof useProgress.getState).toBe('function');
    expect(typeof useProgress.setState).toBe('function');
    expect(typeof useProgress.subscribe).toBe('function');
  });

  it('shares state across getState calls (one store)', () => {
    useProgress.getState().learnWord(1);
    expect(useProgress.getState().data.completed[1]).toMatch(DATE_RE);
    expect(useProgress.getState().data.stats.totalLearned).toBe(1);
  });

  it('notifies subscribers on change and stops after unsubscribe', () => {
    const spy = vi.fn();
    const unsub = useProgress.subscribe(spy);
    useProgress.getState().learnWord(1);
    expect(spy).toHaveBeenCalledTimes(1);
    unsub();
    useProgress.getState().learnWord(2);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('learnWord', () => {
  it('marks word completed with today date and updates totalLearned', () => {
    useProgress.getState().learnWord(1);
    const s = useProgress.getState();
    expect(s.data.completed[1]).toBe(todayStr());
    expect(s.data.completed[1]).toMatch(DATE_RE);
    expect(s.data.stats.totalLearned).toBe(1);
    useProgress.getState().learnWord(2);
    expect(useProgress.getState().data.stats.totalLearned).toBe(2);
  });

  it("creates today's session and increments learned", () => {
    useProgress.getState().learnWord(1);
    expect(useProgress.getState().data.sessions[todayStr()]).toEqual({
      learned: 1,
      reviewed: 0,
      exercises: { flashcard: 0, mcq: 0, listen: 0, cloze: 0, dictation: 0 },
    });
  });

  it('creates a review entry due tomorrow at tier 1', () => {
    useProgress.getState().learnWord(1);
    expect(useProgress.getState().data.review[1]).toEqual({
      due: addDays(todayStr(), INTERVALS[0]),
      interval: 1,
    });
  });

  it('is idempotent for an already learned word', () => {
    useProgress.getState().learnWord(1);
    useProgress.getState().learnWord(1);
    const s = useProgress.getState();
    expect(s.data.stats.totalLearned).toBe(1);
    expect(s.data.sessions[todayStr()].learned).toBe(1);
    expect(s.data.review[1].interval).toBe(1);
    expect(s.data.review[1].due).toBe(addDays(todayStr(), INTERVALS[0]));
  });
});

describe('answerWord', () => {
  it('starts at tier 1 due tomorrow when no prior entry', () => {
    useProgress.getState().answerWord(1, true);
    expect(useProgress.getState().data.review[1]).toEqual({
      due: addDays(todayStr(), INTERVALS[0]),
      interval: 1,
    });
  });

  it('ok promotes from tier 1 to tier 2 with due in 3 days', () => {
    useProgress.getState().learnWord(1);
    useProgress.getState().answerWord(1, true);
    const s = useProgress.getState();
    expect(s.data.review[1].interval).toBe(2);
    expect(s.data.review[1].due).toBe(addDays(todayStr(), INTERVALS[1]));
  });

  it('fail resets to tier 1 due tomorrow', () => {
    useProgress.getState().learnWord(1);
    useProgress.getState().answerWord(1, true);
    useProgress.getState().answerWord(1, false);
    const s = useProgress.getState();
    expect(s.data.review[1].interval).toBe(1);
    expect(s.data.review[1].due).toBe(addDays(todayStr(), INTERVALS[0]));
  });

  it('increments session.reviewed for each answer', () => {
    useProgress.getState().learnWord(1);
    useProgress.getState().answerWord(1, true);
    useProgress.getState().answerWord(1, false);
    expect(useProgress.getState().data.sessions[todayStr()].reviewed).toBe(2);
  });

  it('restarts at tier 1 when entry is stale, then promotes to tier 2', () => {
    const today = todayStr();
    useProgress.setState({
      data: {
        ...useProgress.getState().data,
        review: { 7: { due: addDays(today, -30), interval: 3 } },
      },
    });
    useProgress.getState().answerWord(7, true);
    const s = useProgress.getState();
    expect(s.data.review[7].interval).toBe(2);
    expect(s.data.review[7].due).toBe(addDays(today, INTERVALS[1]));
  });

  it('caps tier at 5 (30 days)', () => {
    const today = todayStr();
    useProgress.setState({
      data: {
        ...useProgress.getState().data,
        review: { 9: { due: today, interval: 5 } },
      },
    });
    useProgress.getState().answerWord(9, true);
    expect(useProgress.getState().data.review[9].interval).toBe(5);
    expect(useProgress.getState().data.review[9].due).toBe(addDays(today, INTERVALS[4]));
  });
});

describe('logExercise', () => {
  it('creates full zero session shape and increments only the exercise kind', () => {
    useProgress.getState().logExercise('flashcard');
    expect(useProgress.getState().data.sessions[todayStr()]).toEqual({
      learned: 0,
      reviewed: 0,
      exercises: { flashcard: 1, mcq: 0, listen: 0, cloze: 0, dictation: 0 },
    });
  });

  it('accumulates repeated exercises', () => {
    useProgress.getState().logExercise('flashcard');
    useProgress.getState().logExercise('flashcard');
    expect(useProgress.getState().data.sessions[todayStr()].exercises.flashcard).toBe(2);
  });

  it('does not touch learned count (owned by learnWord)', () => {
    useProgress.getState().learnWord(1);
    useProgress.getState().logExercise('dictation');
    useProgress.getState().logExercise('cloze');
    const sess = useProgress.getState().data.sessions[todayStr()];
    expect(sess.learned).toBe(1);
    expect(sess.exercises.dictation).toBe(1);
    expect(sess.exercises.cloze).toBe(1);
  });

  it('updates stats.streak', () => {
    useProgress.getState().logExercise('flashcard');
    expect(useProgress.getState().data.stats.streak).toBeGreaterThanOrEqual(1);
  });
});

describe('settings and reset', () => {
  it('setDailyGoal updates the daily goal', () => {
    useProgress.getState().setDailyGoal(30);
    expect(useProgress.getState().data.settings.dailyGoal).toBe(30);
  });

  it('replaceData swaps the whole progress payload and persists it', () => {
    const next: ProgressData = {
      ...defaultProgress(),
      settings: { dailyGoal: 42 },
      completed: { 3: '2026-01-01' },
      stats: { streak: 1, totalLearned: 1 },
    };
    useProgress.getState().replaceData(next);
    expect(useProgress.getState().data).toEqual(next);
    const raw = mem.get(STORAGE_KEY);
    expect(JSON.parse(raw as string).state.data.settings.dailyGoal).toBe(42);
  });

  it('resetProgress resets to default', () => {
    useProgress.getState().learnWord(1);
    useProgress.getState().logExercise('flashcard');
    useProgress.getState().setDailyGoal(10);
    useProgress.getState().resetProgress();
    const s = useProgress.getState();
    expect(s.data.settings.dailyGoal).toBe(20);
    expect(s.data.completed).toEqual({});
    expect(s.data.review).toEqual({});
    expect(s.data.sessions).toEqual({});
    expect(s.data.stats).toEqual({ streak: 0, totalLearned: 0 });
  });

  it('starts with default progress', () => {
    const s = useProgress.getState();
    expect(s.data.settings.dailyGoal).toBe(20);
    expect(s.data.completed).toEqual({});
    expect(s.data.review).toEqual({});
    expect(s.data.sessions).toEqual({});
    expect(s.data.stats.streak).toBe(0);
    expect(s.data.stats.totalLearned).toBe(0);
  });
});

describe('persistence', () => {
  it('persists data under STORAGE_KEY', () => {
    useProgress.getState().learnWord(1);
    useProgress.getState().setDailyGoal(15);
    const raw = mem.get(STORAGE_KEY);
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw as string);
    expect(parsed.state.data.settings.dailyGoal).toBe(15);
    expect(parsed.state.data.completed['1']).toMatch(DATE_RE);
    expect(parsed.state.data.completed['1']).toBe(todayStr());
  });

  it('rehydrates persisted data into a fresh module instance', async () => {
    useProgress.getState().learnWord(1);
    useProgress.getState().logExercise('flashcard');
    vi.resetModules();
    const fresh = (await import('./progress')).useProgress;
    expect(fresh.getState().data.completed[1]).toMatch(DATE_RE);
    expect(fresh.getState().data.stats.totalLearned).toBe(1);
    expect(Object.keys(fresh.getState().data.sessions).length).toBe(1);
  });
});

describe('storage failure handling', () => {
  const workingStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  };

  it('flags storageError instead of throwing when setItem fails', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('nope');
      },
    });
    try {
      expect(() => useProgress.getState().learnWord(1)).not.toThrow();
      expect(useProgress.getState().storageError).toBe(true);
      expect(useProgress.getState().data.completed[1]).toBe(todayStr());
    } finally {
      vi.stubGlobal('localStorage', workingStorage);
    }
  });

  it('clearStorageError resets the flag and stays dismissed while storage fails', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
    });
    try {
      useProgress.getState().learnWord(1);
      expect(useProgress.getState().storageError).toBe(true);
      useProgress.getState().clearStorageError();
      expect(useProgress.getState().storageError).toBe(false);
      useProgress.getState().learnWord(2);
      expect(useProgress.getState().storageError).toBe(false);
    } finally {
      vi.stubGlobal('localStorage', workingStorage);
    }
  });

  it('flags again after a successful write clears the dismissal', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
    });
    try {
      useProgress.getState().learnWord(1);
      useProgress.getState().clearStorageError();
      vi.stubGlobal('localStorage', workingStorage);
      useProgress.getState().learnWord(2);
      expect(useProgress.getState().storageError).toBe(false);
      vi.stubGlobal('localStorage', {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
        removeItem: () => {},
      });
      useProgress.getState().learnWord(3);
      expect(useProgress.getState().storageError).toBe(true);
    } finally {
      vi.stubGlobal('localStorage', workingStorage);
    }
  });
});
