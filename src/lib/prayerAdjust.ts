/**
 * Moving a prayer's time by a few minutes (Settings › الصلاة).
 *
 * Calculated times can differ from the local mosque by a minute or two, more
 * at high latitudes. The person's adjustments are applied wherever the app
 * uses prayer times: the screens, the alerts it queues, the times the phone
 * queues by itself, and the widgets.
 */
export const ADJUSTABLE_PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
export type AdjustablePrayer = (typeof ADJUSTABLE_PRAYERS)[number];
export type PrayerTimeAdjust = Partial<Record<AdjustablePrayer, number>>;

export const PRAYER_ADJUST_LIMIT = 30;

export function clampAdjust(minutes: unknown): number {
  const n = typeof minutes === "number" && Number.isFinite(minutes) ? Math.round(minutes) : 0;
  return Math.max(-PRAYER_ADJUST_LIMIT, Math.min(PRAYER_ADJUST_LIMIT, n));
}

export function hasAdjustments(adjust?: PrayerTimeAdjust | null): boolean {
  return !!adjust && ADJUSTABLE_PRAYERS.some((prayer) => clampAdjust(adjust[prayer]) !== 0);
}

/** "04:32" or "04:32 (EET)" moved by `minutes`, within the same day. */
export function shiftClock(value: string, minutes: number): string {
  if (!minutes) return value;
  const match = /^(\s*)(\d{1,2}):(\d{2})(.*)$/s.exec(value);
  if (!match) return value;
  const total = Math.max(0, Math.min(23 * 60 + 59, Number(match[2]) * 60 + Number(match[3]) + minutes));
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${match[1]}${hh}:${mm}${match[4]}`;
}

/** The same timings with each prayer moved by its adjustment. */
export function adjustTimings<T extends Record<string, string>>(timings: T, adjust?: PrayerTimeAdjust | null): T {
  if (!hasAdjustments(adjust)) return timings;
  const out: Record<string, string> = { ...timings };
  for (const prayer of ADJUSTABLE_PRAYERS) {
    const minutes = clampAdjust(adjust?.[prayer]);
    if (minutes && typeof out[prayer] === "string") out[prayer] = shiftClock(out[prayer], minutes);
  }
  return out as T;
}
