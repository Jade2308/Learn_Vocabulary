'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Zap,
  Volume2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Award,
  Loader2,
  FileText,
  HelpCircle,
  Layers,
  Shuffle,
  BookOpen,
  Headphones,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Check,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playAudio } from '@/lib/audio';

interface CramWord {
  user_vocabulary_id: string;
  headword: string;
  meaning_vi: string;
  ipa: string | null;
  audio_url: string | null;
  word_family: Array<{ part_of_speech: string; word: string; meaning_vi: string }>;
  prepositions: Array<{ pattern: string; explanation: string; example?: string }>;
  examples: Array<{ en: string; vi: string }>;
  topics: string[];
}

type CramMode = 'meaning_type' | 'quiz' | 'matching' | 'scramble' | 'fill' | 'dictation';

interface MatchingTile {
  id: string;
  wordId: string;
  text: string;
  type: 'en' | 'vi';
  matched: boolean;
}

interface ScrambleTile {
  id: number;
  char: string;
  used: boolean;
}

const DEFAULT_DISTRACTORS = [
  'quan trọng, thiết yếu',
  'thành công, đạt được',
  'phát triển, mở rộng',
  'nỗ lực, cố gắng',
  'duy trì, giữ vững',
  'cải thiện, nâng cao',
  'sự kiên trì, bền bỉ',
  'thử thách, khó khăn',
];

