/**
 * Two complete designs for the same app.
 *
 * «الكلاسيكي» is Athar as it has always looked: 26 themes, glass cards, the
 * starry background and the six-tab bar. «أفق» is a second, separate design
 * built from scratch — its own palette, typeface, sizes, shapes, navigation
 * and home screen. People switch between them in Settings → المظهر, and
 * each keeps its own choices, so going back restores the classic look exactly
 * as it was.
 *
 * The design is applied as <html data-design="ufuq">, with every rule of the
 * new design scoped under it (src/styles/ufuq.css). Nothing in the classic
 * design reads that attribute.
 */

export type DesignMode = "classic" | "ufuq";

/** «أفق» has two palettes, plus following the phone's light/dark setting. */
export type UfuqPalette = "auto" | "day" | "night";

export type UfuqResolvedPalette = "day" | "night";

export const DESIGN_MODES: ReadonlyArray<{ id: DesignMode; label: string; hint: string }> = [
  { id: "classic", label: "الكلاسيكي", hint: "تصميم أثر المعتاد بسماته الكثيرة" },
  { id: "ufuq", label: "أُفُق", hint: "تصميم جديد كليًّا: هادئ، واضح، فاخر" },
];

export const UFUQ_PALETTES: ReadonlyArray<{ id: UfuqPalette; label: string }> = [
  { id: "auto", label: "حسب الهاتف" },
  { id: "day", label: "نهار" },
  { id: "night", label: "ليل" },
];

/** Page colour of each palette: the browser chrome and system bars follow it. */
export const UFUQ_META_COLORS: Record<UfuqResolvedPalette, string> = {
  day: "#f5f1e8",
  night: "#0a0d13",
};

/** Read by index.html before the app loads, so the right design paints first. */
export const DESIGN_BOOTSTRAP_STORAGE_KEY = "athar_design_v1";

export function normalizeDesignMode(value: unknown): DesignMode {
  return value === "ufuq" ? "ufuq" : "classic";
}

export function normalizeUfuqPalette(value: unknown): UfuqPalette {
  return value === "day" || value === "night" ? value : "auto";
}

export function resolveUfuqPalette(palette: UfuqPalette | undefined, systemPrefersDark: boolean): UfuqResolvedPalette {
  if (palette === "day") return "day";
  if (palette === "night") return "night";
  return systemPrefersDark ? "night" : "day";
}

export function rememberDesignForFirstPaint(design: DesignMode, palette: UfuqPalette): void {
  try {
    globalThis.localStorage?.setItem(DESIGN_BOOTSTRAP_STORAGE_KEY, JSON.stringify({ design, palette }));
  } catch {
    // Storage can be disabled; the persisted preference remains authoritative.
  }
}
