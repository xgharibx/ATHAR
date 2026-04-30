import { Capacitor } from "@capacitor/core";
import type { ReminderSoundProfile, Reminders } from "@/store/noorStore";

const REMINDER_IDS = {
  morning: 9101,
  evening: 9102,
  dailyWird: 9103,
  khatma: 9104
} as const;

const PRAYER_NOTIFICATION_IDS = {
  Fajr: 9201,
  Dhuhr: 9202,
  Asr: 9203,
  Maghrib: 9204,
  Isha: 9205,
} as const;

const PRAYER_LABELS: Record<keyof typeof PRAYER_NOTIFICATION_IDS, string> = {
  Fajr: "الفجر",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء",
};

type PrayerTimingName = keyof typeof PRAYER_NOTIFICATION_IDS;

type PrayerNotificationTimings = Partial<Record<PrayerTimingName, string>>;

const REMINDER_NOTIFICATION_ICON = "ic_stat_athar";
const REMINDER_NOTIFICATION_LARGE_ICON = "logo_notification_large";
const REMINDER_ICON_COLOR = "#2F4F37";

export const REMINDER_SOUND_OPTIONS: Array<{
  id: ReminderSoundProfile;
  label: string;
  description: string;
  fileName: string;
}> = [
  {
    id: "birds_dawn",
    label: "عصافير الفجر",
    description: "زقزقة خفيفة تمنح تذكير الأذكار شعور الصباح الهادئ",
    fileName: "birds_dawn.wav",
  },
  {
    id: "rain_calm",
    label: "مطر هادئ",
    description: "صوت مطر ناعم ومريح للتذكير بدون حدّة",
    fileName: "rain_calm.wav",
  },
  {
    id: "night_breeze",
    label: "نسيم الليل",
    description: "جو ليلي هادئ بنقرات خفيفة يناسب التذكيرات المسائية",
    fileName: "night_breeze.wav",
  },
];

function getReminderSoundOption(soundProfile: ReminderSoundProfile) {
  return REMINDER_SOUND_OPTIONS.find((option) => option.id === soundProfile) ?? REMINDER_SOUND_OPTIONS[0];
}

function getReminderChannelId(soundProfile: ReminderSoundProfile) {
  return `athar-reminders-${soundProfile.replaceAll("_", "-")}`;
}

function parseHHMM(value: string): { hour: number; minute: number } | null {
  const clean = String(value ?? "").trim().split(" ")[0] ?? "";
  const m = /^(\d{1,2}):(\d{2})$/.exec(clean);
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

export async function playReminderSoundPreview(soundProfile: ReminderSoundProfile) {
  const sound = getReminderSoundOption(soundProfile);
  const audio = new Audio(`/sounds/reminders/${sound.fileName}`);
  audio.volume = 0.85;
  await audio.play();
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
      { id: REMINDER_IDS.khatma },
      { id: PRAYER_NOTIFICATION_IDS.Fajr },
      { id: PRAYER_NOTIFICATION_IDS.Dhuhr },
      { id: PRAYER_NOTIFICATION_IDS.Asr },
      { id: PRAYER_NOTIFICATION_IDS.Maghrib },
      { id: PRAYER_NOTIFICATION_IDS.Isha },
    ]
  });
}

async function ensureReminderChannel(soundProfile: ReminderSoundProfile) {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const sound = getReminderSoundOption(soundProfile);
  const channelId = getReminderChannelId(soundProfile);

  await LocalNotifications.createChannel({
    id: channelId,
    name: `Athar reminders — ${sound.label}`,
    description: "قناة تذكيرات الأذكار وورد القرآن في تطبيق أثر",
    sound: sound.fileName,
    importance: 4,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: REMINDER_ICON_COLOR,
  });

  return {
    channelId,
    soundFile: sound.fileName,
  };
}

export async function syncReminders(reminders: Reminders, prayerTimings?: PrayerNotificationTimings | null) {
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

  const notificationAudio = await ensureReminderChannel(reminders.soundProfile);

  const notifications: any[] = [];

  if (reminders.morningEnabled) {
    const at = nextAtLocalTime(reminders.morningTime);
    if (at) {
      notifications.push({
        id: REMINDER_IDS.morning,
        title: "أثر — تذكير",
        body: "ابدأ يومك بذكر الله وأذكار الصباح",
        channelId: notificationAudio.channelId,
        sound: notificationAudio.soundFile,
        smallIcon: REMINDER_NOTIFICATION_ICON,
        largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
        iconColor: REMINDER_ICON_COLOR,
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
        body: "أقبل المساء فحصّن قلبك بأذكار المساء",
        channelId: notificationAudio.channelId,
        sound: notificationAudio.soundFile,
        smallIcon: REMINDER_NOTIFICATION_ICON,
        largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
        iconColor: REMINDER_ICON_COLOR,
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
        body: "لا تنس وردك اليومي من القرآن",
        channelId: notificationAudio.channelId,
        sound: notificationAudio.soundFile,
        smallIcon: REMINDER_NOTIFICATION_ICON,
        largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
        iconColor: REMINDER_ICON_COLOR,
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
        body: "حصة اليوم من خطة الختمة تنتظرك",
        channelId: notificationAudio.channelId,
        sound: notificationAudio.soundFile,
        smallIcon: REMINDER_NOTIFICATION_ICON,
        largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
        iconColor: REMINDER_ICON_COLOR,
        schedule: { at, repeats: true, every: "day" }
      });
    }
  }

  if (reminders.prayerAlertsEnabled && prayerTimings) {
    (Object.keys(PRAYER_NOTIFICATION_IDS) as PrayerTimingName[]).forEach((prayerName) => {
      const at = nextAtLocalTime(prayerTimings[prayerName] ?? "");
      if (!at) return;

      notifications.push({
        id: PRAYER_NOTIFICATION_IDS[prayerName],
        title: "أثر — الأذان",
        body: `حان وقت صلاة ${PRAYER_LABELS[prayerName]}`,
        channelId: notificationAudio.channelId,
        sound: notificationAudio.soundFile,
        smallIcon: REMINDER_NOTIFICATION_ICON,
        largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
        iconColor: REMINDER_ICON_COLOR,
        schedule: { at, repeats: true, every: "day" }
      });
    });
  }

  if (!notifications.length) return;

  await LocalNotifications.schedule({ notifications });
}
