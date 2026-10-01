# english_nxt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web học từ vựng tiếng Anh (3011 từ A1–B2 trích từ PDF) kèm phiên âm IPA, luyện tập 5 chế độ, tiến độ lưu localStorage, deploy Vercel.

**Architecture:** Vite + React SPA tĩnh; dữ liệu trích xuất 1 lần từ PDF thành JSON commit vào repo (`data/index.json` + `data/words-{level}.json` + `data/examples.json`); logic thuần (lịch ôn, sinh bài tập, storage) tách `src/lib/*` test bằng Vitest; state tiến độ qua Zustand + localStorage; phát âm bằng Web Speech API.

**Tech Stack:** Vite 6, React 19, TypeScript strict, React Router 7, Tailwind CSS 4 (`@tailwindcss/vite`), Zustand 5, Vitest 3, Node ≥ 20 (scripts dùng `fetch`, `AbortSignal.timeout`).

## Global Constraints

- UI tiếng Việt, mobile-first (học chính trên điện thoại).
- Không backend, không tài khoản, không API key: build phải offline được (JSON commit sẵn trong repo).
- Dữ liệu cố định: tổng 3011 từ; A1=699, A2=1075, B1=817, B2=420; 128 section (32 topic × 4 level); đúng 150 khung mẫu câu; word id liên tục 1→3011.
- localStorage key: `english_nxt_v1`; `dailyGoal` mặc định 20; streak tính theo ngày có phiên học.
- Lịch ôn `[1, 3, 7, 14, 30]` ngày; quên → về 1; trễ > 7 ngày → bắt đầu lại từ 1.
- Practice: 10 câu/phiên; với `?word=`: 5 câu trộn (mỗi chế độ 1 lần) cho đúng từ đó.
- Phát âm: Web Speech API (`en-US`, rate 0.9); không hỗ trợ → ẩn nút 🔊 + banner gợi ý Chrome/Edge; câu bài nghe bỏ qua được.
- Không thêm comment code ngoài chỗ cần, không thêm tính năng ngoài spec `docs/superpowers/specs/2026-10-01-english-nxt-design.md`.
- Mỗi task kết thúc bằng commit; test chạy `npm test`.

---

### Task 1: Scaffold dự án

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `vercel.json`
- Create: `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/smoke.test.ts`

**Interfaces:**
- Produces: cấu trúc project chuẩn; `npm test`, `npm run dev`, `npm run build` chạy được; App render chuỗi `english_nxt`.

- [ ] **Step 1: Viết config files**

`package.json`:

```json
{
  "name": "english-nxt",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "extract": "node scripts/extract-pdf.mjs",
    "fetch-examples": "node scripts/fetch-examples.mjs"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.6.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^4.5.0",
    "tailwindcss": "^4.1.0",
    "typescript": "~5.8.0",
    "vite": "^6.3.0",
    "vitest": "^3.2.0"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src", "tests"]
}
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
```

`index.html`:

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>english_nxt — Học từ vựng IPA</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`.gitignore`:

```
node_modules/
dist/
.vercel/
*.log
```

`vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 2: Viết entry files**

`src/index.css`:

```css
@import "tailwindcss";
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

`src/App.tsx`:

```tsx
export default function App() {
  return <div className="p-8 text-xl font-bold">english_nxt</div>;
}
```

`src/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('harness', () => {
  it('vitest chạy được', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 3: Cài dependencies**

Run: `npm install`
Expected: exit 0, không lỗi peer dependency.

- [ ] **Step 4: Chạy test**

Run: `npm test`
Expected: PASS — 1 test (`vitest chạy được`).

- [ ] **Step 5: Chạy build**

Run: `npm run build`
Expected: exit 0, tạo `dist/index.html`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html .gitignore vercel.json src/
git commit -m "chore: scaffold vite react ts tailwind vitest"
```

---

### Task 2: Trích xuất PDF → data JSON + test validate

**Files:**
- Create: `src/types.ts`, `scripts/extract-pdf.mjs`, `tests/data.test.ts`
- Output (bởi script): `data/index.json`, `data/words-A1.json`, `data/words-A2.json`, `data/words-B1.json`, `data/words-B2.json`

**Interfaces:**
- Produces: types (`VocabIndex`, `Word`, `TopicSection`, `Level`, `Frame`, `LevelId`, `ExerciseKind`, `DaySession`, `ProgressData`, `ExampleSentence`, `ExamplesMap`) dùng bởi mọi task sau; `data/*.json` mà Task 3/4 đọc.

**Bối cảnh parse (đã verify trên PDF):** streams dùng `ASCII85Decode + FlateDecode`; font DejaVuSans subset có ToUnicode CMap (bfchar/bfrange); content stream đặt text bằng nested `q/Q` + `cm` translation + `Tm` — phải maintain CTM stack mới ra tọa độ tuyệt đối. Hàng từ: các run gộp theo y (dung sai 2.0), mỗi hàng 2 entry (cột trái x<295, cột phải); thứ tự trong entry theo x: `id` → `word` → `/ipa/` → `pos` → `nghĩa`. Header chủ đề: nhiều run **trùng tọa độ x,y**, 1 run khớp `/• \d+ từ$/` (VD `Gia đình và con người • 39 từ` + `Family & People`). Header cấp độ: `PHẦN N: CẤP ĐỘ X`. Khung mẫu: marker chứa `MẪU CÂU`, template chứa `___`, example bắt đầu `→`.

- [ ] **Step 1: Viết types + test validate (fail trước vì chưa có data)**

`src/types.ts`:

```ts
export type LevelId = 'A1' | 'A2' | 'B1' | 'B2';

export interface Level {
  id: LevelId;
  name: string;
  wordCount: number;
  firstId: number;
  lastId: number;
}

export interface Frame {
  template: string;
  example: string;
}

export interface TopicSection {
  id: string;
  level: LevelId;
  nameEn: string;
  nameVi: string;
  wordCount: number;
  wordIds: number[];
  frames: Frame[];
}

export interface Word {
  id: number;
  word: string;
  ipa: string;
  pos: string;
  meaningVi: string;
  level: LevelId;
  topicId: string;
}

export interface VocabIndex {
  totalWords: number;
  levels: Level[];
  topics: TopicSection[];
}

export interface ExampleSentence {
  en: string;
}

export type ExamplesMap = Record<string, ExampleSentence[]>;

export type ExerciseKind = 'flashcard' | 'mcq' | 'listen' | 'cloze' | 'dictation';

export interface DaySession {
  learned: number;
  reviewed: number;
  exercises: Record<ExerciseKind, number>;
}

export interface ProgressData {
  settings: { dailyGoal: number };
  completed: Record<number, string>;
  review: Record<number, { due: string; interval: number }>;
  sessions: Record<string, DaySession>;
  stats: { streak: number; totalLearned: number };
}
```

`tests/data.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { ExamplesMap, VocabIndex, Word } from '../src/types';

const read = <T,>(rel: string): T =>
  JSON.parse(readFileSync(new URL(`../data/${rel}`, import.meta.url), 'utf8'));

const index = read<VocabIndex>('index.json');
const WORDS: Word[] = (['A1', 'A2', 'B1', 'B2'] as const).flatMap((l) =>
  read<Word[]>(`words-${l}.json`),
);
const POS_SET = ['n.', 'v.', 'adj.', 'adv.', 'prep.', 'conj.', 'pron.', 'det.'];

describe('dữ liệu trích xuất từ PDF', () => {
  it('tổng 3011 từ, id liên tục 1..3011, không trùng', () => {
    expect(index.totalWords).toBe(3011);
    expect(WORDS.length).toBe(3011);
    const ids = WORDS.map((w) => w.id).sort((a, b) => a - b);
    expect(ids[0]).toBe(1);
    expect(ids[ids.length - 1]).toBe(3011);
    expect(new Set(ids).size).toBe(3011);
  });

  it('đếm đúng theo cấp độ và khoảng id', () => {
    const expected: Record<string, number> = { A1: 699, A2: 1075, B1: 817, B2: 420 };
    expect(index.levels.length).toBe(4);
    for (const lv of index.levels) {
      expect(lv.wordCount, lv.id).toBe(expected[lv.id]);
      const ws = WORDS.filter((w) => w.level === lv.id);
      expect(ws.length).toBe(expected[lv.id]);
      expect(lv.firstId).toBe(ws[0].id);
      expect(lv.lastId).toBe(ws[ws.length - 1].id);
    }
  });

  it('đủ 128 section, mỗi section đúng số từ header khai báo, tổng bằng 3011', () => {
    expect(index.topics.length).toBe(128);
    const ids = new Set<string>();
    for (const t of index.topics) {
      expect(ids.has(t.id), `duplicate id ${t.id}`).toBe(false);
      ids.add(t.id);
      expect(t.wordIds.length, t.id).toBe(t.wordCount);
    }
    const sum = index.topics.reduce((s, t) => s + t.wordIds.length, 0);
    expect(sum).toBe(3011);
    const names = new Set(index.topics.map((t) => t.nameEn));
    expect(names.size).toBe(32);
  });

  it('mỗi từ có IPA /…/, từ loại hợp lệ, nghĩa không rỗng', () => {
    for (const w of WORDS) {
      expect(
        w.ipa.startsWith('/') && w.ipa.endsWith('/') && w.ipa.length > 2,
        `id=${w.id} ipa=${w.ipa}`,
      ).toBe(true);
      expect(POS_SET.includes(w.pos), `id=${w.id} pos=${w.pos}`).toBe(true);
      expect(w.word.trim().length, `id=${w.id} word`).toBeGreaterThan(0);
      expect(w.meaningVi.trim().length, `id=${w.id} meaning`).toBeGreaterThan(0);
      expect(w.topicId.length, `id=${w.id}`).toBeGreaterThan(0);
    }
  });

  it('wordId của topic trỏ tới từ đúng level/topic', () => {
    const byId = new Map(WORDS.map((w) => [w.id, w]));
    for (const t of index.topics) {
      for (const id of t.wordIds) {
        const w = byId.get(id);
        expect(w, `missing word ${id} in ${t.id}`).toBeDefined();
        expect(w!.topicId).toBe(t.id);
        expect(w!.level).toBe(t.level);
      }
    }
  });

  it('150 khung mẫu câu, mỗi topic có đúng 1 section chứa frames', () => {
    const total = index.topics.reduce((s, t) => s + t.frames.length, 0);
    expect(total).toBe(150);
    const withFrames = index.topics.filter((t) => t.frames.length > 0);
    expect(withFrames.length).toBe(32);
    const byName = new Map<string, number>();
    for (const t of withFrames) byName.set(t.nameEn, (byName.get(t.nameEn) ?? 0) + 1);
    expect(byName.size).toBe(32);
    for (const [, c] of byName) expect(c).toBe(1);
    for (const t of withFrames) {
      for (const f of t.frames) {
        expect(f.template.includes('___'), f.template).toBe(true);
        expect(f.example.length).toBeGreaterThan(0);
      }
    }
  });

  it('examples.json hợp lệ (keys là id từ có thật)', () => {
    const examples = read<ExamplesMap>('examples.json');
    const idSet = new Set(WORDS.map((w) => w.id));
    for (const [k, v] of Object.entries(examples)) {
      expect(/^\d+$/.test(k), k).toBe(true);
      expect(idSet.has(Number(k)), `unknown id ${k}`).toBe(true);
      expect(v.length).toBeGreaterThan(0);
      for (const ex of v) expect(ex.en.trim().length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Chạy test xác nhận fail**

Run: `npm test`
Expected: FAIL — `ENOENT: no such file or directory ... data/index.json`.

- [ ] **Step 3: Viết `scripts/extract-pdf.mjs`**

Script chỉ dùng `node:fs`, `node:zlib` (không thư viện ngoài). Toàn bộ code:

```js
#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PDF_PATH = path.join(ROOT, '3000_tu_tieng_anh_co_phien_am.pdf');
const OUT_DIR = path.join(ROOT, 'data');

const POS_SET = new Set(['n.', 'v.', 'adj.', 'adv.', 'prep.', 'conj.', 'pron.', 'det.']);
const COL_SPLIT = 295;
const LEVEL_META = { A1: 'Sơ cấp', A2: 'Tiền trung cấp', B1: 'Trung cấp', B2: 'Trung cao cấp' };
const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2'];
const EXPECTED_COUNTS = { A1: 699, A2: 1075, B1: 817, B2: 420 };
const warnings = [];

function decodeAscii85(buf) {
  let s = buf.toString('latin1');
  if (s.startsWith('<~')) s = s.slice(2);
  const end = s.indexOf('~>');
  if (end !== -1) s = s.slice(0, end);
  const out = [];
  let tuple = [];
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (c === 122 && tuple.length === 0) {
      out.push(0, 0, 0, 0);
      continue;
    }
    if (c < 33 || c > 117) continue;
    tuple.push(c - 33);
    if (tuple.length === 5) {
      let n = 0;
      for (const v of tuple) n = n * 85 + v;
      out.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
      tuple = [];
    }
  }
  if (tuple.length > 0) {
    const keep = tuple.length - 1;
    while (tuple.length < 5) tuple.push(84);
    let n = 0;
    for (const v of tuple) n = n * 85 + v;
    const bytes = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
    out.push(...bytes.slice(0, keep));
  }
  return Buffer.from(out);
}

function decodeStream(buf) {
  try {
    return inflateSync(decodeAscii85(buf));
  } catch {}
  try {
    return inflateSync(buf);
  } catch {
    return null;
  }
}

const pdfText = readFileSync(PDF_PATH).toString('latin1');
const objs = new Map();
for (const m of pdfText.matchAll(/(\d+) 0 obj\n([\s\S]*?)\nendobj/g)) {
  objs.set(Number(m[1]), m[2]);
}

function objStream(num) {
  const body = objs.get(num);
  if (!body) return null;
  const sm = body.match(/stream\r?\n/);
  if (!sm) return null;
  const start = sm.index + sm[0].length;
  const end = body.lastIndexOf('endstream');
  if (end <= start) return null;
  return decodeStream(Buffer.from(body.slice(start, end), 'latin1'));
}

function hexToUni(hex) {
  let out = '';
  for (let i = 0; i + 4 <= hex.length; i += 4) {
    out += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
  }
  return out;
}

