/**
 * A daily reminder for your hadith reading plan, on phones: one repeating
 * local notification at the time you chose (a calendar trigger, so it keeps
 * the wall-clock time). Tapping it opens the hadith library, where the plan
 * card opens today's share. Its id (9702) sits beside the memorisation
 * reminder's (9701), outside the app's other reminder ids.
 */
import { Capacitor } from "@capacitor/core";
import { getAccountStorageOwner } from "@/lib/accountStorageScope";
import { parseTime } from "@/quran2/native/reminder";

export const HADITH_PLAN_REMINDER_ID = 9702;
const CHANNEL_ID = "athar-hadith-plan";

let lastPlan = "";

export function planReminderBody(title: string): string {
  return `وِرد اليوم من «${title}» ينتظرك.`;
}

/** Schedule (or cancel) the reminder; false when the phone refuses notifications. */
export async function syncHadithPlanReminder(options: { time: string | null; title: string; ask?: boolean }): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const owner = getAccountStorageOwner();
  const plan = JSON.stringify({ t: options.time, n: options.title, owner });
  if (plan === lastPlan && !options.ask) return true;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id: HADITH_PLAN_REMINDER_ID }] });
    const time = options.time ? parseTime(options.time) : null;
    if (!time) {
      lastPlan = plan;
      return true;
    }
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted" && options.ask) perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") return false;
    if (Capacitor.getPlatform() === "android") {
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: "خطة قراءة الحديث",
        description: "تذكير يومي بوِرد خطة قراءة الحديث",
        importance: 3,
        visibility: 1,
      }).catch(() => {});
    }
    await LocalNotifications.schedule({
      notifications: [
        {
          id: HADITH_PLAN_REMINDER_ID,
          title: "خطة القراءة",
          body: planReminderBody(options.title),
          ...(Capacitor.getPlatform() === "android" ? { channelId: CHANNEL_ID } : {}),
          smallIcon: "ic_stat_athar_notification",
          iconColor: "#2F4F37",
          schedule: { on: { hour: time.hour, minute: time.minute, second: 0 }, allowWhileIdle: true },
          extra: { route: "/hadith", reminderKey: "hadith-plan", accountOwner: owner },
        },
      ],
    });
    lastPlan = plan;
    return true;
  } catch {
    return false;
  }
}
