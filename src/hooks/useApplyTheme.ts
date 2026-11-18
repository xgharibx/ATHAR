import { useEffect } from "react";
import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";
import { useNoorStore, type NoorTheme } from "@/store/noorStore";
import { isAccountStorageOwnerTransitionInProgress } from "@/lib/accountStorageScope";
import { getAccessibleAccentForeground, isSupportedOpaqueAccentColor } from "@/lib/accentContrast";
import { getSamaPhase, SAMA_PHASE_COLORS } from "@/lib/samaTheme";
import { rememberThemeForFirstPaint } from "@/lib/themeBootstrap";
import {
  rememberDesignForFirstPaint,
  resolveUfuqPalette,
  UFUQ_GARDEN_META_COLORS,
  UFUQ_META_COLORS,
  type DesignMode,
  type UfuqLook,
  type UfuqPalette,
} from "@/lib/design";

/** Pure helpers exported for unit tests so they can be exercised without a
 *  jsdom environment. Kept side-effect-free on import. */

/** Returns the resolved `dir` for the document root given the user's
 *  `textDir` pref and the current `<html lang>`. `auto` defers to language:
 *  any Arabic-script lang ("ar", "fa", "ur", "ps", "he", "yi", …) → rtl,
 *  everything else → ltr. The list is intentionally small but covers every
 *  RTL language athar ships localized copy for. */
export function resolveTextDir(
  textDir: "auto" | "rtl" | "ltr" | undefined,
  lang: string,
): "rtl" | "ltr" {
  if (textDir === "rtl") return "rtl";
  if (textDir === "ltr") return "ltr";
  const base = (lang ?? "").trim().toLowerCase().split(/[-_]/)[0] ?? "";
  const rtlLangs = new Set(["ar", "fa", "ur", "ps", "he", "yi", "sd", "ku", "dv"]);
  return rtlLangs.has(base) ? "rtl" : "ltr";
}

/** Resolves the effective `<html lang>` for `uiLanguage === "auto"`. We don't
 *  use `navigator.language` in tests, so callers can pass it explicitly. */
export function resolveUiLanguage(uiLanguage: "ar" | "en" | undefined, fallback: string = "ar"): string {
  if (uiLanguage === "ar" || uiLanguage === "en") return uiLanguage;
  return fallback;
}

// Theme-color map for PWA browser chrome tinting
export const THEME_META_COLORS: Record<NoorTheme, string> = {
  system:   "#07080b",
  dark:     "#07080b",
  light:    "#f7f8ff",
  noor:     "#07080b",
  midnight: "#0f172a",
  forest:   "#022c22",
  bees:     "#1a120b",
  roses:    "#280a14",
  sapphire: "#070a1a",
  violet:   "#12051f",
  sunset:   "#160a06",
  mist:     "#0b0d12",
  bustan:   "#f3ede2",
  waraq:    "#efe7d5",
  fanous:   "#140e06",
  sajjada:  "#200a10",
  mihrab:   "#071b33",
  midad:    "#020b04", // Legacy color only; the retired theme is never applied.
  layl:     "#000000",
  teen:     "#eef0f6",
  jura:     "#f5f2ea",
  andalus:  "#f6f1e6",
  sakina:   "#eceae6",
  shafaq:   "#0b1220",
  mushaf:   "#2a1114",
  sama:     "#0a1f15",
  diwan:    "#f5f1e6",
  faham:    "#000000",
};

/** Themes that are light at heart — applied together with .light so every
 *  existing light-mode refinement carries over before their own overrides. */
const LIGHT_COMPOUND: ReadonlySet<NoorTheme> = new Set([
  "bustan", "waraq", "teen", "jura", "andalus", "sakina", "diwan",
]);

const ALL_THEME_CLASSES = [
  "dark", "light", "noor", "midnight", "forest", "bees", "roses", "sapphire",
  "violet", "sunset", "mist", "bustan", "waraq", "fanous", "sajjada", "mihrab",
  "midad", "layl", "teen", "jura", "andalus", "sakina", "shafaq", "mushaf",
  "sama", "sama-fajr", "sama-dhuhr", "sama-asr", "sama-maghrib", "sama-isha",
  "diwan", "faham",
];

/**
 * Point the browser's own chrome at the ACTIVE Athar theme.
 *
 * index.html ships two theme-color metas guarded by
 * `media="(prefers-color-scheme: …)"`. This used to update only the first of
 * them — and both kept their media guards — so the browser went on choosing by
 * SYSTEM mode instead of by the theme the user actually picked. On an iPhone in
 * system dark mode running a light theme, Safari tinted its toolbar near-black
 * above a cream page: the "black menu" in the Quran.
 *
 * The chosen theme wins over the system setting (the same rule the widgets
 * follow), so the media-scoped copies are dropped and a single unconditional
 * meta is managed instead.
 */
