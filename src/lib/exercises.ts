import type { ExerciseKind, Frame, Word } from '../types';
import { getFrames } from './vocab';

export interface McqExercise {
  kind: 'mcq';
  question: string;
  options: string[];
  answerIndex: number;
}

export interface ListenExercise {
  kind: 'listen';
  options: string[];
  answerIndex: number;
}

export interface ClozeExercise {
  kind: 'cloze';
  sentence: string;
  blanks: number[];
  answer: string;
}

export interface DictationExercise {
  kind: 'dictation';
  answer: string;
}

export interface FlashcardExercise {
  kind: 'flashcard';
  word: Word;
}

export type Exercise =
  | McqExercise
  | ListenExercise
  | ClozeExercise
  | DictationExercise
  | FlashcardExercise;

export interface ClozeWithOptions extends ClozeExercise {
  options: string[];
  answerIndex: number;
}

export interface McqWithOptions extends McqExercise {}

export interface ListenWithOptions extends ListenExercise {}

export function shuffle<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickWrong(target: Word, pool: Word[], count: number): Word[] {
  const candidates = pool.filter((p) => p.id !== target.id);
  return shuffle(candidates).slice(0, count);
}

function place<T>(answer: T, wrongs: T[]): { options: T[]; answerIndex: number } {
  const answerIndex = Math.floor(Math.random() * (wrongs.length + 1));
  const options = [...wrongs];
  options.splice(answerIndex, 0, answer);
  return { options, answerIndex };
}

export function buildMcq(word: Word, pool: Word[]): McqExercise {
  const wrongs = pickWrong(word, pool, 3).map((p) => p.meaningVi);
  const { options, answerIndex } = place(word.meaningVi, wrongs);
  return { kind: 'mcq', question: word.word, options, answerIndex };
}

export function buildListen(word: Word, pool: Word[]): ListenExercise {
  const wrongs = pickWrong(word, pool, 3).map((p) => p.word);
  const { options, answerIndex } = place(word.word, wrongs);
  return { kind: 'listen', options, answerIndex };
}

function normalizeToken(t: string): string {
  return t.toLowerCase().replace(/[^a-z]/g, '');
}

function tokenMatches(token: string, word: string): boolean {
  const nt = normalizeToken(token);
  const nw = normalizeToken(word);
  if (!nt || !nw) return false;
  if (nt === nw) return true;
  if (nt.includes(nw) && nt.length > nw.length) return true;
  if (nw.includes(nt) && nw.length > nt.length) return true;
  if (nt.replace(/s$/, '') === nw) return true;
  if (nt.endsWith('ies') && nw.endsWith('y') && nt.slice(0, -3) + 'y' === nw) return true;
  return false;
}

function blankSentence(sentence: string, word: string): string | null {
  if (sentence.includes('___')) {
    const index = sentence.indexOf('___');
    const truncated = sentence.slice(0, index + 3);
    return truncated.replace(/\.$/, '') + '.';
  }
  const tokens = sentence.split(/(\s+)/);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const bare = t.replace(/^[^a-zA-Z']+/, '').replace(/[^a-zA-Z']+$/, '');
    if (bare && tokenMatches(bare, word)) {
      const before = t.slice(0, t.indexOf(bare));
      const after = t.slice(t.indexOf(bare) + bare.length);
      tokens[i] = `${before}___${after}`;
      return tokens.join('').replace(/\.$/, '') + '.';
    }
  }
  return null;
}

export function buildCloze(
  word: Word,
  frame: Frame | undefined | string,
  examples: { en: string }[],
): ClozeExercise | null {
  const candidates: string[] = [];

  if (typeof frame === 'string') {
    candidates.push(frame);
  } else if (frame?.template) {
    candidates.push(frame.template);
  }
  candidates.push(...examples.map((e) => e.en));

  for (const src of candidates) {
    const blanked = blankSentence(src, word.word);
    if (blanked) {
      const blanks: number[] = [];
      const re = /___/g;
      while (re.exec(blanked) !== null) blanks.push(re.lastIndex - 3);
      return { kind: 'cloze', sentence: blanked, blanks, answer: word.word };
    }
  }
  return null;
}

export function buildDictation(word: Word): DictationExercise {
  return { kind: 'dictation', answer: word.word };
}

export function buildFlashcard(word: Word): FlashcardExercise {
  return { kind: 'flashcard', word };
}

export function buildClozeWithOptions(
  word: Word,
  frame: Frame | undefined | string,
  examples: { en: string }[],
  pool: Word[],
): ClozeWithOptions | null {
  const base = buildCloze(word, frame, examples);
  if (!base) return null;
  const wrongs = pickWrong(word, pool, 3).map((p) => p.word);
  const { options, answerIndex } = place(word.word, wrongs);
  return { ...base, options, answerIndex };
}

export function makeRound(
  targetWord: Word,
  pool: Word[],
  frame?: Frame | undefined,
  examples?: { en: string }[],
): Exercise[];

export function makeRound(
  _target: undefined,
  pool: Word[],
): Exercise[];

export function makeRound(
  target: Word | undefined,
  pool: Word[],
  frame?: Frame | undefined,
  examples?: { en: string }[],
): Exercise[] {
  const source = pool.length >= 4 ? pool : pool;
  const frameForCloze = frame ?? (target ? getFrames(target.topicId)[0] : undefined);

  if (target) {
    const exercises: Exercise[] = [
      buildFlashcard(target),
      buildMcq(target, source),
      buildListen(target, source),
      buildDictation(target),
    ];
    const cloze = buildCloze(target, frameForCloze, examples ?? []);
    if (cloze) exercises.push(cloze);
    else exercises.push(buildDictation(target));
    return shuffle(exercises);
  }

  const kinds: ExerciseKind[] = ['flashcard', 'mcq', 'listen', 'cloze', 'dictation'];
  const round: Exercise[] = [];
  for (let i = 0; i < 10; i++) {
    const kind = kinds[i % kinds.length];
    const word = target ?? source[Math.floor(Math.random() * source.length)];
    switch (kind) {
      case 'flashcard':
        round.push(buildFlashcard(word));
        break;
      case 'mcq':
        round.push(buildMcq(word, source));
        break;
      case 'listen':
        round.push(buildListen(word, source));
        break;
      case 'cloze': {
        const c = buildCloze(word, undefined, []);
        if (c) round.push(c);
        else round.push(buildMcq(word, source));
        break;
      }
      case 'dictation':
        round.push(buildDictation(word));
        break;
    }
  }
  return round.slice(0, 10);
}