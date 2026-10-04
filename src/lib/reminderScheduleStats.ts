import type { CustomReminder } from "@/data/reminderTypes";
import { nextOccurrences, type PrayerTimesSource } from "@/lib/reminderRecurrence";

export interface ReminderScheduleStats {
  enabledCount: number;
  totalCount: number;
  todayOccurrences: number;
  nextSevenDaysOccurrences: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Counts enabled reminders and their upcoming scheduled occurrences. */
export function getReminderScheduleStats(
  reminders: CustomReminder[],
  now = new Date(),
  prayerTimes?: PrayerTimesSource,
): ReminderScheduleStats {
  const today = now.toDateString();
  const sevenDaysFromNow = now.getTime() + SEVEN_DAYS_MS;
  let enabledCount = 0;
  let todayOccurrences = 0;
  let nextSevenDaysOccurrences = 0;

  for (const reminder of reminders) {
    if (!reminder.enabled) continue;
    enabledCount += 1;

    for (const occurrence of nextOccurrences(reminder, { now, count: 14, prayerTimes })) {
      const timestamp = occurrence.getTime();
      if (timestamp < now.getTime() || timestamp >= sevenDaysFromNow) continue;
      nextSevenDaysOccurrences += 1;
      if (occurrence.toDateString() === today) todayOccurrences += 1;
    }
  }

  return {
    enabledCount,
    totalCount: reminders.length,
    todayOccurrences,
    nextSevenDaysOccurrences,
  };
}
