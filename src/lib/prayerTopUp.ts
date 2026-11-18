/**
 * Adhan alerts that keep coming while the app stays closed.
 *
 * The app queues a week of prayer alarms whenever it opens. Before this, a
 * person who did not open Athar for more than a week stopped hearing the
 * Adhan. Now each sync also hands the phone a year of prayer times, worked
 * out offline with the same calculation the app uses, and the phone keeps the
 * next days queued by itself (PrayerTopUpPlugin on Android and iOS):
 *
 *   - Android: a daily background job queues the days after the app's own
 *     week, so alerts continue for as long as the plan lasts (a year).
 *   - iPhone: whenever iOS lets Athar run in the background (and every time
 *     it starts), it fills the free notification slots with the next days.
 *
 * Only the Adhan itself is continued this way. The gentle follow-ups, the
 * Ramadan alerts and the Fajr hadith return when the app next opens.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { LocalNotification } from "@capacitor/local-notifications";
import { parseDateKey, shiftDateKey } from "@/lib/dayBoundaries";
import { computeLocalPrayerTimings } from "@/lib/localPrayerTimes";

export const TOP_UP_PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
export type TopUpPrayer = (typeof TOP_UP_PRAYERS)[number];

/** How far ahead the plan reaches: the phone can continue on its own for a year. */
export const TOP_UP_PLAN_DAYS = 365;

/** The notification content for one prayer's Adhan: everything but the id and time. */
export type TopUpTemplate = {
  baseId: number;
  notification: Omit<LocalNotification, "id" | "schedule">;
};

export type PrayerTopUpPlan = {
  version: 1;
  /** The last day the app queued itself; the phone continues from the day after. */
  scheduledThrough: string;
  /** Notification ids for a date: baseId + slot * slotOffset (see reminders.ts). */
  slotCount: number;
  slotOffset: number;
  /** The phone queues at most this many days ahead, so no two dates share an id. */
  windowDays: number;
  templates: Partial<Record<TopUpPrayer, TopUpTemplate>>;
  /** d: local date, s: its id slot, t: "HH:mm" per prayer. */
  days: Array<{ d: string; s: number; t: Record<TopUpPrayer, string> }>;
};

export type PrayerTopUpInput = {
  scheduledThrough: string;
  coords: { lat: number; lng: number };
  method: number;
  school: number;
  templates: Partial<Record<TopUpPrayer, TopUpTemplate>>;
  slotCount: number;
  slotOffset: number;
  slotForDate: (dateISO: string) => number;
  planDays?: number;
};

export function buildPrayerTopUpPlan(input: PrayerTopUpInput): PrayerTopUpPlan {
  const days: PrayerTopUpPlan["days"] = [];
  const total = input.planDays ?? TOP_UP_PLAN_DAYS;
  for (let offset = 1; offset <= total; offset += 1) {
    const d = shiftDateKey(input.scheduledThrough, offset);
    const date = parseDateKey(d);
    if (!date) continue;
    // Midday avoids any daylight-saving edge at midnight.
    date.setHours(12, 0, 0, 0);
    const timings = computeLocalPrayerTimings(input.coords.lat, input.coords.lng, date, input.method, input.school);
    days.push({
      d,
      s: input.slotForDate(d),
      t: {
        Fajr: timings.Fajr,
        Dhuhr: timings.Dhuhr,
        Asr: timings.Asr,
        Maghrib: timings.Maghrib,
        Isha: timings.Isha,
      },
    });
  }
  return {
    version: 1,
    scheduledThrough: input.scheduledThrough,
    slotCount: input.slotCount,
    slotOffset: input.slotOffset,
    windowDays: input.slotCount,
    templates: input.templates,
    days,
  };
}

type PrayerTopUpPluginApi = {
  configure(options: { plan: PrayerTopUpPlan }): Promise<{ queued: number }>;
  clear(): Promise<void>;
};

let plugin: PrayerTopUpPluginApi | null = null;

function nativePlugin(): PrayerTopUpPluginApi | null {
  if (!Capacitor.isNativePlatform()) return null;
  plugin ??= registerPlugin<PrayerTopUpPluginApi>("PrayerTopUp");
  return plugin;
}

/** Hand the phone the plan; it queues the next days right away. */
export async function configurePrayerTopUp(plan: PrayerTopUpPlan): Promise<void> {
  try {
    await nativePlugin()?.configure({ plan });
  } catch {
    // An older native build without the plugin: the app's own week still works.
  }
}

/** Prayer alerts turned off: the phone stops queuing on its own. */
export async function clearPrayerTopUp(): Promise<void> {
  try {
    await nativePlugin()?.clear();
  } catch {
    // Nothing to stop.
  }
}

/** Notifications the phone queued by itself carry this flag in `extra`. */
export function isTopUpNotification(extra: unknown): boolean {
  return typeof extra === "object" && extra !== null && (extra as Record<string, unknown>).atharTopUp === true;
}
