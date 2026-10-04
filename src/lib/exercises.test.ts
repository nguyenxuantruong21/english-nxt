import { describe, expect, it } from 'vitest';
import {
  buildCloze,
  buildDictation,
  buildListen,
  buildMcq,
  makeRound,
  shuffle,
  buildClozeWithOptions,
} from './exercises';
import type { Word } from '../types';

const w = (id: number, word: string, meaningVi: string, level: Word['level'] = 'A1'): Word => ({
  id,
  word,
  ipa: '/x/',
  pos: 'n.',
  meaningVi,
  level,
  topicId: 'a1-gia-dinh',
});

const family = w(1, 'family', 'gia đình');
const pool = [
  family,
  w(2, 'house', 'ngôi nhà'),
  w(3, 'school', 'trường học'),
  w(4, 'water', 'nước'),
  w(5, 'book', 'quyển sách'),
  w(6, 'friend', 'bạn bè'),
];

describe('shuffle', () => {
  it('giữ nguyên phần tử, khác thứ tự có thể', () => {
    expect([...shuffle([1, 2, 3, 4, 5], () => 0.5)].sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it('rng cố định → kết quả xác định', () => {
    const out = shuffle([1, 2, 3], () => 0);
    expect(out).toEqual([2, 3, 1]);
  });
});

describe('buildMcq', () => {
  it('4 options, 1 đáp án đúng, câu hỏi = word', () => {
    const q = buildMcq(family, pool);
    expect(q.question).toBe('family');
    expect(q.options.length).toBe(4);
    expect(q.options[q.answerIndex]).toBe('gia đình');
    expect(new Set(q.options).size).toBe(4);
  });
});

describe('buildListen', () => {
  it('4 options từ, đáp án đúng là từ', () => {
    const q = buildListen(family, pool);
    expect(q.options.length).toBe(4);
    expect(q.options[q.answerIndex]).toBe('family');
    expect(new Set(q.options).size).toBe(4);
  });
});

describe('buildCloze', () => {
  it('thay token chứa từ trong frame', () => {
    const c = buildCloze(family, 'I love my ___.', []);
    expect(c).not.toBeNull();
    expect(c!.sentence).toBe('I love my ___.');
    expect(c!.blanks.length).toBe(1);
    expect(c!.answer).toBe('family');
  });

  it('fallback sang example khi frame không chứa từ', () => {
    const c = buildCloze(family, 'The ___ is big.', []);
    expect(c).not.toBeNull();
    expect(c!.sentence).toBe('The ___.');
  });

  it('fallback example chứa từ dạng khác (families)', () => {
    const c = buildCloze(family, 'Go to school now.', [{ en: 'My families are here.' }]);
    expect(c).not.toBeNull();
    expect(c!.sentence).toBe('My ___ are here.');
    expect(c!.answer).toBe('family');
  });

  it('null khi không có frame/example chứa từ', () => {
    expect(buildCloze(family, 'Nothing here.', [{ en: 'Other sentence.' }])).toBeNull();
    expect(buildCloze(family, '', [])).toBeNull();
  });
});

describe('buildDictation', () => {
  it('answer là từ, wordId là id của từ', () => {
    expect(buildDictation(family).answer).toBe('family');
    expect(buildDictation(family).wordId).toBe(family.id);
  });
});

describe('makeRound', () => {
  it('target word + frame → đúng 5 câu, mỗi chế độ 1, tất cả cùng từ', () => {
    const round = makeRound(family, pool, { template: 'I love my ___.', example: '' }, []);
    expect(round.length).toBe(5);
    const kinds = round.map((r) => r.kind).sort();
    expect(kinds).toEqual(['cloze', 'dictation', 'flashcard', 'listen', 'mcq']);
    for (const ex of round) {
      if (ex.kind === 'mcq' || ex.kind === 'listen') {
        const opts = ex.kind === 'mcq' ? ex.options : ex.options;
        expect(opts[ex.answerIndex]).toBe(
          ex.kind === 'mcq' ? 'gia đình' : 'family',
        );
      }
      if (ex.kind === 'dictation') expect(ex.answer).toBe('family');
    }
  });

  it('không target → 10 câu, có ít nhất 1 câu mỗi chế độ có mặt trong pool', () => {
    const round = makeRound(undefined, pool);
    expect(round.length).toBe(10);
    const kinds = new Set(round.map((r) => r.kind));
    expect(kinds.size).toBeGreaterThanOrEqual(3);
    for (const ex of round) {
      if (ex.kind === 'flashcard') {
        expect(pool.some((p) => p.id === ex.word.id)).toBe(true);
      }
    }
  });

  it('target có cloze null (khung không chứa từ) → bù bằng câu khác', () => {
    const odd = w(7, 'xylophone', 'đàn xy-lô');
    const round = makeRound(odd, pool);
    expect(round.length).toBe(5);
    expect(round.filter((r) => r.kind === 'cloze').length).toBe(0);
    expect(round.filter((r) => r.kind === 'dictation').length).toBeGreaterThanOrEqual(1);
  });

  it('onlyKind=mcq → 10 câu toàn mcq, mỗi câu 4 options hợp lệ', () => {
    const round = makeRound(undefined, pool, undefined, [], 'mcq');
    expect(round.length).toBe(10);
    for (const ex of round) {
      expect(ex.kind).toBe('mcq');
      if (ex.kind !== 'mcq') continue;
      expect(ex.options.length).toBe(4);
      expect(new Set(ex.options).size).toBe(4);
      expect(pool.some((p) => p.meaningVi === ex.options[ex.answerIndex])).toBe(true);
    }
  });

  it('onlyKind=listen → 10 câu toàn listen, đáp án là từ trong pool', () => {
    const round = makeRound(undefined, pool, undefined, [], 'listen');
    expect(round.length).toBe(10);
    for (const ex of round) {
      expect(ex.kind).toBe('listen');
      if (ex.kind !== 'listen') continue;
      expect(ex.options.length).toBe(4);
      expect(pool.some((p) => p.word === ex.options[ex.answerIndex])).toBe(true);
    }
  });

  it('pool rỗng → round rỗng (không crash)', () => {
    expect(makeRound(undefined, [])).toEqual([]);
    expect(makeRound(undefined, [], undefined, [], 'mcq')).toEqual([]);
  });

  it('onlyKind=cloze → 10 câu toàn cloze, mỗi câu 4 options hợp lệ', () => {
    const round = makeRound(undefined, pool, undefined, [], 'cloze');
    expect(round.length).toBe(10);
    for (const ex of round) {
      expect(ex.kind).toBe('cloze');
      if (ex.kind !== 'cloze') continue;
      expect(ex.options?.length).toBe(4);
      expect(new Set(ex.options).size).toBe(4);
      expect(ex.options?.[ex.answerIndex ?? -1]).toBe(ex.answer);
      expect(pool.some((p) => p.word === ex.answer)).toBe(true);
    }
  });

  it('onlyKind=dictation → 10 câu toàn dictation, có wordId trong pool', () => {
    const round = makeRound(undefined, pool, undefined, [], 'dictation');
    expect(round.length).toBe(10);
    for (const ex of round) {
      expect(ex.kind).toBe('dictation');
      if (ex.kind !== 'dictation') continue;
      expect(ex.wordId).toBeTypeOf('number');
      const owner = pool.find((p) => p.id === ex.wordId);
      expect(owner).toBeDefined();
      expect(ex.answer).toBe(owner!.word);
    }
  });

  it('target round → cloze có options, dictation có wordId của target', () => {
    const round = makeRound(family, pool, { template: 'I love my ___.', example: '' }, []);
    const cloze = round.find((r) => r.kind === 'cloze');
    expect(cloze).toBeDefined();
    if (cloze && cloze.kind === 'cloze') {
      expect(cloze.options?.length).toBe(4);
      expect(new Set(cloze.options).size).toBe(4);
      expect(cloze.options?.[cloze.answerIndex ?? -1]).toBe('family');
    }
    const dictations = round.filter((r) => r.kind === 'dictation');
    expect(dictations.length).toBeGreaterThanOrEqual(1);
    for (const d of dictations) {
      if (d.kind === 'dictation') expect(d.wordId).toBe(family.id);
    }
  });
});

describe('buildClozeWithOptions', () => {
  it('4 options, answer = từ', () => {
    const q = buildClozeWithOptions(family, 'I love my ___.', [], pool);
    expect(q).not.toBeNull();
    expect(q!.options.length).toBe(4);
    expect(q!.options[q!.answerIndex]).toBe('family');
    expect(new Set(q!.options).size).toBe(4);
  });
  it('null khi không blank được', () => {
    expect(buildClozeWithOptions(family, 'Nothing.', [], pool)).toBeNull();
  });
});