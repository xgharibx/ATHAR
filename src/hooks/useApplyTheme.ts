import { useEffect } from "react";
import { useNoorStore, type NoorTheme } from "@/store/noorStore";

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
    return;
  }

  root.classList.add(theme);
}

/**
 * Sync theme and motion preferences to <html>.
 */
export function useApplyTheme() {
  const theme = useNoorStore((s) => s.prefs.theme);
  const reduceMotion = useNoorStore((s) => s.prefs.reduceMotion);

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
    if (reduceMotion) root.classList.add("reduce-motion");
    else root.classList.remove("reduce-motion");
  }, [reduceMotion]);
}
