import { Capacitor } from "@capacitor/core";
import { getInternalAppRoute } from "@/lib/internalAppRoute";
import type { LocalNotification, Schedule } from "@capacitor/local-notifications";
import { getCustomReminderSnoozeMinutes } from "@/lib/customReminderTypes";
import { withAndroidDozeDelivery } from "@/lib/nativeNotificationSchedule";
import { rememberThemeForFirstPaint } from "@/lib/themeBootstrap";
import { parseWebReminderClickDetail } from "@/lib/webReminderActions";
import type { PrayerAlertPreferences, PrayerSoundProfile, ReminderSoundProfile, Reminders } from "@/store/noorStore";
import { useNoorStore } from "@/store/noorStore";
import { getLocalDateKey, parseDateKey, shiftDateKey } from "@/lib/dayBoundaries";
import {
  PRAYER_ACTION_TYPE_ID,
  REMINDER_ACTION_TYPE_ID,
  registerNotificationActionTypes,
} from "@/lib/notificationActionTypes";
import {
  beginAccountStorageOwnerTransition,
  completeAccountStorageOwnerTransition,
  getAccountStorageOwner,
  type AccountStorageOwner,
} from "@/lib/accountStorageScope";

/** Pass A: gate every preview sound in this module on `prefs.enableSounds`.
 * Returning early keeps audio playback out of the audio graph entirely when
 * the user has explicitly muted athar. Used by the Settings page so toggling
 * off "تشغيل الأصوات التنبيهية" stops the previews without separate UI. */
function isAudioEnabled(): boolean {
  try {
    return useNoorStore.getState().prefs.enableSounds === true;
  } catch {
    return false;
  }
}

// N9: Actionable prayer notifications — "تمت الصلاة" lets the user log a prayer
// (and cancel its gentle follow-up) directly from the notification shade.
const MARK_PRAYED_ACTION_ID = "mark_prayed";

// N10: "ذكرني بعد ساعة" on the daily habit reminders (morning/evening adhkar, daily
// wird, khatma, tasbeeh) — reschedules a one-off copy 60 minutes later without
// touching the recurring daily schedule those IDs already own.
const SNOOZE_ACTION_ID = "snooze_60";
const SNOOZE_MINUTES = 60;

const REMINDER_IDS = {
  morning: 9101,
  evening: 9102,
  dailyWird: 9103,
  khatma: 9104,
  tasbeeh: 9105
} as const;

// One-off snooze instances get their own IDs so re-scheduling them never collides
// with (or disturbs) the recurring daily notification under REMINDER_IDS.
const REMINDER_SNOOZE_IDS = {
  morning: 9111,
  evening: 9112,
  dailyWird: 9113,
  khatma: 9114,
  tasbeeh: 9115
} as const;
type ReminderKey = keyof typeof REMINDER_IDS;

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
const NOTIFICATION_DATE_SLOT_OFFSET = 10;

