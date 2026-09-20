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

        const pureMeaning = geminiResult.meaning_vi.trim();

        // Gắn nhãn type rõ ràng để giao diện phân biệt rạch ròi giữa Giới từ và Cụm từ thông dụng
        const explicitPreps = (geminiResult.prepositions || []).map((p) => ({
          ...p,
          type: 'preposition',
        }));
        const explicitCollocations = (geminiResult.collocations || []).map((c) => ({
          pattern: c.phrase,
          explanation: c.meaning_vi,
          type: 'collocation',
        }));
        const combinedPrepositions = [...explicitPreps, ...explicitCollocations];

        const standardPayload = {
          headword,
          ipa: dictResult.ipa || geminiResult.ipa,
          audio_url: dictResult.audio_url,
          meaning_vi: pureMeaning,
          word_family: geminiResult.word_family || [],
          prepositions: combinedPrepositions,
          examples: geminiResult.examples || [],
          topics: geminiResult.topics || [],
        };

        const extendedPayload = {
          ...standardPayload,
          part_of_speech: geminiResult.part_of_speech,
          cefr_level: geminiResult.cefr_level,
          word_etymology: geminiResult.word_etymology,
          collocations: geminiResult.collocations || [],
          synonyms: geminiResult.synonyms || [],
          antonyms: geminiResult.antonyms || [],
        };

        // Thử lưu với các cột mở rộng (nếu bảng words đã chạy migration)
        const { data: extData, error: extError } = await supabaseAdmin
          .from('words')
          .insert(extendedPayload)
          .select()
          .single();

        let insertedWord: any = null;
        if (!extError && extData) {
          insertedWord = extData;
        } else {
          // Fallback tự động: nếu database chưa tạo cột riêng, lưu theo schema chuẩn an toàn 100%
          const { data: stdData, error: stdError } = await supabaseAdmin
            .from('words')
            .insert(standardPayload)
            .select()
            .single();

          if (stdError) {
            console.error('Error inserting word to words:', stdError);
            return NextResponse.json({ error: stdError.message }, { status: 500 });
          }

          insertedWord = {
            ...stdData,
            part_of_speech: geminiResult.part_of_speech,
            cefr_level: geminiResult.cefr_level,
            word_etymology: geminiResult.word_etymology,
            collocations: geminiResult.collocations || [],
            synonyms: geminiResult.synonyms || [],
            antonyms: geminiResult.antonyms || [],
          };
        }

        wordRecord = insertedWord as Word;
      } catch (aiErr: unknown) {
        let errMsg = 'Không thể tra cứu với AI vào lúc này. Vui lòng thử lại sau vài giây.';
        if (aiErr instanceof Error) {
          const rawMsg = aiErr.message;
          try {
            const parsed = JSON.parse(rawMsg);
            if (parsed?.error?.code === 503 || parsed?.error?.status === 'UNAVAILABLE') {
              errMsg = 'Máy chủ AI của Google đang có lượng truy cập đột biến. Bạn vui lòng bấm lại sau vài giây nhé!';
            } else if (parsed?.error?.code === 429 || parsed?.error?.status === 'RESOURCE_EXHAUSTED') {
              errMsg = 'Đã đạt giới hạn lượt gọi AI miễn phí trong phút này. Vui lòng đợi 30 giây rồi thử lại!';
            } else if (parsed?.error?.message) {
              errMsg = parsed.error.message;
            }
          } catch {
            if (rawMsg.includes('503') || rawMsg.includes('high demand') || rawMsg.includes('UNAVAILABLE')) {
              errMsg = 'Máy chủ AI của Google đang có lượng truy cập đột biến. Bạn vui lòng bấm lại sau vài giây nhé!';
            } else {
              errMsg = rawMsg;
            }
          }
        }
        console.error('AI Enrichment Error:', aiErr);
        return NextResponse.json(
          { error: errMsg },
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

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);

    const { data, error } = await supabaseAdmin
      .from('user_vocabulary')
      .select(`
        *,
        words (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user words:', error);
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


