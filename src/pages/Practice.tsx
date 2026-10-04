import { Link, useSearchParams } from "react-router-dom";
import { useProgress } from "../store/progress";
import { todayStr } from "../lib/review";
import type { ExerciseKind } from "../types";

const kinds: {
  kind: ExerciseKind | "flash";
  title: string;
  desc: string;
  to: string;
}[] = [
  {
    kind: "flash",
    title: "Flashcard ôn nhanh",
    desc: "Lật thẻ, nhớ/chưa nhớ",
    to: "/practice/flash",
  },
  {
    kind: "mcq",
    title: "Trắc nghiệm",
    desc: "Chọn nghĩa đúng (Anh → Việt)",
    to: "/practice/mcq",
  },
  {
    kind: "listen",
    title: "Nghe chọn từ",
    desc: "Nghe audio, chọn từ đúng",
    to: "/practice/listen",
  },
  {
    kind: "cloze",
    title: "Điền mẫu câu",
    desc: "Chọn từ còn thiếu",
    to: "/practice/cloze",
  },
  {
    kind: "dictation",
    title: "Chép chính tả",
    desc: "Nghe và gõ từ",
    to: "/practice/dictation",
  },
];

export default function Practice() {
  const store = useProgress();
  const session = store.data.sessions[todayStr()];
  const [params] = useSearchParams();
  const topic = params.get("topic");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Luyện tập</h1>
        {topic && <p className="text-sm text-slate-500">Chủ đề: {topic}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {kinds.map((k) => {
          const count = session
            ? k.kind === "flash"
              ? session.exercises.flashcard
              : session.exercises[k.kind]
            : 0;
          const href = topic
            ? `${k.to}?topic=${encodeURIComponent(topic)}`
            : k.to;
          return (
            <Link
              key={k.kind}
              to={href}
              className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-indigo-300"
            >
              <div className="flex items-baseline justify-between">
                <p className="font-semibold">{k.title}</p>
                <span className="text-xs text-slate-400">hôm nay: {count}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{k.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
