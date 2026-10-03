import { useProgress } from '../store/progress';
import { dailyStats } from '../lib/review';
import type { ProgressData } from '../types';

export interface SessionSummaryProps {
  today?: string;
}

export default function SessionSummary({ today: todayStr }: SessionSummaryProps = {}) {
  const store = useProgress();
  const data: ProgressData = store.getState().data;
  const stats = dailyStats(data, todayStr ?? new Date().toISOString().split('T')[0]);

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