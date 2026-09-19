/**
 * Phát âm thanh trực tiếp bằng Web Speech API của trình duyệt.
 * Ưu điểm:
 * - 0ms delay: không tải qua mạng, không phụ thuộc máy chủ bên thứ ba bị nghẽn mạng.
 * - Hỗ trợ phát âm chuẩn xác cho mọi từ đơn, họ từ và cả câu ví dụ dài.
 * - Hoạt động mượt mà, tức thì trên mọi thiết bị.
 */
export function playAudio(text: string, _optionalAudioUrl?: string | null) {
  if (!text || typeof text !== 'string') return;
  speakWithWebSpeech(text.trim());
}

function speakWithWebSpeech(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Web Speech API is not supported in this browser.');
    return;
  }

  // Khắc phục tình trạng Chromium (Chrome, Cốc Cốc, Edge) bị paused âm thầm
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();
  } catch {}

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.95;

  const voices = window.speechSynthesis.getVoices();
  const preferredVoice =
    voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') ||
          v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('Jenny') ||
          v.name.includes('David') ||
          v.name.includes('Aria'))
    ) || voices.find((v) => v.lang.startsWith('en'));

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  window.speechSynthesis.speak(utterance);
}

// Khởi tạo trước danh sách giọng đọc của trình duyệt khi chạy trên client
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
}


