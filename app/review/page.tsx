'use client';

import { useState, useEffect } from 'react';
import { Volume2, RotateCcw, Check, Loader2, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserVocabulary } from '@/types/db';
import { playAudio } from '@/lib/audio';

export default function ReviewPage() {
  const [cards, setCards] = useState<UserVocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    fetchDueCards();
  }, []);

  const fetchDueCards = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reviews/due');
      const data = await res.json();
      if (Array.isArray(data)) {
        setCards(data);
      }
    } catch (err) {
      console.error('Error fetching due reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRating = async (rating: 1 | 2 | 3 | 4) => {
    const currentCard = cards[currentIndex];
    if (!currentCard || submitting) return;

    setSubmitting(true);
    try {
      await fetch(`/api/reviews/${currentCard.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });

      if (currentIndex + 1 < cards.length) {
        setIsFlipped(false);
        setCurrentIndex((prev) => prev + 1);
      } else {
        setIsCompleted(true);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err) {
      console.error('Error submitting review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-zinc-500 text-sm">Đang tải danh sách từ cần ôn...</p>
      </div>
    );
  }

  if (cards.length === 0 || isCompleted) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
          <Check className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Tuyệt vời!</h2>
          <p className="text-zinc-500 text-sm">
            {cards.length === 0
              ? 'Hiện tại không có từ nào đến hạn ôn tập. Hãy thêm từ mới hoặc quay lại sau!'
              : 'Bạn đã hoàn thành tất cả các từ cần ôn hôm nay!'}
          </p>
        </div>
        <a
          href="/words"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors"
        >
          <span>Thêm từ mới</span>
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const word = currentCard.word;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>Tiến độ ôn tập</span>
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
          {currentIndex + 1} / {cards.length}
        </span>
      </div>
      <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
        <div
          className="bg-emerald-600 h-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
        />
      </div>

      <div
        onClick={() => !isFlipped && setIsFlipped(true)}
        className={`min-h-[360px] p-8 rounded-3xl bg-white dark:bg-zinc-900 border-2 transition-all cursor-pointer shadow-md flex flex-col justify-between ${
          isFlipped
            ? 'border-zinc-200 dark:border-zinc-800'
            : 'border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-400'
        }`}
      >
        <div className="text-center space-y-4 my-auto">
          <div className="flex items-center justify-center gap-3">
            <h2 className="text-4xl font-extrabold capitalize text-zinc-900 dark:text-white">
              {word?.headword}
            </h2>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playAudio(word?.headword || '', word?.audio_url);
              }}
              className="p-2.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 hover:bg-emerald-200 transition-colors"
              title="Phát âm"
            >
              <Volume2 className="w-6 h-6" />
            </button>
          </div>

          {word?.ipa && (
            <p className="text-zinc-400 font-mono text-base">{word.ipa}</p>
          )}

          {!isFlipped && (
            <div className="pt-8 text-zinc-400 text-xs flex items-center justify-center gap-1.5 animate-pulse">
              <RotateCcw className="w-4 h-4" /> Click để xem đáp án
            </div>
          )}
        </div>

        {isFlipped && (
          <div className="pt-6 mt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4 text-left animate-in fade-in duration-300">
            <div>
              <span className="text-xs font-semibold uppercase text-zinc-400">Nghĩa</span>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {word?.meaning_vi}
              </p>
            </div>

            {word?.word_family && word.word_family.length > 0 && (
              <div>
                <span className="text-xs font-semibold uppercase text-zinc-400">Các dạng từ liên quan</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {word.word_family.map((wf, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playAudio(wf.word);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors cursor-pointer"
                      title={`Phát âm: ${wf.word}`}
                    >
                      <span><strong>{wf.word}</strong> ({wf.part_of_speech}): {wf.meaning_vi}</span>
                      <Volume2 className="w-3 h-3 text-zinc-400 hover:text-emerald-600" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {word?.prepositions && word.prepositions.length > 0 && (
              <div>
                <span className="text-xs font-semibold uppercase text-zinc-400">Cấu trúc</span>
                <div className="space-y-1.5 mt-1.5">
                  {word.prepositions.slice(0, 2).map((p, idx) => (
                    <div key={idx} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start justify-between gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
                      <div className="flex-1">
                        <div><span className="font-semibold text-emerald-600 dark:text-emerald-400">{p.pattern}</span>: {p.explanation}</div>
                        {p.example && (
                          <div className="italic text-zinc-500 text-[11px] mt-0.5">&ldquo;{p.example}&rdquo;</div>
                        )}
                      </div>
                      {p.example && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playAudio(p.example!);
                          }}
                          className="p-1 rounded text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer shrink-0"
                          title="Nghe câu cấu trúc"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {word?.examples && word.examples.length > 0 && (
              <div>
                <span className="text-xs font-semibold uppercase text-zinc-400">Ví dụ</span>
                <div className="space-y-1.5 mt-1.5">
                  {word.examples.slice(0, 2).map((ex, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 text-xs flex items-start justify-between gap-2">
                      <div className="space-y-0.5 flex-1">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{ex.en}</p>
                        <p className="text-zinc-500">{ex.vi}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(ex.en);
                        }}
                        className="p-1 rounded text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer shrink-0 mt-0.5"
                        title="Nghe câu ví dụ tiếng Anh"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isFlipped ? (
        <div className="grid grid-cols-4 gap-2.5">
          <button
            onClick={() => handleRating(1)}
            disabled={submitting}
            className="py-3 px-2 rounded-2xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 font-semibold text-xs sm:text-sm flex flex-col items-center gap-1 transition-all cursor-pointer"
          >
            <span>Chưa nhớ</span>
            <span className="text-[10px] opacity-75">Ôn lại sớm</span>
          </button>
          <button
            onClick={() => handleRating(2)}
            disabled={submitting}
            className="py-3 px-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 font-semibold text-xs sm:text-sm flex flex-col items-center gap-1 transition-all cursor-pointer"
          >
            <span>Hơi khó</span>
            <span className="text-[10px] opacity-75">Sắp nhớ</span>
          </button>
          <button
            onClick={() => handleRating(3)}
            disabled={submitting}
            className="py-3 px-2 rounded-2xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 font-semibold text-xs sm:text-sm flex flex-col items-center gap-1 transition-all cursor-pointer"
          >
            <span>Đã nhớ</span>
            <span className="text-[10px] opacity-75">Ôn định kỳ</span>
          </button>
          <button
            onClick={() => handleRating(4)}
            disabled={submitting}
            className="py-3 px-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 font-semibold text-xs sm:text-sm flex flex-col items-center gap-1 transition-all cursor-pointer"
          >
            <span>Rất thuộc</span>
            <span className="text-[10px] opacity-75">Giãn cách xa</span>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsFlipped(true)}
          className="w-full py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-medium text-sm transition-all"
        >
          Lật xem đáp án
        </button>
      )}
    </div>
  );
}