function buildCmaps() {
  const cmaps = new Map();
  for (const body of objs.values()) {
    if (!body.includes('/BaseFont')) continue;
    const bf = body.match(/\/BaseFont \/([A-Za-z0-9+\-,]+)/);
    const tu = body.match(/\/ToUnicode (\d+) 0 R/);
    if (!bf || !tu) continue;
    const cm = objStream(Number(tu[1]));
    if (!cm) continue;
    const text = cm.toString('latin1');
    const map = {};
    for (const blk of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
      for (const p of blk[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
        map[parseInt(p[1], 16)] = hexToUni(p[2]);
      }
    }
    for (const blk of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
      for (const r of blk[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
        const lo = parseInt(r[1], 16);
        const hi = parseInt(r[2], 16);
        const dst = parseInt(r[3], 16);
        for (let c = lo; c <= hi; c++) map[c] = String.fromCharCode(dst + c - lo);
      }
    }
    cmaps.set(bf[1], map);
  }
  return cmaps;
}

const cmaps = buildCmaps();
const helveticaMap = Object.fromEntries(
  Array.from({ length: 256 }, (_, i) => [i, String.fromCharCode(i)]),
);

const fontResPairs = [];
for (const body of objs.values()) {
  const pairs = [...body.matchAll(/\/(F\d[+\w]*) (\d+) 0 R/g)];
  if (pairs.some((p) => p[1] === 'F1') && pairs.some((p) => p[1].startsWith('F2'))) {
    fontResPairs.push(...pairs);
    break;
  }
}
const resBf = new Map();
for (const [, name, num] of fontResPairs) {
  const body = objs.get(Number(num)) ?? '';
  const bf = body.match(/\/BaseFont \/([A-Za-z0-9+\-,]+)/);
  resBf.set(name, bf ? bf[1] : 'Helvetica');
}

function decodePdfString(s) {
  const bytes = [];
  let i = 0;
  while (i < s.length) {
    const c = s.charCodeAt(i);
    if (c === 92 && i + 1 < s.length) {
      const n = s.charCodeAt(i + 1);
      if (n === 110) bytes.push(10);
      else if (n === 114) bytes.push(13);
      else if (n === 116) bytes.push(9);
      else if (n === 98) bytes.push(8);
      else if (n === 102) bytes.push(12);
      else if (n === 40 || n === 41 || n === 92) bytes.push(n);
      else if (n >= 48 && n <= 55) {
        let oct = '';
        let j = i + 1;
        while (j < s.length && oct.length < 3 && s.charCodeAt(j) >= 48 && s.charCodeAt(j) <= 55) {
          oct += s[j];
          j++;
        }
        bytes.push(parseInt(oct, 8));
        i = j;
        continue;
      } else bytes.push(n);
      i += 2;
    } else {
      bytes.push(c);
      i++;
    }
  }
  return bytes;
}

const NUM = '-?(?:\\d+\\.?\\d*|\\.\\d+)';
const tokenRe = new RegExp(
  `\\s*(?:(?<q>q|Q)` +
    `|(?<cm>${NUM}(?:\\s+${NUM}){5}\\s+cm)` +
    `|\\/(?<f>F\\d[+\\w]*)\\s+(?:${NUM})\\s+Tf` +
    `|(?<tl>${NUM})\\s+TL` +
    `|(?<tj>\\((?:[^()\\\\]|\\\\.)*\\))\\s*Tj` +
    `|(?<arr>\\[(?:[^\\]]*)\\])\\s*TJ` +
    `|(?<td>${NUM}\\s+${NUM})\\s+T[dD]` +
    `|(?<tm>${NUM}\\s+${NUM}\\s+${NUM}\\s+${NUM}\\s+${NUM}\\s+${NUM})\\s+Tm` +
    `|T\\*|BT|ET)`,
  'g',
);

function matMul(A, B) {
  const [a, b, c, d, e, f] = A;
  const [a2, b2, c2, d2, e2, f2] = B;
  return [
    a * a2 + c * b2,
    b * a2 + d * b2,
    a * c2 + c * d2,
    b * c2 + d * d2,
    a * e2 + c * f2 + e,
    b * e2 + d * f2 + f,
  ];
}

function pageRuns(pageNum) {
  const body = objs.get(pageNum);
  const cnum = Number(body.match(/\/Contents (\d+) 0 R/)[1]);
  const content = objStream(cnum);
  if (!content) return [];
  const src = content.toString('latin1');
  const runs = [];
  const ctmStack = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  let tm = [1, 0, 0, 1, 0, 0];
  let tl = 12;
  let font = 'F1';
  tokenRe.lastIndex = 0;
  let m;
  while ((m = tokenRe.exec(src)) !== null) {
    if (m.index === tokenRe.lastIndex) {
      tokenRe.lastIndex++;
      continue;
    }
    const g = m.groups;
    const raw = m[0].trim();
    if (g.q === 'q') ctmStack.push(ctm.slice());
    else if (g.q === 'Q') {
      if (ctmStack.length) ctm = ctmStack.pop();
    } else if (g.cm) {
      const nums = (g.cm.match(/-?[\d.]+/g) || []).map(Number);
      ctm = matMul(ctm, nums.slice(-6));
    } else if (g.f) font = g.f;
    else if (g.tl) tl = Number(g.tl);
    else if (g.td) {
      const nums = g.td.match(/-?[\d.]+/g).map(Number);
      tm = matMul(tm, [1, 0, 0, 1, nums[0], nums[1]]);
    } else if (g.tm) {
      tm = g.tm.match(/-?[\d.]+/g).map(Number).slice(0, 6);
    } else if (raw === 'BT') tm = [1, 0, 0, 1, 0, 0];
    else if (raw === 'T*') tm = matMul(tm, [1, 0, 0, 1, 0, -tl]);
    else if (g.tj || g.arr) {
      const parts = [];
      if (g.tj) parts.push(decodePdfString(g.tj.slice(1, -1)));
      else
        for (const s of g.arr.matchAll(/\((?:[^()\\]|\\.)*\)/g)) {
          parts.push(decodePdfString(s[0].slice(1, -1)));
        }
      const bf = resBf.get(font) ?? 'Helvetica';
      const map = cmaps.get(bf) ?? helveticaMap;
      let text = '';
      for (const p of parts) for (const b of p) text += map[b] ?? '';
      if (text.trim()) {
        const M = matMul(ctm, tm);
        runs.push({ x: Math.round(M[4] * 100) / 100, y: Math.round(M[5] * 100) / 100, text });
      }
    }
  }
  return runs;
}

function clusterRows(runs) {
  const sorted = [...runs].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows = [];
  for (const r of sorted) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(last.y - r.y) < 2) last.runs.push(r);
    else rows.push({ y: r.y, runs: [r] });
  }
  for (const row of rows) row.runs.sort((a, b) => a.x - b.x);
  return rows;
}

function findHeader(row) {
  const byKey = new Map();
  for (const r of row.runs) {
    const k = `${r.x},${r.y}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(r);
  }
  for (const group of byKey.values()) {
    if (group.length < 2) continue;
    const vi = group.find((r) => /•\s*\d+\s*từ\s*$/.test(r.text));
    if (!vi) continue;
    const cnt = Number(vi.text.match(/(\d+)\s*từ\s*$/)[1]);
    const nameVi = vi.text.replace(/\s*•\s*\d+\s*từ\s*$/, '').trim();
    const others = group.filter((r) => r !== vi && r.text.trim()).map((r) => r.text.trim());
    if (others.length === 0) continue;
    return { nameEn: others.join(' '), nameVi, wordCount: cnt };
  }
  return null;
}

function parseEntries(row) {
  const cols = [[], []];
  for (const r of row.runs) cols[r.x < COL_SPLIT ? 0 : 1].push(r);
  const entries = [];
  for (const col of cols) {
    let i = 0;
    while (i < col.length) {
      if (!/^\d+$/.test(col[i].text)) {
        i++;
        continue;
      }
      const id = Number(col[i].text);
      let ipaIdx = -1;
      for (let j = i + 1; j <= Math.min(i + 6, col.length - 1); j++) {
        const t = col[j].text;
        if (t.startsWith('/') && t.endsWith('/') && t.length > 2) {
          ipaIdx = j;
          break;
        }
      }
      if (ipaIdx === -1) {
        i++;
        continue;
      }
      let posIdx = -1;
      for (let j = ipaIdx + 1; j <= Math.min(ipaIdx + 3, col.length - 1); j++) {
        if (POS_SET.has(col[j].text)) {
          posIdx = j;
          break;
        }
      }
      if (posIdx === -1) {
        warnings.push(`thiếu từ loại: id=${id}`);
        i = ipaIdx + 1;
        continue;
      }
      let next = col.length;
      for (let j = posIdx + 1; j < col.length; j++) {
        if (/^\d+$/.test(col[j].text)) {
          const peek = col.slice(j, j + 5);
          if (peek.some((r) => r.text.startsWith('/') && r.text.endsWith('/'))) {
            next = j;
            break;
          }
        }
      }
      const word = col
        .slice(i + 1, ipaIdx)
        .map((r) => r.text)
        .join('');
      const meaning = col
        .slice(posIdx + 1, next)
        .map((r) => r.text)
        .join('');
      if (!word || !meaning) warnings.push(`thiếu từ/nghĩa: id=${id}`);
      else entries.push({ id, word, ipa: col[ipaIdx].text, pos: col[posIdx].text, meaningVi: meaning });
      i = next;
    }
  }
  return entries;
}

function slugify(nameEn) {
  return nameEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const kidsMatch = [...pdfText.matchAll(/\/Kids \[([^\]]+)\]/g)].pop();
const pages = [...kidsMatch[1].matchAll(/(\d+) 0 R/g)].map((x) => Number(x[1]));

let currentLevel = null;
let currentSection = null;
let framesActive = false;
let lastTemplate = null;
const sections = [];

for (const pageNum of pages) {
  const rows = clusterRows(pageRuns(pageNum));
  for (const row of rows) {
    const texts = row.runs.map((r) => r.text);
    const ph = texts.find((t) => /^PHẦN \d+: CẤP ĐỘ (A1|A2|B1|B2)$/.test(t.trim()));
    if (ph) {
      currentLevel = ph.trim().match(/(A1|A2|B1|B2)$/)[1];
      framesActive = false;
      lastTemplate = null;
      continue;
    }
    const header = findHeader(row);
    if (header && currentLevel) {
      const id = `${currentLevel.toLowerCase()}-${slugify(header.nameEn)}`;
      if (sections.some((s) => s.id === id)) {
        warnings.push(`section trùng id: ${id}`);
        continue;
      }
      currentSection = {
        id,
        level: currentLevel,
        nameEn: header.nameEn,
        nameVi: header.nameVi,
        wordCount: header.wordCount,
        wordIds: [],
        frames: [],
        parsed: [],
      };
      sections.push(currentSection);
      framesActive = false;
      lastTemplate = null;
      continue;
    }
    if (texts.some((t) => t.includes('MẪU CÂU'))) {
      framesActive = true;
      lastTemplate = null;
      continue;
    }
    const entries = parseEntries(row);
    if (entries.length > 0) {
      framesActive = false;
      lastTemplate = null;
      if (!currentSection) {
        warnings.push(`hàng từ ngoài section: ${texts.join(' | ').slice(0, 80)}`);
        continue;
      }
      for (const e of entries) currentSection.parsed.push(e);
      continue;
    }
    if (framesActive && currentSection) {
      const joined = texts.join(' ').trim();
      if (joined.startsWith('→')) {
        if (lastTemplate) {
          currentSection.frames.push({ template: lastTemplate, example: joined.replace(/^→\s*/, '') });
          lastTemplate = null;
        }
      } else if (joined.includes('___')) {
        lastTemplate = joined;
      }
    }
  }
}

for (const s of sections) {
  s.parsed.sort((a, b) => a.id - b.id);
  s.wordIds = s.parsed.map((e) => e.id);
  if (s.wordIds.length !== s.wordCount) {
    warnings.push(`${s.id}: header=${s.wordCount} thực tế=${s.wordIds.length}`);
  }
}

const words = [];
for (const s of sections) {
  for (const e of s.parsed) {
    words.push({
      id: e.id,
      word: e.word,
      ipa: e.ipa,
      pos: e.pos,
      meaningVi: e.meaningVi,
      level: s.level,
      topicId: s.id,
    });
  }
}
words.sort((a, b) => a.id - b.id);

for (let i = 0; i < words.length; i++) {
  if (words[i].id !== i + 1) {
    warnings.push(`id không liên tục: vị trí ${i} = ${words[i].id}`);
    break;
  }
}

const levels = LEVEL_ORDER.map((lv) => {
  const ws = words.filter((w) => w.level === lv);
  if (ws.length !== EXPECTED_COUNTS[lv]) {
    warnings.push(`${lv}: đếm ${ws.length}, mong đợi ${EXPECTED_COUNTS[lv]}`);
  }
  return {
    id: lv,
    name: LEVEL_META[lv],
    wordCount: ws.length,
    firstId: ws.length ? ws[0].id : 0,
    lastId: ws.length ? ws[ws.length - 1].id : 0,
  };
});

const frameTotal = sections.reduce((s, t) => s + t.frames.length, 0);
if (frameTotal !== 150) warnings.push(`khung mẫu câu = ${frameTotal}, mong đợi 150`);
if (sections.length !== 128) warnings.push(`section = ${sections.length}, mong đợi 128`);
if (words.length !== 3011) warnings.push(`tổng từ = ${words.length}, mong đợi 3011`);

mkdirSync(OUT_DIR, { recursive: true });
const index = {
  totalWords: words.length,
  levels,
  topics: sections.map(({ parsed, ...t }) => t),
};
writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 1));
for (const lv of LEVEL_ORDER) {
  const ws = words.filter((w) => w.level === lv);
  writeFileSync(path.join(OUT_DIR, `words-${lv}.json`), JSON.stringify(ws, null, 1));
}

console.log(`sections=${sections.length} words=${words.length} frames=${frameTotal}`);
if (warnings.length > 0) {
  console.error(`\n${warnings.length} cảnh báo:`);
  for (const w of warnings.slice(0, 40)) console.error(' -', w);
  process.exit(1);
}
console.log('OK');
```

- [ ] **Step 4: Chạy script**

Run: `npm run extract`
Expected: in `sections=128 words=3011 frames=150` + `OK`, exit 0.

Nếu có cảnh báo: đọc thông báo từng dòng, sửa parser (thường là `COL_SPLIT`, regex header, nhánh parse entry), chạy lại đến khi `OK`. Không commit khi test fail.

- [ ] **Step 5: Tạo `data/examples.json` tạm (Task 3 ghi đè sau)**

Run: `node -e "import('node:fs').then(fs => { fs.mkdirSync('data', {recursive:true}); fs.writeFileSync('data/examples.json', '{}'); })"`

- [ ] **Step 6: Chạy test**

Run: `npm test`
Expected: PASS — 7 tests trong `tests/data.test.ts` + smoke.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts scripts/extract-pdf.mjs tests/data.test.ts data/
git commit -m "feat: trích xuất pdf thành data json + validate 3011 từ"
```

---

### Task 3: Lấy ví dụ câu (Free Dictionary API) → `data/examples.json`

**Files:**
- Create: `scripts/fetch-examples.mjs`

**Interfaces:**
- Produces: `data/examples.json` dạng `{ [wordId]: [{ "en": "..." }] }` (đúng `ExamplesMap`), tối đa 2 ví dụ/từ.

**Bối cảnh:** Free Dictionary API `https://api.dictionaryapi.dev/api/v2/entries/en/{word}` — không cần key; mỗi entry có `meanings[].definitions[].example`. Chỉ 1 phần từ có ví dụ; từ không có → bỏ qua. Script cache theo từ (`data/.examples-cache.json`, gitignore) để chạy lại không gọi lại API.

- [ ] **Step 1: Viết script**

`scripts/fetch-examples.mjs`:

```js
#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const CACHE = path.join(DATA, '.examples-cache.json');

const words = JSON.parse(
  readFileSync(path.join(DATA, 'words-A1.json'), 'utf8'),
)
  .concat(
    ...['A2', 'B1', 'B2'].map((l) =>
      JSON.parse(readFileSync(path.join(DATA, `words-${l}.json`), 'utf8')),
    ),
  );

const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
const out = {};
let fetched = 0;

function cleanExample(s) {
  return s
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();
}

for (const w of words) {
  const key = w.word;
  if (!(key in cache)) {
    let res;
    try {
      res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`,
        { signal: AbortSignal.timeout(8000) },
      );
    } catch {
      res = null;
    }
    if (res && res.ok) {
      try {
        const json = await res.json();
        const exs = [];
        for (const meaning of json[0]?.meanings ?? []) {
          for (const def of meaning.definitions ?? []) {
            if (def.example && def.example.trim().length > 15) {
              exs.push(cleanExample(def.example));
            }
            if (exs.length >= 4) break;
          }
          if (exs.length >= 4) break;
        }
        cache[key] = [...new Set(exs)].slice(0, 2);
      } catch {
        cache[key] = [];
      }
    } else {
      cache[key] = res && res.status === 404 ? [] : 'retry';
    }
    fetched++;
    if (fetched % 25 === 0) {
      writeFileSync(CACHE, JSON.stringify(cache));
      console.log(`đã xử lý ${fetched}/${words.length} từ (cache: ${cache[key]?.length ?? 0} ví dụ cho "${key}")`);
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  const exs = cache[key];
  if (Array.isArray(exs) && exs.length > 0) {
    out[String(w.id)] = exs.slice(0, 2).map((en) => ({ en }));
  }
}

