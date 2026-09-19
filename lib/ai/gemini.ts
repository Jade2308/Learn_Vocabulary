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

const CANDIDATE_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.7-flash'];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function enrichWordWithGemini(headword: string): Promise<GeminiEnrichmentResponse> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in .env.local');
  }

  const prompt = `Bạn là một chuyên gia ngôn ngữ học và biên soạn từ điển tiếng Anh - tiếng Việt chuyên nghiệp.
Hãy làm giàu dữ liệu cho từ tiếng Anh sau: "${headword}".

Yêu cầu chi tiết:
1. "meaning_vi": Nghĩa tiếng Việt chuẩn, súc tích, phổ biến nhất của từ này.
2. "word_family": Danh sách họ từ liên quan (verb, noun, adjective, adverb) kèm nghĩa tiếng Việt. Tối đa 4 từ phổ biến.
3. "prepositions": Các cụm giới từ hoặc cấu trúc thông dụng đi kèm với từ này (pattern ví dụ: "depend on + N/V-ing"), giải thích nghĩa tiếng Việt và 1 câu ví dụ minh họa bằng tiếng Anh.
4. "examples": 2 đến 3 câu ví dụ song ngữ tự nhiên, thông dụng (en: tiếng Anh, vi: bản dịch tiếng Việt).
5. "topics": Chọn từ 1 đến 3 chủ đề phù hợp nhất từ danh sách sau: [${ALLOWED_TOPICS.map((t) => `"${t}"`).join(', ')}]. Không tự ý tạo chủ đề ngoài danh sách.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      headword: { type: Type.STRING },
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
    required: ['headword', 'meaning_vi', 'word_family', 'prepositions', 'examples', 'topics'],
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
        const isTransient = errString.includes('503') || errString.includes('high demand') || errString.includes('UNAVAILABLE');

        if (isTransient && attempt === 1) {
          // Nghỉ 1 giây rồi thử lại model này
          await sleep(1000);
          continue;
        }

        // Chuyển sang model dự phòng kế tiếp
        console.warn(`Model ${model} failed (attempt ${attempt}):`, errString);
        break;
      }
    }
  }

  throw lastError || new Error('Không thể kết nối với dịch vụ AI. Vui lòng thử lại sau.');
}
