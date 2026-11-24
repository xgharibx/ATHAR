/**
 * «القرآن ٢» — the Quran in numbers, counted from the text itself.
 *
 * Counting methods differ between scholars and sources, so each count here
 * states its method:
 *  - words: as the Quranic Arabic Corpus divides them (the numbering of the
 *    whole section); the basmala of each surah but al-Fatiha is not counted;
 *  - letters: the letters written in the Uthmani script (Tanzil), without
 *    vowel marks, the small alef, the small waw and ya, tatweel or signs.
 */
import type { Q2Text } from "./text";
import type { Q2Meta } from "./meta";

const LETTER = /[ء-غف-يٱ]/gu;

export type Q2Stats = {
  surahs: number;
  ayahs: number;
  words: number;
  letters: number;
  meccan: { surahs: number; ayahs: number };
  medinan: { surahs: number; ayahs: number };
  longestSurah: { s: number; ayahs: number; words: number };
  shortestSurah: { s: number; ayahs: number; words: number };
  longestAyah: { s: number; a: number; words: number };
  oneWordAyahs: Array<{ s: number; a: number }>;
  surahWords: number[];
  letterFrequency: Array<[string, number]>;
};

export function countLetters(word: string): number {
  return word.match(LETTER)?.length ?? 0;
}

export function computeStats(text: Q2Text, meta: Q2Meta): Q2Stats {
  let words = 0;
  let letters = 0;
  const freq = new Map<string, number>();
  const surahWords: number[] = [];
  let longestAyah = { s: 1, a: 1, words: 0 };
  const oneWordAyahs: Array<{ s: number; a: number }> = [];
  const meccan = { surahs: 0, ayahs: 0 };
  const medinan = { surahs: 0, ayahs: 0 };

  text.surahs.forEach((surah, i) => {
    const m = meta.surahs[i]!;
    const bucket = m.type === "meccan" ? meccan : medinan;
    bucket.surahs += 1;
    bucket.ayahs += surah.ayahs.length;
    let sw = 0;
    for (const ayah of surah.ayahs) {
      sw += ayah.words.length;
      if (ayah.words.length > longestAyah.words) longestAyah = { s: ayah.s, a: ayah.a, words: ayah.words.length };
      if (ayah.words.length === 1) oneWordAyahs.push({ s: ayah.s, a: ayah.a });
      for (const w of ayah.words) {
        for (const ch of w.text.match(LETTER) ?? []) {
          const c = ch === "ٱ" ? "ا" : ch;
          freq.set(c, (freq.get(c) ?? 0) + 1);
          letters += 1;
        }
      }
    }
    surahWords.push(sw);
    words += sw;
  });

  const bySize = surahWords.map((w, i) => ({ s: i + 1, ayahs: meta.surahs[i]!.ayahs, words: w }));
  const longestSurah = [...bySize].sort((a, b) => b.words - a.words)[0]!;
  const shortestSurah = [...bySize].sort((a, b) => a.words - b.words)[0]!;
  return {
    surahs: text.surahs.length,
    ayahs: meccan.ayahs + medinan.ayahs,
    words,
    letters,
    meccan,
    medinan,
    longestSurah,
    shortestSurah,
    longestAyah,
    oneWordAyahs,
    surahWords,
    letterFrequency: [...freq.entries()].sort((a, b) => b[1] - a[1]),
  };
}
