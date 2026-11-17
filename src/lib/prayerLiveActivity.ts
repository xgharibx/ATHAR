/**
 * The next prayer as an iOS Live Activity: a countdown on the Lock Screen and
 * in the Dynamic Island (see ios/App/App/PrayerActivityPlugin.swift and the
 * PrayerLiveActivity widget).
 *
 * The app works out which prayer is next and hands its time to the native
 * side, which draws the countdown itself; nothing has to run while the phone
 * is locked. The activity goes stale at the adhan and then counts down to the
 * prayer after it, until the app is opened again and moves it forward.
 *
 * iOS only. Every other platform is a no-op.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import { getLocalDateKey, parseClockTime, parseDateKey } from "@/lib/dayBoundaries";

export const LIVE_ACTIVITY_PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
export type LiveActivityPrayer = (typeof LIVE_ACTIVITY_PRAYERS)[number];

const PRAYER_NAMES_AR: Record<LiveActivityPrayer, string> = {
  Fajr: "الفجر",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء",
};

/**
 * iOS keeps a Live Activity running for eight hours and then on the Lock
 * Screen for up to four more. A prayer further away than that would only
 * show a frozen countdown, so none is started.
 */
export const LIVE_ACTIVITY_MAX_LEAD_MS = 12 * 60 * 60 * 1000;

export type LiveActivityPrayerDay = {
  dateISO: string;
  timings: Partial<Record<string, string>> | null | undefined;
};

export type PrayerMoment = { key: LiveActivityPrayer; nameAr: string; at: Date };

export type PrayerActivityRequest = {
  prayerKey: LiveActivityPrayer;
  nameAr: string;
  /** Epoch milliseconds. */
  at: number;
  startAt: number;
  followingNameAr?: string;
  followingAt?: number;
};

/** Every prayer of the given days, in time order. */
export function prayerMoments(days: readonly LiveActivityPrayerDay[]): PrayerMoment[] {
  const moments: PrayerMoment[] = [];
  const seenDays = new Set<string>();
  for (const day of days) {
    if (!day?.timings || seenDays.has(day.dateISO)) continue;
    const anchor = parseDateKey(day.dateISO);
    if (!anchor || getLocalDateKey(anchor) !== day.dateISO) continue;
    seenDays.add(day.dateISO);
    for (const key of LIVE_ACTIVITY_PRAYERS) {
      const at = parseClockTime(day.timings[key], anchor);
      if (!at || getLocalDateKey(at) !== day.dateISO) continue;
      moments.push({ key, nameAr: PRAYER_NAMES_AR[key], at });
    }
  }
  return moments.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * What the Live Activity should show at `now`: the next prayer, the one after
 * it, and when the countdown began (the previous prayer, so the progress bar
 * shows how much of the wait has passed). Null when no prayer is close enough.
 */
export function buildPrayerActivityRequest(
  now: Date,
  days: readonly LiveActivityPrayerDay[],
): PrayerActivityRequest | null {
  const moments = prayerMoments(days);
  const nowMs = now.getTime();
  const nextIndex = moments.findIndex((moment) => moment.at.getTime() > nowMs);
  if (nextIndex < 0) return null;

  const next = moments[nextIndex]!;
  const at = next.at.getTime();
  if (at - nowMs > LIVE_ACTIVITY_MAX_LEAD_MS) return null;

  const previous = nextIndex > 0 ? moments[nextIndex - 1] : undefined;
  const following = moments[nextIndex + 1];
  return {
    prayerKey: next.key,
    nameAr: next.nameAr,
    at,
    startAt: previous ? previous.at.getTime() : nowMs,
    ...(following ? { followingNameAr: following.nameAr, followingAt: following.at.getTime() } : {}),
  };
}

type PrayerActivityPlugin = {
  sync(request: PrayerActivityRequest): Promise<{ active: boolean; reason?: string }>;
  end(): Promise<void>;
  status(): Promise<{ enabled: boolean; active: boolean }>;
};

let plugin: PrayerActivityPlugin | null = null;

function nativePlugin(): PrayerActivityPlugin | null {
  if (!isPrayerLiveActivitySupported()) return null;
  plugin ??= registerPlugin<PrayerActivityPlugin>("PrayerActivity");
  return plugin;
}

/** Live Activities exist only in the iOS app. */
export function isPrayerLiveActivitySupported(): boolean {
  return Capacitor.getPlatform() === "ios";
}

/** Whether the user allows Athar's Live Activities in iOS Settings. */
export async function prayerLiveActivitiesAllowed(): Promise<boolean> {
  const native = nativePlugin();
  if (!native) return false;
  try {
    return (await native.status()).enabled;
  } catch {
    // An older app build without the plugin.
    return false;
  }
}

let lastSent: string | null = null;

/** Start, move or end the countdown so it matches `request`. */
export async function syncPrayerLiveActivity(request: PrayerActivityRequest | null): Promise<void> {
  const native = nativePlugin();
  if (!native) return;
  const key = JSON.stringify(request);
  if (key === lastSent) return;
  try {
    if (request) await native.sync(request);
    else await native.end();
    lastSent = key;
  } catch {
    // An older app build, or iOS refused to start it: try again next time.
    lastSent = null;
  }
}

/** Forget what was last sent, so the next sync reaches the native side. */
export function resetPrayerLiveActivityCache(): void {
  lastSent = null;
}
