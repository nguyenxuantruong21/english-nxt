import { Link } from 'react-router-dom';
import { speak } from '../lib/speech';
import { useProgress } from '../store/progress';
import type { Word } from '../types';
import AudioButton from './AudioButton';

export interface WordRowProps {
  word: Word;
  onMarkKnown?: () => void;
}

export default function WordRow({ word, onMarkKnown }: WordRowProps) {
  const learned = useProgress((s) => s.data.completed[word.id] !== undefined);

  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
      <AudioButton onPlay={() => speak(word.word)} />
      <Link
        to={`/words/${word.id}`}
        className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 hover:text-indigo-700"
      >
        <span className="text-lg font-bold">{word.word}</span>
        <span className="text-xs text-slate-500" title={word.ipa}>
          {word.ipa}
        </span>
        <span className="text-xs text-slate-500" title={word.pos}>
          {word.pos}
        </span>
        <span className="text-sm text-slate-700">{word.meaningVi}</span>
      </Link>
      {learned ? (
        <span className="text-xs text-emerald-600" title="Đã học">
          ✓
        </span>
      ) : onMarkKnown ? (
        <button
          type="button"
          onClick={onMarkKnown}
          className="shrink-0 rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
        >
          Đánh dấu đã học
        </button>
      ) : null}
    </div>
  );
}
