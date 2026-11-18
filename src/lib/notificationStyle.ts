/**
 * How Athar's notifications read and look.
 *
 * The phone already names the app above every notification, so the title is
 * the thing itself («صلاة الفجر», «أذكار الصباح»), never «أثر — …». The
 * Adhan carries a line from the Adhan and the prayer's time. Each kind has its
 * own group: Android names it next to the app («أثر • الصلاة») and keeps
 * Athar's notifications together; iPhone stacks them by thread. The Adhan is
 * time-sensitive on iPhone, so a Focus mode does not silence it.
 */
import type { LocalNotificationSchema } from "@capacitor/local-notifications";

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/** "04:32" → "٤:٣٢ ص"; "19:05" → "٧:٠٥ م". The native top-ups format the same way. */
export function notificationTime(hhmm: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!match) return "";
  const hour = Number(match[1]);
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  const digits = `${twelve}:${match[2]}`.replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);
  return `${digits} ${hour < 12 ? "ص" : "م"}`;
}

/** Filled in by the app, and by the phone for the days it queues itself. */
export const TIME_PLACEHOLDER = "{time}";

export function fillTime(text: string, hhmm: string): string {
  return text.split(TIME_PLACEHOLDER).join(notificationTime(hhmm));
}

export type NotificationKind = "prayer" | "adhkar" | "quran" | "ramadan" | "hadith";

const KIND_STYLE: Record<NotificationKind, { group: string; summary: string }> = {
  prayer: { group: "athar-prayer", summary: "الصلاة" },
  adhkar: { group: "athar-adhkar", summary: "الأذكار" },
  quran: { group: "athar-quran", summary: "القرآن" },
  ramadan: { group: "athar-ramadan", summary: "رمضان" },
  hadith: { group: "athar-hadith", summary: "الحديث" },
};

/**
 * The fields that make a notification look like Athar's: its group and
 * header label, the full text when expanded, a public lock-screen view, and,
 * for the Adhan, time-sensitive delivery on iPhone.
 */
export function premiumStyle(
  kind: NotificationKind,
  body: string,
  options: { timeSensitive?: boolean } = {},
): Pick<LocalNotificationSchema, "group" | "summaryText" | "threadIdentifier" | "largeBody" | "interruptionLevel"> {
  const style = KIND_STYLE[kind];
  return {
    group: style.group,
    summaryText: style.summary,
    threadIdentifier: style.group,
    largeBody: body,
    interruptionLevel: options.timeSensitive ? "timeSensitive" : "active",
  };
}

/** Kept in `extra`: the lock screen may show these in full. */
export const PUBLIC_VISIBILITY = { visibility: "public" } as const;

/** A line from the Adhan for each prayer's notification. */
export function adhanLine(prayer: "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha"): string {
  return prayer === "Fajr" ? "الصلاة خيرٌ من النوم" : "حيّ على الصلاة، حيّ على الفلاح";
}

/** A body with its kind's style. */
export function styledBody(kind: NotificationKind, body: string) {
  return { body, ...premiumStyle(kind, body) };
}
