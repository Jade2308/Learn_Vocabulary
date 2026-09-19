'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layers, PlusCircle, Zap, BookOpen, Flame, CheckCircle, ArrowRight, Clock } from 'lucide-react';
import { UserVocabulary } from '@/types/db';

export default function DashboardPage() {
  const [dueCards, setDueCards] = useState<UserVocabulary[]>([]);
  const [topics, setTopics] = useState<Array<{ name: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [dueRes, topicsRes] = await Promise.all([
          fetch('/api/reviews/due'),
          fetch('/api/topics'),
        ]);

        const dueData = await dueRes.json();
        const topicsData = await topicsRes.json();

        if (Array.isArray(dueData)) setDueCards(dueData);
        if (Array.isArray(topicsData)) setTopics(topicsData);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const totalWords = topics.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="space-y-8">
      {/* Banner chào mừng */}
      <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-xl space-y-3">
          <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider">
            Học tập ngắt quãng (SM-2)
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Nắm vững từ vựng tiếng Anh mỗi ngày
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
            Hệ thống tự động nhắc nhở thời điểm vàng để ôn tập giúp từ vựng ghi sâu vào trí nhớ dài hạn.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/review"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 font-semibold text-sm transition-all shadow-sm"
            >
              <Layers className="w-4 h-4" />
              <span>Ôn tập ngay ({dueCards.length})</span>
            </Link>
            <Link
              href="/words"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800/40 hover:bg-emerald-800/60 border border-white/20 text-white font-medium text-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Thêm từ mới</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Grid thống kê nhanh */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">Cần ôn hôm nay</p>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{dueCards.length} từ</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">Tổng từ trong kho</p>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalWords} từ</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">Chủ đề phân loại</p>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{topics.length} chủ đề</h3>
          </div>
        </div>
      </div>

      {/* Danh mục chủ đề & Lối tắt */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chủ đề */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Chủ đề từ vựng của bạn</h2>
            <Link href="/cram" className="text-xs text-emerald-600 font-medium flex items-center gap-1 hover:underline">
              Ôn theo chủ đề <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {topics.length === 0 ? (
            <p className="text-sm text-zinc-400 py-6 text-center">Chưa có chủ đề nào. Hãy bắt đầu bằng cách thêm từ vựng mới!</p>
          ) : (
            <div className="space-y-2">
              {topics.map((t) => (
                <div key={t.name} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <span className="font-medium text-sm text-zinc-800 dark:text-zinc-200">{t.name}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                    {t.count} từ
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chế độ ôn gấp */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600">
              <Zap className="w-6 h-6" />
            </div>
            <h2 className="font-bold text-lg">Cram Mode — Ôn thi cấp tốc</h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Bạn có bài kiểm tra hoặc phỏng vấn sắp tới? Chọn chế độ ôn gấp để củng cố qua 3 dạng bài tập (trắc nghiệm, điền từ vào câu, nghe chép chính tả).
            </p>
          </div>

          <Link
            href="/cram"
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm text-center transition-colors flex items-center justify-center gap-2"
          >
            <span>Mở Cram Mode</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
