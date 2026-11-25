/**
 * «القرآن ٢» — a daily reminder for the memorisation session, on phones.
 *
 * One repeating local notification at the chosen time (a calendar trigger, so
 * it keeps the wall-clock time across reboots and daylight saving). Tapping it
 * opens the memorisation page. It says how many pages wait in the session of
 * the day it next rings; the app refreshes that whenever it runs. Its id (9701)
 * sits outside the app's other reminder ids (9100–9599 with their date slots).
 */
import { Capacitor } from "@capacitor/core";
import { getAccountStorageOwner } from "@/lib/accountStorageScope";
import { arCount } from "../data/arabic";

export const HIFZ_REMINDER_ID = 9701;
const CHANNEL_ID = "athar-quran2-hifz";

export function parseTime(hhmm: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

/** Whether the reminder at `hhmm` rings later today (else tomorrow). */
export function nextFireIsToday(hhmm: string, now: number): boolean {
  const t = parseTime(hhmm);
  if (!t) return true;
  const d = new Date(now);
  return d.getHours() * 60 + d.getMinutes() < t.hour * 60 + t.minute;
}

export function reminderBody(due: number): string {
  if (due <= 0) return "ابدأ درسك الجديد، أو راجع ما حفظت ولو صفحة.";
  if (due === 1) return "صفحة واحدة تنتظرك في جلسة اليوم.";
  if (due === 2) return "صفحتان تنتظرانك في جلسة اليوم.";
  return `${arCount(due, "صفحة", "صفحتان", "صفحات", "صفحة")} تنتظرك في جلسة اليوم.`;
}

let lastPlan = "";

/**
 * Schedule (or cancel) the reminder. Asks for permission only when turning it
 * on; resolves to false when the phone refuses.
 */
export async function syncHifzReminder(options: { enabled: boolean; time: string; due: number; ask?: boolean }): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  // A tap opens the app only for the account that set the reminder.
  const owner = getAccountStorageOwner();
  const plan = JSON.stringify({ e: options.enabled, t: options.time, d: Math.min(options.due, 99), owner });
  if (plan === lastPlan && !options.ask) return true;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id: HIFZ_REMINDER_ID }] });
    const time = parseTime(options.time);
    if (!options.enabled || !time) {
      lastPlan = plan;
      return true;
    }
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted" && options.ask) perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") return false;
    if (Capacitor.getPlatform() === "android") {
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: "ورد الحفظ",
        description: "تذكير يومي بجلسة الحفظ والمراجعة في القرآن ٢",
        importance: 4,
        visibility: 1,
      }).catch(() => {});
    }
    await LocalNotifications.schedule({
      notifications: [
        {
          id: HIFZ_REMINDER_ID,
          title: "ورد الحفظ",
          body: reminderBody(options.due),
          ...(Capacitor.getPlatform() === "android" ? { channelId: CHANNEL_ID } : {}),
          smallIcon: "ic_stat_athar_notification",
          iconColor: "#2F4F37",
          schedule: { on: { hour: time.hour, minute: time.minute, second: 0 }, allowWhileIdle: true },
          extra: { route: "/q2/hifz", reminderKey: "quran2-hifz", accountOwner: owner },
        },
      ],
    });
    lastPlan = plan;
    return true;
  } catch {
    return false;
  }
}
