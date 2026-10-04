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
  useProgress.getInitialState().storageError = false;
  useProgress.setState({ data: defaultProgress(), storageError: false });
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

  it('/learn/:topicId đã học hết chủ đề → gợi ý cấp tiếp theo, KHÔNG báo hoàn thành', () => {
    const ids = getWordsByTopic('a1-family-people').map((w) => w.id);
    expect(ids.length).toBeGreaterThan(0);
    markAllLearned(ids);
    const html = renderAt('/learn/a1-family-people');
    expect(html).not.toContain('hoàn thành');
    expect(html).toContain('Cấp A1 sắp tới còn');
    expect(html).toContain('href="/learn?level=A1"');
  });

  it('/learn khi đã học hết A1 → phiên học chạy tiếp sang A2 (không dead-end)', () => {
    const ids = getWordsByLevel('A1').map((w) => w.id);
    expect(ids.length).toBeGreaterThan(0);
    markAllLearned(ids);
    const html = renderAt('/learn');
    expect(html).not.toContain('hoàn thành');
    expect(html).toContain('Xem nghĩa');
    expect(html).toContain('Từ mới');
  });

  it('/learn?level=A1 khi A1 đã học hết → "Cấp A2 sắp tới còn N từ" + link học tiếp', () => {
    markAllLearned(getWordsByLevel('A1').map((w) => w.id));
    const html = renderAt('/learn?level=A1');
    expect(html).toContain('Cấp A2 sắp tới còn');
    expect(html).toContain('href="/learn?level=A2"');
    expect(html).toContain('Học tiếp →');
  });

  it('/learn khi đã học hết toàn bộ → mới báo hoàn thành', () => {
    const all = (['A1', 'A2', 'B1', 'B2'] as const).flatMap((l) =>
      getWordsByLevel(l).map((w) => w.id),
    );
    expect(all.length).toBe(3122);
    markAllLearned(all);
    const html = renderAt('/learn');
    expect(html).toContain('hoàn thành tất cả');
    expect(html).not.toContain('Cấp');
  });

  it('/learn còn từ chưa học → render đúng MỘT thẻ mỗi lúc', () => {
    const html = renderAt('/learn');
    expect(html).not.toContain('hoàn thành');
    expect(html).toContain('Xem nghĩa');
    const cards = html.match(/rounded-3xl border border-slate-200 bg-white p-8/g) ?? [];
    expect(cards).toHaveLength(1);
    expect(html).toContain('Trước');
  });

  it('/topics/:id → nút học/luyện + khung mẫu câu + danh sách từ có link', () => {
    const html = renderAt('/topics/a1-family-people');
    expect(html).toContain('Học chủ đề này');
    expect(html).toContain('href="/learn/a1-family-people"');
    expect(html).toContain('Luyện chủ đề');
    expect(html).toContain('href="/practice?topic=a1-family-people"');
    expect(html).toContain('Khung mẫu câu');
    expect(html).toContain('0/39 từ đã học');
    expect(html).toContain('href="/words/1"');
  });

  it('/words/1 → ví dụ + khung mẫu + nút đánh dấu + link luyện tập, không hiện ID thô', () => {
    const html = renderAt('/words/1');
    expect(html).toContain('Đánh dấu đã học');
    expect(html).toContain('href="/practice/mcq?word=1"');
    expect(html).toContain('Ví dụ');
    expect(html).toContain('Khung mẫu câu');
    expect(html).toContain('Gia đình và con người');
    expect(html).not.toContain('>ID<');
  });

  it('/words/1 khi đã học + đến hạn → "Đã học ✓" + chip "Đến hạn ôn"', () => {
    useProgress.getInitialState().data = {
      ...defaultProgress(),
      completed: { 1: '2026-01-01' },
      review: { 1: { due: '2000-01-01', interval: 1 } },
    };
    const html = renderAt('/words/1');
    expect(html).toContain('Đã học ✓');
    expect(html).toContain('Đến hạn ôn');
    expect(html).not.toContain('Đánh dấu đã học');
  });

  it('/levels/A1 → mỗi card có learned/wordCount + ProgressBar', () => {
    const html = renderAt('/levels/A1');
    expect(html).toContain('0/39 từ');
    expect(html).toContain('bg-indigo-500');
  });

  it('storageError → banner "Không lưu được tiến độ"', () => {
    useProgress.getInitialState().storageError = true;
    const html = renderAt('/');
    expect(html).toContain('Không lưu được tiến độ — kiểm tra bộ nhớ trình duyệt');
  });

  it('/settings → nút Export/Import tiến độ', () => {
    const html = renderAt('/settings');
    expect(html).toContain('Export tiến độ');
    expect(html).toContain('Import tiến độ');
  });
});
