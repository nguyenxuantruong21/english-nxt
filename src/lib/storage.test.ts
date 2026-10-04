import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY, loadProgress, saveProgress } from "./storage";

const mem = new Map<string, string>();

beforeEach(() => {
  mem.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  });
});

describe("storage", () => {
  it("loadProgress trả default khi trống", () => {
    const p = loadProgress();
    expect(p.settings.dailyGoal).toBe(20);
    expect(p.completed).toEqual({});
    expect(p.stats.streak).toBe(0);
  });

  it("save → load round-trip", () => {
    const p = loadProgress();
    p.completed[1] = "2026-10-01";
    p.stats.totalLearned = 1;
    saveProgress(p);
    expect(mem.has(STORAGE_KEY)).toBe(true);
    const re = loadProgress();
    expect(re.completed[1]).toBe("2026-10-01");
    expect(re.stats.totalLearned).toBe(1);
  });

  it("fallback default khi JSON hỏng", () => {
    mem.set(STORAGE_KEY, "{broken");
    expect(loadProgress().settings.dailyGoal).toBe(20);
  });

  it("merge default khi thiếu field (migrate nhẹ)", () => {
    mem.set(STORAGE_KEY, JSON.stringify({ settings: { dailyGoal: 10 } }));
    const p = loadProgress();
    expect(p.settings.dailyGoal).toBe(10);
    expect(p.completed).toEqual({});
    expect(p.stats.streak).toBe(0);
  });

  it("saveProgress không ném khi localStorage lỗi", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {},
    });
    expect(() => saveProgress(loadProgress())).not.toThrow();
  });
});
