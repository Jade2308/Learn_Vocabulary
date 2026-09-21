'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
  PlusCircle,
  Zap,
  BookOpen,
  ArrowRight,
  Clock,
  Volume2,
  Search,
  X,
  CheckCircle2,
  Sparkles,
  Tag,
  Award,
  ChevronRight,
  Brain,
  TrendingUp,
} from 'lucide-react';
import { UserVocabulary } from '@/types/db';
import { playAudio } from '@/lib/audio';
import { extractWordMetadata, getCefrBadgeStyle } from '@/lib/vocab-helper';
import WordDetailModal from '@/components/WordDetailModal';

export default function DashboardPage() {
  const [dueCards, setDueCards] = useState<UserVocabulary[]>([]);
  const [topics, setTopics] = useState<Array<{ name: string; count: number }>>([]);
  const [allWords, setAllWords] = useState<UserVocabulary[]>([]);
  const [loading, setLoading] = useState(true);

  // Trạng thái mở Modal tương tác
  const [activeModal, setActiveModal] = useState<'due' | 'all' | 'topics' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Trạng thái xem Bảng chi tiết từ vựng
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const [detailSourceList, setDetailSourceList] = useState<UserVocabulary[]>([]);

  useEffect(() => {
    // 1. Tải nhanh từ LocalStorage cache để hiển thị tức thì (0ms) ngay khi mở/tải lại trang
    try {
      const cachedDue = localStorage.getItem('cached_due_cards');
      const cachedWords = localStorage.getItem('cached_all_words');
      const cachedTopics = localStorage.getItem('cached_topics');

      if (cachedDue) {
        const parsed = JSON.parse(cachedDue);
        if (Array.isArray(parsed)) setDueCards(parsed);
      }
      if (cachedWords) {
        const parsed = JSON.parse(cachedWords);
        if (Array.isArray(parsed)) setAllWords(parsed);
      }
      if (cachedTopics) {
        const parsed = JSON.parse(cachedTopics);
        if (Array.isArray(parsed)) setTopics(parsed);
      }
    } catch (e) {
      console.warn('Error reading dashboard cache:', e);
    }

    // 2. Chạy ngầm để đồng bộ dữ liệu mới nhất từ server
    async function loadData() {
      try {
        const [dueRes, topicsRes, allRes] = await Promise.all([
          fetch('/api/reviews/due'),
          fetch('/api/topics'),
          fetch('/api/words'),
        ]);

        const dueData = await dueRes.json();
        const topicsData = await topicsRes.json();
        const allData = await allRes.json();

        if (Array.isArray(dueData)) {
          setDueCards(dueData);
          localStorage.setItem('cached_due_cards', JSON.stringify(dueData));
        }
        if (Array.isArray(topicsData)) {
          setTopics(topicsData);
          localStorage.setItem('cached_topics', JSON.stringify(topicsData));
        }
        if (Array.isArray(allData)) {
          setAllWords(allData);
          localStorage.setItem('cached_all_words', JSON.stringify(allData));
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Xử lý đóng modal và bảng chi tiết khi nhấn phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedWordIndex !== null) {
          setSelectedWordIndex(null);
        } else {
          setActiveModal(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWordIndex]);

  // Các hàm điều khiển Bảng chi tiết từ vựng
  const handleOpenWordDetail = (index: number, list: UserVocabulary[]) => {
    setDetailSourceList(list);
    setSelectedWordIndex(index);
  };

  const handlePrevWord = () => {
    if (selectedWordIndex !== null && selectedWordIndex > 0) {
      setSelectedWordIndex(selectedWordIndex - 1);
    }
  };

  const handleNextWord = () => {
    if (selectedWordIndex !== null && selectedWordIndex < detailSourceList.length - 1) {
      setSelectedWordIndex(selectedWordIndex + 1);
    }
  };

  const handleCloseWordDetail = () => {
    setSelectedWordIndex(null);
  };

  const totalWordsCount = allWords.length > 0 ? allWords.length : topics.reduce((acc, curr) => acc + curr.count, 0);

  // Lọc từ vựng cho Modal Kho từ vựng
  const filteredWords = allWords.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.trim().toLowerCase();
    const headword = item.word?.headword?.toLowerCase() || '';
    const meaning = item.word?.meaning_vi?.toLowerCase() || '';
    const wordTopics = (item.word?.topics || []).join(' ').toLowerCase();
    return headword.includes(query) || meaning.includes(query) || wordTopics.includes(query);
  });

  return (
    <div className="space-y-8">
      {/* Banner chào mừng & Tối ưu bố cục thị giác */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-teal-800 text-white shadow-xl relative overflow-hidden">
        {/* Họa tiết nền trang trí phát sáng đa chiều */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -top-12 w-56 h-56 bg-emerald-300/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-12 w-48 h-48 bg-teal-300/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 lg:gap-8">
          {/* Cột trái: Thông điệp chính */}
          <div className="space-y-3.5 max-w-lg lg:max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider text-emerald-100 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Phương pháp ghi nhớ thông minh
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight [text-wrap:balance] leading-snug">
              Nắm vững từ vựng tiếng Anh mỗi ngày
            </h1>
            <p className="text-emerald-100 text-sm sm:text-base leading-relaxed max-w-md">
              Hệ thống tự động nhắc nhở thời điểm vàng để ôn tập giúp từ vựng ghi sâu vào trí nhớ dài hạn.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
              <Link
                href="/review"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer w-full sm:w-auto text-center"
              >
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Ôn tập ngay ({dueCards.length})</span>
              </Link>
              <Link
                href="/words"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-xl bg-emerald-800/40 hover:bg-emerald-800/60 border border-white/25 text-white font-medium text-sm transition-all hover:-translate-y-0.5 backdrop-blur-xs cursor-pointer w-full sm:w-auto text-center"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Thêm từ mới</span>
              </Link>
            </div>
          </div>

          {/* Cột phải: Card đồ họa kính mờ (Glassmorphism) trực quan, cân bằng bố cục */}
          <div className="hidden md:flex flex-col gap-3 min-w-[280px] lg:min-w-[310px]">
            <div
              onClick={() => setActiveModal('due')}
              className="p-4 sm:p-5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 shadow-lg space-y-3.5 hover:bg-white/20 transition-all cursor-pointer group"
              title="Bấm để xem nhanh danh sách từ cần ôn"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/20 text-amber-300 group-hover:scale-105 transition-transform">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
                      Ghi nhớ dài hạn
                    </h4>
                    <p className="text-sm font-bold text-white">
                      {dueCards.length > 0 ? 'Thời điểm vàng ôn tập' : 'Đã thuộc bài hôm nay'}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white/25 text-[11px] font-bold text-white">
                  {dueCards.length > 0 ? `${dueCards.length} từ cần ôn` : '100%'}
                </span>
              </div>

              {/* Thông số nhanh */}
              <div className="p-3 rounded-xl bg-black/15 border border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between text-emerald-100">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    Kho từ vựng
                  </span>
                  <span className="font-bold text-white">{totalWordsCount} từ</span>
                </div>
                <div className="flex items-center justify-between text-emerald-100">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    Chủ đề đã lưu
                  </span>
                  <span className="font-bold text-white">{topics.length} chủ đề</span>
                </div>
              </div>

              {/* Lời khuyên động */}
              <div className="text-[11px] text-emerald-100/90 italic flex items-center justify-between pt-0.5">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-teal-200 shrink-0" />
                  <span>
                    {dueCards.length > 0
                      ? 'Ôn đúng lúc giúp tăng 80% hiệu quả nhớ.'
                      : 'Tuyệt vời! Tiếp tục duy trì phong độ nhé.'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid 3 thẻ thống kê nhanh — Tương tác trực tiếp bằng cú click */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Nút 1: Cần ôn hôm nay */}
        <button
          type="button"
          onClick={() => setActiveModal('due')}
          className="group text-left p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-600 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 cursor-pointer flex items-center justify-between"
          title="Bấm để xem danh sách từ cần ôn hôm nay"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500">Cần ôn hôm nay</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {dueCards.length} từ
              </h3>
            </div>
          </div>
          <div className="flex items-center text-xs font-semibold text-amber-600 opacity-80 group-hover:opacity-100 transition-opacity">
            <span className="hidden sm:inline mr-1">Xem</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Nút 2: Tổng từ trong kho */}
        <button
          type="button"
          onClick={() => {
            setSearchQuery('');
            setActiveModal('all');
          }}
          className="group text-left p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-400 dark:hover:border-emerald-600 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 cursor-pointer flex items-center justify-between"
          title="Bấm để xem toàn bộ kho từ vựng cá nhân"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500">Tổng từ trong kho</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {totalWordsCount} từ
              </h3>
            </div>
          </div>
          <div className="flex items-center text-xs font-semibold text-emerald-600 opacity-80 group-hover:opacity-100 transition-opacity">
            <span className="hidden sm:inline mr-1">Kho từ</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Nút 3: Chủ đề phân loại */}
        <button
          type="button"
          onClick={() => setActiveModal('topics')}
          className="group text-left p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-purple-400 dark:hover:border-purple-600 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 cursor-pointer flex items-center justify-between"
          title="Bấm để xem danh mục chủ đề và luyện tập nhanh"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500">Chủ đề phân loại</p>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {topics.length} chủ đề
              </h3>
            </div>
          </div>
          <div className="flex items-center text-xs font-semibold text-purple-600 opacity-80 group-hover:opacity-100 transition-opacity">
            <span className="hidden sm:inline mr-1">Luyện tập</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* Danh mục chủ đề & Lối tắt */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chủ đề */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Chủ đề từ vựng của bạn</h2>
            <button
              type="button"
              onClick={() => setActiveModal('topics')}
              className="text-xs text-emerald-600 font-medium flex items-center gap-1 hover:underline cursor-pointer"
            >
              Xem tất cả chủ đề <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {topics.length === 0 ? (
            <p className="text-sm text-zinc-400 py-6 text-center">
              Chưa có chủ đề nào. Hãy bắt đầu bằng cách thêm từ vựng mới!
            </p>
          ) : (
            <div className="space-y-2">
              {topics.slice(0, 5).map((t) => (
                <Link
                  key={t.name}
                  href={`/cram?topic=${encodeURIComponent(t.name)}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors group cursor-pointer"
                  title={`Luyện tập chủ đề ${t.name}`}
                >
                  <span className="font-medium text-sm text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {t.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                      {t.count} từ
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Chế độ luyện tập cấp tốc */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600">
              <Zap className="w-6 h-6" />
            </div>
            <h2 className="font-bold text-lg">Luyện tập cấp tốc</h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Cần tăng tốc ghi nhớ hoặc chuẩn bị cho kỳ thi? Luyện tập không giới hạn qua 6 chế độ sinh động: nhìn nghĩa gõ từ, trắc nghiệm, ghép thẻ, sắp xếp chữ cái, điền từ và nghe chép chính tả.
            </p>
          </div>

          <Link
            href="/cram"
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm text-center transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <span>Bắt đầu luyện tập ngay</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: CHI TIẾT TỪ CẦN ÔN HÔM NAY                      */}
      {/* ======================================================== */}
      {activeModal === 'due' && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                    Từ vựng cần ôn hôm nay ({dueCards.length})
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Theo phương pháp lặp lại ngắt quãng để ghi nhớ lâu dài
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body: Danh sách từ */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {dueCards.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-base text-zinc-800 dark:text-zinc-200">
                    Tuyệt vời! Bạn không còn từ nào cần ôn hôm nay
                  </h4>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    Hãy thêm từ vựng mới hoặc vào chế độ Luyện tập cấp tốc để ôn luyện thêm nhé!
                  </p>
                </div>
              ) : (
                dueCards.map((item, idx) => {
                  const currentWord = item.word || item.words;
                  const { pureMeaning, pos, cefr } = extractWordMetadata(currentWord);

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleOpenWordDetail(idx, dueCards)}
                      className="p-3.5 sm:p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between gap-3 sm:gap-4 cursor-pointer group"
                      title="Bấm để xem chi tiết đầy đủ của từ"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-base text-zinc-900 dark:text-zinc-100 capitalize group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                            {currentWord?.headword}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playAudio(currentWord?.headword || '', currentWord?.audio_url);
                            }}
                            className="p-1 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                            title="Nghe phát âm"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                          {pos && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                              {pos}
                            </span>
                          )}
                          {cefr && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getCefrBadgeStyle(
                                cefr
                              )}`}
                            >
                              {cefr}
                            </span>
                          )}
                          {currentWord?.ipa && (
                            <span className="text-xs text-zinc-500 font-mono">
                              {currentWord.ipa}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium line-clamp-1">
                          {pureMeaning || currentWord?.meaning_vi}
                        </p>
                        {currentWord?.topics && currentWord.topics.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {currentWord.topics.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                          Cấp độ {item.repetition_level}
                        </span>
                        <div className="p-1 rounded-lg text-zinc-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-center w-full sm:w-auto"
              >
                Đóng
              </button>
              {dueCards.length > 0 ? (
                <Link
                  href="/review"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors shadow-sm cursor-pointer w-full sm:w-auto text-center"
                >
                  <Layers className="w-4 h-4" />
                  <span>Bắt đầu ôn tập ngay ({dueCards.length})</span>
                </Link>
              ) : (
                <Link
                  href="/words"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors shadow-sm cursor-pointer w-full sm:w-auto text-center"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Thêm từ mới</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: TOÀN BỘ KHO TỪ VỰNG & TÌM KIẾM                  */}
      {/* ======================================================== */}
      {activeModal === 'all' && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                    Kho từ vựng của bạn ({totalWordsCount} từ)
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Tra cứu và xem tiến độ ghi nhớ tất cả từ đã lưu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm từ tiếng Anh, nghĩa tiếng Việt, chủ đề..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1.5 text-zinc-400 hover:text-zinc-600 absolute right-2 rounded-lg cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Body: Danh sách từ vựng */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {filteredWords.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center">
                    <Search className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-base text-zinc-800 dark:text-zinc-200">
                    {searchQuery ? 'Không tìm thấy từ vựng phù hợp' : 'Kho từ vựng đang trống'}
                  </h4>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    {searchQuery
                      ? 'Thử tìm kiếm với từ khóa khác hoặc thêm từ mới vào kho'
                      : 'Hãy bắt đầu tra cứu và thêm các từ vựng tiếng Anh đầu tiên nhé!'}
                  </p>
                </div>
              ) : (
                filteredWords.map((item, idx) => {
                  const currentWord = item.word || item.words;
                  const { pureMeaning, pos, cefr } = extractWordMetadata(currentWord);

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleOpenWordDetail(idx, filteredWords)}
                      className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 space-y-2 cursor-pointer group"
                      title="Bấm để xem chi tiết đầy đủ của từ"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-lg text-zinc-900 dark:text-zinc-100 capitalize group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                              {currentWord?.headword}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playAudio(currentWord?.headword || '', currentWord?.audio_url);
                              }}
                              className="p-1 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                              title="Nghe phát âm"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                            {pos && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                {pos}
                              </span>
                            )}
                            {cefr && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getCefrBadgeStyle(
                                  cefr
                                )}`}
                              >
                                {cefr}
                              </span>
                            )}
                            {currentWord?.ipa && (
                              <span className="text-xs text-zinc-500 font-mono">
                                {currentWord.ipa}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mt-0.5">
                            {pureMeaning || currentWord?.meaning_vi}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                              item.repetition_level >= 3
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                : item.repetition_level > 0
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            {item.repetition_level >= 3
                              ? 'Thuộc vững'
                              : item.repetition_level > 0
                              ? `Đang nhớ (${item.repetition_level})`
                              : 'Từ mới'}
                          </span>
                          <div className="p-1 rounded-lg text-zinc-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      {/* Word Family Preview */}
                      {currentWord?.word_family && currentWord.word_family.length > 0 && (
                        <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[11px] text-zinc-400 font-medium">Họ từ:</span>
                          {currentWord.word_family.slice(0, 3).map((wf, wfIdx) => (
                            <span
                              key={wfIdx}
                              className="text-xs px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                            >
                              <span className="font-medium">{wf.word}</span>{' '}
                              <span className="text-[10px] text-zinc-400">({wf.part_of_speech})</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Topics badges */}
                      {currentWord?.topics && currentWord.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 items-center">
                          <Tag className="w-3 h-3 text-zinc-400" />
                          {currentWord.topics.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <span className="text-xs text-zinc-500 text-center sm:text-left">
                Hiển thị {filteredWords.length} / {totalWordsCount} từ
              </span>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-center"
                >
                  Đóng
                </button>
                <Link
                  href="/words"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors shadow-sm cursor-pointer text-center"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Thêm từ mới</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: CHỦ ĐỀ PHÂN LOẠI & LUYỆN TẬP NHANH              */}
      {/* ======================================================== */}
      {activeModal === 'topics' && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                    Chủ đề từ vựng ({topics.length} chủ đề)
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Chọn chủ đề để bước vào chế độ luyện tập cấp tốc ngay
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body: Danh sách chủ đề */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {topics.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-base text-zinc-800 dark:text-zinc-200">
                    Chưa có chủ đề nào được phân loại
                  </h4>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    Khi bạn thêm từ mới, AI sẽ tự động gán chủ đề phù hợp cho từng từ.
                  </p>
                </div>
              ) : (
                topics.map((t) => (
                  <div
                    key={t.name}
                    className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-purple-800 transition-all flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                        {t.name}
                      </h4>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {t.count} từ vựng trong chủ đề
                      </p>
                    </div>

                    <Link
                      href={`/cram?topic=${encodeURIComponent(t.name)}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer shrink-0"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Luyện tập</span>
                    </Link>
                  </div>
                ))
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-center w-full sm:w-auto"
              >
                Đóng
              </button>
              <Link
                href="/cram"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition-colors shadow-sm cursor-pointer text-center w-full sm:w-auto"
              >
                <Zap className="w-4 h-4" />
                <span>Luyện tập tất cả</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: BẢNG CHI TIẾT ĐẦY ĐỦ CỦA TỪ VỰNG                */}
      {/* ======================================================== */}
      <WordDetailModal
        isOpen={selectedWordIndex !== null && detailSourceList[selectedWordIndex] !== undefined}
        onClose={handleCloseWordDetail}
        word={
          selectedWordIndex !== null && detailSourceList[selectedWordIndex]
            ? detailSourceList[selectedWordIndex].word || detailSourceList[selectedWordIndex].words || null
            : null
        }
        userVocab={
          selectedWordIndex !== null && detailSourceList[selectedWordIndex]
            ? detailSourceList[selectedWordIndex]
            : null
        }
        onPrev={handlePrevWord}
        onNext={handleNextWord}
        currentIndex={selectedWordIndex ?? 0}
        totalCount={detailSourceList.length}
      />
    </div>
  );
}
