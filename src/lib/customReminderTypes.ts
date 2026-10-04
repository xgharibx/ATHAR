/**
 * Re-exports of the B1-managed `CustomReminder` shape so notification + delivery
 * code has a single import path. The canonical definition lives in
 * `src/data/reminderTypes.ts` (owned by the B1 store/recurrence work).
 *
 * Local delivery-specific helper types stay here.
 */
export type { CustomReminder, ReminderRepeat } from "@/data/reminderTypes";

/**
 * Computed next fire-time for a reminder. The recurrence util returns one of
 * these per reminder, used by the delivery layer to schedule notifications.
 */
export type CustomReminderOccurrence = {
  reminderId: string;
  fireAt: number;
  scheduleId: string;
};

export const CUSTOM_REMINDER_SNOOZE_MINUTES = [5, 10, 15, 30, 60] as const;

/** Keep saved and notification-carried snooze durations within Settings' choices. */
export function getCustomReminderSnoozeMinutes(value: unknown): number {
  return typeof value === "number" &&
    CUSTOM_REMINDER_SNOOZE_MINUTES.includes(value as (typeof CUSTOM_REMINDER_SNOOZE_MINUTES)[number])
    ? value
    : 10;
}

/** Best-effort Web Notifications vibration; an empty pattern explicitly disables it. */
export function getCustomReminderVibrationPattern(value: unknown): number[] {
  return value === false ? [] : [200, 100, 200];
}
