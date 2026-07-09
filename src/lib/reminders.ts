import { Capacitor } from "@capacitor/core";
import type { LocalNotification } from "@capacitor/local-notifications";
import type { PrayerAlertPreferences, PrayerSoundProfile, ReminderSoundProfile, Reminders } from "@/store/noorStore";
import { getLocalDateKey } from "@/lib/dayBoundaries";

// N9: Actionable prayer notifications — "تمت الصلاة" lets the user log a prayer
// (and cancel its gentle follow-up) directly from the notification shade.
const PRAYER_ACTION_TYPE_ID = "PRAYER_ACTIONS";
const MARK_PRAYED_ACTION_ID = "mark_prayed";

const REMINDER_IDS = {
  morning: 9101,
  evening: 9102,
  dailyWird: 9103,
  khatma: 9104,
  tasbeeh: 9105
} as const;

const PRAYER_NOTIFICATION_IDS = {
  Fajr: 9201,
  Dhuhr: 9202,
  Asr: 9203,
  Maghrib: 9204,
  Isha: 9205,
} as const;

// N2: Follow-up (gentle) prayer reminders sent 30 min after the main adhan
const PRAYER_FOLLOWUP_IDS = {
  Fajr: 9301,
  Dhuhr: 9302,
  Asr: 9303,
  Maghrib: 9304,
  Isha: 9305,
} as const;

// N4: Ramadan suhoor / iftar notification IDs
const RAMADAN_IDS = {
  suhoor: 9401,
  iftar: 9402,
} as const;

// N5: Daily hadith at Fajr (Phase 10)
const DAILY_HADITH_ID = 9501;

// 40 brief excerpts from Nawawi's 40 Hadiths (rotate daily)
const DAILY_HADITH_FAJR_PHRASES = [
  "إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى",
  "الإسلام أن تشهد أن لا إله إلا الله وأن محمداً رسول الله",
  "بُني الإسلام على خمس: شهادة أن لا إله إلا الله وأن محمداً رسوله",
  "لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه",
  "الحلال بيّن والحرام بيّن وبينهما أمور مشتبهات",
  "من كان يؤمن بالله واليوم الآخر فليقل خيراً أو ليصمت",
  "الدين النصيحة",
  "أمرت أن أقاتل الناس حتى يشهدوا أن لا إله إلا الله",
  "ما نهيتكم عنه فاجتنبوه وما أمرتكم به فأتوا منه ما استطعتم",
  "إن الله طيب لا يقبل إلا طيباً",
  "دع ما يريبك إلى ما لا يريبك",
  "من حسن إسلام المرء تركه ما لا يعنيه",
  "لا يؤمن أحدكم حتى يكون هواه تبعاً لما جئت به",
  "لا ضرر ولا ضرار",
  "من رأى منكم منكراً فليغيّره بيده",
  "عليك بالصدق فإن الصدق يهدي إلى البر",
  "اتق الله حيثما كنت وأتبع السيئة الحسنة تمحها",
  "احفظ الله يحفظك، احفظ الله تجده تجاهك",
  "إذا قمت إلى الصلاة فأسبغ الوضوء",
  "كن في الدنيا كأنك غريب أو عابر سبيل",
  "لا تحقرن من المعروف شيئاً",
  "لو كان الدنيا تعدل عند الله جناح بعوضة",
  "الزهد في الدنيا يريح القلب والبدن",
  "الطهور شطر الإيمان",
  "رأس الأمر الإسلام وعموده الصلاة",
  "كل أمر ذي بال لا يبدأ بـ بسم الله فهو أجذم",
  "جعلت الصلاة قرة عيني",
  "خلق الله الخلق فكتب رحمتي تغلب غضبي",
  "لا يدخل الجنة من كان في قلبه مثقال ذرة من كبر",
  "أكمل المؤمنين إيماناً أحسنهم خلقاً",
  "البر حسن الخلق، والإثم ما حاك في صدرك",
  "يا غلام إني أعلمك كلمات: احفظ الله يحفظك",
  "لو توكلتم على الله حق توكله لرزقكم كما يرزق الطير",
  "كل بدعة ضلالة وكل ضلالة في النار",
  "من رأى منكم منكراً فليغيره بيده، فإن لم يستطع فبلسانه",
  "إن الله كتب الإحسان على كل شيء",
  "إن من حسن إسلام المرء تركه ما لا يعنيه",
  "إن قامت الساعة وفي يد أحدكم فسيلة فليزرعها",
  "بشّر المشّائين في الظُّلَم إلى المساجد بالنور التام يوم القيامة",
  "كل ابن آدم خطّاء وخير الخطّائين التوابون",
];

