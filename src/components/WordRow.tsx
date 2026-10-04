import { Word } from '../types';
import { useProgress } from '../store/progress';

export interface WordRowProps {
  word: Word;
}

export default function WordRow({ word }: WordRowProps) {
  const store = useProgress();
  const completed = Object.keys(store.data.completed).map(Number);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0">
      <span className="text-2xl font-bold">{word.word}</span>
      <div className="text-xs text-slate-500">
        <span title={word.ipa}>{word.ipa}</span>
        <span title={word.pos}>{word.pos}</span>
      </div>
      <span className="text-sm font-medium text-slate-700">{word.meaningVi}</span>
      {completed.includes(word.id) && (
        <span className="text-xs text-green-500 ml-2">đã học</span>
      )}
    </div>
  );
}