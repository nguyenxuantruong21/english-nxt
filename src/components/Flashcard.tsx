import { Word } from '../types';
import { useProgress } from '../store/progress';

export interface FlashcardProps {
  word: Word;
}

export default function Flashcard({ word }: FlashcardProps) {
  const store = useProgress();
  const completed = Object.keys(store.getState().data.completed).map(Number);

  const handleLearn = () => {
    store.getState().data.completed[word.id] = 'learned';
  };

  return (
    <div className="group relative bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <div className="text-3xl font-bold">{word.word}</div>
      <div className="mt-2 text-slate-500 text-sm ipa">{word.ipa}</div>
      <div className="mt-3 text-slate-600">
        {word.pos} — {word.meaningVi}
      </div>
      {completed.includes(word.id) ? (
        <span className="mt-2 text-green-500 text-xs">đã học</span>
      ) : (
        <button
          onClick={handleLearn}
          className="mt-2 rounded bg-green-600 text-white px-3 py-1 text-sm hover:bg-green-700"
        >
          Học từ
        </button>
      )}
    </div>
  );
}