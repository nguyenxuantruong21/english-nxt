import { describe, expect, it } from "vitest";
import {
  getExamples,
  getFrames,
  getIndex,
  getWord,
  getWordsByLevel,
  getWordsByTopic,
  searchWords,
} from "./vocab";

describe("vocab", () => {
  it("getIndex trả 4 level và 128 topic", () => {
    const idx = getIndex();
    expect(idx.levels.map((l) => l.id)).toEqual(["A1", "A2", "B1", "B2"]);
    expect(idx.topics.length).toBe(128);
  });

  it("getWord theo id có level/topic", () => {
    const w = getWord(1);
    expect(w).toBeDefined();
    expect(w!.level).toBe("A1");
    expect(w!.topicId.length).toBeGreaterThan(0);
    expect(getWord(0)).toBeUndefined();
    expect(getWord(99999)).toBeUndefined();
  });

  it("getWordsByLevel đúng số lượng", () => {
    expect(getWordsByLevel("A1").length).toBe(717);
    expect(getWordsByLevel("B2").length).toBe(425);
  });

  it("getWordsByTopic trả đúng wordIds", () => {
    const idx = getIndex();
    const t = idx.topics[0];
    const ws = getWordsByTopic(t.id);
    expect(ws.map((w) => w.id)).toEqual(t.wordIds);
  });

  it("getFrames fallback sang section cùng topic khác level khi section này không có frame", () => {
    const idx = getIndex();
    const withFrames = idx.topics.find((t) => t.frames.length > 0)!;
    const without = idx.topics.find(
      (t) => t.nameEn === withFrames.nameEn && t.frames.length === 0,
    )!;
    expect(getFrames(without.id).length).toBeGreaterThan(0);
    expect(getFrames(withFrames.id)).toEqual(withFrames.frames);
  });

  it("getExamples theo wordId", () => {
    const idx = getExamples("1");
    expect(Array.isArray(idx)).toBe(true);
  });

  it("searchWords không phân biệt hoa/thường, có nghĩa", () => {
    const res = searchWords("fAmIly");
    expect(res.length).toBeGreaterThan(0);
    expect(res.some((w) => w.word.toLowerCase().includes("fam"))).toBe(true);
    expect(searchWords("không tồn tại xyz 123").length).toBe(0);
  });
});
