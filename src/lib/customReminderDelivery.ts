import type { CustomReminder } from "./customReminderTypes";
import {
  cancelCustomNotification,
  scheduleCustomNotification,
} from "./customReminderNotifications";

/**
 * Delivery wiring for custom (user-defined) reminders.
 *
 * Pulls the user's reminder list, resolves the next fire-time for each via the
 * recurrence util, hands each occurrence to `scheduleCustomNotification`, and
 * keeps the schedule in sync on a 1-minute interval:
 *
 *  - newly added / re-enabled reminders are scheduled
 *  - removed or disabled reminders are cancelled
 *  - rescheduled reminders get re-armed with the new `scheduleId`
 *
 * The recurrence util (separate module added by B1) is injected so the
 * delivery layer doesn't depend on its internals — anything that returns the
 * next Date is usable (daily, weekly, cron-like, etc.).
 */

export type RecurrenceResolver = (reminder: CustomReminder, now: Date) => Date | null;

const MS_PER_MIN = 60_000;
const SYNC_INTERVAL_MS = MS_PER_MIN;

/**
 * Default recurrence: HH:MM daily. If the parsed time is already in the past
 * today, push to tomorrow.
 */
export function defaultDailyResolver(reminder: CustomReminder, now: Date): Date | null {
  const atTimeOfDay = String(reminder.atTimeOfDay ?? "").trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(atTimeOfDay);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;
  const at = new Date(now);
  at.setHours(hour, minute, 0, 0);
  if (at.getTime() <= now.getTime() + 30_000) {
    at.setDate(at.getDate() + 1);
  }
  return at;
}

export type CustomReminderDeliveryOptions = {
  getReminders: () => CustomReminder[];
  onFire?: (reminderId: string, fireTimeMs: number) => void;
  resolver?: RecurrenceResolver;
  syncIntervalMs?: number;
};

export type CustomReminderDeliveryHandle = {
  stop: () => void;
  syncNow: () => Promise<void>;
  isRunning: () => boolean;
};

export function startCustomReminderDelivery(
  opts: CustomReminderDeliveryOptions,
): CustomReminderDeliveryHandle {
  const resolver = opts.resolver ?? defaultDailyResolver;
  const intervalMs = opts.syncIntervalMs ?? SYNC_INTERVAL_MS;

  let active = false;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  const knownScheduleIds = new Map<string, string>(); // reminderId → scheduleId

  async function syncOnce(): Promise<void> {
    if (!active) return;
    const reminders = opts.getReminders();
    const now = new Date();
    const seen = new Set<string>();
    for (const r of reminders) {
      if (!r.enabled) continue;
      const fireAt = resolver(r, now);
      if (!fireAt) continue;
      seen.add(r.id);
      const scheduleId = await scheduleCustomNotification(r, fireAt, "");
      knownScheduleIds.set(r.id, scheduleId);
      opts.onFire?.(r.id, fireAt.getTime());
    }
    for (const [reminderId, scheduleId] of knownScheduleIds) {
      if (!seen.has(reminderId)) {
        await cancelCustomNotification(scheduleId).catch(() => {});
        knownScheduleIds.delete(reminderId);
      }
    }
  }

  async function start(): Promise<void> {
    if (active) return;
    active = true;
    await syncOnce();
    if (intervalMs > 0) {
      intervalId = setInterval(() => {
        void syncOnce();
      }, intervalMs);
    }
  }

  function stop(): void {
    active = false;
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    for (const sid of knownScheduleIds.values()) {
      cancelCustomNotification(sid).catch(() => {});
    }
    knownScheduleIds.clear();
  }

  void start();

  return {
    stop,
    syncNow: syncOnce,
    isRunning: () => active,
  };
}
