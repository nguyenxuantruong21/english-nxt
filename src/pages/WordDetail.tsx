import { useLocation } from 'react-router-dom';
import { getWord } from '../lib/vocab';
import { useProgress } from '../store/progress';

export default function WordDetail() {
  const location = useLocation();
  const searchParams = new URLSearchParams(
    new URL(' ' + location.pathname + location.search, 'https://example.com')
      .searchParams,
  );
  const wordId = Number(searchParams.get('id') || '0');

  const word = getWord(wordId);
  if (!word) {
    return <div className="p-8 text-center">Không tìm thấy từ</div>;
  }

  const store = useProgress();
  const completed = Object.keys(store.getState().data.completed).map(Number);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold mb-4">
        {word.word} {word.pos}
      </h1>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-slate-500">ID</p>
          <p className="text-lg font-bold">{word.id}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Level</p>
          <p className="text-lg font-bold">{word.level}</p>
        </div>
      </div>
      <p className="text-xl font-bold">{word.word}</p>
      <p className="text-slate-500">{word.ipa}</p>
      <p className="text-slate-500">{word.meaningVi}</p>
      {completed.includes(word.id) && (
        <p className="text-green-500 mt-2">đã học</p>
      )}
      {word.topicId && (
        <div className="mt-4">
          <p className="text-sm text-slate-500">Chủ đề</p>
          <a
            href={`/topics/${word.topicId}`}
            className="text-indigo-600 underline hover:text-indigo-800"
          >
            {word.topicId}
          </a>
        </div>
      )}
    </div>
  );
}