function setMetaThemeColor(color: string) {
  const metas = Array.from(
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
  );

  // Anything still keyed to prefers-color-scheme would override us.
  for (const m of metas) {
    if (m.hasAttribute("media")) m.remove();
  }

  let meta = metas.find((m) => !m.hasAttribute("media") && m.isConnected) ?? null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = color;
  syncNativeSystemBars(color);
}

/** Relative luminance of a "#rgb" or "#rrggbb" colour, or null for anything else. */
function hexLuminance(color: string): number | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return null;
  const hex = match[1].length === 3 ? match[1].replace(/./g, (c) => c + c) : match[1];
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

/** Light icons on dark theme colours, dark icons on light ones. Exported for tests. */
export function systemBarsStyleFor(color: string): SystemBarsStyle | null {
  const luminance = hexLuminance(color);
  if (luminance === null) return null;
  return luminance < 0.4 ? SystemBarsStyle.Dark : SystemBarsStyle.Light;
}

/**
 * In the Android and iOS apps, match the status and navigation bar icons to
 * the theme the user picked rather than the phone's light or dark mode, so
 * they stay readable on every Athar theme.
 */
function syncNativeSystemBars(color: string) {
  if (!Capacitor.isNativePlatform()) return;
  const style = systemBarsStyleFor(color);
  if (style) void SystemBars.setStyle({ style }).catch(() => {});
}

function applyAccentForeground(root: HTMLElement) {
  const accent = window.getComputedStyle(root).getPropertyValue("--accent").trim();
  root.dataset.accentForeground = getAccessibleAccentForeground(accent) === "#ffffff" ? "white" : "black";
}

/** Keep legacy installs safe while the retired theme remains in persisted state. */
function resolveAvailableTheme(theme: NoorTheme): NoorTheme {
  return theme === "midad" ? "forest" : theme;
}

/** Exported for tests: applying a theme must also retint the browser chrome. */
export function applyThemeForTest(theme: NoorTheme) {
  apply(theme);
}

function apply(theme: NoorTheme): string {
  const activeTheme = resolveAvailableTheme(theme);
  const root = document.documentElement;

  root.classList.remove(...ALL_THEME_CLASSES);

  if (activeTheme === "system") {
    const isDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    root.classList.add(isDark ? "dark" : "light");
    applyAccentForeground(root);
    const color = isDark ? "#07080b" : "#f7f8ff";
    setMetaThemeColor(color);
    return color;
  }

  if (activeTheme === "sama") {
    const phase = getSamaPhase();
    root.classList.add("sama", `sama-${phase}`);
    applyAccentForeground(root);
    const color = SAMA_PHASE_COLORS[phase] ?? THEME_META_COLORS.sama;
    setMetaThemeColor(color);
    return color;
  }

  if (LIGHT_COMPOUND.has(activeTheme)) {
    root.classList.add("light", activeTheme);
    applyAccentForeground(root);
    setMetaThemeColor(THEME_META_COLORS[activeTheme]);
    return THEME_META_COLORS[activeTheme];
  }

  root.classList.add(activeTheme);
  applyAccentForeground(root);
  const color = THEME_META_COLORS[activeTheme] ?? "#07080b";
  setMetaThemeColor(color);
  return color;
}

/**
 * The «أفق» design: its own palette instead of the classic theme. The base
 * light/dark class still goes on <html> so components that adapt to light
 * or dark keep doing so; everything else comes from src/styles/ufuq.css.
 * Exported for tests.
 */
export function applyUfuqDesign(palette: UfuqPalette | undefined, look: UfuqLook = "plain"): string {
  const root = document.documentElement;
  // «الوقت»: night from Maghrib until Fajr, read from the same next-prayer
  // record the living «سماء» theme uses.
  const samaPhase = getSamaPhase();
  const resolved = resolveUfuqPalette(
    palette,
    Boolean(window.matchMedia?.("(prefers-color-scheme: dark)")?.matches),
    samaPhase === "fajr" || samaPhase === "isha",
  );
  root.classList.remove(...ALL_THEME_CLASSES);
  root.classList.add(resolved === "night" ? "dark" : "light");
  root.dataset.design = "ufuq";
  root.dataset.ufuqPalette = resolved;
  root.dataset.ufuqLook = look;
  root.style.removeProperty("--accent");
  applyAccentForeground(root);
  const color = look === "garden" ? UFUQ_GARDEN_META_COLORS[resolved] : UFUQ_META_COLORS[resolved];
  setMetaThemeColor(color);
  return color;
}

function clearUfuqDesign() {
  const root = document.documentElement;
  delete root.dataset.design;
  delete root.dataset.ufuqPalette;
  delete root.dataset.ufuqLook;
}

/**
 * Sync theme and motion preferences to <html> + PWA chrome.
 */
