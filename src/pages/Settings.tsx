import { useState } from 'react';
import { useProgress } from '../store/progress';
import { computeStreak, todayStr } from '../lib/review';
import { getIndex } from '../lib/vocab';

export default function Settings() {
  const store = useProgress();
  const data = store.getState().data;
  const [confirming, setConfirming] = useState(false);
  const streak = computeStreak(data.sessions, todayStr());
  const idx = getIndex();

  const handleGoalChange = (raw: string) => {
    if (raw === '') return;
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(100, Math.max(5, Math.round(n)));
    store.getState().setDailyGoal(clamped);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Cài đặt</h1>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <label htmlFor="goal" className="font-semibold">
          Mục tiêu học mỗi ngày
        </label>
        <div className="mt-2 flex items-center gap-3">
          <input
            id="goal"
            type="number"
            min={5}
            max={100}
            value={data.settings.dailyGoal}
            onChange={(e) => handleGoalChange(e.target.value)}
            className="w-24 rounded-xl border border-slate-300 p-2 text-center focus:border-indigo-500 focus:outline-none"
          />
          <span className="text-sm text-slate-500">từ/ngày (5–100)</span>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Thống kê</h2>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Tổng từ đã học</dt>
            <dd className="font-medium">
              {data.stats.totalLearned}/{idx.totalWords}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Chuỗi học liên tiếp</dt>
            <dd className="font-medium">{streak} ngày</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Số phiên học</dt>
            <dd className="font-medium">{Object.keys(data.sessions).length}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-white p-4">
        <h2 className="font-semibold text-rose-600">Nguy hiểm</h2>
        {confirming ? (
          <div className="mt-2 space-y-2">
            <p className="text-sm text-slate-600">
              Xóa toàn bộ tiến độ? Hành động này không hoàn tác.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  store.getState().resetProgress();
                  setConfirming(false);
                }}
                className="flex-1 rounded-xl bg-rose-600 py-2 text-sm font-medium text-white hover:bg-rose-700"
              >
                Có, xóa hết
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-xl border border-slate-300 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-2 rounded-xl border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            Xóa toàn bộ tiến độ
          </button>
        )}
      </section>
    </div>
  );
}
