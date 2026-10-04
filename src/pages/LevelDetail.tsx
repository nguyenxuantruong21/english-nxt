import { Link, useParams } from "react-router-dom";
import { getIndex } from "../lib/vocab";
import { useProgress } from "../store/progress";
import ProgressBar from "../components/ProgressBar";

export default function LevelDetail() {
  const { level } = useParams();
  const idx = getIndex();
  const lv = idx.levels.find((l) => l.id === level);
  const completed = useProgress((s) => s.data.completed);

  if (!lv) {
    return (
      <div className="p-8 text-center">
        <p>Không tìm thấy cấp độ</p>
        <Link
          to="/levels"
          className="mt-2 inline-block text-indigo-600 hover:text-indigo-800"
        >
          ← Về danh sách cấp độ
        </Link>
      </div>
    );
  }

  const topics = idx.topics.filter((t) => t.level === lv.id);

  return (
    <div className="space-y-4">
      <div>
        <Link
          to="/levels"
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          ← Cấp độ
        </Link>
        <h1 className="mt-1 text-2xl font-bold">
          {lv.id} — {lv.name}
        </h1>
        <p className="text-sm text-slate-500">
          {lv.wordCount} từ · {topics.length} chủ đề
        </p>
      </div>
      {topics.length === 0 ? (
        <p className="text-slate-500">Chưa có chủ đề cho cấp độ này</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {topics.map((t) => {
            const learned = t.wordIds.filter(
              (id) => completed[id] !== undefined,
            ).length;
            return (
              <Link
                key={t.id}
                to={`/topics/${t.id}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-indigo-300 transition-colors"
              >
                <h2 className="text-lg font-bold text-indigo-600">
                  {t.nameEn}
                </h2>
                <p className="text-sm text-slate-500">{t.nameVi}</p>
                <p className="mt-2 text-xs">{`${learned}/${t.wordCount} từ`}</p>
                <div className="mt-1">
                  <ProgressBar value={learned} max={t.wordCount} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
