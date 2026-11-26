/**
 * «القرآن الكريم» — Arabic for searching and comparing, never for display.
 *
 * The Uthmani script writes many words differently from everyday spelling:
 * the small (dagger) alef stands for a long ā that everyday spelling sometimes
 * writes («ٱلْعَـٰلَمِينَ» → العالمين) and sometimes does not («ذَٰلِكَ» → ذلك), and
 * some long vowels are written with waw («ٱلصَّلَوٰةَ» → الصلاة). So a Quran word
 * gets several keys, and a typed word matches if it equals any of them.
 */

const HARAKAT = /[\u064B-\u065F\u06D6-\u06ED]|\u0640/g;

function unifyLetters(text: string): string {
  return text
    .replace(/[\u0671\u0623\u0625\u0622]/gu, "ا")
    // A hamza on the line before an alef is the madda of everyday spelling:
    // «ءَامَنُوا» is «آمنوا», «قُرْءَان» is «قرآن».
    .replace(/ءا/gu, "ا")
    .replace(/ى/gu, "ي")
    .replace(/ة/gu, "ه")
    .replace(/ؤ/gu, "و")
    .replace(/ئ/gu, "ي");
}

/** Everyday-spelling key: diacritics removed, the small alef dropped. */
export function plainKey(text: string): string {
  return unifyLetters(text.replace(/ٰ/gu, "").replace(HARAKAT, "")).replace(/\s+/gu, " ").trim();
}

/** The same, with the small alef written as a full alef. */
export function alefKey(text: string): string {
  return unifyLetters(text.replace(/ٰ/gu, "ا").replace(HARAKAT, "")).replace(/\s+/gu, " ").trim();
}

/** The consonant skeleton: no long vowels, no hamza seats. */
export function skeletonKey(text: string): string {
  return plainKey(text).replace(/[اويء]/gu, "");
}

/** What a person types, made comparable with the keys above. */
export function queryKey(text: string): string {
  return plainKey(text);
}

/** Every key a Quran word can be found by. */
export function wordKeys(word: string): string[] {
  const keys = new Set([plainKey(word), alefKey(word)]);
  return [...keys];
}

/** Whether a typed word is this Quran word. */
export function matchesWord(quranWord: string, typed: string): boolean {
  const q = queryKey(typed);
  if (!q) return false;
  if (wordKeys(quranWord).includes(q)) return true;
  const skeleton = skeletonKey(quranWord);
  return skeleton.length >= 3 && skeleton === skeletonKey(typed);
}

/** Eastern Arabic digits. */
export function arDigits(n: number | string): string {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]!);
}

/** «٣ آيات», «١١ آية»: the counted noun the way Arabic counts it. */
export function arCount(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${arDigits(n)} ${few}`;
  return `${arDigits(n)} ${many}`;
}
