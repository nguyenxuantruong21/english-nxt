# Thiết kế: english_nxt — Web học từ vựng tiếng Anh kèm phiên âm IPA

- **Ngày:** 2026-10-01
- **Trạng thái:** Đã duyệt bởi người dùng
- **Nguồn dữ liệu:** `3000_tu_tieng_anh_co_phien_am.pdf` (3011 từ, IPA Anh-Mỹ, 32 chủ đề × 4 cấp độ A1–B2, 150 mẫu câu khung theo chủ đề)

## 1. Mục tiêu

Web học từ vựng tiếng Anh hằng ngày, deploy lên Vercel:

- Học từ mới theo cấp độ A1 → B2 và theo 32 chủ đề có sẵn trong PDF.
- Nghe phiên âm IPA bằng Web Speech API.
- Đánh dấu từ đã hoàn thành, đo tiến độ (số từ đã học / tổng số từ) ở tổng thể, theo cấp độ và theo chủ đề.
- Mẫu câu thông dụng cho từng từ (gộp sẵn lúc build) kèm 150 mẫu câu khung theo chủ đề.
- Luyện tập hằng ngày với 5 chế độ: flashcard, trắc nghiệm Anh→Việt, nghe chọn từ, điền mẫu câu (cloze), nghe chép chính tả.

Không có tài khoản, không backend: tiến độ lưu localStorage. UI tiếng Việt, mobile-first.

## 2. Kiến trúc tổng thể

**Stack:** Vite + React + TypeScript + React Router + TailwindCSS + Zustand + Vitest.

Lý do chọn SPA thuần (thay vì Next.js/Astro): ứng dụng 100% phía client (localStorage, Web Speech API), không cần SSR/SEO, build tĩnh deploy zero-config lên Vercel.

```
english_nxt/
├── 3000_tu_tieng_anh_co_phien_am.pdf   (nguồn dữ liệu, giữ nguyên)
├── scripts/
│   ├── extract-pdf.mjs                 (trích xuất PDF → data/vocab.json)
│   └── fetch-examples.mjs              (gộp mẫu câu theo từ → data/examples.json, chạy 1 lần)
├── data/
│   ├── vocab.json                      (commit vào repo — build không cần network)
│   └── examples.json
├── src/
│   ├── pages/          (Dashboard, Levels, Topic, Learn, Practice, WordDetail, Settings)
│   ├── components/      (Flashcard, Exercise*, ProgressBar, AudioButton, WordRow...)
│   ├── lib/             (storage.ts, review.ts, exercises.ts, speech.ts)
│   └── store/           (Zustand store nối storage ↔ UI)
├── public/
├── vercel.json         (SPA rewrite: tất cả route → /index.html)
└── docs/superpowers/specs/
```

**Pipeline dữ liệu (chạy tay khi cần, output commit vào git):**

1. `scripts/extract-pdf.mjs` parse PDF: streams dùng `ASCII85Decode + FlateDecode`; font subset DejaVuSans có ToUnicode CMap (bfchar + bfrange) để map byte → Unicode; tái cấu trúc layout theo tọa độ (Td/TD/Tm/T*) để gộp dòng: số thứ tự từ, từ, IPA, từ loại, nghĩa tiếng Việt, tiêu đề topic + số từ, khung mẫu câu.
   - *Đã test thành công trên trang mẫu:* trích xuất đúng tiếng Việt có dấu, IPA, cấu trúc mục lục (32 topic × 4 level = 128 section).
2. Validate output: đúng 3011 từ; level counts A1=699, A2=1075, B1=817, B2=420; 128 topic-section; mọi từ có `ipa` bắt đầu bằng `/` và kết thúc bằng `/`; mọi từ có nghĩa tiếng Việt không rỗng; word id liên tục 1→3011.
3. `scripts/fetch-examples.mjs` gộp mẫu câu theo từng từ từ nguồn miễn phí (Free Dictionary API, Tatoeba en–vi), lưu `data/examples.json`. Từ không có mẫu câu → fallback khung mẫu câu chủ đề.

