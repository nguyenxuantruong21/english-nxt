import type {
  ExampleSentence,
  ExamplesMap,
  Frame,
  VocabIndex,
  Word,
} from "../types";
import indexJson from "../../data/index.json";
import wordsA1 from "../../data/words-A1.json";
import wordsA2 from "../../data/words-A2.json";
import wordsB1 from "../../data/words-B1.json";
import wordsB2 from "../../data/words-B2.json";
import examplesJson from "../../data/examples.json";

const ALL_WORDS = [...wordsA1, ...wordsA2, ...wordsB1, ...wordsB2] as Word[];
const WORD_MAP = new Map<number, Word>(ALL_WORDS.map((w) => [w.id, w]));
const INDEX = indexJson as VocabIndex;
const EXAMPLES = examplesJson as ExamplesMap;
const WORDS_BY_TOPIC = new Map<string, Word[]>();
for (const t of INDEX.topics) {
  WORDS_BY_TOPIC.set(
    t.id,
    t.wordIds.map((id) => WORD_MAP.get(id)!).filter(Boolean),
  );
}

export function getIndex(): VocabIndex {
  return INDEX;
}

export function getWord(id: number): Word | undefined {
  return WORD_MAP.get(id);
}

export function getAllWords(): Word[] {
  return ALL_WORDS;
}

export function getWordsByLevel(level: Word["level"]): Word[] {
  return ALL_WORDS.filter((w) => w.level === level);
}

export function getWordsByTopic(topicId: string): Word[] {
  return WORDS_BY_TOPIC.get(topicId) ?? [];
}

export function getFrames(topicId: string): Frame[] {
  const section = INDEX.topics.find((t) => t.id === topicId);
  if (!section) return [];
  if (section.frames.length > 0) return section.frames;
  const sibling = INDEX.topics.find(
    (t) => t.nameEn === section.nameEn && t.frames.length > 0,
  );
  return sibling?.frames ?? [];
}

export function getExamples(wordId: number | string): ExampleSentence[] {
  return EXAMPLES[String(wordId)] ?? [];
}

export function searchWords(query: string): Word[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ALL_WORDS.filter(
    (w) =>
      w.word.toLowerCase().includes(q) || w.meaningVi.toLowerCase().includes(q),
  );
}
