import type { Word } from "../types";
import { getAllWords, getWordsByLevel, getWordsByTopic } from "./vocab";

export const UNKNOWN_PAGE_SIZE = 50;

export interface UnknownFilters {
  level?: string;
  topicId?: string;
  query?: string;
}

export interface UnknownPage {
  items: Word[];
  total: number;
  totalPages: number;
  page: number;
}

export function selectUnknown(
  completed: Record<number, string>,
  filters: UnknownFilters,
  page: number,
  pageSize: number = UNKNOWN_PAGE_SIZE,
): UnknownPage {
  const { level, topicId, query } = filters;
  let base: Word[];
  if (topicId) {
    base = getWordsByTopic(topicId);
  } else if (level) {
    base = getWordsByLevel(level as Word["level"]);
  } else {
    base = getAllWords();
  }
  if (level && topicId) {
    base = base.filter((w) => w.level === level);
  }

  const q = query?.trim().toLowerCase() ?? "";
  const matched = base.filter((w) => {
    if (completed[w.id] !== undefined) return false;
    if (
      q &&
      !w.word.toLowerCase().includes(q) &&
      !w.meaningVi.toLowerCase().includes(q)
    ) {
      return false;
    }
    return true;
  });

  const total = matched.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: matched.slice(start, start + pageSize),
    total,
    totalPages,
    page: safePage,
  };
}
