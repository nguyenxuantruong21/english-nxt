# english_nxt

Học 3122 entry / 3011 từ vựng tiếng Anh (A1–B2) kèm phiên âm IPA — giao diện tiếng Việt, tiến độ lưu trên trình duyệt.

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
