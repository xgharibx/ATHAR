import { useEffect } from "react";
import { useNoorStore, type NoorTheme } from "@/store/noorStore";

// Theme-color map for PWA browser chrome tinting
const THEME_META_COLORS: Record<NoorTheme, string> = {
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
  midad:    "#020b04",
  layl:     "#000000",
  teen:     "#eef0f6",
  jura:     "#f5f2ea",
  andalus:  "#f6f1e6",
  sakina:   "#eceae6",
  shafaq:   "#0b1220",
  mushaf:   "#2a1114",
  sama:     "#0a1f15",
};

/** Themes that are light at heart — applied together with .light so every
 *  existing light-mode refinement carries over before their own overrides. */
const LIGHT_COMPOUND: ReadonlySet<NoorTheme> = new Set([
  "bustan", "waraq", "teen", "jura", "andalus", "sakina",
]);

const ALL_THEME_CLASSES = [
  "dark", "light", "noor", "midnight", "forest", "bees", "roses", "sapphire",
  "violet", "sunset", "mist", "bustan", "waraq", "fanous", "sajjada", "mihrab",
  "midad", "layl", "teen", "jura", "andalus", "sakina", "shafaq", "mushaf",
  "sama", "sama-fajr", "sama-dhuhr", "sama-asr", "sama-maghrib", "sama-isha",
];

const SAMA_META: Record<string, string> = {
  fajr: "#1c2145",
  dhuhr: "#0d3a26",
  asr: "#3a2f14",
  maghrib: "#471f12",
  isha: "#0d1330",
};

/**
 * سماء: the living theme — its palette follows the *upcoming prayer*, using
 * the same prayer payload the home-screen widgets read. Falls back to the
 * clock when timings haven't been fetched yet.
 */
function samaPhase(): "fajr" | "dhuhr" | "asr" | "maghrib" | "isha" {
  try {
    const raw = localStorage.getItem("noor_widget_prayer_v2");
    if (raw) {
      const p = JSON.parse(raw) as { nextPrayer?: { nameAr?: string } | null };
      const name = p?.nextPrayer?.nameAr ?? "";
      if (name.includes("الفجر")) return "fajr";
      if (name.includes("الظهر")) return "dhuhr";
      if (name.includes("العصر")) return "asr";
      if (name.includes("المغرب")) return "maghrib";
      if (name.includes("العشاء")) return "isha";
    }
  } catch {
    // fall through to clock-based phase
  }
  const h = new Date().getHours();
  if (h < 5) return "fajr";
  if (h < 13) return "dhuhr";
  if (h < 17) return "asr";
  if (h < 20) return "maghrib";
  return "isha";
}

function setMetaThemeColor(color: string) {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = color;
}

function apply(theme: NoorTheme) {
  const root = document.documentElement;

  root.classList.remove(...ALL_THEME_CLASSES);

  if (theme === "system") {
    const isDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    root.classList.add(isDark ? "dark" : "light");
    setMetaThemeColor(isDark ? "#07080b" : "#f7f8ff");
    return;
  }

  if (theme === "sama") {
    const phase = samaPhase();
    root.classList.add("sama", `sama-${phase}`);
    setMetaThemeColor(SAMA_META[phase] ?? THEME_META_COLORS.sama);
    return;
  }

  if (LIGHT_COMPOUND.has(theme)) {
    root.classList.add("light", theme);
    setMetaThemeColor(THEME_META_COLORS[theme]);
    return;
  }

  root.classList.add(theme);
  setMetaThemeColor(THEME_META_COLORS[theme] ?? "#07080b");
}

/**
 * Sync theme and motion preferences to <html> + PWA chrome.
 */
export function useApplyTheme() {
  const theme = useNoorStore((s) => s.prefs.theme);
  const reduceMotion = useNoorStore((s) => s.prefs.reduceMotion);
  const customAccent = useNoorStore((s) => s.prefs.customAccent);
  const arabicFont = useNoorStore((s) => s.prefs.arabicFont);
  const textDir = useNoorStore((s) => s.prefs.textDir);
  const uiLanguage = useNoorStore((s) => s.prefs.uiLanguage);
  const transparentMode = useNoorStore((s) => s.prefs.transparentMode);

  useEffect(() => {
    apply(theme);

    // Immersive transparent mode — respects the user preference
    if (transparentMode) {
      document.body.classList.add("transparent-mode");
    } else {
      document.body.classList.remove("transparent-mode");
    }

    if (theme === "system") {
      const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
      if (!mq) return;
      const onChange = () => apply("system");
      mq.addEventListener?.("change", onChange);
      return () => mq.removeEventListener?.("change", onChange);
    }

    if (theme === "sama") {
      // The living sky re-evaluates when you come back to the app and on a
      // gentle interval, so the palette rolls through the day with you.
      const onVisible = () => {
        if (document.visibilityState === "visible") apply("sama");
      };
      document.addEventListener("visibilitychange", onVisible);
      const timer = window.setInterval(() => apply("sama"), 5 * 60 * 1000);
      return () => {
        document.removeEventListener("visibilitychange", onVisible);
        window.clearInterval(timer);
      };
    }
  }, [theme, transparentMode]);

  useEffect(() => {
    const root = document.documentElement;
    if (customAccent) {
      root.style.setProperty("--accent", customAccent);
    } else {
      root.style.removeProperty("--accent");
    }
  }, [customAccent, theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (reduceMotion) root.classList.add("reduce-motion");
    else root.classList.remove("reduce-motion");
  }, [reduceMotion]);

  // Se1: Arabic font family
  useEffect(() => {
    document.documentElement.dataset.arabicFont = arabicFont ?? "noto_naskh";
  }, [arabicFont]);

  // Se3 + Se4: UI language and text direction
  useEffect(() => {
    const root = document.documentElement;
    const lang = uiLanguage ?? "ar";
    root.lang = lang;
    if ((textDir ?? "auto") === "ltr") {
      root.dir = "ltr";
    } else {
      root.dir = "rtl";
    }
  }, [textDir, uiLanguage]);
}
