/**
 * «القرآن ٢» — the meaning of each word, word by word (Quran.com API v4), in the
 * languages it has them for. Arabic is not among them: no open, word-by-word
 * Arabic gloss (غريب القرآن) is published as data, so Arabic readers have the
 * word's root, lemma and grammar in the word lens, and the tafsirs.
 *
 * Quran.com numbers words as the Quranic Arabic Corpus does, as this section
 * does («بَعْدَ مَا» is one word). Each ayah is still checked: if its word count
 * differs from ours, its meanings are left out rather than shown misplaced.
 */
import { cached } from "./cache";

export type Q2WordLang = { code: string; label: string; dir: "ltr" | "rtl" };

export const Q2_WORD_LANGS: Q2WordLang[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "ur", label: "اردو", dir: "rtl" },
  { code: "id", label: "Bahasa Indonesia", dir: "ltr" },
  { code: "tr", label: "Türkçe", dir: "ltr" },
  { code: "bn", label: "বাংলা", dir: "ltr" },
  { code: "fa", label: "فارسی", dir: "rtl" },
  { code: "hi", label: "हिन्दी", dir: "ltr" },
  { code: "ta", label: "தமிழ்", dir: "ltr" },
];

export const getWordLang = (code: string | null | undefined) => Q2_WORD_LANGS.find((l) => l.code === code);

type ApiWord = { position?: number; char_type_name?: string; translation?: { text?: string | null } };
type ApiVerse = { verse_number?: number; words?: ApiWord[] };

/** Per ayah, the meaning of each word in order; null for an ayah that does not line up. */
export function parseWordMeanings(verses: ApiVerse[], wordCounts: number[]): Array<string[] | null> {
  const out: Array<string[] | null> = wordCounts.map(() => null);
  for (const v of verses) {
    const a = v.verse_number ?? 0;
    if (a < 1 || a > wordCounts.length) continue;
    const words = (v.words ?? [])
      .filter((w) => w.char_type_name === "word")
      .sort((x, y) => (x.position ?? 0) - (y.position ?? 0))
      .map((w) => (w.translation?.text ?? "").replace(/[<>]/g, "").trim());
    out[a - 1] = words.length === wordCounts[a - 1] ? words : null;
  }
  return out;
}

const PER_PAGE = 50;

async function fetchPage(lang: string, s: number, page: number): Promise<{ verses: ApiVerse[]; pages: number }> {
  const url = `https://api.quran.com/api/v4/verses/by_chapter/${s}?words=true&language=${encodeURIComponent(lang)}&word_fields=position&per_page=${PER_PAGE}&page=${page}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`word meanings: HTTP ${res.status}`);
  const body = (await res.json()) as { verses?: ApiVerse[]; pagination?: { total_pages?: number } };
  return { verses: body.verses ?? [], pages: body.pagination?.total_pages ?? 1 };
}

/** A surah's word meanings in a language, kept on the device once read. */
export function loadWordMeanings(lang: string, s: number, wordCounts: number[]): Promise<Array<string[] | null>> {
  return cached(`wbw:${lang}:${s}`, async () => {
    const first = await fetchPage(lang, s, 1);
    const rest = await Promise.all(Array.from({ length: Math.max(0, first.pages - 1) }, (_, i) => fetchPage(lang, s, i + 2)));
    return parseWordMeanings([first, ...rest].flatMap((p) => p.verses), wordCounts);
  });
}
