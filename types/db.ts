export interface WordFamilyItem {
  part_of_speech: 'verb' | 'noun' | 'adjective' | 'adverb' | string;
  word: string;
  meaning_vi: string;
}

export interface PrepositionItem {
  pattern: string;
  explanation: string;
  example?: string;
}

export interface ExampleItem {
  en: string;
  vi: string;
}

export interface CollocationItem {
  phrase: string;
  meaning_vi: string;
}

export interface GeminiEnrichmentResponse {
  headword: string;
  part_of_speech?: string;
  ipa?: string;
  cefr_level?: string;
  meaning_vi: string;
  word_etymology?: string;
  collocations?: CollocationItem[];
  synonyms?: string[];
  antonyms?: string[];
  word_family: WordFamilyItem[];
  prepositions: PrepositionItem[];
  examples: ExampleItem[];
  topics: string[];
}

export interface Word {
  id: string;
  headword: string;
  ipa: string | null;
  part_of_speech?: string | null;
  cefr_level?: string | null;
  audio_url: string | null;
  meaning_vi: string;
  word_etymology?: string | null;
  collocations?: CollocationItem[];
  synonyms?: string[];
  antonyms?: string[];
  word_family: WordFamilyItem[];
  prepositions: PrepositionItem[];
  examples: ExampleItem[];
  topics: string[];
  created_at?: string;
  user_vocabulary?: UserVocabulary;
}

export interface UserVocabulary {
  id: string;
  user_id: string;
  word_id: string;
  repetition_level: number;
  interval_days: number;
  ease_factor: number;
  next_review_at: string;
  is_urgent_review: boolean;
  urgent_priority: number;
  personal_notes: string | null;
  created_at?: string;
  updated_at?: string;
  word?: Word;
  words?: Word;
}

export interface DailyStudyStats {
  id: string;
  user_id: string;
  study_date: string;
  cards_reviewed: number;
  successful_reviews: number;
  created_at?: string;
}

export interface ReviewLog {
  id: string;
  user_id: string;
  word_id: string;
  rating: 1 | 2 | 3 | 4;
  reviewed_at?: string;
}

