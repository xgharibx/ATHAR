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

/**
 * «الكلاسيكي الجديد» ("classic-new") is the classic design with a reorganised
 * home (src/pages/HomeNew.tsx), offered on trial beside the two. Everything
 * except the home is the classic design's, since nothing outside «أفق» reads
 * more than whether the design is «أفق».
 */
export type DesignMode = "classic" | "classic-new" | "ufuq";

/**
 * «أفق» has a day and a night palette, chosen outright or followed: from the
 * phone's light/dark setting («الهاتف»), or from the prayer times («الوقت»):
 * night from Maghrib until Fajr.
 */
export type UfuqPalette = "auto" | "time" | "day" | "night";

/**
 * The look inside «أفق»: the drawn garden that grows a flower with every
 * tasbeeh («الحديقة الحيّة»), or quiet paper.
 */
export type UfuqLook = "plain" | "live";

export type UfuqResolvedPalette = "day" | "night";

export const DESIGN_MODES: ReadonlyArray<{ id: DesignMode; label: string; hint: string }> = [
  { id: "classic", label: "الكلاسيكي", hint: "تصميم أثر المعتاد بسماته الكثيرة" },
  { id: "classic-new", label: "الكلاسيكي الجديد", hint: "الكلاسيكي نفسه برئيسية جديدة: مسار يومك، وورد الساعة، وأثرك" },
  { id: "ufuq", label: "أُفُق", hint: "تصميم جديد كليًّا: هادئ، واضح، فاخر" },
];

export const UFUQ_PALETTES: ReadonlyArray<{ id: UfuqPalette; label: string }> = [
  { id: "auto", label: "الهاتف" },
  { id: "time", label: "الوقت" },
  { id: "day", label: "نهار" },
  { id: "night", label: "ليل" },
];

export const UFUQ_LOOKS: ReadonlyArray<{ id: UfuqLook; label: string; hint: string }> = [
  { id: "live", label: "الحديقة الحيّة", hint: "حديقة تنمو بتسبيحك: كل ذكرٍ تتفتّح له زهرة، ونخلُك يُثمر بمواظبتك" },
  { id: "plain", label: "بسيط", hint: "ورق هادئ بلا حركة، أخفّ على البطارية" },
];

/** Page colour of each palette: the browser chrome and system bars follow it. */
export const UFUQ_META_COLORS: Record<UfuqResolvedPalette, string> = {
  day: "#f5f1e8",
  night: "#0a0d13",
};

/** The garden's sky at the top of the screen, under the status bar. */
export const UFUQ_GARDEN_META_COLORS: Record<UfuqResolvedPalette, string> = {
  day: "#5e97dc",
  night: "#010207",
};

/** Read by index.html before the app loads, so the right design paints first. */
export const DESIGN_BOOTSTRAP_STORAGE_KEY = "athar_design_v1";

export function normalizeDesignMode(value: unknown): DesignMode {
  return value === "ufuq" || value === "classic-new" ? value : "classic";
}

/** The two classic designs share everything but their home. */
export function isClassicFamily(mode: DesignMode | undefined): boolean {
  return mode !== "ufuq";
}

/** «أفق» opens at night unless the person chose otherwise. */
export const DEFAULT_UFUQ_PALETTE: UfuqPalette = "night";

export function normalizeUfuqPalette(value: unknown): UfuqPalette {
  return value === "day" || value === "night" || value === "time" || value === "auto" ? value : DEFAULT_UFUQ_PALETTE;
}

/** The filmed garden was retired: anyone who had it gets the drawn one. */
export function normalizeUfuqLook(value: unknown): UfuqLook {
  return value === "plain" ? "plain" : "live";
}

/** Both garden looks share the garden's palettes and frame. */
export function isGardenLook(look: UfuqLook | undefined): boolean {
  return look !== "plain";
}

export function resolveUfuqPalette(
  palette: UfuqPalette | undefined,
  systemPrefersDark: boolean,
  nightByPrayerTime = false,
): UfuqResolvedPalette {
  const chosen = palette ?? DEFAULT_UFUQ_PALETTE;
  if (chosen === "day") return "day";
  if (chosen === "night") return "night";
  if (chosen === "time") return nightByPrayerTime ? "night" : "day";
  return systemPrefersDark ? "night" : "day";
}

export function rememberDesignForFirstPaint(design: DesignMode, palette: UfuqPalette, look: UfuqLook = "live"): void {
  try {
    globalThis.localStorage?.setItem(DESIGN_BOOTSTRAP_STORAGE_KEY, JSON.stringify({ design, palette, look }));
  } catch {
    // Storage can be disabled; the persisted preference remains authoritative.
  }
}
