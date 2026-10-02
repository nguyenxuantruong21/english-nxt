import { useLocation } from 'react-router-dom';
import { getIndex } from '../lib/vocab';
import type { LevelId } from '../types';

export default function LevelDetail() {
  const location = useLocation();
  const searchParams = new URLSearchParams(
    new URL(' ' + location.pathname + location.search, 'https://example.com')
      .searchParams,
  );
  const level = searchParams.get('level') || '';

  const idx = getIndex();
  const topics = idx.topics.filter((t) => t.level === level as LevelId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold mb-4">
        {level ? `Cấp độ ${level.toUpperCase()}` : 'Cấp độ'}
      </h1>
      {topics.length === 0 ? (
        <p className="text-slate-500">Chưa có chủ题 cho cấp độ này</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {topics.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-indigo-300 transition-colors"
            >
              <h2 className="text-lg font-bold text-indigo-600">{t.nameEn}</h2>
              <p className="text-sm text-slate-500">{t.nameVi}</p>
              <p className="text-xs mt-1">
                {t.wordCount} từ
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}