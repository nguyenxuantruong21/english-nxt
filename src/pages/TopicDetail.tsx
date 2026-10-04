import { Link, useParams } from 'react-router-dom';
import { getIndex, getWordsByTopic } from '../lib/vocab';

export default function TopicDetail() {
  const { topicId } = useParams();

  const idx = getIndex();
  const topic = idx.topics.find((t) => t.id === topicId);

  if (!topic) {
    return (
      <div className="p-8 text-center">
        <p>Không tìm thấy chủ đề</p>
        <Link
          to="/levels"
          className="mt-2 inline-block text-indigo-600 hover:text-indigo-800"
        >
          ← Về danh sách cấp độ
        </Link>
      </div>
    );
  }

  const words = getWordsByTopic(topic.id);

  return (
    <div className="space-y-4">
      <div>
        <Link
          to={`/levels/${topic.level}`}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          ← {topic.level}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">
          {topic.nameEn} {topic.nameVi ? `( ${topic.nameVi} )` : ''}
        </h1>
      </div>
      <p className="text-sm text-slate-500">Cấp độ: {topic.level}</p>
      <p className="text-sm text-slate-500">{topic.wordCount} từ</p>
      {words.length === 0 ? (
        <p className="text-slate-500">Chưa có từ</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {words.map((w) => (
            <Link
              key={w.id}
              to={`/words/${w.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-indigo-300 transition-colors"
            >
              <h2 className="text-lg font-bold">{w.word}</h2>
              <p className="text-xs text-slate-500">{w.ipa}</p>
              <p className="text-xs text-slate-500">{w.pos}</p>
              <p className="text-xs text-slate-500">{w.meaningVi}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
