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
};

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

  root.classList.remove(
    "dark",
    "light",
    "noor",
    "midnight",
    "forest",
    "bees",
    "roses",
    "sapphire",
    "violet",
    "sunset",
    "mist"
  );

  if (theme === "system") {
    const isDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    root.classList.add(isDark ? "dark" : "light");
    setMetaThemeColor(isDark ? "#07080b" : "#f7f8ff");
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

  useEffect(() => {
    apply(theme);

    // Always-on immersive transparent mode
    document.body.classList.add("transparent-mode");

    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq || theme !== "system") return;

    const onChange = () => apply("system");
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [theme]);

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
}
