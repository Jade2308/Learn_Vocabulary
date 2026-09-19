import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAuthUserId } from '@/lib/auth-helper';

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // payload có thể rỗng
    }
    const { word_ids, topic } = body;

    let query = supabaseAdmin
      .from('user_vocabulary')
      .select(`
        *,
        words (*)
      `)
      .eq('user_id', userId);

    if (Array.isArray(word_ids) && word_ids.length > 0) {
      query = query.in('word_id', word_ids);
    }

    const { data: userVocabs, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let filtered = userVocabs || [];
    if (topic && typeof topic === 'string') {
      filtered = filtered.filter((uv: any) => {
        const wordTopics: string[] = uv.words?.topics || [];
        return wordTopics.includes(topic);
      });
    }

    if (filtered.length === 0) {
      return NextResponse.json({
        words: [],
        message: 'Không tìm thấy từ vựng nào phù hợp để ôn gấp',
      });
    }

    const vocabIds = filtered.map((item: any) => item.id);
    await supabaseAdmin
      .from('user_vocabulary')
      .update({ is_urgent_review: true })
      .in('id', vocabIds);

    const wordsData = filtered.map((item: any) => ({
      user_vocabulary_id: item.id,
      ...item.words,
    }));

    return NextResponse.json({
      success: true,
      count: wordsData.length,
      words: wordsData,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
