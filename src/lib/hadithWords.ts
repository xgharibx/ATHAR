/**
 * Difficult words of a hadith (HadeethEnc's «معاني الكلمات») found in its
 * text, so the reader can tap a word for its meaning. Matched the way search
 * matches (no harakat, any alef form); each word marks its first place only,
 * and marks never overlap.
 */
import { findArabicMatches } from "@/lib/arabicHighlight";

export type WordPart = { text: string; meaning?: string; word?: string };

/** The word as the encyclopedia writes it, without the punctuation around it. */
function cleanWord(word: string): string {
  return word.replace(/[«»"'():؛.،,!؟?[\]]/g, " ").replace(/\s+/g, " ").trim();
}

export function markWordMeanings(text: string, words: ReadonlyArray<{ word: string; meaning: string }>): WordPart[] {
  const marks: Array<[number, number, string, string]> = [];
  // Longer words first, so «دنيا يصيبها» wins over «دنيا».
  const sorted = words.filter((w) => typeof w?.word === "string" && typeof w.meaning === "string").map((w) => ({ ...w, clean: cleanWord(w.word) })).filter((w) => w.clean.length >= 2 && w.meaning.trim())
    .sort((a, b) => b.clean.length - a.clean.length);
  for (const w of sorted) {
    const hit = findArabicMatches(text, w.clean).find(([a, b]) => marks.every(([x, y]) => b <= x || a >= y));
    if (hit) marks.push([hit[0], hit[1], w.meaning.trim(), w.clean]);
  }
  marks.sort((a, b) => a[0] - b[0]);
  const parts: WordPart[] = [];
  let pos = 0;
  for (const [a, b, meaning, word] of marks) {
    if (a > pos) parts.push({ text: text.slice(pos, a) });
    parts.push({ text: text.slice(a, b), meaning, word });
    pos = b;
  }
  if (pos < text.length) parts.push({ text: text.slice(pos) });
  return parts;
}
