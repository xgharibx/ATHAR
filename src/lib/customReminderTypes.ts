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
