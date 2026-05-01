import { Capacitor } from "@capacitor/core";
import type { PrayerAlertPreferences, PrayerSoundProfile, ReminderSoundProfile, Reminders } from "@/store/noorStore";

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

const DEFAULT_PRAYER_ALERTS: PrayerAlertPreferences = {
  Fajr: true,
  Dhuhr: true,
  Asr: true,
  Maghrib: true,
  Isha: true,
};

const REMINDER_NOTIFICATION_ICON = "ic_stat_athar_notification";
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
    label: "طيور",
    description: "",
    fileName: "birds_dawn.mp3",
  },
  {
    id: "rain_calm",
    label: "مطر 1",
    description: "",
    fileName: "rain_calm.ogg",
  },
];

export const PRAYER_SOUND_OPTIONS: Array<{
  id: PrayerSoundProfile;
  label: string;
  description: string;
  fileName: string;
}> = [
  {
    id: "adhan_haram",
    label: "أذان الحرم",
    description: "",
    fileName: "adhan_haram.mp3",
  },
  {
    id: "adhan_fajr",
    label: "أذان الفجر",
    description: "",
    fileName: "adhan_fajr.mp3",
  },
  {
    id: "iqama_soft",
    label: "إقامة هادئة",
    description: "",
    fileName: "iqama_soft.mp3",
  },
  {
    id: "aladhan_adhan_3",
    label: "مؤذن 3",
    description: "",
    fileName: "aladhan_adhan_3.mp3",
  },
  {
    id: "aladhan_adhan_4",
    label: "مؤذن 4",
    description: "",
    fileName: "aladhan_adhan_4.mp3",
  },
  {
    id: "aladhan_adhan_7",
    label: "مؤذن 7",
    description: "",
    fileName: "aladhan_adhan_7.mp3",
  },
];

function getReminderSoundOption(soundProfile: ReminderSoundProfile) {
  return REMINDER_SOUND_OPTIONS.find((option) => option.id === soundProfile) ?? REMINDER_SOUND_OPTIONS[0];
}

function getPrayerSoundOption(soundProfile: PrayerSoundProfile) {
  return PRAYER_SOUND_OPTIONS.find((option) => option.id === soundProfile) ?? PRAYER_SOUND_OPTIONS[0];
}

function getReminderChannelId(soundProfile: ReminderSoundProfile) {
  return `athar-reminders-${soundProfile.replaceAll("_", "-")}`;
}

function getPrayerChannelId(soundProfile: PrayerSoundProfile) {
  return `athar-prayer-${soundProfile.replaceAll("_", "-")}`;
}

let activePreviewAudio: HTMLAudioElement | null = null;
let activePreviewKey: string | null = null;

export function stopSoundPreview() {
  const stoppedKey = activePreviewKey;
  if (activePreviewAudio) {
    activePreviewAudio.pause();
    activePreviewAudio.currentTime = 0;
  }
  activePreviewAudio = null;
  activePreviewKey = null;
  return stoppedKey;
}

