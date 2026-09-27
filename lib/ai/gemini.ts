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
 * Danh sách các mô hình Gemini theo thứ tự ưu tiên tốc độ.
 * Ưu tiên model nhẹ/nhanh nhất trước để giảm độ trễ.
 * Khi một mô hình hết lượt gọi (429) hoặc lỗi, tự động failover sang model kế tiếp.
 */
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',     // Ưu tiên 1: Nhanh nhất, tiêu tốn ít tài nguyên nhất
  'gemini-3.5-flash',          // Ưu tiên 2: Ổn định, tốc độ cao
  'gemini-3-flash-preview',    // Ưu tiên 3: Tốc độ tốt, hạn ngạch riêng
  'gemini-3.6-flash',          // Ưu tiên 4: Dự phòng
  'gemini-3.7-flash',          // Ưu tiên 5: Dự phòng nâng cao
  'gemini-3.8-flash',          // Ưu tiên 6: Mạnh nhất, dùng khi các model trên đều bận
];

export async function enrichWordWithGemini(headword: string): Promise<GeminiEnrichmentResponse> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in .env.local');
  }

  const prompt = `Bạn là một chuyên gia ngôn ngữ học và biên soạn từ điển tiếng Anh - tiếng Việt chuyên nghiệp.
Hãy làm giàu dữ liệu toàn diện cho từ tiếng Anh sau: "${headword}".

Yêu cầu chi tiết:
1. "part_of_speech": Loại từ chính của từ này (ví dụ: "noun", "verb", "adjective", "adverb", "phrasal verb", "idiom", "preposition").
2. "ipa": Phiên âm quốc tế IPA chuẩn xác của từ (ví dụ: "/rɪˈzjuːm/", "/ˈrez.ɪ.li.ənt/").
3. "cefr_level": Cấp độ CEFR ước lượng chuẩn ("A1", "A2", "B1", "B2", "C1", "C2").
4. "meaning_vi": Nghĩa tiếng Việt chuẩn, súc tích, phổ biến nhất của từ này.
5. "word_etymology": Phân tích ngắn gọn nguồn gốc và cấu tạo từ (Tiền tố + Gốc từ Latin/Hy Lạp + Hậu tố) và logic dẫn tới nghĩa hiện đại. Nếu từ thuần Anh cổ hoặc từ đơn giản không ghép, giải thích ngắn gọn nguồn gốc hình thành từ.
6. "collocations": 2 đến 3 cụm từ kết hợp tự nhiên thông dụng nhất kèm nghĩa tiếng Việt (để mảng rỗng [] nếu không có).
7. "synonyms": 2 đến 3 từ đồng nghĩa thông dụng (để mảng rỗng [] nếu không có).
8. "antonyms": 1 đến 2 từ trái nghĩa tiêu biểu (để mảng rỗng [] nếu không có).
9. "word_family": Danh sách họ từ liên quan (verb, noun, adjective, adverb) kèm nghĩa tiếng Việt (để mảng rỗng [] nếu không có).
10. "prepositions": Các cụm giới từ hoặc cấu trúc thông dụng đi kèm với từ này (pattern, giải thích nghĩa và 1 ví dụ tiếng Anh, để mảng rỗng [] nếu từ không đi kèm giới từ đặc thù).
11. "examples": 2 đến 3 câu ví dụ song ngữ tự nhiên, thông dụng (en: tiếng Anh, vi: bản dịch tiếng Việt).
12. "topics": Chọn từ 1 đến 3 chủ đề phù hợp nhất từ danh sách sau: [${ALLOWED_TOPICS.map((t) => `"${t}"`).join(', ')}]. Không tự ý tạo chủ đề ngoài danh sách.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      headword: { type: Type.STRING },
      part_of_speech: { type: Type.STRING },
      ipa: { type: Type.STRING },
      cefr_level: { type: Type.STRING },
      meaning_vi: { type: Type.STRING },
      word_etymology: { type: Type.STRING },
      collocations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            phrase: { type: Type.STRING },
            meaning_vi: { type: Type.STRING },
          },
          required: ['phrase', 'meaning_vi'],
        },
      },
      synonyms: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      antonyms: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      word_family: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            part_of_speech: { type: Type.STRING },
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
    required: [
      'headword',
      'part_of_speech',
      'ipa',
      'cefr_level',
      'meaning_vi',
      'word_etymology',
      'collocations',
      'synonyms',
      'antonyms',
      'word_family',
      'prepositions',
      'examples',
      'topics',
    ],
  };

  let lastError: unknown = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          thinkingConfig: {
            thinkingBudget: 0, // Tắt thinking hoàn toàn – không cần thiết cho tra từ
          },
          abortSignal: AbortSignal.timeout(8000), // Tối đa 8s cho mỗi model
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
      console.warn(`[AI Failover] Model ${model} gặp sự cố (${errString.slice(0, 100)}...). Chuyển ngay lập tức sang model kế tiếp...`);
      // Lập tức failover sang model kế tiếp trong candidate list mà không lặp lại vô ích
      continue;
    }
  }

  throw lastError || new Error('Không thể kết nối với dịch vụ AI. Vui lòng thử lại sau.');
}
