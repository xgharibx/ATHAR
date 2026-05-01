/**
 * Arabic helpers for better reading controls.
 */

const ARABIC_DIACRITICS =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

export function stripDiacritics(input: string) {
  return input.replace(ARABIC_DIACRITICS, "");
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
