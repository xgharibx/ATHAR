/**
 * Preset color swatches for the custom-dhikr editor. Hex values only —
 * applied as CSS custom-property overrides on the active card.
 */
export const CUSTOM_DHIKR_COLORS: Array<{ name: string; hex: string }> = [
  { name: "فيروزي", hex: "#7dd3fc" },
  { name: "ذهبي", hex: "#fbbf24" },
  { name: "بنفسجي", hex: "#a78bfa" },
  { name: "أخضر", hex: "#34d399" },
  { name: "وردي", hex: "#fb7185" },
  { name: "برتقالي", hex: "#fb923c" },
];

export function isValidHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

/** Map a phrase/keyword to the closest preset accent (used as a default). */
export function suggestColorForPhrase(phrase: string): string {
  if (/(سبحان|تنزيه)/.test(phrase)) return CUSTOM_DHIKR_COLORS[0]!.hex;
  if (/(حمد|شكر)/.test(phrase)) return CUSTOM_DHIKR_COLORS[1]!.hex;
  if (/(إله|توحيد|إلا)/.test(phrase)) return CUSTOM_DHIKR_COLORS[2]!.hex;
  if (/(أكبر|تكبير)/.test(phrase)) return CUSTOM_DHIKR_COLORS[3]!.hex;
  return CUSTOM_DHIKR_COLORS[4]!.hex;
}