// 40 brief excerpts from Nawawi's 40 Hadiths (rotate daily). Exported so
// other real-source callers (e.g. the companion's weekly reflection) can
// reuse the same grounded, non-AI-generated set instead of duplicating it.
export const DAILY_HADITH_FAJR_PHRASES = [
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

function notificationDateSlot(dateISO: string): number {
  const date = parseDateKey(dateISO);
  if (!date || getLocalDateKey(date) !== dateISO) return 0;
  const dayOrdinal = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return dayOrdinal % 2;
}

function notificationIdForDate(baseId: number, dateISO: string): number {
  return baseId + notificationDateSlot(dateISO) * NOTIFICATION_DATE_SLOT_OFFSET;
}

function notificationIdsForBothDateSlots(ids: readonly number[]): number[] {
  return [0, 1].flatMap((slot) => ids.map((id) => id + slot * NOTIFICATION_DATE_SLOT_OFFSET));
}

function dateSlotIdForAction(baseId: number, dateISO?: string): number | null {
  const today = getLocalDateKey();
  const targetDate = dateISO ?? today;
  if (targetDate !== today && targetDate !== shiftDateKey(today, 1)) return null;
  return notificationIdForDate(baseId, targetDate);
}

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

/** Returns true when the Gregorian date falls in Ramadan (Hijri month 9). */
export function isRamadan(date = new Date()): boolean {
  try {
    const fmt = new Intl.DateTimeFormat("en-u-ca-islamic", { month: "numeric" });
    const parts = fmt.formatToParts(date);
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
    id: "birds",
    label: "أصوات الطيور",
    description: "",
    fileName: "birds.mp3",
  },
];

export const PRAYER_SOUND_OPTIONS: Array<{
  id: PrayerSoundProfile;
  label: string;
  description: string;
  fileName: string;
}> = [
  {
    id: "adhan_ahmad_al_nafees",
    label: "أحمد النفيس",
    description: "",
    fileName: "adhan_ahmad_al_nafees.mp3",
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

  if (!isAudioEnabled()) {
    onDone?.();
    return;
  }

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
  if (at.getTime() <= now.getTime() + 30_000) at.setDate(at.getDate() + 1);
  return at;
}

function dateAtLocalTime(dateISO: string, hhmm: string): Date | null {
  const hm = parseHHMM(hhmm);
  const at = parseDateKey(dateISO);
  if (!hm || !at || getLocalDateKey(at) !== dateISO) return null;
  at.setHours(hm.hour, hm.minute, 0, 0);
  return getLocalDateKey(at) === dateISO ? at : null;
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
      // N10: pending snoozes
      { id: REMINDER_SNOOZE_IDS.morning },
      { id: REMINDER_SNOOZE_IDS.evening },
      { id: REMINDER_SNOOZE_IDS.dailyWird },
      { id: REMINDER_SNOOZE_IDS.khatma },
      { id: REMINDER_SNOOZE_IDS.tasbeeh },
      ...notificationRefs(notificationIdsForBothDateSlots(Object.values(PRAYER_NOTIFICATION_IDS))),
      ...notificationRefs(notificationIdsForBothDateSlots(Object.values(PRAYER_FOLLOWUP_IDS))),
      ...notificationRefs(notificationIdsForBothDateSlots(Object.values(RAMADAN_IDS))),
      ...notificationRefs(notificationIdsForBothDateSlots([DAILY_HADITH_ID])),
    ]
  });
}

/** N2: Cancel the gentle follow-up for a specific prayer (call when user logs the prayer). */
export async function cancelPrayerFollowUp(prayerName: string, dateISO?: string) {
  if (!Capacitor.isNativePlatform()) return;
  const baseId = PRAYER_FOLLOWUP_IDS[prayerName as PrayerTimingName];
  const id = baseId ? dateSlotIdForAction(baseId, dateISO) : null;
  if (id === null) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch {
    // ignore
  }
}

type NotificationAudioConfig = {
  channelId: string;
  soundFile?: string;
};

function notificationSound(soundFile: string | undefined): { sound?: string } {
  return soundFile === undefined ? {} : { sound: soundFile };
}

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

  const plans: Array<{
    enabled: boolean; id: number; key: ReminderKey; title: string; body: string;
    hhmm: string; extra: Record<string, string>; skipToday: boolean;
  }> = [
    {
      enabled: reminders.morningEnabled,
      id: REMINDER_IDS.morning,
      key: "morning",
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
      key: "evening",
      title: "أثر — تذكير المساء",
      body: eveningBody,
      hhmm: reminders.eveningTime,
      extra: { route: "/c/evening" },
      skipToday: !!c.eveningDone,
    },
    {
      enabled: reminders.dailyWirdEnabled,
      id: REMINDER_IDS.dailyWird,
      key: "dailyWird",
      title: "أثر — وردك اليومي",
      body: dailyPhrase(DAILY_WIRD_PHRASES),
      hhmm: reminders.dailyWirdTime,
      extra: { route: "/quran" },
      skipToday: false,
    },
    {
      enabled: reminders.khatmaEnabled,
      id: REMINDER_IDS.khatma,
      key: "khatma",
      title: "أثر — خطة الختمة",
      body: dailyPhrase(KHATMA_PHRASES),
      hhmm: reminders.khatmaTime,
      extra: { route: "/quran/plans" },
      skipToday: false,
    },
    {
      enabled: reminders.tasbeehEnabled,
      id: REMINDER_IDS.tasbeeh,
      key: "tasbeeh",
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
    const reminderTime = parseHHMM(plan.hhmm);
    if (!reminderTime) return [];
    const configuredReminderTime = `${String(reminderTime.hour).padStart(2, "0")}:${String(reminderTime.minute).padStart(2, "0")}`;
    const schedule: Schedule = plan.skipToday
      ? Capacitor.getPlatform() === "ios"
        ? { at }
        : { at, repeats: true, every: "day" }
      : { on: { ...reminderTime, second: 0 } };
    return [{
      id: plan.id,
      title: plan.title,
      body: plan.body,
      channelId: audio.channelId,
      ...notificationSound(audio.soundFile),
      actionTypeId: REMINDER_ACTION_TYPE_ID,
      extra: {
        ...plan.extra,
        reminderKey: plan.key,
        reminderTime: configuredReminderTime,
        title: plan.title,
        body: plan.body,
      },
      smallIcon: REMINDER_NOTIFICATION_ICON,
      largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
      iconColor: REMINDER_ICON_COLOR,
      // Calendar triggers keep the reminder at the same local wall-clock time
      // across boots and daylight-saving changes. iOS interprets `at + repeats`
      // as an interval, so a completed-today deferral is one-shot there; the
      // next foreground sync restores its calendar-based daily recurrence.
      schedule: withAndroidDozeDelivery(schedule),
    }];
  });
}

