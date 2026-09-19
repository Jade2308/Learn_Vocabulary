import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { calculateNextReview } from '@/lib/srs';
import { getAuthUserId } from '@/lib/auth-helper';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userVocabId } = await context.params;
    const body = await req.json();
    const rating = Number(body.rating);

    if (![1, 2, 3, 4].includes(rating)) {
      return NextResponse.json(
        { error: 'rating must be an integer between 1 and 4' },
        { status: 400 }
      );
    }

    const userId = await getAuthUserId(req);

    const { data: currentVocab, error: fetchError } = await supabaseAdmin
      .from('user_vocabulary')
      .select('*')
      .eq('id', userVocabId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !currentVocab) {
      return NextResponse.json(
        { error: 'Vocabulary record not found or unauthorized' },
        { status: 404 }
      );
    }

    const srsResult = calculateNextReview({
      repetitionLevel: currentVocab.repetition_level || 0,
      intervalDays: currentVocab.interval_days || 1,
      easeFactor: Number(currentVocab.ease_factor) || 2.5,
      rating: rating as 1 | 2 | 3 | 4,
    });

    const { data: updatedVocab, error: updateError } = await supabaseAdmin
      .from('user_vocabulary')
      .update({
        repetition_level: srsResult.repetitionLevel,
        interval_days: srsResult.intervalDays,
        ease_factor: srsResult.easeFactor,
        next_review_at: srsResult.nextReviewAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userVocabId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabaseAdmin.from('review_logs').insert({
      user_id: userId,
      word_id: currentVocab.word_id,
      rating,
      reviewed_at: new Date().toISOString(),
    });

    const today = new Date().toISOString().split('T')[0];
    const isSuccess = rating >= 3 ? 1 : 0;

    const { data: currentStat } = await supabaseAdmin
      .from('daily_study_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('study_date', today)
      .maybeSingle();

    if (currentStat) {
      await supabaseAdmin
        .from('daily_study_stats')
        .update({
          cards_reviewed: (currentStat.cards_reviewed || 0) + 1,
          successful_reviews: (currentStat.successful_reviews || 0) + isSuccess,
        })
        .eq('id', currentStat.id);
    } else {
      await supabaseAdmin.from('daily_study_stats').insert({
        user_id: userId,
        study_date: today,
        cards_reviewed: 1,
        successful_reviews: isSuccess,
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedVocab,
      next_review_at: srsResult.nextReviewAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