const PRAYER_LABELS: Record<keyof typeof PRAYER_NOTIFICATION_IDS, string> = {
  Fajr: "الفجر",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء",
};

type PrayerTimingName = keyof typeof PRAYER_NOTIFICATION_IDS;

type PrayerNotificationTimings = Partial<Record<PrayerTimingName, string>>;

// ── N1: Rotating motivational Arabic phrases ─────────────────────────────────

const MORNING_PHRASES = [
  "ابدأ يومك بذكر الله وأذكار الصباح",
  "من أسبح الله في الصباح كان في ذمة الله",
  "الذاكرون الله كثيرًا… صباح الذكر خير من الدنيا وما فيها",
  "صباح ذكرٍ وشكرٍ وقرب من الله ♡",
  "أذكار الصباح درعك لهذا اليوم",
  "ما من صباح إلا وبابه مفتوح على رزق ورحمة",
  "ابدأ يومك بـ «بسم الله» وأتمّه بـ «الحمد لله»",
  "حصّن يومك بالذكر قبل أن يبدأ",
];

const EVENING_PHRASES = [
  "أقبل المساء فحصّن قلبك بأذكار المساء",
  "المساء بوابة الراحة… ابدأها بذكر الله",
  "ختم المساء بالذكر نور في الظلام",
  "قبل أن ينام جسدك أيقظ روحك بالذكر",
  "مَن قرأ أذكار المساء أمسى في جوار الله",
  "أذكار المساء ختم اليوم بالخير",
  "وقفة مع الله قبل انتهاء النهار",
  "لا تنم إلا وقلبك مطمئن بذكر الله",
];

const DAILY_WIRD_PHRASES = [
  "لا تنس وردك اليومي من القرآن",
  "القرآن حياة القلوب… تلُه اليوم",
  "آية تقرأها خير من دنيا تتركها",
  "يوم بلا قرآن يوم بلا نور",
  "ورد اليوم ينتظرك… لا تُخلف الموعد",
  "اجعل القرآن أنيس يومك",
  "وردك رفيقك في الدنيا وشفيعك في الآخرة",
  "كلّ آية تقرأها درجة ترفع",
];

const KHATMA_PHRASES = [
  "حصة اليوم من خطة الختمة تنتظرك",
  "خطوة صغيرة في خطتك تقربك من ختمة القرآن",
  "تابع رحلتك مع القرآن… ختمة بختمة",
  "اليوم جزء من طريق الختمة",
  "لا تنقطع… الختمة أمانة في عنقك",
  "كل يوم تقرأ فيه يقربك من نور الآخرة",
  "الختمة رفيقة العمر… واصلها اليوم",
  "من ختم القرآن كان له دعوة مستجابة",
];

// Smart nudge phrases — shown when the user has started but not finished today's azkar
const MORNING_NUDGE_PHRASES = [
  "لم تُكمل أذكار الصباح بعد… أكمل وردك ولو القليل",
  "بقي القليل على إتمام أذكار الصباح — أكملها الآن",
  "بدأت أذكار الصباح فلا تتركها ناقصة، أتمّها لله",
  "خطوة واحدة تفصلك عن إتمام حصن صباحك",
];

const EVENING_NUDGE_PHRASES = [
  "لم تُكمل أذكار المساء بعد… أتمّها قبل النوم",
  "بقي القليل على إتمام أذكار المساء — أكملها الآن",
  "بدأت أذكار المساء فلا تتركها ناقصة، أتمّها لله",
  "اختم مساءك بإتمام ما تبقّى من أذكارك",
];

// N6: Tasbeeh & istighfar reminder phrases (rotate daily)
const TASBEEH_PHRASES = [
  "خذ دقيقة: سبّح الله مئة مرة تُغرس لك نخلة في الجنة",
  "أكثِر من الاستغفار… فمن لزم الاستغفار جعل الله له من كل همّ فرجًا",
  "سبحان الله وبحمده مئة مرة تُحَطّ بها الخطايا ولو كانت مثل زبد البحر",
  "لحظة تسبيح خير لك من الدنيا وما فيها",
  "أستغفر الله العظيم وأتوب إليه — رددها الآن بقلب حاضر",
  "لا إله إلا الله وحده لا شريك له… أكثِر منها اليوم",
  "سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر",
  "اغرس لنفسك غراسًا في الجنة بالتسبيح والاستغفار الآن",
];

