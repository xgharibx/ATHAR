import { accountScopedLocalStorage } from "@/lib/accountStorageScope";

export type SamaPhase = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export const SAMA_PHASE_COLORS: Record<SamaPhase, string> = {
  fajr: "#1c2145",
  dhuhr: "#0d3a26",
  asr: "#3a2f14",
  maghrib: "#471f12",
  isha: "#0d1330",
};

/** Resolve the same upcoming-prayer phase used by the living Sama theme. */
export function getSamaPhase(now = new Date()): SamaPhase {
  try {
    const raw = accountScopedLocalStorage.getItem("noor_widget_prayer_v2");
    if (raw) {
      const payload = JSON.parse(raw) as { nextPrayer?: { nameAr?: string } | null };
      const name = payload?.nextPrayer?.nameAr ?? "";
      if (name.includes("الفجر")) return "fajr";
      if (name.includes("الظهر")) return "dhuhr";
      if (name.includes("العصر")) return "asr";
      if (name.includes("المغرب")) return "maghrib";
      if (name.includes("العشاء")) return "isha";
    }
  } catch {
    // Fall through to the same clock-based phase used by the runtime theme.
  }

  const hour = now.getHours();
  if (hour < 5) return "fajr";
  if (hour < 13) return "dhuhr";
  if (hour < 17) return "asr";
  if (hour < 20) return "maghrib";
  return "isha";
}