export default function CramPage() {
  const [topics, setTopics] = useState<Array<{ name: string; count: number }>>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [words, setWords] = useState<CramWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Chế độ luyện tập
  const [mode, setMode] = useState<CramMode>('meaning_type');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  // Trạng thái chung cho từng lượt câu hỏi
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Trạng thái cụ thể của các chế độ
  const [userFillInput, setUserFillInput] = useState('');
  const [userDictationInput, setUserDictationInput] = useState('');
  const [userMeaningTypeInput, setUserMeaningTypeInput] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Chế độ Ghép cặp (Matching)
  const [matchingTiles, setMatchingTiles] = useState<MatchingTile[]>([]);
  const [selectedTile, setSelectedTile] = useState<MatchingTile | null>(null);
  const [mismatchedTileIds, setMismatchedTileIds] = useState<string[]>([]);
  const [matchingRound, setMatchingRound] = useState(0);
  const MATCHING_BATCH_SIZE = 4;

  // Chế độ Sắp xếp chữ cái (Scramble)
  const [scrambleTiles, setScrambleTiles] = useState<ScrambleTile[]>([]);
  const [selectedLetterIds, setSelectedLetterIds] = useState<number[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTopics();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const topicParam = params.get('topic');
      if (topicParam) {
        setSelectedTopic(topicParam);
      }
    }
  }, []);

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/topics');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTopics(data);
      }
    } catch (err) {
      console.error('Error fetching topics:', err);
    }
  };

  const startCramSession = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cram-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: selectedTopic || undefined }),
      });
      const data = await res.json();
      if (data.words && data.words.length > 0) {
        // Xáo trộn ngẫu nhiên danh sách từ để mỗi lần luyện tập đều mới mẻ
        const shuffled = [...data.words].sort(() => Math.random() - 0.5);
        setWords(shuffled);
        setSessionStarted(true);
        setCurrentIndex(0);
        setScore(0);
        setCompleted(false);
        setMatchingRound(0);
        resetTurn();

        if (mode === 'matching') {
          initMatchingRound(shuffled, 0);
        } else if (mode === 'scramble') {
          initScrambleWord(shuffled[0]);
        }
      } else {
        alert(data.message || 'Chưa có từ vựng nào trong chủ đề này để luyện tập!');
      }
    } catch (err) {
      console.error('Error starting cram session:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetTurn = () => {
    setUserFillInput('');
    setUserDictationInput('');
    setUserMeaningTypeInput('');
    setSelectedOption(null);
    setAnswered(false);
    setIsCorrect(false);
    setShowHint(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleNext = () => {
    if (currentIndex + 1 < words.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      resetTurn();

      if (mode === 'scramble') {
        initScrambleWord(words[nextIdx]);
      }
    } else {
      setCompleted(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  };

  // --- Khởi tạo chế độ Sắp xếp chữ cái (Scramble) ---
  const initScrambleWord = (word: CramWord) => {
    if (!word) return;
    const chars = word.headword.split('');
    const tiles: ScrambleTile[] = chars.map((char, index) => ({
      id: index,
      char,
      used: false,
    }));
    // Xáo trộn các chữ cái
    const shuffledTiles = [...tiles].sort(() => Math.random() - 0.5);
    setScrambleTiles(shuffledTiles);
    setSelectedLetterIds([]);
  };

  const handlePickLetter = (tile: ScrambleTile) => {
    if (tile.used || answered) return;
    setScrambleTiles((prev) =>
      prev.map((t) => (t.id === tile.id ? { ...t, used: true } : t))
    );
    setSelectedLetterIds((prev) => [...prev, tile.id]);
  };

  const handleRemoveLetter = (id: number) => {
    if (answered) return;
    setSelectedLetterIds((prev) => prev.filter((i) => i !== id));
    setScrambleTiles((prev) =>
      prev.map((t) => (t.id === id ? { ...t, used: false } : t))
    );
  };

  const handleScrambleBackspace = () => {
    if (answered || selectedLetterIds.length === 0) return;
    const lastId = selectedLetterIds[selectedLetterIds.length - 1];
    handleRemoveLetter(lastId);
  };

  const handleScrambleReset = () => {
    if (answered) return;
    setSelectedLetterIds([]);
    setScrambleTiles((prev) => prev.map((t) => ({ ...t, used: false })));
  };

  const checkScrambleAnswer = () => {
    if (answered || selectedLetterIds.length === 0) return;
    const formedWord = selectedLetterIds
      .map((id) => scrambleTiles.find((t) => t.id === id)?.char)
      .join('');
    const right = formedWord.toLowerCase() === currentWord.headword.toLowerCase();
    setAnswered(true);
    setIsCorrect(right);
    if (right) {
      setScore((s) => s + 1);
      playAudio(currentWord.headword, currentWord.audio_url);
    }
  };

  // --- Khởi tạo chế độ Ghép cặp (Matching) ---
  const initMatchingRound = (allWords: CramWord[], roundIdx: number) => {
    const startIdx = roundIdx * MATCHING_BATCH_SIZE;
    const roundWords = allWords.slice(startIdx, startIdx + MATCHING_BATCH_SIZE);
    if (roundWords.length === 0) {
      setCompleted(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      return;
    }

    const tiles: MatchingTile[] = [];
    roundWords.forEach((w) => {
      tiles.push({
        id: `en-${w.user_vocabulary_id}`,
        wordId: w.user_vocabulary_id,
        text: w.headword,
        type: 'en',
        matched: false,
      });
      tiles.push({
        id: `vi-${w.user_vocabulary_id}`,
        wordId: w.user_vocabulary_id,
        text: w.meaning_vi,
        type: 'vi',
        matched: false,
      });
    });

    setMatchingTiles(tiles.sort(() => Math.random() - 0.5));
    setSelectedTile(null);
    setMismatchedTileIds([]);
  };

  const handleTileClick = (tile: MatchingTile) => {
    if (tile.matched || mismatchedTileIds.length > 0) return;

    if (!selectedTile) {
      setSelectedTile(tile);
      if (tile.type === 'en') {
        const foundWord = words.find((w) => w.user_vocabulary_id === tile.wordId);
        if (foundWord) playAudio(foundWord.headword, foundWord.audio_url);
      }
      return;
    }

    // Nếu bấm lại chính thẻ đó thì hủy chọn
    if (selectedTile.id === tile.id) {
      setSelectedTile(null);
      return;
    }

    // Nếu bấm 2 thẻ cùng loại (cùng tiếng Anh hoặc cùng tiếng Việt) -> đổi lựa chọn sang thẻ mới
    if (selectedTile.type === tile.type) {
      setSelectedTile(tile);
      if (tile.type === 'en') {
        const foundWord = words.find((w) => w.user_vocabulary_id === tile.wordId);
        if (foundWord) playAudio(foundWord.headword, foundWord.audio_url);
      }
      return;
    }

    // Kiểm tra xem 2 thẻ có khớp nhau không
    if (selectedTile.wordId === tile.wordId) {
      // Ghép đúng!
      const wordId = tile.wordId;
      const matchedWord = words.find((w) => w.user_vocabulary_id === wordId);
      if (matchedWord) {
        playAudio(matchedWord.headword, matchedWord.audio_url);
      }

      setMatchingTiles((prev) =>
        prev.map((t) => (t.wordId === wordId ? { ...t, matched: true } : t))
      );
      setScore((s) => s + 1);
      setSelectedTile(null);

      // Kiểm tra vòng chơi đã hoàn thành chưa
      setTimeout(() => {
        setMatchingTiles((current) => {
          const allDone = current.every((t) => t.matched || t.wordId === wordId);
          if (allDone) {
            const nextRound = matchingRound + 1;
            setMatchingRound(nextRound);
            initMatchingRound(words, nextRound);
          }
          return current;
        });
      }, 400);
    } else {
      // Ghép sai -> hiệu ứng báo đỏ trong 600ms
      setMismatchedTileIds([selectedTile.id, tile.id]);
      setTimeout(() => {
        setMismatchedTileIds([]);
        setSelectedTile(null);
      }, 600);
    }
  };

  const currentWord = words[currentIndex];

  // ==========================================
  // MÀN HÌNH CHỌN CHẾ ĐỘ & BẮT ĐẦU LUYỆN TẬP
  // ==========================================
  if (!sessionStarted) {
    const modesList: Array<{
      id: CramMode;
      title: string;
      desc: string;
      icon: any;
      badge?: string;
      color: string;
    }> = [
      {
        id: 'meaning_type',
        title: 'Nhìn nghĩa gõ từ',
        desc: 'Xem nghĩa tiếng Việt, gõ từ vựng tiếng Anh tương ứng (rèn luyện phản xạ nhớ sâu)',
        icon: FileText,
        badge: 'Khuyên dùng',
        color: 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400',
      },
      {
        id: 'quiz',
        title: 'Trắc nghiệm nhanh',
        desc: 'Chọn 1 trong 4 đáp án đúng, phản xạ nhanh và ghi nhớ nghĩa cốt lõi',
        icon: HelpCircle,
        color: 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400',
      },
      {
        id: 'matching',
        title: 'Nối thẻ từ vựng',
        desc: 'Trò chơi ghép cặp từ tiếng Anh với nghĩa tiếng Việt, sinh động và trực quan',
        icon: Layers,
        badge: 'Trò chơi',
        color: 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400',
      },
      {
        id: 'scramble',
        title: 'Sắp xếp chữ cái',
        desc: 'Bấm chọn các ký tự bị xáo trộn để ghép thành từ đúng, nhớ chính xác mặt chữ',
        icon: Shuffle,
        badge: 'Mới',
        color: 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400',
      },
      {
        id: 'fill',
        title: 'Điền từ vào câu',
        desc: 'Đọc câu ví dụ ngữ cảnh thực tế và điền từ vựng còn thiếu vào chỗ trống',
        icon: BookOpen,
        color: 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400',
      },
      {
        id: 'dictation',
        title: 'Nghe & Chép chính tả',
        desc: 'Luyện nghe phát âm chuẩn giọng bản xứ và viết lại chính xác từng chữ',
        icon: Headphones,
        color: 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400',
      },
    ];

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-xs font-semibold">
            <Zap className="w-4 h-4" /> Luyện tập linh hoạt & Đa dạng
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Luyện tập từ vựng cấp tốc
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm max-w-lg mx-auto">
            Khám phá 6 chế độ ôn luyện phong phú giúp bạn nắm vững từ vựng từ mọi góc độ: phản xạ nghĩa, viết chính tả, phát âm và ngữ cảnh thực tế.
          </p>
        </div>

        <div className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
          {/* Chọn chủ đề */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                1. Chọn chủ đề từ vựng:
              </label>
              <span className="text-xs text-zinc-500">
                {selectedTopic ? `Đang chọn: ${selectedTopic}` : 'Tất cả chủ đề'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedTopic('')}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                  selectedTopic === ''
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                }`}
              >
                Tất cả từ vựng
              </button>
              {topics.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => setSelectedTopic(t.name)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                    selectedTopic === t.name
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                  }`}
                >
                  {t.name} ({t.count})
                </button>
              ))}
            </div>
          </div>

          {/* Chọn dạng bài tập */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              2. Chọn chế độ luyện tập:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {modesList.map((m) => {
                const IconComponent = m.icon;
                const isChosen = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer ${
                      isChosen
                        ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2 rounded-xl ${
                            isChosen
                              ? 'bg-emerald-600 text-white'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          {m.title}
                        </span>
                      </div>
                      {m.badge && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
                          {m.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed pl-0.5">
                      {m.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={startCramSession}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            <span>Bắt đầu luyện tập ngay</span>
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // MÀN HÌNH HOÀN THÀNH BÀI LUYỆN TẬP
  // ==========================================
  if (completed) {
    const totalItems = mode === 'matching' ? words.length : words.length;
    const accuracy = Math.min(100, Math.round((score / Math.max(1, totalItems)) * 100));

    return (
      <div className="max-w-md mx-auto text-center py-12 px-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-md space-y-6">
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-950/60 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <Award className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
            Xuất sắc hoàn thành!
          </span>
          <h2 className="text-2xl font-extrabold">Kết quả luyện tập</h2>
          <p className="text-zinc-500 text-sm">
            Bạn đã đạt <span className="font-bold text-emerald-600 text-lg">{score}</span> điểm
            (độ chính xác {accuracy}%)
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 text-left space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="flex justify-between">
            <span>Chế độ:</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
              {mode === 'meaning_type' && 'Nhìn nghĩa gõ từ'}
              {mode === 'quiz' && 'Trắc nghiệm nhanh'}
              {mode === 'matching' && 'Nối thẻ từ vựng'}
              {mode === 'scramble' && 'Sắp xếp chữ cái'}
              {mode === 'fill' && 'Điền từ vào câu'}
              {mode === 'dictation' && 'Nghe chép chính tả'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Tổng số từ ôn luyện:</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{words.length} từ</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <button
            onClick={() => setSessionStarted(false)}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Luyện tập chế độ khác</span>
          </button>
          <Link
            href="/review"
            className="w-full py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium text-sm transition-colors text-center"
          >
            Ôn tập Flashcard theo lịch
          </Link>
        </div>
      </div>
    );
  }

  // ==========================================
  // CHẾ ĐỘ 1: NHÌN NGHĨA GÕ TỪ (Meaning -> Type)
  // ==========================================
  const renderMeaningType = () => {
    const wordLength = currentWord.headword.length;
    const firstLetter = currentWord.headword[0];
    const maskedPreview = currentWord.headword
      .split('')
      .map((c, i) => (showHint && i === 0 ? c : '_'))
      .join(' ');

    const handleCheckMeaningType = (e: React.FormEvent) => {
      e.preventDefault();
      if (answered || !userMeaningTypeInput.trim()) return;

      const right =
        userMeaningTypeInput.trim().toLowerCase() === currentWord.headword.toLowerCase();
      setAnswered(true);
      setIsCorrect(right);
      if (right) setScore((s) => s + 1);
      playAudio(currentWord.headword, currentWord.audio_url);
    };

    return (
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full">
            Nhìn nghĩa gõ từ tiếng Anh
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 leading-snug">
            &ldquo;{currentWord.meaning_vi}&rdquo;
          </h2>
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
            <span>Từ gồm {wordLength} ký tự</span>
            <span>•</span>
            <span className="font-mono tracking-widest text-zinc-600 dark:text-zinc-400 font-bold">
              {maskedPreview}
            </span>
          </div>
        </div>

        <form onSubmit={handleCheckMeaningType} className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={userMeaningTypeInput}
              onChange={(e) => setUserMeaningTypeInput(e.target.value)}
              disabled={answered}
              placeholder="Gõ từ tiếng Anh tương ứng..."
              className="w-full px-5 py-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center font-bold text-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
          </div>

          {!answered && (
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => setShowHint(true)}
                disabled={showHint}
                className="w-full sm:w-auto px-4 py-3 sm:py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{showHint ? `Chữ cái đầu: ${firstLetter.toUpperCase()}` : 'Gợi ý chữ cái đầu'}</span>
              </button>
              <button
                type="submit"
                disabled={!userMeaningTypeInput.trim()}
                className="w-full sm:flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-sm disabled:opacity-50 cursor-pointer text-center"
              >
                Kiểm tra kết quả
              </button>
            </div>
          )}

          {answered && (
            <div
              className={`p-5 rounded-2xl border space-y-3 ${
                isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-base">
                  {isCorrect ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Chính xác tuyệt đối!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span>Chưa đúng! Đáp án là: <strong>{currentWord.headword}</strong></span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => playAudio(currentWord.headword, currentWord.audio_url)}
                  className="p-2 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:scale-110 transition-transform cursor-pointer"
                >
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                </button>
              </div>

              {currentWord.ipa && (
                <p className="text-xs font-mono text-zinc-500">Phiên âm: /{currentWord.ipa}/</p>
              )}

              {currentWord.examples?.[0] && (
                <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 text-xs space-y-1">
                  <p className="italic text-zinc-700 dark:text-zinc-300">
                    &ldquo;{currentWord.examples[0].en}&rdquo;
                  </p>
                  <p className="text-zinc-500">{currentWord.examples[0].vi}</p>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    );
  };

  // ==========================================
  // CHẾ ĐỘ 2: TRẮC NGHIỆM (Quiz)
  // ==========================================
  const renderQuiz = () => {
    const correctAnswer = currentWord.meaning_vi;
    const otherWords = words.filter((w) => w.headword !== currentWord.headword);
    let distractors = otherWords.map((w) => w.meaning_vi).filter(Boolean);

    // Bổ sung các đáp án giả lập nếu số lượng từ trong danh sách ít hơn 4
    if (distractors.length < 3) {
      const extra = DEFAULT_DISTRACTORS.filter((d) => d !== correctAnswer && !distractors.includes(d));
      distractors = [...distractors, ...extra].slice(0, 3);
    } else {
      distractors = distractors.slice(0, 3);
    }

    const options = [correctAnswer, ...distractors].sort();

    const handleSelect = (opt: string) => {
      if (answered) return;
      setSelectedOption(opt);
      setAnswered(true);
      const right = opt === correctAnswer;
      setIsCorrect(right);
      if (right) setScore((s) => s + 1);
      playAudio(currentWord.headword, currentWord.audio_url);
    };

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold tracking-wider text-blue-600 dark:text-blue-400 uppercase bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-full">
            Chọn nghĩa tiếng Việt đúng
          </span>
          <div className="flex items-center justify-center gap-3 pt-2">
            <h2 className="text-3xl font-extrabold capitalize text-zinc-900 dark:text-zinc-100">
              {currentWord.headword}
            </h2>
            <button
              type="button"
              onClick={() => playAudio(currentWord.headword, currentWord.audio_url)}
              className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 hover:scale-110 transition-transform cursor-pointer"
            >
              <Volume2 className="w-5 h-5 text-emerald-600" />
            </button>
          </div>
          {currentWord.ipa && (
            <p className="text-xs font-mono text-zinc-500">/{currentWord.ipa}/</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          {options.map((opt, idx) => {
            const isThisSelected = selectedOption === opt;
            let btnStyle =
              'border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 bg-white dark:bg-zinc-900';
            if (answered) {
              if (opt === correctAnswer) {
                btnStyle =
                  'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold';
              } else if (isThisSelected) {
                btnStyle =
                  'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-bold';
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(opt)}
                disabled={answered}
                className={`p-4 rounded-2xl border text-left font-medium text-sm transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
              >
                <span>{opt}</span>
                {answered && opt === correctAnswer && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 ml-2" />
                )}
                {answered && isThisSelected && opt !== correctAnswer && (
                  <XCircle className="w-5 h-5 text-red-600 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ==========================================
  // CHẾ ĐỘ 3: GHÉP CẶP TỪ VỰNG (Matching Game)
  // ==========================================
  const renderMatching = () => {
    const totalRounds = Math.ceil(words.length / MATCHING_BATCH_SIZE);
    const matchedCount = matchingTiles.filter((t) => t.matched).length / 2;
    const currentRoundWordsCount = matchingTiles.length / 2;

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-bold tracking-wider text-purple-600 dark:text-purple-400 uppercase bg-purple-50 dark:bg-purple-950/60 px-3 py-1 rounded-full">
              Ghép cặp từ vựng • Vòng {matchingRound + 1} / {totalRounds}
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            Chạm vào 1 thẻ tiếng Anh và 1 thẻ tiếng Việt có nghĩa tương ứng để triệt tiêu chúng!
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
          {matchingTiles.map((tile) => {
            const isSelected = selectedTile?.id === tile.id;
            const isMismatched = mismatchedTileIds.includes(tile.id);

            let tileStyle =
              'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:border-purple-400';

            if (tile.matched) {
              tileStyle =
                'opacity-30 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 pointer-events-none scale-95';
            } else if (isMismatched) {
              tileStyle =
                'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 animate-bounce scale-105';
            } else if (isSelected) {
              tileStyle =
                'border-purple-600 ring-2 ring-purple-500/30 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold scale-102';
            }

            return (
              <button
                key={tile.id}
                onClick={() => handleTileClick(tile)}
                disabled={tile.matched}
                className={`p-2.5 sm:p-4 min-h-[64px] sm:min-h-[76px] rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer shadow-sm ${tileStyle}`}
              >
                <span
                  className={`text-xs sm:text-base font-semibold max-w-full break-words leading-snug ${
                    tile.type === 'en' ? 'capitalize font-bold text-indigo-900 dark:text-indigo-300' : ''
                  }`}
                >
                  {tile.text}
                </span>
                <span className="text-[10px] text-zinc-400 uppercase font-medium">
                  {tile.type === 'en' ? 'Tiếng Anh' : 'Tiếng Việt'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <span>Đã ghép đúng: {matchedCount} / {currentRoundWordsCount} cặp</span>
          <span className="text-purple-600 font-bold">Điểm số: {score}</span>
        </div>
      </div>
    );
  };

  // ==========================================
  // CHẾ ĐỘ 4: SẮP XẾP CHỮ CÁI (Word Scramble)
  // ==========================================
  const renderScramble = () => {
    const targetLength = currentWord.headword.length;
    const isFull = selectedLetterIds.length === targetLength;

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold tracking-wider text-amber-600 dark:text-amber-400 uppercase bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-full">
            Sắp xếp chữ cái thành từ đúng
          </span>
          <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
            &ldquo;{currentWord.meaning_vi}&rdquo;
          </h2>
          <p className="text-xs text-zinc-500">
            Chạm vào các chữ cái bên dưới để sắp xếp theo đúng thứ tự
          </p>
        </div>

        {/* Các ô ký tự đã xếp */}
        <div className="flex flex-wrap items-center justify-center gap-2 min-h-[56px] p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
          {Array.from({ length: targetLength }).map((_, index) => {
            const letterId = selectedLetterIds[index];
            const letter = letterId !== undefined
              ? scrambleTiles.find((t) => t.id === letterId)?.char
              : null;

            return (
              <button
                key={index}
                type="button"
                onClick={() => letterId !== undefined && handleRemoveLetter(letterId)}
                disabled={answered || letterId === undefined}
                className={`w-9 h-11 sm:w-10 sm:h-12 rounded-xl border-2 font-extrabold text-base sm:text-lg flex items-center justify-center transition-all ${
                  letter
                    ? 'border-amber-500 bg-white dark:bg-zinc-900 text-amber-600 shadow-sm cursor-pointer hover:border-red-400 hover:text-red-500'
                    : 'border-dashed border-zinc-300 dark:border-zinc-600 text-transparent'
                }`}
              >
                {letter || '_'}
              </button>
            );
          })}
        </div>

        {/* Các chữ cái khả dụng để chọn */}
        {!answered && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              {scrambleTiles.map((tile) => (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => handlePickLetter(tile)}
                  disabled={tile.used}
                  className={`w-9 h-11 sm:w-11 sm:h-12 rounded-xl border font-bold text-base sm:text-lg transition-all shadow-sm ${
                    tile.used
                      ? 'opacity-20 border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed'
                      : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:border-amber-500 hover:scale-105 active:scale-95 cursor-pointer'
                  }`}
                >
                  {tile.char}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-1.5 sm:gap-2 pt-2">
              <button
                type="button"
                onClick={handleScrambleBackspace}
                disabled={selectedLetterIds.length === 0}
                className="px-2.5 sm:px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer shrink-0"
              >
                Xóa chữ
              </button>
              <button
                type="button"
                onClick={handleScrambleReset}
                disabled={selectedLetterIds.length === 0}
                className="px-2.5 sm:px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer shrink-0"
              >
                Làm lại
              </button>
              <button
                type="button"
                onClick={checkScrambleAnswer}
                disabled={!isFull}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all disabled:opacity-40 cursor-pointer text-center"
              >
                Kiểm tra
              </button>
            </div>
          </div>
        )}

        {answered && (
          <div
            className={`p-5 rounded-2xl border space-y-3 ${
              isCorrect
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-base">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Chính xác! Bạn ghép rất giỏi!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span>Chưa đúng! Từ chính xác là: <strong>{currentWord.headword}</strong></span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => playAudio(currentWord.headword, currentWord.audio_url)}
                className="p-2 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:scale-110 transition-transform cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-emerald-600" />
              </button>
            </div>
            {currentWord.ipa && (
              <p className="text-xs font-mono text-zinc-500">Phiên âm: /{currentWord.ipa}/</p>
            )}
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // CHẾ ĐỘ 5: ĐIỀN TỪ VÀO CÂU (Fill-in-the-blank)
  // ==========================================
  const renderFill = () => {
    const example = currentWord.examples?.[0];
    const sentence = example?.en || `This is an important sentence with the word ${currentWord.headword}.`;
    const regex = new RegExp(`\\b${currentWord.headword}\\b`, 'gi');
    const maskedSentence = sentence.replace(regex, '______');

    const handleCheckFill = (e: React.FormEvent) => {
      e.preventDefault();
      if (answered || !userFillInput.trim()) return;
      const right = userFillInput.trim().toLowerCase() === currentWord.headword.toLowerCase();
      setAnswered(true);
      setIsCorrect(right);
      if (right) setScore((s) => s + 1);
      playAudio(currentWord.headword, currentWord.audio_url);
    };

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold tracking-wider text-teal-600 dark:text-teal-400 uppercase bg-teal-50 dark:bg-teal-950/60 px-3 py-1 rounded-full">
            Điền từ vào câu ví dụ
          </span>
          <p className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 pt-2">
            &ldquo;{maskedSentence}&rdquo;
          </p>
          {example?.vi && <p className="text-xs text-zinc-500">{example.vi}</p>}
        </div>

        <form onSubmit={handleCheckFill} className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            value={userFillInput}
            onChange={(e) => setUserFillInput(e.target.value)}
            disabled={answered}
            placeholder="Gõ từ còn thiếu vào đây..."
            className="w-full px-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            autoFocus
          />

          {!answered && (
            <button
              type="submit"
              disabled={!userFillInput.trim()}
              className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              Kiểm tra
            </button>
          )}

          {answered && (
            <div
              className={`p-4 rounded-2xl border text-center font-medium text-sm ${
                isCorrect
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              {isCorrect ? (
                'Chính xác! Bạn áp dụng từ vào câu rất chuẩn!'
              ) : (
                <>
                  Chưa chính xác! Đáp án đúng là: <strong>&ldquo;{currentWord.headword}&rdquo;</strong> ({currentWord.meaning_vi})
                </>
              )}
            </div>
          )}
        </form>
      </div>
    );
  };

  // ==========================================
  // CHẾ ĐỘ 6: NGHE & CHÉP CHÍNH TẢ (Audio Dictation)
  // ==========================================
  const renderDictation = () => {
    const handleCheckDictation = (e: React.FormEvent) => {
      e.preventDefault();
      if (answered || !userDictationInput.trim()) return;
      const right = userDictationInput.trim().toLowerCase() === currentWord.headword.toLowerCase();
      setAnswered(true);
      setIsCorrect(right);
      if (right) setScore((s) => s + 1);
      playAudio(currentWord.headword, currentWord.audio_url);
    };

    return (
      <div className="space-y-6 text-center">
        <span className="text-xs font-bold tracking-wider text-rose-600 dark:text-rose-400 uppercase bg-rose-50 dark:bg-rose-950/60 px-3 py-1 rounded-full">
          Nghe phát âm và viết lại
        </span>

        <div>
          <button
            type="button"
            onClick={() => playAudio(currentWord.headword, currentWord.audio_url)}
            className="p-5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 hover:scale-110 active:scale-95 transition-transform shadow-md cursor-pointer"
          >
            <Volume2 className="w-8 h-8" />
          </button>
          <p className="text-xs text-zinc-400 mt-2">Bấm vào loa để nghe lại giọng đọc</p>
        </div>

        <form onSubmit={handleCheckDictation} className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            value={userDictationInput}
            onChange={(e) => setUserDictationInput(e.target.value)}
            disabled={answered}
            placeholder="Gõ từ bạn nghe được..."
            className="w-full px-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            autoFocus
          />

          {!answered && (
            <button
              type="submit"
              disabled={!userDictationInput.trim()}
              className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              Kiểm tra
            </button>
          )}

          {answered && (
            <div
              className={`p-4 rounded-2xl border text-center font-medium text-sm ${
                isCorrect
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              {isCorrect ? (
                'Chính xác! Bạn có đôi tai nghe rất nhạy!'
              ) : (
                <>
                  Chưa đúng! Đáp án đúng: <strong>&ldquo;{currentWord.headword}&rdquo;</strong> ({currentWord.meaning_vi})
                </>
              )}
            </div>
          )}
        </form>
      </div>
    );
  };

  // ==========================================
  // KHUNG CHUNG KHI ĐANG TRONG PHIÊN LUYỆN TẬP
  // ==========================================
  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Thanh công cụ trên cùng */}
      <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
        <button
          onClick={() => setSessionStarted(false)}
          className="inline-flex items-center gap-1 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Đổi chế độ</span>
        </button>

        {mode !== 'matching' && (
          <div className="font-semibold text-zinc-700 dark:text-zinc-300">
            Từ {currentIndex + 1} / {words.length}
          </div>
        )}

        <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
          Điểm: {score}
        </span>
      </div>

      {/* Thẻ nội dung chính */}
      <div className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        {mode === 'meaning_type' && renderMeaningType()}
        {mode === 'quiz' && renderQuiz()}
        {mode === 'matching' && renderMatching()}
        {mode === 'scramble' && renderScramble()}
        {mode === 'fill' && renderFill()}
        {mode === 'dictation' && renderDictation()}

        {/* Nút Chuyển câu hỏi tiếp theo (ngoại trừ matching mode tự chuyển vòng) */}
        {mode !== 'matching' && answered && (
          <button
            onClick={handleNext}
            className="w-full mt-6 py-4 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{currentIndex + 1 < words.length ? 'Câu tiếp theo' : 'Xem kết quả bài tập'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
