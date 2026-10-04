import { Link, useParams } from 'react-router-dom';
import { getExamples, getFrames, getWord, getIndex } from '../lib/vocab';
import { speak } from '../lib/speech';
import { useProgress } from '../store/progress';
import { isDue, todayStr } from '../lib/review';
import AudioButton from '../components/AudioButton';

export default function WordDetail() {
  const store = useProgress();
  const { id } = useParams();

  const numId = Number(id);
  const word = getWord(numId);
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

  const idx = getIndex();
  const topic = idx.topics.find((t) => t.id === word.topicId);
  const examples = getExamples(numId);
  const frames = getFrames(word.topicId);
  const isLearned = store.data.completed[numId] !== undefined;
  const review = store.data.review[numId];
  const due = review ? isDue(review, todayStr()) : false;

  return (
    <div className="space-y-4">
      {topic && (
        <Link
          to={`/topics/${topic.id}`}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          ← {topic.nameVi}
        </Link>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <div className="flex items-center justify-center gap-3">
          <h1 className="text-3xl font-bold">{word.word}</h1>
          <AudioButton onPlay={() => speak(word.word)} />
        </div>
        <p className="mt-1 text-slate-500 ipa">{word.ipa}</p>
        <p className="mt-3 text-xl">{word.meaningVi}</p>
        <p className="mt-2 text-sm text-slate-400">
          {word.pos} · {word.level}
        </p>

        {isLearned && review && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span
              className={`rounded-full px-3 py-1 ${
                due ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {due ? 'Đến hạn ôn' : `Ôn sau ${review.due}`}
            </span>
          </div>
        )}

        {isLearned ? (
          <p className="mt-4 text-sm font-medium text-emerald-600">Đã học ✓</p>
        ) : (
          <button
            type="button"
            onClick={() => store.learnWord(numId)}
            className="mt-4 rounded-xl bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700"
          >
            Đánh dấu đã học
          </button>
        )}

        <Link
          to={`/practice/mcq?word=${numId}`}
          className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          Luyện tập từ này →
        </Link>
      </div>

      {examples.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Ví dụ</h2>
          <ul className="mt-2 space-y-2">
            {examples.map((e, i) => (
              <li key={i} className="flex items-start justify-between gap-3 text-sm">
                <span>{e.en}</span>
                <AudioButton onPlay={() => speak(e.en)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {frames.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Khung mẫu câu</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {frames.slice(0, 5).map((f, i) => (
              <li key={i}>
                <span className="font-medium">{f.template}</span>
                <span className="text-slate-500"> → {f.example}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
