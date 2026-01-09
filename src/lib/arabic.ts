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
