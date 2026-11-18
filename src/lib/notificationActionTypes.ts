import { Capacitor } from "@capacitor/core";

export const PRAYER_ACTION_TYPE_ID = "PRAYER_ACTIONS";
export const REMINDER_ACTION_TYPE_ID = "REMINDER_ACTIONS";
export const ADHKAR_ACTION_TYPE_ID = "ADHKAR_ACTIONS";
export const CUSTOM_REMINDER_ACTION_TYPE_ID = "CUSTOM_REMINDER_ACTIONS";

/**
 * The buttons under Athar's notifications. All but «افتح» act without
 * opening the app: on iPhone `foreground: false`, on Android the patched
 * library sends them to NotificationActionReceiver (androidBackgroundActions
 * in capacitor.config.ts).
 */
export const NOTIFICATION_ACTION_TYPES = [
  {
    id: PRAYER_ACTION_TYPE_ID,
    actions: [{ id: "mark_prayed", title: "صلّيتُ ✓", foreground: false }],
  },
  {
    id: REMINDER_ACTION_TYPE_ID,
    actions: [{ id: "snooze_60", title: "ذكّرني بعد ساعة", foreground: false }],
  },
  {
    id: ADHKAR_ACTION_TYPE_ID,
    actions: [
      { id: "done", title: "قرأتُها ✓", foreground: false },
      { id: "snooze_60", title: "بعد ساعة", foreground: false },
    ],
  },
  {
    id: CUSTOM_REMINDER_ACTION_TYPE_ID,
    actions: [
      { id: "done", title: "تمّ ✓", foreground: false },
      { id: "snooze", title: "ذكّرني لاحقًا", foreground: false },
      { id: "open", title: "افتح", foreground: true },
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
