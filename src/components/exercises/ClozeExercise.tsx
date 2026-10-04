import { useEffect, useState } from 'react';
import type { ClozeWithOptions } from '../../lib/exercises';
import { speak } from '../../lib/speech';

interface Props {
  exercise: ClozeWithOptions;
  onAnswer: (ok: boolean) => void;
}

export default function ClozeExercise({ exercise, onAnswer }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;

  useEffect(() => {
    if (picked === null) return;
    const t = setTimeout(() => onAnswer(picked === exercise.answerIndex), 800);
    return () => clearTimeout(t);
  }, [picked, exercise, onAnswer]);

  return (
    <div className="space-y-3">
      <p className="rounded-2xl bg-white p-6 text-center text-xl leading-relaxed">
        {exercise.sentence}
      </p>
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => speak(exercise.sentence.replace('___', exercise.answer))}
          className="rounded-full bg-indigo-50 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-100"
        >
          🔊 Nghe ví dụ
        </button>
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
