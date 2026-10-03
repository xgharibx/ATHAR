/**
 * Widget → App tasbeeh sync (Android).
 *
 * The interactive home-screen widget stores cumulative daily totals per
 * account owner. The app merges every unprocessed date on foreground, so taps
 * made before the app was opened at midnight still reach the correct day.
 */
import { Capacitor } from "@capacitor/core";
import { accountScopedLocalStorage, getAccountStorageOwner } from "@/lib/accountStorageScope";
import { useNoorStore } from "@/store/noorStore";

const TOTALS_KEY = "noor_widget_tasbeeh_totals_v1";
const MERGED_KEY = "noor_widget_tasbeeh_merged_v1";

type WidgetDay = {
  counts?: Record<string, number>;
};

type WidgetTotals = {
  owners?: Record<string, Record<string, WidgetDay | Record<string, number>>>;
  // Legacy single-day payload retained for upgrades from earlier app builds.
  owner?: string;
  date?: string;
  counts?: Record<string, number>;
};

type MergedTotals = {
  days?: Record<string, Record<string, number>>;
  // Legacy single-day merge marker retained for upgrades.
  date?: string;
  counts?: Record<string, number>;
};

function normalizeCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const counts: Record<string, number> = {};
  for (const [key, count] of Object.entries(value)) {
    if (typeof count === "number" && Number.isFinite(count) && count >= 0) {
      counts[key] = count;
    }
  }
  return counts;
}

function getDayCounts(day: WidgetDay | Record<string, number>): Record<string, number> {
  if (day && typeof day === "object" && "counts" in day) {
    return normalizeCounts(day.counts);
  }
  return normalizeCounts(day);
}

export async function mergeTasbeehFromWidget(): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: TOTALS_KEY });
    if (!value) return;

    const payload = JSON.parse(value) as WidgetTotals;
    const activeOwner = getAccountStorageOwner();

    // Older native builds store one installation-wide day. Keep this
    // compatibility path and rebase mismatched owners to avoid cross-account
    // attribution while the native widget upgrades its payload on next tap.
    if (!payload?.owners && (!payload?.date || !payload.counts)) return;
    const legacyOwner = payload.owner ?? "local";
    if (!payload.owners && legacyOwner !== activeOwner) {
      accountScopedLocalStorage.setItem(
        MERGED_KEY,
        JSON.stringify({ date: payload.date, counts: normalizeCounts(payload.counts) }),
      );
      return;
    }

    const incomingDays: Record<string, Record<string, number>> = {};
    if (payload.owners) {
      const ownerDays = payload.owners[activeOwner];
      if (!ownerDays) return;
      for (const [date, day] of Object.entries(ownerDays)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) incomingDays[date] = getDayCounts(day);
      }
    } else if (payload.date && payload.counts) {
      incomingDays[payload.date] = normalizeCounts(payload.counts);
    }
    if (Object.keys(incomingDays).length === 0) return;

    let merged: MergedTotals = {};
    try {
      merged = JSON.parse(accountScopedLocalStorage.getItem(MERGED_KEY) ?? "{}") as MergedTotals;
    } catch {
      // A corrupt marker is equivalent to an empty marker.
    }

    const mergedDays = merged.days ? { ...merged.days } : {};
    if (!merged.days && merged.date && merged.counts) {
      mergedDays[merged.date] = normalizeCounts(merged.counts);
    }

    for (const [date, counts] of Object.entries(incomingDays)) {
      const previous = normalizeCounts(mergedDays[date]);
      const next = { ...previous };
      const delta: Record<string, number> = {};

      for (const [phrase, count] of Object.entries(counts)) {
        const difference = count - (previous[phrase] ?? 0);
        if (difference > 0) delta[phrase] = difference;
        // Preserve the high-water mark if a widget counter resets or returns
        // stale data, so re-syncing cannot subtract or re-credit old taps.
        next[phrase] = Math.max(previous[phrase] ?? 0, count);
      }

      if (Object.keys(delta).length > 0) {
        useNoorStore.getState().mergeWidgetTasbeeh(date, delta);
      }
      mergedDays[date] = next;
    }

    try {
      accountScopedLocalStorage.setItem(MERGED_KEY, JSON.stringify({ days: mergedDays }));
    } catch {
      // A failed marker write can cause a rare re-merge on the next launch.
    }
  } catch {
    // Best-effort — widget totals may be unavailable or malformed.
  }
}
