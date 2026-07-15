import { Capacitor } from "@capacitor/core";
import type { CustomReminder } from "./customReminderTypes";

/**
 * Custom-reminder delivery layer.
 *
 * Bridges user-defined (CustomReminder) items to the device's notification
 * scheduler so they fire at the right time regardless of where the app was when
 * they were created.
 *
 *  - Native (Capacitor Android/iOS) → `@capacitor/local-notifications` (OS-level
 *    scheduling, survives app close; uses the existing bridge in reminders.ts).
 *  - Web (PWA) → `Notification` API fired from a `setTimeout`. Works while the
 *    page is open. Background-tab/closed-app support is provided by the
 *    Service Worker (see /sw.ts) which dispatches `athar-reminder-click` on
 *    notification action/click.
 *
 * All action-button wiring (done / snooze / open) routes to
 * `window.dispatchEvent(new CustomEvent('athar-reminder-click', { detail }))`
 * on the page side, and to the existing `registerNotificationDeepLinkListener`
 * for native. Web push (server-pushed from a backend) is intentionally out of
 * scope — this file only schedules locally.
 */

export type CustomReminderActionId = "done" | "snooze" | "open";

export type AtharReminderClickDetail = {
  scheduleId: string;
  reminderId: string;
  route?: string;
  action?: CustomReminderActionId;
};

export const CUSTOM_REMINDER_ACTION_TYPE_ID = "CUSTOM_REMINDER_ACTIONS";
export const CUSTOM_REMINDER_CHANNEL_ID = "athar-custom-reminders";
export const WEB_ATHAR_TAG_PREFIX = "athar-reminder:";

/** Stable, deterministic id from (reminderId, fireAtMs). */
export function scheduleIdFor(reminderId: string, fireAtMs: number): string {
  return `cr:${reminderId}:${fireAtMs}`;
}

/** Capacitor LocalNotifications needs a numeric id → FNV-1a hash, 31-bit. */
export function numericIdFor(scheduleId: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < scheduleId.length; i++) {
    h = (h ^ scheduleId.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0) % 0x7fffffff;
}

const webTimers = new Map<string, number>();

function resolveBody(reminder: CustomReminder, override?: string): string {
  if (override && override.trim()) return override;
  return reminder.description || reminder.body || reminder.title;
}

async function registerCustomActionTypes(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: CUSTOM_REMINDER_ACTION_TYPE_ID,
          actions: [
            { id: "done", title: "تم" },
            { id: "snooze", title: "غفوت" },
            { id: "open", title: "افتح" },
          ],
        },
      ],
    });
  } catch {
    // non-fatal — older WebViews may not support category actions
  }
}

async function ensureCustomChannel(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (Capacitor.getPlatform() === "ios") return; // iOS has no channels
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.createChannel({
      id: CUSTOM_REMINDER_CHANNEL_ID,
      name: "Athar — Custom Reminders",
      description: "تذكيرات المستخدم المخصصة في تطبيق أثر",
      importance: 4,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: "#2F4F37",
    });
  } catch {
    // non-fatal
  }
}

async function notifySW(message: unknown): Promise<void> {
  if (typeof navigator === "undefined") return;
  if (!navigator.serviceWorker?.controller) return;
  try {
    navigator.serviceWorker.controller.postMessage(message);
  } catch {
    // controller might be in flux (initial load); ignore
  }
}

export async function requestCustomReminderPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const res = await LocalNotifications.requestPermissions();
      return res.display === "granted";
    } catch {
      return false;
    }
  }
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const res = await Notification.requestPermission();
    return res === "granted";
  } catch {
    return false;
  }
}

