import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { translateWithAzure } from '@/lib/translator/azure';

/**
 * POST /api/words/fast
 *
 * GIAI ĐOẠN 1: Dùng Azure Translator API (Gói F0 - Free)
 * Mục tiêu: Lấy nhanh nghĩa tiếng Việt (meaning_vi) trong ~200-400ms.
 *
 * Luồng xử lý:
 * 1. Kiểm tra từ đã có trong DB toàn hệ thống (Supabase) chưa:
 *    - Nếu có → Trả về ngay lập tức (< 200ms) kèm đầy đủ thông tin đã lưu.
 * 2. Nếu là từ mới:
 *    - Gọi Azure Translator để dịch sang tiếng Việt.
 *    - Trả về kết quả ngay cho frontend để người dùng xem trước nghĩa.
 *    - Giai đoạn 2 (POST /api/words) sẽ tự động chạy ngầm để bổ sung tất cả:
 *      phiên âm IPA, cấp độ CEFR, họ từ, giới từ, ví dụ song ngữ, etymology...
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawHeadword = body.headword;

    if (!rawHeadword || typeof rawHeadword !== 'string') {
      return NextResponse.json(
        { error: 'headword is required' },
        { status: 400 }
      );
    }

    const headword = rawHeadword.trim().toLowerCase();
    if (!headword) {
      return NextResponse.json({ error: 'headword cannot be empty' }, { status: 400 });
    }

    // 1. Kiểm tra DB — nếu từ đã có, trả về ngay
    const { data: existingWord } = await supabaseAdmin
      .from('words')
      .select('meaning_vi, ipa, cefr_level, part_of_speech')
      .eq('headword', headword)
      .maybeSingle();

    if (existingWord) {
      return NextResponse.json({
        source: 'db',
        headword,
        meaning_vi: existingWord.meaning_vi,
        ipa: existingWord.ipa,
        cefr_level: existingWord.cefr_level,
        part_of_speech: existingWord.part_of_speech,
      });
    }

    // 2. Từ mới — Gọi Azure Translator (Gói F0) lấy nghĩa tiếng Việt siêu tốc
    const meaning_vi = await translateWithAzure(headword);

    return NextResponse.json({
      source: 'azure_fast',
      headword,
      meaning_vi,
      ipa: null,
      cefr_level: null,
      part_of_speech: null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[/api/words/fast] Azure Translator Error:', message);

    if (message === 'AZURE_TRANSLATOR_KEY_MISSING') {
      return NextResponse.json(
        { error: 'AZURE_TRANSLATOR_KEY_MISSING' },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
