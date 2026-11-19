import * as React from "react";
import { useNoorStore } from "@/store/noorStore";
import { deleteCustomReminder, updateCustomReminder } from "@/store/customReminderActions";
import { useTodayKey } from "@/hooks/useTodayKey";
import { findKhatmaReminder, khatmaReminderChange } from "@/lib/khatmaReminder";

/**
 * Keeps the Quran plan's daily reminder in step with the plan: skips a day
 * once it is read, follows a changed plan, and goes away with the plan.
 * Mounted once, at the app's root.
 */
export function useKhatmaReminderSync(): void {
  const today = useTodayKey();
  const reminder = useNoorStore((s) => findKhatmaReminder(s.customReminders));
  const startISO = useNoorStore((s) => s.khatmaStartISO);
  const days = useNoorStore((s) => s.khatmaDays);
  const version = useNoorStore((s) => s.khatmaScheduleVersion);
  const done = useNoorStore((s) => s.khatmaDone);
  const dailyAyahs = useNoorStore((s) => s.quranDailyAyahs);

  React.useEffect(() => {
    const change = khatmaReminderChange(reminder, { startISO, days, version, done, dailyAyahs }, today);
    if (change.kind === "delete") deleteCustomReminder(change.id);
    else if (change.kind === "update") updateCustomReminder(change.id, change.patch);
  }, [reminder, startISO, days, version, done, dailyAyahs, today]);
}
