/**
 * Arabic helpers for better reading controls.
 */

const ARABIC_DIACRITICS =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

/** Alef variants: madda (آ), hamza above (أ), hamza below (إ), wasla (ٱ) → plain alef (ا) */
const ALEF_VARIANTS = /[\u0622\u0623\u0625\u0671]/g;

export function stripDiacritics(input: string) {
  return input.replace(ARABIC_DIACRITICS, "");
}

/**
 * Strip diacritics AND normalize alef variants to plain alef for Arabic search.
 * Use this for both query and source text to enable diacritic/alef-insensitive matching.
 */
export function normalizeArabicSearch(input: string) {
  return stripDiacritics(input).replace(ALEF_VARIANTS, "\u0627");
}

/** Convert western digits to Arabic-Indic (e.g. 5 → ٥) */
export function toArabicIndic(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
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
 * If the text starts with isti'adhah and/or basmalah, place each opening phrase on its own line,
 * then place the remainder on a new line after them.
 */
export function formatLeadingIstiadhahBasmalah(input: string) {
  const t = normalizeText(input ?? "");
  if (!t) return "";

  let rest = t;
  const prefix: string[] = [];
  const flatten = (value: string) => value.replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();

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

  if (!hadIstiadhah && !hadBasmalah) return flatten(t);

  const body = flatten(rest);
  if (!body) return prefix.join("\n");
  return `${prefix.join("\n")}\n${body}`;
}
