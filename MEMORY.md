# MEMORY.md — Vocab SRS App Project Memory

Tài liệu này lưu lại trạng thái, tiến độ và các quyết định kỹ thuật đã hoàn thành của dự án Vocab SRS App.

---

## 1. Trạng thái hiện tại của dự án
- **Giai đoạn:** Đã hoàn thành toàn bộ MVP (Khởi tạo, Cơ sở dữ liệu, Core APIs, UI Dashboard/Flashcard/Cram, và Kiểm thử tự động).
- **Mã nguồn:** Đã lưu trữ và commit đầy đủ vào Git (`git commit`).
- **Build Status:** `npm run build` thành công 100%, không lỗi TypeScript/Lint.

---

## 2. Các công việc đã hoàn thành

### A. Tầng Cơ sở dữ liệu (Supabase PostgreSQL)
- Chạy thành công toàn bộ migration SQL:
  - Bảng `words`: Từ điển dùng chung toàn hệ thống (Dedupe theo `headword`).
  - Bảng `user_vocabulary`: Tiến độ học cá nhân (cầu nối `user_id` <-> `word_id`, cờ `is_urgent_review`).
  - Bảng `daily_study_stats`: Thống kê số thẻ đã ôn và số lượt thành công theo ngày.
  - Bảng `review_logs`: Ghi nhận lịch sử đánh giá (1-4).
  - Đã bật RLS (Row Level Security) và phân quyền policy cho từng bảng.

### B. Core Utilities & Algorithms (`lib/`)
- [`lib/srs.ts`](file:///d:/DATA/Learn_Vocabulary/lib/srs.ts): Cài đặt chuẩn thuật toán lặp ngắt quãng SM-2 (repetitionLevel, intervalDays, easeFactor, rating 1-4).
- [`lib/dictionary.ts`](file:///d:/DATA/Learn_Vocabulary/lib/dictionary.ts): Tích hợp Free Dictionary API để lấy IPA và audio URL (có fallback an toàn khi 404).
- [`lib/ai/gemini.ts`](file:///d:/DATA/Learn_Vocabulary/lib/ai/gemini.ts): Tích hợp Google Gen AI SDK với mô hình **`gemini-3.6-flash`** và Structured JSON Output (lấy nghĩa tiếng Việt, bảng họ từ, cụm giới từ cấu trúc, ví dụ song ngữ và gán nhãn chủ đề theo danh sách chuẩn).
- [`lib/audio.ts`](file:///d:/DATA/Learn_Vocabulary/lib/audio.ts): Tiện ích phát âm thanh tự động fallback về Web Speech API (`window.speechSynthesis`) khi từ điển không có file mp3.
- [`lib/auth-helper.ts`](file:///d:/DATA/Learn_Vocabulary/lib/auth-helper.ts): Tự động trích xuất user từ Supabase Auth JWT hoặc đảm bảo demo user hợp lệ trong `auth.users` để trải nghiệm dev không bị chặn bởi foreign key.
- [`lib/supabase/`](file:///d:/DATA/Learn_Vocabulary/lib/supabase/): Cấu hình Client (anon key cho browser) và Server (service role cho backend).

### C. API Routes (`app/api/`)
- `POST /api/words`: Chuẩn hóa headword $\rightarrow$ Dedupe toàn hệ thống $\rightarrow$ Gọi song song Gemini 3.6 Flash & Free Dictionary $\rightarrow$ Insert `words` $\rightarrow$ Upsert `user_vocabulary`.
- `GET /api/reviews/due`: Lấy danh sách từ vựng đến hạn ôn tập (`next_review_at <= NOW()`).
- `POST /api/reviews/[id]`: Cập nhật SM-2 sau mỗi lần lật thẻ, ghi log vào `review_logs`, cập nhật số liệu `daily_study_stats`.
- `GET /api/topics`: Thống kê danh sách các chủ đề và số từ vựng tương ứng của người dùng.
- `POST /api/cram-sessions`: Đánh dấu cờ `is_urgent_review = true` và lấy danh sách từ cho phiên ôn gấp.

### D. Giao diện người dùng (`app/` & `components/`)
- [`components/Navbar.tsx`](file:///d:/DATA/Learn_Vocabulary/components/Navbar.tsx): Thanh điều hướng hiện đại (Dashboard, Thêm từ, Ôn tập SRS, Ôn gấp Cram Mode).
- [`app/page.tsx`](file:///d:/DATA/Learn_Vocabulary/app/page.tsx): Dashboard hiển thị số từ cần ôn hôm nay, tổng từ trong kho, danh mục chủ đề và nút tắt.
- [`app/words/page.tsx`](file:///d:/DATA/Learn_Vocabulary/app/words/page.tsx): Form thêm từ và hiển thị kết quả làm giàu dữ liệu chi tiết (IPA, phát âm, họ từ, giới từ, ví dụ song ngữ).
- [`app/review/page.tsx`](file:///d:/DATA/Learn_Vocabulary/app/review/page.tsx): Flashcard tương tác lật 2 mặt kèm 4 nút đánh giá chuẩn SM-2 và hiệu ứng confetti khi hoàn thành.
- [`app/cram/page.tsx`](file:///d:/DATA/Learn_Vocabulary/app/cram/page.tsx): Chế độ ôn gấp trước kỳ thi với 3 dạng bài tập riêng biệt:
  1. Trắc nghiệm chọn nghĩa đúng.
  2. Điền từ vào chỗ trống trong câu ví dụ.
  3. Nghe phát âm và chép chính tả từ vựng.

### E. Kiểm thử tự động (`test-cases.js`)
- Đã xây dựng kịch bản kiểm thử tự động 6 ca kiểm tra:
  - Test 1: Thêm từ mới (`resilient`) $\rightarrow$ Thành công.
  - Test 2: Kiểm tra Dedupe cache toàn hệ thống $\rightarrow$ Thành công.
  - Test 3: Lấy từ cần ôn (`reviews/due`) $\rightarrow$ Thành công.
  - Test 4: Gửi kết quả đánh giá SM-2 (Rating 3) $\rightarrow$ Thành công, lịch ôn tự động dời sang ngày tiếp theo.
  - Test 5: Tổng hợp danh mục chủ đề (`topics`) $\rightarrow$ Thành công.
  - Test 6: Bắt đầu phiên Cram Mode (`cram-sessions`) $\rightarrow$ Thành công.

---

## 3. Lệnh vận hành dự án
- **Chạy môi trường Dev:** `npm run dev` (mở tại `http://localhost:3000`)
- **Chạy bộ kiểm thử tự động:** `node test-cases.js`
- **Build kiểm tra lỗi TypeScript:** `npm run build`
- **Chạy production:** `npm run start`

---

## 4. Các bước tiếp theo (Next Steps / Roadmap)
- [ ] Tích hợp giao diện đăng nhập / đăng ký chính thức qua Google OAuth & Email (Supabase Auth UI).
- [ ] Thiết lập Cron Job dọn dẹp `review_logs > 60 ngày` trên Supabase (như quy định trong `PROJECT.md`).
- [ ] Triển khai dự án lên Vercel và cấu hình biến môi trường production.