writeFileSync(CACHE, JSON.stringify(cache));
writeFileSync(path.join(DATA, 'examples.json'), JSON.stringify(out, null, 1));
const retry = Object.values(cache).filter((v) => v === 'retry').length;
const covered = Object.keys(out).length;
console.log(`xong: ${covered}/${words.length} từ có ví dụ, ${retry} từ lỗi (chạy lại để retry)`);
```

Thêm vào `.gitignore`: `data/.examples-cache.json`.

- [ ] **Step 2: Chạy script (cần mạng)**

Run: `npm run fetch-examples`
Expected: log tiến độ, kết thúc in số từ có ví dụ. Chạy lại nếu có lỗi retry (cache giữ progress).

- [ ] **Step 3: Chạy test**

Run: `npm test`
Expected: PASS (test `examples.json hợp lệ` — từ chưa có thì file `{}` cũng pass; sau khi chạy có dữ liệu vẫn pass).

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch-examples.mjs data/examples.json .gitignore
git commit -m "feat: fetch example sentences từ free dictionary api"
```

---

### Task 4: `src/lib/vocab.ts` — truy vấn dữ liệu

**Files:**
- Create: `src/lib/vocab.ts`, `src/lib/vocab.test.ts`

**Interfaces:**
- Produces: `getIndex()`, `getWordsByLevel(level)`, `getWordsByTopic(topicId)`, `getWord(id)`, `getFrames(topicId)`, `getExamples(wordId)`, `searchWords(query)` — chỉ đọc JSON, không state.

- [ ] **Step 1: Viết test trước**

`src/lib/vocab.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  getExamples,
  getFrames,
  getIndex,
  getWord,
  getWordsByLevel,
  getWordsByTopic,
  searchWords,
} from './vocab';

describe('vocab', () => {
  it('getIndex trả 4 level và 128 topic', () => {
    const idx = getIndex();
    expect(idx.levels.map((l) => l.id)).toEqual(['A1', 'A2', 'B1', 'B2']);
    expect(idx.topics.length).toBe(128);
  });

  it('getWord theo id có level/topic', () => {
    const w = getWord(1);
    expect(w).toBeDefined();
    expect(w!.level).toBe('A1');
    expect(w!.topicId.length).toBeGreaterThan(0);
    expect(getWord(0)).toBeUndefined();
    expect(getWord(99999)).toBeUndefined();
  });

  it('getWordsByLevel đúng số lượng', () => {
    expect(getWordsByLevel('A1').length).toBe(699);
    expect(getWordsByLevel('B2').length).toBe(420);
  });

  it('getWordsByTopic trả đúng wordIds', () => {
    const idx = getIndex();
    const t = idx.topics[0];
    const ws = getWordsByTopic(t.id);
    expect(ws.map((w) => w.id)).toEqual(t.wordIds);
  });

  it('getFrames fallback sang section cùng topic khác level khi section này không có frame', () => {
    const idx = getIndex();
    const withFrames = idx.topics.find((t) => t.frames.length > 0)!;
    const without = idx.topics.find(
      (t) => t.nameEn === withFrames.nameEn && t.frames.length === 0,
    )!;
    expect(getFrames(without.id).length).toBeGreaterThan(0);
    expect(getFrames(withFrames.id)).toEqual(withFrames.frames);
  });

  it('getExamples theo wordId', () => {
    const idx = getExamples('1');
    expect(Array.isArray(idx)).toBe(true);
  });

  it('searchWords không phân biệt hoa/thường, có nghĩa', () => {
    const res = searchWords('fAmIly');
    expect(res.length).toBeGreaterThan(0);
    expect(res.some((w) => w.word.toLowerCase().includes('fam'))).toBe(true);
    expect(searchWords('không tồn tại xyz 123').length).toBe(0);
  });
});
```

- [ ] **Step 2: Chạy test xác nhận fail**

Run: `npx vitest run src/lib/vocab.test.ts`
Expected: FAIL — `Cannot find module './vocab'`.

- [ ] **Step 3: Viết `src/lib/vocab.ts`**

```ts
import type { ExamplesMap, Frame, VocabIndex, Word } from '../types';
import indexJson from '../../data/index.json';
import wordsA1 from '../../data/words-A1.json';
import wordsA2 from '../../data/words-A2.json';
import wordsB1 from '../../data/words-B1.json';
import wordsB2 from '../../data/words-B2.json';
import examplesJson from '../../data/examples.json';

const ALL_WORDS = [...wordsA1, ...wordsA2, ...wordsB1, ...wordsB2] as Word[];
const WORD_MAP = new Map<number, Word>(ALL_WORDS.map((w) => [w.id, w]));
const INDEX = indexJson as VocabIndex;
const EXAMPLES = examplesJson as ExamplesMap;
const WORDS_BY_TOPIC = new Map<string, Word[]>();
for (const t of INDEX.topics) {
  WORDS_BY_TOPIC.set(
    t.id,
    t.wordIds.map((id) => WORD_MAP.get(id)!).filter(Boolean),
  );
}

export function getIndex(): VocabIndex {
  return INDEX;
}

export function getWord(id: number): Word | undefined {
  return WORD_MAP.get(id);
}

export function getWordsByLevel(level: Word['level']): Word[] {
  return ALL_WORDS.filter((w) => w.level === level);
}

export function getWordsByTopic(topicId: string): Word[] {
  return WORDS_BY_TOPIC.get(topicId) ?? [];
}

export function getFrames(topicId: string): Frame[] {
  const section = INDEX.topics.find((t) => t.id === topicId);
  if (!section) return [];
  if (section.frames.length > 0) return section.frames;
  const sibling = INDEX.topics.find(
    (t) => t.nameEn === section.nameEn && t.frames.length > 0,
  );
  return sibling?.frames ?? [];
}

export function getExamples(wordId: number): { en: string }[] {
  return EXAMPLES[String(wordId)] ?? [];
}

export function searchWords(query: string): Word[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ALL_WORDS.filter(
    (w) => w.word.toLowerCase().includes(q) || w.meaningVi.toLowerCase().includes(q),
  );
}
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/lib/vocab.test.ts`
Expected: PASS — 7 tests. (Có thể cần `resolveJsonModule` — đã bật trong tsconfig.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/vocab.ts src/lib/vocab.test.ts
git commit -m "feat: vocab query helpers"
```

---

### Task 5: `src/lib/storage.ts` — đọc/ghi localStorage

**Files:**
- Create: `src/lib/storage.ts`, `src/lib/storage.test.ts`

**Interfaces:**
- Produces: `STORAGE_KEY`, `loadProgress(): ProgressData` (fallback default khi lỗi/rỗng/sai schema), `saveProgress(data)` (try/catch nuốt lỗi quota).

- [ ] **Step 1: Viết test trước**

`src/lib/storage.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, loadProgress, saveProgress } from './storage';
import type { ProgressData } from '../types';

const mem = new Map<string, string>();

beforeEach(() => {
  mem.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  });
});

describe('storage', () => {
  it('loadProgress trả default khi trống', () => {
    const p = loadProgress();
    expect(p.settings.dailyGoal).toBe(20);
    expect(p.completed).toEqual({});
    expect(p.stats.streak).toBe(0);
  });

  it('save → load round-trip', () => {
    const p = loadProgress();
    p.completed[1] = '2026-10-01';
    p.stats.totalLearned = 1;
    saveProgress(p);
    expect(mem.has(STORAGE_KEY)).toBe(true);
    const re = loadProgress();
    expect(re.completed[1]).toBe('2026-10-01');
    expect(re.stats.totalLearned).toBe(1);
  });

  it('fallback default khi JSON hỏng', () => {
    mem.set(STORAGE_KEY, '{broken');
    expect(loadProgress().settings.dailyGoal).toBe(20);
  });

  it('merge default khi thiếu field (migrate nhẹ)', () => {
    mem.set(STORAGE_KEY, JSON.stringify({ settings: { dailyGoal: 10 } }));
    const p = loadProgress();
    expect(p.settings.dailyGoal).toBe(10);
    expect(p.completed).toEqual({});
    expect(p.stats.streak).toBe(0);
  });

  it('saveProgress không ném khi localStorage lỗi', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {},
    });
    expect(() => saveProgress(loadProgress())).not.toThrow();
  });
});
```

- [ ] **Step 2: Chạy test xác nhận fail**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: FAIL — Cannot find module './storage'.

- [ ] **Step 3: Viết `src/lib/storage.ts`**

```ts
import type { ProgressData } from '../types';

export const STORAGE_KEY = 'english_nxt_v1';

export function defaultProgress(): ProgressData {
  return {
    settings: { dailyGoal: 20 },
    completed: {},
    review: {},
    sessions: {},
    stats: { streak: 0, totalLearned: 0 },
  };
}

export function loadProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as Partial<ProgressData>;
    const d = defaultProgress();
    return {
      settings: { ...d.settings, ...parsed.settings },
      completed: parsed.completed ?? {},
      review: parsed.review ?? {},
      sessions: parsed.sessions ?? {},
      stats: { ...d.stats, ...parsed.stats },
    };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(data: ProgressData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // quota exceeded — tiến độ vẫn hoạt động trong phiên hiện tại
  }
}
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: localStorage progress persistence"
```

---

### Task 6: `src/lib/review.ts` — lịch ôn tập + thống kê streak

**Files:**
- Create: `src/lib/review.ts`, `src/lib/review.test.ts`

**Interfaces:**
- Produces: `INTERVALS`, `nextInterval(current, ok)`, `isDue(entry, today)`, `restartIfStale(entry, today)` (trễ > 7 ngày → interval 1), `daysBetween(a, b)`, `todayStr()`, `computeStreak(sessions, today)`, `dailyStats(progress, today)` (đã học hôm nay / mục tiêu / cần review).

**Quy ước:** `entry = { due: 'YYYY-MM-DD', interval }`. `interval` là vị trí trong INTERVALS (0 = chưa từng học, 1 = 1 ngày, 2 = 3 ngày...). `ok=true` → lên bậc kế (max 30 ngày); `ok=false` → về 1 ngày.

- [ ] **Step 1: Viết test trước**

`src/lib/review.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  INTERVALS,
  computeStreak,
  dailyStats,
  isDue,
  nextInterval,
  restartIfStale,
  todayStr,
} from './review';
import type { ProgressData } from '../types';
import { defaultProgress } from './storage';

describe('nextInterval', () => {
  it('quên → về interval 1 (1 ngày)', () => {
    expect(nextInterval(5, false)).toBe(1);
    expect(nextInterval(1, false)).toBe(1);
  });

  it('đúng → lên bậc kế, max = bậc cuối', () => {
    expect(nextInterval(0, true)).toBe(1);
    expect(nextInterval(1, true)).toBe(2);
    expect(nextInterval(INTERVALS.length - 1, true)).toBe(INTERVALS.length - 1);
  });

  it('các bậc đúng bằng bảng', () => {
    expect(INTERVALS).toEqual([1, 3, 7, 14, 30]);
    expect(INTERVALS[1]).toBe(3);
  });
});

describe('restartIfStale', () => {
  it('trễ > 7 ngày → restart interval 1', () => {
    expect(restartIfStale({ due: '2026-09-01', interval: 4 }, '2026-10-01')).toBe(1);
  });
  it('trễ ≤ 7 ngày → giữ interval', () => {
    expect(restartIfStale({ due: '2026-09-27', interval: 4 }, '2026-10-01')).toBe(4);
  });
  it('chưa tới hạn → giữ interval', () => {
    expect(restartIfStale({ due: '2026-10-05', interval: 2 }, '2026-10-01')).toBe(2);
  });
});

describe('isDue', () => {
  it('due ≤ hôm nay là đến hạn', () => {
    expect(isDue({ due: '2026-10-01', interval: 1 }, '2026-10-01')).toBe(true);
    expect(isDue({ due: '2026-09-30', interval: 1 }, '2026-10-01')).toBe(true);
    expect(isDue({ due: '2026-10-02', interval: 1 }, '2026-10-01')).toBe(false);
  });
});

describe('computeStreak', () => {
  it('chuỗi ngày liên tiếp, đứt thì reset', () => {
    const sessions = { '2026-09-29': {}, '2026-09-30': {}, '2026-10-01': {} };
    expect(computeStreak(sessions, '2026-10-01')).toBe(3);
    expect(computeStreak(sessions, '2026-10-02')).toBe(0);
    expect(computeStreak({ '2026-10-01': {} }, '2026-10-01')).toBe(1);
    expect(computeStreak({}, '2026-10-01')).toBe(0);
  });
});

