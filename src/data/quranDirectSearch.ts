/**
 * parseDirectAyahQuery — recognise "2:255", "2/255", "2.255", "البقرة:٢٥٥",
 * "البقرة ٢٥٥", "الإخلاص", "55", "البقرة:٢٥٥:٣" (for word mode) as direct
 * jumps into a surah.
 *
 * Pure, no React, unit-testable. All numeric tokens accept both Latin (0-9)
 * and Arabic-Indic (٠-٩) digits — converted via arabicToInt.
 */

type SurahLite = { id: number; name: string };
export type DirectAyahQuery = { surahId: number; ayahIndex: number | null };

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
// Allow Latin digits, Arabic-Indic digits, and the U+066B/U+066C Arabic decimal
// separators inside any token so mixed-script inputs like "٢:255" still parse.
const DIGIT = "[0-9\u0660-\u0669]";

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

  // 1) Numeric pair — accept :, /, or . as separator so callers using any of
  //    "2:255", "2/255", "2.255" land on the same place. Both digit scripts
  //    are allowed (the digit class covers Latin + Arabic-Indic). The triple
  //    form "2:255:3" (for word mode) is checked first because the pair
  //    regex would otherwise over-anchor and never match.
  const tripleMatch = new RegExp(`^\\s*(${DIGIT}+)\\s*[:/]\\s*(${DIGIT}+)\\s*[:/]\\s*(${DIGIT}+)\\s*$`).exec(trimmed);
  if (tripleMatch) {
    const sid = arabicToInt(tripleMatch[1]!);
    const aid = arabicToInt(tripleMatch[2]!);
    if (sid >= 1 && sid <= 114) {
      return { surahId: sid, ayahIndex: aid >= 1 ? aid : null };
    }
    return null;
  }
  const numPair = new RegExp(`^\\s*(${DIGIT}+)\\s*[:/.]\\s*(${DIGIT}+)\\s*$`).exec(trimmed);
  if (numPair) {
    const sid = arabicToInt(numPair[1]!);
    const aid = arabicToInt(numPair[2]!);
    if (sid >= 1 && sid <= 114) {
      return { surahId: sid, ayahIndex: aid >= 1 ? aid : null };
    }
    return null;
  }

  // 2) Name + optional ayah — "البقرة 255", "البقرة:٢٥٥", "البقرة:٢٥٥:٣",
  //    "البقرة" alone. Letter class is broad enough to cover ال + ب + ق + ر + ة
  //    plus the Arabic-Indic ornament marks that show up in real input.
  const ARABIC_LETTER = "[\u0621-\u063A\u0641-\u064A\u0671\u0672\u0674\u0675]";
  const namePair = new RegExp(
    `^(${ARABIC_LETTER}+)(?:\\s*[:/\\s]\\s*(${DIGIT}+)(?:\\s*[:/]\\s*(${DIGIT}+))?)?\\s*$`
  ).exec(trimmed);
  if (namePair) {
    const nameNorm = normLetters(namePair[1]!);
    const ayahStr = namePair[2];
    const wordStr = namePair[3];
    void wordStr; // future: word index for WBW mode — page jump only uses ayah
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

  // 3) Bare number — treat as surah id only.
  const surahOnly = new RegExp(`^\\s*(${DIGIT}+)\\s*$`).exec(trimmed);
  if (surahOnly) {
    const sid = arabicToInt(surahOnly[1]!);
    if (sid >= 1 && sid <= 114) return { surahId: sid, ayahIndex: null };
  }

  return null;
}