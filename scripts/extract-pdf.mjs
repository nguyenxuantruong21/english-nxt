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
const EXPECTED_COUNTS = { A1: 717, A2: 1139, B1: 841, B2: 425 };
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
  for (let c = 0; c < 2; c++) {
    const col = cols[c];
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
        if (t.startsWith('/') && t.length > 2) {
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
          if (peek.some((r) => r.text.startsWith('/') && r.text.length > 2)) {
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
      else
        entries.push({
          id,
          word,
          ipa: col[ipaIdx].text,
          pos: col[posIdx].text,
          meaningVi: meaning,
          side: c,
          xs: {
            id: col[i].x,
            word: col[i + 1] ? col[i + 1].x : null,
            ipa: col[ipaIdx].x,
            mean: col[posIdx + 1] ? col[posIdx + 1].x : null,
          },
        });
      i = next;
    }
  }
  return entries;
}

function mergeStructure(row, lastEntry) {
  for (const side of [0, 1]) {
    const last = lastEntry[side];
    if (!last) continue;
    const runs = row.runs.filter((r) => (side === 0 ? r.x < COL_SPLIT : r.x >= COL_SPLIT));
    if (runs.length === 0) continue;
    const gap = last.y - row.y;
    if (!(gap > 0 && gap <= 12)) continue;
    const e = last.e;
    if (e.xs.id != null && runs.every((r) => Math.abs(r.x - e.xs.id) < 0.6 && /^\d+$/.test(r.text))) {
      e.id = Number(`${e.id}${runs.map((r) => r.text).join('')}`);
      continue;
    }
    let wordPart = '';
    let ipaPart = '';
    let meanPart = '';
    for (const r of runs) {
      if (e.xs.word != null && Math.abs(r.x - e.xs.word) < 0.6) wordPart += r.text;
      else if (e.xs.ipa != null && Math.abs(r.x - e.xs.ipa) < 0.6) ipaPart += r.text;
      else if (e.xs.mean != null && Math.abs(r.x - e.xs.mean) < 0.6) meanPart += r.text;
    }
    if (!wordPart && !ipaPart && !meanPart) continue;
    if (ipaPart) e.ipa = `${e.ipa} ${ipaPart}`;
    if (wordPart) {
      const tokens = e.word.trim().split(/\s+/).filter(Boolean).length;
      const groups = e.ipa.split(/\s+/).filter(Boolean).length;
      e.word += (wordPart.length <= 2 || groups < tokens + 1 ? '' : ' ') + wordPart;
    }
    if (meanPart) e.meaningVi = `${e.meaningVi} ${meanPart}`;
  }
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
let lastEntry = [null, null];
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
      lastEntry = [null, null];
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
      lastEntry = [null, null];
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
      for (const e of entries) {
        currentSection.parsed.push(e);
        lastEntry[e.side] = { e, y: row.y };
      }
      continue;
    }
    if (framesActive && currentSection) {
      const joined = texts.join(' ').trim();
      if (joined.startsWith('→')) {
        if (lastTemplate) {
          currentSection.frames.push({ template: lastTemplate, example: joined.replace(/^→\s*/, '') });
          lastTemplate = null;
        }
      } else if (row.runs.some((r) => Math.abs(r.x - 45) < 1.5)) {
        lastTemplate = joined;
      }
      continue;
    }
    if (!framesActive) mergeStructure(row, lastEntry);
  }
}

let offset = 0;
for (const lv of LEVEL_ORDER) {
  for (const s of sections) {
    if (s.level !== lv) continue;
    s.parsed.sort((a, b) => a.id - b.id);
    for (const e of s.parsed) e.id += offset;
    s.wordIds = s.parsed.map((e) => e.id);
    if (s.wordIds.length !== s.wordCount) {
      warnings.push(`${s.id}: header=${s.wordCount} thực tế=${s.wordIds.length}`);
    }
    for (const e of s.parsed) {
      if (!e.ipa.endsWith('/')) warnings.push(`ipa chưa đóng: ${s.id} id=${e.id} ipa=${e.ipa}`);
    }
  }
  offset += sections
    .filter((s) => s.level === lv)
    .reduce((n, s) => n + s.parsed.length, 0);
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
if (words.length !== 3122) warnings.push(`tổng từ = ${words.length}, mong đợi 3122`);

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