export function useApplyTheme() {
  const theme = useNoorStore((s) => s.prefs.theme);
  const setPrefs = useNoorStore((s) => s.setPrefs);
  const reduceMotion = useNoorStore((s) => s.prefs.reduceMotion);
  const customAccent = useNoorStore((s) => s.prefs.customAccent);
  const arabicFont = useNoorStore((s) => s.prefs.arabicFont);
  const textDir = useNoorStore((s) => s.prefs.textDir);
  const uiLanguage = useNoorStore((s) => s.prefs.uiLanguage);
  const transparentMode = useNoorStore((s) => s.prefs.transparentMode);
  const clearReading = useNoorStore((s) => s.prefs.clearReading);
  const designMode: DesignMode = useNoorStore((s) => s.prefs.designMode) ?? "classic";
  const ufuqPalette = useNoorStore((s) => s.prefs.ufuqPalette);
  const ufuqLook: UfuqLook = useNoorStore((s) => s.prefs.ufuqLook) ?? "garden";

  useEffect(() => {
    if (useNoorStore.persist.hasHydrated() && !isAccountStorageOwnerTransitionInProgress()) {
      rememberDesignForFirstPaint(designMode, ufuqPalette ?? "auto", ufuqLook);
    }
    if (designMode !== "ufuq") return;
    // «أفق» replaces the classic theme while it is on; the classic choice is
    // kept untouched in prefs.theme for when the person switches back.
    document.body.classList.remove("transparent-mode");
    const refresh = () => applyUfuqDesign(ufuqPalette, ufuqLook);
    refresh();
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener?.("change", refresh);
    // «الوقت» turns to night at Maghrib and back at Fajr while the app is open.
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    const timer = ufuqPalette === "time" ? window.setInterval(refresh, 60 * 1000) : 0;
    return () => {
      mq?.removeEventListener?.("change", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      if (timer) window.clearInterval(timer);
    };
  }, [designMode, ufuqPalette, ufuqLook]);

  useEffect(() => {
    if (designMode === "ufuq") return;
    clearUfuqDesign();
    const activeTheme = resolveAvailableTheme(theme);
    const color = apply(activeTheme);
    if (activeTheme !== theme && useNoorStore.persist.hasHydrated() && !isAccountStorageOwnerTransitionInProgress()) {
      setPrefs({ theme: activeTheme });
    }
    if (useNoorStore.persist.hasHydrated() && !isAccountStorageOwnerTransitionInProgress()) {
      rememberThemeForFirstPaint(activeTheme, color);
    }

    // Immersive transparent mode — respects the user preference
    if (transparentMode) {
      document.body.classList.add("transparent-mode");
    } else {
      document.body.classList.remove("transparent-mode");
    }

    if (activeTheme === "system") {
      const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
      if (!mq) return;
      const onChange = () => apply("system");
      mq.addEventListener?.("change", onChange);
      return () => mq.removeEventListener?.("change", onChange);
    }

    if (activeTheme === "sama") {
      // The living sky re-evaluates when you come back to the app and on a
      // gentle interval, so the palette rolls through the day with you.
      const refreshSama = () => {
        const nextColor = apply("sama");
        if (useNoorStore.persist.hasHydrated() && !isAccountStorageOwnerTransitionInProgress()) {
          rememberThemeForFirstPaint("sama", nextColor);
        }
      };
      const onVisible = () => {
        if (document.visibilityState === "visible") refreshSama();
      };
      document.addEventListener("visibilitychange", onVisible);
      const timer = window.setInterval(refreshSama, 5 * 60 * 1000);
      return () => {
        document.removeEventListener("visibilitychange", onVisible);
        window.clearInterval(timer);
      };
    }
  }, [theme, setPrefs, transparentMode, designMode]);

  useEffect(() => {
    const root = document.documentElement;
    // «أفق» keeps its own curated accent so its palette stays balanced.
    if (designMode === "ufuq") {
      root.style.removeProperty("--accent");
      applyAccentForeground(root);
      return;
    }
    if (customAccent && isSupportedOpaqueAccentColor(customAccent)) {
      root.style.setProperty("--accent", customAccent);
    } else {
      root.style.removeProperty("--accent");
    }
    applyAccentForeground(root);
  }, [customAccent, theme, designMode, ufuqPalette, ufuqLook]);

  useEffect(() => {
    const root = document.documentElement;
    if (reduceMotion) root.classList.add("reduce-motion");
    else root.classList.remove("reduce-motion");
  }, [reduceMotion]);

  useEffect(() => {
    document.documentElement.classList.toggle("clear-reading", clearReading);
  }, [clearReading]);

  // Se1: Arabic font family
  useEffect(() => {
    document.documentElement.dataset.arabicFont = arabicFont ?? "noto_naskh";
  }, [arabicFont]);

  // Se3 + Se4: UI language and text direction. The helper pair is exported
  // above so this hook's behaviour is unit-testable without jsdom.
  useEffect(() => {
    const root = document.documentElement;
    const lang = resolveUiLanguage(uiLanguage);
    root.lang = lang;
    const dir = resolveTextDir(textDir, lang);
    root.dir = dir;
  }, [textDir, uiLanguage]);
}
