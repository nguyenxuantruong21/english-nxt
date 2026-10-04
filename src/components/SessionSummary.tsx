import { Link } from 'react-router-dom';
import { useProgress } from '../store/progress';
import { dailyStats } from '../lib/review';
import type { ProgressData } from '../types';

export interface SessionRecap {
  learned: number;
  correct: number;
  total: number;
}

export interface SessionSummaryProps {
  today?: string;
  recap?: SessionRecap;
  onAgain?: () => void;
}

function RecapCard({ recap, onAgain }: { recap: SessionRecap; onAgain?: () => void }) {
  const pct = recap.total > 0 ? Math.round((recap.correct / recap.total) * 100) : 0;
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-5xl">🎉</p>
      <h2 className="mt-2 text-xl font-bold">Hoàn thành phiên học!</h2>
      <p className="mt-3 text-sm text-slate-600">
        Đã học {recap.learned} · trả lời đúng {recap.correct}/{recap.total} ({pct}%)
      </p>
      <div className="mt-5 flex gap-3">
        {onAgain && (
          <button
            type="button"
            onClick={onAgain}
            className="flex-1 rounded-xl border border-indigo-600 py-2.5 font-medium text-indigo-600 hover:bg-indigo-50"
          >
            Học thêm
          </button>
        )}
        <Link
          to="/"
          className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-center font-medium text-white hover:bg-indigo-700"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}

export default function SessionSummary({
  today: todayStrProp,
  recap,
  onAgain,
}: SessionSummaryProps = {}) {
  const store = useProgress();
  const data: ProgressData = store.data;
  const stats = dailyStats(data, todayStrProp ?? new Date().toISOString().split('T')[0]);

  if (recap) return <RecapCard recap={recap} onAgain={onAgain} />;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold">Hôm nay</h3>
        <div className="text-slate-500 text-sm">
          {stats.learnedToday}/{stats.goal}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-slate-500">Đã học</p>
          <p className="text-2xl font-bold">{stats.learnedToday}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Đã ôn</p>
          <p className="text-2xl font-bold">{stats.reviewedToday}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Còn thiếu</p>
          <p className="text-2xl font-bold text-red-600">{stats.remaining}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Đến hạn</p>
          <p className="text-2xl font-bold">{stats.dueCount}</p>
        </div>
      </div>
    </div>
  );
}
