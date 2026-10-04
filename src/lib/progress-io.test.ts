import { describe, expect, it } from 'vitest';
import { parseProgressJson, progressExport } from './progress-io';
import { defaultProgress } from './storage';

describe('parseProgressJson', () => {
  it('accepts a previously exported payload', () => {
    const data = {
      ...defaultProgress(),
      settings: { dailyGoal: 30 },
      completed: { 1: '2026-10-01' },
      review: { 1: { due: '2026-10-02', interval: 1 } },
      sessions: {
        '2026-10-01': {
          learned: 1,
          reviewed: 0,
          exercises: { flashcard: 1, mcq: 0, listen: 0, cloze: 0, dictation: 0 },
        },
      },
      stats: { streak: 2, totalLearned: 1 },
    };
    const res = parseProgressJson(JSON.stringify(data));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual(data);
  });

  it('rejects invalid JSON', () => {
    const res = parseProgressJson('{nope');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('JSON');
  });

  it('rejects non-object payloads', () => {
    expect(parseProgressJson('[1,2]').ok).toBe(false);
    expect(parseProgressJson('null').ok).toBe(false);
    expect(parseProgressJson('"abc"').ok).toBe(false);
  });

  it('rejects missing or non-numeric dailyGoal', () => {
    const base = JSON.parse(JSON.stringify({ ...defaultProgress() }));
    expect(parseProgressJson(JSON.stringify({ ...base, settings: {} })).ok).toBe(false);
    expect(
      parseProgressJson(JSON.stringify({ ...base, settings: { dailyGoal: '20' } })).ok,
    ).toBe(false);
    expect(
      parseProgressJson(JSON.stringify({ ...base, settings: { dailyGoal: Number.NaN } })).ok,
    ).toBe(false);
  });

  it('rejects missing completed/review/sessions objects', () => {
    const base = JSON.parse(JSON.stringify({ ...defaultProgress() }));
    const { completed: _c, ...noCompleted } = base;
    expect(parseProgressJson(JSON.stringify(noCompleted)).ok).toBe(false);
    const { review: _r, ...noReview } = base;
    expect(parseProgressJson(JSON.stringify(noReview)).ok).toBe(false);
    const { sessions: _s, ...noSessions } = base;
    expect(parseProgressJson(JSON.stringify(noSessions)).ok).toBe(false);
    expect(parseProgressJson(JSON.stringify({ ...base, completed: [] })).ok).toBe(false);
  });

  it('fills stats from completed when stats is missing', () => {
    const base = JSON.parse(JSON.stringify({ ...defaultProgress() }));
    delete base.stats;
    base.completed = { 1: '2026-10-01', 2: '2026-10-01' };
    const res = parseProgressJson(JSON.stringify(base));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.stats).toEqual({ streak: 0, totalLearned: 2 });
  });
});

describe('progressExport', () => {
  it('produces a dated filename and pretty-printed content', () => {
    const data = { ...defaultProgress(), settings: { dailyGoal: 25 } };
    const out = progressExport(data);
    expect(out.filename).toMatch(/^english-nxt-progress-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(out.content)).toEqual(data);
    expect(out.content).toContain('\n  ');
  });
});
