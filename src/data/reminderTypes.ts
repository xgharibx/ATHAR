export type ReminderCategory = "dhikr" | "quran" | "sunnah" | "fast" | "salat" | "dua" | "custom" | "general" | "adhkar" | "fasting";

export type ReminderRepeat =
  | "once"
  | "daily"
  | "weekly"
  | "monthly"
  | "sunnah_aligned"
  | "prayer_aligned"
  | "fasting_aligned";

export type ReminderWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface CustomReminder {
  id: string;
  category: ReminderCategory;
  title: string;
  description?: string;
  body?: string;
  icon?: string;
  enabled: boolean;
  repeat: ReminderRepeat;
  atTimeOfDay?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  anchorKey?: "tahajjud" | "duha" | "witr" | "fajr" | "dhuhr" | "asr" | "maghrib" | "isha" | "sunrise" | "friday";
  anchorOffsetMinutes?: number;
  startDate?: string;
  endDate?: string;
  notification?: {
    soundId?: string;
    vibration?: boolean;
    snoozeMinutes?: number;
  };
  deeplink?: { route: string; hash?: string };
  suggestion?: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_CUSTOM_REMINDERS: CustomReminder[] = [];
