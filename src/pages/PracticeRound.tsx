import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { buildFlashcard, hasOptions, makeRound, shuffle } from '../lib/exercises';
import type { Exercise } from '../lib/exercises';
import {
  getExamples,
  getFrames,
  getWord,
  getWordsByLevel,
  getWordsByTopic,
} from '../lib/vocab';
import { useProgress } from '../store/progress';
import McqExercise from '../components/exercises/McqExercise';
import ListenExercise from '../components/exercises/ListenExercise';
import ClozeExercise from '../components/exercises/ClozeExercise';
import DictationExercise from '../components/exercises/DictationExercise';
import Flashcard from '../components/Flashcard';
import SessionSummary from '../components/SessionSummary';

const ROUND_SIZE = 10;

function allWords() {
  return (['A1', 'A2', 'B1', 'B2'] as const).flatMap((l) => getWordsByLevel(l));
}

export default function PracticeRound() {
  const { kind } = useParams();
  const [params] = useSearchParams();
  const wordParam = params.get('word');
  const topicParam = params.get('topic');
  const store = useProgress();

  const pool = useMemo(() => {
    if (topicParam) return getWordsByTopic(topicParam);
    if (wordParam) {
      const w = getWord(Number(wordParam));
      return w ? getWordsByLevel(w.level) : allWords();
    }
    return allWords();
  }, [topicParam, wordParam]);

  const target = wordParam ? getWord(Number(wordParam)) : undefined;

  const round = useMemo<Exercise[]>(() => {
    if (kind === 'flash') {
      return shuffle(pool).slice(0, ROUND_SIZE).map((w) => buildFlashcard(w));
    }
    if (target && kind) {
      const frame = getFrames(target.topicId)[0];
      return makeRound(target, pool, frame, getExamples(target.id));
    }
    if (kind === 'mcq') return makeRound(undefined, pool, undefined, [], 'mcq');
    if (kind === 'listen') return makeRound(undefined, pool, undefined, [], 'listen');
    if (kind === 'cloze') return makeRound(undefined, pool, undefined, [], 'cloze');
    if (kind === 'dictation') return makeRound(undefined, pool, undefined, [], 'dictation');
    return makeRound(undefined, pool);
  }, [kind, pool, target]);

  const wordIdOf = useMemo(() => {
    const byText = new Map(pool.map((w) => [w.word.toLowerCase(), w.id]));
    return (ex: Exercise): number | undefined => {
      if (ex.kind === 'flashcard') return ex.word.id;
      if (ex.kind === 'dictation') return ex.wordId;
      const text =
        ex.kind === 'mcq'
          ? ex.question
          : ex.kind === 'listen'
            ? ex.options[ex.answerIndex]
            : ex.answer;
      return byText.get(text.toLowerCase()) ?? target?.id;
    };
  }, [pool, target]);

  const [pos, setPos] = useState(0);
  const [correct, setCorrect] = useState(0);
  const done = pos >= round.length;

  useEffect(() => {
    setPos(0);
    setCorrect(0);
  }, [round]);

  const handleAnswer = (ok: boolean) => {
    const ex = round[pos];
    if (ok) setCorrect((c) => c + 1);
    if (ex) {
      store.getState().logExercise(ex.kind);
      const wordId = wordIdOf(ex);
      if (wordId !== undefined) store.getState().answerWord(wordId, ok);
    }
    setPos((p) => p + 1);
  };

  if (round.length === 0) {
    return <p className="p-4 text-slate-500">Không có dữ liệu luyện tập.</p>;
  }

  if (done) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="font-semibold">Hoàn thành {round.length} câu</p>
          <p className="my-2 text-3xl font-bold text-indigo-600">
            {correct}/{round.length}
          </p>
          <button
            type="button"
            onClick={() => {
              setPos(0);
              setCorrect(0);
            }}
            className="rounded-xl bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700"
          >
            Luyện lại
          </button>
        </div>
        <SessionSummary />
      </div>
    );
  }

  const ex = round[pos];
  const dictationWord = ex.kind === 'dictation' ? getWord(ex.wordId) : undefined;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          Câu {pos + 1}/{round.length}
        </span>
        <span>Đúng: {correct}</span>
      </div>

      {ex.kind === 'flashcard' && (
        <div className="space-y-3">
          <Flashcard word={ex.word} />
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => handleAnswer(true)}
              className="rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700"
            >
              Nhớ được
            </button>
            <button
              type="button"
              onClick={() => handleAnswer(false)}
              className="rounded-xl bg-rose-600 px-6 py-3 font-medium text-white hover:bg-rose-700"
            >
              Chưa nhớ
            </button>
          </div>
        </div>
      )}
      {ex.kind === 'mcq' && (
        <McqExercise key={pos} exercise={ex} onAnswer={handleAnswer} />
      )}
      {ex.kind === 'listen' && (
        <ListenExercise key={pos} exercise={ex} onAnswer={handleAnswer} />
      )}
      {ex.kind === 'cloze' && hasOptions(ex) && (
        <ClozeExercise key={pos} exercise={ex} onAnswer={handleAnswer} />
      )}
      {ex.kind === 'cloze' && !hasOptions(ex) && (
        <p className="text-center text-slate-500">Bỏ qua câu này...</p>
      )}
      {ex.kind === 'dictation' && dictationWord && (
        <DictationExercise key={pos} word={dictationWord} onAnswer={handleAnswer} />
      )}
      {ex.kind === 'dictation' && !dictationWord && (
        <p className="text-center text-slate-500">Bỏ qua câu này...</p>
      )}
    </div>
  );
}
