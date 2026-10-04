import { Link, useParams } from 'react-router-dom';
import { getWord } from '../lib/vocab';
import { speak } from '../lib/speech';
import { useProgress } from '../store/progress';
import AudioButton from '../components/AudioButton';

export default function WordDetail() {
  const store = useProgress();
  const { id } = useParams();

  const word = getWord(Number(id));
  if (!word) {
    return (
      <div className="p-8 text-center">
        <p>Không tìm thấy từ</p>
        <Link to="/" className="mt-2 inline-block text-indigo-600 hover:text-indigo-800">
          Về trang chủ
        </Link>
      </div>
    );
  }

  const completed = Object.keys(store.data.completed).map(Number);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">
          {word.word} {word.pos}
        </h1>
        <AudioButton onPlay={() => speak(word.word)} />
      </div>
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
          <Link
            to={`/topics/${word.topicId}`}
            className="text-indigo-600 underline hover:text-indigo-800"
          >
            {word.topicId}
          </Link>
        </div>
      )}
    </div>
  );
}