const PRAYER_FOLLOWUP_PHRASES: Record<PrayerTimingName, string> = {
  Fajr:   "هل أدّيتَ صلاة الفجر؟ لا تفوّتها فهي من أعظم القربات",
  Dhuhr:  "تذكير لطيف: لم يُسجَّل أداء صلاة الظهر بعد",
  Asr:    "أدّيتَ صلاة العصر؟ سجّلها قبل أن ينتهي وقتها",
  Maghrib: "لم تُسجَّل صلاة المغرب… حافظ على صلاتك في وقتها",
  Isha:   "تذكير برفق: صلاة العشاء لم تُسجَّل بعد",
};

// N4: Ramadan messages
const SUHOOR_PHRASES = [
  "السحور بركة… قم وتسحّر فإن في السحور بركة",
  "موعد السحور أقترب — لا تفوّت البركة",
  "اغتنم وقت السحور بالأكل والدعاء والاستغفار",
  "نبيّك ﷺ قال: تسحّروا فإن في السحور بركة",
];

const IFTAR_PHRASES = [
  "حان وقت الإفطار — اللّهم لك صمتُ وعلى رزقك أفطرتُ",
  "الفطر رحمة من الله — أفطر على خير",
  "أذان المغرب دعوة الله لك — بادر بالإفطار",
  "للصائم فرحتان: فرحة عند الإفطار وفرحة عند لقاء ربه",
];

/** Pick a daily-rotating phrase from an array (same phrase all day, changes next day). */
function dailyPhrase(phrases: string[]): string {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return phrases[dayIndex % phrases.length]!;
}

// ── N4: Ramadan detection ────────────────────────────────────────────────────

/** Returns true when the current Gregorian date falls in Ramadan (Hijri month 9). */
export function isRamadan(): boolean {
  try {
    const fmt = new Intl.DateTimeFormat("en-u-ca-islamic", { month: "numeric" });
    const parts = fmt.formatToParts(new Date());
    const monthPart = parts.find((p) => p.type === "month");
    return monthPart?.value === "9";
  } catch {
    return false;
  }
}

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
    id: "rain_calm",
    label: "مطر هادئ",
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
  return p.display as "granted" | "denied" | "prompt";
}

export async function requestNotificationPermission(): Promise<"granted" | "denied" | "prompt"> {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const p = await LocalNotifications.requestPermissions();
  return p.display as "granted" | "denied" | "prompt";
}

/**
 * Android 12+ silently downgrades scheduled reminders to inexact alarms (which can
 * arrive minutes late) unless the user has granted the "Alarms & reminders" exact-alarm
 * setting. This is a separate switch from the notification permission itself, and the
 * OS gives no in-app prompt for it — the app has to detect it and send the user to the
 * system settings screen. No-op on iOS/other platforms (Android-only Capacitor API).
 */
export async function ensureExactAlarmPermission(): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const current = await LocalNotifications.checkExactNotificationSetting();
    if (current.exact_alarm !== "granted") {
      await LocalNotifications.changeExactNotificationSetting();
    }
  } catch {
    // Older Android/OEM WebViews may not expose this setting screen — reminders
    // still work, just potentially a few minutes late; nothing else to do here.
  }
}

export async function cancelAllReminders() {
  const { LocalNotifications } = await import("@capacitor/local-notifications");

  await LocalNotifications.cancel({
    notifications: [
      { id: REMINDER_IDS.morning },
      { id: REMINDER_IDS.evening },
      { id: REMINDER_IDS.dailyWird },
      { id: REMINDER_IDS.khatma },
      { id: REMINDER_IDS.tasbeeh },
      { id: PRAYER_NOTIFICATION_IDS.Fajr },
      { id: PRAYER_NOTIFICATION_IDS.Dhuhr },
      { id: PRAYER_NOTIFICATION_IDS.Asr },
      { id: PRAYER_NOTIFICATION_IDS.Maghrib },
      { id: PRAYER_NOTIFICATION_IDS.Isha },
      // N2: follow-ups
      { id: PRAYER_FOLLOWUP_IDS.Fajr },
      { id: PRAYER_FOLLOWUP_IDS.Dhuhr },
      { id: PRAYER_FOLLOWUP_IDS.Asr },
      { id: PRAYER_FOLLOWUP_IDS.Maghrib },
      { id: PRAYER_FOLLOWUP_IDS.Isha },
      // N4: Ramadan
      { id: RAMADAN_IDS.suhoor },
      { id: RAMADAN_IDS.iftar },
    ]
  });
}

