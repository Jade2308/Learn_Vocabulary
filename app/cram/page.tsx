'use client';

import { useState, useEffect } from 'react';
import { Zap, Volume2, CheckCircle2, XCircle, RotateCcw, Award, Loader2 } from 'lucide-react';
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

export default function CramPage() {
  const [topics, setTopics] = useState<Array<{ name: string; count: number }>>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [words, setWords] = useState<CramWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  const [mode, setMode] = useState<'quiz' | 'fill' | 'dictation'>('quiz');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const [userFillInput, setUserFillInput] = useState('');
  const [userDictationInput, setUserDictationInput] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  useEffect(() => {
    fetchTopics();
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
        setWords(data.words);
        setSessionStarted(true);
        setCurrentIndex(0);
        setScore(0);
        setCompleted(false);
        resetTurn();
      } else {
        alert(data.message || 'Chưa có từ vựng nào trong danh mục này để ôn gấp!');
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
    setSelectedOption(null);
    setAnswered(false);
    setIsCorrect(false);
  };

  const handleNext = () => {
    if (currentIndex + 1 < words.length) {
      setCurrentIndex((prev) => prev + 1);
      resetTurn();
    } else {
      setCompleted(true);
      confetti({ particleCount: 80, spread: 60 });
    }
  };

  const currentWord = words[currentIndex];

  if (!sessionStarted) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" /> Chế độ ôn gấp trước kỳ thi
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Cram Mode</h1>
          <p className="text-zinc-500 text-sm">
            Luyện tập cấp tốc qua 3 dạng bài tập (Trắc nghiệm, Điền từ, Nghe-chép). Không ảnh hưởng tới hàng đợi lịch học SRS thông thường!
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Chọn chủ đề cần ôn:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedTopic('')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  selectedTopic === ''
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                }`}
              >
                Tất cả từ vựng
              </button>
              {topics.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => setSelectedTopic(t.name)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    selectedTopic === t.name
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {t.name} ({t.count})
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Chọn dạng bài tập:
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setMode('quiz')}
                className={`p-3 rounded-2xl border text-center text-xs font-medium transition-all ${
                  mode === 'quiz'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                1. Trắc nghiệm
              </button>
              <button
                type="button"
                onClick={() => setMode('fill')}
                className={`p-3 rounded-2xl border text-center text-xs font-medium transition-all ${
                  mode === 'fill'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                2. Điền từ
              </button>
              <button
                type="button"
                onClick={() => setMode('dictation')}
                className={`p-3 rounded-2xl border text-center text-xs font-medium transition-all ${
                  mode === 'dictation'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                3. Nghe & Chép
              </button>
            </div>
          </div>

          <button
            onClick={startCramSession}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            <span>Bắt đầu ôn gấp</span>
          </button>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
          <Award className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Hoàn thành phiên Cram!</h2>
          <p className="text-zinc-500 text-sm">
            Bạn trả lời đúng <span className="font-bold text-emerald-600">{score}</span> / {words.length} câu
          </p>
        </div>
        <button
          onClick={() => setSessionStarted(false)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium text-sm transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Ôn tập phiên khác</span>
        </button>
      </div>
    );
  }

  const renderQuiz = () => {
    const correctAnswer = currentWord.meaning_vi;
    const otherWords = words.filter((w) => w.headword !== currentWord.headword);
    const distractors = otherWords.slice(0, 3).map((w) => w.meaning_vi);
    const options = [correctAnswer, ...distractors].sort();

    const handleSelect = (opt: string) => {
      if (answered) return;
      setSelectedOption(opt);
      setAnswered(true);
      const right = opt === correctAnswer;
      setIsCorrect(right);
      if (right) setScore((s) => s + 1);
    };

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase">Chọn nghĩa đúng của từ</span>
          <h2 className="text-3xl font-extrabold capitalize">{currentWord.headword}</h2>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {options.map((opt, idx) => {
            const isThisSelected = selectedOption === opt;
            let btnStyle = 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-500';
            if (answered) {
              if (opt === correctAnswer) {
                btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600';
              } else if (isThisSelected) {
                btnStyle = 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-600';
              }
            }
            return (
              <button
                key={idx}
                onClick={() => handleSelect(opt)}
                disabled={answered}
                className={`p-4 rounded-2xl border text-left font-medium text-sm transition-all flex items-center justify-between ${btnStyle}`}
              >
                <span>{opt}</span>
                {answered && opt === correctAnswer && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {answered && isThisSelected && opt !== correctAnswer && <XCircle className="w-4 h-4 text-red-600" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderFill = () => {
    const example = currentWord.examples?.[0];
    const sentence = example?.en || `This is a sample sentence with the word ${currentWord.headword}.`;
    const regex = new RegExp(`\\b${currentWord.headword}\\b`, 'gi');
    const maskedSentence = sentence.replace(regex, '______');

    const handleCheckFill = (e: React.FormEvent) => {
      e.preventDefault();
      if (answered || !userFillInput.trim()) return;
      setAnswered(true);
      const right = userFillInput.trim().toLowerCase() === currentWord.headword.toLowerCase();
      setIsCorrect(right);
      if (right) setScore((s) => s + 1);
    };

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase">Điền từ vào chỗ trống</span>
          <p className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            &ldquo;{maskedSentence}&rdquo;
          </p>
          {example?.vi && <p className="text-xs text-zinc-500">{example.vi}</p>}
        </div>

        <form onSubmit={handleCheckFill} className="space-y-4">
          <input
            type="text"
            value={userFillInput}
            onChange={(e) => setUserFillInput(e.target.value)}
            disabled={answered}
            placeholder="Gõ từ còn thiếu..."
            className="w-full px-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            autoFocus
          />

          {!answered && (
            <button
              type="submit"
              disabled={!userFillInput.trim()}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-all disabled:opacity-50"
            >
              Kiểm tra
            </button>
          )}

          {answered && (
            <div className={`p-4 rounded-2xl border text-center font-medium text-sm ${isCorrect ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
              {isCorrect ? 'Chính xác!' : `Sai rồi! Đáp án là: "${currentWord.headword}"`}
            </div>
          )}
        </form>
      </div>
    );
  };

  const renderDictation = () => {
    const handleCheckDictation = (e: React.FormEvent) => {
      e.preventDefault();
      if (answered || !userDictationInput.trim()) return;
      setAnswered(true);
      const right = userDictationInput.trim().toLowerCase() === currentWord.headword.toLowerCase();
      setIsCorrect(right);
      if (right) setScore((s) => s + 1);
    };

    return (
      <div className="space-y-6 text-center">
        <span className="text-xs font-semibold text-zinc-400 uppercase">Nghe và gõ lại từ</span>
        <div>
          <button
            type="button"
            onClick={() => playAudio(currentWord.headword, currentWord.audio_url)}
            className="p-4 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 hover:scale-105 transition-transform"
          >
            <Volume2 className="w-8 h-8" />
          </button>
          <p className="text-xs text-zinc-400 mt-2">Bấm để nghe âm thanh</p>
        </div>

        <form onSubmit={handleCheckDictation} className="space-y-4">
          <input
            type="text"
            value={userDictationInput}
            onChange={(e) => setUserDictationInput(e.target.value)}
            disabled={answered}
            placeholder="Gõ từ bạn nghe được..."
            className="w-full px-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            autoFocus
          />

          {!answered && (
            <button
              type="submit"
              disabled={!userDictationInput.trim()}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-all disabled:opacity-50"
            >
              Kiểm tra
            </button>
          )}

          {answered && (
            <div className={`p-4 rounded-2xl border text-center font-medium text-sm ${isCorrect ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
              {isCorrect ? 'Chính xác!' : `Đáp án đúng: "${currentWord.headword}" (${currentWord.meaning_vi})`}
            </div>
          )}
        </form>
      </div>
    );
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>Câu {currentIndex + 1} / {words.length}</span>
        <span className="font-semibold text-emerald-600">Điểm: {score}</span>
      </div>

      <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        {mode === 'quiz' && renderQuiz()}
        {mode === 'fill' && renderFill()}
        {mode === 'dictation' && renderDictation()}

        {answered && (
          <button
            onClick={handleNext}
            className="w-full mt-6 py-3.5 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-sm transition-all"
          >
            {currentIndex + 1 < words.length ? 'Câu tiếp theo' : 'Xem kết quả'}
          </button>
        )}
      </div>
    </div>
  );
}

