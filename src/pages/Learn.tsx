import { Link, useParams } from 'react-router-dom';
import { getIndex, getWordsByLevel, getWordsByTopic } from '../lib/vocab';
import { useProgress } from '../store/progress';
import Flashcard from '../components/Flashcard';
import SessionSummary from '../components/SessionSummary';

export default function Learn() {
  const { topicId } = useParams();
  const store = useProgress();
  const idx = getIndex();

  const topic = topicId ? idx.topics.find((t) => t.id === topicId) : undefined;

  if (topicId && !topic) {
    return (
      <div className="p-8 text-center">
        <p>Không tìm thấy chủ đề</p>
        <Link to="/learn" className="mt-2 inline-block text-indigo-600 hover:text-indigo-800">
          Về trang học
        </Link>
      </div>
    );
  }

  const words = topic ? getWordsByTopic(topic.id) : getWordsByLevel('A1');
  const pending = words.filter((w) => store.data.completed[w.id] === undefined);

  return (
    <div className="p-8 space-y-6">
      <SessionSummary />
      {pending.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-md">
          <p className="font-semibold">Không có từ nào cần học — bạn đã hoàn thành!</p>
          <div className="mt-3 flex justify-center gap-3 text-sm">
            <Link to="/practice" className="text-indigo-600 hover:text-indigo-800">
              Luyện tập
            </Link>
            <Link to="/" className="text-indigo-600 hover:text-indigo-800">
              Về trang chủ
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {words.map((word) => (
            <Flashcard key={word.id} word={word} />
          ))}
        </div>
      )}
    </div>
  );
}