/** N2: Cancel the gentle follow-up for a specific prayer (call when user logs the prayer). */
export async function cancelPrayerFollowUp(prayerName: string) {
  if (!Capacitor.isNativePlatform()) return;
  const id = PRAYER_FOLLOWUP_IDS[prayerName as PrayerTimingName];
  if (!id) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch {
    // ignore
  }
}

type NotificationAudioConfig = {
  channelId: string;
  soundFile: string;
};

/** N6: Smart completion snapshot for today's daily azkar (computed by caller). */
export type ReminderCompletionInfo = {
  morningDone?: boolean;
  morningStarted?: boolean;
  eveningDone?: boolean;
  eveningStarted?: boolean;
};

/**
 * Daily-repeating anchor for a reminder. When `skipToday` is true (the section is
 * already completed today), push the first occurrence to tomorrow so we don't nag.
 */
function reminderAnchor(hhmm: string, skipToday: boolean): Date | null {
  const at = nextAtLocalTime(hhmm);
  if (!at) return null;
  if (skipToday) {
    const now = new Date();
    const isToday =
      at.getFullYear() === now.getFullYear() &&
      at.getMonth() === now.getMonth() &&
      at.getDate() === now.getDate();
    if (isToday) at.setDate(at.getDate() + 1);
  }
  return at;
}

function buildReminderNotifications(
  reminders: Reminders,
  audio: NotificationAudioConfig,
  completion?: ReminderCompletionInfo,
) {
  const c = completion ?? {};

  // Smart body: if started-but-not-done, nudge to finish; otherwise motivate to begin.
  const morningBody = c.morningStarted && !c.morningDone
    ? dailyPhrase(MORNING_NUDGE_PHRASES)
    : dailyPhrase(MORNING_PHRASES);
  const eveningBody = c.eveningStarted && !c.eveningDone
    ? dailyPhrase(EVENING_NUDGE_PHRASES)
    : dailyPhrase(EVENING_PHRASES);

  const plans = [
    {
      enabled: reminders.morningEnabled,
      id: REMINDER_IDS.morning,
      title: "أثر — تذكير الصباح",
      body: morningBody,
      hhmm: reminders.morningTime,
      extra: { route: "/c/morning" },
      // Smart skip: if already completed today, don't nag again — schedule from tomorrow.
      skipToday: !!c.morningDone,
    },
    {
      enabled: reminders.eveningEnabled,
      id: REMINDER_IDS.evening,
      title: "أثر — تذكير المساء",
      body: eveningBody,
      hhmm: reminders.eveningTime,
      extra: { route: "/c/evening" },
      skipToday: !!c.eveningDone,
    },
    {
      enabled: reminders.dailyWirdEnabled,
      id: REMINDER_IDS.dailyWird,
      title: "أثر — وردك اليومي",
      body: dailyPhrase(DAILY_WIRD_PHRASES),
      hhmm: reminders.dailyWirdTime,
      extra: { route: "/quran" },
      skipToday: false,
    },
    {
      enabled: reminders.khatmaEnabled,
      id: REMINDER_IDS.khatma,
      title: "أثر — خطة الختمة",
      body: dailyPhrase(KHATMA_PHRASES),
      hhmm: reminders.khatmaTime,
      extra: { route: "/quran/plans" },
      skipToday: false,
    },
    {
      enabled: reminders.tasbeehEnabled,
      id: REMINDER_IDS.tasbeeh,
      title: "أثر — تسبيح واستغفار",
      body: dailyPhrase(TASBEEH_PHRASES),
      hhmm: reminders.tasbeehTime,
      extra: { route: "/sebha" },
      skipToday: false,
    },
  ];

  return plans.flatMap((plan) => {
    if (!plan.enabled) return [];
    const at = reminderAnchor(plan.hhmm, plan.skipToday);
    if (!at) return [];
    return [{
      id: plan.id,
      title: plan.title,
      body: plan.body,
      channelId: audio.channelId,
      sound: audio.soundFile,
      smallIcon: REMINDER_NOTIFICATION_ICON,
      largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
      iconColor: REMINDER_ICON_COLOR,
      extra: plan.extra,
      schedule: { at, repeats: true, every: "day" as const },
    }];
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

    // Same-day key at schedule-build time — the notification always fires the same
    // calendar day it's scheduled for (prayer times never cross midnight for "today").
    const extra = { prayerName, dateISO: getLocalDateKey(at) };

    // Main adhan notification
    const main = {
      id: PRAYER_NOTIFICATION_IDS[prayerName],
      title: "أثر — الأذان",
      body: `حان وقت صلاة ${PRAYER_LABELS[prayerName]}`,
      channelId: audio.channelId,
      sound: audio.soundFile,
      smallIcon: REMINDER_NOTIFICATION_ICON,
      largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
      iconColor: REMINDER_ICON_COLOR,
      schedule: { at },
      actionTypeId: PRAYER_ACTION_TYPE_ID,
      extra,
    };

    // N2: Gentle follow-up 30 min later — cancelled by setPrayerLogged when user logs the prayer
    const followUpAt = new Date(at.getTime() + 30 * 60_000);
    if (followUpAt.getTime() <= Date.now()) return [main];

    const followUp = {
      id: PRAYER_FOLLOWUP_IDS[prayerName],
      title: "أثر — تذكير لطيف",
      body: PRAYER_FOLLOWUP_PHRASES[prayerName],
      channelId: audio.channelId,
      sound: "default",
      smallIcon: REMINDER_NOTIFICATION_ICON,
      largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
      iconColor: REMINDER_ICON_COLOR,
      schedule: { at: followUpAt },
      actionTypeId: PRAYER_ACTION_TYPE_ID,
      extra,
    };

    return [main, followUp];
  });
}