describe('dailyStats', () => {
  const base: ProgressData = defaultProgress();

  it('mặc định: 0 learned, goal 20, cần review = số từ đến hạn', () => {
    const p: ProgressData = {
      ...base,
      review: {
        1: { due: '2026-10-01', interval: 1 },
        2: { due: '2026-10-01', interval: 2 },
        3: { due: '2026-10-05', interval: 1 },
      },
    };
    const s = dailyStats(p, '2026-10-01');
    expect(s.learnedToday).toBe(0);
    expect(s.goal).toBe(20);
    expect(s.dueCount).toBe(2);
    expect(s.remaining).toBe(20);
  });

  it('đã học hôm nay + đếm review hôm nay', () => {
    const p: ProgressData = {
      ...base,
      sessions: {
        '2026-10-01': { learned: 5, reviewed: 2, exercises: { flashcard: 0, mcq: 0, listen: 0, cloze: 0, dictation: 0 } },
      },
      review: { 1: { due: '2026-09-25', interval: 3 } },
    };
    const s = dailyStats(p, '2026-10-01');
    expect(s.learnedToday).toBe(5);
    expect(s.reviewedToday).toBe(2);
    expect(s.dueCount).toBe(0);
    expect(s.remaining).toBe(15);
  });
});
```

- [ ] **Step 2: Chạy test xác nhận fail**

Run: `npx vitest run src/lib/review.test.ts`
Expected: FAIL — Cannot find module './review'.

- [ ] **Step 3: Viết `src/lib/review.ts`**

```ts
import type { DaySession, ProgressData } from '../types';

export const INTERVALS = [1, 3, 7, 14, 30];
export const STALE_DAYS = 7;

export interface ReviewEntry {
  due: string;
  interval: number;
}

export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function nextInterval(current: number, ok: boolean): number {
  if (!ok) return 1;
  if (current <= 0) return 1;
  return Math.min(current + 1, INTERVALS.length);
}

export function isDue(entry: ReviewEntry, today: string): boolean {
  return daysBetween(entry.due, today) >= 0;
}

export function restartIfStale(entry: ReviewEntry, today: string): number {
  const overdue = daysBetween(entry.due, today);
  if (overdue > STALE_DAYS) return 1;
  return entry.interval;
}

export function computeStreak(sessions: ProgressData['sessions'], today: string): number {
  if (!sessions[today]) return 0;
  let streak = 0;
  const cursor = new Date(`${today}T00:00:00Z`);
  for (;;) {
    const key = todayStr(cursor);
    if (!sessions[key]) break;
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

const emptySession = (): DaySession => ({
  learned: 0,
  reviewed: 0,
  exercises: { flashcard: 0, mcq: 0, listen: 0, cloze: 0, dictation: 0 },
});

export function dailyStats(p: ProgressData, today: string) {
  const session = p.sessions[today] ?? emptySession();
  const dueCount = Object.values(p.review).filter((e) => isDue(e, today)).length;
  return {
    goal: p.settings.dailyGoal,
    learnedToday: session.learned,
    reviewedToday: session.reviewed,
    dueCount,
    remaining: Math.max(0, p.settings.dailyGoal - session.learned),
    session,
  };
}
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/lib/review.test.ts`
Expected: PASS — 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/review.ts src/lib/review.test.ts
git commit -m "feat: review schedule + streak logic"
```

---

### Task 7: `src/lib/speech.ts` — Web Speech API

**Files:**
- Create: `src/lib/speech.ts`, `src/lib/speech.test.ts`

**Interfaces:**
- Produces: `isSpeechSupported()`, `speak(text, opts?: { onEnd?: () => void })` (cancel phiên trước, `utter.lang='en-US'`, `rate=0.9`), `stopSpeaking()`.

- [ ] **Step 1: Viết test trước**

`src/lib/speech.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeUtter {
  text: string;
  lang: string;
  rate: number;
  handlers: Record<string, (() => void)[]>;
  addEventListener(ev: string, cb: () => void): void;
}

function stubUtterance(): void {
  class U {
    text = '';
    lang = '';
    rate = 1;
    handlers: Record<string, (() => void)[]> = {};
    addEventListener(ev: string, cb: () => void) {
      (this.handlers[ev] ??= []).push(cb);
    }
  }
  vi.stubGlobal('SpeechSynthesisUtterance', U);
}

describe('speech', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    const speak = vi.fn();
    const cancel = vi.fn();
    stubUtterance();
    vi.stubGlobal('window', { speechSynthesis: { speak, cancel } });
  });

  it('isSpeechSupported true khi có speechSynthesis', async () => {
    const { isSpeechSupported } = await import('./speech');
    expect(isSpeechSupported()).toBe(true);
  });

  it('isSpeechSupported false khi thiếu API', async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', {});
    const { isSpeechSupported } = await import('./speech');
    expect(isSpeechSupported()).toBe(false);
  });

  it('speak gọi synthesis.speak với lang/rate đúng', async () => {
    const { speak } = await import('./speech');
    speak('hello');
    const w = window as unknown as { speechSynthesis: { speak: ReturnType<typeof vi.fn> } };
    const u = w.speechSynthesis.speak.mock.calls[0][0] as FakeUtter;
    expect(u.text).toBe('hello');
    expect(u.lang).toBe('en-US');
    expect(u.rate).toBe(0.9);
  });

  it('gắn onEnd vào utterance', async () => {
    const { speak } = await import('./speech');
    const onEnd = vi.fn();
    speak('hi', { onEnd });
    const w = window as unknown as { speechSynthesis: { speak: ReturnType<typeof vi.fn> } };
    const u = w.speechSynthesis.speak.mock.calls[0][0] as FakeUtter;
    u.handlers.end?.forEach((cb) => cb());
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('stopSpeaking hủy phiên hiện tại', async () => {
    const mod = await import('./speech');
    const w = window as unknown as { speechSynthesis: { cancel: ReturnType<typeof vi.fn> } };
    mod.stopSpeaking();
    expect(w.speechSynthesis.cancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy test xác nhận fail**

Run: `npx vitest run src/lib/speech.test.ts`
Expected: FAIL — Cannot find module './speech'.

- [ ] **Step 3: Viết `src/lib/speech.ts`**

```ts
export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export interface SpeakOptions {
  onEnd?: () => void;
}

export function speak(text: string, opts?: SpeakOptions): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-US';
  utter.rate = 0.9;
  if (opts?.onEnd) utter.addEventListener('end', opts.onEnd);
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
}
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/lib/speech.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/speech.ts src/lib/speech.test.ts
git commit -m "feat: web speech api wrapper"
```

---

### Task 8: `src/lib/exercises.ts` — sinh bài tập (5 chế độ)

**Files:**
- Create: `src/lib/exercises.ts`, `src/lib/exercises.test.ts`

**Interfaces:**
- Produces:
  - `buildMcq(word, pool): { question, options: string[4], answerIndex }` — 3 đáp án sai từ cùng level + 1 đúng (đúng ở vị trí ngẫu nhiên).
  - `buildListen(word, pool): { options: string[4], answerIndex }` — 4 từ, nói bằng `speak()` khi phát (test chỉ cấu trúc).
  - `buildCloze(word, frame, examples): { sentence, blanks: number[], answer: string }` — thay token chứa từ (case-insensitive, chia sẻ gốc) bằng `___`; nếu frame không chứa từ → dùng ví dụ đầu; không có cả → null.
  - `buildDictation(word): { answer: string }` — chính là từ.
  - `shuffle<T>(arr, rng?)` — Fisher-Yates, rng injectable để test.
  - `makeRound(targetWord, words): Exercise[]` — với target: 5 dạng trộn, mỗi loại 1 câu cho đúng từ; không target: 10 câu trộn ngẫu nhiên từ `words`.

**Bối cảnh cloze:** frame dạng `I have two ___.` / example `She is my mother.`; target `family` → blank token `___` nếu khớp (vd `family`→`families` qua normalize bỏ dấu câu + lowercase + so khớp gốc: `token.toLowerCase().includes(word.toLowerCase())` HOẶC stem đơn giản — chọn cách: thay token nếu `token.toLowerCase().replace(/[^a-z]/g,'')` === word hoặc `.includes(word)`). Đơn giản hóa: thay token đầu tiên có `toLowerCase().includes(word.toLowerCase())`; nếu không token nào khớp → dùng example đầu tiên chứa từ (case-insensitive); vẫn không → trả null và caller bỏ câu đó.

- [ ] **Step 1: Viết test trước**

`src/lib/exercises.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  buildCloze,
  buildDictation,
  buildListen,
  buildMcq,
  makeRound,
  shuffle,
} from './exercises';
import type { Word } from '../types';

const w = (id: number, word: string, meaningVi: string, level: Word['level'] = 'A1'): Word => ({
  id,
  word,
  ipa: '/x/',
  pos: 'n.',
  meaningVi,
  level,
  topicId: 'a1-gia-dinh',
});

const family = w(1, 'family', 'gia đình');
const pool = [
  family,
  w(2, 'house', 'ngôi nhà'),
  w(3, 'school', 'trường học'),
  w(4, 'water', 'nước'),
  w(5, 'book', 'quyển sách'),
  w(6, 'friend', 'bạn bè'),
];

