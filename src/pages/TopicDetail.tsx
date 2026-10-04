import { Link, useParams } from "react-router-dom";
import { getFrames, getIndex, getWordsByTopic } from "../lib/vocab";
import { useProgress } from "../store/progress";
import WordRow from "../components/WordRow";

export default function TopicDetail() {
  const { topicId } = useParams();

  const idx = getIndex();
  const topic = idx.topics.find((t) => t.id === topicId);
  const completed = useProgress((s) => s.data.completed);

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
  const frames = getFrames(topic.id);
  const learned = topic.wordIds.filter(
    (id) => completed[id] !== undefined,
  ).length;

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
          {topic.nameVi || topic.nameEn}
        </h1>
        <p className="text-sm text-slate-500">
          {topic.nameEn} · {`${learned}/${topic.wordCount} từ đã học`}
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          to={`/learn/${topic.id}`}
          className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-center font-medium text-white hover:bg-indigo-700"
        >
          Học chủ đề này
        </Link>
        <Link
          to={`/practice?topic=${topic.id}`}
          className="flex-1 rounded-xl border border-indigo-600 py-2.5 text-center font-medium text-indigo-600 hover:bg-indigo-50"
        >
          Luyện chủ đề
        </Link>
      </div>

      {words.length === 0 ? (
        <p className="text-slate-500">Chưa có từ</p>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white">
          {words.map((w) => (
            <WordRow key={w.id} word={w} />
          ))}
        </section>
      )}

      {frames.length > 0 && (
        <details className="rounded-2xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer font-semibold">
            Khung mẫu câu ({frames.length})
          </summary>
          <ul className="mt-3 space-y-3">
            {frames.map((f, i) => (
              <li key={i}>
                <p className="font-medium">{f.template}</p>
                <p className="text-sm text-slate-500">→ {f.example}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
