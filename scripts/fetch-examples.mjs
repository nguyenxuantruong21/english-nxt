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
  if (!(key in cache) || cache[key] === 'retry') {
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
