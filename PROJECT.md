# PROJECT.md — Vocab SRS App

> File này mô tả toàn bộ ngữ cảnh kỹ thuật của dự án để một coding agent (Claude Code, Cursor, v.v.) có thể đọc và bắt đầu triển khai mà không cần hỏi lại các quyết định kiến trúc cơ bản.

---

## 1. Tổng quan

**Tên dự án:** Vocab SRS App (tạm đặt)
**Mô tả 1 dòng:** Web app học từ vựng tiếng Anh — nhập một từ, hệ thống tự động làm giàu dữ liệu (phát âm, ví dụ, giới từ, họ từ, chủ đề) bằng AI, sau đó ôn tập theo thuật toán lặp lại ngắt quãng (SM-2), có chế độ ôn gấp trước kỳ thi.

**Ràng buộc thiết kế quan trọng nhất:** chi phí vận hành phải gần 0đ ở giai đoạn MVP/vài nghìn người dùng đầu. Mọi quyết định kỹ thuật (dedupe dữ liệu, không lưu file audio, cache kết quả AI...) đều phục vụ ràng buộc này — **không tự ý đổi sang giải pháp tốn phí hơn** nếu không có yêu cầu rõ ràng.

---

## 2. Tech stack

| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui | SSR, responsive |
| Backend | Next.js API Routes (hoặc Supabase Edge Functions cho job nền) | Không dựng backend riêng |
| Database + Auth | Supabase (PostgreSQL, Auth, RLS) | Auth qua Email + Google OAuth |
| Từ điển cơ bản | Free Dictionary API — `https://api.dictionaryapi.dev/api/v2/entries/en/{word}` | Lấy IPA + audio_url, miễn phí, không cần key |
| AI enrichment | Gemini 2.5 Flash API (Structured Output / JSON Schema) | Chỉ gọi 1 lần / từ mới duy nhất trong toàn hệ thống |
| Audio fallback | Web Speech API (`window.speechSynthesis`) | Chạy phía client khi không có `audio_url` |
| Hosting | Vercel | Deploy từ Git |

**Không dùng:** dịch vụ TTS trả phí, dịch vụ embedding/clustering, backend riêng (Express/Nest...), ORM nặng nếu không cần thiết (ưu tiên Supabase client / SQL trực tiếp).

---

## 3. Kiến trúc & luồng dữ liệu

```
Client (Next.js)
   │
   ├─ POST /api/words            → thêm từ mới (xem mục 6)
   ├─ GET  /api/reviews/due      → lấy danh sách từ đến hạn ôn
   ├─ POST /api/reviews/:id      → submit kết quả ôn (rating 1-4) → chạy SM-2
   ├─ GET  /api/topics           → danh sách chủ đề + số từ mỗi chủ đề
   └─ POST /api/cram-sessions    → tạo phiên ôn gấp từ danh sách word_id

Server (API Routes)
   │
   ├─ Supabase client (service role cho ghi bảng `words`,
   │                    anon/user JWT cho bảng cá nhân)
   ├─ Free Dictionary API (fetch IPA/audio)
   └─ Gemini API (structured output JSON)
```

**Nguyên tắc dedupe bắt buộc:** trước khi gọi AI, luôn kiểm tra `words` theo `headword` (không phân biệt hoa/thường, trim khoảng trắng). Chỉ gọi Gemini + Free Dictionary API khi từ **chưa tồn tại trong toàn hệ thống** — không phải chưa tồn tại với riêng user hiện tại.

---

## 4. Database schema (Supabase / Postgres)

Đã có sẵn migration SQL đầy đủ — agent nên áp dụng đúng như dưới, không tự đổi kiểu dữ liệu:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Từ điển dùng chung toàn hệ thống (KHÔNG theo user)
CREATE TABLE public.words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    headword VARCHAR(100) NOT NULL UNIQUE,
    ipa VARCHAR(100),
    audio_url TEXT,
    meaning_vi TEXT NOT NULL,
    word_family JSONB DEFAULT '[]'::jsonb,   -- [{part_of_speech, word, meaning_vi}]
    prepositions JSONB DEFAULT '[]'::jsonb,  -- [{pattern, explanation, example}]
    examples JSONB DEFAULT '[]'::jsonb,      -- [{en, vi}]
    topics TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_words_headword ON public.words (headword);

-- Tiến độ học cá nhân (bảng cầu nối user <-> word)
CREATE TABLE public.user_vocabulary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
    repetition_level INT DEFAULT 0,
    interval_days INT DEFAULT 1,
    ease_factor NUMERIC(3,2) DEFAULT 2.50,
    next_review_at TIMESTAMPTZ DEFAULT NOW(),
    is_urgent_review BOOLEAN DEFAULT FALSE,
    urgent_priority INT DEFAULT 1,
    personal_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, word_id)
);
CREATE INDEX idx_user_vocab_due ON public.user_vocabulary (user_id, next_review_at);
CREATE INDEX idx_user_vocab_urgent ON public.user_vocabulary (user_id, is_urgent_review);

