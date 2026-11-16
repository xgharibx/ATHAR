/**
 * Arabic text matching for citation checks.
 *
 * A quotation typed by the model rarely matches the reference text character
 * for character: vowel marks differ, the Quran corpus uses Uthmani spelling
 * while the model writes everyday spelling, and hamza and alif are written
 * several ways. Texts are therefore compared by "skeleton": letters only,
 * with every spelling difference that does not change the word removed.
 */

const MARKS = /[ً-ٰٟۖ-ۭـ\u200B-\u200F\uFEFF]/g;

/** One skeleton letter for an input character, or "" when it carries none. */
function skeletonChar(char: string): string {
  if (/[ً-ٰٟۖ-ۭـ\u200B-\u200F\uFEFF]/.test(char)) return "";
  if ("اأإآٱء".includes(char)) return "";
  if (char === "ى" || char === "ئ") return "ي";
  if (char === "ؤ") return "و";
  if (char === "ة") return "ه";
  return /[ء-ي]/.test(char) ? char : "";
}

export type Skeleton = {
  /** Letters only, spelling differences removed, repeated letters collapsed. */
  text: string;
  /** For each skeleton letter, its index in the original string. */
  map: number[];
};

export function skeletonWithMap(original: string): Skeleton {
  // Uthmani spelling writes some long vowels as waw + dagger alif (الصلوٰة).
  // Treat that waw as the alif it stands for so it matches everyday spelling.
  let text = "";
  const map: number[] = [];
  for (let index = 0; index < original.length; index += 1) {
    const char = original[index]!;
    if (char === "و" && original[index + 1] === "ٰ") continue;
    const letter = skeletonChar(char);
    if (!letter || text.endsWith(letter)) continue;
    text += letter;
    map.push(index);
  }
  return { text, map };
}

export function skeleton(original: string): string {
  return skeletonWithMap(original).text;
}

export function stripMarks(value: string): string {
  return value.replace(MARKS, "");
}

/** Number of whitespace-delimited words that contain Arabic letters. */
export function arabicWordCount(value: string): number {
  return value.split(/\s+/).filter((word) => /[ء-ي]/.test(word)).length;
}

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toArabicDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => ARABIC_DIGITS[Number(digit)] ?? digit);
}

export function toLatinDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));
}
