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

    const hasSpecificWords = Array.isArray(word_ids) && word_ids.length > 0;
    if (hasSpecificWords) {
      const sanitizedIds = word_ids
        .filter((id: unknown) => typeof id === 'string' && /^[0-9a-fA-F-]+$/.test(id));
      if (sanitizedIds.length > 0) {
        query = query.or(`word_id.in.(${sanitizedIds.join(',')}),id.in.(${sanitizedIds.join(',')})`);
      }
    }

    const { data: userVocabs, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let filtered = userVocabs || [];
    // Chỉ lọc theo topic nếu người dùng KHÔNG chỉ định danh sách từ cụ thể
    if (!hasSpecificWords && topic && typeof topic === 'string') {
      filtered = filtered.filter((uv: any) => {
        const wordTopics: string[] = uv.words?.topics || [];
        return wordTopics.includes(topic);
      });
    }

    if (filtered.length === 0) {
      return NextResponse.json({
        words: [],
        message: 'Không tìm thấy từ vựng nào phù hợp để luyện tập',
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
