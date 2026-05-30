import Fuse from 'fuse.js';
import { Miracle, SearchResult } from '@/ijaz/types';
import { miracles } from '@/ijaz/data/miracles';

const fuseOptions = {
  keys: [
    { name: 'titleAr', weight: 2.0 },
    { name: 'title', weight: 1.8 },
    { name: 'summaryAr', weight: 1.5 },
    { name: 'summary', weight: 1.3 },
    { name: 'descriptionAr', weight: 1.0 },
    { name: 'description', weight: 0.8 },
    { name: 'tags', weight: 1.6 },
    { name: 'verses.arabicText', weight: 1.4 },
    { name: 'verses.translation', weight: 1.2 },
    { name: 'verses.keywords', weight: 1.5 },
    { name: 'bookSource.fullTextAr', weight: 0.7 },
    { name: 'bookSource.fullText', weight: 0.5 },
  ],
  threshold: 0.3,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2,
  useExtendedSearch: false,
  ignoreLocation: true,
};

const fuse = new Fuse(miracles, fuseOptions);

export function searchMiracles(query: string): SearchResult[] {
  if (!query || query.trim().length < 2) return [];

  const results = fuse.search(query);

  return results.map((result) => {
    const matchedField = result.matches?.[0]?.key || 'title';
    const highlight = result.matches?.[0]?.value || '';

    return {
      miracle: result.item,
      score: 1 - (result.score || 0),
      matchedField,
      highlight: highlight.slice(0, 200),
    };
  });
}

export function getSemanticSuggestions(query: string): string[] {
  const semanticMap: Record<string, string[]> = {
    'universe': ['توسع الكون', 'الانفجار العظيم', 'universe expansion', 'big bang'],
    'كون': ['توسع الكون', 'الانفجار العظيم', 'الضبط الدقيق'],
    'embryo': ['مراحل الجنين', 'الظلمات الثلاث', 'embryology stages'],
    'جنين': ['مراحل الجنين', 'الظلمات الثلاث', 'نطفة', 'علقة'],
    'mountain': ['الجبال أوتاداً', 'mountains as pegs', 'geology'],
    'جبال': ['الجبال أوتاداً', 'أوتاد', 'صفائح تكتونية'],
    'sea': ['ظلمات البحر', 'البرزخ', 'deep sea darkness'],
    'بحر': ['ظلمات البحر', 'البرزخ بين البحرين'],
    'prophecy': ['نبوءة الروم', 'فتح مكة', 'بدر', 'التوراة'],
    'نبوءة': ['الروم', 'فتح مكة', 'بدر', 'التوراة', 'الإنجيل'],
    'atheism': ['البرهان الكوني', 'الضبط الدقيق', 'التصميم', 'الأخلاق'],
    'إلحاد': ['البرهان الكوني', 'الضبط الدقيق', 'التصميم الذكي', 'البرهان الأخلاقي'],
    'god': ['وجود الله', 'البرهان الكوني', 'الضبط الدقيق', 'التصميم'],
    'الله': ['وجود الله', 'البرهان الكوني', 'البرهان الأخلاقي', 'القيوم'],
    'how did the universe begin': ['الانفجار العظيم', 'big bang', 'توسع الكون'],
    'water': ['الماء', 'كل حي من الماء', 'life from water'],
    'honey': ['العسل', 'شفاء', 'النحل', 'honey healing'],
  };

  const lowerQuery = query.toLowerCase();
  for (const [key, suggestions] of Object.entries(semanticMap)) {
    if (lowerQuery.includes(key) || query.includes(key)) {
      return suggestions;
    }
  }

  return [];
}