## 3. Mô hình dữ liệu

### `data/vocab.json`

```ts
{
  totalWords: 3011,
  levels: [{ id: "A1", name: "Sơ cấp", wordCount: 699 }, /* A2, B1, B2 */],
  topics: [{
    id: "a1-family",              // slug: {level}-{topic-slug}
    level: "A1",
    nameEn: "Family & People",
    nameVi: "Gia đình và con người",
    wordIds: [1, 5, 9, ...],
    frames: [                      // 4–5 khung ___; rỗng [] nếu section này không mang mẫu câu
      { template: "I have ___ brothers and sisters.",
        example: "I have two brothers and one sister." }
    ]
  }],                              // 128 section
  words: [{
    id: 1,                         // số thứ tự trong PDF, 1→3011
    word: "boy",
    ipa: "/bɔɪ/",
    pos: "n.",
    meaningVi: "cậu bé",
    level: "A1",
    topicId: "a1-family"
  }]
}
```

**Về frames:** PDF ghi "150 mẫu câu" cho 32 chủ đề — mỗi topic mang 4–5 khung, và khung nằm ở **đúng một section** của topic đó (cấp độ có nhiều từ nhất, ≥8 từ). Các section còn lại của cùng topic có `frames: []`. App dùng helper `getFrames(sectionId)`: lấy frames của section hiện tại, nếu rỗng thì tìm section cùng `nameEn` ở cấp độ khác.

### `data/examples.json`

```ts
{ [wordId: number]: [{ en: "...", vi: "..." }] }   // 1–3 mẫu câu/từ nếu có
```

### localStorage (key `english_nxt_v1`)

```ts
{
  settings: { dailyGoal: 20 },                              // chỉnh được
  completed: { [wordId]: "2026-10-01" },                    // ngày đánh dấu hoàn thành
  review: { [wordId]: { due: "2026-10-04", interval: 3 } }, // lịch ôn
  sessions: { "2026-10-01": { learned: 18, reviewed: 12,
              exercises: { flashcard: 10, mcq: 5, listen: 3, cloze: 0, dictation: 2 } } },
  stats: { streak: 5, totalLearned: 145 }
}
```

Tiến độ = số `completed` / tổng từ, hiển thị tổng thể, theo cấp độ và theo chủ đề. Schema versioned (`v1`) để sau này migrate. Kèm nút Export/Import file JSON để chuyển tiến độ giữa máy.

## 4. Màn hình & luồng UI

1. **Dashboard (`/`)** — thanh tiến độ tổng `x/3011 (y%)`; vòng tròn tiến độ cấp độ hiện tại; mục tiêu hôm nay `x/20 từ`; nút lớn "Học hôm nay →"; streak; 4 card cấp độ A1→B2 (click → Levels).
2. **Levels (`/level/:level`)** — 32 chủ đề của cấp độ: tên EN/VN, `x/y từ`, mini-progress. Click → Topic.
3. **Topic (`/level/:level/:topic`)** — danh sách từ: checkbox hoàn thành, từ, IPA, nghĩa, nút 🔊. Nút "Học chủ đề này" khởi động session học chủ đề đó. Khung mẫu câu chủ đề hiển thị cuối danh sách.
4. **Learn session (`/learn`)** — phiên hằng ngày: từ mới (flashcard) → từ đến hạn ôn → tổng kết `đã học X · ôn Y · đúng Z%`. Nhận query `?topic=id` để học trọn 1 chủ đề.
5. **Practice (`/practice`)** — hub chọn 1 trong 5 chế độ (hoặc trộn tất cả): trắc nghiệm, nghe chọn từ, điền mẫu câu, chép chính tả, flashcard nhanh. Feedback đúng/sai ngay, phát âm lại khi sai, chạy theo bộ 10 câu, cuối phiên hiện accuracy.
6. **Word detail (`/word/:id`)** — từ + IPA lớn + 🔊 + từ loại + nghĩa VI + mẫu câu của từ (examples.json) + khung chủ đề; nút "Đánh dấu hoàn thành" và "Luyện tập từ này".
7. **Settings (`/settings`)** — daily goal, export/import JSON, reset tiến độ.