// N4: Build Ramadan suhoor & iftar notifications from prayer timings
function buildRamadanNotifications(
  prayerTimings: PrayerNotificationTimings,
  audio: NotificationAudioConfig,
) {
  const notifications: LocalNotification[] = [];
  const fajrAt = todayAtLocalTime(prayerTimings.Fajr ?? "");
  if (fajrAt) {
    const suhoorAt = new Date(fajrAt.getTime() - 30 * 60_000);
    if (suhoorAt.getTime() > Date.now()) {
      notifications.push({
        id: RAMADAN_IDS.suhoor,
        title: "أثر — السحور",
        body: dailyPhrase(SUHOOR_PHRASES),
        channelId: audio.channelId,
        sound: audio.soundFile,
        smallIcon: REMINDER_NOTIFICATION_ICON,
        largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
        iconColor: REMINDER_ICON_COLOR,
        schedule: { at: suhoorAt },
      });
    }
  }

  // Iftar = Maghrib time
  const iftarAt = todayAtLocalTime(prayerTimings.Maghrib ?? "");
  if (iftarAt) {
    notifications.push({
      id: RAMADAN_IDS.iftar,
      title: "أثر — الإفطار",
      body: dailyPhrase(IFTAR_PHRASES),
      channelId: audio.channelId,
      sound: audio.soundFile,
      smallIcon: REMINDER_NOTIFICATION_ICON,
      largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
      iconColor: REMINDER_ICON_COLOR,
      schedule: { at: iftarAt },
    });
  }

  return notifications;
}

function notificationRefs(ids: readonly number[]) {
  return ids.map((id) => ({ id }));
}

/** Phase 10 — Build a daily hadith notification scheduled at Fajr time */
function buildDailyHadithNotification(
  prayerTimings: PrayerNotificationTimings,
  audio: NotificationAudioConfig,
): LocalNotification | null {
  const fajrAt = nextAtLocalTime(prayerTimings.Fajr ?? "");
  if (!fajrAt) return null;
  return {
    id: DAILY_HADITH_ID,
    title: "أثر — حديث اليوم ﷺ",
    body: dailyPhrase(DAILY_HADITH_FAJR_PHRASES),
    channelId: audio.channelId,
    sound: audio.soundFile,
    smallIcon: REMINDER_NOTIFICATION_ICON,
    largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
    iconColor: REMINDER_ICON_COLOR,
    schedule: { at: fajrAt, repeats: true, every: "day" as const },
  };
}

/**
 * iOS has no notification channels (createChannel rejects with "unimplemented"),
 * and its notification sounds must be bundled .caf/.wav files. Map our web sound
 * names to a .caf equivalent — if the file isn't bundled in the iOS app, the
 * system falls back to the default notification sound at delivery time.
 */
function toIosSoundFile(fileName: string): string {
  return fileName.replace(/\.(mp3|ogg)$/i, ".caf");
}

