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
import { getCustomReminderVibrationPattern } from "@/lib/customReminderTypes";
import {
  cancelCustomNotification,
  showServiceWorkerNotification,
  scheduleIdFor,
  scheduleCustomNotification,
  WEB_ATHAR_TAG_PREFIX,
  type NativeCalendarRepeat,
} from "@/lib/customReminderNotifications";
import {
  getAccountStorageOwner,
  isAccountStorageOwnerTransitionInProgress,
  type AccountStorageOwner,
} from "@/lib/accountStorageScope";

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
const nativeScheduleQueues = new Map<string, Promise<void>>();

/**
 * Serialize schedule/cancel operations for one deterministic OS notification
 * ID. A stale React-effect cleanup must run before a replacement schedule, or
 * its late cancellation could remove the new reminder for the same occurrence.
 */
function enqueueNativeScheduleOperation<T>(scheduleId: string, operation: () => Promise<T>): Promise<T> {
  const previous = nativeScheduleQueues.get(scheduleId) ?? Promise.resolve();
  const result = previous.then(operation);
  const settled = result.then(() => undefined, () => undefined);
  nativeScheduleQueues.set(scheduleId, settled);
  void settled.then(() => {
    if (nativeScheduleQueues.get(scheduleId) === settled) nativeScheduleQueues.delete(scheduleId);
  });
  return result;
}

function defaultCanNotify(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof Notification === "undefined") return false;
  return Notification.permission === "granted";
}

function defaultShowNotification(title: string, options?: NotificationOptions): void {
  void showServiceWorkerNotification(title, options);
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
  if (isAccountStorageOwnerTransitionInProgress()) return () => {};
  const owner = getAccountStorageOwner();
  // Native gets real OS-scheduled alarms. Tests that inject `canNotify` /
  // `showNotification` are exercising the web path deliberately, so honour
  // those overrides rather than hijacking them.
  const overridden = ctx.canNotify !== undefined || ctx.showNotification !== undefined;
  if (!overridden && Capacitor.isNativePlatform()) {
    if (!reminders.some((reminder) => reminder?.enabled)) return () => {};
    return syncCustomRemindersNative(reminders, ctx, owner);
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
      const scheduleId = scheduleIdFor(reminder.id, date.getTime(), owner);
      const tag = `${WEB_ATHAR_TAG_PREFIX}${scheduleId}`;
      const id = setTimeout(() => {
        if (getAccountStorageOwner() !== owner) return;
        const opts: NotificationOptions & { vibrate?: number[] } = {
          body: reminder.body ?? reminder.description ?? undefined,
          tag,
          icon: reminder.icon ?? "/pwa-192x192.png",
          vibrate: getCustomReminderVibrationPattern(reminder.notification?.vibration),
          data: { route, reminderId: reminder.id, accountOwner: owner, scheduleId },
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
 * Fixed local-clock recurrences do not need a finite queue on native platforms.
 * Capacitor's calendar trigger survives process death and re-arms after each
 * delivery. Date-bounded and solar/lunar schedules stay occurrence-based so
 * their start/end rules and changing prayer/fasting times remain accurate.
 */
export function getNativeCalendarRepeat(
  reminder: CustomReminder,
  firstOccurrence: Date,
): NativeCalendarRepeat | undefined {
  if (reminder.startDate || reminder.endDate) return undefined;

  const localTime = {
    hour: firstOccurrence.getHours(),
    minute: firstOccurrence.getMinutes(),
    second: 0,
  };

  if (reminder.repeat === "daily") return { on: localTime };
  if (reminder.repeat === "weekly") {
    return { on: { ...localTime, weekday: firstOccurrence.getDay() + 1 } };
  }
  if (reminder.repeat === "monthly") {
    const day = reminder.dayOfMonth;
    // Calendar day 29–31 does not clamp to the final day of shorter months,
    // while the app recurrence engine does. Keep those dates occurrence-based.
    if (typeof day !== "number" || !Number.isInteger(day) || day < 1 || day > 28) return undefined;
    return { on: { ...localTime, day } };
  }
  return undefined;
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
  owner: AccountStorageOwner,
): () => void {
  const maxFirings = Math.max(1, ctx.maxFirings ?? DEFAULT_MAX_FIRINGS);
  const scheduled = new Set<string>();
  let cancelled = false;

  void (async () => {
    // Background sync must never open a permission prompt. Reminder activation
    // is an explicit user action on the Reminders screen; Companion-created
    // reminders are saved inactive until permission is already granted.
    let granted = false;
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const current = await LocalNotifications.checkPermissions();
      granted = current.display === "granted";
    } catch {
      granted = false;
    }
    if (!granted || cancelled || isAccountStorageOwnerTransitionInProgress() || getAccountStorageOwner() !== owner) return;

    const now = Date.now();
    const horizon = now + MAX_SCHEDULE_HORIZON_MS;

    for (const reminder of reminders) {
      if (cancelled || isAccountStorageOwnerTransitionInProgress() || getAccountStorageOwner() !== owner) return;
      if (!reminder || !reminder.enabled) continue;

      const dates = nextOccurrences(reminder, {
        count: maxFirings,
        prayerTimes: ctx.prayerTimes,
      });

      const firstOccurrence = dates.find((date) => date.getTime() > now);
      const nativeRepeat = firstOccurrence && getNativeCalendarRepeat(reminder, firstOccurrence);
      if (firstOccurrence && nativeRepeat) {
        const scheduleId = scheduleIdFor(reminder.id, firstOccurrence.getTime(), owner);
        scheduled.add(scheduleId);
        try {
          await enqueueNativeScheduleOperation(scheduleId, () =>
            scheduleCustomNotification(reminder, firstOccurrence, "", owner, { nativeRepeat }),
          );
        } catch {
          // One bad reminder must not stop the rest from being scheduled.
        }
        continue;
      }

      for (const date of dates) {
        if (cancelled || isAccountStorageOwnerTransitionInProgress() || getAccountStorageOwner() !== owner) return;
        const at = date.getTime();
        // A future start date, one-shot, or fasting occurrence can be the
        // first valid alarm even when it is beyond the rolling queue window.
        // Preserve that first occurrence; subsequent native one-shots are
        // still replenished inside the window as the app next syncs.
        if (at <= now || (at > horizon && at !== firstOccurrence?.getTime())) continue;
        const scheduleId = scheduleIdFor(reminder.id, at, owner);
        scheduled.add(scheduleId);
        try {
          await enqueueNativeScheduleOperation(scheduleId, () => scheduleCustomNotification(reminder, date, "", owner));
        } catch {
          // One bad reminder must not stop the rest from being scheduled.
        }
      }
    }
  })();

  return () => {
    cancelled = true;
    for (const scheduleId of scheduled) {
      void enqueueNativeScheduleOperation(scheduleId, () => cancelCustomNotification(scheduleId)).catch(() => {});
    }
    scheduled.clear();
  };
}
