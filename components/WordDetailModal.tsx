'use client';

import { useEffect } from 'react';
import {
  Volume2,
  X,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  Tag,
  BookOpen,
  Award,
  Layers,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { Word, UserVocabulary } from '@/types/db';
import { playAudio } from '@/lib/audio';
import { extractWordMetadata, getCefrBadgeStyle } from '@/lib/vocab-helper';

interface WordDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  word: Word | null;
  userVocab?: UserVocabulary | null;
  onPrev?: () => void;
  onNext?: () => void;
  currentIndex?: number;
  totalCount?: number;
}

export default function WordDetailModal({
  isOpen,
  onClose,
  word,
  userVocab,
  onPrev,
  onNext,
  currentIndex,
  totalCount,
}: WordDetailModalProps) {
  // Lắng nghe phím tắt điều hướng
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && onPrev) {
        onPrev();
      } else if (e.key === 'ArrowRight' && onNext) {
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onPrev, onNext]);

  if (!isOpen || !word) return null;

  const {
    pureMeaning,
    pos,
    cefr,
    word_etymology,
    synonyms,
    antonyms,
    prepositions,
    collocations,
  } = extractWordMetadata(word);

  const repetitionLevel = userVocab?.repetition_level ?? 0;
  const hasPagination = typeof currentIndex === 'number' && typeof totalCount === 'number';

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= Header Modal ================= */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/70 dark:bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100">
                  Chi tiết từ vựng
                </h3>
                {hasPagination && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {currentIndex + 1} / {totalCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 hidden sm:block">
                Toàn bộ thông tin, họ từ, cấu trúc và ví dụ minh họa của từ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Nút lật từ trước */}
            {onPrev && (
              <button
                type="button"
                onClick={onPrev}
                disabled={currentIndex === 0}
                className="p-1.5 sm:p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Từ trước đó (Phím mũi tên trái)"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}

            {/* Nút lật từ tiếp theo */}
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                disabled={hasPagination && currentIndex === totalCount - 1}
                className="p-1.5 sm:p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Từ tiếp theo (Phím mũi tên phải)"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}

            {/* Nút Đóng */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer ml-1"
              title="Đóng (Phím Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= Body Modal ================= */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Hàng 1: Từ vựng chính & Các huy hiệu */}
          <div className="flex items-start justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4 gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-2xl sm:text-3xl font-extrabold capitalize text-zinc-900 dark:text-white">
                  {word.headword}
                </h2>
                <button
                  type="button"
                  onClick={() => playAudio(word.headword, word.audio_url)}
                  className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 hover:bg-emerald-200 transition-colors cursor-pointer"
                  title="Nghe phát âm chuẩn (0ms)"
                >
                  <Volume2 className="w-5 h-5" />
                </button>

                {/* Badge Loại từ */}
                {pos && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {pos}
                  </span>
                )}

                {/* Badge Cấp độ CEFR */}
                {cefr && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getCefrBadgeStyle(
                      cefr
                    )}`}
                  >
                    Cấp độ {cefr}
                  </span>
                )}
              </div>
              {word.ipa && (
                <p className="text-zinc-500 font-mono text-sm">{word.ipa}</p>
              )}
            </div>

            {/* Badge Trạng thái ghi nhớ */}
            <div className="shrink-0 text-right">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  repetitionLevel >= 3
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : repetitionLevel > 0
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>
                  {repetitionLevel >= 3
                    ? `Thuộc vững (Cấp ${repetitionLevel})`
                    : repetitionLevel > 0
                    ? `Đang nhớ (Cấp ${repetitionLevel})`
                    : 'Từ mới trong kho'}
                </span>
              </span>
            </div>
          </div>

          {/* Hàng 2: Nghĩa tiếng Việt */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Nghĩa tiếng Việt
            </h3>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
              {pureMeaning || word.meaning_vi}
            </p>
          </div>

          {/* Hàng 3: Phân tích gốc từ (Word Etymology) */}
          {word_etymology && (
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/60 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs uppercase tracking-wider">
                <GitBranch className="w-4 h-4" />
                <span>Phân tích gốc từ & Cấu tạo (Etymology)</span>
              </div>
              <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                {word_etymology}
              </p>
            </div>
          )}

          {/* Hàng 4: Các dạng từ liên quan (Word Family) */}
          {word.word_family && word.word_family.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Các dạng từ liên quan (Word Family)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {word.word_family.map((wf, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-sm flex items-center justify-between gap-2"
                  >
                    <div className="flex-1">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {wf.word}
                      </span>{' '}
                      <span className="text-xs text-zinc-500 italic">({wf.part_of_speech})</span>: {wf.meaning_vi}
                    </div>
                    <button
                      type="button"
                      onClick={() => playAudio(wf.word)}
                      title={`Phát âm từ: ${wf.word}`}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors shrink-0 cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hàng 5: Giới từ đi kèm (Prepositions) */}
          {prepositions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Giới từ đi kèm (Prepositions)
                </h3>
                <span className="text-[11px] text-zinc-400 italic">
                  Các giới từ chuẩn đi kèm với từ
                </span>
              </div>
              <div className="space-y-2">
                {prepositions.map((prep, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-sm space-y-1"
                  >
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <span>{prep.pattern}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-medium">
                        Giới từ
                      </span>
                    </div>
                    <div className="text-zinc-600 dark:text-zinc-400 text-xs">
                      {prep.explanation}
                    </div>
                    {prep.example && (
                      <div className="text-zinc-500 italic text-xs pt-1.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                        <span>&ldquo;{prep.example}&rdquo;</span>
                        <button
                          type="button"
                          onClick={() => playAudio(prep.example!)}
                          title="Nghe câu ví dụ"
                          className="p-1 rounded text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors shrink-0 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hàng 6: Cụm từ thông dụng (Collocations) */}
          {collocations.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Cụm từ thông dụng (Collocations)
                </h3>
                <span className="text-[11px] text-zinc-400 italic">
                  Cách kết hợp từ tự nhiên người bản xứ hay dùng
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {collocations.map((col, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-sm flex items-start justify-between gap-2"
                  >
                    <div className="space-y-0.5 flex-1">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <span>{col.pattern}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-medium">
                          Cụm từ
                        </span>
                      </div>
                      <div className="text-zinc-500 dark:text-zinc-400 text-xs">
                        {col.explanation}
                      </div>
                      {col.example && (
                        <div className="text-zinc-400 italic text-[11px] pt-1">
                          &ldquo;{col.example}&rdquo;
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => playAudio(col.pattern)}
                      title="Nghe phát âm cụm từ"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors shrink-0 cursor-pointer mt-0.5"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hàng 7: Từ đồng nghĩa & Trái nghĩa */}
          {(synonyms.length > 0 || antonyms.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {synonyms.length > 0 && (
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Từ đồng nghĩa (Synonyms)
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {synonyms.map((s, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-200/60 dark:border-emerald-900"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {antonyms.length > 0 && (
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Từ trái nghĩa (Antonyms)
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {antonyms.map((a, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-medium border border-rose-200/60 dark:border-rose-900"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hàng 8: Ví dụ song ngữ */}
          {word.examples && word.examples.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Ví dụ song ngữ
              </h3>
              <div className="space-y-2">
                {word.examples.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-sm flex items-start justify-between gap-3"
                  >
                    <div className="flex-1 space-y-0.5">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{ex.en}</div>
                      <div className="text-zinc-500 dark:text-zinc-400 text-xs">{ex.vi}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => playAudio(ex.en)}
                      title="Nghe câu ví dụ tiếng Anh"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors shrink-0 mt-0.5 cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hàng 9: Chủ đề (Topics) */}
          {word.topics && word.topics.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Chủ đề:
              </span>
              {word.topics.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ================= Footer Modal ================= */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 flex flex-wrap items-center justify-between gap-3">
          {/* Nút điều hướng trước/sau */}
          <div className="flex items-center gap-2">
            {onPrev && (
              <button
                type="button"
                onClick={onPrev}
                disabled={currentIndex === 0}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Từ trước</span>
              </button>
            )}
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                disabled={hasPagination && currentIndex === totalCount - 1}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="hidden sm:inline">Từ tiếp theo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium text-xs sm:text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <Link
              href="/review"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm transition-colors shadow-sm cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>Ôn tập thông minh</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

