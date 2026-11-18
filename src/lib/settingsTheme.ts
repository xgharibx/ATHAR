/** Theme names, colours and the night-mode switch, for Settings. */
import { SystemBarsStyle } from "@capacitor/core";
import type { NoorTheme } from "@/store/noorStore";
import { systemBarsStyleFor, THEME_META_COLORS } from "@/hooks/useApplyTheme";

/** Each theme's accent, for its preview (the background comes from THEME_META_COLORS). */
export const THEME_ACCENTS: Partial<Record<NoorTheme, string>> = {
  system:   "#ffd780",
  dark:     "#ffd780",
  light:    "#ffd780",
  noor:     "#ffd780",
  midnight: "#38bdf8",
  forest:   "#ffffff",
  bees:     "#fbbf24",
  roses:    "#fda4af",
  sapphire: "#60a5fa",
  violet:   "#c4b5fd",
  sunset:   "#fb923c",
  mist:     "#e5e7eb",
  bustan:   "#c96f4a",
  waraq:    "#8f3b2c",
  fanous:   "#ffb84d",
  sajjada:  "#e8b04b",
  mihrab:   "#2ec4b6",
  layl:     "#aab8ff",
  teen:     "#7b6cf6",
  jura:     "#ff4d2e",
  andalus:  "#a8781f",
  sakina:   "#7a8a6f",
  shafaq:   "#6ef2c3",
  mushaf:   "#e9c36a",
  sama:     "#ffe8a0",
  diwan:    "#1f6b4a",
  faham:    "#e9e9ee",
};

/** Every theme the picker offers, with a name of its own. */
export const THEME_CHOICES: ReadonlyArray<{ id: NoorTheme; label: string }> = [
  { id: "system", label: "تلقائي" },
  { id: "dark", label: "داكن" },
  { id: "light", label: "فاتح" },
  { id: "noor", label: "نور" },
  { id: "midnight", label: "منتصف الليل" },
  { id: "forest", label: "غابة" },
  { id: "bees", label: "نحل" },
  { id: "roses", label: "زهور" },
  { id: "sapphire", label: "ياقوت" },
  { id: "violet", label: "بنفسجي" },
  { id: "sunset", label: "غروب" },
  { id: "mist", label: "ضباب" },
  { id: "bustan", label: "بستان" },
  { id: "waraq", label: "ورق" },
  { id: "fanous", label: "فانوس" },
  { id: "sajjada", label: "سجادة" },
  { id: "mihrab", label: "محراب" },
  { id: "sama", label: "سماء" },
  { id: "layl", label: "ليل" },
  { id: "teen", label: "طين" },
  { id: "jura", label: "جرأة" },
  { id: "andalus", label: "أندلس" },
  { id: "sakina", label: "سكينة" },
  { id: "shafaq", label: "شفق" },
  { id: "mushaf", label: "مصحف" },
  { id: "diwan", label: "ديوان" },
  { id: "faham", label: "فحم" },
];

export function themeLabel(theme: NoorTheme): string {
  return THEME_CHOICES.find((choice) => choice.id === theme)?.label ?? "";
}


/** Whether a theme is dark, from its own background colour. */
export function isDarkTheme(theme: NoorTheme): boolean {
  if (theme === "system") {
    return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  }
  return systemBarsStyleFor(THEME_META_COLORS[theme] ?? "#000000") === SystemBarsStyle.Dark;
}

const THEME_PAIR_KEY = "athar_theme_pair_v1";

/**
 * The night-mode switch keeps the person's own themes: it swaps between the
 * last dark and the last light theme they used, instead of plain dark/light.
 */
export function nightModeTheme(current: NoorTheme, toDark: boolean): NoorTheme {
  let pair: { dark?: NoorTheme; light?: NoorTheme };
  try {
    pair = JSON.parse(localStorage.getItem(THEME_PAIR_KEY) ?? "{}") ?? {};
  } catch {
    pair = {};
  }
  const next = toDark ? pair.dark ?? "dark" : pair.light ?? "light";
  try {
    localStorage.setItem(THEME_PAIR_KEY, JSON.stringify({ ...pair, [toDark ? "light" : "dark"]: current }));
  } catch {
    // Not remembered: the plain dark/light theme is used next time.
  }
  return next;
}

