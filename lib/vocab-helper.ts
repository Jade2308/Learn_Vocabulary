/**
 * Utility helpers to parse and format vocabulary data:
 * - Clean Vietnamese meanings (remove any accidental brackets/CEFR)
 * - Categorize Prepositions vs Collocations
 * - Color codes for CEFR levels
 */

export interface ParsedMeaningMeta {
  pureMeaning: string;
  pos: string | null;
  cefr: string | null;
}

export function parseMeaningAndMeta(
  rawMeaning: string,
  explicitPos?: string | null,
  explicitCefr?: string | null
): ParsedMeaningMeta {
  let meaning = (rawMeaning || '').trim();
  let pos = explicitPos || null;
  let cefr = explicitCefr || null;

  // Pattern: "(noun • A2) nghĩa..." or "(verb) nghĩa..." or "(B2) nghĩa..."
  const match = meaning.match(/^\s*\(([^)]+)\)\s*(.*)$/);
  if (match) {
    const metaInside = match[1];
    const remainingText = match[2];

    const parts = metaInside.split(/[•·,]/).map((s) => s.trim());
    for (const part of parts) {
      if (/^[A-C][1-2]$/i.test(part)) {
        if (!cefr) cefr = part.toUpperCase();
      } else if (part) {
        if (!pos) pos = part;
      }
    }
    meaning = remainingText.trim();
  }

  return { pureMeaning: meaning || rawMeaning, pos, cefr };
}

const PREP_WORDS = new Set([
  'to', 'for', 'with', 'in', 'on', 'at', 'from', 'about', 'into', 'by',
  'under', 'over', 'against', 'between', 'through', 'towards', 'onto', 'upon'
]);

export interface CategorizedStructureItem {
  pattern: string;
  explanation: string;
  example?: string;
  type?: 'preposition' | 'collocation' | string;
}

export function categorizePrepsAndCollocations(
  items?: Array<{ pattern: string; explanation: string; example?: string; type?: string }>,
  explicitCollocations?: Array<{ phrase: string; meaning_vi: string }>
) {
  const prepositions: CategorizedStructureItem[] = [];
  const collocations: CategorizedStructureItem[] = [];

  // Thêm collocations tường minh nếu có
  if (explicitCollocations && explicitCollocations.length > 0) {
    for (const col of explicitCollocations) {
      collocations.push({
        pattern: col.phrase,
        explanation: col.meaning_vi,
        type: 'collocation',
      });
    }
  }

  if (items && items.length > 0) {
    for (const item of items) {
      // Nếu đã có cờ type
      if (item.type === 'collocation') {
        if (!collocations.some((c) => c.pattern.toLowerCase() === item.pattern.toLowerCase())) {
          collocations.push(item);
        }
        continue;
      }
      if (item.type === 'preposition') {
        if (!prepositions.some((p) => p.pattern.toLowerCase() === item.pattern.toLowerCase())) {
          prepositions.push(item);
        }
        continue;
      }

      // Tự động phân loại cho các bản ghi cũ
      const patternLower = item.pattern.toLowerCase();
      const words = patternLower.split(/\s+/);
      const hasPrep = words.some((w) => PREP_WORDS.has(w));
      const hasPlaceholder = /sth|sb|something|someone|\+/i.test(patternLower);

      // Nếu có placeholder (sth/sb) hoặc bắt đầu/kết thúc bằng giới từ hoặc cấu trúc giới từ rõ rệt
      if (hasPlaceholder || (hasPrep && (PREP_WORDS.has(words[0]) || PREP_WORDS.has(words[words.length - 1]) || words.includes('to') || words.includes('for') || words.includes('with') || words.includes('in') || words.includes('on')))) {
        prepositions.push({ ...item, type: 'preposition' });
      } else {
        collocations.push({ ...item, type: 'collocation' });
      }
    }
  }

  return { prepositions, collocations };
}

export function getCefrBadgeStyle(level?: string | null) {
  if (!level) return '';
  const l = level.toUpperCase();
  if (l.startsWith('A')) {
    return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
  }
  if (l.startsWith('B')) {
    return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
  }
  return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800';
}

/**
 * Trích xuất toàn bộ metadata (CEFR, loại từ, gốc từ, từ đồng nghĩa/trái nghĩa, collocations, prepositions)
 * Hỗ trợ cả 2 trường hợp:
 * 1. Database đã có cột riêng (part_of_speech, cefr_level, word_etymology,...)
 * 2. Database lưu dạng fallback (trong JSONB prepositions)
 */
export function extractWordMetadata(word?: any) {
  if (!word) {
    return {
      pureMeaning: '',
      pos: null,
      cefr: null,
      word_etymology: null,
      synonyms: [] as string[],
      antonyms: [] as string[],
      collocations: [] as CategorizedStructureItem[],
      prepositions: [] as CategorizedStructureItem[],
    };
  }

  const { pureMeaning, pos: parsedPos, cefr: parsedCefr } = parseMeaningAndMeta(
    word.meaning_vi,
    word.part_of_speech,
    word.cefr_level
  );

  let metaItem: any = null;
  if (Array.isArray(word.prepositions)) {
    metaItem = word.prepositions.find((p: any) => p?.type === '__meta__');
  }

  const pos = parsedPos || metaItem?.part_of_speech || null;
  const cefr = parsedCefr || metaItem?.cefr_level || null;
  const word_etymology = word.word_etymology || metaItem?.word_etymology || null;
  const synonyms: string[] = (word.synonyms && word.synonyms.length > 0) ? word.synonyms : (metaItem?.synonyms || []);
  const antonyms: string[] = (word.antonyms && word.antonyms.length > 0) ? word.antonyms : (metaItem?.antonyms || []);
  
  // Lọc bỏ __meta__ khi phân loại prepositions và collocations
  const cleanItems = Array.isArray(word.prepositions)
    ? word.prepositions.filter((p: any) => p?.type !== '__meta__')
    : [];

  const { prepositions, collocations } = categorizePrepsAndCollocations(
    cleanItems,
    word.collocations || metaItem?.collocations
  );

  return {
    pureMeaning,
    pos,
    cefr,
    word_etymology,
    synonyms,
    antonyms,
    prepositions,
    collocations,
  };
}