async function ensureReminderChannel(soundProfile: ReminderSoundProfile) {
  const sound = getReminderSoundOption(soundProfile);
  const channelId = getReminderChannelId(soundProfile);

  if (Capacitor.getPlatform() === "ios") {
    return { channelId, soundFile: toIosSoundFile(sound.fileName) };
  }

  const { LocalNotifications } = await import("@capacitor/local-notifications");

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
  const sound = getPrayerSoundOption(soundProfile);
  const channelId = getPrayerChannelId(soundProfile);

  if (Capacitor.getPlatform() === "ios") {
    return { channelId, soundFile: toIosSoundFile(sound.fileName) };
  }

  const { LocalNotifications } = await import("@capacitor/local-notifications");

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

/**
 * 11C: Pre-create the default notification channels at app startup so they
 * appear in Android Settings → Notifications before any reminder is scheduled.
 * Safe to call multiple times — Capacitor/Android is idempotent for channels.
 */
export async function ensureDefaultNotificationChannels(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await Promise.all([
      ensureReminderChannel("rain_calm"),
      ensurePrayerChannel("adhan_haram"),
      LocalNotifications.registerActionTypes({
        types: [
          {
            id: PRAYER_ACTION_TYPE_ID,
            actions: [{ id: MARK_PRAYED_ACTION_ID, title: "تمت الصلاة ✓" }],
          },
        ],
      }),
    ]);
  } catch { /* non-fatal */ }
}

export async function syncReminders(
  reminders: Reminders,
  prayerTimings?: PrayerNotificationTimings | null,
  completion?: ReminderCompletionInfo,
) {
  if (!Capacitor.isNativePlatform()) return;

  const { LocalNotifications } = await import("@capacitor/local-notifications");

  if (!reminders.enabled) {
    await cancelAllReminders();
    return;
  }

  const reminderIds = Object.values(REMINDER_IDS);
  const prayerIds = Object.values(PRAYER_NOTIFICATION_IDS);
  const followUpIds = Object.values(PRAYER_FOLLOWUP_IDS);
  const ramadanIds = Object.values(RAMADAN_IDS);
  const shouldRefreshPrayerNotifications = !reminders.prayerAlertsEnabled || !!prayerTimings;

  await LocalNotifications.cancel({
    notifications: notificationRefs([
      ...reminderIds,
      DAILY_HADITH_ID,
      ...(shouldRefreshPrayerNotifications ? [...prayerIds, ...followUpIds, ...ramadanIds] : []),
    ]),
  });

  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") {
    // Do not prompt here; caller controls prompting.
    return;
  }

  const notificationAudio = await ensureReminderChannel(reminders.soundProfile);

  const notifications: LocalNotification[] = buildReminderNotifications(reminders, notificationAudio, completion);

  if (reminders.prayerAlertsEnabled && prayerTimings) {
    const prayerNotificationAudio = await ensurePrayerChannel(reminders.prayerSoundProfile);
    notifications.push(...buildPrayerNotifications(
      prayerTimings,
      prayerNotificationAudio,
      { ...DEFAULT_PRAYER_ALERTS, ...reminders.prayerAlerts },
    ));

    // N4: Ramadan suhoor & iftar
    if (isRamadan()) {
      notifications.push(...buildRamadanNotifications(prayerTimings, prayerNotificationAudio));
    }

    // N5: Daily hadith at Fajr (Phase 10)
    if (reminders.dailyHadithNotif) {
      const n = buildDailyHadithNotification(prayerTimings, notificationAudio);
      if (n) notifications.push(n);
    }
  }

  if (!notifications.length) return;

  await LocalNotifications.schedule({ notifications });
}

/** 3C: Register a listener that navigates to the route embedded in a notification's extra.
 *  Returns a cleanup function (call it in a useEffect return). */
export async function registerNotificationDeepLinkListener(
  navigate: (path: string) => void,
): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const handle = await LocalNotifications.addListener(
    "localNotificationActionPerformed",
    (action) => {
      const extra = action.notification.extra as Record<string, unknown> | undefined;

      // N9: "تمت الصلاة" action button — log the prayer directly from the
      // notification shade without opening/navigating the app.
      if (action.actionId === MARK_PRAYED_ACTION_ID) {
        const prayerName = extra?.prayerName;
        const dateISO = extra?.dateISO;
        if (typeof prayerName === "string" && typeof dateISO === "string") {
          import("@/store/noorStore").then(({ useNoorStore }) => {
            useNoorStore.getState().setPrayerLogged(dateISO, prayerName, true);
          });
        }
        return;
      }

      const route = extra?.route;
      if (typeof route === "string" && route.startsWith("/")) {
        navigate(route);
      }
    },
  );
  return () => { handle.remove(); };
}
