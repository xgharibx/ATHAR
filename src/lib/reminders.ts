import { Capacitor } from "@capacitor/core";
import type { Reminders } from "@/store/noorStore";

const REMINDER_IDS = {
  morning: 9101,
  evening: 9102,
  dailyWird: 9103,
  khatma: 9104
} as const;

function parseHHMM(value: string): { hour: number; minute: number } | null {
  const m = (value ?? "").match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function nextAtLocalTime(hhmm: string): Date | null {
  const hm = parseHHMM(hhmm);
  if (!hm) return null;

  const now = new Date();
  const at = new Date(now);
  at.setHours(hm.hour, hm.minute, 0, 0);

  // If time already passed today, schedule for tomorrow.
  if (at.getTime() <= now.getTime() + 30_000) {
    at.setDate(at.getDate() + 1);
  }
  return at;
}

export async function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

export async function getNotificationPermission(): Promise<"granted" | "denied" | "prompt"> {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const p = await LocalNotifications.checkPermissions();
  return p.display as any;
}

export async function requestNotificationPermission(): Promise<"granted" | "denied" | "prompt"> {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const p = await LocalNotifications.requestPermissions();
  return p.display as any;
}

export async function cancelAllReminders() {
  const { LocalNotifications } = await import("@capacitor/local-notifications");

  await LocalNotifications.cancel({
    notifications: [
      { id: REMINDER_IDS.morning },
      { id: REMINDER_IDS.evening },
      { id: REMINDER_IDS.dailyWird },
      { id: REMINDER_IDS.khatma }
    ]
  });
}

export async function syncReminders(reminders: Reminders) {
  if (!Capacitor.isNativePlatform()) return;

  const { LocalNotifications } = await import("@capacitor/local-notifications");

  // Always clear existing scheduled reminders to avoid duplicates.
  await cancelAllReminders();

  if (!reminders.enabled) return;

  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") {
    // Do not prompt here; caller controls prompting.
    return;
  }

  const notifications: any[] = [];

  if (reminders.morningEnabled) {
    const at = nextAtLocalTime(reminders.morningTime);
    if (at) {
      notifications.push({
        id: REMINDER_IDS.morning,
        title: "أثر — تذكير",
        body: "حان وقت أذكار الصباح",
        schedule: { at, repeats: true, every: "day" }
      });
    }
  }

  if (reminders.eveningEnabled) {
    const at = nextAtLocalTime(reminders.eveningTime);
    if (at) {
      notifications.push({
        id: REMINDER_IDS.evening,
        title: "أثر — تذكير",
        body: "حان وقت أذكار المساء",
        schedule: { at, repeats: true, every: "day" }
      });
    }
  }

  if (reminders.dailyWirdEnabled) {
    const at = nextAtLocalTime(reminders.dailyWirdTime);
    if (at) {
      notifications.push({
        id: REMINDER_IDS.dailyWird,
        title: "أثر — تذكير",
        body: "لا تنسَ ورد اليوم من القرآن",
        schedule: { at, repeats: true, every: "day" }
      });
    }
  }

  if (reminders.khatmaEnabled) {
    const at = nextAtLocalTime(reminders.khatmaTime);
    if (at) {
      notifications.push({
        id: REMINDER_IDS.khatma,
        title: "أثر — تذكير",
        body: "حصة اليوم من خطة الختمة",
        schedule: { at, repeats: true, every: "day" }
      });
    }
  }

  if (!notifications.length) return;

  await LocalNotifications.schedule({ notifications });
}
