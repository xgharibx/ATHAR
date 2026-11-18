/**
 * The Adhan as a real alarm (AdhanAlarmPlugin): it rings even when the phone
 * is on silent or in a Focus, full screen, with a Stop button, so Fajr is not
 * missed.
 *
 *   - iPhone (iOS 26+): an AlarmKit alarm with the Adhan sound.
 *   - Android: an exact system alarm (the alarm-clock icon in the status bar)
 *     that plays the whole Adhan as an alarm sound and shows a Stop screen
 *     over the lock screen.
 *
 * Opt in, per prayer (Fajr by default). For a prayer that rings as an alarm,
 * its notification stays silent so the Adhan does not sound twice. The phone
 * keeps the alarms coming with the same plan as the prayer alerts
 * (src/lib/prayerTopUp.ts), so they continue while the app stays closed.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { AdhanAlarmPreferences, PrayerAlertPrayer, Reminders } from "@/store/noorStore";

export const DEFAULT_ADHAN_ALARM: AdhanAlarmPreferences = {
  enabled: false,
  prayers: { Fajr: true, Dhuhr: false, Asr: false, Maghrib: false, Isha: false },
};

export function adhanAlarmPreferences(reminders: Pick<Reminders, "adhanAlarm">): AdhanAlarmPreferences {
  const saved = reminders.adhanAlarm;
  return {
    enabled: saved?.enabled === true,
    prayers: { ...DEFAULT_ADHAN_ALARM.prayers, ...(saved?.prayers ?? {}) },
  };
}

export type AdhanAlarmStatus = {
  /** This phone can ring the Adhan as an alarm (iPhone: iOS 26 or later). */
  available: boolean;
  /** Allowed: iPhone alarm permission; Android exact alarms. */
  authorized: boolean;
  /** Android 14+: whether the Stop screen may cover the lock screen. */
  fullScreen?: boolean;
};

type AdhanAlarmPlugin = {
  status(): Promise<AdhanAlarmStatus>;
  requestPermission(): Promise<AdhanAlarmStatus>;
  test(options: { title: string }): Promise<void>;
};

const UNAVAILABLE: AdhanAlarmStatus = { available: false, authorized: false };

let plugin: AdhanAlarmPlugin | null = null;

function native(): AdhanAlarmPlugin | null {
  if (!Capacitor.isNativePlatform()) return null;
  plugin ??= registerPlugin<AdhanAlarmPlugin>("AdhanAlarm");
  return plugin;
}

export async function adhanAlarmStatus(): Promise<AdhanAlarmStatus> {
  try {
    return (await native()?.status()) ?? UNAVAILABLE;
  } catch {
    return UNAVAILABLE;
  }
}

export async function requestAdhanAlarmPermission(): Promise<AdhanAlarmStatus> {
  try {
    return (await native()?.requestPermission()) ?? UNAVAILABLE;
  } catch {
    return UNAVAILABLE;
  }
}

/** Ring the alarm now, to hear it once. */
export async function testAdhanAlarm(): Promise<boolean> {
  try {
    const target = native();
    if (!target) return false;
    await target.test({ title: "تجربة منبّه الأذان" });
    return true;
  } catch {
    return false;
  }
}

/**
 * The prayers that ring as an alarm on this phone now: chosen, with their
 * prayer alert on, and the phone able and allowed to ring alarms.
 */
export function alarmPrayers(
  reminders: Pick<Reminders, "adhanAlarm" | "prayerAlertsEnabled" | "prayerAlerts">,
  status: AdhanAlarmStatus,
): PrayerAlertPrayer[] {
  const preferences = adhanAlarmPreferences(reminders);
  if (!preferences.enabled || !reminders.prayerAlertsEnabled || !status.available || !status.authorized) return [];
  return (Object.keys(preferences.prayers) as PrayerAlertPrayer[])
    .filter((prayer) => preferences.prayers[prayer] && reminders.prayerAlerts?.[prayer] !== false);
}
