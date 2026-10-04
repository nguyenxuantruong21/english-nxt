import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getIndex, getWord } from '../lib/vocab';
import { useProgress } from '../store/progress';
import { buildDailyQueue, LEVEL_ORDER } from '../lib/queue';
import { todayStr } from '../lib/review';
import type { LevelId } from '../types';
import Flashcard from '../components/Flashcard';
import SessionSummary from '../components/SessionSummary';

export default function Learn() {
  const { topicId } = useParams();
  const [params] = useSearchParams();
  const levelParam = params.get('level');
  const level: LevelId | undefined = levelParam && (LEVEL_ORDER as readonly string[]).includes(levelParam)
    ? (levelParam as LevelId)
    : undefined;

  const data = useProgress((s) => s.data);
  const learnWord = useProgress((s) => s.learnWord);
  const answerWord = useProgress((s) => s.answerWord);
  const logExercise = useProgress((s) => s.logExercise);

  const [epoch, setEpoch] = useState(0);
  const [pos, setPos] = useState(0);
  const [results, setResults] = useState<Record<number, boolean>>({});

  const sessionKey = `${topicId ?? ''}|${level ?? ''}|${epoch}`;
  const [activeKey, setActiveKey] = useState(sessionKey);
  if (activeKey !== sessionKey) {
    setActiveKey(sessionKey);
    setPos(0);
    setResults({});
  }

  const today = todayStr();
  const idx = getIndex();
  const topic = topicId ? idx.topics.find((t) => t.id === topicId) : undefined;

  const result = useMemo(
    () => buildDailyQueue({ data, today, topicId, level }),
    [topicId, level, epoch],
  );
  const queue = result.queue;

  if (topicId && !topic) {
    return (
      <div className="p-8 text-center">
        <p>Không tìm thấy chủ đề</p>
        <Link to="/learn" className="mt-2 inline-block text-indigo-600 hover:text-indigo-800">
          Về trang học
        </Link>
      </div>
    );
  }

  const handleResult = (ok: boolean) => {
    const item = queue[pos];
    if (!item) return;
    if (results[item.wordId] === undefined) {
      learnWord(item.wordId);
      answerWord(item.wordId, ok);
      logExercise('flashcard');
    }
    setResults((r) => ({ ...r, [item.wordId]: ok }));
    setPos((p) => p + 1);
  };

  const restart = () => setEpoch((e) => e + 1);

  if (queue.length > 0 && pos >= queue.length) {
    const newCount = queue.filter((q) => q.isNew).length;
    const correct = Object.values(results).filter(Boolean).length;
    return (
      <div className="p-8">
        <SessionSummary
          recap={{ learned: newCount, correct, total: queue.length }}
          onAgain={restart}
        />
      </div>
    );
  }

  const everythingDone = result.unlearnedTotal === 0 && result.dueTotal === 0;

  if (queue.length === 0 && everythingDone) {
    return (
      <div className="p-8 space-y-6">
        <SessionSummary />
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-md">
          <p className="font-semibold">Không còn từ nào cần học — bạn đã hoàn thành tất cả!</p>
          <div className="mt-3 flex justify-center gap-3 text-sm">
            <Link to="/practice" className="text-indigo-600 hover:text-indigo-800">
              Luyện tập
            </Link>
            <Link to="/" className="text-indigo-600 hover:text-indigo-800">
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="p-8 space-y-6">
        <SessionSummary />
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-md">
          {result.remaining === 0 ? (
            <>
              <p className="font-semibold">
                Đã đạt mục tiêu hôm nay{' '}
                {`${data.sessions[today]?.learned ?? 0}/${data.settings.dailyGoal} từ`}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {result.unlearnedTotal > 0 && `Còn ${result.unlearnedTotal} từ chưa học`}
                {result.unlearnedTotal > 0 && result.dueTotal > 0 && ' · '}
                {result.dueTotal > 0 && `${result.dueTotal} từ đến hạn ôn`}
              </p>
              <div className="mt-3 flex justify-center gap-3 text-sm">
                <Link to="/practice" className="text-indigo-600 hover:text-indigo-800">
                  Luyện tập
                </Link>
                <Link to="/" className="text-indigo-600 hover:text-indigo-800">
                  Về trang chủ
                </Link>
              </div>
            </>
          ) : result.nextLevel ? (
            <>
              <p className="font-semibold">
                {`Cấp ${result.nextLevel} sắp tới còn ${result.nextLevelUnlearned} từ`}
              </p>
              <Link
                to={`/learn?level=${result.nextLevel}`}
                className="mt-3 inline-block rounded-xl bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700"
              >
                Học tiếp →
              </Link>
            </>
          ) : (
            <>
              <p className="font-semibold">{`Còn ${result.dueTotal} từ đến hạn ôn`}</p>
              <Link
                to="/learn"
                className="mt-3 inline-block rounded-xl bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700"
              >
                Ôn tập →
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const item = queue[pos];
  const word = getWord(item.wordId);

  return (
    <div className="p-8 space-y-6">
      <SessionSummary />
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {pos + 1}/{queue.length}
        </span>
        <span>{item.isNew ? 'Từ mới' : 'Ôn tập'}</span>
        <button
          type="button"
          onClick={() => setPos((p) => Math.max(0, p - 1))}
          disabled={pos === 0}
          className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
        >
          ← Trước
        </button>
      </div>
      {word && <Flashcard key={word.id} word={word} onResult={handleResult} />}
    </div>
  );
}
