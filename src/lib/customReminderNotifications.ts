import { Capacitor } from "@capacitor/core";
import {
  getCustomReminderSnoozeMinutes,
  getCustomReminderVibrationPattern,
  type CustomReminder,
} from "./customReminderTypes";
import { CUSTOM_REMINDER_ACTION_TYPE_ID, registerNotificationActionTypes } from "./notificationActionTypes";
import {
  getAccountStorageOwner,
  isAccountStorageOwnerTransitionInProgress,
  type AccountStorageOwner,
} from "./accountStorageScope";

/**
 * Custom-reminder delivery layer.
 *
 * Bridges user-defined (CustomReminder) items to the device's notification
 * scheduler so they fire at the right time regardless of where the app was when
 * they were created.
 *
 *  - Native (Capacitor Android/iOS) → `@capacitor/local-notifications` (OS-level
 *    scheduling, survives app close; uses the existing bridge in reminders.ts).
 *  - Web (PWA) → the Service Worker (see /sw.ts) schedules and displays
 *    notifications, so delivered notifications remain enumerable and can be
 *    cleared when the account changes.
 *
 * All action-button wiring (done / snooze / open) routes to
 * `window.dispatchEvent(new CustomEvent('athar-reminder-click', { detail }))`
 * on the page side, and to the existing `registerNotificationDeepLinkListener`
 * for native. Web push (server-pushed from a backend) is intentionally out of
 * scope — this file only schedules locally.
 */

export type CustomReminderActionId = "done" | "snooze" | "open";
export type ScheduleCustomNotificationOptions = { requireDelivery?: boolean };
export const CUSTOM_REMINDER_PERMISSION_CHANGE_EVENT = "athar-reminder-permission-change";
export type CustomReminderPermissionState = "native" | "granted" | "default" | "denied" | "unsupported";
export type ExactAlarmPermissionState = "granted" | "denied" | "not-applicable" | "unsupported";

export type AtharReminderClickDetail = {
  scheduleId: string;
  reminderId: string;
  accountOwner: AccountStorageOwner;
  route?: string;
  action?: CustomReminderActionId;
};

export { CUSTOM_REMINDER_ACTION_TYPE_ID } from "./notificationActionTypes";
export const CUSTOM_REMINDER_CHANNEL_ID = "athar-custom-reminders-v2";
export const WEB_ATHAR_TAG_PREFIX = "athar-reminder:";
export const WEB_ATHAR_NOTIFICATION_TAG_PREFIX = "athar-notification:";
const CUSTOM_REMINDER_SOUND_FILES = { rain_calm: "rain_calm.ogg" } as const;

