/**
 * Silence the phone during prayer (Android, PrayerSilencePlugin): from each
 * Adhan, Do Not Disturb turns on for the chosen minutes, then the phone goes
 * back to how it was. It only acts when the phone was not already in Do Not
 * Disturb, and never changes a mode the person set themselves meanwhile.
 * Alarms still ring (the Adhan alarm included).
 *
 * iPhone: Apple gives apps no way to silence the phone, so Settings shows how
 * to set up a Focus instead.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { PrayerSilencePreferences, Reminders } from "@/store/noorStore";

export const SILENCE_MINUTES = [15, 20, 30, 45] as const;
export const DEFAULT_PRAYER_SILENCE: PrayerSilencePreferences = { enabled: false, minutes: 20 };

export function prayerSilencePreferences(reminders: Pick<Reminders, "prayerSilence">): PrayerSilencePreferences {
  const saved = reminders.prayerSilence;
  const minutes = SILENCE_MINUTES.includes(saved?.minutes as (typeof SILENCE_MINUTES)[number]) ? saved!.minutes : DEFAULT_PRAYER_SILENCE.minutes;
  return { enabled: saved?.enabled === true, minutes };
}

type PrayerSilencePlugin = {
  status(): Promise<{ granted: boolean }>;
  requestAccess(): Promise<{ granted: boolean }>;
};

let plugin: PrayerSilencePlugin | null = null;

function native(): PrayerSilencePlugin | null {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return null;
  plugin ??= registerPlugin<PrayerSilencePlugin>("PrayerSilence");
  return plugin;
}

/** Whether Athar may switch Do Not Disturb (Android's "Do Not Disturb access"). */
export async function prayerSilenceAllowed(): Promise<boolean> {
  try {
    return (await native()?.status())?.granted === true;
  } catch {
    return false;
  }
}

/** Opens Android's Do Not Disturb access screen for Athar. */
export async function requestPrayerSilenceAccess(): Promise<boolean> {
  try {
    return (await native()?.requestAccess())?.granted === true;
  } catch {
    return false;
  }
}
