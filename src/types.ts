export type LevelId = "A1" | "A2" | "B1" | "B2";

export interface Level {
  id: LevelId;
  name: string;
  wordCount: number;
  firstId: number;
  lastId: number;
}

export interface Frame {
  template: string;
  example: string;
}

export interface TopicSection {
  id: string;
  level: LevelId;
  nameEn: string;
  nameVi: string;
  wordCount: number;
  wordIds: number[];
  frames: Frame[];
}

export interface Word {
  id: number;
  word: string;
  ipa: string;
  pos: string;
  meaningVi: string;
  level: LevelId;
  topicId: string;
}

export interface VocabIndex {
  totalWords: number;
  levels: Level[];
  topics: TopicSection[];
}

export interface ExampleSentence {
  en: string;
}

export type ExamplesMap = Record<string, ExampleSentence[]>;

export type ExerciseKind =
  | "flashcard"
  | "mcq"
  | "listen"
  | "cloze"
  | "dictation";

export interface DaySession {
  learned: number;
  reviewed: number;
  exercises: Record<ExerciseKind, number>;
}

export interface ProgressData {
  settings: { dailyGoal: number };
  completed: Record<number, string>;
  review: Record<number, { due: string; interval: number }>;
  sessions: Record<string, DaySession>;
  stats: { streak: number; totalLearned: number };
}
