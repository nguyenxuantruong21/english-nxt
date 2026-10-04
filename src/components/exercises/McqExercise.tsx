import { useEffect, useState } from 'react';
import type { McqExercise as McqData } from '../../lib/exercises';

interface Props {
  exercise: McqData;
  onAnswer: (ok: boolean) => void;
}

export default function McqExercise({ exercise, onAnswer }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;

  useEffect(() => {
    if (picked === null) return;
    const t = setTimeout(() => onAnswer(picked === exercise.answerIndex), 800);
    return () => clearTimeout(t);
  }, [picked, exercise, onAnswer]);

  return (
    <div className="space-y-3">
      <p className="text-center text-3xl font-bold">{exercise.question}</p>
      <div className="grid gap-2">
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
              className={`rounded-xl border p-3 text-left font-medium ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
