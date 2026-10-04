import { describe, expect, it } from "vitest";
import { selectUnknown, UNKNOWN_PAGE_SIZE } from "./unknown";
import { getWordsByTopic } from "./vocab";

describe("selectUnknown", () => {
  const completed = { 1: "2026-01-01", 2: "2026-01-01" } as Record<
    number,
    string
  >;

  it("loại từ đã completed khỏi danh sách", () => {
    const r = selectUnknown(completed, {}, 1);
    expect(r.items.some((w) => w.id === 1 || w.id === 2)).toBe(false);
    expect(r.total).toBe(3120);
  });

  it("lọc theo level", () => {
    const r = selectUnknown({}, { level: "A1" }, 1, 10000);
    expect(r.total).toBe(717);
    expect(r.items.every((w) => w.level === "A1")).toBe(true);
  });

  it("lọc theo chủ đề", () => {
    const topicIds = getWordsByTopic("a1-family-people").map((w) => w.id);
    const r = selectUnknown({}, { topicId: "a1-family-people" }, 1, 10000);
    expect(r.total).toBe(topicIds.length);
    expect(r.items.every((w) => topicIds.includes(w.id))).toBe(true);
  });

  it("tìm kiếm theo từ hoặc nghĩa, không dấu vẫn so được", () => {
    const r = selectUnknown({}, { query: "family" }, 1, 10000);
    expect(r.total).toBeGreaterThan(0);
    expect(
      r.items.every(
        (w) =>
          w.word.toLowerCase().includes("family") ||
          w.meaningVi.toLowerCase().includes("family"),
      ),
    ).toBe(true);
  });

  it("phân trang 50 từ/trang, clamp trang vượt quá", () => {
    const r1 = selectUnknown({}, {}, 1);
    expect(r1.items).toHaveLength(UNKNOWN_PAGE_SIZE);
    expect(r1.totalPages).toBe(Math.ceil(3122 / UNKNOWN_PAGE_SIZE));
    const over = selectUnknown({}, {}, 9999);
    expect(over.page).toBe(over.totalPages);
    expect(over.items.length).toBeGreaterThan(0);
    const under = selectUnknown({}, {}, 0);
    expect(under.page).toBe(1);
  });

  it("reset trang khi bộ lọc đổi làm list ngắn lại", () => {
    const r = selectUnknown({}, { level: "B2" }, 9999);
    expect(r.page).toBe(r.totalPages);
    expect(r.items.every((w) => w.level === "B2")).toBe(true);
  });
});
