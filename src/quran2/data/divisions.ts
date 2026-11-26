import { arDigits } from "./arabic";

/** The thirty parts by name, as the Madina mushaf heads its pages. */
export const JUZ_NAMES = [
  "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر",
  "الحادي عشر", "الثاني عشر", "الثالث عشر", "الرابع عشر", "الخامس عشر", "السادس عشر", "السابع عشر", "الثامن عشر", "التاسع عشر", "العشرون",
  "الحادي والعشرون", "الثاني والعشرون", "الثالث والعشرون", "الرابع والعشرون", "الخامس والعشرون", "السادس والعشرون", "السابع والعشرون", "الثامن والعشرون", "التاسع والعشرون", "الثلاثون",
];

export const juzName = (n: number) => `الجزء ${JUZ_NAMES[n - 1] ?? arDigits(n)}`;

/** A hizb quarter, as its marginal mark reads: «الحزب ٤٧»، «ربع الحزب ٤٧»… */
export function quarterLabel(q: number): string {
  const hizb = Math.ceil(q / 4);
  const part = (q - 1) % 4;
  return [`الحزب ${arDigits(hizb)}`, `ربع الحزب ${arDigits(hizb)}`, `نصف الحزب ${arDigits(hizb)}`, `ثلاثة أرباع الحزب ${arDigits(hizb)}`][part]!;
}

