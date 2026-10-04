import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getIndex } from "../lib/vocab";
import { selectUnknown } from "../lib/unknown";
import { speak } from "../lib/speech";
import { useProgress } from "../store/progress";
import AudioButton from "../components/AudioButton";

export default function UnknownWords() {
  const completed = useProgress((s) => s.data.completed);
  const markKnown = useProgress((s) => s.markKnown);
  const idx = getIndex();

  const [level, setLevel] = useState("");
  const [topicId, setTopicId] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filters = {
    level: level || undefined,
    topicId: topicId || undefined,
    query,
  };

  const result = useMemo(
    () => selectUnknown(completed, filters, page),
    [completed, level, topicId, query, page],
  );
  const totalUnknown = useMemo(
    () => selectUnknown(completed, {}, 1, Number.MAX_SAFE_INTEGER).total,
    [completed],
  );

  const changeFilter = (fn: () => void) => {
    fn();
    setPage(1);
  };

  if (totalUnknown === 0) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-md">
          <p className="text-4xl">🎉</p>
          <p className="mt-2 font-semibold">
            Bạn đã biết tất cả {idx.totalWords} từ!
          </p>
          <div className="mt-3 flex justify-center gap-3 text-sm">
            <Link to="/learn" className="text-indigo-600 hover:text-indigo-800">
              Ôn tập
            </Link>
            <Link to="/" className="text-indigo-600 hover:text-indigo-800">
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Từ chưa biết</h1>
          <p className="text-sm text-slate-500">
            {totalUnknown} từ chưa biết
          </p>
        </div>
        <Link
          to="/learn"
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Học ngay
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={level}
          onChange={(e) => changeFilter(() => setLevel(e.target.value))}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          aria-label="Lọc theo cấp độ"
        >
          <option value="">Tất cả cấp độ</option>
          {idx.levels.map((lv) => (
            <option key={lv.id} value={lv.id}>
              {lv.id} — {lv.name}
            </option>
          ))}
        </select>
        <select
          value={topicId}
          onChange={(e) => changeFilter(() => setTopicId(e.target.value))}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          aria-label="Lọc theo chủ đề"
        >
          <option value="">Tất cả chủ đề</option>
          {idx.topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nameVi}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={query}
          onChange={(e) => changeFilter(() => setQuery(e.target.value))}
          placeholder="Tìm từ hoặc nghĩa…"
          className="min-w-40 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
        {result.items.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">
            Không tìm thấy từ nào khớp bộ lọc
          </p>
        ) : (
          result.items.map((w) => (
            <div
              key={w.id}
              className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0"
            >
              <AudioButton onPlay={() => speak(w.word)} />
              <Link
                to={`/words/${w.id}`}
                className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 hover:text-indigo-700"
              >
                <span className="text-lg font-bold">{w.word}</span>
                <span className="text-xs text-slate-500" title={w.ipa}>
                  {w.ipa}
                </span>
                <span className="text-sm text-slate-700">{w.meaningVi}</span>
              </Link>
              <button
                type="button"
                onClick={() => markKnown(w.id)}
                className="shrink-0 rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
              >
                Đã biết
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {
            `Trang ${result.page}/${result.totalPages} · ${result.total} từ khớp`
          }
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={result.page <= 1}
            className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            ← Trước
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={result.page >= result.totalPages}
            className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            Tiếp →
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Đánh dấu “Đã biết” sẽ dời lịch ôn 30 ngày và không tính vào mục tiêu
        hằng ngày.
      </p>
    </div>
  );
}
