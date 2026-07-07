/**
 * Widget → App tasbeeh sync (Android).
 *
 * The interactive home-screen tasbeeh widget mirrors every tap into an
 * app-readable daily-totals JSON (written by NoorTasbeehWidgetProvider):
 *   key   : noor_widget_tasbeeh_totals_v1  (SharedPreferences "CapacitorStorage")
 *   value : { date: "YYYY-MM-DD", counts: { "<phrase>": n }, total: N }
 *
 * On app foreground we diff those totals against the last merged snapshot
 * (kept in localStorage) and add only the delta to the user's real stats —
 * so dhikr made from the home screen counts toward streaks, weekly charts,
 * and lifetime counters exactly like in-app Sebha taps.
 */
import { Capacitor } from "@capacitor/core";
import { useNoorStore } from "@/store/noorStore";

const TOTALS_KEY = "noor_widget_tasbeeh_totals_v1";
const MERGED_KEY = "noor_widget_tasbeeh_merged_v1";

type WidgetTotals = {
  date?: string;
  counts?: Record<string, number>;
  total?: number;
};

export async function mergeTasbeehFromWidget(): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: TOTALS_KEY });
    if (!value) return;

    const payload = JSON.parse(value) as WidgetTotals;
    if (!payload?.date || !payload.counts) return;

    let merged: WidgetTotals = {};
    try {
      merged = JSON.parse(localStorage.getItem(MERGED_KEY) ?? "{}") as WidgetTotals;
    } catch {
      // corrupt marker — treat as never merged
    }
    const prev = merged.date === payload.date ? (merged.counts ?? {}) : {};

    const delta: Record<string, number> = {};
    let any = false;
    for (const [key, n] of Object.entries(payload.counts)) {
      const d = (typeof n === "number" ? n : 0) - (prev[key] ?? 0);
      if (d > 0) {
        delta[key] = d;
        any = true;
      }
    }
    if (!any) return;

    useNoorStore.getState().mergeWidgetTasbeeh(payload.date, delta);
    try {
      localStorage.setItem(
        MERGED_KEY,
        JSON.stringify({ date: payload.date, counts: payload.counts }),
      );
    } catch {
      // marker write failed — a rare re-merge next launch may double-count
      // once; acceptable for a best-effort stats bridge
    }
  } catch {
    // best-effort — widget totals unavailable
  }
}
