import { describe, expect, it } from "vitest";
import { parseProgressJson, progressExport } from "./progress-io";
import { defaultProgress } from "./storage";
import { dailyStats } from "./review";
import { buildDailyQueue } from "./queue";

function base(): Record<string, unknown> {
  return JSON.parse(JSON.stringify({ ...defaultProgress() }));
}

describe("parseProgressJson", () => {
  it("accepts a previously exported payload", () => {
    const data = {
      ...defaultProgress(),
      settings: { dailyGoal: 30 },
      completed: { 1: "2026-10-01" },
      review: { 1: { due: "2026-10-02", interval: 1 } },
      sessions: {
        "2026-10-01": {
          learned: 1,
          reviewed: 0,
          exercises: {
            flashcard: 1,
            mcq: 0,
            listen: 0,
            cloze: 0,
            dictation: 0,
          },
        },
      },
      stats: { streak: 2, totalLearned: 1 },
    };
    const res = parseProgressJson(JSON.stringify(data));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual(data);
  });

  it("rejects invalid JSON", () => {
    const res = parseProgressJson("{nope");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("JSON");
  });

  it("rejects non-object payloads", () => {
    expect(parseProgressJson("[1,2]").ok).toBe(false);
    expect(parseProgressJson("null").ok).toBe(false);
    expect(parseProgressJson('"abc"').ok).toBe(false);
  });

  it("sanitizes invalid dailyGoal (fallback 20, clamp 5-100)", () => {
    const goal = (settings: unknown): number | undefined => {
      const res = parseProgressJson(JSON.stringify({ ...base(), settings }));
      expect(res.ok).toBe(true);
      return res.ok ? res.data.settings.dailyGoal : undefined;
    };
    expect(goal(undefined)).toBe(20);
    expect(goal({})).toBe(20);
    expect(goal({ dailyGoal: "20" })).toBe(20);
    expect(goal({ dailyGoal: null })).toBe(20);
    expect(goal({ dailyGoal: 9999 })).toBe(100);
    expect(goal({ dailyGoal: 2 })).toBe(5);
    expect(goal({ dailyGoal: 30 })).toBe(30);
  });

  it("treats missing or non-object completed/review/sessions as empty", () => {
    const b = base();
    const { completed: _c, ...noCompleted } = b;
    const resC = parseProgressJson(JSON.stringify(noCompleted));
    expect(resC.ok).toBe(true);
    if (resC.ok) expect(resC.data.completed).toEqual({});

    const { review: _r, ...noReview } = b;
    const resR = parseProgressJson(JSON.stringify(noReview));
    expect(resR.ok).toBe(true);
    if (resR.ok) expect(resR.data.review).toEqual({});

    const { sessions: _s, ...noSessions } = b;
    const resS = parseProgressJson(JSON.stringify(noSessions));
    expect(resS.ok).toBe(true);
    if (resS.ok) expect(resS.data.sessions).toEqual({});

    const resArr = parseProgressJson(
      JSON.stringify({ ...b, completed: [], review: "junk", sessions: 5 }),
    );
    expect(resArr.ok).toBe(true);
    if (resArr.ok) {
      expect(resArr.data.completed).toEqual({});
      expect(resArr.data.review).toEqual({});
      expect(resArr.data.sessions).toEqual({});
    }
  });

  it("fills stats from completed when stats is missing", () => {
    const b = base();
    delete b.stats;
    b.completed = { 1: "2026-10-01", 2: "2026-10-01" };
    const res = parseProgressJson(JSON.stringify(b));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.stats).toEqual({ streak: 0, totalLearned: 2 });
  });

  it("drops completed entries without a numeric key or string value", () => {
    const res = parseProgressJson(
      JSON.stringify({
        ...base(),
        completed: { "1": "2026-10-01", "2": 123, "abc": "2026-10-01", "3": null },
      }),
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.completed).toEqual({ 1: "2026-10-01" });
  });

  it("drops malformed review entries and keeps valid ones", () => {
    const res = parseProgressJson(
      JSON.stringify({
        ...base(),
        review: {
          "1": { due: "2026-10-02", interval: 1 },
          "2": null,
          "abc": { due: "2026-10-02", interval: 1 },
          "3": { due: "10-02-2026", interval: 1 },
          "4": { due: "2026-10-02", interval: -1 },
          "5": { due: "2026-10-02", interval: "1" },
          "6": { due: "2026-10-02" },
        },
      }),
    );
    expect(res.ok).toBe(true);
    if (res.ok)
      expect(res.data.review).toEqual({ 1: { due: "2026-10-02", interval: 1 } });
  });

  it("drops invalid sessions and zero-fills missing exercise kinds", () => {
    const res = parseProgressJson(
      JSON.stringify({
        ...base(),
        sessions: {
          "2026-10-01": "junk",
          "2026-10-02": { learned: 1, reviewed: 0, exercises: { flashcard: 1 } },
          "2026-10-03": { learned: "x", reviewed: 0 },
          "2026-10-04": { reviewed: 0 },
          "2026-10-05": { learned: 1, reviewed: 0, exercises: "junk" },
          "2026-10-06": { learned: -2, reviewed: 0 },
        },
      }),
    );
    expect(res.ok).toBe(true);
    if (res.ok)
      expect(res.data.sessions).toEqual({
        "2026-10-02": {
          learned: 1,
          reviewed: 0,
          exercises: { flashcard: 1, mcq: 0, listen: 0, cloze: 0, dictation: 0 },
        },
        "2026-10-06": {
          learned: 0,
          reviewed: 0,
          exercises: { flashcard: 0, mcq: 0, listen: 0, cloze: 0, dictation: 0 },
        },
      });
  });

  it("sanitizes stats fields (non-negative ints, 0 fallback) and defaults non-object stats", () => {
    const bad = parseProgressJson(
      JSON.stringify({ ...base(), stats: { streak: -3, totalLearned: "x" } }),
    );
    expect(bad.ok).toBe(true);
    if (bad.ok) expect(bad.data.stats).toEqual({ streak: 0, totalLearned: 0 });

    const fractional = parseProgressJson(
      JSON.stringify({ ...base(), stats: { streak: 2.9, totalLearned: 41.7 } }),
    );
    expect(fractional.ok).toBe(true);
    if (fractional.ok)
      expect(fractional.data.stats).toEqual({ streak: 3, totalLearned: 42 });

    const junk = parseProgressJson(
      JSON.stringify({ ...base(), stats: "junk", completed: { 1: "2026-10-01" } }),
    );
    expect(junk.ok).toBe(true);
    if (junk.ok) expect(junk.data.stats).toEqual({ streak: 0, totalLearned: 1 });
  });

  it("imports the hostile payload and dailyStats/buildDailyQueue run afterwards", () => {
    const payload =
      '{"settings":{"dailyGoal":20},"completed":{},"review":{"1":null},"sessions":{}}';
    const res = parseProgressJson(payload);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const today = "2026-10-04";
    expect(() => dailyStats(res.data, today)).not.toThrow();
    expect(() => buildDailyQueue({ data: res.data, today })).not.toThrow();
    expect(res.data).toEqual({
      settings: { dailyGoal: 20 },
      completed: {},
      review: {},
      sessions: {},
      stats: { streak: 0, totalLearned: 0 },
    });
    expect(dailyStats(res.data, today).dueCount).toBe(0);
    expect(buildDailyQueue({ data: res.data, today }).dueTotal).toBe(0);
  });

  it("never throws on arbitrary JSON input", () => {
    const inputs = [
      "{}",
      "[]",
      "null",
      "true",
      "0",
      '"x"',
      '{"settings":"x"}',
      '{"completed":1,"review":2,"sessions":3}',
      '{"settings":{"dailyGoal":1e308}}',
      '{"sessions":{"2026-10-01":{"learned":1e308,"reviewed":0}}}',
      '{"review":{"1":{"due":"2026-13-45","interval":0.5}}}',
      '{"sessions":{"a":{"learned":-5,"reviewed":2.7,"exercises":{"flashcard":1.4}}}}',
      '{"stats":{"streak":1e308,"totalLearned":null}}',
      '{"settings":{"dailyGoal":20},"completed":[1],"review":{"1":[]},"sessions":{"x":[]}}',
    ];
    for (const input of inputs) {
      expect(() => parseProgressJson(input)).not.toThrow();
    }
  });
});

describe("progressExport", () => {
  it("produces a dated filename and pretty-printed content", () => {
    const data = { ...defaultProgress(), settings: { dailyGoal: 25 } };
    const out = progressExport(data);
    expect(out.filename).toMatch(
      /^english-nxt-progress-\d{4}-\d{2}-\d{2}\.json$/,
    );
    expect(JSON.parse(out.content)).toEqual(data);
    expect(out.content).toContain("\n  ");
  });
});