type PrayerNotificationDay = { dateISO: string; timings: PrayerNotificationTimings };

export function buildPrayerNotificationsForDays(
  days: PrayerNotificationDay[],
  audio: NotificationAudioConfig,
  enabledPrayers: PrayerAlertPreferences,
  quiet: NotificationAudioConfig,
  options: { includeDailyHadith?: boolean; now?: Date } = {},
): LocalNotification[] {
  const now = options.now ?? new Date();
  return days.slice(0, 2).flatMap((day) => {
    const dayStart = parseDateKey(day.dateISO);
    if (!dayStart || getLocalDateKey(dayStart) !== day.dateISO) return [];

    const notifications: LocalNotification[] = (Object.keys(PRAYER_NOTIFICATION_IDS) as PrayerTimingName[]).flatMap((prayerName) => {
      if (!enabledPrayers[prayerName]) return [];

      const at = dateAtLocalTime(day.dateISO, day.timings[prayerName] ?? "");
      if (!at || at.getTime() <= now.getTime() + 30_000) return [];

      const extra = { prayerName, dateISO: day.dateISO };
      const main = {
        id: notificationIdForDate(PRAYER_NOTIFICATION_IDS[prayerName], day.dateISO),
        title: "أثر — الأذان",
        body: `حان وقت صلاة ${PRAYER_LABELS[prayerName]}`,
        channelId: audio.channelId,
        ...notificationSound(audio.soundFile),
        smallIcon: REMINDER_NOTIFICATION_ICON,
        largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
        iconColor: REMINDER_ICON_COLOR,
        schedule: withAndroidDozeDelivery({ at }),
        actionTypeId: PRAYER_ACTION_TYPE_ID,
        extra,
      };

      // Vibration only. The adhan belongs to the adhan; hearing it again half an
      // hour later, as a nudge, is startling rather than helpful.
      const followUpAt = new Date(at.getTime() + 30 * 60_000);
      const followUp = {
        id: notificationIdForDate(PRAYER_FOLLOWUP_IDS[prayerName], day.dateISO),
        title: "أثر — تذكير لطيف",
        body: PRAYER_FOLLOWUP_PHRASES[prayerName],
        channelId: quiet.channelId,
        ...notificationSound(quiet.soundFile),
        smallIcon: REMINDER_NOTIFICATION_ICON,
        largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
        iconColor: REMINDER_ICON_COLOR,
        schedule: withAndroidDozeDelivery({ at: followUpAt }),
        actionTypeId: PRAYER_ACTION_TYPE_ID,
        extra,
      };

      return [main, followUp];
    });

    if (isRamadan(dayStart)) notifications.push(...buildRamadanNotifications(
      day, audio, now, enabledPrayers.Maghrib ? quiet : audio,
    ));
    if (options.includeDailyHadith) {
      const hadith = buildDailyHadithNotification(day, quiet, now);
      if (hadith) notifications.push(hadith);
    }
    return notifications;
  });
}