/** Stable, owner-scoped deterministic id from (account, reminderId, fireAtMs). */
export function scheduleIdFor(
  reminderId: string,
  fireAtMs: number,
  owner: AccountStorageOwner = getAccountStorageOwner(),
): string {
  const ownerPart = owner === "local" ? "" : `${encodeURIComponent(owner)}:`;
  return `cr:${ownerPart}${reminderId}:${fireAtMs}`;
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

const nativeScheduleOperations = new Set<Promise<unknown>>();
const webTimers = new Map<string, number>();
const webNotificationOperations = new Set<Promise<boolean>>();

async function waitForNativeScheduleOperations(): Promise<void> {
  while (nativeScheduleOperations.size > 0) {
    await Promise.allSettled([...nativeScheduleOperations]);
  }
}

async function waitForWebNotificationOperations(): Promise<void> {
  while (webNotificationOperations.size > 0) {
    await Promise.allSettled([...webNotificationOperations]);
  }
}

function resolveBody(reminder: CustomReminder, override?: string): string {
  if (override && override.trim()) return override;
  return reminder.description || reminder.body || reminder.title;
}

function getCustomReminderSoundId(soundId: unknown): keyof typeof CUSTOM_REMINDER_SOUND_FILES {
  return typeof soundId === "string" && soundId in CUSTOM_REMINDER_SOUND_FILES
    ? soundId as keyof typeof CUSTOM_REMINDER_SOUND_FILES
    : "rain_calm";
}

function getCustomReminderSoundFile(soundId: unknown): string {
  return CUSTOM_REMINDER_SOUND_FILES[getCustomReminderSoundId(soundId)];
}

function getCustomReminderChannelId(reminder: CustomReminder): string {
  const sound = getCustomReminderSoundId(reminder.notification?.soundId).replaceAll("_", "-");
  const vibration = reminder.notification?.vibration === false ? "no-vibration" : "vibration";
  return `${CUSTOM_REMINDER_CHANNEL_ID}-${sound}-${vibration}`;
}

async function ensureCustomChannel(reminder: CustomReminder): Promise<string | undefined> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() === "ios") return undefined;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const sound = getCustomReminderSoundFile(reminder.notification?.soundId);
    const vibration = reminder.notification?.vibration !== false;
    const id = getCustomReminderChannelId(reminder);
    await LocalNotifications.createChannel({
      id,
      name: `أثر — مطر هادئ — ${vibration ? "اهتزاز" : "بلا اهتزاز"}`,
      description: "تذكيرات المستخدم المخصصة في تطبيق أثر",
      importance: 4,
      visibility: 1,
      ...(sound ? { sound } : {}),
      vibration,
      lights: true,
      lightColor: "#2F4F37",
    });
    return id;
  } catch {
    // Keep the notification deliverable through the system default channel.
    return undefined;
  }
}

async function notifySW(
  message: unknown,
  expectedOwner?: AccountStorageOwner,
  waitForResponse = false,
  stillCurrent: () => boolean | Promise<boolean> = () => true,
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return false;
  try {
    const worker = navigator.serviceWorker.controller ??
      (await navigator.serviceWorker.getRegistrations()).find((registration) => registration.active)?.active;
    if (!await stillCurrent()) return false;
    if (expectedOwner &&
      (isAccountStorageOwnerTransitionInProgress() || getAccountStorageOwner() !== expectedOwner)) return false;
    if (!worker) return false;
    if (!waitForResponse) {
      worker.postMessage(message);
      return true;
    }
    const response = await requestSWResponse(worker, message);
    return (response as { ok?: unknown } | null)?.ok === true;
  } catch {
    // controller might be in flux (initial load); ignore
    return false;
  }
}

async function requestSWResponse(worker: ServiceWorker, message: unknown): Promise<unknown | null> {
  if (typeof MessageChannel === "undefined") return null;
  return await new Promise<unknown | null>((resolve) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => {
      channel.port1.close();
      channel.port2.close();
      resolve(null);
    }, 5000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      channel.port1.close();
      channel.port2.close();
      resolve(event.data ?? null);
    };
    channel.port1.onmessageerror = () => {
      clearTimeout(timeout);
      channel.port1.close();
      channel.port2.close();
      resolve(null);
    };
    try {
      worker.postMessage(message, [channel.port2]);
    } catch {
      clearTimeout(timeout);
      channel.port1.close();
      channel.port2.close();
      resolve(null);
    }
  });
}

async function queryReminderOwner(worker: ServiceWorker): Promise<{
  owner: AccountStorageOwner | null;
  transitioning: boolean;
  sourceOwner?: AccountStorageOwner;
  requestAtMs: number;
} | null> {
  const response = await requestSWResponse(worker, { type: "athar-reminder-owner-query" }) as {
    ok?: unknown;
    owner?: unknown;
    transitioning?: unknown;
    sourceOwner?: unknown;
    requestAtMs?: unknown;
  } | null;
  if (!response || response.ok !== true ||
    (response.owner !== null && typeof response.owner !== "string")) return null;
  return {
    owner: response.owner as AccountStorageOwner | null,
    transitioning: response.transitioning === true,
    sourceOwner: typeof response.sourceOwner === "string"
      ? response.sourceOwner as AccountStorageOwner
      : undefined,
    requestAtMs: Number.isFinite(response.requestAtMs) ? response.requestAtMs as number : 0,
  };
}

