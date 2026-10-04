import type { LevelId, ProgressData } from '../types';
import { getWordsByLevel, getWordsByTopic } from './vocab';
import { isDue } from './review';

export const LEVEL_ORDER: LevelId[] = ['A1', 'A2', 'B1', 'B2'];

export interface QueueItem {
  wordId: number;
  isNew: boolean;
}

export interface DailyQueueOptions {
  data: ProgressData;
  today: string;
  topicId?: string;
  level?: LevelId;
}

export interface DailyQueueResult {
  queue: QueueItem[];
  remaining: number;
  unlearnedTotal: number;
  nextLevel?: LevelId;
  nextLevelUnlearned: number;
  dueTotal: number;
}

export function buildDailyQueue(opts: DailyQueueOptions): DailyQueueResult {
  const { data, today, topicId, level } = opts;
  const { completed, review, settings, sessions } = data;
  const learnedToday = sessions[today]?.learned ?? 0;
  const remaining = Math.max(0, settings.dailyGoal - learnedToday);

  const dueIds = Object.keys(review)
    .map(Number)
    .filter((id) => isDue(review[id], today))
    .sort((a, b) => a - b);

  let unlearnedTotal = 0;
  let nextLevel: LevelId | undefined;
  let nextLevelUnlearned = 0;
  for (const lv of LEVEL_ORDER) {
    const n = getWordsByLevel(lv).filter((w) => completed[w.id] === undefined).length;
    if (n > 0) {
      unlearnedTotal += n;
      if (!nextLevel) {
        nextLevel = lv;
        nextLevelUnlearned = n;
      }
    }
  }

  let duePool = dueIds;
  let newPool: number[] = [];
  if (topicId) {
    const topicWords = getWordsByTopic(topicId);
    const topicIds = new Set(topicWords.map((w) => w.id));
    duePool = dueIds.filter((id) => topicIds.has(id));
    newPool = topicWords.filter((w) => completed[w.id] === undefined).map((w) => w.id);
  } else if (level) {
    newPool = getWordsByLevel(level)
      .filter((w) => completed[w.id] === undefined)
      .map((w) => w.id);
  } else if (nextLevel) {
    newPool = getWordsByLevel(nextLevel)
      .filter((w) => completed[w.id] === undefined)
      .map((w) => w.id);
  }

  const seen = new Set<number>();
  const queue: QueueItem[] = [];
  for (const id of [...duePool, ...newPool]) {
    if (queue.length >= remaining) break;
    if (seen.has(id)) continue;
    seen.add(id);
    queue.push({ wordId: id, isNew: completed[id] === undefined });
  }

  return {
    queue,
    remaining,
    unlearnedTotal,
    nextLevel,
    nextLevelUnlearned,
    dueTotal: dueIds.length,
  };
}