-- Thống kê học theo ngày (vĩnh viễn, nhẹ)
CREATE TABLE public.daily_study_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    study_date DATE NOT NULL DEFAULT CURRENT_DATE,
    cards_reviewed INT DEFAULT 0,
    successful_reviews INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, study_date)
);

-- Lịch sử ôn chi tiết (chỉ giữ ngắn hạn, dọn định kỳ)
CREATE TABLE public.review_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 4), -- 1 Again 2 Hard 3 Good 4 Easy
    reviewed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_review_logs_created ON public.review_logs (reviewed_at);

ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_study_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for words" ON public.words FOR SELECT USING (true);
CREATE POLICY "Users access own vocabulary" ON public.user_vocabulary FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own stats" ON public.daily_study_stats FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own logs" ON public.review_logs FOR ALL USING (auth.uid() = user_id);
```

> Cleanup job (chạy định kỳ, ví dụ Supabase Cron 1 lần/ngày):
> ```sql
> DELETE FROM public.review_logs WHERE reviewed_at < NOW() - INTERVAL '60 days';
> ```

---

## 5. Biến môi trường cần thiết

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # chỉ dùng ở server, không lộ ra client
GEMINI_API_KEY=
```

---

## 6. API contract chi tiết

### `POST /api/words` — thêm từ mới cho user hiện tại
**Input:** `{ "headword": string }`
**Logic bắt buộc theo thứ tự:**
1. Chuẩn hóa `headword` (lowercase, trim).
2. Query `words` theo `headword`.
   - **Nếu có** → bỏ qua bước gọi AI/Dictionary, đi thẳng bước 4.
   - **Nếu chưa có** → bước 3.
3. Gọi song song:
   - Gemini API với JSON Schema ở mục 7 → `word_family`, `prepositions`, `examples`, `topics`, `meaning_vi`.
   - Free Dictionary API → `ipa`, `audio_url` (lấy phần tử đầu tiên có phonetic audio non-empty).
   Insert vào `words`.
4. Upsert vào `user_vocabulary` (unique theo `user_id + word_id`), giá trị mặc định: `repetition_level=0, interval_days=1, ease_factor=2.5, next_review_at=NOW()`.
5. Trả về bản ghi `words` + `user_vocabulary` gộp lại cho client.

**Lỗi cần xử lý:** Free Dictionary API trả 404 khi từ không tồn tại trong từ điển (vẫn cho phép lưu, chỉ để `ipa`/`audio_url` = null, dựa vào Web Speech API ở client). Gemini API timeout/lỗi → trả lỗi rõ ràng cho client, không insert dữ liệu rác vào `words`.

### `GET /api/reviews/due`
Trả danh sách `user_vocabulary` của user hiện tại có `next_review_at <= NOW()`, join với `words` để lấy nội dung hiển thị flashcard. Sắp theo `next_review_at` tăng dần.

### `POST /api/reviews/:user_vocabulary_id`
**Input:** `{ "rating": 1 | 2 | 3 | 4 }`
**Logic:** chạy hàm `calculateNextReview()` (mục 8), update `user_vocabulary`, insert 1 dòng vào `review_logs`, upsert/increment `daily_study_stats` theo ngày hiện tại.
**Ràng buộc:** route này **không dùng cho Cram Mode** — kết quả Cram Mode không được ghi vào `interval_days`/`next_review_at`.

### `GET /api/topics`
Trả danh sách topic duy nhất (từ mảng `topics` trong `words` mà user hiện tại đang học) kèm số lượng từ mỗi topic.

### `POST /api/cram-sessions`
**Input:** `{ "word_ids": string[] }` hoặc `{ "topic": string }` (chọn theo chủ đề).
**Logic:** đánh dấu `is_urgent_review = true` trên các dòng `user_vocabulary` tương ứng. Trả về danh sách từ để render 3 dạng bài luyện (trắc nghiệm, điền từ, nghe-chép). Không tạo bảng riêng trừ khi cần lưu lịch sử phiên ôn gấp — nếu cần, có thể mở rộng thêm bảng `cram_sessions` sau, không bắt buộc ở bản đầu.

---

## 7. JSON Schema cho Gemini structured output

```json
{
  "type": "OBJECT",
  "properties": {
    "headword": { "type": "STRING" },
    "meaning_vi": { "type": "STRING" },
    "word_family": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "part_of_speech": { "type": "STRING", "enum": ["verb", "noun", "adjective", "adverb"] },
          "word": { "type": "STRING" },
          "meaning_vi": { "type": "STRING" }
        },
        "required": ["part_of_speech", "word", "meaning_vi"]
      }
    },
    "prepositions": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "pattern": { "type": "STRING" },
          "explanation": { "type": "STRING" },
          "example": { "type": "STRING" }
        },
        "required": ["pattern", "explanation"]
      }
    },
    "examples": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": { "en": { "type": "STRING" }, "vi": { "type": "STRING" } },
        "required": ["en", "vi"]
      }
    },
    "topics": { "type": "ARRAY", "items": { "type": "STRING" } }
  },
  "required": ["headword", "meaning_vi", "word_family", "prepositions", "examples", "topics"]
}
```

