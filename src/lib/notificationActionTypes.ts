import { Capacitor } from "@capacitor/core";

export const PRAYER_ACTION_TYPE_ID = "PRAYER_ACTIONS";
export const REMINDER_ACTION_TYPE_ID = "REMINDER_ACTIONS";
export const CUSTOM_REMINDER_ACTION_TYPE_ID = "CUSTOM_REMINDER_ACTIONS";

export const NOTIFICATION_ACTION_TYPES = [
  {
    id: PRAYER_ACTION_TYPE_ID,
    actions: [{ id: "mark_prayed", title: "تمت الصلاة ✓" }],
  },
  {
    id: REMINDER_ACTION_TYPE_ID,
    actions: [{ id: "snooze_60", title: "تأجيل التذكير" }],
  },
  {
    id: CUSTOM_REMINDER_ACTION_TYPE_ID,
    actions: [
      { id: "done", title: "تم ✓" },
      { id: "snooze", title: "تأجيل التذكير" },
      { id: "open", title: "افتح" },
    ],
  },
];

/** Register the complete category set because iOS replaces all prior categories. */
export async function registerNotificationActionTypes(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.registerActionTypes({ types: [...NOTIFICATION_ACTION_TYPES] });
  } catch {
    // Action buttons are optional on older native builds; the notification still works.
  }
}
