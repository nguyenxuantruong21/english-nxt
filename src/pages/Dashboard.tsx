import { Link } from "react-router-dom";
import { useProgress } from "../store/progress";
import { computeStreak, dailyStats, todayStr } from "../lib/review";
import { getIndex } from "../lib/vocab";
import ProgressBar from "../components/ProgressBar";

export default function Dashboard() {
  const store = useProgress();
  const data = store.data;
  const today = todayStr();
  const stats = dailyStats(data, today);
  const streak = computeStreak(data.sessions, today);
  const idx = getIndex();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Xin chào 👋</h1>
        <p className="text-sm text-slate-500">{today}</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-semibold">Tiến độ hôm nay</h2>
          <span className="text-sm text-slate-500">
            {stats.learnedToday}/{stats.goal} từ
          </span>
        </div>
        <ProgressBar value={stats.learnedToday} max={stats.goal} />
        <Link
          to="/learn"
          className="mt-4 block rounded-xl bg-indigo-600 py-2.5 text-center font-medium text-white hover:bg-indigo-700"
        >
          {stats.remaining > 0
            ? `Học tiếp (${stats.remaining} từ)`
            : "Ôn lại hôm nay"}
        </Link>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Ôn tập</h2>
            <p className="text-sm text-slate-500">
              {stats.dueCount} từ đến hạn
            </p>
          </div>
          <Link
            to="/practice"
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              stats.dueCount > 0
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            Ôn ngay
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold">🔥 {streak}</p>
          <p className="text-sm text-slate-500">ngày liên tiếp</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold">{data.stats.totalLearned}</p>
          <p className="text-sm text-slate-500">
            {data.stats.totalLearned}/{idx.totalWords} từ đã học
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {idx.levels.map((lv) => (
          <Link
            key={lv.id}
            to={`/levels/${lv.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-indigo-300"
          >
            <p className="text-lg font-bold">{lv.id}</p>
            <p className="text-xs text-slate-500">
              {lv.name} · {lv.wordCount} từ
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