export async function scheduleCustomNotification(
  reminder: CustomReminder,
  fireAt: Date,
  body: string,
): Promise<string> {
  const scheduleId = scheduleIdFor(reminder.id, fireAt.getTime());
  const finalBody = resolveBody(reminder, body);
  const route = reminder.deeplink?.route ?? "";

  if (Capacitor.isNativePlatform()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await registerCustomActionTypes();
    await ensureCustomChannel();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: numericIdFor(scheduleId),
          title: reminder.title,
          body: finalBody,
          schedule: { at: fireAt },
          channelId: CUSTOM_REMINDER_CHANNEL_ID,
          actionTypeId: CUSTOM_REMINDER_ACTION_TYPE_ID,
          smallIcon: "ic_stat_athar_notification",
          largeIcon: "logo_notification_large",
          iconColor: "#2F4F37",
          extra: {
            scheduleId,
            reminderId: reminder.id,
            route,
            title: reminder.title,
            body: finalBody,
          },
        },
      ],
    });
    return scheduleId;
  }

  // Web fallback
  if (typeof window === "undefined") return scheduleId;
  const tag = `${WEB_ATHAR_TAG_PREFIX}${scheduleId}`;
  const fireTime = fireAt.getTime();
  const delay = Math.max(0, fireTime - Date.now());

  const prior = webTimers.get(scheduleId);
  if (prior !== undefined) clearTimeout(prior);

  const timer = window.setTimeout(() => {
    void showWebCustomNotification(reminder, finalBody, tag, scheduleId);
  }, delay);
  webTimers.set(scheduleId, timer);

  await notifySW({
    type: "athar-reminder-schedule",
    scheduleId,
    reminderId: reminder.id,
    fireAtMs: fireTime,
    title: reminder.title,
    body: finalBody,
    route,
    tag,
  });
  return scheduleId;
}

async function showWebCustomNotification(
  reminder: CustomReminder,
  body: string,
  tag: string,
  scheduleId: string,
): Promise<void> {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  const route = reminder.deeplink?.route ?? "";
  const opts: NotificationOptions = {
    body,
    tag,
    icon: "/logo.svg",
    badge: "/pwa-192x192.png",
    data: {
      scheduleId,
      reminderId: reminder.id,
      route,
    },
  };

  // Attach action buttons + renotify when supported (ServiceWorker showNotification accepts
  // these; browser Notification constructor ignores them silently).
  type ExtOptions = NotificationOptions & {
    actions?: Array<{ action: string; title: string }>;
    renotify?: boolean;
  };
  const extOpts = opts as ExtOptions;
  extOpts.actions = [
    { action: "done", title: "تم" },
    { action: "snooze", title: "غفوت" },
    { action: "open", title: "افتح" },
  ];
  extOpts.renotify = true;

  let reg: ServiceWorkerRegistration | null = null;
  try {
    if (navigator.serviceWorker?.ready) {
      reg = (await navigator.serviceWorker.ready) ?? null;
    }
  } catch {
    reg = null;
  }

  if (reg) {
    await reg.showNotification(reminder.title, extOpts as NotificationOptions);
    return;
  }
  const n = new Notification(reminder.title, opts);
  n.onclick = () => {
    try {
      window.focus();
    } catch {
      // ignore
    }
    window.dispatchEvent(
      new CustomEvent<AtharReminderClickDetail>("athar-reminder-click", {
        detail: { scheduleId, reminderId: reminder.id, route, action: "open" },
      }),
    );
    n.close();
  };
}

export async function cancelCustomNotification(scheduleId: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.cancel({
        notifications: [{ id: numericIdFor(scheduleId) }],
      });
    } catch {
      // ignore
    }
  }

  const t = webTimers.get(scheduleId);
  if (t !== undefined) {
    clearTimeout(t);
    webTimers.delete(scheduleId);
  }

  if (typeof navigator !== "undefined" && navigator.serviceWorker) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        const tag = `${WEB_ATHAR_TAG_PREFIX}${scheduleId}`;
        const list = await r.getNotifications({ tag });
        list.forEach((n) => n.close());
      }
    } catch {
      // ignore
    }
    await notifySW({ type: "athar-reminder-cancel", scheduleId });
  }
}

export async function cancelAllCustomNotifications(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map((n) => ({ id: n.id })),
        });
      }
    } catch {
      // ignore
    }
  }

  for (const t of webTimers.values()) clearTimeout(t);
  webTimers.clear();

  if (typeof navigator !== "undefined" && navigator.serviceWorker) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        const all = await r.getNotifications();
        all
          .filter((n) => (n.tag ?? "").startsWith(WEB_ATHAR_TAG_PREFIX))
          .forEach((n) => n.close());
      }
    } catch {
      // ignore
    }
    await notifySW({ type: "athar-reminder-cancel-all" });
  }
}

/** Returns fireAt for a 10-minute snooze. Wrapper re-calls scheduleCustomNotification. */
export function snoozeFireAt(minutes = 10): Date {
  return new Date(Date.now() + minutes * 60_000);
}
