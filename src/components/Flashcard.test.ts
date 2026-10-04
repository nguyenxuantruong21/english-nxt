import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Flashcard from "./Flashcard";
import { defaultProgress } from "../lib/storage";
import { useProgress } from "../store/progress";
import type { Word } from "../types";

function renderFlashcard(
  word: Word,
  onResult?: (ok: boolean) => void,
  onKnown?: () => void
): string {
  return renderToString(
    h(MemoryRouter, null, h(Flashcard, { word, onResult, onKnown }))
  );
}

function setupStore() {
  vi.resetModules();
  vi.unstubAllGlobals();
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  });
  vi.stubGlobal("window", { speechSynthesis: { speak: vi.fn(), cancel: vi.fn() } });
}

describe("Flashcard - always show meaning (learn mode)", () => {
  beforeEach(() => {
    setupStore();
    useProgress.getInitialState().data = defaultProgress();
    useProgress.setState({ data: defaultProgress(), storageError: false });
  });

  const sampleWord = {
    id: 1,
    word: "family",
    ipa: "/ˈfæməli/",
    meaningVi: "gia đình",
    pos: "noun",
    level: "A1" as const,
    topicId: "a1-family-people",
  };

  it("hiển thị nghĩa ngay khi có onResult (learn mode)", () => {
    const html = renderFlashcard(sampleWord, (ok) => ok);
    expect(html).toContain("family");
    expect(html).toContain("gia đình");
    expect(html).toContain("noun");
    expect(html).not.toContain("Xem nghĩa");
  });

  it("có nút Nhớ rồi và Chưa nhớ khi có onResult", () => {
    const html = renderFlashcard(sampleWord, (ok) => ok);
    expect(html).toContain("Nhớ rồi");
    expect(html).toContain("Chưa nhớ");
  });

  it("có nút Đã biết rồi — bỏ qua khi có onKnown", () => {
    const html = renderFlashcard(sampleWord, (ok) => ok, () => {});
    expect(html).toContain("Đã biết rồi");
  });
});

describe("Flashcard - display mode (no onResult)", () => {
  beforeEach(() => {
    setupStore();
    useProgress.getInitialState().data = defaultProgress();
    useProgress.setState({ data: defaultProgress(), storageError: false });
  });

  const sampleWord = {
    id: 2,
    word: "hello",
    ipa: "/həˈloʊ/",
    meaningVi: "xin chào",
    pos: "exclamation",
    level: "A1" as const,
    topicId: "a1-greetings",
  };

  it("hiển thị nghĩa + nút Học từ khi chưa học (display mode)", () => {
    const html = renderFlashcard(sampleWord);
    expect(html).toContain("hello");
    expect(html).toContain("xin chào");
    expect(html).toContain("Học từ");
    expect(html).not.toContain("Nhớ rồi");
    expect(html).not.toContain("Chưa nhớ");
  });

  it("hiển thị 'đã học' khi từ đã completed", () => {
    useProgress.getInitialState().data = {
      ...defaultProgress(),
      completed: { 2: "2026-01-01" },
    };
    useProgress.setState({ data: useProgress.getInitialState().data, storageError: false });

    const html = renderFlashcard(sampleWord);
    expect(html).toContain("đã học");
    expect(html).not.toContain("Học từ");
  });
});