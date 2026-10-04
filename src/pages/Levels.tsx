import { Link } from "react-router-dom";
import { getIndex } from "../lib/vocab";

export default function Levels() {
  const idx = getIndex();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold mb-4">Cấp độ</h1>
      <div className="grid grid-cols-2 gap-4">
        {idx.levels.map((lv) => (
          <Link
            key={lv.id}
            to={`/levels/${lv.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-indigo-300 transition-colors"
          >
            <p className="text-3xl font-bold text-indigo-600">{lv.id}</p>
            <p className="text-base text-slate-500 mt-1">{lv.name}</p>
            <p className="text-sm mt-1"> {lv.wordCount} từ</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
