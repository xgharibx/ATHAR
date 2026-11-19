/**
 * «تذكير الختمة» — the Quran plan's daily reminder.
 *
 * A plan used to start and then wait in silence: nothing reminded the reader
 * on the days they forgot. Now the plan can carry one daily reminder, kept as
 * an ordinary custom reminder so it is delivered by the phone's own
 * notification scheduler (it fires with the app closed), shows in «التذكيرات»
 * with the rest, and gets the same «تم» / snooze buttons.
 *
 * The reminder follows the plan:
 *   - it says how much today's wird is and opens the mushaf where the reader
 *     stopped;
 *   - a day already read (marked done, or the daily target reached) is
 *     skipped, so it never nags about a wird that is finished;
 *   - it ends on the plan's last day, and is removed when the plan is reset,
 *     finished, or runs out.
 */
import type { CustomReminder } from "@/data/reminderTypes";
import { arCount } from "@/lib/formatNumber";
import { addDays, daysBetween, parseISO } from "@/lib/qadaa";
import { TOTAL_QURAN_AYAHS } from "@/lib/quranMeta";
import { countCompletedKhatmaDays, getKhatmaDayRange, getKhatmaPlanStatus } from "@/lib/quranKhatma";

/** Where the reminder opens: the mushaf, at the page last read. */
export const KHATMA_REMINDER_ROUTE = "/mushaf?khatma=1";
export const DEFAULT_KHATMA_REMINDER_TIME = "20:00";

export type KhatmaPlanState = {
  startISO: string | null;
  days: number | null;
  version: 1 | 2 | null | undefined;
  done: Record<string, boolean> | undefined;
  /** Ayahs read per day, from the mushaf. */
  dailyAyahs: Record<string, number> | undefined;
};

export function isKhatmaReminder(reminder: Pick<CustomReminder, "deeplink"> | null | undefined): boolean {
  return reminder?.deeplink?.route === KHATMA_REMINDER_ROUTE;
}

export function findKhatmaReminder(reminders: readonly CustomReminder[] | undefined): CustomReminder | undefined {
  return reminders?.find(isKhatmaReminder);
}

function planDays(plan: KhatmaPlanState): number | null {
  if (!plan.startISO || parseISO(plan.startISO) === null || !plan.days) return null;
  return Math.max(1, Math.min(730, Math.floor(plan.days)));
}

/** Today's wird, in words: «وردك اليوم ٢١ آية». */
export function khatmaReminderBody(plan: KhatmaPlanState, today: string): string {
  const days = planDays(plan) ?? 1;
  const dayIndex = Math.max(0, Math.min(days - 1, daysBetween(plan.startISO ?? today, today)));
  const range = getKhatmaDayRange(dayIndex, days, TOTAL_QURAN_AYAHS, plan.version ?? 1);
  // The two-version split gives each day the same count to within one ayah;
  // the notification is written ahead of time, so it rounds to the plan's pace.
  const count = plan.version === 2 ? Math.round(TOTAL_QURAN_AYAHS / days) : range.dailyTarget;
  const about = plan.version === 2 && TOTAL_QURAN_AYAHS % days !== 0 ? "نحو " : "";
  return `وردك اليوم ${about}${arCount(count, { one: "آية", two: "آيتان", few: "آيات" })} — اضغط لتكمل من حيث توقفت`;
}

/** Whether today's wird is already read. */
export function isKhatmaDayRead(plan: KhatmaPlanState, today: string): boolean {
  if (plan.done?.[today]) return true;
  const days = planDays(plan);
  if (!days || !plan.startISO) return false;
  const dayIndex = Math.max(0, Math.min(days - 1, daysBetween(plan.startISO, today)));
  const target = getKhatmaDayRange(dayIndex, days, TOTAL_QURAN_AYAHS, plan.version ?? 1).dailyTarget;
  return target > 0 && (plan.dailyAyahs?.[today] ?? 0) >= target;
}

/** The reminder's fields for this plan, or null when the plan cannot remind. */
export function khatmaReminderFields(plan: KhatmaPlanState, today: string): Pick<CustomReminder, "title" | "body" | "startDate" | "endDate"> | null {
  const days = planDays(plan);
  if (!days || !plan.startISO) return null;
  const elapsed = daysBetween(plan.startISO, today);
  const status = getKhatmaPlanStatus(elapsed, days, countCompletedKhatmaDays(plan.startISO, days, plan.done ?? {}));
  if (status !== "active") return null;
  const lastDay = addDays(plan.startISO, days - 1);
  const firstDay = elapsed < 0 ? plan.startISO : isKhatmaDayRead(plan, today) ? addDays(today, 1) : today;
  if (firstDay > lastDay) return null;
  return {
    title: "ورد الختمة",
    body: khatmaReminderBody(plan, today),
    startDate: firstDay === today ? undefined : firstDay,
    endDate: lastDay,
  };
}

/** A new reminder for the plan, at `time` ("HH:MM"). */
export function newKhatmaReminder(plan: KhatmaPlanState, today: string, time: string) {
  const fields = khatmaReminderFields(plan, today);
  if (!fields) return null;
  return {
    ...fields,
    category: "quran" as const,
    icon: "📖",
    repeat: "daily" as const,
    atTimeOfDay: time,
    deeplink: { route: KHATMA_REMINDER_ROUTE },
    notification: { vibration: true, snoozeMinutes: 30 },
  };
}

export type KhatmaReminderChange =
  | { kind: "none" }
  | { kind: "delete"; id: string }
  | { kind: "update"; id: string; patch: Partial<CustomReminder> };

/** What has to change on the existing reminder to keep it in step with the plan. */
export function khatmaReminderChange(reminder: CustomReminder | undefined, plan: KhatmaPlanState, today: string): KhatmaReminderChange {
  if (!reminder) return { kind: "none" };
  const fields = khatmaReminderFields(plan, today);
  if (!fields) return { kind: "delete", id: reminder.id };
  const patch: Partial<CustomReminder> = {};
  if (reminder.title !== fields.title) patch.title = fields.title;
  if (reminder.body !== fields.body) patch.body = fields.body;
  if ((reminder.startDate ?? undefined) !== fields.startDate) patch.startDate = fields.startDate;
  if (reminder.endDate !== fields.endDate) patch.endDate = fields.endDate;
  return Object.keys(patch).length ? { kind: "update", id: reminder.id, patch } : { kind: "none" };
}