/** Show a web notification through the Service Worker so account cleanup can enumerate it. */
export async function showServiceWorkerNotification(
  title: string,
  options: NotificationOptions = {},
  expectedOwner: AccountStorageOwner = getAccountStorageOwner(),
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return Promise.resolve(false);
  if (isAccountStorageOwnerTransitionInProgress() || getAccountStorageOwner() !== expectedOwner) {
    return Promise.resolve(false);
  }

  const operation = notifySW({
    type: "athar-notification-show",
    accountOwner: expectedOwner,
    title,
    options,
  }, expectedOwner, true).then((shown) =>
    shown && !isAccountStorageOwnerTransitionInProgress() && getAccountStorageOwner() === expectedOwner,
  );
  let trackedOperation: Promise<boolean>;
  trackedOperation = operation.finally(() => webNotificationOperations.delete(trackedOperation));
  webNotificationOperations.add(trackedOperation);
  return trackedOperation;
}

export async function requestCustomReminderPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const current = await LocalNotifications.checkPermissions();
      if (current.display === "granted") return true;
      const res = await LocalNotifications.requestPermissions();
      const granted = res.display === "granted";
      if (granted) notifyCustomReminderPermissionChange();
      return granted;
    } catch {
      return false;
    }
  }
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const res = await Notification.requestPermission();
    const granted = res === "granted";
    if (granted) notifyCustomReminderPermissionChange();
    return granted;
  } catch {
    return false;
  }
}

/** Check whether reminders can be delivered without opening a permission prompt. */
export async function hasCustomReminderPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      return (await LocalNotifications.checkPermissions()).display === "granted";
    } catch {
      return false;
    }
  }
  return typeof Notification !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.serviceWorker) &&
    Notification.permission === "granted";
}

/** Read Android's exact-alarm special access without opening system settings. */
export async function getExactAlarmPermissionState(): Promise<ExactAlarmPermissionState> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return "not-applicable";
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const current = await LocalNotifications.checkExactNotificationSetting();
    return current.exact_alarm === "granted" ? "granted" : "denied";
  } catch {
    return "unsupported";
  }
}

/** Open Android's exact-alarm settings only from an explicit user action. */
export async function requestExactAlarmPermission(): Promise<ExactAlarmPermissionState> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return "not-applicable";
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.changeExactNotificationSetting();
    return await getExactAlarmPermissionState();
  } catch {
    return "unsupported";
  }
}

export function getCustomReminderPermissionState(): CustomReminderPermissionState {
  if (Capacitor.isNativePlatform()) return "native";
  if (typeof Notification === "undefined" || typeof navigator === "undefined" || !navigator.serviceWorker) {
    return "unsupported";
  }
  return Notification.permission;
}

export function notifyCustomReminderPermissionChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CUSTOM_REMINDER_PERMISSION_CHANGE_EVENT));
  }
}

