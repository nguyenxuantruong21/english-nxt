import { Word } from '../types';

export interface WordRowProps {
  word: Word;
}

export default function WordRow({ word }: WordRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0">
      <span className="text-2xl font-bold">{word.word}</span>
      <div className="text-xs text-slate-500">
        <span title={word.ipa}>{word.ipa}</span>
        <span title={word.pos}>{word.pos}</span>
      </div>
      <span className="text-sm font-medium text-slate-700">{word.meaningVi}</span>
    </div>
  );
}