async function playSoundPreview(src: string, key: string, volume: number, onDone?: () => void) {
  stopSoundPreview();

  const audio = new Audio(src);
  activePreviewAudio = audio;
  activePreviewKey = key;
  audio.volume = volume;

  const clear = () => {
    if (activePreviewAudio !== audio) return;
    activePreviewAudio = null;
    activePreviewKey = null;
    onDone?.();
  };

  audio.addEventListener("ended", clear, { once: true });
  audio.addEventListener("error", clear, { once: true });

  try {
    await audio.play();
  } catch (error) {
    clear();
    throw error;
  }
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

function todayAtLocalTime(hhmm: string): Date | null {
  const hm = parseHHMM(hhmm);
  if (!hm) return null;

  const at = new Date();
  at.setHours(hm.hour, hm.minute, 0, 0);
  if (at.getTime() <= Date.now() + 30_000) return null;
  return at;
}

export async function playReminderSoundPreview(soundProfile: ReminderSoundProfile, onDone?: () => void) {
  const sound = getReminderSoundOption(soundProfile);
  await playSoundPreview(`/sounds/reminders/${sound.fileName}`, `reminder:${soundProfile}`, 0.85, onDone);
}

export async function playPrayerSoundPreview(soundProfile: PrayerSoundProfile, onDone?: () => void) {
  const sound = getPrayerSoundOption(soundProfile);
  await playSoundPreview(`/sounds/prayer-alerts/${sound.fileName}`, `prayer:${soundProfile}`, 0.9, onDone);
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

type NotificationAudioConfig = {
  channelId: string;
  soundFile: string;
};

function buildRepeatingNotification(options: {
  id: number;
  title: string;
  body: string;
  hhmm: string;
  audio: NotificationAudioConfig;
}) {
  const at = nextAtLocalTime(options.hhmm);
  if (!at) return null;

  return {
    id: options.id,
    title: options.title,
    body: options.body,
    channelId: options.audio.channelId,
    sound: options.audio.soundFile,
    smallIcon: REMINDER_NOTIFICATION_ICON,
    largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
    iconColor: REMINDER_ICON_COLOR,
    schedule: { at, repeats: true, every: "day" as const },
  };
}

function buildReminderNotifications(reminders: Reminders, audio: NotificationAudioConfig) {
  const plans = [
    {
      enabled: reminders.morningEnabled,
      id: REMINDER_IDS.morning,
      title: "أثر — تذكير",
      body: "ابدأ يومك بذكر الله وأذكار الصباح",
      hhmm: reminders.morningTime,
    },
    {
      enabled: reminders.eveningEnabled,
      id: REMINDER_IDS.evening,
      title: "أثر — تذكير",
      body: "أقبل المساء فحصّن قلبك بأذكار المساء",
      hhmm: reminders.eveningTime,
    },
    {
      enabled: reminders.dailyWirdEnabled,
      id: REMINDER_IDS.dailyWird,
      title: "أثر — تذكير",
      body: "لا تنس وردك اليومي من القرآن",
      hhmm: reminders.dailyWirdTime,
    },
    {
      enabled: reminders.khatmaEnabled,
      id: REMINDER_IDS.khatma,
      title: "أثر — تذكير",
      body: "حصة اليوم من خطة الختمة تنتظرك",
      hhmm: reminders.khatmaTime,
    },
  ];

  return plans.flatMap((plan) => {
    if (!plan.enabled) return [];
    const notification = buildRepeatingNotification({
      id: plan.id,
      title: plan.title,
      body: plan.body,
      hhmm: plan.hhmm,
      audio,
    });
    return notification ? [notification] : [];
  });
}

function buildPrayerNotifications(
  prayerTimings: PrayerNotificationTimings,
  audio: NotificationAudioConfig,
  enabledPrayers: PrayerAlertPreferences,
) {
  return (Object.keys(PRAYER_NOTIFICATION_IDS) as PrayerTimingName[]).flatMap((prayerName) => {
    if (!enabledPrayers[prayerName]) return [];

    const at = todayAtLocalTime(prayerTimings[prayerName] ?? "");
    if (!at) return [];

    const notification = {
      id: PRAYER_NOTIFICATION_IDS[prayerName],
      title: "أثر — الأذان",
      body: `حان وقت صلاة ${PRAYER_LABELS[prayerName]}`,
      channelId: audio.channelId,
      sound: audio.soundFile,
      smallIcon: REMINDER_NOTIFICATION_ICON,
      largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
      iconColor: REMINDER_ICON_COLOR,
      schedule: { at },
    };
    return [notification];
  });
}

function notificationRefs(ids: readonly number[]) {
  return ids.map((id) => ({ id }));
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

async function ensurePrayerChannel(soundProfile: PrayerSoundProfile) {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const sound = getPrayerSoundOption(soundProfile);
  const channelId = getPrayerChannelId(soundProfile);

  await LocalNotifications.createChannel({
    id: channelId,
    name: `Athar prayers — ${sound.label}`,
    description: "قناة تنبيهات الصلاة في تطبيق أثر",
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

  if (!reminders.enabled) {
    await cancelAllReminders();
    return;
  }

  const reminderIds = Object.values(REMINDER_IDS);
  const prayerIds = Object.values(PRAYER_NOTIFICATION_IDS);
  const shouldRefreshPrayerNotifications = !reminders.prayerAlertsEnabled || !!prayerTimings;

  await LocalNotifications.cancel({
    notifications: notificationRefs([
      ...reminderIds,
      ...(shouldRefreshPrayerNotifications ? prayerIds : []),
    ]),
  });

  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") {
    // Do not prompt here; caller controls prompting.
    return;
  }

  const notificationAudio = await ensureReminderChannel(reminders.soundProfile);

  const notifications: any[] = buildReminderNotifications(reminders, notificationAudio);

  if (reminders.prayerAlertsEnabled && prayerTimings) {
    const prayerNotificationAudio = await ensurePrayerChannel(reminders.prayerSoundProfile);
    notifications.push(...buildPrayerNotifications(
      prayerTimings,
      prayerNotificationAudio,
      { ...DEFAULT_PRAYER_ALERTS, ...reminders.prayerAlerts },
    ));
  }

  if (!notifications.length) return;

  await LocalNotifications.schedule({ notifications });
}
