import { GoogleGenAI, Type } from '@google/genai';
import { GeminiEnrichmentResponse } from '@/types/db';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const ALLOWED_TOPICS = [
  'Du lịch',
  'Công việc',
  'Học thuật',
  'Đời sống',
  'Công nghệ',
  'Sức khỏe',
  'Tài chính',
  'Môi trường',
  'Nghệ thuật',
  'Ẩm thực',
];

/**
 * Danh sách các mô hình Gemini theo thứ tự ưu tiên tối ưu nhất.
 * Khi một mô hình hết lượt gọi (Rate Limit / Quota 429), quá tải (503), hoặc bận,
 * hệ thống sẽ tự động chuyển ngay sang mô hình kế tiếp mà KHÔNG báo lỗi ra giao diện.
 * Mỗi mô hình có hạn ngạch (RPM/RPD) riêng biệt tại Google AI Studio.
 */
const CANDIDATE_MODELS = [
  'gemini-3.6-flash',          // Ưu tiên 1: Thông minh nhất, ngữ nghĩa sâu sắc, họ từ & ví dụ phong phú
  'gemini-3.5-flash-lite',     // Ưu tiên 2: Tốc độ siêu tốc (~1s), nhẹ, quota riêng biệt
  'gemini-flash-lite-latest',  // Ưu tiên 3: Phiên bản Flash-Lite mới nhất của Google
  'gemini-3.1-flash-lite',     // Ưu tiên 4: Dòng Flash-Lite ổn định cao, dự phòng dồi dào
  'gemini-3.5-flash',          // Ưu tiên 5: Phiên bản Flash tiêu chuẩn
  'gemini-3.7-flash',          // Ưu tiên 6: Mô hình Flash cao cấp
  'gemini-3.8-flash',          // Ưu tiên 7: Mô hình thế hệ kế tiếp
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function enrichWordWithGemini(headword: string): Promise<GeminiEnrichmentResponse> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in .env.local');
  }

  const prompt = `Bạn là một chuyên gia ngôn ngữ học và biên soạn từ điển tiếng Anh - tiếng Việt chuyên nghiệp.
Hãy làm giàu dữ liệu toàn diện cho từ tiếng Anh sau: "${headword}".

Yêu cầu chi tiết:
1. "part_of_speech": Loại từ chính của từ này (ví dụ: "noun", "verb", "adjective", "adverb", "phrasal verb", "idiom", "preposition").
2. "ipa": Phiên âm quốc tế IPA chuẩn xác của từ (ví dụ: "/rɪˈzjuːm/", "/ˈrez.ɪ.li.ənt/").
3. "meaning_vi": Nghĩa tiếng Việt chuẩn, súc tích, phổ biến nhất của từ này (ví dụ: "tiếp tục", "kiên cường").
4. "word_family": Danh sách họ từ liên quan (verb, noun, adjective, adverb) kèm nghĩa tiếng Việt. Tối đa 4 từ phổ biến.
5. "prepositions": Các cụm giới từ hoặc cấu trúc thông dụng đi kèm với từ này (pattern ví dụ: "depend on + N/V-ing"), giải thích nghĩa tiếng Việt và 1 câu ví dụ minh họa bằng tiếng Anh.
6. "examples": 2 đến 3 câu ví dụ song ngữ tự nhiên, thông dụng (en: tiếng Anh, vi: bản dịch tiếng Việt).
7. "topics": Chọn từ 1 đến 3 chủ đề phù hợp nhất từ danh sách sau: [${ALLOWED_TOPICS.map((t) => `"${t}"`).join(', ')}]. Không tự ý tạo chủ đề ngoài danh sách.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      headword: { type: Type.STRING },
      part_of_speech: { type: Type.STRING },
      ipa: { type: Type.STRING },
      meaning_vi: { type: Type.STRING },
      word_family: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            part_of_speech: {
              type: Type.STRING,
              enum: ['verb', 'noun', 'adjective', 'adverb'],
            },
            word: { type: Type.STRING },
            meaning_vi: { type: Type.STRING },
          },
          required: ['part_of_speech', 'word', 'meaning_vi'],
        },
      },
      prepositions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            pattern: { type: Type.STRING },
            explanation: { type: Type.STRING },
            example: { type: Type.STRING },
          },
          required: ['pattern', 'explanation'],
        },
      },
      examples: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            en: { type: Type.STRING },
            vi: { type: Type.STRING },
          },
          required: ['en', 'vi'],
        },
      },
      topics: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
    required: ['headword', 'part_of_speech', 'ipa', 'meaning_vi', 'word_family', 'prepositions', 'examples', 'topics'],
  };

  let lastError: unknown = null;

  for (const model of CANDIDATE_MODELS) {
    // Thử tối đa 2 lần cho mỗi model nếu gặp lỗi quá tải tạm thời (503 / high demand)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        });

        const responseText = response.text;
        if (!responseText) {
          throw new Error('Gemini API returned an empty response');
        }

        return JSON.parse(responseText) as GeminiEnrichmentResponse;
      } catch (err: unknown) {
        lastError = err;
        const errString = err instanceof Error ? err.message : String(err);
        const isQuotaExceeded = errString.includes('429') || errString.includes('RESOURCE_EXHAUSTED') || errString.includes('quota') || errString.includes('rate limit');
        const isTransient = errString.includes('503') || errString.includes('high demand') || errString.includes('UNAVAILABLE');

        // Nếu hết quota / giới hạn gọi: chuyển ngay sang model kế tiếp không cần chờ
        if (isQuotaExceeded) {
          console.warn(`[AI Failover] Model ${model} đã hết hạn ngạch (429 Rate Limit/Quota). Tự động chuyển ngay sang model kế tiếp...`);
          break;
        }

        // Nếu quá tải tạm thời ở lần đầu: chờ 500ms thử lại
        if (isTransient && attempt === 1) {
          await sleep(500);
          continue;
        }

        // Lỗi khác hoặc đã thử lại không thành: tự động chuyển sang model dự phòng kế tiếp
        console.warn(`[AI Failover] Model ${model} tạm dừng (${errString.slice(0, 100)}...). Tự động chuyển sang model dự phòng kế tiếp...`);
        break;
      }
    }
  }

  throw lastError || new Error('Không thể kết nối với dịch vụ AI. Vui lòng thử lại sau.');
}
