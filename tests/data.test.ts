import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { ExamplesMap, VocabIndex, Word } from '../src/types';

const read = <T,>(rel: string): T =>
  JSON.parse(readFileSync(new URL(`../data/${rel}`, import.meta.url), 'utf8'));

const index = read<VocabIndex>('index.json');
const WORDS: Word[] = (['A1', 'A2', 'B1', 'B2'] as const).flatMap((l) =>
  read<Word[]>(`words-${l}.json`),
);
const POS_SET = ['n.', 'v.', 'adj.', 'adv.', 'prep.', 'conj.', 'pron.', 'det.'];

describe('dữ liệu trích xuất từ PDF', () => {
  it('tổng 3122 entry, id liên tục 1..3122, không trùng', () => {
    expect(index.totalWords).toBe(3122);
    expect(WORDS.length).toBe(3122);
    const ids = WORDS.map((w) => w.id).sort((a, b) => a - b);
    expect(ids[0]).toBe(1);
    expect(ids[ids.length - 1]).toBe(3122);
    expect(new Set(ids).size).toBe(3122);
    expect(new Set(WORDS.map((w) => w.word.toLowerCase())).size).toBe(3011);
  });

  it('đếm đúng theo cấp độ và khoảng id', () => {
    const expected: Record<string, number> = { A1: 717, A2: 1139, B1: 841, B2: 425 };
    expect(index.levels.length).toBe(4);
    for (const lv of index.levels) {
      expect(lv.wordCount, lv.id).toBe(expected[lv.id]);
      const ws = WORDS.filter((w) => w.level === lv.id);
      expect(ws.length).toBe(expected[lv.id]);
      expect(lv.firstId).toBe(ws[0].id);
      expect(lv.lastId).toBe(ws[ws.length - 1].id);
    }
  });

  it('đủ 128 section, mỗi section đúng số từ header khai báo, tổng bằng 3122', () => {
    expect(index.topics.length).toBe(128);
    const ids = new Set<string>();
    for (const t of index.topics) {
      expect(ids.has(t.id), `duplicate id ${t.id}`).toBe(false);
      ids.add(t.id);
      expect(t.wordIds.length, t.id).toBe(t.wordCount);
    }
    const sum = index.topics.reduce((s, t) => s + t.wordIds.length, 0);
    expect(sum).toBe(3122);
    const names = new Set(index.topics.map((t) => t.nameEn));
    expect(names.size).toBe(32);
  });

  it('mỗi từ có IPA /…/, từ loại hợp lệ, nghĩa không rỗng', () => {
    for (const w of WORDS) {
      expect(
        w.ipa.startsWith('/') && w.ipa.endsWith('/') && w.ipa.length > 2,
        `id=${w.id} ipa=${w.ipa}`,
      ).toBe(true);
      expect(POS_SET.includes(w.pos), `id=${w.id} pos=${w.pos}`).toBe(true);
      expect(w.word.trim().length, `id=${w.id} word`).toBeGreaterThan(0);
      expect(w.meaningVi.trim().length, `id=${w.id} meaning`).toBeGreaterThan(0);
      expect(w.topicId.length, `id=${w.id}`).toBeGreaterThan(0);
    }
  });

  it('wordId của topic trỏ tới từ đúng level/topic', () => {
    const byId = new Map(WORDS.map((w) => [w.id, w]));
    for (const t of index.topics) {
      for (const id of t.wordIds) {
        const w = byId.get(id);
        expect(w, `missing word ${id} in ${t.id}`).toBeDefined();
        expect(w!.topicId).toBe(t.id);
        expect(w!.level).toBe(t.level);
      }
    }
  });

  it('150 khung mẫu câu, mỗi topic có đúng 1 section chứa frames', () => {
    const total = index.topics.reduce((s, t) => s + t.frames.length, 0);
    expect(total).toBe(150);
    const withFrames = index.topics.filter((t) => t.frames.length > 0);
    expect(withFrames.length).toBe(32);
    const byName = new Map<string, number>();
    for (const t of withFrames) byName.set(t.nameEn, (byName.get(t.nameEn) ?? 0) + 1);
    expect(byName.size).toBe(32);
    for (const [, c] of byName) expect(c).toBe(1);
    for (const t of withFrames) {
      for (const f of t.frames) {
        expect(f.template.length).toBeGreaterThan(0);
        expect(f.example.length).toBeGreaterThan(0);
      }
    }
  });

  it('examples.json hợp lệ (keys là id từ có thật)', () => {
    const examples = read<ExamplesMap>('examples.json');
    const idSet = new Set(WORDS.map((w) => w.id));
    for (const [k, v] of Object.entries(examples)) {
      expect(/^\d+$/.test(k), k).toBe(true);
      expect(idSet.has(Number(k)), `unknown id ${k}`).toBe(true);
      expect(v.length).toBeGreaterThan(0);
      for (const ex of v) expect(ex.en.trim().length).toBeGreaterThan(0);
    }
  });
});
