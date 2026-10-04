import { getSamaPhase, SAMA_PHASE_COLORS } from "@/lib/samaTheme";

/** Installation-wide visual hint used only before account-scoped preferences hydrate. */
export const THEME_BOOTSTRAP_STORAGE_KEY = "athar_theme_bootstrap_v1";

export function rememberThemeForFirstPaint(theme: string, color?: string): void {
  try {
    if (typeof globalThis.localStorage !== "undefined") {
      const resolvedColor = theme === "sama"
        ? color ?? SAMA_PHASE_COLORS[getSamaPhase()]
        : undefined;
      const hint = resolvedColor ? { theme, color: resolvedColor } : { theme };
      globalThis.localStorage.setItem(THEME_BOOTSTRAP_STORAGE_KEY, JSON.stringify(hint));
    }
  } catch {
    // Storage can be disabled; the app's persisted preference remains authoritative.
  }
}
