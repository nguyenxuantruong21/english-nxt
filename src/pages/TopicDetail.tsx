import { useLocation } from 'react-router-dom';
import { getIndex, getWordsByTopic } from '../lib/vocab';

export default function TopicDetail() {
  const location = useLocation();
  const searchParams = new URLSearchParams(
    new URL(' ' + location.pathname + location.search, 'https://example.com')
      .searchParams,
  );
  const topicId = searchParams.get('topicId') || '';

  const idx = getIndex();
  const topic = idx.topics.find((t) => t.id === topicId);

  if (!topic) {
    return <div className="p-8 text-center">Không tìm thấy chủ đề</div>;
  }

  const words = getWordsByTopic(topicId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold mb-4">
        {topic.nameEn} {topic.nameVi ? `( ${topic.nameVi} )` : ''}
      </h1>
      <p className="text-sm text-slate-500">Cấp độ: {topic.level}</p>
      <p className="text-sm text-slate-500">{topic.wordCount} từ</p>
      {words.length === 0 ? (
        <p className="text-slate-500">Chưa có từ</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {words.map((w) => (
            <div
              key={w.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-indigo-300"
            >
              <h2 className="text-lg font-bold">{w.word}</h2>
              <p className="text-xs text-slate-500">{w.ipa}</p>
              <p className="text-xs text-slate-500">{w.pos}</p>
              <p className="text-xs text-slate-500">{w.meaningVi}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}