// N4: Build Ramadan suhoor & iftar notifications from date-specific timings.
function buildRamadanNotifications(
  day: PrayerNotificationDay,
  audio: NotificationAudioConfig,
  now: Date,
  iftarAudio: NotificationAudioConfig,
) {
  const notifications: LocalNotification[] = [];
  const fajrAt = dateAtLocalTime(day.dateISO, day.timings.Fajr ?? "");
  if (fajrAt) {
    const suhoorAt = new Date(fajrAt.getTime() - 30 * 60_000);
    if (suhoorAt.getTime() > now.getTime() + 30_000) {
      notifications.push({
        id: notificationIdForDate(RAMADAN_IDS.suhoor, day.dateISO),
        title: "أثر — السحور",
        body: dailyPhrase(SUHOOR_PHRASES),
        channelId: audio.channelId,
        ...notificationSound(audio.soundFile),
        smallIcon: REMINDER_NOTIFICATION_ICON,
        largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
        iconColor: REMINDER_ICON_COLOR,
        schedule: withAndroidDozeDelivery({ at: suhoorAt }),
        extra: { dateISO: day.dateISO },
      });
    }
  }

  const iftarAt = dateAtLocalTime(day.dateISO, day.timings.Maghrib ?? "");
  if (iftarAt && iftarAt.getTime() > now.getTime() + 30_000) {
    notifications.push({
      id: notificationIdForDate(RAMADAN_IDS.iftar, day.dateISO),
      title: "أثر — الإفطار",
      body: dailyPhrase(IFTAR_PHRASES),
      channelId: iftarAudio.channelId,
      ...notificationSound(iftarAudio.soundFile),
      smallIcon: REMINDER_NOTIFICATION_ICON,
      largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
      iconColor: REMINDER_ICON_COLOR,
      schedule: withAndroidDozeDelivery({ at: iftarAt }),
      extra: { dateISO: day.dateISO },
    });
  }

  return notifications;
}

function notificationRefs(ids: readonly number[]) {
  return ids.map((id) => ({ id }));
}

/** Phase 10 — Build a daily hadith notification scheduled at Fajr time */
function buildDailyHadithNotification(
  day: PrayerNotificationDay,
  audio: NotificationAudioConfig,
  now: Date,
): LocalNotification | null {
  const fajrAt = dateAtLocalTime(day.dateISO, day.timings.Fajr ?? "");
  if (!fajrAt || fajrAt.getTime() <= now.getTime() + 30_000) return null;
  return {
    id: notificationIdForDate(DAILY_HADITH_ID, day.dateISO),
    title: "أثر — حديث اليوم ﷺ",
    body: dailyPhrase(DAILY_HADITH_FAJR_PHRASES),
    channelId: audio.channelId,
    ...notificationSound(audio.soundFile),
    smallIcon: REMINDER_NOTIFICATION_ICON,
    largeIcon: REMINDER_NOTIFICATION_LARGE_ICON,
    iconColor: REMINDER_ICON_COLOR,
    schedule: withAndroidDozeDelivery({ at: fajrAt }),
    extra: { dateISO: day.dateISO },
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
 * The quiet channel: vibrates, never makes a sound.
 *
 * On Android 8+ the CHANNEL owns the sound, not the notification — setting
 * `sound: "default"` on an individual notification does nothing if its channel
 * carries the adhan. That is why the gentle "did you pray?" follow-up, half an
 * hour after the prayer, was playing the full adhan a second time.
 *
 * Importance is DEFAULT rather than HIGH: these are nudges, so they should
 * arrive without a heads-up banner interrupting whatever is on screen.
 */
/**
 * v2 because channels are immutable once created: v1 was made through
 * @capacitor/local-notifications, which leaves a soundless channel on the
 * SYSTEM DEFAULT sound rather than on silence. Editing it would have done
 * nothing on any device that already had it.
 */
export const SILENT_CHANNEL_ID = "athar-quiet-v2";

export async function ensureSilentChannel(vibration = true): Promise<NotificationAudioConfig> {
  const channelId = vibration ? SILENT_CHANNEL_ID : "athar-quiet-no-vibration-v1";
  // iOS has no channels; omitting the sound field keeps these notifications silent.
  if (Capacitor.getPlatform() !== "android") {
    return { channelId };
  }

  // Deliberately NOT LocalNotifications.createChannel — see QuietChannelPlugin.
  // It only calls setSound() when a sound was named, so "no sound" comes out as
  // the default notification ping. Genuine silence needs setSound(null, null),
  // and vibration needs importance >= DEFAULT, which only native code can set
  // together.
  try {
    const { registerPlugin } = await import("@capacitor/core");
    const QuietChannel = registerPlugin<{
      create(o: { id: string; name: string; description: string; vibration: boolean }): Promise<void>;
    }>("QuietChannel");
    await QuietChannel.create({
      id: channelId,
      name: "Athar — تذكيرات صامتة",
      description: "تذكيرات بالاهتزاز فقط، بدون صوت — للمتابعة بعد الصلاة والأذكار",
      vibration,
    });
  } catch {
    /* An older build without the plugin: the notification still arrives. */
  }

  return { channelId, soundFile: "" };
}

/**
 * 11C: Pre-create the default notification channels at app startup so they
 * appear in Android Settings → Notifications before any reminder is scheduled.
 * Safe to call multiple times — Capacitor/Android is idempotent for channels.
 */
export async function ensureDefaultNotificationChannels(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Promise.all([
      ensureReminderChannel("birds"),
      ensurePrayerChannel("adhan_ahmad_al_nafees"),
      ensureSilentChannel(),
      registerNotificationActionTypes(),
    ]);
  } catch { /* non-fatal */ }
}

let reminderSyncQueue: Promise<void> = Promise.resolve();
let accountReminderTransitionInProgress = false;
let notificationActionScopeVersion = 0;
let lastReminderOwnerRequestAtMs = 0;

function nextReminderOwnerRequestAtMs(): number {
  lastReminderOwnerRequestAtMs = Math.max(Date.now(), lastReminderOwnerRequestAtMs + 1);
  return lastReminderOwnerRequestAtMs;
}
const LAST_REMINDER_OWNER_STORAGE_KEY = "athar:reminder-owner";

function getLastReminderOwner(): AccountStorageOwner | null {
  try {
    if (typeof globalThis.localStorage === "undefined") return null;
    const owner = globalThis.localStorage.getItem(LAST_REMINDER_OWNER_STORAGE_KEY);
    if (owner === "local" || (owner?.startsWith("user:") && owner.length > "user:".length)) {
      return owner as AccountStorageOwner;
    }
  } catch {
    // Unknown ownership is handled conservatively by clearing delivered alerts.
  }
  return null;
}

function rememberReminderOwner(owner: AccountStorageOwner): void {
  try {
    if (typeof globalThis.localStorage !== "undefined") {
      globalThis.localStorage.setItem(LAST_REMINDER_OWNER_STORAGE_KEY, owner);
    }
  } catch {
    // If unavailable, the next launch will perform the conservative cleanup again.
  }
}

function enqueueReminderOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = reminderSyncQueue.then(operation);
  reminderSyncQueue = result.then(() => undefined, () => undefined);
  return result;
}

