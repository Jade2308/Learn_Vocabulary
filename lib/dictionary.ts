export interface DictionaryResult {
  ipa: string | null;
  audio_url: string | null;
}

interface Phonetic {
  text?: string;
  audio?: string;
}

interface DictionaryEntry {
  phonetic?: string;
  phonetics?: Phonetic[];
}

export async function fetchDictionaryData(word: string): Promise<DictionaryResult> {
  try {
    const encoded = encodeURIComponent(word.trim().toLowerCase());
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encoded}`, {
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return { ipa: null, audio_url: null };
    }

    const entries: DictionaryEntry[] = await response.json();
    if (!Array.isArray(entries) || entries.length === 0) {
      return { ipa: null, audio_url: null };
    }

    let ipa: string | null = null;
    let audio_url: string | null = null;

    for (const entry of entries) {
      if (!ipa && entry.phonetic) {
        ipa = entry.phonetic;
      }

      if (Array.isArray(entry.phonetics)) {
        for (const p of entry.phonetics) {
          if (!ipa && p.text) {
            ipa = p.text;
          }
          if (!audio_url && p.audio && p.audio.trim() !== '') {
            audio_url = p.audio;
          }
          if (ipa && audio_url) break;
        }
      }
      if (ipa && audio_url) break;
    }

    return { ipa, audio_url };
  } catch (err) {
    console.error('Free Dictionary API fetch error:', err);
    return { ipa: null, audio_url: null };
  }
}