Prompt cho Gemini nên gửi kèm danh sách topic cố định để AI chọn (ví dụ: `["Du lịch","Công việc","Học thuật","Đời sống","Công nghệ","Sức khỏe","Tài chính"]`) — tránh AI tự sinh nhãn tự do gây phân mảnh dữ liệu.

---

## 8. Thuật toán ôn luyện — SM-2

File gợi ý: `lib/srs.ts`

```typescript
export interface ReviewInput {
  repetitionLevel: number;
  intervalDays: number;
  easeFactor: number;
  rating: 1 | 2 | 3 | 4; // 1 Again, 2 Hard, 3 Good, 4 Easy
}

export function calculateNextReview(data: ReviewInput) {
  let { repetitionLevel, intervalDays, easeFactor, rating } = data;

  if (rating === 1) {
    repetitionLevel = 0;
    intervalDays = 1;
  } else {
    if (repetitionLevel === 0) intervalDays = 1;
    else if (repetitionLevel === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
    repetitionLevel += 1;
  }

  easeFactor = easeFactor + (0.1 - (4 - rating) * (0.08 + (4 - rating) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

  return {
    repetitionLevel,
    intervalDays,
    easeFactor: parseFloat(easeFactor.toFixed(2)),
    nextReviewAt: nextReviewDate,
  };
}
```

**Không tự thay đổi hằng số trong công thức** (0.1, 0.08, 0.02, ngưỡng 1.3, mốc interval 1/6 ngày cho lần ôn đầu) trừ khi được yêu cầu — đây là công thức SM-2 chuẩn.

---

## 9. Cram Mode — chi tiết hành vi

- Tách biệt hoàn toàn khỏi hàng đợi SRS: dùng cờ `is_urgent_review` trên `user_vocabulary`, không tạo `interval_days` riêng.
- 3 dạng bài bắt buộc có ở bản đầu tiên:
  1. Trắc nghiệm chọn giới từ/dạng từ đúng (dựa vào `prepositions` / `word_family`).
  2. Điền từ vào chỗ trống (ẩn headword trong 1 câu từ `examples`).
  3. Nghe & chép chính tả (phát `audio_url` hoặc Web Speech API, người dùng gõ lại từ).
- Kết quả các bài luyện Cram Mode **chỉ hiển thị điểm số phiên**, tuyệt đối không gọi tới `calculateNextReview()`.

---

## 10. Cấu trúc thư mục đề xuất (Next.js App Router)

```
app/
  api/
    words/route.ts
    reviews/due/route.ts
    reviews/[id]/route.ts
    topics/route.ts
    cram-sessions/route.ts
  (dashboard)/
    page.tsx                 # due today, streak, tổng số từ
  words/
    page.tsx                 # form nhập từ + kết quả enrichment
  review/
    page.tsx                 # flashcard SRS
  cram/
    page.tsx                 # giao diện ôn gấp
lib/
  supabase/
    client.ts                # anon client (browser)
    server.ts                # service role client (server-only)
  srs.ts                     # calculateNextReview
  ai/
    gemini.ts                # gọi Gemini + JSON schema
  dictionary.ts               # gọi Free Dictionary API
types/
  db.ts                       # types khớp với schema ở mục 4
```

---

## 11. Việc KHÔNG làm (out of scope cho bản đầu)

- Không tự thêm hệ thống thanh toán/subscription.
- Không dựng embedding/clustering cho phân loại chủ đề — chỉ dùng AI gán tag trực tiếp cho tới khi có yêu cầu khác.
- Không lưu file audio nhị phân vào Storage — chỉ lưu URL hoặc dùng Web Speech API.
- Không gọi AI enrichment lại cho từ đã tồn tại trong `words`, kể cả khi user khác thêm cùng từ đó.
- Không dùng route `/api/reviews/:id` để cập nhật kết quả Cram Mode.

---

## 12. Checklist triển khai cho agent

- [ ] Khởi tạo Next.js + Tailwind + shadcn/ui, kết nối Supabase project
- [ ] Chạy migration SQL ở mục 4, xác nhận RLS hoạt động đúng qua test đăng nhập 2 user khác nhau
- [ ] Viết `lib/dictionary.ts`, `lib/ai/gemini.ts`, `lib/srs.ts`
- [ ] Implement `POST /api/words` đúng thứ tự dedupe → AI → Dictionary → insert → upsert
- [ ] Implement `GET /api/reviews/due` + `POST /api/reviews/:id`
- [ ] Giao diện flashcard ôn tập (lật thẻ, nút Again/Hard/Good/Easy, phát audio)
- [ ] Implement `GET /api/topics` + bộ lọc theo chủ đề
- [ ] Implement `POST /api/cram-sessions` + 3 dạng bài luyện gấp
- [ ] Cron job dọn `review_logs` > 60 ngày
- [ ] Deploy Vercel, cấu hình biến môi trường ở mục 5