/** Invalidate actions from the outgoing account before its alarms are removed. */
export function beginAccountReminderTransition(): void {
  beginAccountStorageOwnerTransition();
  accountReminderTransitionInProgress = true;
  notificationActionScopeVersion += 1;
}

/** Cancel built-in OS alarms after earlier schedule operations have settled. */
export function cancelRemindersForAccountSwitch(
  targetOwner: AccountStorageOwner = getAccountStorageOwner(),
  stillCurrent: () => boolean | Promise<boolean> = () => true,
  requestedAtMs = nextReminderOwnerRequestAtMs(),
): Promise<void> {
  return enqueueReminderOperation(async () => {
    if (!await stillCurrent()) return;
    const clearDelivered = getLastReminderOwner() !== targetOwner;
    if (Capacitor.isNativePlatform()) {
      await cancelAllReminders();
      if (clearDelivered) {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        await LocalNotifications.removeAllDeliveredNotifications();
      }
    }
    const { cancelAllCustomNotifications } = await import("@/lib/customReminderNotifications");
    await cancelAllCustomNotifications({
      clearDelivered: clearDelivered && !Capacitor.isNativePlatform(),
      targetOwner,
      sourceOwner: getLastReminderOwner() ?? getAccountStorageOwner(),
      requestedAtMs,
      stillCurrent,
    });
    if (!await stillCurrent()) return;
    // The worker has now committed this owner. Record it before account
    // hydration so a second account change can start from the settled owner
    // even if this React effect is interrupted between cleanup and hydration.
    rememberReminderOwner(targetOwner);
  });
}

/** Allow the hydrated account's AppContent to schedule its own reminders. */
export function completeAccountReminderTransition(owner?: AccountStorageOwner): void {
  if (owner) rememberReminderOwner(owner);
  completeAccountStorageOwnerTransition();
  accountReminderTransitionInProgress = false;
  if (owner) rememberThemeForFirstPaint(useNoorStore.getState().prefs.theme);
}

export function syncReminders(
  reminders: Reminders,
  prayerTimings?: PrayerNotificationTimings | null,
  completion?: ReminderCompletionInfo,
  tomorrowPrayerTimings?: PrayerNotificationTimings | null,
): Promise<void> {
  const owner = getAccountStorageOwner();
  return enqueueReminderOperation(async () => {
    if (accountReminderTransitionInProgress) return;
    await syncRemindersForOwner(
      owner,
      reminders,
      prayerTimings,
      completion,
      tomorrowPrayerTimings,
    );
  });
}

