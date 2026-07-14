/**
 * parseDirectAyahQuery — recognise "2:255", "2/255", "البقرة:٢٥٥",
 * "الكهف ١٨", "الإخلاص", "55" as direct jumps into a surah.
 *
 * Pure, no React, unit-testable.
 */

type SurahLite = { id: number; name: string };
export type DirectAyahQuery = { surahId: number; ayahIndex: number | null };

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function arabicToInt(s: string): number {
  let out = "";
  for (const ch of s) {
    const idx = ARABIC_DIGITS.indexOf(ch);
    if (idx >= 0) out += String(idx);
    else out += ch;
  }
  return Number(out);
}

function normLetters(s: string): string {
  // Strip tatweel, diacritics, alef wasla (ٱ → ا), and non-letter/number chars.
  return s
    .replace(/\u0640/g, "")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0671/g, "\u0627")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export function parseDirectAyahQuery(q: string, data: SurahLite[]): DirectAyahQuery | null {
  const trimmed = q.trim();
  if (!trimmed) return null;

  // 1) "2:255" / "2/255" / "٢:٢٥٥"
  const numPair = /^\s*([0-9\u0660-\u0669]+)\s*[:/]\s*([0-9\u0660-\u0669]+)\s*$/.exec(trimmed);
  if (numPair) {
    const sid = arabicToInt(numPair[1]);
    const aid = arabicToInt(numPair[2]);
    if (sid >= 1 && sid <= 114) {
      return { surahId: sid, ayahIndex: aid >= 1 ? aid : null };
    }
    return null;
  }

  // 2) "البقرة 255" / "البقرة:٢٥٥" / "البقرة" / "الإخلاص"
  const ARABIC_LETTER = "[\u0621-\u063A\u0641-\u064A\u0671\u0672\u0674\u0675]";
  const nameMatch = new RegExp(`^(${ARABIC_LETTER}+)(?:\\s*[:\\s]\\s*([0-9\u0660-\u0669]+))?\\s*$`).exec(trimmed);
  if (nameMatch) {
    const nameNorm = normLetters(nameMatch[1]);
    const ayahStr = nameMatch[2];
    const aid = ayahStr ? arabicToInt(ayahStr) : null;
    for (const s of data) {
      if (normLetters(s.name) === nameNorm) {
        return { surahId: s.id, ayahIndex: aid && aid >= 1 ? aid : null };
      }
    }
    if (nameNorm.length >= 3) {
      for (const s of data) {
        if (normLetters(s.name).startsWith(nameNorm)) {
          return { surahId: s.id, ayahIndex: aid && aid >= 1 ? aid : null };
        }
      }
    }
    return null;
  }

  // 3) "255" alone
  const surahOnly = /^\s*([0-9\u0660-\u0669]+)\s*$/.exec(trimmed);
  if (surahOnly) {
    const sid = arabicToInt(surahOnly[1]);
    if (sid >= 1 && sid <= 114) return { surahId: sid, ayahIndex: null };
  }

  return null;
}