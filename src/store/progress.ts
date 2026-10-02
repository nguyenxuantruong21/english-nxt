import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ProgressData } from '../types';
import { defaultProgress, STORAGE_KEY } from '../lib/storage';
import { computeStreak } from '../lib/review';
import type { ExerciseKind } from '../types';

export interface ProgressStore {
  data: ProgressData;
  learnWord: (id: number) => void;
  answerWord: (id: number, ok: boolean) => void;
  logExercise: (kind: ExerciseKind) => void;
  setDailyGoal: (n: number) => void;
  resetProgress: () => void;
}

export function useProgress() {
  return create<ProgressStore>()(
    persist(
      (set, get) => ({
        data: defaultProgress(),

        learnWord: (id: number) => {
          set(() => {
            const completed = { ...get().data.completed, [id]: STORAGE_KEY };
            return {
              data: {
                ...get().data,
                completed,
                stats: {
                  ...get().data.stats,
                  totalLearned: Math.max(
                    get().data.stats.totalLearned,
                    Object.keys(completed).length,
                  ),
                },
              },
            };
          });
        },

        answerWord: (id: number, ok: boolean) => {
          set(() => {
            const review = get().data.review[id];
            const interval = ok
              ? Math.min((review?.interval ?? 0) + 1, 30)
              : 1;
            const due = ok
              ? new Date(
                Date.now() + interval * 86_400_000,
              ).toISOString().split('T')[0]
              : new Date(Date.now() + 86_400_000).toISOString().split('T')[0];

            return {
              data: {
                ...get().data,
                review: { ...get().data.review, [id]: { due, interval } },
              },
            };
          });
        },

        logExercise: (kind: ExerciseKind) => {
          set(() => {
            const sessionKey = todayStr(new Date());
            const session = get().data.sessions[sessionKey];
            const exercises = session
              ? { ...session.exercises, [kind]: (session.exercises[kind] ?? 0) + 1 }
              : { [kind]: 1 };

            const newSession = {
              ...session,
              exercises,
              learned:
                kind === 'dictation' || kind === 'cloze' ? (session?.learned ?? 0) + 1
                  : session?.learned ?? 0,
            } as DaySession;

            const newSessions = {
              ...get().data.sessions,
              [sessionKey]: newSession,
            };

            return {
              data: {
                ...get().data,
                sessions: newSessions,
                stats: {
                  ...get().data.stats,
                  streak: computeStreak(newSessions, sessionKey),
                },
              },
            };
          });
        },

        setDailyGoal: (n: number) => {
          set({ data: { ...get().data, settings: { ...get().data.settings, dailyGoal: n } } });
        },

        resetProgress: () => {
          set({ data: defaultProgress() });
        },
      }),
      {
        name: STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          data: {
            settings: state.data.settings,
            completed: state.data.completed,
            review: state.data.review,
            sessions: state.data.sessions,
          },
        }),
      },
    ),
  );
}

interface DaySession {
  learned: number;
  reviewed: number;
  exercises: Record<ExerciseKind, number>;
}

function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}