/** Whether a notification belongs to the active scope and may affect its UI. */
export function notificationActionMatchesActiveAccount(extra?: Record<string, unknown>): boolean {
  if (accountReminderTransitionInProgress) return false;
  const activeOwner = getAccountStorageOwner();
  const notificationOwner = extra?.accountOwner;
  if (typeof notificationOwner === "string") return notificationOwner === activeOwner;
  return activeOwner === "local";
}

/** Validate an alert's deep link and account before it can navigate. */
export function getAccountScopedNotificationRoute(
  extra?: Record<string, unknown>,
  route?: unknown,
): string | null {
  if (!notificationActionMatchesActiveAccount(extra)) return null;
  return getInternalAppRoute(typeof route === "string" ? route : extra?.route);
}

async function syncRemindersForOwner(
  owner: ReturnType<typeof getAccountStorageOwner>,
  reminders: Reminders,
  prayerTimings?: PrayerNotificationTimings | null,
  completion?: ReminderCompletionInfo,
  tomorrowPrayerTimings?: PrayerNotificationTimings | null,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const { LocalNotifications } = await import("@capacitor/local-notifications");
  if (getAccountStorageOwner() !== owner) return;

  if (!reminders.enabled) {
    await cancelAllReminders();
    return;
  }

  const reminderIds = Object.values(REMINDER_IDS);
  const prayerIds = notificationIdsForBothDateSlots(Object.values(PRAYER_NOTIFICATION_IDS));
  const followUpIds = notificationIdsForBothDateSlots(Object.values(PRAYER_FOLLOWUP_IDS));
  const ramadanIds = notificationIdsForBothDateSlots(Object.values(RAMADAN_IDS));
  const shouldRefreshPrayerNotifications = !reminders.prayerAlertsEnabled || !!prayerTimings;

  await LocalNotifications.cancel({
    notifications: notificationRefs([
      ...reminderIds,
      ...notificationIdsForBothDateSlots([DAILY_HADITH_ID]),
      ...(shouldRefreshPrayerNotifications ? [...prayerIds, ...followUpIds, ...ramadanIds] : []),
    ]),
  });
  if (getAccountStorageOwner() !== owner) return;

  const perm = await LocalNotifications.checkPermissions();
  if (getAccountStorageOwner() !== owner) return;
  if (perm.display !== "granted") {
    // Do not prompt here; caller controls prompting.
    return;
  }

  // Each daily occurrence starts with birds; prayer alerts start with the Adhan.
  // Follow-ups and snoozes use a separate silent channel.
  const quiet = await ensureSilentChannel();
  if (getAccountStorageOwner() !== owner) return;
  const reminderAudio = await ensureReminderChannel(reminders.soundProfile);
  if (getAccountStorageOwner() !== owner) return;
  const notifications: LocalNotification[] = buildReminderNotifications(reminders, reminderAudio, completion);

  if (reminders.prayerAlertsEnabled && prayerTimings) {
    const prayerNotificationAudio = await ensurePrayerChannel(reminders.prayerSoundProfile);
    if (getAccountStorageOwner() !== owner) return;
    const todayISO = getLocalDateKey();
    const scheduleDays: PrayerNotificationDay[] = [
      { dateISO: todayISO, timings: prayerTimings },
      ...(tomorrowPrayerTimings ? [{ dateISO: shiftDateKey(todayISO, 1), timings: tomorrowPrayerTimings }] : []),
    ];
    notifications.push(...buildPrayerNotificationsForDays(
      scheduleDays,
      prayerNotificationAudio,
      { ...DEFAULT_PRAYER_ALERTS, ...reminders.prayerAlerts },
      quiet,
      { includeDailyHadith: reminders.dailyHadithNotif },
    ));
  }

  if (!notifications.length) return;
  if (getAccountStorageOwner() !== owner) return;

  await LocalNotifications.schedule({
    notifications: notifications.map((notification) => ({
      ...notification,
      extra: { ...notification.extra, accountOwner: owner },
    })),
  });
}

/** 3C: Register a listener that navigates to the route embedded in a notification's extra.
 *  Returns a cleanup function (call it in a useEffect return). */
