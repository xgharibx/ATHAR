/**
 * Schedule the next-N local-clock firings of every enabled user-defined
 * reminder. On the web, this uses `setTimeout` + the Web Notifications
 * API. Per-reminder scheduling is delegated to the delivery helpers in
 * `@/lib/customReminderDelivery` on native platforms (Capacitor).
 *
 * Returns a cleanup function that cancels all pending `setTimeout`s, so
 * the caller can tear down the previous schedule when `customReminders`
 * mutates.
 */
import type { CustomReminder } from "@/data/reminderTypes";
import { nextOccurrences } from "@/lib/reminderRecurrence";

export interface CustomReminderSyncContext {
  /**
   * Optional deep-link handler invoked when the user clicks a fired
   * notification. The native bridge supplies this automatically; on
   * the web we just `console.debug` the route.
   */
  onTap?: (route: string | undefined) => void;
  /** Cap on absolute number of pending timers — defaults to 10. */
  maxFirings?: number;
  /**
   * Override the notification permission / behaviour check. Useful in
   * tests where `Notification` may not exist.
   */
  canNotify?: () => boolean;
  /** Override the actual notification factory — used by tests. */
  showNotification?: (title: string, options: NotificationOptions) => void;
}

const DEFAULT_MAX_FIRINGS = 10;
const MAX_SCHEDULE_HORIZON_MS = 14 * 24 * 60 * 60 * 1000; // 14d

function defaultCanNotify(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof Notification === "undefined") return false;
  return Notification.permission === "granted";
}

function defaultShowNotification(title: string, options?: NotificationOptions): void {
  try {
    new Notification(title, options);
  } catch {
    /* ignore — older browsers may throw even with permission granted */
  }
}

/**
 * Schedule the next N firings for every enabled custom reminder.
 * Returns a cleanup function the caller must invoke before re-scheduling.
 *
 * The schedule only handles the four direct-repeat shapes. For
 * `*_aligned` repeats, callers should start the long-running delivery
 * helper in `@/lib/customReminderDelivery` (which has access to
 * prayer times).
 */
export function syncCustomReminders(
  reminders: CustomReminder[],
  ctx: CustomReminderSyncContext = {},
): () => void {
  const maxFirings = Math.max(1, ctx.maxFirings ?? DEFAULT_MAX_FIRINGS);
  const canNotify = ctx.canNotify ?? defaultCanNotify;
  const showNotification =
    ctx.showNotification ??
    ((title, options) =>
      defaultShowNotification(title, options));

  const timers: ReturnType<typeof setTimeout>[] = [];

  if (!canNotify()) {
    return () => clearTimers(timers);
  }

  const now = Date.now();
  const horizon = now + MAX_SCHEDULE_HORIZON_MS;

  for (const reminder of reminders) {
    if (!reminder || !reminder.enabled) continue;

    const dates = nextOccurrences(reminder, { count: maxFirings });
    const route = reminder.deeplink?.route;

    for (const date of dates) {
      const delay = date.getTime() - now;
      if (delay <= 0 || date.getTime() > horizon) continue;
      const tag = `customReminder:${reminder.id}:${date.getTime()}`;
      const id = setTimeout(() => {
        const opts: NotificationOptions = {
          body: reminder.body ?? reminder.description ?? undefined,
          tag,
          icon: reminder.icon ?? "/pwa-192x192.png",
          data: { route, reminderId: reminder.id },
        };
        showNotification(reminder.title, opts);
        if (ctx.onTap && route) {
          ctx.onTap(route);
        }
      }, delay);
      timers.push(id);
    }
  }

  return () => clearTimers(timers);
}

function clearTimers(timers: ReturnType<typeof setTimeout>[]) {
  for (const id of timers) clearTimeout(id);
  timers.length = 0;
}
