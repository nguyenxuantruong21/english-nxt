import { describe, expect, it } from "vitest";
import { buildDailyQueue, LEVEL_ORDER, nextActivePos } from "./queue";
import { defaultProgress } from "./storage";
import { todayStr } from "./review";
import { getWordsByLevel, getWordsByTopic } from "./vocab";
import type { DaySession, ProgressData } from "../types";

const today = todayStr();
const ZERO: DaySession = {
  learned: 0,
  reviewed: 0,
  exercises: { flashcard: 0, mcq: 0, listen: 0, cloze: 0, dictation: 0 },
};

function makeData(overrides: Partial<ProgressData> = {}): ProgressData {
  return { ...defaultProgress(), ...overrides };
}

function markAllLearned(level: (typeof LEVEL_ORDER)[number]): ProgressData {
  const completed: Record<number, string> = {};
  for (const w of getWordsByLevel(level)) completed[w.id] = "2026-01-01";
  return makeData({
    completed,
    stats: { streak: 0, totalLearned: Object.keys(completed).length },
  });
}

describe("buildDailyQueue", () => {
  it("puts due words first, then new words, capped at remaining goal", () => {
    const data = makeData({
      settings: { dailyGoal: 3 },
      review: {
        5: { due: today, interval: 1 },
        7: { due: today, interval: 3 },
      },
    });
    const r = buildDailyQueue({ data, today });
    expect(r.remaining).toBe(3);
    expect(r.queue.map((q) => q.wordId)).toEqual([5, 7, 1]);
    expect(r.queue.map((q) => q.isNew)).toEqual([true, true, true]);
  });

  it("marks due+learned words as not new", () => {
    const data = makeData({
      settings: { dailyGoal: 2 },
      completed: { 5: "2026-01-01", 7: "2026-01-01" },
      review: {
        5: { due: today, interval: 2 },
        7: { due: today, interval: 2 },
      },
    });
    const r = buildDailyQueue({ data, today });
    expect(r.queue).toEqual([
      { wordId: 5, isNew: false },
      { wordId: 7, isNew: false },
    ]);
    expect(r.queue.length).toBe(2);
  });

  it("returns empty queue when the daily goal is already met", () => {
    const data = makeData({
      settings: { dailyGoal: 3 },
      sessions: { [today]: { ...ZERO, learned: 3 } },
    });
    const r = buildDailyQueue({ data, today });
    expect(r.remaining).toBe(0);
    expect(r.queue).toEqual([]);
    expect(r.unlearnedTotal).toBeGreaterThan(0);
  });

  it("scopes the queue to the given topic", () => {
    const topicWords = getWordsByTopic("a1-family-people");
    const outside = getWordsByLevel("A1").find(
      (w) => w.topicId !== "a1-family-people",
    )!;
    const data = makeData({
      settings: { dailyGoal: 100 },
      review: { [outside.id]: { due: today, interval: 1 } },
    });
    const r = buildDailyQueue({ data, today, topicId: "a1-family-people" });
    const ids = r.queue.map((q) => q.wordId);
    expect(ids.length).toBe(topicWords.length);
    expect(ids).not.toContain(outside.id);
    expect(r.dueTotal).toBe(1);
  });

  it("takes new words from the requested level when ?level is set", () => {
    const data = makeData({ settings: { dailyGoal: 2 } });
    const r = buildDailyQueue({ data, today, level: "A2" });
    const a2 = getWordsByLevel("A2")
      .slice(0, 2)
      .map((w) => w.id);
    expect(r.queue.map((q) => q.wordId)).toEqual(a2);
  });

  it("defaults new words to the first level that still has unlearned words", () => {
    const data = { ...markAllLearned("A1"), settings: { dailyGoal: 2 } };
    const r = buildDailyQueue({ data, today });
    const a2 = getWordsByLevel("A2");
    expect(r.nextLevel).toBe("A2");
    expect(r.queue.map((q) => q.wordId)).toEqual(
      a2.slice(0, 2).map((w) => w.id),
    );
    expect(r.queue.every((q) => q.isNew)).toBe(true);
  });

  it("reports the next level and its unlearned count when a level is finished", () => {
    const data = markAllLearned("A1");
    const r = buildDailyQueue({
      data: { ...data, settings: { dailyGoal: 5 } },
      today,
    });
    expect(r.nextLevel).toBe("A2");
    expect(r.nextLevelUnlearned).toBe(getWordsByLevel("A2").length);
    expect(r.unlearnedTotal).toBe(
      getWordsByLevel("A2").length +
        getWordsByLevel("B1").length +
        getWordsByLevel("B2").length,
    );
    expect(r.queue.every((q) => q.wordId > 717)).toBe(true);
  });

  it("returns due-only queue when every word is learned", () => {
    const completed: Record<number, string> = {};
    for (const lv of LEVEL_ORDER)
      for (const w of getWordsByLevel(lv)) completed[w.id] = "2026-01-01";
    const data = makeData({
      completed,
      settings: { dailyGoal: 5 },
      review: { 3: { due: today, interval: 1 } },
    });
    const r = buildDailyQueue({ data, today });
    expect(r.queue).toEqual([{ wordId: 3, isNew: false }]);
    expect(r.unlearnedTotal).toBe(0);
    expect(r.nextLevel).toBeUndefined();
  });

  it("excludes due words that are not due today", () => {
    const data = makeData({
      settings: { dailyGoal: 10 },
      completed: { 9: "2026-01-01" },
      review: { 9: { due: "2099-01-01", interval: 5 } },
    });
    const r = buildDailyQueue({ data, today });
    expect(r.queue.map((q) => q.wordId)).not.toContain(9);
    expect(r.dueTotal).toBe(0);
  });
});

describe("nextActivePos (skip từ đã biết trong phiên)", () => {
  const completed = { 2: "2026-01-01", 3: "2026-01-01" } as Record<
    number,
    string
  >;
  const queue = [
    { wordId: 1, isNew: true },
    { wordId: 2, isNew: true },
    { wordId: 3, isNew: true },
    { wordId: 4, isNew: true },
  ];

  it("bỏ qua các mục đã completed khi duyệt tới", () => {
    expect(nextActivePos(queue, 0, completed)).toBe(0);
    expect(nextActivePos(queue, 1, completed)).toBe(3);
    expect(nextActivePos(queue, 2, completed)).toBe(3);
  });

  it("trả về cuối hàng đợi khi tất cả còn lại đã biết", () => {
    expect(nextActivePos(queue, 1, { 2: "x", 3: "x", 4: "x" })).toBe(4);
    expect(nextActivePos(queue, 4, completed)).toBe(4);
  });

  it("không bỏ qua từ chưa completed", () => {
    expect(nextActivePos(queue, 0, {})).toBe(0);
  });
});
