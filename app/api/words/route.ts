import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { fetchDictionaryData } from '@/lib/dictionary';
import { enrichWordWithGemini } from '@/lib/ai/gemini';
import { getAuthUserId } from '@/lib/auth-helper';
import { Word } from '@/types/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawHeadword = body.headword;

    if (!rawHeadword || typeof rawHeadword !== 'string') {
      return NextResponse.json(
        { error: 'headword is required and must be a string' },
        { status: 400 }
      );
    }

    const headword = rawHeadword.trim().toLowerCase();
    if (!headword) {
      return NextResponse.json(
        { error: 'headword cannot be empty' },
        { status: 400 }
      );
    }

    const userId = await getAuthUserId(req);

    // 2. Query words (dedupe toàn hệ thống)
    const { data: existingWord, error: findWordError } = await supabaseAdmin
      .from('words')
      .select('*')
      .eq('headword', headword)
      .maybeSingle();

    if (findWordError) {
      console.error('Database query error on words:', findWordError);
      return NextResponse.json({ error: findWordError.message }, { status: 500 });
    }

    let wordRecord: Word;

    if (existingWord) {
      wordRecord = existingWord as Word;
    } else {
      try {
        const [dictResult, geminiResult] = await Promise.all([
          fetchDictionaryData(headword),
          enrichWordWithGemini(headword),
        ]);

        const { data: insertedWord, error: insertWordError } = await supabaseAdmin
          .from('words')
          .insert({
            headword,
            ipa: dictResult.ipa,
            audio_url: dictResult.audio_url,
            meaning_vi: geminiResult.meaning_vi,
            word_family: geminiResult.word_family || [],
            prepositions: geminiResult.prepositions || [],
            examples: geminiResult.examples || [],
            topics: geminiResult.topics || [],
          })
          .select()
          .single();

        if (insertWordError) {
          console.error('Error inserting word to words:', insertWordError);
          return NextResponse.json({ error: insertWordError.message }, { status: 500 });
        }

        wordRecord = insertedWord as Word;
      } catch (aiErr: unknown) {
        const errMsg = aiErr instanceof Error ? aiErr.message : 'Error enriching word with AI';
        console.error('AI Enrichment Error:', aiErr);
        return NextResponse.json(
          { error: `Không thể làm giàu từ với AI: ${errMsg}` },
          { status: 502 }
        );
      }
    }

    // Upsert vào user_vocabulary
    const { data: userVocab, error: userVocabError } = await supabaseAdmin
      .from('user_vocabulary')
      .upsert(
        {
          user_id: userId,
          word_id: wordRecord.id,
          repetition_level: 0,
          interval_days: 1,
          ease_factor: 2.5,
          next_review_at: new Date().toISOString(),
          is_urgent_review: false,
          urgent_priority: 1,
        },
        { onConflict: 'user_id,word_id' }
      )
      .select()
      .single();

    if (userVocabError) {
      console.error('Error upserting user_vocabulary:', userVocabError);
      return NextResponse.json({ error: userVocabError.message }, { status: 500 });
    }

    return NextResponse.json({
      ...wordRecord,
      user_vocabulary: userVocab,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

