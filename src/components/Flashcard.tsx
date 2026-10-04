import type { Word } from "../types";
import { getExamples } from "../lib/vocab";
import { speak } from "../lib/speech";
import { useProgress } from "../store/progress";
import AudioButton from "./AudioButton";

export interface FlashcardProps {
  word: Word;
  onResult?: (ok: boolean) => void;
  onKnown?: () => void;
}

export default function Flashcard({ word, onResult, onKnown }: FlashcardProps) {
  const learned = useProgress((s) => s.data.completed[word.id] !== undefined);
  const learnWord = useProgress((s) => s.learnWord);
  const examples = getExamples(word.id);

  if (onResult) {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="flex items-center justify-center gap-3">
            <h2 className="text-3xl font-bold">{word.word}</h2>
            <AudioButton onPlay={() => speak(word.word)} />
          </div>
          <p className="mt-1 text-sm text-slate-500 ipa">{word.ipa}</p>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xl">{word.meaningVi}</p>
            <p className="text-sm text-slate-400">{word.pos}</p>
            {examples.length > 0 && (
              <p className="mt-3 text-sm italic text-slate-600">“{examples[0].en}”</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onResult(false)}
            className="rounded-xl border border-rose-300 py-3 font-medium text-rose-600 hover:bg-rose-50"
          >
            Chưa nhớ
          </button>
          <button
            type="button"
            onClick={() => onResult(true)}
            className="rounded-xl bg-indigo-600 py-3 font-medium text-white hover:bg-indigo-700"
          >
            Nhớ rồi
          </button>
        </div>
        {onKnown && (
          <div className="mt-3">
            <button
              type="button"
              onClick={onKnown}
              className="w-full rounded-xl border border-slate-200 py-2.5 text-sm text-slate-400 hover:border-slate-300 hover:text-slate-600"
            >
              Đã biết rồi — bỏ qua
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="group relative bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <div className="text-3xl font-bold">{word.word}</div>
      <div className="mt-2 text-slate-500 text-sm ipa">{word.ipa}</div>
      <div className="mt-3 text-slate-600">
        {word.pos} — {word.meaningVi}
      </div>
      {learned ? (
        <span className="mt-2 text-green-500 text-xs">đã học</span>
      ) : (
        <button
          onClick={() => learnWord(word.id)}
          className="mt-2 rounded bg-green-600 text-white px-3 py-1 text-sm hover:bg-green-700"
        >
          Học từ
        </button>
      )}
    </div>
  );
}