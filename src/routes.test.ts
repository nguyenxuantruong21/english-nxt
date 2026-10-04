import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';
import { defaultProgress } from './lib/storage';
import { getWordsByLevel, getWordsByTopic } from './lib/vocab';
import { useProgress } from './store/progress';

function renderAt(path: string): string {
  return renderToString(h(MemoryRouter, { initialEntries: [path] }, h(App)));
}

function markAllLearned(ids: number[]) {
  const completed: Record<number, string> = {};
  for (const id of ids) completed[id] = '2026-01-01';
  useProgress.getInitialState().data = {
    ...defaultProgress(),
    completed,
  };
}

afterEach(() => {
  useProgress.getInitialState().data = defaultProgress();
  useProgress.setState({ data: defaultProgress() });
});

describe('error/edge states theo route', () => {
  it('/words/:id hợp lệ → render từ, KHÔNG hiện fallback', () => {
    const html = renderAt('/words/1');
    expect(html).toContain('family');
    expect(html).not.toContain('Không tìm thấy từ');
  });

  it('/words/99999 → "Không tìm thấy từ" + link về trang chủ', () => {
    const html = renderAt('/words/99999');
    expect(html).toContain('Không tìm thấy từ');
    expect(html).toContain('Về trang chủ');
    expect(html).toContain('href="/"');
  });

  it('/topics/:id hợp lệ → render chủ đề', () => {
    const html = renderAt('/topics/a1-family-people');
    expect(html).toContain('Gia đình và con người');
    expect(html).not.toContain('Không tìm thấy chủ đề');
  });

  it('/topics/xxx → "Không tìm thấy chủ đề" + link quay lại', () => {
    const html = renderAt('/topics/xxx');
    expect(html).toContain('Không tìm thấy chủ đề');
    expect(html).toContain('href="/levels"');
  });

  it('/levels/A1 → grid chủ đề, mỗi card link /topics/:id', () => {
    const html = renderAt('/levels/A1');
    expect(html).toContain('Sơ cấp');
    expect(html).toContain('href="/topics/a1-family-people"');
    expect(html).not.toContain('Không tìm thấy cấp độ');
  });

  it('/levels/XX → "Không tìm thấy cấp độ" + link danh sách cấp độ', () => {
    const html = renderAt('/levels/XX');
    expect(html).toContain('Không tìm thấy cấp độ');
    expect(html).toContain('href="/levels"');
  });

  it('/xyz → 404 có icon + text + link về trang chủ', () => {
    const html = renderAt('/xyz');
    expect(html).toContain('Không tìm thấy trang');
    expect(html).toContain('Về trang chủ');
    expect(html).toContain('🔍');
    expect(html).toContain('href="/"');
  });

  it('/learn/:topicId không tồn tại → "Không tìm thấy chủ đề"', () => {
    const html = renderAt('/learn/topic-khong-ton-tai');
    expect(html).toContain('Không tìm thấy chủ đề');
    expect(html).toContain('href="/learn"');
  });

  it('/learn khi topic đã học hết → "Không có từ nào cần học"', () => {
    const ids = getWordsByTopic('a1-family-people').map((w) => w.id);
    expect(ids.length).toBeGreaterThan(0);
    markAllLearned(ids);
    const html = renderAt('/learn/a1-family-people');
    expect(html).toContain('Không có từ nào cần học');
  });

  it('/learn (không param) khi đã học hết A1 → "Không có từ nào cần học"', () => {
    const ids = getWordsByLevel('A1').map((w) => w.id);
    expect(ids.length).toBeGreaterThan(0);
    markAllLearned(ids);
    const html = renderAt('/learn');
    expect(html).toContain('Không có từ nào cần học');
  });

  it('/learn còn từ chưa học → vẫn render flashcard', () => {
    const html = renderAt('/learn');
    expect(html).not.toContain('Không có từ nào cần học');
    expect(html).toContain('Học từ');
  });
});