export async function registerNotificationDeepLinkListener(
  navigate: (path: string) => void,
): Promise<() => void> {
  let cleanup: () => void = () => {};
  if (Capacitor.isNativePlatform()) {
    const handleAction = (action: PendingAction) => {
      const extra = action.extra;

      // N9: "تمت الصلاة" action button — log the prayer directly from the
      // notification shade without opening/navigating the app.
      if (action.actionId === MARK_PRAYED_ACTION_ID) {
        void applyNotificationAction(action);
        return;
      }

      // N10: "ذكرني بعد ساعة" — reschedule a one-off copy under this reminder's
      // dedicated snooze ID, without touching the recurring daily schedule.
      if (action.actionId === SNOOZE_ACTION_ID) {
        void applyNotificationAction(action);
        return;
      }

      // Custom (user- and AI-created) reminders carry their own action set —
      // see CUSTOM_REMINDER_ACTION_TYPE_ID in customReminderNotifications.ts.
      if (action.actionId === "snooze" || action.actionId === "done") {
        void applyNotificationAction(action);
        return;
      }

      // "open" and a plain body tap both land here.
      const route = getAccountScopedNotificationRoute(extra);
      if (route) navigate(route);
    };

    // main.tsx owns the single early Capacitor listener. This effect only
    // supplies the router-aware handler, so a warm tap cannot be received by
    // both a buffering listener and a live listener.
    nativeNotificationActionHandler = handleAction;
    cleanup = () => {
      if (nativeNotificationActionHandler === handleAction) nativeNotificationActionHandler = null;
    };
  } else if (typeof navigator !== "undefined" && navigator.serviceWorker) {
    const onMessage = (event: MessageEvent) => {
      if (!event.data || event.data.type !== "athar-reminder-click") return;
      const detail = parseWebReminderClickDetail(event.data.detail);
      if (!detail) return;
      const pending: PendingAction = {
        actionId: detail.action,
        route: detail.route,
        extra: detail,
        notification: { title: detail.title, body: detail.body },
      };
      if (detail.action === "open") {
        const route = getAccountScopedNotificationRoute(detail, detail.route);
        if (route) navigate(route);
      } else {
        void applyNotificationAction(pending);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    cleanup = () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }

  // Drain anything that fired before this listener existed — on a cold start
  // the tap launches the app, and the plugin emits while the WebView is still
  // booting, so without this the very taps that opened the app were dropped
  // and the user just landed on the home screen. See consumePendingAction.
  const pending = consumePendingNotificationAction();
  if (pending) {
    // Apply BEFORE navigating: this is the cold-start path, and it used to
    // read only the route — the whole reason tapping "اتممت الصلاة" on a
    // closed app recorded nothing.
    await applyNotificationAction(pending);
    const actionHandledWithoutNavigation = [MARK_PRAYED_ACTION_ID, SNOOZE_ACTION_ID, "snooze", "done"]
      .includes(pending.actionId ?? "");
    const route = getAccountScopedNotificationRoute(pending.extra, pending.route);
    if (!actionHandledWithoutNavigation && route) navigate(route);
  }

  return cleanup;
}

/**
 * Apply the side effect requested by a notification action.
 *
 * This is the difference between the buttons looking right and them working.
 * Both live taps and cold-start taps funnel through here, because a prayer
 * notification is almost always tapped with the app CLOSED — and the cold-start
 * path used to read only `route` from the buffered action and throw the
 * actionId away, so "اتممت الصلاة" opened the app and recorded nothing.
 *
 * Safe to call before React mounts: the store persists to localStorage, which
 * zustand rehydrates synchronously as the module loads, so this cannot be
 * clobbered by a later hydration.
 */
export async function applyNotificationAction(pending: PendingAction): Promise<boolean> {
  const { actionId, extra, route } = pending;
  if (!actionId) return false;
  if (!notificationActionMatchesActiveAccount(extra)) return false;
  const activeOwner = getAccountStorageOwner();
  const actionScopeVersion = notificationActionScopeVersion;
  const actionIsCurrent = () =>
    notificationActionScopeVersion === actionScopeVersion &&
    getAccountStorageOwner() === activeOwner &&
    notificationActionMatchesActiveAccount(extra);

  if (actionId === SNOOZE_ACTION_ID) {
    const reminderKey = extra?.reminderKey;
    if (
      typeof reminderKey !== "string" ||
      !Object.prototype.hasOwnProperty.call(REMINDER_SNOOZE_IDS, reminderKey)
    ) return false;

    const notification = pending.notification;
    const extraText = (key: "title" | "body") => typeof extra?.[key] === "string" ? extra[key] as string : undefined;
    let scheduled = false;
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      if (!actionIsCurrent()) return false;
      const quiet = await ensureSilentChannel();
      if (!actionIsCurrent()) return false;
      const snoozeId = REMINDER_SNOOZE_IDS[reminderKey as ReminderKey];
      await enqueueReminderOperation(async () => {
        if (!actionIsCurrent()) return;
        await LocalNotifications.schedule({
          notifications: [{
            id: snoozeId,
            title: notification?.title ?? extraText("title") ?? "أثر",
            body: notification?.body ?? extraText("body") ?? "",
            channelId: quiet.channelId,
            ...notificationSound(quiet.soundFile),
            smallIcon: notification?.smallIcon,
            largeIcon: notification?.largeIcon,
            iconColor: notification?.iconColor,
            actionTypeId: REMINDER_ACTION_TYPE_ID,
            extra: { ...extra, accountOwner: activeOwner },
            schedule: withAndroidDozeDelivery({ at: new Date(Date.now() + SNOOZE_MINUTES * 60_000) }),
          }],
        });
        if (!actionIsCurrent()) {
          await LocalNotifications.cancel({ notifications: [{ id: snoozeId }] });
        } else {
          scheduled = true;
        }
      });
    } catch {
      // Notification scheduling is best-effort on devices without permission.
      return false;
    }
    return scheduled && actionIsCurrent();
  }

  if (actionId === "snooze") {
    const reminderId = extra?.reminderId;
    if (typeof reminderId !== "string") return false;
    const snoozeMinutes = getCustomReminderSnoozeMinutes(extra?.snoozeMinutes);
    const title = pending.notification?.title ?? (typeof extra?.title === "string" ? extra.title : "أثر");
    const body = pending.notification?.body ?? (typeof extra?.body === "string" ? extra.body : "");
    const reminder = {
      id: reminderId,
      category: "custom",
      title,
      description: body,
      notification: { snoozeMinutes, vibration: extra?.vibration !== false },
      deeplink: typeof extra?.route === "string" ? { route: extra.route } : undefined,
    };
    try {
      const { scheduleCustomNotification, cancelCustomNotification, scheduleIdFor } = await import("@/lib/customReminderNotifications");
      if (!actionIsCurrent()) return false;
      const fireAt = new Date(Date.now() + snoozeMinutes * 60_000);
      const scheduleId = scheduleIdFor(reminder.id, fireAt.getTime(), activeOwner);
      await scheduleCustomNotification(
        reminder as unknown as Parameters<typeof scheduleCustomNotification>[0],
        fireAt,
        body,
        activeOwner,
        { requireDelivery: true, silent: true },
      );
      if (!actionIsCurrent()) {
        await cancelCustomNotification(scheduleId);
        return false;
      }
      return true;
    } catch {
      // Notification scheduling is best-effort on devices without permission.
      return false;
    }
  }

  const { useNoorStore } = await import("@/store/noorStore");
  if (!actionIsCurrent()) return false;

  if (actionId === MARK_PRAYED_ACTION_ID) {
    const prayerName = extra?.prayerName;
    const dateISO = extra?.dateISO;
    if (typeof prayerName === "string" && typeof dateISO === "string") {
      useNoorStore.getState().setPrayerLogged(dateISO, prayerName, true);
      return true;
    }
    return false;
  }

  if (actionId === "done") {
    // "تم" on an adhkar reminder now writes to the completion ledger that
    // Insights and the streak read, instead of only dismissing the shade.
    // The reminder's own deep link tells us WHICH adhkar section it was.
    const target = typeof route === "string" ? route : typeof extra?.route === "string" ? extra.route : "";
    const match = /^\/c\/([A-Za-z0-9_-]+)/.exec(target);
    if (match?.[1]) {
      useNoorStore.getState().recordSectionCompletion(match[1]);
      return true;
    }
    return false;
  }

  return false;
}

/**
 * Buffer for a notification action that arrives before the React listener is
 * mounted. Set by the early bootstrap in main.tsx, drained above.
 */
type PendingAction = {
  actionId?: string;
  route?: string;
  extra?: Record<string, unknown>;
  notification?: Partial<LocalNotification>;
};
let pendingNotificationAction: PendingAction | null = null;
let nativeNotificationActionHandler: ((action: PendingAction) => void) | null = null;

export function setPendingNotificationAction(a: PendingAction): void {
  pendingNotificationAction = a;
}

/** Deliver a native action once the router handler exists, otherwise buffer it for cold start. */
export function dispatchNativeNotificationAction(a: PendingAction): void {
  if (nativeNotificationActionHandler) {
    nativeNotificationActionHandler(a);
    return;
  }
  setPendingNotificationAction(a);
}

export function consumePendingNotificationAction(): PendingAction | null {
  const a = pendingNotificationAction;
  pendingNotificationAction = null;
  return a;
}