describe('shuffle', () => {
  it('giữ nguyên phần tử, khác thứ tự có thể', () => {
    expect([...shuffle([1, 2, 3, 4, 5], () => 0.5)].sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it('rng cố định → kết quả xác định', () => {
    const out = shuffle([1, 2, 3], () => 0);
    expect(out).toEqual([2, 3, 1]);
  });
});

describe('buildMcq', () => {
  it('4 options, 1 đáp án đúng, câu hỏi = word', () => {
    const q = buildMcq(family, pool);
    expect(q.question).toBe('family');
    expect(q.options.length).toBe(4);
    expect(q.options[q.answerIndex]).toBe('gia đình');
    expect(new Set(q.options).size).toBe(4);
  });
});

describe('buildListen', () => {
  it('4 options từ, đáp án đúng là từ', () => {
    const q = buildListen(family, pool);
    expect(q.options.length).toBe(4);
    expect(q.options[q.answerIndex]).toBe('family');
    expect(new Set(q.options).size).toBe(4);
  });
});

describe('buildCloze', () => {
  it('thay token chứa từ trong frame', () => {
    const c = buildCloze(family, 'I love my ___.', []);
    expect(c).not.toBeNull();
    expect(c!.sentence).toBe('I love my ___.');
    expect(c!.blanks.length).toBe(1);
    expect(c!.answer).toBe('family');
  });

  it('fallback sang example khi frame không chứa từ', () => {
    const c = buildCloze(family, 'The ___ is big.', []);
    expect(c).not.toBeNull();
    expect(c!.sentence).toBe('The ___.');
  });

  it('fallback example chứa từ dạng khác (families)', () => {
    const c = buildCloze(family, 'Go to school now.', [{ en: 'My families are here.' }]);
    expect(c).not.toBeNull();
    expect(c!.sentence).toBe('My ___ are here.');
    expect(c!.answer).toBe('family');
  });

  it('null khi không có frame/example chứa từ', () => {
    expect(buildCloze(family, 'Nothing here.', [{ en: 'Other sentence.' }])).toBeNull();
    expect(buildCloze(family, '', [])).toBeNull();
  });
});

describe('buildDictation', () => {
  it('answer là từ', () => {
    expect(buildDictation(family).answer).toBe('family');
  });
});

describe('makeRound', () => {
  it('target word → đúng 5 câu, mỗi chế độ 1, tất cả cùng từ', () => {
    const round = makeRound(family, pool);
    expect(round.length).toBe(5);
    const kinds = round.map((r) => r.kind).sort();
    expect(kinds).toEqual(['cloze', 'dictation', 'flashcard', 'listen', 'mcq']);
    for (const ex of round) {
      if (ex.kind === 'mcq' || ex.kind === 'listen') {
        const opts = ex.kind === 'mcq' ? ex.options : ex.options;
        expect(opts[ex.answerIndex]).toBe(
          ex.kind === 'mcq' ? 'gia đình' : 'family',
        );
      }
      if (ex.kind === 'dictation') expect(ex.answer).toBe('family');
    }
  });

  it('không target → 10 câu, có ít nhất 1 câu mỗi chế độ có mặt trong pool', () => {
    const round = makeRound(undefined, pool);
    expect(round.length).toBe(10);
    const kinds = new Set(round.map((r) => r.kind));
    expect(kinds.size).toBeGreaterThanOrEqual(3);
    for (const ex of round) {
      if (ex.kind === 'flashcard') {
        expect(pool.some((p) => p.id === ex.word.id)).toBe(true);
      }
    }
  });

  it('target có cloze null (khung không chứa từ) → bù bằng câu khác', () => {
    const odd = w(7, 'xylophone', 'đàn xy-lô');
    const round = makeRound(odd, pool);
    expect(round.length).toBe(5);
    expect(round.filter((r) => r.kind === 'cloze').length).toBe(0);
    expect(round.filter((r) => r.kind === 'dictation').length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Chạy test xác nhận fail**

Run: `npx vitest run src/lib/exercises.test.ts`
Expected: FAIL — Cannot find module './exercises'.

- [ ] **Step 3: Viết `src/lib/exercises.ts`**

```ts
import type { ExerciseKind, Frame, Word } from '../types';

export interface McqExercise {
  kind: 'mcq';
  question: string;
  options: string[];
  answerIndex: number;
}

export interface ListenExercise {
  kind: 'listen';
  options: string[];
  answerIndex: number;
}

export interface ClozeExercise {
  kind: 'cloze';
  sentence: string;
  blanks: number[];
  answer: string;
}

export interface DictationExercise {
  kind: 'dictation';
  answer: string;
}

export interface FlashcardExercise {
  kind: 'flashcard';
  word: Word;
}

export type Exercise =
  | McqExercise
  | ListenExercise
  | ClozeExercise
  | DictationExercise
  | FlashcardExercise;

export function shuffle<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickWrong(target: Word, pool: Word[], count: number): Word[] {
  const candidates = pool.filter((p) => p.id !== target.id);
  return shuffle(candidates).slice(0, count);
}

function place<T>(answer: T, wrongs: T[]): { options: T[]; answerIndex: number } {
  const answerIndex = Math.floor(Math.random() * (wrongs.length + 1));
  const options = [...wrongs];
  options.splice(answerIndex, 0, answer);
  return { options, answerIndex };
}

export function buildMcq(word: Word, pool: Word[]): McqExercise {
  const wrongs = pickWrong(word, pool, 3).map((p) => p.meaningVi);
  const { options, answerIndex } = place(word.meaningVi, wrongs);
  return { kind: 'mcq', question: word.word, options, answerIndex };
}

export function buildListen(word: Word, pool: Word[]): ListenExercise {
  const wrongs = pickWrong(word, pool, 3).map((p) => p.word);
  const { options, answerIndex } = place(word.word, wrongs);
  return { kind: 'listen', options, answerIndex };
}

function normalizeToken(t: string): string {
  return t.toLowerCase().replace(/[^a-z]/g, '');
}

function tokenMatches(token: string, word: string): boolean {
  const nt = normalizeToken(token);
  const nw = normalizeToken(word);
  if (!nt || !nw) return false;
  return nt === nw || nt.includes(nw) || nw.includes(nt);
}

function blankSentence(sentence: string, word: string): string | null {
  const tokens = sentence.split(/(\s+)/);
  let blanked = false;
  const out = tokens.map((t) => {
    if (blanked || /^\s+$/.test(t)) return t;
    const bare = t.replace(/^[^a-zA-Z']+/, '').replace(/[^a-zA-Z']+$/, '');
    if (bare && tokenMatches(bare, word)) {
      blanked = true;
      const before = t.slice(0, t.indexOf(bare));
      const after = t.slice(t.indexOf(bare) + bare.length);
      return `${before}___${after}`;
    }
    return t;
  });
  return blanked ? out.join('') : null;
}

export function buildCloze(
  word: Word,
  frame: Frame | undefined,
  examples: { en: string }[],
): ClozeExercise | null {
  const candidates = [
    ...(frame?.template ? [frame.template] : []),
    ...examples.map((e) => e.en),
  ];
  for (const src of candidates) {
    const blanked = blankSentence(src, word.word);
    if (blanked) {
      const blanks: number[] = [];
      const re = /___/g;
      while (re.exec(blanked) !== null) blanks.push(re.lastIndex - 3);
      return { kind: 'cloze', sentence: blanked, blanks, answer: word.word };
    }
  }
  return null;
}

export function buildDictation(word: Word): DictationExercise {
  return { kind: 'dictation', answer: word.word };
}

export function buildFlashcard(word: Word): FlashcardExercise {
  return { kind: 'flashcard', word };
}

export function makeRound(target: Word | undefined, pool: Word[]): Exercise[] {
  const source = pool.length >= 4 ? pool : pool;
  const pick = (): Word =>
    target ?? source[Math.floor(Math.random() * source.length)];

  if (target) {
    const exercises: Exercise[] = [
      buildFlashcard(target),
      buildMcq(target, source),
      buildListen(target, source),
      buildDictation(target),
    ];
    const cloze = buildCloze(
      target,
      undefined,
      [],
    );
    if (cloze) exercises.push(cloze);
    return shuffle(exercises);
  }

  const kinds: ExerciseKind[] = ['flashcard', 'mcq', 'listen', 'cloze', 'dictation'];
  const round: Exercise[] = [];
  for (let i = 0; i < 10; i++) {
    const kind = kinds[i % kinds.length];
    const word = pick();
    switch (kind) {
      case 'flashcard':
        round.push(buildFlashcard(word));
        break;
      case 'mcq':
        round.push(buildMcq(word, source));
        break;
      case 'listen':
        round.push(buildListen(word, source));
        break;
      case 'cloze': {
        const c = buildCloze(word, undefined, []);
        if (c) round.push(c);
        else round.push(buildMcq(word, source));
        break;
      }
      case 'dictation':
        round.push(buildDictation(word));
        break;
    }
  }
  return round.slice(0, 10);
}
```

Lưu ý cho Step 4: test `makeRound(target)` kỳ vọng có `cloze` **nếu frame chứa từ** — với `family` + frame `'I love my ___.'` thì cloze được tạo; nhưng trong code trên `makeRound` gọi `buildCloze(target, undefined, [])` → luôn null. **Sửa:** `makeRound` nhận thêm `frame?: Frame` và `examples?` (caller ở Task 15 truyền frame của topic + examples của từ). Cập nhật test cho khớp: `makeRound(family, pool, { template: 'I love my ___.', example: '' }, [])` → có cloze; `makeRound(odd, pool)` → không cloze. Implementer chỉnh cả test lẫn code cho nhất quán trước khi commit (test-driven: sửa test trước, chạy fail, sửa code).

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/lib/exercises.test.ts`
Expected: PASS — sau khi khớp `makeRound` signature với test (xem lưu ý Step 3).

- [ ] **Step 5: Chạy toàn bộ test + typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS tất cả.

- [ ] **Step 6: Commit**

```bash
git add src/lib/exercises.ts src/lib/exercises.test.ts
git commit -m "feat: exercise generators 5 chế độ"
```

---

### Task 9: `src/store/progress.ts` — Zustand store

**Files:**
- Create: `src/store/progress.ts`, `src/store/progress.test.ts`

**Interfaces:**
- Produces: store `useProgress` với state `data: ProgressData`, actions:
  - `learnWord(id)` — completed[id]=today; session.learned++; stats.totalLearned++; review[id]={due:+1 ngày, interval:1} (nếu chưa có).
  - `answerWord(id, ok)` — interval = nextInterval(cur, ok), restartIfStale trước; due = today + INTERVALS[interval-1]; session.reviewed++.
  - `logExercise(kind)` — session.exercises[kind]++.
  - `setDailyGoal(n)`.
  - `resetProgress()` — về default (xóa localStorage).
  - Getter trong component: streak tính lại bằng `computeStreak(sessions, todayStr())` khi render (không lưu stale).
- Persist: mỗi lần set → `saveProgress` trong middleware hoặc sau action.

**Bối cảnh:** Zustand v5 `create` + `subscribe`; chọn persist thủ công trong action (test được vì storage đã stub).

- [ ] **Step 1: Viết test trước**

`src/store/progress.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProgress } from './progress';
import { STORAGE_KEY, defaultProgress } from '../lib/storage';

const mem = new Map<string, string>();

beforeEach(() => {
  mem.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  });
  useProgress.setState({ data: defaultProgress() });
});

describe('progress store', () => {
  it('learnWord cập nhật completed + session + review', () => {
    useProgress.getState().learnWord(1);
    const { data } = useProgress.getState();
    expect(data.completed[1]).toBeDefined();
    expect(data.sessions[Object.keys(data.sessions)[0]].learned).toBe(1);
    expect(data.stats.totalLearned).toBe(1);
    expect(data.review[1].interval).toBe(1);
    expect(mem.has(STORAGE_KEY)).toBe(true);
  });

  it('learnWord 2 lần cùng ngày không tăng session.learned lần 2', () => {
    const s = useProgress.getState();
    s.learnWord(1);
    s.learnWord(1);
    const session = Object.values(useProgress.getState().data.sessions)[0];
    expect(session.learned).toBe(1);
    expect(useProgress.getState().data.stats.totalLearned).toBe(1);
  });

  it('answerWord ok → interval lên 2, chưa ok → về 1', () => {
    const s = useProgress.getState();
    s.learnWord(1);
    s.answerWord(1, true);
    expect(useProgress.getState().data.review[1].interval).toBe(2);
    s.answerWord(1, false);
    expect(useProgress.getState().data.review[1].interval).toBe(1);
    expect(Object.values(useProgress.getState().data.sessions)[0].reviewed).toBe(2);
  });

  it('answerWord với từ chưa từng học → interval bắt đầu 1', () => {
    useProgress.getState().answerWord(5, true);
    expect(useProgress.getState().data.review[5].interval).toBe(1);
  });

  it('logExercise đếm theo kind', () => {
    useProgress.getState().logExercise('mcq');
    useProgress.getState().logExercise('mcq');
    const session = Object.values(useProgress.getState().data.sessions)[0];
    expect(session.exercises.mcq).toBe(2);
  });

  it('setDailyGoal + persist', () => {
    useProgress.getState().setDailyGoal(10);
    expect(useProgress.getState().data.settings.dailyGoal).toBe(10);
    expect(JSON.parse(mem.get(STORAGE_KEY)!).settings.dailyGoal).toBe(10);
  });

  it('resetProgress về default + xóa storage', () => {
    useProgress.getState().learnWord(1);
    useProgress.getState().resetProgress();
    expect(useProgress.getState().data.stats.totalLearned).toBe(0);
    expect(mem.has(STORAGE_KEY)).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test xác nhận fail**

Run: `npx vitest run src/store/progress.test.ts`
Expected: FAIL — Cannot find module './progress'.

- [ ] **Step 3: Viết `src/store/progress.ts`**

```ts
import { create } from 'zustand';
import type { ExerciseKind, ProgressData } from '../types';
import { defaultProgress, loadProgress, saveProgress } from '../lib/storage';
import {
  INTERVALS,
  nextInterval,
  restartIfStale,
  todayStr,
} from '../lib/review';

interface ProgressState {
  data: ProgressData;
  learnWord: (id: number) => void;
  answerWord: (id: number, ok: boolean) => void;
  logExercise: (kind: ExerciseKind) => void;
  setDailyGoal: (goal: number) => void;
  resetProgress: () => void;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const useProgress = create<ProgressState>((set, get) => {
  const persist = (mutate: (d: ProgressData) => ProgressData) => {
    const next = mutate(structuredClone(get().data));
    set({ data: next });
    saveProgress(next);
  };

  const ensureSession = (d: ProgressData) => {
    const today = todayStr();
    if (!d.sessions[today]) {
      d.sessions[today] = {
        learned: 0,
        reviewed: 0,
        exercises: { flashcard: 0, mcq: 0, listen: 0, cloze: 0, dictation: 0 },
      };
    }
    return d.sessions[today];
  };

  return {
    data: loadProgress(),

    learnWord: (id) =>
      persist((d) => {
        const today = todayStr();
        if (!d.completed[id]) {
          d.completed[id] = today;
          d.stats.totalLearned += 1;
          ensureSession(d).learned += 1;
          if (!d.review[id]) {
            d.review[id] = { due: addDays(today, INTERVALS[0]), interval: 1 };
          }
        }
        return d;
      }),

    answerWord: (id, ok) =>
      persist((d) => {
        const today = todayStr();
        const cur = d.review[id];
        const base = cur ? restartIfStale(cur, today) : 0;
        const interval = nextInterval(base, ok);
        d.review[id] = {
          due: addDays(today, INTERVALS[Math.max(interval, 1) - 1] ?? INTERVALS[0]),
          interval,
        };
        ensureSession(d).reviewed += 1;
        return d;
      }),

    logExercise: (kind) =>
      persist((d) => {
        ensureSession(d).exercises[kind] += 1;
        return d;
      }),

    setDailyGoal: (goal) =>
      persist((d) => {
        d.settings.dailyGoal = Math.max(5, Math.min(100, Math.round(goal)));
        return d;
      }),

    resetProgress: () => {
      set({ data: defaultProgress() });
      try {
        localStorage.removeItem('english_nxt_v1');
      } catch {
        // bỏ qua
      }
    },
  };
});
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run src/store/progress.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/store/progress.ts src/store/progress.test.ts
git commit -m "feat: zustand progress store"
```

---

### Task 10: App shell + routing + Layout

**Files:**
- Create: `src/components/Layout.tsx`, `src/hooks/useSpeechSupport.ts`
- Edit: `src/App.tsx`

**Interfaces:**
- Produces: routes `/` Dashboard, `/levels`, `/levels/:level`, `/topics/:topicId`, `/words/:id`, `/learn`, `/learn/:topicId?` (index), `/practice`, `/practice/:kind` (`mcq|listen|cloze|dictation`) + `/practice/flash`, `/settings`; Layout có header (logo + nav) + bottom tab bar mobile (Trang chủ / Học / Luyện / Cài đặt); banner "Trình duyệt chưa hỗ trợ phát âm" nếu `!isSpeechSupported()`.

- [ ] **Step 1: Viết `src/hooks/useSpeechSupport.ts`**

```ts
import { useEffect, useState } from 'react';
import { isSpeechSupported } from '../lib/speech';

export function useSpeechSupport(): boolean {
  const [supported, setSupported] = useState(isSpeechSupported);
  useEffect(() => setSupported(isSpeechSupported()), []);
  return supported;
}
```

- [ ] **Step 2: Viết `src/components/Layout.tsx`**

```tsx
import { NavLink, Outlet } from 'react-router-dom';
import { useSpeechSupport } from '../hooks/useSpeechSupport';

const tabs = [
  { to: '/', label: 'Trang chủ', icon: '🏠' },
  { to: '/learn', label: 'Học', icon: '📖' },
  { to: '/practice', label: 'Luyện', icon: '✏️' },
  { to: '/settings', label: 'Cài đặt', icon: '⚙️' },
];

export default function Layout() {
  const supported = useSpeechSupport();
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <NavLink to="/" className="text-lg font-bold tracking-tight">
            english<span className="text-indigo-600">_nxt</span>
          </NavLink>
          <nav className="hidden gap-4 text-sm sm:flex">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  isActive ? 'font-semibold text-indigo-600' : 'text-slate-600'
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {!supported && (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-800">
          Trình duyệt này chưa hỗ trợ phát âm — dùng Chrome hoặc Edge để nghe audio.
        </div>
      )}

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white sm:hidden">
        <div className="grid grid-cols-4">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-xs ${
                  isActive ? 'font-semibold text-indigo-600' : 'text-slate-500'
                }`
              }
            >
              <span aria-hidden>{t.icon}</span>
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
```

- [ ] **Step 3: Viết routes trong `src/App.tsx`**

```tsx
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Levels from './pages/Levels';
import LevelDetail from './pages/LevelDetail';
import TopicDetail from './pages/TopicDetail';
import WordDetail from './pages/WordDetail';
import Learn from './pages/Learn';
import Practice from './pages/Practice';
import PracticeRound from './pages/PracticeRound';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="levels" element={<Levels />} />
        <Route path="levels/:level" element={<LevelDetail />} />
        <Route path="topics/:topicId" element={<TopicDetail />} />
        <Route path="words/:id" element={<WordDetail />} />
        <Route path="learn" element={<Learn />} />
        <Route path="learn/:topicId" element={<Learn />} />
        <Route path="practice" element={<Practice />} />
        <Route path="practice/:kind" element={<PracticeRound />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<div className="p-8 text-center">Không tìm thấy trang</div>} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 4: Tạo stub pages (điền đầy đủ ở task sau)**

Mỗi file `src/pages/{Dashboard,Levels,LevelDetail,TopicDetail,WordDetail,Learn,Practice,PracticeRound,Settings}.tsx`:

```tsx
export default function TênPage() {
  return <div>TênPage</div>;
}
```

(Dùng tên hàm thật: `Dashboard`, `Levels`, `LevelDetail`, `TopicDetail`, `WordDetail`, `Learn`, `Practice`, `PracticeRound`, `Settings`.)

- [ ] **Step 5: Verify**

Run: `npm run dev` → mở `/`, `/practice/mcq` → render Layout + stub, không 404.
Run: `npm test && npm run build`
Expected: PASS + build OK.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/Layout.tsx src/hooks/useSpeechSupport.ts src/pages/
git commit -m "feat: app shell routing layout"
```

---

### Task 11: Dashboard (Trang chủ)

**Files:**
- Create: `src/pages/Dashboard.tsx`, `src/components/ProgressBar.tsx`

**Interfaces:**
- Produces: greeting + ngày hôm nay; thẻ **Tiến độ hôm nay** (đã học/mục tiêu, ProgressBar, nút "Học tiếp" → `/learn`); thẻ **Ôn tập** (số từ đến hạn, nút "Ôn ngay" → `/practice` nếu >0); thẻ **Chuỗi học (streak)** + tổng từ đã học; lưới 4 cấp độ link → `/levels/:id`.

- [ ] **Step 1: Viết `src/components/ProgressBar.tsx`**

```tsx
export default function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}
```

- [ ] **Step 2: Viết `src/pages/Dashboard.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { useProgress } from '../store/progress';
import { computeStreak, dailyStats, todayStr } from '../lib/review';
import { getIndex } from '../lib/vocab';
import ProgressBar from '../components/ProgressBar';

export default function Dashboard() {
  const data = useProgress((s) => s.data);
  const today = todayStr();
  const stats = dailyStats(data, today);
  const streak = computeStreak(data.sessions, today);
  const idx = getIndex();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Xin chào 👋</h1>
        <p className="text-sm text-slate-500">{today}</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-semibold">Tiến độ hôm nay</h2>
          <span className="text-sm text-slate-500">
            {stats.learnedToday}/{stats.goal} từ
          </span>
        </div>
        <ProgressBar value={stats.learnedToday} max={stats.goal} />
        <Link
          to="/learn"
          className="mt-4 block rounded-xl bg-indigo-600 py-2.5 text-center font-medium text-white hover:bg-indigo-700"
        >
          {stats.remaining > 0 ? `Học tiếp (${stats.remaining} từ)` : 'Ôn lại hôm nay'}
        </Link>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Ôn tập</h2>
            <p className="text-sm text-slate-500">{stats.dueCount} từ đến hạn</p>
          </div>
          <Link
            to="/practice"
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              stats.dueCount > 0
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            Ôn ngay
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold">🔥 {streak}</p>
          <p className="text-sm text-slate-500">ngày liên tiếp</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold">{data.stats.totalLearned}</p>
          <p className="text-sm text-slate-500">từ đã học / {idx.totalWords}</p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {idx.levels.map((lv) => (
          <Link
            key={lv.id}
            to={`/levels/${lv.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-indigo-300"
          >
            <p className="text-lg font-bold">{lv.id}</p>
            <p className="text-xs text-slate-500">
              {lv.name} · {lv.wordCount} từ
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Verify thủ công + build**

Run: `npm run dev` → Dashboard hiện đủ 4 khối; streak = 0 khi chưa học; click các link chạy.
Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx src/components/ProgressBar.tsx
git commit -m "feat: dashboard home"
```

---

### Task 12: Levels list + Level detail (topic grid) + AudioButton + WordRow

**Files:**
- Create: `src/pages/Levels.tsx`, `src/pages/LevelDetail.tsx`, `src/components/AudioButton.tsx`, `src/components/WordRow.tsx`

**Interfaces:**
- `Levels`: 4 card cấp độ → `/levels/:id`.
- `LevelDetail`: tiêu đề level + tổng từ; grid các topic (nameVi — nameEn, wordCount, tiến độ đã học của topic) → `/topics/:topicId`.
- `AudioButton({ text, size? })`: nút 🔊 → `speak(text)`; ẩn hoàn toàn nếu `!isSpeechSupported()`.
- `WordRow({ word, showLevel? })`: 1 dòng: từ + IPA + nghĩaVi (bấm → `/words/:id`) + AudioButton.

- [ ] **Step 1: Viết `src/components/AudioButton.tsx`**

```tsx
import { isSpeechSupported, speak } from '../lib/speech';

interface Props {
  text: string;
  size?: 'sm' | 'md';
}

export default function AudioButton({ text, size = 'md' }: Props) {
  if (!isSpeechSupported()) return null;
  const cls =
    size === 'sm'
      ? 'h-7 w-7 text-sm'
      : 'h-9 w-9 text-base';
  return (
    <button
      type="button"
      aria-label={`Phát âm ${text}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        speak(text);
      }}
      className={`shrink-0 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 ${cls}`}
    >
      🔊
    </button>
  );
}
```

- [ ] **Step 2: Viết `src/components/WordRow.tsx`**

```tsx
import { Link } from 'react-router-dom';
import type { Word } from '../types';
import AudioButton from './AudioButton';

export default function WordRow({ word, showLevel = false }: { word: Word; showLevel?: boolean }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-2.5">
      <Link to={`/words/${word.id}`} className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {word.word}
          <span className="ml-2 font-normal text-slate-400">{word.ipa}</span>
          {showLevel && (
            <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
              {word.level}
            </span>
          )}
        </p>
        <p className="truncate text-sm text-slate-500">{word.meaningVi}</p>
      </Link>
      <AudioButton text={word.word} size="sm" />
    </div>
  );
}
```

- [ ] **Step 3: Viết `src/pages/Levels.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { getIndex } from '../lib/vocab';
import { useProgress } from '../store/progress';

export default function Levels() {
  const idx = getIndex();
  const completed = useProgress((s) => s.data.completed);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Cấp độ</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {idx.levels.map((lv) => {
          const learned = Object.keys(completed).length;
          const inLevel = idx.topics
            .filter((t) => t.level === lv.id)
            .flatMap((t) => t.wordIds)
            .filter((id) => id in completed).length;
          return (
            <Link
              key={lv.id}
              to={`/levels/${lv.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-indigo-300"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold">{lv.id}</span>
                <span className="text-sm text-slate-500">
                  {inLevel}/{lv.wordCount} từ
                </span>
              </div>
              <p className="text-sm text-slate-500">{lv.name}</p>
              <p className="mt-1 text-xs text-slate-400">Tổng đã học: {learned}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Viết `src/pages/LevelDetail.tsx`**

```tsx
import { Link, useParams } from 'react-router-dom';
import { getIndex } from '../lib/vocab';
import { useProgress } from '../store/progress';
import ProgressBar from '../components/ProgressBar';

export default function LevelDetail() {
  const { level } = useParams();
  const idx = getIndex();
  const completed = useProgress((s) => s.data.completed);
  const lv = idx.levels.find((l) => l.id === level);

  if (!lv) return <p className="p-4">Không tìm thấy cấp độ.</p>;

  const topics = idx.topics.filter((t) => t.level === lv.id);

  return (
    <div className="space-y-4">
      <div>
        <Link to="/levels" className="text-sm text-indigo-600">
          ← Cấp độ
        </Link>
        <h1 className="text-2xl font-bold">
          {lv.id} — {lv.name}
        </h1>
        <p className="text-sm text-slate-500">{lv.wordCount} từ · {topics.length} chủ đề</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {topics.map((t) => {
          const learned = t.wordIds.filter((id) => id in completed).length;
          return (
            <Link
              key={t.id}
              to={`/topics/${t.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-indigo-300"
            >
              <p className="font-medium">{t.nameVi}</p>
              <p className="text-xs text-slate-500">{t.nameEn}</p>
              <div className="mt-2 flex items-center gap-2">
                <ProgressBar value={learned} max={t.wordCount} />
                <span className="shrink-0 text-xs text-slate-500">
                  {learned}/{t.wordCount}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run: `npm run dev` → `/levels`, `/levels/A1` đúng dữ liệu, WordRow/AudioButton test ở task sau (UI verify tay).
Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Levels.tsx src/pages/LevelDetail.tsx src/components/AudioButton.tsx src/components/WordRow.tsx
git commit -m "feat: levels + topic grid + audio/wordrow components"
```

---

### Task 13: Topic detail + Word detail

**Files:**
- Create: `src/pages/TopicDetail.tsx`, `src/pages/WordDetail.tsx`
- Edit: `src/components/WordRow.tsx` (thêm badge "đã học" nếu `id in completed`)

**Interfaces:**
- `TopicDetail`: breadcrumb, tên topic, tổng từ, khung mẫu câu (nếu có, `<details>`), hàng từ (WordRow), nút "Học chủ đề này" → `/learn/:topicId`, nút "Luyện chủ đề" → `/practice?topic=:topicId`.
- `WordDetail`: từ lớn + IPA + AudioButton; nghĩa + từ loại + cấp độ + chủ đề (link); **Ví dụ** (list `getExamples(id)`); **Trạng thái**: đã học/đã đến hạn (từ `useProgress`); nút "Đánh dấu đã học" (learnWord) hoặc "Đã học ✓" (đã có); khung mẫu của topic.

- [ ] **Step 1: Sửa `WordRow` — badge đã học**

Thêm import `useProgress`; trong component: `const completed = useProgress((s) => s.data.completed);` và sau IPA thêm:

```tsx
{word.id in completed && (
  <span className="ml-2 text-emerald-600" title="Đã học">✓</span>
)}
```

- [ ] **Step 2: Viết `src/pages/TopicDetail.tsx`**

```tsx
import { Link, useParams } from 'react-router-dom';
import { getFrames, getIndex, getWordsByTopic } from '../lib/vocab';
import WordRow from '../components/WordRow';
import { useProgress } from '../store/progress';

export default function TopicDetail() {
  const { topicId } = useParams();
  const idx = getIndex();
  const section = idx.topics.find((t) => t.id === topicId);
  const words = topicId ? getWordsByTopic(topicId) : [];
  const frames = topicId ? getFrames(topicId) : [];
  const completed = useProgress((s) => s.data.completed);

  if (!section) return <p className="p-4">Không tìm thấy chủ đề.</p>;
  const learned = section.wordIds.filter((id) => id in completed).length;

  return (
    <div className="space-y-4">
      <div>
        <Link to={`/levels/${section.level}`} className="text-sm text-indigo-600">
          ← {section.level}
        </Link>
        <h1 className="text-2xl font-bold">{section.nameVi}</h1>
        <p className="text-sm text-slate-500">
          {section.nameEn} · {learned}/{section.wordCount} từ đã học
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          to={`/learn/${section.id}`}
          className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-center font-medium text-white hover:bg-indigo-700"
        >
          Học chủ đề này
        </Link>
        <Link
          to={`/practice?topic=${section.id}`}
          className="flex-1 rounded-xl border border-indigo-600 py-2.5 text-center font-medium text-indigo-600 hover:bg-indigo-50"
        >
          Luyện chủ đề
        </Link>
      </div>

      {frames.length > 0 && (
        <details className="rounded-2xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer font-semibold">Khung mẫu câu ({frames.length})</summary>
          <ul className="mt-3 space-y-3">
            {frames.map((f, i) => (
              <li key={i}>
                <p className="font-medium">{f.template}</p>
                <p className="text-sm text-slate-500">→ {f.example}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white px-4">
        {words.map((w) => (
          <WordRow key={w.id} word={w} />
        ))}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Viết `src/pages/WordDetail.tsx`**

```tsx
import { Link, useParams } from 'react-router-dom';
import { getExamples, getFrames, getWord } from '../lib/vocab';
import { useProgress } from '../store/progress';
import { isDue, todayStr } from '../lib/review';
import AudioButton from '../components/AudioButton';

export default function WordDetail() {
  const { id } = useParams();
  const numId = Number(id);
  const word = getWord(numId);
  const data = useProgress((s) => s.data);
  const learnWord = useProgress((s) => s.learnWord);

  if (!word) return <p className="p-4">Không tìm thấy từ.</p>;

  const examples = getExamples(numId);
  const frames = getFrames(word.topicId);
  const section = frames.length > 0 ? null : null;
  const isLearned = numId in data.completed;
  const review = data.review[numId];
  const due = review ? isDue(review, todayStr()) : false;

  return (
    <div className="space-y-4">
      <Link to={`/topics/${word.topicId}`} className="text-sm text-indigo-600">
        ← {word.topicId}
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <div className="flex items-center justify-center gap-3">
          <h1 className="text-3xl font-bold">{word.word}</h1>
          <AudioButton text={word.word} />
        </div>
        <p className="mt-1 text-lg text-slate-500">{word.ipa}</p>
        <p className="mt-3 text-xl">{word.meaningVi}</p>
        <p className="mt-2 text-sm text-slate-400">
          {word.pos} · {word.level}
        </p>
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <span
            className={`rounded-full px-3 py-1 ${
              isLearned ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {isLearned ? 'Đã học ✓' : 'Chưa học'}
          </span>
          {isLearned && review && (
            <span className={`rounded-full px-3 py-1 ${due ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
              {due ? 'Đến hạn ôn' : `Ôn sau ${review.due}`}
            </span>
          )}
        </div>
        {!isLearned && (
          <button
            type="button"
            onClick={() => learnWord(numId)}
            className="mt-4 rounded-xl bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700"
          >
            Đánh dấu đã học
          </button>
        )}
      </div>

      {examples.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Ví dụ</h2>
          <ul className="mt-2 space-y-2">
            {examples.map((e, i) => (
              <li key={i} className="flex items-start justify-between gap-2 text-sm">
                <span>{e.en}</span>
                <AudioButton text={e.en} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {frames.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Khung mẫu câu</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {frames.slice(0, 5).map((f, i) => (
              <li key={i}>
                <span className="font-medium">{f.template}</span>
                <span className="text-slate-500"> → {f.example}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
```

Lưu ý: biến `section` ở trên là dead code — **bỏ dòng đó** khi implement (Step này copy-paste được, Step review sẽ bắt `noUnusedLocals` fail build — thực ra TS sẽ bắt trước khi build; cứ xóa ngay khi viết).

- [ ] **Step 4: Verify**

Run: `npm run dev` → mở `/words/1` (đủ ví dụ/nút học), `/topics/a1-...`, badge ✓ hiện sau khi bấm học, reload vẫn còn (localStorage).
Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/TopicDetail.tsx src/pages/WordDetail.tsx src/components/WordRow.tsx
git commit -m "feat: topic + word detail"
```

---

### Task 14: Learn (Flashcard) — phiên học theo ngày/chủ đề

**Files:**
- Create: `src/pages/Learn.tsx`, `src/components/Flashcard.tsx`, `src/components/SessionSummary.tsx`

**Interfaces:**
- `Learn`: không param → chọn 20 từ (còn thiếu trong `completed`, thêm từ đến hạn ôn nếu còn slot); có `:topicId` → học từ chủ đề đó. Flow: 1 từ/lượt — Flashcard (mặt trước: từ + IPA + 🔊; bấm "Xem nghĩa" lật — mặt sau: nghĩa + ví dụ + nút "Nhớ rồi" / "Chưa nhớ") → learnWord(id) + logExercise('flashcard') + answerWord(id, ok) → tự sang từ kế. Hết → `SessionSummary` (đã học X, đúng/sai Y, nút về Dashboard / học tiếp).
- `Flashcard({ word, onResult(ok) })` — tự quản state lật.
- `SessionSummary({ learned, correct, total, onAgain, onHome })`.

**Bối cảnh:** Học mới = learnWord; nếu từ đã completed và nằm trong phiên ôn (due) → vẫn hiện, kết quả ghi answerWord. Đơn giản hóa: mọi từ trong phiên learn đều learnWord (idempotent) + answerWord khi bấm nhớ/chưa nhớ.

- [ ] **Step 1: Viết `src/components/Flashcard.tsx`**

```tsx
import { useState } from 'react';
import type { Word } from '../types';
import { getExamples } from '../lib/vocab';
import AudioButton from './AudioButton';

interface Props {
  word: Word;
  onResult: (ok: boolean) => void;
}

export default function Flashcard({ word, onResult }: Props) {
  const [flipped, setFlipped] = useState(false);
  const examples = getExamples(word.id);

  return (
    <div className="space-y-4">
      <div
        className="cursor-pointer rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"
        onClick={() => setFlipped(true)}
      >
        <div className="flex items-center justify-center gap-3">
          <h2 className="text-3xl font-bold">{word.word}</h2>
          <AudioButton text={word.word} />
        </div>
        <p className="mt-1 text-slate-400">{word.ipa}</p>

        {flipped ? (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="text-xl">{word.meaningVi}</p>
            <p className="text-sm text-slate-400">{word.pos}</p>
            {examples.length > 0 && (
              <p className="mt-3 text-sm italic text-slate-600">“{examples[0].en}”</p>
            )}
          </div>
        ) : (
          <p className="mt-6 text-sm text-indigo-600">Bấm để xem nghĩa →</p>
        )}
      </div>

      {flipped ? (
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
      ) : (
        <button
          type="button"
          onClick={() => setFlipped(true)}
          className="w-full rounded-xl border border-slate-300 py-3 font-medium text-slate-600 hover:bg-slate-100"
        >
          Xem nghĩa
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Viết `src/components/SessionSummary.tsx`**

```tsx
import { Link } from 'react-router-dom';

interface Props {
  learned: number;
  correct: number;
  total: number;
  onAgain: () => void;
}

export default function SessionSummary({ learned, correct, total, onAgain }: Props) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-8 text-center">
      <p className="text-5xl">🎉</p>
      <h2 className="text-xl font-bold">Hoàn thành phiên học!</h2>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xl font-bold">{learned}</p>
          <p className="text-slate-500">từ mới</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xl font-bold">{correct}/{total}</p>
          <p className="text-slate-500">ghi nhớ</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xl font-bold">{pct}%</p>
          <p className="text-slate-500">tỷ lệ</p>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onAgain}
          className="flex-1 rounded-xl border border-indigo-600 py-2.5 font-medium text-indigo-600 hover:bg-indigo-50"
        >
          Học thêm
        </button>
        <Link
          to="/"
          className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-center font-medium text-white hover:bg-indigo-700"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Viết `src/pages/Learn.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFrames, getIndex, getWordsByLevel, getWordsByTopic } from '../lib/vocab';
import { useProgress } from '../store/progress';
import { isDue, todayStr } from '../lib/review';
import Flashcard from '../components/Flashcard';
import SessionSummary from '../components/SessionSummary';

interface QueueItem {
  wordId: number;
  isNew: boolean;
}

function buildQueue(
  topicId: string | undefined,
  completed: Record<number, string>,
  review: Record<number, { due: string; interval: number }>,
  goal: number,
  frameSource: (topicId: string) => unknown,
): QueueItem[] {
  const today = todayStr();
  const dueIds = Object.entries(review)
    .filter(([, e]) => isDue(e, today))
    .map(([id]) => Number(id));

  if (topicId) {
    const words = getWordsByTopic(topicId);
    const dueInTopic = words.filter((w) => dueIds.includes(w.id)).map((w) => w.id);
    const newInTopic = words.filter((w) => !(w.id in completed)).map((w) => w.id);
    return [...dueInTopic, ...newInTopic]
      .slice(0, goal)
      .map((id) => ({ wordId: id, isNew: !(id in completed) }));
  }

  const newIds: number[] = [];
  for (const lv of ['A1', 'A2', 'B1', 'B2'] as const) {
    for (const w of getWordsByLevel(lv)) {
      if (!(w.id in completed)) newIds.push(w.id);
      if (newIds.length >= goal - dueIds.length) break;
    }
    if (newIds.length >= goal - dueIds.length) break;
  }
  const queue = [
    ...dueIds.slice(0, goal).map((id) => ({ wordId: id, isNew: false })),
    ...newIds.map((id) => ({ wordId: id, isNew: true })),
  ];
  return queue.slice(0, goal);
}

export default function Learn() {
  const { topicId } = useParams();
  const data = useProgress((s) => s.data);
  const learnWord = useProgress((s) => s.learnWord);
  const answerWord = useProgress((s) => s.answerWord);
  const logExercise = useProgress((s) => s.logExercise);
  const [started, setStarted] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [pos, setPos] = useState(0);
  const [correct, setCorrect] = useState(0);

  const idx = getIndex();

  const start = () => {
    const q = buildQueue(topicId, data.completed, data.review, data.settings.dailyGoal, () => null);
    setQueue(q);
    setPos(0);
    setCorrect(0);
    setStarted(true);
  };

  const handleResult = (ok: boolean) => {
    const item = queue[pos];
    if (!item) return;
    learnWord(item.wordId);
    answerWord(item.wordId, ok);
    logExercise('flashcard');
    if (ok) setCorrect((c) => c + 1);
    setPos((p) => p + 1);
  };

  if (started && pos >= queue.length && queue.length > 0) {
    return (
      <SessionSummary
        learned={queue.filter((q) => q.isNew).length}
        correct={correct}
        total={queue.length}
        onAgain={start}
      />
    );
  }

  if (!started || queue.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Học hôm nay</h1>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          {queue.length === 0 && started ? (
            <p className="text-slate-500">Không có từ nào cần học — bạn đã hoàn thành!</p>
          ) : (
            <p className="text-slate-600">
              Mục tiêu hôm nay: <b>{data.settings.dailyGoal} từ</b>
              {topicId && ` — chủ đề ${idx.topics.find((t) => t.id === topicId)?.nameVi ?? topicId}`}
            </p>
          )}
          <button
            type="button"
            onClick={start}
            className="mt-4 w-full rounded-xl bg-indigo-600 py-3 font-medium text-white hover:bg-indigo-700"
          >
            Bắt đầu
          </button>
        </div>
      </div>
    );
  }

  const word = queue[pos];
  const w = getWordsByLevel('A1').find((x) => x.id === word.wordId)
    ?? ['A2', 'B1', 'B2'].map((l) => getWordsByLevel(l as 'A2' | 'B1' | 'B2')).flat().find((x) => x.id === word.wordId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {pos + 1}/{queue.length}
        </span>
        <span>{word.isNew ? 'Từ mới' : 'Ôn tập'}</span>
      </div>
      {w && <Flashcard word={w} onResult={handleResult} />}
    </div>
  );
}
```

Lưu ý implement: hàm tra `w` ở trên cồng kềnh — thay bằng `getWord(word.wordId)` (import từ `../lib/vocab`), ghi thẳng `const w = getWord(word.wordId);`. Cũng bỏ tham số `frameSource` thừa trong `buildQueue` (xác định khi viết test/verify — chạy `npx tsc --noEmit` sẽ bắt unused param).

- [ ] **Step 4: Verify**

Run: `npm run dev` → `/learn`: bắt đầu → flashcard, lật, bấm nhớ/chưa nhớ → summary; reload Dashboard thấy tiến độ + streak.
Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Learn.tsx src/components/Flashcard.tsx src/components/SessionSummary.tsx
git commit -m "feat: flashcard learning session"
```

---

### Task 15: Practice hub + McqExercise + ListenExercise

**Files:**
- Create: `src/pages/Practice.tsx`, `src/pages/PracticeRound.tsx`, `src/components/exercises/McqExercise.tsx`, `src/components/exercises/ListenExercise.tsx`

**Interfaces:**
- `Practice`: grid 5 chế độ (Flashcard ôn nhanh → `/practice/flash`; Trắc nghiệm Anh→Việt → `/practice/mcq`; Nghe chọn từ → `/practice/listen`; Điền mẫu câu → `/practice/cloze`; Chép chính tả → `/practice/dictation`); mỗi card hiện số câu tập hôm nay (`sessions[today].exercises[kind]`).
- `PracticeRound` (theo `/practice/:kind`, hỗ trợ `?word=` và `?topic=`): sinh 10 câu qua `makeRound` (nếu `?word` → 5 câu trộn cho từ đó: flashcard/mcq/listen/cloze/dictation); render theo kind; mỗi câu trả lời → hiện đúng/sai + audio; kết thúc → SessionSummary-like + `logExercise` cho mỗi câu.
- `McqExercise({ exercise, onAnswer(ok) })` — chọn option → hiện màu xanh/đỏ, auto chuyển sau 800ms.
- `ListenExercise` — nút "Nghe" (`speak(word)` tìm từ qua options), 4 option chữ, hiện đáp án sau chọn.

**Bối cảnh:** `kind === 'flash'` → dùng Learn flow; để đơn giản `/practice/flash` render Learning flashcard loop 10 từ đến hạn (tái sử dụng `Flashcard` component, review-only queue).

- [ ] **Step 1: Viết `src/pages/Practice.tsx`**

```tsx
import { Link, useSearchParams } from 'react-router-dom';
import { useProgress } from '../store/progress';
import { todayStr } from '../lib/review';
import type { ExerciseKind } from '../types';

const kinds: { kind: ExerciseKind | 'flash'; title: string; desc: string; to: string }[] = [
  { kind: 'flash', title: 'Flashcard ôn nhanh', desc: 'Lật thẻ, nhớ/chưa nhớ', to: '/practice/flash' },
  { kind: 'mcq', title: 'Trắc nghiệm', desc: 'Chọn nghĩa đúng (Anh → Việt)', to: '/practice/mcq' },
  { kind: 'listen', title: 'Nghe chọn từ', desc: 'Nghe audio, chọn từ đúng', to: '/practice/listen' },
  { kind: 'cloze', title: 'Điền mẫu câu', desc: 'Chọn từ còn thiếu', to: '/practice/cloze' },
  { kind: 'dictation', title: 'Chép chính tả', desc: 'Nghe và gõ từ', to: '/practice/dictation' },
];

export default function Practice() {
  const data = useProgress((s) => s.data);
  const session = data.sessions[todayStr()];
  const [params] = useSearchParams();
  const topic = params.get('topic');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Luyện tập</h1>
        {topic && <p className="text-sm text-slate-500">Chủ đề: {topic}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {kinds.map((k) => {
          const count = session
            ? k.kind === 'flash'
              ? session.exercises.flashcard
              : session.exercises[k.kind as ExerciseKind]
            : 0;
          const href = topic ? `${k.to}?topic=${topic}` : k.to;
          return (
            <Link
              key={k.kind}
              to={href}
              className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-indigo-300"
            >
              <div className="flex items-baseline justify-between">
                <p className="font-semibold">{k.title}</p>
                <span className="text-xs text-slate-400">hôm nay: {count}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{k.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Viết `src/components/exercises/McqExercise.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { McqExercise as McqData } from '../../lib/exercises';

interface Props {
  exercise: McqData;
  onAnswer: (ok: boolean) => void;
}

export default function McqExercise({ exercise, onAnswer }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;

  useEffect(() => {
    if (picked === null) return;
    const t = setTimeout(() => onAnswer(picked === exercise.answerIndex), 800);
    return () => clearTimeout(t);
  }, [picked, exercise, onAnswer]);

  return (
    <div className="space-y-3">
      <p className="text-center text-3xl font-bold">{exercise.question}</p>
      <div className="grid gap-2">
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
              className={`rounded-xl border p-3 text-left font-medium ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Viết `src/components/exercises/ListenExercise.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { ListenExercise as ListenData } from '../../lib/exercises';
import { speak } from '../../lib/speech';

interface Props {
  exercise: ListenData;
  onAnswer: (ok: boolean) => void;
}

export default function ListenExercise({ exercise, onAnswer }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const answerWord = exercise.options[exercise.answerIndex];

  useEffect(() => {
    const t = setTimeout(() => speak(answerWord), 300);
    return () => clearTimeout(t);
  }, [answerWord]);

  useEffect(() => {
    if (picked === null) return;
    const t = setTimeout(() => onAnswer(picked === exercise.answerIndex), 800);
    return () => clearTimeout(t);
  }, [picked, exercise, onAnswer]);

  return (
    <div className="space-y-3">
      <div className="text-center">
        <button
          type="button"
          onClick={() => speak(answerWord)}
          className="h-16 w-16 rounded-full bg-indigo-600 text-2xl text-white hover:bg-indigo-700"
        >
          🔊
        </button>
        <p className="mt-2 text-sm text-slate-500">Nghe và chọn từ đúng</p>
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
```

- [ ] **Step 4: Sinh round trong `PracticeRound` (phần mcq/listen trước; cloze/dictation Task 16)**

`src/pages/PracticeRound.tsx` (viết đủ; imports cho Cloze/DictationExercise sẽ được tạo ở Task 16 — nếu chạy trước Task 16 thì chỉ render 3 kind còn lại, tránh import chưa tồn tại):

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  buildFlashcard,
  buildListen,
  buildMcq,
  makeRound,
  shuffle,
} from '../lib/exercises';
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
  const logExercise = useProgress((s) => s.logExercise);
  const answerWord = useProgress((s) => s.answerWord);

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
      const due = shuffle(pool).slice(0, ROUND_SIZE);
      return due.map((w) => buildFlashcard(w));
    }
    if (target && kind) {
      const frame = getFrames(target.topicId)[0];
      return makeRound(target, pool, frame, getExamples(target.id));
    }
    if (kind === 'mcq') return makeRound(undefined, pool, undefined, [], 'mcq');
    if (kind === 'listen') return makeRound(undefined, pool, undefined, [], 'listen');
    return makeRound(undefined, pool);
  }, [kind, pool, target]);

  const [pos, setPos] = useState(0);
  const [correct, setCorrect] = useState(0);
  const done = pos >= round.length;

  useEffect(() => {
    setPos(0);
    setCorrect(0);
  }, [round]);

  const handleAnswer = (ok: boolean) => {
    if (ok) setCorrect((c) => c + 1);
    const ex = round[pos];
    if (ex) {
      const wordId =
        ex.kind === 'flashcard' ? ex.word.id : target?.id ?? 0;
      if (kind && kind !== 'flash' && kind !== 'raw') {
        logExercise(kind as 'mcq' | 'listen' | 'cloze' | 'dictation');
      }
      if (wordId) answerWord(wordId, ok);
    }
    setPos((p) => p + 1);
  };

  if (round.length === 0) {
    return <p className="p-4 text-slate-500">Không có dữ liệu luyện tập.</p>;
  }

  if (done) {
    return (
      <SessionSummary
        learned={0}
        correct={correct}
        total={round.length}
        onAgain={() => setPos(0)}
      />
    );
  }

  const ex = round[pos];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          Câu {pos + 1}/{round.length}
        </span>
        <span>Đúng: {correct}</span>
      </div>

      {ex.kind === 'flashcard' && (
        <Flashcard
          word={ex.word}
          onResult={(ok) => {
            logExercise('flashcard');
            handleAnswer(ok);
          }}
        />
      )}
      {ex.kind === 'mcq' && <McqExercise exercise={ex} onAnswer={handleAnswer} />}
      {ex.kind === 'listen' && <ListenExercise exercise={ex} onAnswer={handleAnswer} />}
    </div>
  );
}
```

Lưu ý implement (TDD): `makeRound` cần mở rộng signature — `makeRound(target, pool, frame?, examples?, onlyKind?)`. **Viết test mới trong `src/lib/exercises.test.ts` trước** (theo `onlyKind` trả round 10 câu toàn kind đó; target+frame có cloze) → chạy fail → sửa `exercises.ts` → pass. Cập nhật `handleAnswer` chỉ `logExercise` đúng kind của câu (dùng `ex.kind`), không log flashcard 2 lần (Flashcard branch gọi logExercise riêng — gộp: bỏ logExercise trong Flashcard branch, để `handleAnswer` dùng `ex.kind`).

- [ ] **Step 5: Verify**

Run: `npm run dev` → `/practice` đủ 5 card + đếm; `/practice/mcq` 10 câu đúng/sai có auto-advance; `/practice/listhe` (typo → `/practice/listen`) phát audio.
Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Practice.tsx src/pages/PracticeRound.tsx src/components/exercises/ src/lib/exercises.ts src/lib/exercises.test.ts
git commit -m "feat: practice hub + mcq + listen exercises"
```

---

### Task 16: Cloze + Dictation + Flash practice

**Files:**
- Create: `src/components/exercises/ClozeExercise.tsx`, `src/components/exercises/DictationExercise.tsx`
- Edit: `src/pages/PracticeRound.tsx` (render 2 kind mới + kind `flash` hoàn chỉnh)

**Interfaces:**
- `ClozeExercise({ exercise, options, onAnswer })` — câu có `___` + 4 option (1 đúng + 3 sai từ pool); chọn → hiện đúng/sai.
- `DictationExercise({ word, onAnswer })` — nút 🔊 phát từ (auto phát 1 lần), `<input>` gõ, nút "Kiểm tra" → so sánh `normalize(gõ) === normalize(từ)` (lowercase, bỏ dấu câu, trim, ±không phân biệt hoa/thường) → hiện đáp án + phát lại; Enter submit.
- `PracticeRound`: kind `cloze` sinh options từ `buildMcq`-style (dùng meaning pool — cần hàm `buildClozeWithOptions(word, frame, examples, pool)` trong `exercises.ts`); kind `dictation` render DictationExercise cho word (target nếu có, không thì random từ round).

- [ ] **Step 1: Test trước cho `buildClozeWithOptions` (test-driven)**

Thêm vào `src/lib/exercises.test.ts`:

```ts
describe('buildClozeWithOptions', () => {
  it('4 options, answer = từ', () => {
    const q = buildClozeWithOptions(family, 'I love my ___.', [], pool);
    expect(q).not.toBeNull();
    expect(q!.options.length).toBe(4);
    expect(q!.options[q!.answerIndex]).toBe('family');
    expect(new Set(q!.options).size).toBe(4);
  });
  it('null khi không blank được', () => {
    expect(buildClozeWithOptions(family, 'Nothing.', [], pool)).toBeNull();
  });
});
```

Run: `npx vitest run src/lib/exercises.test.ts` → FAIL (chưa export).

- [ ] **Step 2: Bổ sung `buildClozeWithOptions` vào `src/lib/exercises.ts`**

```ts
export interface ClozeWithOptions extends ClozeExercise {
  options: string[];
  answerIndex: number;
}

export function buildClozeWithOptions(
  word: Word,
  frame: Frame | undefined,
  examples: { en: string }[],
  pool: Word[],
): ClozeWithOptions | null {
  const base = buildCloze(word, frame, examples);
  if (!base) return null;
  const wrongs = pickWrong(word, pool, 3).map((p) => p.word);
  const { options, answerIndex } = place(word.word, wrongs);
  return { ...base, options, answerIndex };
}
```

Run: `npx vitest run src/lib/exercises.test.ts` → PASS.

- [ ] **Step 3: Viết `ClozeExercise.tsx`**

```tsx
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
          onClick={() => speak(exercise.answer)}
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
```

- [ ] **Step 4: Viết `DictationExercise.tsx`**

```tsx
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

  const submit = () => {
    if (checked !== null || !value.trim()) return;
    const ok = normalize(value) === normalize(word.word);
    setChecked(ok);
    setTimeout(() => {
      speak(word.word);
      onAnswer(ok);
    }, 1200);
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
```

- [ ] **Step 5: Bổ sung `PracticeRound` render `cloze`/`dictation`**

Trong JSX thêm:

```tsx
{ex.kind === 'cloze' && ex.options && (
  <ClozeExercise exercise={ex} onAnswer={handleAnswer} />
)}
{ex.kind === 'cloze' && !ex.options && (
  <p className="text-center text-slate-500">Bỏ qua câu này...</p>
)}
{ex.kind === 'dictation' && dictationWord && (
  <DictationExercise word={dictationWord} onAnswer={handleAnswer} />
)}
```

Sinh round cho 2 kind:

- `cloze`: `makeRound(undefined, pool, undefined, [], 'cloze')` — mở rộng `makeRound` để `onlyKind='cloze'` sinh 10 câu `buildClozeWithOptions(word, getFrames(word.topicId)[0], getExamples(word.id), pool)` (skip câu null, bù câu khác → luôn đủ 10).
- `dictation`: 10 từ ngẫu nhiên từ pool → `round = words.map(w => ({ kind: 'dictation', answer: w.word }))` + state map wordId theo pos (hoặc đơn giản: `makeRound` sinh `DictationExercise` kèm `wordId` — thêm field `wordId: number` vào `DictationExercise` trong `exercises.ts` để `handleAnswer` biết id; test cập nhật theo).

`dictationWord`: tra `getWord(...)` từ `ex` (với field `wordId`).

TDD: thêm test `makeRound(undefined, pool, undefined, [], 'cloze')` → 10 câu toàn cloze có options; `'dictation'` → 10 câu có wordId. Chạy fail → sửa code → pass.

- [ ] **Step 6: Verify**

Run: `npm run dev` → `/practice/cloze` điền được, `/practice/dictation` gõ+kiểm tra (Enter), `/practice/flash` lật thẻ.
Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/exercises/ClozeExercise.tsx src/components/exercises/DictationExercise.tsx src/pages/PracticeRound.tsx src/lib/exercises.ts src/lib/exercises.test.ts
git commit -m "feat: cloze dictation flash practice"
```

---

### Task 17: Settings

**Files:**
- Create: `src/pages/Settings.tsx`

**Interfaces:**
- Sửa daily goal (input number 5–100, lưu ngay); thống kê (tổng từ, streak, số phiên học); nút "Xóa toàn bộ tiến độ" (confirm 2 bước: bấm → hiện "Chắc chắn? Xóa không hoàn tác" → confirm).

- [ ] **Step 1: Viết `src/pages/Settings.tsx`**

```tsx
import { useState } from 'react';
import { useProgress } from '../store/progress';
import { computeStreak, todayStr } from '../lib/review';
import { getIndex } from '../lib/vocab';

export default function Settings() {
  const data = useProgress((s) => s.data);
  const setDailyGoal = useProgress((s) => s.setDailyGoal);
  const resetProgress = useProgress((s) => s.resetProgress);
  const [confirming, setConfirming] = useState(false);
  const streak = computeStreak(data.sessions, todayStr());
  const idx = getIndex();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Cài đặt</h1>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <label htmlFor="goal" className="font-semibold">
          Mục tiêu học mỗi ngày
        </label>
        <div className="mt-2 flex items-center gap-3">
          <input
            id="goal"
            type="number"
            min={5}
            max={100}
            value={data.settings.dailyGoal}
            onChange={(e) => setDailyGoal(Number(e.target.value))}
            className="w-24 rounded-xl border border-slate-300 p-2 text-center focus:border-indigo-500 focus:outline-none"
          />
          <span className="text-sm text-slate-500">từ/ngày (5–100)</span>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Thống kê</h2>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Tổng từ đã học</dt>
            <dd className="font-medium">{data.stats.totalLearned}/{idx.totalWords}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Chuỗi học liên tiếp</dt>
            <dd className="font-medium">{streak} ngày</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Số phiên học</dt>
            <dd className="font-medium">{Object.keys(data.sessions).length}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-white p-4">
        <h2 className="font-semibold text-rose-600">Nguy hiểm</h2>
        {confirming ? (
          <div className="mt-2 space-y-2">
            <p className="text-sm text-slate-600">Xóa toàn bộ tiến độ? Hành động này không hoàn tác.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  resetProgress();
                  setConfirming(false);
                }}
                className="flex-1 rounded-xl bg-rose-600 py-2 text-sm font-medium text-white hover:bg-rose-700"
              >
                Có, xóa hết
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-xl border border-slate-300 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-2 rounded-xl border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            Xóa toàn bộ tiến độ
          </button>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run dev` → `/settings`: đổi goal thấy Dashboard cập nhật; reset 2 bước hoạt động (streak về 0).
Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat: settings daily goal stats reset"
```

---

### Task 18: Error/edge states + polish toàn cục

**Files:**
- Edit: `src/pages/PracticeRound.tsx`, `src/pages/WordDetail.tsx`, `src/pages/LevelDetail.tsx`, `src/pages/TopicDetail.tsx`, `src/pages/Learn.tsx`, `src/components/Layout.tsx`

**Interfaces (kiểm tra từng case):**
- Route không tồn tại (`/xyz`) → trang 404 có link về trang chủ (đã có `*` route — cải thiện text + Link).
- `words/99999`, `topics/xxx`, `levels/XX` → "Không tìm thấy" + link quay lại (đã có ở Task 12/13 — xác nhận).
- Chuỗi `/learn/` với topic đã học hết → "Không có từ nào cần học" (đã có trong Learn — xác nhận).
- Daily goal đạt 0 remaining → Dashboard đổi label "Ôn lại hôm nay" (đã có).
- Không có mạng lúc build → KHÔNG có API call runtime nào (đã ensure: examples bundled; verify bằng grep không còn `dictionaryapi` trong `src/`).
- localStorage đầy → saveProgress nuốt lỗi (đã có).
- Double-click nút trả lời → guard `checked !== null` / `disabled` (đã có — verify ở Dictation/Mcq).

- [ ] **Step 1: Cải thiện 404 trong `src/App.tsx`**

```tsx
<Route
  path="*"
  element={
    <div className="p-8 text-center">
      <p className="text-4xl">🔍</p>
      <p className="mt-2 font-semibold">Không tìm thấy trang</p>
      <Link to="/" className="mt-2 inline-block text-indigo-600">Về trang chủ</Link>
    </div>
  }
/>
```

(thêm `import { Link } from 'react-router-dom';`)

- [ ] **Step 2: Grep verify không còn API call runtime**

Run: `grep -rn "dictionaryapi\|fetch(" src/ || true`
Expected: không có kết quả.

- [ ] **Step 3: QA tay checklist (manual)**

`npm run dev` rồi kiểm lần lượt:
1. Dashboard → Học tiếp → flashcard lật → nhớ → tiến độ tăng.
2. `/learn` khi goal đã đạt → vẫn học được / banner hợp lý.
3. `/practice/mcq` bấm nhanh 2 lần → chỉ tính 1 câu.
4. `/practice/dictation` nhập `Family.` (có dấu chấm) → vẫn đúng (normalize).
5. Reload trang giữa phiên → tiến độ đã lưu không mất.
6. Đổi dailyGoal → Dashboard đổi theo.
7. `/words/1` nút 🔊 phát âm (Chrome).
8. Responsive 375px: bottom nav 4 tab, không tràn.
9. `npm run build && npm run preview` → các route direct-load OK (SPA fallback qua vite preview mặc định — Vercel dùng `vercel.json`).

Sửa lỗi phát hiện trong lúc này (nếu thuộc task hiện có thì sửa luôn, commit kèm).

- [ ] **Step 4: Commit**

```bash
git add -A src/
git commit -m "fix: polish error states + edge cases"
```

---

### Task 19: Deploy Vercel + QA cuối

**Files:**
- Verify: `vercel.json`, `README.md` (tạo nếu chưa có)

- [ ] **Step 1: Build + test cuối**

Run: `npm test && npm run build`
Expected: PASS tất cả test + build OK.

- [ ] **Step 2: Preview qua `vite preview`**

Run: `npm run preview` → mở localhost, QA nhanh 5 đường chính.
Kill server khi xong.

- [ ] **Step 3: Deploy**

Option A (CLI): `npx vercel` → follow prompts (framework: Vite, build: `npm run build`, output: `dist`) → `npx vercel --prod`.
Option B (Dashboard): import repo trên vercel.com → auto-detect Vite → Deploy.

Kiểm tra sau deploy: trang home load, `/learn` hoạt động, direct-load `/settings` không 404.

- [ ] **Step 4: Viết `README.md`**

```markdown
# english_nxt

Học 3011 từ vựng tiếng Anh (A1–B2) kèm phiên âm IPA — giao diện tiếng Việt, tiến độ lưu trên trình duyệt.

## Development

```bash
npm install
npm run dev        # dev server
npm test           # vitest
npm run build      # typecheck + build
npm run extract    # trích lại data từ PDF (cần file PDF gốc)
npm run fetch-examples   # lấy lại ví dụ câu (cần mạng)
```

## Deploy

Static SPA — deploy lên Vercel với `vercel.json` đã cấu hình SPA rewrite.
```

- [ ] **Step 5: Commit cuối + báo cáo**

```bash
git add README.md
git commit -m "docs: readme"
git log --oneline
```

Report: số test pass, kết quả build, URL deploy (nếu có).

---

## Self-Review (trước khi thực thi)

- [ ] Spec coverage: 3011 từ/A1–B2/32 topic/150 frame ✓ (Task 2 test); IPA + audio ✓ (Tasks 7, 12); 5 chế độ ✓ (Tasks 14–16); localStorage + streak + dailyGoal ✓ (Tasks 5, 6, 9, 17); examples bundled ✓ (Tasks 3, 4); Vercel ✓ (Task 1, 19).
- [ ] Mỗi task: files cụ thể, code đầy đủ, test trước, verify command, commit riêng ✓.
- [ ] Rủi ro: trích PDF (Task 2) — có warnings rõ + vòng lặp sửa; `makeRound` signature mở rộng (Tasks 15–16) — TDD điều chỉnh; audio autoplay policy (Task 16) — phát sau gesture + nút bấm lại ✓.

