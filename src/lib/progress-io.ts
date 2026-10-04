import type { DaySession, ExerciseKind, ProgressData } from "../types";
import { todayStr } from "./review";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Kết quả của {@link parseProgressJson} — hàm tổng (total): không bao giờ ném
 * lỗi với mọi chuỗi đầu vào. Chỉ từ chối 2 trường hợp không thể sửa:
 * 1. Chuỗi không phải JSON hợp lệ.
 * 2. Phần tử gốc không phải object (mảng/chuỗi/số/null).
 *
 * Mọi trường khác được chuẩn hóa theo đúng các quy tắc sau trước khi trả về
 * (data luôn tuân thủ `ProgressData`, an toàn cho `dailyStats`/`buildDailyQueue`):
 * - `settings.dailyGoal`: số hữu hạn → kẹp trong [5, 100]; thiếu hoặc không hợp
 *   lệ (chuỗi, null, object…) → 20. `settings` không phải object → coi như {}.
 * - `completed`: container không phải object → {}. Entry được giữ khi key là số
 *   nguyên an toàn dạng chữ số ("/^\d+$/") VÀ giá trị là string; entry sai bị bỏ.
 * - `review`: container không phải object → {}. Entry được giữ khi key là số
 *   nguyên an toàn, value là object với `due` khớp /^\d{4}-\d{2}-\d{2}$/ và
 *   `interval` là số hữu hạn ≥ 0; entry sai bị bỏ (không thay thế bằng placeholder).
 * - `sessions`: container không phải object → {}. Entry được giữ khi value là
 *   object, `learned`/`reviewed` là số hữu hạn (làm tròn, kẹp ≥ 0), và
 *   `exercises` vắng mặt hoặc là object; kind thiếu/không hợp lệ → 0, kind lạ bị
 *   bỏ qua (đủ 5 kind); entry sai bị bỏ.
 * - `stats`: object → `streak`/`totalLearned` là số hữu hạn (làm tròn, kẹp ≥ 0),
 *   thiếu hoặc sai → 0; container không phải object → { streak: 0,
 *   totalLearned: số entry `completed` đã chuẩn hóa }.
 */
export type ImportResult =
  | { ok: true; data: ProgressData }
  | { ok: false; error: string };

const INVALID = "File không đúng định dạng tiến độ english_nxt";
const NUMERIC_KEY = /^\d+$/;
const DUE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EXERCISE_KINDS: readonly ExerciseKind[] = [
  "flashcard",
  "mcq",
  "listen",
  "cloze",
  "dictation",
];

function sanitizeDailyGoal(v: unknown): number {
  if (!isFiniteNumber(v)) return 20;
  return Math.min(100, Math.max(5, v));
}

function safeId(key: string): number | undefined {
  if (!NUMERIC_KEY.test(key)) return undefined;
  const id = Number(key);
  return Number.isSafeInteger(id) ? id : undefined;
}

function toCount(v: unknown): number {
  if (!isFiniteNumber(v)) return 0;
  return Math.max(0, Math.round(v));
}

function sanitizeCompleted(v: unknown): ProgressData["completed"] {
  if (!isRecord(v)) return {};
  const out: ProgressData["completed"] = {};
  for (const [key, value] of Object.entries(v)) {
    const id = safeId(key);
    if (id === undefined || typeof value !== "string") continue;
    out[id] = value;
  }
  return out;
}

function sanitizeReview(v: unknown): ProgressData["review"] {
  if (!isRecord(v)) return {};
  const out: ProgressData["review"] = {};
  for (const [key, value] of Object.entries(v)) {
    const id = safeId(key);
    if (id === undefined || !isRecord(value)) continue;
    const { due, interval } = value;
    if (typeof due !== "string" || !DUE_DATE.test(due)) continue;
    if (!isFiniteNumber(interval) || interval < 0) continue;
    out[id] = { due, interval };
  }
  return out;
}

function sanitizeSession(v: unknown): DaySession | null {
  if (!isRecord(v)) return null;
  if (!isFiniteNumber(v.learned) || !isFiniteNumber(v.reviewed)) return null;
  const raw = v.exercises;
  if (raw !== undefined && !isRecord(raw)) return null;
  const exercises = {
    flashcard: 0,
    mcq: 0,
    listen: 0,
    cloze: 0,
    dictation: 0,
  } as Record<ExerciseKind, number>;
  if (isRecord(raw)) {
    for (const kind of EXERCISE_KINDS) {
      if (isFiniteNumber(raw[kind])) {
        exercises[kind] = Math.max(0, Math.round(raw[kind]));
      }
    }
  }
  return {
    learned: Math.max(0, Math.round(v.learned)),
    reviewed: Math.max(0, Math.round(v.reviewed)),
    exercises,
  };
}

function sanitizeSessions(v: unknown): ProgressData["sessions"] {
  if (!isRecord(v)) return {};
  const out: ProgressData["sessions"] = {};
  for (const [day, value] of Object.entries(v)) {
    const session = sanitizeSession(value);
    if (session) out[day] = session;
  }
  return out;
}

function sanitizeStats(
  v: unknown,
  completedCount: number,
): ProgressData["stats"] {
  if (!isRecord(v)) return { streak: 0, totalLearned: completedCount };
  return { streak: toCount(v.streak), totalLearned: toCount(v.totalLearned) };
}

export function parseProgressJson(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "File không phải JSON hợp lệ" };
  }
  if (!isRecord(parsed)) return { ok: false, error: INVALID };

  const settings = isRecord(parsed.settings) ? parsed.settings : {};
  const completed = sanitizeCompleted(parsed.completed);
  const review = sanitizeReview(parsed.review);
  const sessions = sanitizeSessions(parsed.sessions);
  const stats = sanitizeStats(parsed.stats, Object.keys(completed).length);

  return {
    ok: true,
    data: {
      settings: { dailyGoal: sanitizeDailyGoal(settings.dailyGoal) },
      completed,
      review,
      sessions,
      stats,
    },
  };
}

export function progressExport(data: ProgressData): {
  filename: string;
  content: string;
} {
  return {
    filename: `english-nxt-progress-${todayStr()}.json`,
    content: JSON.stringify(data, null, 2),
  };
}
