import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import type { DaySession, ProgressData } from '../types';
import { defaultProgress, STORAGE_KEY } from '../lib/storage';
import {
  INTERVALS,
  computeStreak,
  nextInterval,
  restartIfStale,
  todayStr,
} from '../lib/review';
import type { ExerciseKind } from '../types';

export interface ProgressStore {
  data: ProgressData;
  storageError: boolean;
  learnWord: (id: number) => void;
  answerWord: (id: number, ok: boolean) => void;
  logExercise: (kind: ExerciseKind) => void;
  setDailyGoal: (n: number) => void;
  resetProgress: () => void;
  replaceData: (data: ProgressData) => void;
  clearStorageError: () => void;
}

let suppressStorageError = false;

function markStorageError(): void {
  if (suppressStorageError) return;
  if (!useProgress.getState().storageError) {
    useProgress.setState({ storageError: true });
  }
}

const safeStorage: StateStorage = {
  getItem: (name: string) => {
    try {
      return localStorage.getItem(name);
    } catch {
      markStorageError();
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
      suppressStorageError = false;
    } catch {
      markStorageError();
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
    } catch {
      markStorageError();
    }
  },
};

const ZERO_EXERCISES: Record<ExerciseKind, number> = {
  flashcard: 0,
  mcq: 0,
  listen: 0,
  cloze: 0,
  dictation: 0,
};

function normalizeSession(session?: DaySession): DaySession {
  return {
    learned: session?.learned ?? 0,
    reviewed: session?.reviewed ?? 0,
    exercises: { ...ZERO_EXERCISES, ...session?.exercises },
  };
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const useProgress = create<ProgressStore>()(
  persist(
    (set, get) => ({
      data: defaultProgress(),
      storageError: false,

      learnWord: (id: number) => {
        const data = get().data;
        if (data.completed[id] !== undefined) return;
        const today = todayStr();
        const session = normalizeSession(data.sessions[today]);
        const review = data.review[id] ?? {
          due: addDays(today, INTERVALS[0]),
          interval: 1,
        };
        const completed = { ...data.completed, [id]: today };
        set({
          data: {
            ...data,
            completed,
            review: { ...data.review, [id]: review },
            sessions: {
              ...data.sessions,
              [today]: { ...session, learned: session.learned + 1 },
            },
            stats: { ...data.stats, totalLearned: Object.keys(completed).length },
          },
        });
      },

      answerWord: (id: number, ok: boolean) => {
        const data = get().data;
        const today = todayStr();
        const entry = data.review[id];
        const currentTier = entry ? restartIfStale(entry, today) : 0;
        const tier = nextInterval(currentTier, ok);
        const session = normalizeSession(data.sessions[today]);
        set({
          data: {
            ...data,
            review: {
              ...data.review,
              [id]: { due: addDays(today, INTERVALS[tier - 1]), interval: tier },
            },
            sessions: {
              ...data.sessions,
              [today]: { ...session, reviewed: session.reviewed + 1 },
            },
          },
        });
      },

      logExercise: (kind: ExerciseKind) => {
        const data = get().data;
        const today = todayStr();
        const session = normalizeSession(data.sessions[today]);
        const newSession: DaySession = {
          ...session,
          exercises: { ...session.exercises, [kind]: session.exercises[kind] + 1 },
        };
        const newSessions = { ...data.sessions, [today]: newSession };
        set({
          data: {
            ...data,
            sessions: newSessions,
            stats: { ...data.stats, streak: computeStreak(newSessions, today) },
          },
        });
      },

      setDailyGoal: (n: number) => {
        set({ data: { ...get().data, settings: { ...get().data.settings, dailyGoal: n } } });
      },

      resetProgress: () => {
        set({ data: defaultProgress() });
      },

      replaceData: (data: ProgressData) => {
        set({ data });
      },

      clearStorageError: () => {
        suppressStorageError = true;
        set({ storageError: false });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => {
        if (typeof localStorage === 'undefined') {
          throw new Error('localStorage unavailable');
        }
        return safeStorage;
      }),
      partialize: (state) => ({
        data: {
          settings: state.data.settings,
          completed: state.data.completed,
          review: state.data.review,
          sessions: state.data.sessions,
          stats: state.data.stats,
        },
      }),
    },
  ),
);
