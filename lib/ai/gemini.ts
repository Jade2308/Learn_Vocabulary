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
 * Danh sách model ưu tiên tốc độ (nhẹ → nặng).
 * Fast API dùng top 3; Full API dùng toàn bộ làm fallback.
 */
const FAST_MODELS = [
  'gemini-3.5-flash-lite',  // Nhanh nhất, đủ cho 4 trường cốt lõi
  'gemini-3.5-flash',       // Dự phòng ổn định
  'gemini-3-flash-preview', // Dự phòng thứ 3
];

const FULL_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
];

// ─────────────────────────────────────────────
// In-memory cache (TTL 5 phút)
// Giúp từ vừa tra ngay sau đó ra trong 0ms
// ─────────────────────────────────────────────
interface CacheEntry {
  data: GeminiEnrichmentResponse;
  ts: number;
}
const CACHE_TTL = 5 * 60 * 1000; // 5 phút
const wordCache = new Map<string, CacheEntry>();

function getCached(headword: string): GeminiEnrichmentResponse | null {
  const entry = wordCache.get(headword);
  if (entry && Date.now() - entry.ts < CACHE_TTL) {
    return entry.data;
  }
  wordCache.delete(headword);
  return null;
}

function setCached(headword: string, data: GeminiEnrichmentResponse): void {
  wordCache.set(headword, { data, ts: Date.now() });
}

// ─────────────────────────────────────────────
// Helper: gọi 1 model với timeout
// ─────────────────────────────────────────────
async function callModel(model: string, prompt: string, schema: object, timeoutMs: number): Promise<string> {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      thinkingConfig: { thinkingBudget: 0 },
      abortSignal: AbortSignal.timeout(timeoutMs),
    },
  });
  const text = response.text;
  if (!text) throw new Error('Empty response from model');
  return text;
}

// ─────────────────────────────────────────────
// Helper: chạy tuần tự qua danh sách model (failover)
// Phân loại lỗi để frontend hiển thị thông báo chính xác
// ─────────────────────────────────────────────
async function runWithFailover(
  models: string[],
  prompt: string,
  schema: object,
  timeoutMs: number
): Promise<string> {
  let rateLimitCount = 0;
  let timeoutCount = 0;
  let serverOverloadCount = 0;
  let lastError: unknown = null;

  for (const model of models) {
    try {
      return await callModel(model, prompt, schema, timeoutMs);
    } catch (err) {
      lastError = err;
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
      const isRateLimit = msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota');
      const isTimeout = msg.includes('timed out') || (msg.includes('abort') && !msg.includes('unavailable'));
      const isServerDown = msg.includes('503') || msg.includes('unavailable') || msg.includes('high demand');
      if (isRateLimit) rateLimitCount++;
      else if (isTimeout) timeoutCount++;
      else if (isServerDown) serverOverloadCount++;
      console.warn(`[AI Failover] ${model}: ${isRateLimit ? '429 RateLimit' : isTimeout ? 'Timeout' : isServerDown ? '503 Overload' : 'Error'} → thử model tiếp theo`);
    }
  }

  // Ném lỗi phân loại rõ để frontend xử lý đúng
  if (serverOverloadCount > 0) {
    throw new Error('SERVER_OVERLOAD');
  }
  if (rateLimitCount === models.length) {
    throw new Error('RATE_LIMIT');
  }
  if (timeoutCount > 0) {
    throw new Error('TIMEOUT');
  }
  throw new Error('ALL_FAILED');
}


// ─────────────────────────────────────────────
// Kiểu dữ liệu kết quả nhanh (4 trường cốt lõi)
// ─────────────────────────────────────────────
export interface FastEnrichmentResponse {
  meaning_vi: string;
  ipa: string;
  cefr_level: string;
  part_of_speech: string;
}

// ─────────────────────────────────────────────
// Hàm 1: enrichWordFast — trả về 4 trường trong ~1-2s
// Dùng prompt ngắn + schema nhỏ để AI phản hồi tức thì
// ─────────────────────────────────────────────
export async function enrichWordFast(headword: string): Promise<FastEnrichmentResponse> {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const prompt = `Từ điển tiếng Anh-Việt. Từ: "${headword}". Trả về JSON với: meaning_vi (nghĩa tiếng Việt ngắn gọn nhất), ipa (phiên âm IPA chuẩn, ví dụ /ˈwɜːrd/), cefr_level (A1/A2/B1/B2/C1/C2), part_of_speech (noun/verb/adjective/adverb/...).`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      meaning_vi: { type: Type.STRING },
      ipa: { type: Type.STRING },
      cefr_level: { type: Type.STRING },
      part_of_speech: { type: Type.STRING },
    },
    required: ['meaning_vi', 'ipa', 'cefr_level', 'part_of_speech'],
  };

  const text = await runWithFailover(FAST_MODELS, prompt, schema, 7000);
  return JSON.parse(text) as FastEnrichmentResponse;
}

// ─────────────────────────────────────────────
// Hàm 2: enrichWordWithGemini — đầy đủ 12 trường
// Dùng in-memory cache, fallback qua nhiều model
// ─────────────────────────────────────────────
export async function enrichWordWithGemini(headword: string): Promise<GeminiEnrichmentResponse> {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  // Kiểm tra cache trước
  const cached = getCached(headword);
  if (cached) {
    console.log(`[AI Cache] Hit for "${headword}" — 0ms`);
    return cached;
  }

  const prompt = `Từ điển Anh-Việt chuyên nghiệp. Từ: "${headword}". JSON với các trường:
1. part_of_speech: loại từ (noun/verb/adjective/adverb/phrasal verb/idiom)
2. ipa: phiên âm IPA chuẩn (ví dụ /ˈwɜːrd/)
3. cefr_level: cấp độ A1/A2/B1/B2/C1/C2
4. meaning_vi: nghĩa tiếng Việt súc tích nhất
5. word_etymology: nguồn gốc từ Latin/Greek ngắn gọn (1-2 câu)
6. collocations: 2-3 cụm từ thông dụng [{phrase, meaning_vi}], [] nếu không có
7. synonyms: 2-3 từ đồng nghĩa [], [] nếu không có
8. antonyms: 1-2 từ trái nghĩa [], [] nếu không có
9. word_family: các dạng từ [{part_of_speech, word, meaning_vi}], [] nếu không có
10. prepositions: giới từ đi kèm [{pattern, explanation, example}], [] nếu không có
11. examples: 2 câu ví dụ [{en, vi}]
12. topics: 1-3 chủ đề từ [${ALLOWED_TOPICS.map((t) => `"${t}"`).join(', ')}]`;

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
      synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
      antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
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
      topics: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: [
      'headword', 'part_of_speech', 'ipa', 'cefr_level', 'meaning_vi',
      'word_etymology', 'collocations', 'synonyms', 'antonyms',
      'word_family', 'prepositions', 'examples', 'topics',
    ],
  };

  const text = await runWithFailover(FULL_MODELS, prompt, schema, 8000);
  const result = JSON.parse(text) as GeminiEnrichmentResponse;

  // Lưu vào cache
  setCached(headword, result);

  return result;
}