export async function scheduleCustomNotification(
  reminder: CustomReminder,
  fireAt: Date,
  body: string,
  owner: AccountStorageOwner = getAccountStorageOwner(),
  options: ScheduleCustomNotificationOptions = {},
): Promise<string> {
  const scheduleId = scheduleIdFor(reminder.id, fireAt.getTime(), owner);
  const finalBody = resolveBody(reminder, body);
  const route = reminder.deeplink?.route ?? "";

  if (isAccountStorageOwnerTransitionInProgress()) return scheduleId;

  if (Capacitor.isNativePlatform()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await registerNotificationActionTypes();
    const channelId = await ensureCustomChannel(reminder);
    const sound = Capacitor.getPlatform() === "android"
      ? getCustomReminderSoundFile(reminder.notification?.soundId)
      : undefined;
    if (isAccountStorageOwnerTransitionInProgress() || getAccountStorageOwner() !== owner) return scheduleId;
    const operation = (async () => {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: numericIdFor(scheduleId),
            title: reminder.title,
            body: finalBody,
            schedule: { at: fireAt },
            ...(channelId ? { channelId } : {}),
            ...(sound ? { sound } : {}),
            actionTypeId: CUSTOM_REMINDER_ACTION_TYPE_ID,
            smallIcon: "ic_stat_athar_notification",
            largeIcon: "logo_notification_large",
            iconColor: "#2F4F37",
            extra: {
              scheduleId,
              reminderId: reminder.id,
              accountOwner: owner,
              route,
              title: reminder.title,
              body: finalBody,
              snoozeMinutes: getCustomReminderSnoozeMinutes(reminder.notification?.snoozeMinutes),
            },
          },
        ],
      });
      if (isAccountStorageOwnerTransitionInProgress() || getAccountStorageOwner() !== owner) {
        try {
          await LocalNotifications.cancel({ notifications: [{ id: numericIdFor(scheduleId) }] });
        } catch {
          // A late schedule is checked again by the account transition's pending sweep.
        }
      }
    })();
    nativeScheduleOperations.add(operation);
    try {
      await operation;
    } finally {
      nativeScheduleOperations.delete(operation);
    }
    return scheduleId;
  }

  // The worker covers background delivery; the page timer covers an open tab
  // if the browser suspends the worker's timer. Both use one tag, and the
  // worker's later replacement is silent so the user sees a single alert.
  if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.serviceWorker) {
    if (options.requireDelivery) throw new Error("Custom reminder delivery is unavailable");
    return scheduleId;
  }
  if (isAccountStorageOwnerTransitionInProgress() || getAccountStorageOwner() !== owner) return scheduleId;
  const tag = `${WEB_ATHAR_TAG_PREFIX}${scheduleId}`;
  const fireTime = fireAt.getTime();
  const vibrate = getCustomReminderVibrationPattern(reminder.notification?.vibration);
  const prior = webTimers.get(scheduleId);
  if (prior !== undefined) window.clearTimeout(prior);
  const timer = window.setTimeout(() => {
    if (isAccountStorageOwnerTransitionInProgress() || getAccountStorageOwner() !== owner) return;
    void showServiceWorkerNotification(reminder.title, {
      body: finalBody,
      tag,
      vibrate,
      icon: "/logo.svg",
      badge: "/pwa-192x192.png",
      data: {
        scheduleId,
        reminderId: reminder.id,
        accountOwner: owner,
        route,
        snoozeMinutes: getCustomReminderSnoozeMinutes(reminder.notification?.snoozeMinutes),
      },
      actions: [
        { action: "done", title: "تم" },
        { action: "snooze", title: "غفوت" },
        { action: "open", title: "افتح" },
      ],
    } as NotificationOptions);
  }, Math.max(0, fireTime - Date.now()));
  webTimers.set(scheduleId, timer);
  const workerAccepted = await notifySW({
    type: "athar-reminder-schedule",
    scheduleId,
    reminderId: reminder.id,
    accountOwner: owner,
    fireAtMs: fireTime,
    title: reminder.title,
    body: finalBody,
    route,
    snoozeMinutes: getCustomReminderSnoozeMinutes(reminder.notification?.snoozeMinutes),
    vibration: reminder.notification?.vibration !== false,
    tag,
  }, owner);
  if (options.requireDelivery && !workerAccepted) {
    window.clearTimeout(timer);
    if (webTimers.get(scheduleId) === timer) webTimers.delete(scheduleId);
    throw new Error("Custom reminder delivery is unavailable");
  }
  return scheduleId;
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

  const timer = webTimers.get(scheduleId);
  if (timer !== undefined) {
    clearTimeout(timer);
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

export async function cancelAllCustomNotifications(
  options: {
    clearDelivered?: boolean;
    targetOwner?: AccountStorageOwner;
    sourceOwner?: AccountStorageOwner;
    requestedAtMs?: number;
    stillCurrent?: () => boolean | Promise<boolean>;
  } = {},
): Promise<void> {
  const stillCurrent = options.stillCurrent ?? (() => true);
  if (!await stillCurrent()) return;
  const clearDelivered = options.clearDelivered ?? true;
  if (Capacitor.isNativePlatform()) {
    await waitForNativeScheduleOperations();
    if (!await stillCurrent()) return;
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const pending = await LocalNotifications.getPending();
    const custom = pending.notifications.filter((notification) => {
      const scheduleId: unknown = notification.extra?.scheduleId;
      return typeof scheduleId === "string" && scheduleId.startsWith("cr:");
    });
    if (custom.length) {
      await LocalNotifications.cancel({
        notifications: custom.map((n) => ({ id: n.id })),
      });
    }
    if (clearDelivered) {
      const delivered = await LocalNotifications.getDeliveredNotifications();
      const customDelivered = delivered.notifications.filter((notification) => {
        const payload = notification.extra ?? notification.data;
        if (!payload || typeof payload !== "object") return false;
        const scheduleId = (payload as Record<string, unknown>).scheduleId;
        return typeof scheduleId === "string" && scheduleId.startsWith("cr:");
      });
      if (customDelivered.length) {
        await LocalNotifications.removeDeliveredNotifications({ notifications: customDelivered });
      }
    }
  }

  for (const timer of webTimers.values()) clearTimeout(timer);
  webTimers.clear();
  if (!await stillCurrent()) return;

  if (
    !Capacitor.isNativePlatform() &&
    typeof navigator !== "undefined" &&
    navigator.serviceWorker &&
    (clearDelivered || options.targetOwner)
  ) {
    await waitForWebNotificationOperations();
    const regs = await navigator.serviceWorker.getRegistrations();
    const worker = navigator.serviceWorker.controller ??
      regs.find((registration) => registration.active !== null)?.active;
    const hasActiveWorker = Boolean(worker);
    let workerCleanupComplete = true;
    if (hasActiveWorker) {
      let ownerSnapshot = await queryReminderOwner(worker!);
      if (!await stillCurrent()) return;
      if (!ownerSnapshot) {
        throw new Error("Service worker could not confirm the current reminder owner");
      }
      const baseRequestedAtMs = options.requestedAtMs ?? Date.now();
      let requestedAtMs = Math.max(baseRequestedAtMs, ownerSnapshot.requestAtMs + 1);
      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (!await stillCurrent()) return;
        const snapshotSource = ownerSnapshot.transitioning
          ? ownerSnapshot.sourceOwner ?? ownerSnapshot.owner
          : ownerSnapshot.owner;
        const sourceOwner = snapshotSource ?? options.sourceOwner ?? getAccountStorageOwner();
        workerCleanupComplete = await notifySW(
          {
            type: clearDelivered ? "athar-reminder-cancel-all" : "athar-reminder-cancel-pending",
            accountOwner: options.targetOwner,
            sourceOwner,
            requestedAtMs,
          },
          undefined,
          true,
          stillCurrent,
        );
        if (workerCleanupComplete || attempt > 0 || !await stillCurrent()) break;
        ownerSnapshot = await queryReminderOwner(worker!);
        if (!await stillCurrent()) return;
        if (!ownerSnapshot) break;
        requestedAtMs = Math.max(baseRequestedAtMs, requestedAtMs + 1, ownerSnapshot.requestAtMs + 1);
      }
    }
    if (!await stillCurrent()) return;
    if (clearDelivered) {
      for (const registration of regs) {
        const all = await registration.getNotifications();
        all
          .filter((notification) => {
            const tag = notification.tag ?? "";
            return tag.startsWith(WEB_ATHAR_TAG_PREFIX) ||
              tag.startsWith(WEB_ATHAR_NOTIFICATION_TAG_PREFIX) ||
              tag.startsWith("customReminder:");
          })
          .forEach((notification) => notification.close());
      }
    }
    if (!workerCleanupComplete) {
      throw new Error("Service worker did not confirm reminder notification cleanup");
    }
  }
}

/** Returns fireAt for a 10-minute snooze. Wrapper re-calls scheduleCustomNotification. */
export function snoozeFireAt(minutes = 10): Date {
  return new Date(Date.now() + minutes * 60_000);
}
