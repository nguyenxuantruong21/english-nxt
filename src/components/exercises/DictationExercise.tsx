import { useEffect, useRef, useState } from 'react';
import type { Word } from '../../types';
import { speak } from '../../lib/speech';

interface Props {
  word: Word;
  onAnswer: (ok: boolean) => void;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export default function DictationExercise({ word, onAnswer }: Props) {
  const [value, setValue] = useState('');
  const [checked, setChecked] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => speak(word.word), 400);
    inputRef.current?.focus();
    return () => clearTimeout(t);
  }, [word]);

  useEffect(() => {
    if (checked === null) return;
    const t = setTimeout(() => onAnswer(checked), 1200);
    return () => clearTimeout(t);
  }, [checked, onAnswer]);

  const submit = () => {
    if (checked !== null || !value.trim()) return;
    const ok = normalize(value) === normalize(word.word);
    setChecked(ok);
    speak(word.word);
  };

  return (
    <div className="space-y-3">
      <div className="text-center">
        <button
          type="button"
          onClick={() => speak(word.word)}
          className="h-16 w-16 rounded-full bg-indigo-600 text-2xl text-white hover:bg-indigo-700"
        >
          🔊
        </button>
        <p className="mt-2 text-sm text-slate-500">Nghe và gõ từ bạn nghe được</p>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        disabled={checked !== null}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Gõ từ tiếng Anh..."
        className="w-full rounded-xl border border-slate-300 p-3 text-center text-lg focus:border-indigo-500 focus:outline-none"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={submit}
        disabled={checked !== null || !value.trim()}
        className="w-full rounded-xl bg-indigo-600 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
      >
        Kiểm tra
      </button>
      {checked !== null && (
        <p className={`text-center font-medium ${checked ? 'text-emerald-600' : 'text-rose-600'}`}>
          {checked ? '✓ Chính xác!' : `✗ Sai — đáp án: ${word.word}`}
        </p>
      )}
    </div>
  );
}
