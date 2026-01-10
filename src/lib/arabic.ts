/**
 * Arabic helpers for better reading controls.
 */

const ARABIC_DIACRITICS =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

export function stripDiacritics(input: string) {
  return input.replace(ARABIC_DIACRITICS, "");
}

/**
 * Normalize whitespace and newlines for display.
 */
export function normalizeText(input: string) {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const ISTIADHAH_VARIANTS = [
  "أَعُوذُ بِاللهِ مِنْ الشَّيْطَانِ الرَّجِيمِ",
  "أعوذ بالله من الشيطان الرجيم",
  "اعوذ بالله من الشيطان الرجيم"
];

const BASMALAH_VARIANTS = [
  "بِسْمِ اللهِ الرَّحْمنِ الرَّحِيم",
  "بسم الله الرحمن الرحيم"
];

/**
 * If the text starts with isti'adhah and/or basmalah, keep them both on a single line,
 * then place the rest on a new line.
 */
export function formatLeadingIstiadhahBasmalah(input: string) {
  const t = normalizeText(input ?? "");
  if (!t) return "";

  let rest = t;
  const prefix: string[] = [];

  const takeLeading = (variants: string[]) => {
    for (const v of variants) {
      if (rest.startsWith(v)) {
        rest = rest.slice(v.length).trimStart();
        prefix.push(v);
        return true;
      }
    }
    return false;
  };

  const hadIstiadhah = takeLeading(ISTIADHAH_VARIANTS);
  const hadBasmalah = takeLeading(BASMALAH_VARIANTS);

  if (!hadIstiadhah && !hadBasmalah) return t;
  if (!rest) return prefix.join(" ");
  return `${prefix.join(" ")}\n${rest}`;
}
