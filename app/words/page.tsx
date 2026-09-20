'use client';

import { useState } from 'react';
import { Volume2, Loader2, Sparkles, CheckCircle, Tag, GitBranch } from 'lucide-react';
import { Word } from '@/types/db';
import { playAudio } from '@/lib/audio';

export default function WordsPage() {
  const [inputWord, setInputWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedWord, setAddedWord] = useState<Word | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWord.trim()) return;

    setLoading(true);
    setError(null);
    setAddedWord(null);

    try {
      const res = await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headword: inputWord }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi xử lý từ');
      }

      setAddedWord(data);
      setInputWord('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Thêm & Tra cứu từ vựng
        </h1>
        <p className="text-zinc-500 text-sm">
          Nhập một từ tiếng Anh — Hệ thống sẽ tự động tra cứu phiên âm, nghĩa tiếng Việt, các dạng từ liên quan và ví dụ sinh động cho bạn
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          type="text"
          value={inputWord}
          onChange={(e) => setInputWord(e.target.value)}
          placeholder="Nhập từ tiếng Anh (ví dụ: resilient, comprehensive, allocate)..."
          className="w-full pl-4 pr-32 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
          disabled={loading}
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !inputWord.trim()}
          className="absolute right-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang xử lý...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Thêm từ</span>
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {addedWord && (
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-emerald-950/60 shadow-lg space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-extrabold capitalize text-zinc-900 dark:text-white">
                  {addedWord.headword}
                </h2>
                {addedWord.cefr_level && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    {addedWord.cefr_level}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => playAudio(addedWord.headword, addedWord.audio_url)}
                  className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 hover:bg-emerald-200 transition-colors cursor-pointer"
                  title="Phát âm"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
              {addedWord.ipa && (
                <p className="text-zinc-500 font-mono text-sm mt-1">{addedWord.ipa}</p>
              )}
            </div>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="w-3.5 h-3.5" />
              Đã lưu vào sổ từ vựng
            </span>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Nghĩa tiếng Việt</h3>
            <p className="text-lg font-medium text-emerald-700 dark:text-emerald-400">
              {addedWord.meaning_vi}
            </p>
          </div>

          {/* Phân tích gốc từ (Word Etymology) */}
          {addedWord.word_etymology && (
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/60 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs uppercase tracking-wider">
                <GitBranch className="w-4 h-4" />
                <span>Phân tích gốc từ & Cấu tạo (Etymology)</span>
              </div>
              <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                {addedWord.word_etymology}
              </p>
            </div>
          )}

          {/* Từ đồng nghĩa & Trái nghĩa */}
          {((addedWord.synonyms && addedWord.synonyms.length > 0) ||
            (addedWord.antonyms && addedWord.antonyms.length > 0)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {addedWord.synonyms && addedWord.synonyms.length > 0 && (
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Từ đồng nghĩa (Synonyms)
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {addedWord.synonyms.map((s, idx) => (
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

              {addedWord.antonyms && addedWord.antonyms.length > 0 && (
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Từ trái nghĩa (Antonyms)
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {addedWord.antonyms.map((a, idx) => (
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

          {addedWord.word_family && addedWord.word_family.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Các dạng từ liên quan (Word Family)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {addedWord.word_family.map((wf, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-sm flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{wf.word}</span>{' '}
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

          {addedWord.prepositions && addedWord.prepositions.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Giới từ & Cấu trúc</h3>
              <div className="space-y-2">
                {addedWord.prepositions.map((prep, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-sm space-y-1">
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400">{prep.pattern}</div>
                    <div className="text-zinc-600 dark:text-zinc-400 text-xs">{prep.explanation}</div>
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

          {addedWord.examples && addedWord.examples.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Ví dụ song ngữ</h3>
              <div className="space-y-2">
                {addedWord.examples.map((ex, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-sm flex items-start justify-between gap-3">
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

          {addedWord.topics && addedWord.topics.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Chủ đề:
              </span>
              {addedWord.topics.map((t, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-lg text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

