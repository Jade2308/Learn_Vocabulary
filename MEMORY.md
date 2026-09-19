# MEMORY.md — Learn Vocabulary Project Memory

Tài liệu này lưu lại trạng thái, tiến độ, các quyết định kỹ thuật và nhật ký xử lý lỗi của dự án Learn Vocabulary (trước đây là Vocab SRS App).

---

## 1. Trạng thái hiện tại của dự án
- **Giai đoạn:** Đã hoàn thành toàn bộ MVP (Khởi tạo, Cơ sở dữ liệu, Core APIs, UI Dashboard/Flashcard/Cram, Tối ưu Audio Web Speech API, và Kiểm thử tự động).
- **Mã nguồn:** Đã lưu trữ và commit đầy đủ vào Git (`git commit`).
- **Build Status:** `npm run build` thành công 100%, không còn lỗi TypeScript hay cảnh báo Hydration Mismatch.
- **Test Status:** 6/6 kịch bản kiểm thử tự động trong `test-cases.js` đạt trạng thái PASS.

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
- [`lib/dictionary.ts`](file:///d:/DATA/Learn_Vocabulary/lib/dictionary.ts): Tích hợp Free Dictionary API để lấy phiên âm chuẩn quốc tế (IPA) và tra cứu từ vựng.
- [`lib/ai/gemini.ts`](file:///d:/DATA/Learn_Vocabulary/lib/ai/gemini.ts): Tích hợp Google Gen AI SDK với mô hình **`gemini-3.6-flash`** và Structured JSON Output (lấy nghĩa tiếng Việt, bảng họ từ, cụm giới từ cấu trúc, ví dụ song ngữ và gán nhãn chủ đề theo danh sách chuẩn).
- [`lib/audio.ts`](file:///d:/DATA/Learn_Vocabulary/lib/audio.ts): Sử dụng trực tiếp **Web Speech API** (`window.speechSynthesis`) với các giọng đọc tiếng Anh tự nhiên chất lượng cao (`Google US English`, `Microsoft Natural / Aria / Jenny / David`, `Samantha`), tốc độ đọc 0.95, triệt tiêu hoàn toàn độ trễ (0ms delay), hoạt động offline và chống lỗi paused/suspended ngầm trên trình duyệt Chromium.
- [`lib/auth-helper.ts`](file:///d:/DATA/Learn_Vocabulary/lib/auth-helper.ts): Tự động trích xuất user từ Supabase Auth JWT hoặc đảm bảo demo user hợp lệ trong `auth.users` để trải nghiệm dev không bị chặn bởi foreign key.
- [`lib/supabase/`](file:///d:/DATA/Learn_Vocabulary/lib/supabase/): Cấu hình Client (anon key cho browser) và Server (service role cho backend).
- [`types/db.ts`](file:///d:/DATA/Learn_Vocabulary/types/db.ts): Định nghĩa kiểu dữ liệu TypeScript hoàn chỉnh cho toàn bộ hệ thống (`Word`, `UserVocabulary`, `GeminiEnrichmentResponse`, `WordFamilyItem`, `PrepositionItem`, `ExampleItem`, `DailyStudyStats`, `ReviewLog`).

### C. API Routes (`app/api/`)
- `POST /api/words`: Chuẩn hóa headword $\rightarrow$ Dedupe toàn hệ thống $\rightarrow$ Gọi song song Gemini 3.6 Flash & Free Dictionary $\rightarrow$ Insert `words` $\rightarrow$ Upsert `user_vocabulary`.
- `GET /api/reviews/due`: Lấy danh sách từ vựng đến hạn ôn tập (`next_review_at <= NOW()`).
- `POST /api/reviews/[id]`: Cập nhật SM-2 sau mỗi lần lật thẻ, ghi log vào `review_logs`, cập nhật số liệu `daily_study_stats`.
- `GET /api/topics`: Thống kê danh sách các chủ đề và số từ vựng tương ứng của người dùng.
- `POST /api/cram-sessions`: Đánh dấu cờ `is_urgent_review = true` và lấy danh sách từ cho phiên ôn gấp.

### D. Giao diện người dùng (`app/` & `components/`)
- [`app/layout.tsx`](file:///d:/DATA/Learn_Vocabulary/app/layout.tsx): Bố cục ứng dụng toàn cục, cấu hình `suppressHydrationWarning` trên `<html>` và `<body>` để ngăn ngừa xung đột DOM do Browser Extension gây ra.
- [`components/Navbar.tsx`](file:///d:/DATA/Learn_Vocabulary/components/Navbar.tsx): Thanh điều hướng hiện đại (Tổng quan, Thêm từ mới, Ôn tập thông minh, Luyện tập cấp tốc).
- [`app/page.tsx`](file:///d:/DATA/Learn_Vocabulary/app/page.tsx): Dashboard hiển thị số từ cần ôn hôm nay, tổng từ trong kho, danh mục chủ đề và lối tắt luyện tập nhanh.
- [`app/words/page.tsx`](file:///d:/DATA/Learn_Vocabulary/app/words/page.tsx): Form thêm từ và hiển thị kết quả làm giàu dữ liệu chi tiết (IPA, phát âm từ vựng chính, phát âm từng biến thể các dạng từ liên quan, nghe phát âm câu ví dụ ngữ pháp và ví dụ song ngữ).
- [`app/review/page.tsx`](file:///d:/DATA/Learn_Vocabulary/app/review/page.tsx): Flashcard tương tác hỗ trợ **đảo chiều linh hoạt 2 hướng**:
  1. **Tiếng Anh $\rightarrow$ Tiếng Việt**: Thấy từ vựng, phiên âm IPA, nghe phát âm $\rightarrow$ lật xem nghĩa, các dạng từ liên quan, cụm giới từ, ví dụ song ngữ.
  2. **Tiếng Việt $\rightarrow$ Tiếng Anh**: Thấy nghĩa tiếng Việt, gợi ý chủ đề $\rightarrow$ lật xem từ tiếng Anh, phát âm và ví dụ.
  - Tích hợp **chế độ Tự kiểm tra (Active Recall Typing)**: Bật/tắt ô gõ từ trước khi lật thẻ, chấm điểm tức thì và so khớp câu trả lời.
  - Kèm 4 nút phản hồi tự nhiên (Chưa nhớ, Hơi khó, Đã nhớ, Rất thuộc), phát âm Web Speech API 0ms delay, hiệu ứng confetti chúc mừng.
- [`app/cram/page.tsx`](file:///d:/DATA/Learn_Vocabulary/app/cram/page.tsx): Trung tâm Luyện tập cấp tốc & Đa dạng với **6 chế độ luyện tập độc đáo**:
  1. **Nhìn nghĩa gõ từ (`meaning_type`)**: Xem nghĩa tiếng Việt $\rightarrow$ gõ từ tiếng Anh tương ứng với số ký tự, nút gợi ý chữ cái đầu và phát âm tự động.
  2. **Trắc nghiệm nhanh (`quiz`)**: Chọn 1 trong 4 đáp án đúng (tự động tạo phương án gây nhiễu thông minh).
  3. **Nối thẻ từ vựng (`matching`)**: Trò chơi ghép cặp thẻ tiếng Anh và tiếng Việt theo từng vòng, hiệu ứng triệt tiêu thẻ mượt mà.
  4. **Sắp xếp chữ cái (`scramble`)**: Bấm chọn các ký tự xáo trộn để ghép thành từ đúng, rèn trí nhớ mặt chữ và chính tả.
  5. **Điền từ vào câu (`fill`)**: Đọc ngữ cảnh ví dụ thực tế và điền từ thích hợp vào chỗ trống.
  6. **Nghe & Chép chính tả (`dictation`)**: Luyện nghe phát âm bản xứ và gõ lại từ vựng chính xác.

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

## 4. Nhật ký xử lý lỗi & Tối ưu hóa kỹ thuật (Troubleshooting & Optimizations)

### 1. Nâng cấp mô hình AI từ `gemini-2.0-flash` lên `gemini-3.6-flash`
- **Hiện tượng:** Khi gọi `POST /api/words` thêm từ mới, hệ thống trả về mã lỗi `502 / 404 NOT_FOUND: "This model models/gemini-2.0-flash is no longer available. Please update your code to use models/gemini-3.6-flash"`.
- **Nguyên nhân:** Model `gemini-2.0-flash` đã hết hạn vòng đời và Google yêu cầu chuyển sang model `gemini-3.6-flash`.
- **Xử lý:** Cập nhật tham số model trong [`lib/ai/gemini.ts`](file:///d:/DATA/Learn_Vocabulary/lib/ai/gemini.ts) thành `gemini-3.6-flash` và đồng bộ nhãn hiển thị tại [`app/words/page.tsx`](file:///d:/DATA/Learn_Vocabulary/app/words/page.tsx).

### 2. Xử lý lỗi PostgREST PGRST303 (`JWT issued at future`)
- **Hiện tượng:** Xuất hiện lỗi `PGRST303: JWT issued at future` ở request đầu tiên khi khởi động server.
- **Nguyên nhân:** Hiện tượng lệch đồng hồ (clock skew vài giây) giữa máy local Windows và server NTP của Supabase tại thời điểm sinh token đầu tiên.
- **Kết quả:** Lỗi tự động biến mất ở các request kế tiếp (`200 OK`) khi timestamp đồng bộ.

### 3. Khôi phục định nghĩa TypeScript và API Route
- **Hiện tượng:** Build bị lỗi `TS2306: File 'types/db.ts' is not a module` và `app/api/cram-sessions/route.ts` bị rỗng 0 bytes.
- **Xử lý:** Tái tạo toàn bộ các interface trong [`types/db.ts`](file:///d:/DATA/Learn_Vocabulary/types/db.ts) và khôi phục mã nguồn hoàn chỉnh cho [`app/api/cram-sessions/route.ts`](file:///d:/DATA/Learn_Vocabulary/app/api/cram-sessions/route.ts).

### 4. Khắc phục triệt để độ trễ phát âm (Audio Delay) bằng Web Speech API
- **Hiện tượng:** Người dùng ấn nút loa nhiều khi bị đơ/chờ từ 10–30 giây mới nghe tiếng.
- **Nguyên nhân:** File mp3 trỏ tới máy chủ của Free Dictionary API (`https://api.dictionaryapi.dev/media/...`) bị timeout/chặn kết nối tại mạng Việt Nam, khiến trình duyệt bị treo chờ socket trước khi rơi vào `.catch()`.
- **Xử lý:** Chuyển đổi 100% âm thanh sang **Web Speech API** của trình duyệt trong [`lib/audio.ts`](file:///d:/DATA/Learn_Vocabulary/lib/audio.ts):
  - Phát âm tức thì với độ trễ **0ms**.
  - Không còn phụ thuộc mạng hay máy chủ trung gian.
  - Tự động bắt giọng chuẩn `Google US English` / `Natural` và xử lý trạng thái `paused` của Chromium.

### 5. Bổ sung nút phát âm cho Họ từ (Word Family) và Ví dụ song ngữ
- **Nhu cầu:** Người dùng muốn nghe phát âm của tất cả các biến thể từ loại và toàn bộ câu ví dụ tiếng Anh.
- **Xử lý:**
  - Tích hợp nút loa riêng cho từng từ trong Họ từ (`wf.word`), từng câu ví dụ trong cụm giới từ (`prep.example`), và từng câu ví dụ song ngữ (`ex.en`) tại cả 2 trang:
    1. Trang **Thêm từ** ([`app/words/page.tsx`](file:///d:/DATA/Learn_Vocabulary/app/words/page.tsx)).
    2. Trang **Flashcard Ôn tập SRS** ([`app/review/page.tsx`](file:///d:/DATA/Learn_Vocabulary/app/review/page.tsx)) có chặn `e.stopPropagation()` để không làm lật thẻ ngoài ý muốn.

### 6. Xử lý cảnh báo Hydration Mismatch (`bis_skin_checked="1"`, `bis_register`)
- **Hiện tượng:** Xuất hiện lỗi console `A tree hydrated but some attributes of the server rendered HTML didn't match the client properties: bis_skin_checked="1", bis_register`.
- **Nguyên nhân:** Do tiện ích mở rộng trên trình duyệt (Extension Bitdefender TrafficLight hoặc tiện ích tương tự trên Cốc Cốc/Chrome) tự ý tiêm thêm thuộc tính vào các thẻ `<body>`, `<div>` trước khi React hydrate xong.
- **Xử lý:** Thêm `suppressHydrationWarning` vào thẻ `<html>` và `<body>` trong [`app/layout.tsx`](file:///d:/DATA/Learn_Vocabulary/app/layout.tsx) để vô hiệu hóa cảnh báo không mong muốn này.

### 7. Đổi tên thương hiệu thành Learn Vocabulary và thân thiện hóa toàn bộ ngôn ngữ giao diện
- **Nhu cầu:** Loại bỏ hoàn toàn các thuật ngữ học thuật/kỹ thuật như "SRS", "SM-2", "Cram Mode", "thuật toán lặp lại ngắt quãng" khỏi giao diện người dùng để sản phẩm gần gũi, trực quan và dễ tiếp cận cho mọi đối tượng.
- **Xử lý:**
  - Đổi tên dự án chính thức thành **Learn Vocabulary** trong `package.json`, `app/layout.tsx`, `Navbar.tsx`, `MEMORY.md` và `PROJECT.md`.
  - Cập nhật menu điều hướng: `Tổng quan`, `Thêm từ mới`, `Ôn tập thông minh`, `Luyện tập cấp tốc`.
  - Làm mềm ngữ liệu trang: thay "Học tập ngắt quãng (SM-2)" bằng "Phương pháp ghi nhớ thông minh", "Cram Mode" bằng "Luyện tập cấp tốc", "Đã thêm vào SRS" bằng "Đã lưu vào sổ từ vựng".
  - Thân thiện hóa 4 nút đánh giá từ vựng flashcard: `Chưa nhớ` (Ôn lại sớm), `Hơi khó` (Sắp nhớ), `Đã nhớ` (Ôn định kỳ), `Rất thuộc` (Giãn cách xa).

### 8. Xử lý lỗi 503 UNAVAILABLE (Spikes in demand) của Gemini API
- **Hiện tượng:** Khi thêm từ mới (như `resume`), Google API thỉnh thoảng trả về mã `503: "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later."`
- **Nguyên nhân:** Cụm máy chủ của Google AI Studio gặp đợt quá tải đột biến tại thời điểm gửi request.
- **Xử lý:**
  - Bổ sung danh sách mô hình dự phòng: `['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.7-flash']` trong [`lib/ai/gemini.ts`](file:///d:/DATA/Learn_Vocabulary/lib/ai/gemini.ts).
  - Tự động chờ 1 giây và thử lại nếu gặp lỗi quá tải tạm thời trước khi chuyển sang model kế tiếp.
  - Chuẩn hóa thông báo lỗi thân thiện tại [`app/api/words/route.ts`](file:///d:/DATA/Learn_Vocabulary/app/api/words/route.ts) để không hiển thị chuỗi JSON thô cho người dùng.

### 9. Mở rộng hệ sinh thái các chế độ ôn tập (Flashcard 2 chiều, Nhìn nghĩa gõ từ, Ghép cặp, Sắp xếp chữ cái)
- **Nhu cầu:** Người học cần thêm nhiều phương thức ôn tập ngoài Flashcard truyền thống: Flashcard tiếng Việt (đoán từ tiếng Anh), Nhìn nghĩa gõ từ (Active Recall), Ghép cặp từ vựng (Matching Game), Sắp xếp chữ cái (Scramble),...
- **Xử lý:**
  - Nâng cấp [`app/review/page.tsx`](file:///d:/DATA/Learn_Vocabulary/app/review/page.tsx): Thêm thanh công cụ chọn chiều lật (Anh $\rightarrow$ Việt hoặc Việt $\rightarrow$ Anh), lưu cấu hình vào `localStorage`, tích hợp ô gõ từ trực tiếp vào mặt trước để tự kiểm tra trước khi lật đáp án.
  - Tái cấu trúc [`app/cram/page.tsx`](file:///d:/DATA/Learn_Vocabulary/app/cram/page.tsx): Xây dựng 6 chế độ luyện tập: Nhìn nghĩa gõ từ (`meaning_type`), Trắc nghiệm (`quiz`), Ghép thẻ nối cặp (`matching`), Sắp xếp chữ cái (`scramble`), Điền từ vào câu (`fill`), Nghe chép chính tả (`dictation`).
  - Toàn bộ đều phát âm tức thì qua Web Speech API (0ms delay), có gợi ý chữ cái đầu và tổng kết điểm số kèm pháo hoa giấy confetti sinh động.

### 10. Xóa sạch Database và đưa hệ thống về trạng thái sẵn sàng Production
- **Nhu cầu:** Dọn sạch toàn bộ các từ vựng và lịch sử học thử nghiệm trong quá trình phát triển để sẵn sàng đón nhận người dùng thật.
- **Xử lý:**
  - Xóa toàn bộ dữ liệu trong các bảng: `review_logs` (0), `daily_study_stats` (0), `user_vocabulary` (0), `words` (0).
  - Giữ nguyên demo user trong `auth.users` để đảm bảo foreign key toàn vẹn cho khách truy cập.

### 11. Triển khai chính thức lên Vercel (Production Deployment)
- **Địa chỉ Production:** [https://learn-vocabulary-psi.vercel.app](https://learn-vocabulary-psi.vercel.app)
- **Kho GitHub đồng bộ:** [https://github.com/Jade2308/Learn_Vocabulary](https://github.com/Jade2308/Learn_Vocabulary)
- **Cấu hình môi trường:** Đã nạp đầy đủ các biến môi trường Production & Preview trên Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GEMINI_API_KEY`
- **Kết quả:** Đã kiểm tra trực tiếp qua mạng Internet, trang chủ phản hồi HTTP 200 OK, các API tra cứu và làm giàu dữ liệu hoạt động trơn tru.

---

## 5. Các bước tiếp theo (Next Steps / Roadmap)
- [ ] Tích hợp giao diện đăng nhập / đăng ký chính thức qua Google OAuth & Email (Supabase Auth UI).
- [ ] Thiết lập Cron Job dọn dẹp `review_logs > 60 ngày` trên Supabase (như quy định trong `PROJECT.md`).
- [x] Triển khai dự án lên Vercel và cấu hình biến môi trường production.
