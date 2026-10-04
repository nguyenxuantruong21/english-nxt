import { describe, expect, it } from "vitest";
import {
  INTERVALS,
  computeStreak,
  dailyStats,
  isDue,
  nextInterval,
  restartIfStale,
} from "./review";
import type { DaySession, ProgressData } from "../types";
import { defaultProgress } from "./storage";

const day = (): DaySession => ({
  learned: 0,
  reviewed: 0,
  exercises: { flashcard: 0, mcq: 0, listen: 0, cloze: 0, dictation: 0 },
});

describe("nextInterval", () => {
  it("quên → về interval 1 (1 ngày)", () => {
    expect(nextInterval(5, false)).toBe(1);
    expect(nextInterval(1, false)).toBe(1);
  });

  it("đúng → lên bậc kế, max = bậc cuối", () => {
    expect(nextInterval(0, true)).toBe(1);
    expect(nextInterval(1, true)).toBe(2);
    expect(nextInterval(INTERVALS.length - 1, true)).toBe(INTERVALS.length);
  });

  it("các bậc đúng bằng bảng", () => {
    expect(INTERVALS).toEqual([1, 3, 7, 14, 30]);
    expect(INTERVALS[1]).toBe(3);
  });
});

describe("restartIfStale", () => {
  it("trễ > 7 ngày → restart interval 1", () => {
    expect(
      restartIfStale({ due: "2026-09-01", interval: 4 }, "2026-10-01"),
    ).toBe(1);
  });
  it("trễ ≤ 7 ngày → giữ interval", () => {
    expect(
      restartIfStale({ due: "2026-09-27", interval: 4 }, "2026-10-01"),
    ).toBe(4);
  });
  it("chưa tới hạn → giữ interval", () => {
    expect(
      restartIfStale({ due: "2026-10-05", interval: 2 }, "2026-10-01"),
    ).toBe(2);
  });
});

describe("isDue", () => {
  it("due ≤ hôm nay là đến hạn", () => {
    expect(isDue({ due: "2026-10-01", interval: 1 }, "2026-10-01")).toBe(true);
    expect(isDue({ due: "2026-09-30", interval: 1 }, "2026-10-01")).toBe(true);
    expect(isDue({ due: "2026-10-02", interval: 1 }, "2026-10-01")).toBe(false);
  });
});

describe("computeStreak", () => {
  it("chuỗi ngày liên tiếp, đứt thì reset", () => {
    const sessions = {
      "2026-09-29": day(),
      "2026-09-30": day(),
      "2026-10-01": day(),
    };
    expect(computeStreak(sessions, "2026-10-01")).toBe(3);
    expect(computeStreak(sessions, "2026-10-02")).toBe(0);
    expect(computeStreak({ "2026-10-01": day() }, "2026-10-01")).toBe(1);
    expect(computeStreak({}, "2026-10-01")).toBe(0);
  });
});

describe("dailyStats", () => {
  const base: ProgressData = defaultProgress();

  it("mặc định: 0 learned, goal 20, cần review = số từ đến hạn", () => {
    const p: ProgressData = {
      ...base,
      review: {
        1: { due: "2026-10-01", interval: 1 },
        2: { due: "2026-10-01", interval: 2 },
        3: { due: "2026-10-05", interval: 1 },
      },
    };
    const s = dailyStats(p, "2026-10-01");
    expect(s.learnedToday).toBe(0);
    expect(s.goal).toBe(20);
    expect(s.dueCount).toBe(2);
    expect(s.remaining).toBe(20);
  });

  it("đã học hôm nay + đếm review hôm nay", () => {
    const p: ProgressData = {
      ...base,
      sessions: {
        "2026-10-01": {
          learned: 5,
          reviewed: 2,
          exercises: {
            flashcard: 0,
            mcq: 0,
            listen: 0,
            cloze: 0,
            dictation: 0,
          },
        },
      },
      review: { 1: { due: "2026-09-25", interval: 3 } },
    };
    const s = dailyStats(p, "2026-10-01");
    expect(s.learnedToday).toBe(5);
    expect(s.reviewedToday).toBe(2);
    expect(s.dueCount).toBe(1);
    expect(s.remaining).toBe(15);
  });
});
