import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAuthUserId } from '@/lib/auth-helper';

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('user_vocabulary')
      .select(`
        *,
        words (*)
      `)
      .eq('user_id', userId)
      .lte('next_review_at', now)
      .order('next_review_at', { ascending: true });

    if (error) {
      console.error('Error fetching due reviews:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (data || []).map((item) => ({
      ...item,
      word: item.words,
    }));

    return NextResponse.json(formatted);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

