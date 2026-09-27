import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { enrichWordFast } from '@/lib/ai/gemini';

/**
 * POST /api/words/fast
 *
 * Trả về 4 trường cốt lõi của một từ trong ~1–2s:
 *   meaning_vi, ipa, cefr_level, part_of_speech
 *
 * Cách hoạt động:
 * 1. Kiểm tra từ đã có trong DB → trả về ngay nếu có
 * 2. Nếu chưa có → gọi AI với prompt siêu ngắn + schema 4 trường → trả về
 *
 * Frontend dùng endpoint này để hiện thẻ từ NGAY,
 * rồi gọi POST /api/words để lấy phần chi tiết bổ sung.
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

    // 1. Kiểm tra DB — nếu từ đã có, trả về ngay (< 300ms)
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

    // 2. Từ mới — gọi AI nhanh với schema siêu nhỏ (~1–2s)
    const fastResult = await enrichWordFast(headword);

    return NextResponse.json({
      source: 'ai_fast',
      headword,
      ...fastResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[/api/words/fast] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
