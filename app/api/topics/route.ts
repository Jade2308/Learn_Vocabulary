import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAuthUserId } from '@/lib/auth-helper';

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);

    const { data, error } = await supabaseAdmin
      .from('user_vocabulary')
      .select('words(topics)')
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const topicCountMap: Record<string, number> = {};

    data?.forEach((item: any) => {
      const topics: string[] = item.words?.topics || [];
      topics.forEach((topic) => {
        topicCountMap[topic] = (topicCountMap[topic] || 0) + 1;
      });
    });

    const topicsList = Object.entries(topicCountMap).map(([name, count]) => ({
      name,
      count,
    })).sort((a, b) => b.count - a.count);

    return NextResponse.json(topicsList);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

