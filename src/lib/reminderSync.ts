/**
 * Schedule the next-N local-clock firings of every enabled user-defined
 * reminder — including every reminder Athar's AI creates.
 *
 *  - Native (Capacitor Android/iOS) → `@capacitor/local-notifications`, i.e.
 *    the OS alarm scheduler, so a reminder still fires with the app closed.
 *  - Web (PWA) → `setTimeout` + the Web Notifications API, which only holds
 *    while the page is alive.
 *
 * The native branch is not an optimisation, it is the difference between
 * working and not working: this module used to take the web path on every
 * platform. On Android that meant (a) `Notification.permission` is not
 * something the Capacitor WebView grants — the app holds the *LocalNotifications*
 * permission — so the guard below bailed out and scheduled nothing at all, and
 * (b) even had it passed, a `setTimeout` dies the moment Android freezes the
 * WebView. So AI-created reminders persisted and appeared in the UI but could
 * never actually notify. The native delivery helpers existed but nothing ever
 * called them.
 *
 * Both branches share one recurrence engine (`nextOccurrences`), so all seven
 * repeat shapes behave identically across platforms.
 *
 * Returns a cleanup function that tears down the previous schedule, so the
 * caller can re-sync whenever `customReminders` mutates.
 */
import { Capacitor } from "@capacitor/core";
import type { CustomReminder } from "@/data/reminderTypes";
import { nextOccurrences, type PrayerTimesSource } from "@/lib/reminderRecurrence";
import {
  cancelCustomNotification,
  scheduleCustomNotification,
} from "@/lib/customReminderNotifications";

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
  /**
   * Today's prayer timings (Fajr/Sunrise/Dhuhr/Asr/Maghrib/Isha), passed
   * straight through to `nextOccurrences`. Without this, `prayer_aligned` /
   * `sunnah_aligned` reminders can only ever fall back to their (usually
   * unset) `atTimeOfDay` and never actually fire — see App.tsx, which wires
   * in the same `notificationPrayerTimings` it already computes for the
   * built-in adhkar reminders.
   */
  prayerTimes?: PrayerTimesSource;
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
 * `nextOccurrences` (reminderRecurrence.ts) already handles all seven repeat
 * shapes, including `prayer_aligned` / `sunnah_aligned` / `fasting_aligned` —
 * so this schedules every reminder, not just the four direct-repeat ones.
 * The one thing the caller must supply for anchored reminders to resolve to
 * a real time (instead of falling back to their usually-unset `atTimeOfDay`)
 * is `ctx.prayerTimes`; see App.tsx for the wiring.
 */
export function syncCustomReminders(
  reminders: CustomReminder[],
  ctx: CustomReminderSyncContext = {},
): () => void {
  // Native gets real OS-scheduled alarms. Tests that inject `canNotify` /
  // `showNotification` are exercising the web path deliberately, so honour
  // those overrides rather than hijacking them.
  const overridden = ctx.canNotify !== undefined || ctx.showNotification !== undefined;
  if (!overridden && Capacitor.isNativePlatform()) {
    return syncCustomRemindersNative(reminders, ctx);
  }

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

    const dates = nextOccurrences(reminder, { count: maxFirings, prayerTimes: ctx.prayerTimes });
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

/**
 * Native scheduling — hands every upcoming occurrence to the OS via
 * `@capacitor/local-notifications`, so reminders fire whether or not the app
 * is running.
 *
 * Scheduling is async while the caller (a React effect) needs a synchronous
 * cleanup, so the work runs detached and the returned teardown both flips a
 * cancelled flag (stopping any not-yet-issued schedules) and cancels whatever
 * was already handed to the OS.
 *
 * Re-arming the same occurrence is harmless: `scheduleIdFor` is deterministic,
 * so the derived notification id is stable and the OS replaces the existing
 * alarm instead of duplicating it.
 */
function syncCustomRemindersNative(
  reminders: CustomReminder[],
  ctx: CustomReminderSyncContext,
): () => void {
  const maxFirings = Math.max(1, ctx.maxFirings ?? DEFAULT_MAX_FIRINGS);
  const scheduled: string[] = [];
  let cancelled = false;

  void (async () => {
    // Without the OS permission nothing can fire, so ask rather than silently
    // no-op. Already-granted returns immediately; permanently-denied resolves
    // denied without a prompt.
    let granted = false;
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const current = await LocalNotifications.checkPermissions();
      granted = current.display === "granted";
      if (!granted && current.display === "prompt") {
        const asked = await LocalNotifications.requestPermissions();
        granted = asked.display === "granted";
      }
    } catch {
      granted = false;
    }
    if (!granted || cancelled) return;

    const now = Date.now();
    const horizon = now + MAX_SCHEDULE_HORIZON_MS;

    for (const reminder of reminders) {
      if (cancelled) return;
      if (!reminder || !reminder.enabled) continue;

      const dates = nextOccurrences(reminder, {
        count: maxFirings,
        prayerTimes: ctx.prayerTimes,
      });

      for (const date of dates) {
        if (cancelled) return;
        const at = date.getTime();
        if (at <= now || at > horizon) continue;
        try {
          const scheduleId = await scheduleCustomNotification(reminder, date, "");
          scheduled.push(scheduleId);
        } catch {
          // One bad reminder must not stop the rest from being scheduled.
        }
      }
    }
  })();

  return () => {
    cancelled = true;
    for (const scheduleId of scheduled) {
      void cancelCustomNotification(scheduleId).catch(() => {});
    }
    scheduled.length = 0;
  };
}
