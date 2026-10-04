import { useEffect, useState } from 'react';
import type { ListenExercise as ListenData } from '../../lib/exercises';
import { speak } from '../../lib/speech';

interface Props {
  exercise: ListenData;
  onAnswer: (ok: boolean) => void;
}

export default function ListenExercise({ exercise, onAnswer }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const answerWord = exercise.options[exercise.answerIndex];

  useEffect(() => {
    const t = setTimeout(() => speak(answerWord), 300);
    return () => clearTimeout(t);
  }, [answerWord]);

  useEffect(() => {
    if (picked === null) return;
    const t = setTimeout(() => onAnswer(picked === exercise.answerIndex), 800);
    return () => clearTimeout(t);
  }, [picked, exercise, onAnswer]);

  return (
    <div className="space-y-3">
      <div className="text-center">
        <button
          type="button"
          onClick={() => speak(answerWord)}
          className="h-16 rounded-full bg-indigo-600 px-6 text-xl text-white hover:bg-indigo-700"
        >
          🔊 Nghe
        </button>
        <p className="mt-2 text-sm text-slate-500">Nghe và chọn từ đúng</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {exercise.options.map((opt, i) => {
          let cls = 'border-slate-200 bg-white hover:border-indigo-300';
          if (answered) {
            if (i === exercise.answerIndex) cls = 'border-emerald-400 bg-emerald-50';
            else if (i === picked) cls = 'border-rose-400 bg-rose-50';
            else cls = 'border-slate-200 bg-white opacity-50';
          }
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => setPicked(i)}
              className={`rounded-xl border p-3 font-medium ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
