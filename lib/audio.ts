export function playAudio(word: string, audioUrl?: string | null) {
  if (audioUrl) {
    const audio = new Audio(audioUrl);
    audio.play().catch((err) => {
      console.warn('Audio URL playback failed, falling back to Web Speech API:', err);
      speakWithWebSpeech(word);
    });
  } else {
    speakWithWebSpeech(word);
  }
}

function speakWithWebSpeech(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Web Speech API is not supported in this browser.');
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;

  window.speechSynthesis.speak(utterance);
}