## 5. Logic học & ôn tập

**Chọn từ mới mỗi ngày:**
1. Tính số từ thiếu để đạt `dailyGoal` (mặc định 20).
2. Ưu tiên từ chưa học của chủ đề đang học dở → fallback chủ đề đầu tiên của cấp độ hiện tại còn từ chưa học → gợi ý lên cấp khi cấp hiện tại xong.
3. Sắp theo số thứ tự trong PDF (giữ mạch bài bản).

**Lịch ôn tập 1-3-7-14-30:**
- Học xong: `Remember` → interval lên chuỗi [1, 3, 7, 14, 30, 30…]; `Forget` → về interval 1.
- Phiên mỗi ngày = từ mới (theo mục tiêu) + mọi từ có `due <= hôm nay`.
- Từ không học quá 7 ngày so với `due` → coi như quên, reset interval 1.

**Sinh bài tập (lib/exercises.ts):**
- *Trắc nghiệm:* đáp án đúng = nghĩa từ; 3 đáp án nhầm từ cùng level, không trùng nghĩa.
- *Nghe chọn từ:* Web Speech đọc 1 từ (random trong bộ), 4 đáp án từ viết; nút replay.
- *Điền mẫu câu:* lấy `examples.json[wordId][n].en`, che 1 occurrence của từ → `___`; không có example → dùng frame chủ đề; không có frame → bộ câu đó chuyển sang trắc nghiệm.
- *Chép chính tả:* Web Speech đọc → người gõ → so sánh chuẩn hóa (lowercase, trim, bỏ dấu câu cuối).
- *Flashcard:* lật thẻ từ ↔ IPA/nghĩa/mẫu câu; Remember/Forget ghi thẳng lịch ôn.

**Đánh dấu hoàn thành:** chủ động — checkbox tại Topic list hoặc nút tại Word Detail; ghi `completed[wordId] = today`. Xemเฉย ๆ không tự đánh dấu.

## 6. Xử lý lỗi & edge cases

- Web Speech API không khả dụng → ẩn nút 🔊, banner gợi ý Chrome/Edge; bài nghe → hiện phiên âm dạng text, cho phép bỏ qua câu.
- Từ thiếu example & frame → chế độ cloze bỏ qua câu đó (fallback trắc nghiệm).
- localStorage bị chặn (Safari private mode, quota) → bắt exception, hiện banner "không lưu được tiến độ", app vẫn chạy được session hiện tại.
- `vocab.json`/`examples.json` parse lỗi → màn hình lỗi + nút reset.
- Streak: tính theo ngày có session (learned + reviewed > 0); vỡ streak khi thiếu ngày.

## 7. Testing

- **Vitest — logic thuần:**
  - `review.ts`: chuỗi interval, reset khi quên/quá hạn 7 ngày, chọn bộ từ đến hạn.
  - `storage.ts`: đọc/ghi/migrate schema, quota error được bắt.
  - `exercises.ts`: đáp án không trùng, 4 lựa chọn, fallback cloze → mcq, chuẩn hóa dictation.
  - `extract-pdf` validation: 3011 từ, level counts, 128 topic, IPA format `/…/`, nghĩa không rỗng.
- **QA tay:** 5 chế độ luyện tập trên Chrome desktop + mobile; deploy preview trên Vercel.

## 8. Deploy Vercel

- `vercel.json`: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
- Build: `npm run build` → thư mục `dist/` tĩnh.
- Nguồn dữ liệu JSON commit sẵn → build không gọi API ngoài.

## 9. Rủi ro đã biết & chấp nhận

- Giọng đọc Web Speech tùy trình duyệt (Chrome/Edge tốt nhất) — chấp nhận, có fallback text.
- Mẫu câu nguồn free có thể thiếu từ hiếm — fallback khung chủ đề.
- Cấu trúc layout PDF phức tạp (3011 từ, nhiều segment tọa độ) — đã test trích xuất; parser cần chạy validate toàn bộ 55 trang trước khi commit JSON.
