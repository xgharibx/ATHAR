/**
 * Number/date formatters that ALWAYS emit Eastern Arabic-Indic digits
 * (٠١٢٣٤٥٦٧٨٩), regardless of the host locale.
 *
 * Background:
 *   `n.toLocaleString("ar-EG")` works on most desktop browsers, but iOS Safari
 *   and some Linux Chromium builds fall back to Western digits depending on
 *   the surrounding context. We post-process every output with a digit-map
 *   pass so the result is deterministic.
 *
 * The map covers the two Arabic-Indic ranges used by `ar-EG`:
 *   - Western: 0-9 → ٠-٩ (U+0660–U+0669)
 *   - The Arabic comma U+060C, percent sign U+066A, and decimal separator
 *     U+066B (Arabic-Indic decimal point) are already Arabic-script so
 *     they're left alone.
 */

const WESTERN_TO_ARABIC: Record<string, string> = {
  "0": "٠",
  "1": "١",
  "2": "٢",
  "3": "٣",
  "4": "٤",
  "5": "٥",
  "6": "٦",
  "7": "٧",
  "8": "٨",
  "9": "٩",
};

/** Replace every Western digit in `s` with its Eastern Arabic-Indic
 *  counterpart. Punctuation is preserved as-is — only ASCII 0–9 are
 *  rewritten. Use `arabicizeNumber()` if you also need to convert grouping /
 *  decimal separators. */
export function westernToArabicDigits(s: string): string {
  if (!s) return s;
  return s.replace(/[0-9]/g, (d) => WESTERN_TO_ARABIC[d] ?? d);
}

/**
 * Convert a Western-formatted numeric string (digits + ASCII comma grouping
 * + ASCII period decimal) to fully Arabic-Indic:
 *   - "1,234.5" → "١٬٢٣٤٫٥"
 *   - "0"       → "٠"
 *   - "-5"      → "-٥"
 *
 * Use this when the caller has a numeric string that may include Western
 * formatting characters (grouping separator, decimal point) and needs them
 * rewritten to their Arabic-Indic equivalents. `westernToArabicDigits` only
 * touches digits and leaves punctuation alone.
 */
export function arabicizeNumber(s: string): string {
  if (!s) return s;
  return s
    .replace(/,/g, "٬")  // Arabic-Indic thousands separator U+066C
    .replace(/\./g, "٫")  // Arabic-Indic decimal point U+066B
    .replace(/[0-9]/g, (d) => WESTERN_TO_ARABIC[d] ?? d);
}

/**
 * Convert any number (or numeric string) to Eastern Arabic-Indic digits with
 * grouping. Accepts finite numbers or pre-formatted numeric strings (so
 * callers can pass already-grouped values like "1,234.5").
 *
 * Examples:
 *   arNum(0)            → "٠"
 *   arNum(7)            → "٧"
 *   arNum(42)           → "٤٢"
 *   arNum(1234)         → "١٬٢٣٤"
 *   arNum(-5)           → "-٥"
 *   arNum(1.5)          → "١٫٥"
 *   arNum("1,234.5")    → "١٬٢٣٤٫٥"
 */
export function arNum(n: number | string): string {
  if (n === null || n === undefined) return "";
  let raw: string;
  if (typeof n === "number") {
    if (!Number.isFinite(n)) return "";
    raw = n.toLocaleString("en-US", {
      useGrouping: true,
      minimumFractionDigits: 0,
      maximumFractionDigits: 20,
    });
  } else {
    raw = String(n).trim();
    if (!raw) return "";
  }
  return arabicizeNumber(raw);
}

/* ───────────────────── date helpers ───────────────────── */

/** Long-form date options used by arFullDate. */
const FULL_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

/** Short-form (weekday + time) options used by arTime. */
const SHORT_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

/**
 * Format `d` as an Arabic-Indic weekday + hour:minute short string such as
 *   "غداً ٠٤:٣٠"
 *   "الأحد ٠٤:٣٠"
 * Returns the empty string for invalid input.
 */
export function arTime(d: Date): string {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  let raw: string;
  try {
    raw = d.toLocaleString("ar-EG", SHORT_TIME_OPTIONS);
  } catch {
    raw = d.toLocaleString("en-US", SHORT_TIME_OPTIONS);
  }
  return westernToArabicDigits(raw);
}

/**
 * Format `d` as a full long-form Arabic-Indic date+time string.
 *   "الأحد، ١٢ شعبان ١٤٤٦ هـ ٠٤:٣٠"
 */
export function arFullDate(d: Date): string {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  let raw: string;
  try {
    raw = d.toLocaleString("ar-EG", FULL_DATE_OPTIONS);
  } catch {
    raw = d.toLocaleString("en-US", FULL_DATE_OPTIONS);
  }
  return westernToArabicDigits(raw);
}