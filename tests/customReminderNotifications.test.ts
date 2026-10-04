// @vitest-environment jsdom
/**
 * Custom-reminder notification layer — permission, scheduling, cancel, action wiring.
 *
 * We exercise both the web (Notification API) and native (Capacitor
 * LocalNotifications) paths in isolation by mocking `@capacitor/core` and the
 * lazy-imported `@capacitor/local-notifications` module.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    mockCapacitor: {
      isNativePlatform: vi.fn(() => false),
      getPlatform: vi.fn(() => "web"),
    },
    mockLocalNotifications: {
      requestPermissions: vi.fn(async () => ({ display: "granted" })),
      checkPermissions: vi.fn(async () => ({ display: "granted" })),
      schedule: vi.fn(async () => ({ notifications: [] })),
      cancel: vi.fn(async () => ({ notifications: [] })),
      getPending: vi.fn(async () => ({ notifications: [] })),
      getDeliveredNotifications: vi.fn(async () => ({ notifications: [] })),
      removeDeliveredNotifications: vi.fn(async (_delivered: unknown) => undefined),
      removeAllDeliveredNotifications: vi.fn(async () => undefined),
      registerActionTypes: vi.fn(async () => undefined),
      createChannel: vi.fn(async () => undefined),
      checkExactNotificationSetting: vi.fn(async () => ({ exact_alarm: "granted" })),
      changeExactNotificationSetting: vi.fn(async () => ({ exact_alarm: "granted" })),
    },
  };
});

vi.mock("@capacitor/core", () => ({ Capacitor: mocks.mockCapacitor }));
vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: mocks.mockLocalNotifications,
}));

import {
  cancelAllCustomNotifications,
  cancelCustomNotification,
  CUSTOM_REMINDER_PERMISSION_CHANGE_EVENT,
  CUSTOM_REMINDER_ACTION_TYPE_ID,
  getCustomReminderPermissionState,
  getExactAlarmPermissionState,
  hasCustomReminderPermission,
  numericIdFor,
  requestCustomReminderPermission,
  requestExactAlarmPermission,
  scheduleCustomNotification,
  scheduleIdFor,
  showServiceWorkerNotification,
  snoozeFireAt,
  WEB_ATHAR_TAG_PREFIX,
  WEB_ATHAR_NOTIFICATION_TAG_PREFIX,
} from "@/lib/customReminderNotifications";
import type { CustomReminder } from "@/lib/customReminderTypes";
import { getAccountStorageOwner, setAccountStorageOwner } from "@/lib/accountStorageScope";
import {
  beginAccountReminderTransition,
  cancelRemindersForAccountSwitch,
  completeAccountReminderTransition,
} from "@/lib/reminders";

const { mockCapacitor, mockLocalNotifications } = mocks;
const originalServiceWorkerDescriptor = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");

function setServiceWorker(value: unknown): void {
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value });
}

function respondToWorkerMessage(message: { type?: string }, ports?: MessagePort[]): void {
  if (message.type === "athar-reminder-owner-query") {
    const owner = getAccountStorageOwner();
    ports?.[0]?.postMessage({ ok: true, owner, transitioning: false, sourceOwner: owner });
    return;
  }
  ports?.[0]?.postMessage({ ok: true });
}

afterEach(() => {
  completeAccountReminderTransition();
  setAccountStorageOwner("local");
  if (originalServiceWorkerDescriptor) {
    Object.defineProperty(navigator, "serviceWorker", originalServiceWorkerDescriptor);
  } else {
    Reflect.deleteProperty(navigator, "serviceWorker");
  }
});

function makeReminder(overrides: Partial<CustomReminder> = {}): CustomReminder {
  return {
    id: "rem-1",
    category: "custom",
    title: "اذكار",
    body: "بسم الله",
    description: "ابدأ ببسم الله",
    repeat: "daily",
    enabled: true,
    atTimeOfDay: "08:00",
    deeplink: { route: "/c/morning" },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("scheduleIdFor / numericIdFor", () => {
  it("produces a deterministic stable id", () => {
    expect(scheduleIdFor("a", 1000)).toBe("cr:a:1000");
    expect(scheduleIdFor("a", 1000)).toBe(scheduleIdFor("a", 1000));
  });

  it("different fire-times produce different ids", () => {
    expect(scheduleIdFor("a", 1000)).not.toBe(scheduleIdFor("a", 2000));
  });

  it("numericIdFor returns a 31-bit positive integer", () => {
    const id = numericIdFor("cr:test:1700000000000");
    expect(Number.isInteger(id)).toBe(true);
    expect(id).toBeGreaterThanOrEqual(0);
    expect(id).toBeLessThan(0x7fffffff);
    expect(numericIdFor("cr:test:1700000000000")).toBe(id);
  });
});

describe("requestCustomReminderPermission (web)", () => {
  beforeEach(() => {
    mockCapacitor.isNativePlatform.mockReturnValue(false);
    mockLocalNotifications.requestPermissions.mockClear();
  });

  it("returns true when Notification.permission is granted", async () => {
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: { permission: "granted", requestPermission: vi.fn() },
    });
    const ok = await requestCustomReminderPermission();
    expect(ok).toBe(true);
  });

  it("requests permission and resolves to true when granted", async () => {
    const permissionChanged = vi.fn();
    window.addEventListener(CUSTOM_REMINDER_PERMISSION_CHANGE_EVENT, permissionChanged);
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: {
        permission: "default",
        requestPermission: vi.fn(async () => "granted"),
      },
    });
    try {
      const ok = await requestCustomReminderPermission();
      expect(ok).toBe(true);
      expect(permissionChanged).toHaveBeenCalledOnce();
    } finally {
      window.removeEventListener(CUSTOM_REMINDER_PERMISSION_CHANGE_EVENT, permissionChanged);
    }
  });

  it("resolves to false when denied", async () => {
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: {
        permission: "default",
        requestPermission: vi.fn(async () => "denied"),
      },
    });
    const ok = await requestCustomReminderPermission();
    expect(ok).toBe(false);
  });

  it("returns false if Notification API is unavailable", async () => {
    const original = (globalThis as { Notification?: unknown }).Notification;
    Object.defineProperty(globalThis, "Notification", { configurable: true, value: undefined });
    try {
      const ok = await requestCustomReminderPermission();
      expect(ok).toBe(false);
    } finally {
      Object.defineProperty(globalThis, "Notification", { configurable: true, value: original });
    }
  });
});

describe("scheduleCustomNotification (web fallback)", () => {
  beforeEach(() => {
    mockCapacitor.isNativePlatform.mockReturnValue(false);
    mockLocalNotifications.schedule.mockClear();
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: { permission: "granted", requestPermission: vi.fn() },
    });
  });

  it("returns a scheduleId without invoking LocalNotifications", async () => {
    const reminder = makeReminder();
    const fireAt = new Date(Date.now() + 60_000);
    const id = await scheduleCustomNotification(reminder, fireAt, "");
    expect(id).toMatch(/^cr:rem-1:/);
    expect(mockLocalNotifications.schedule).not.toHaveBeenCalled();
  });

  it("rejects explicit snooze scheduling when no service worker can deliver it", async () => {
    setServiceWorker(undefined);
    await expect(scheduleCustomNotification(
      makeReminder(),
      new Date(Date.now() + 60_000),
      "",
      "local",
      { requireDelivery: true },
    )).rejects.toThrow("Custom reminder delivery is unavailable");
  });

  it("defaults body to description || body || title when override is empty", async () => {
    const r1 = makeReminder({ description: undefined });
    const r2 = makeReminder({ description: "from-desc" });
    const r3 = makeReminder({ description: undefined, body: undefined });
    const fireAt = new Date(Date.now() + 60_000);
    expect(await scheduleCustomNotification(r1, fireAt, "")).toMatch(/^cr:/);
    expect(await scheduleCustomNotification(r2, fireAt, "")).toMatch(/^cr:/);
    expect(await scheduleCustomNotification(r3, fireAt, "")).toMatch(/^cr:/);
  });

  it("shows through the service worker instead of creating an untrackable page notification", async () => {
    const constructor = vi.fn();
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: Object.assign(constructor, { permission: "granted" }),
    });
    setServiceWorker({
      controller: {
        postMessage: vi.fn((message: { type?: string; accountOwner?: string; title?: string; options?: NotificationOptions }, ports?: MessagePort[]) => {
          expect(message).toMatchObject({
            type: "athar-notification-show",
            accountOwner: "local",
            title: "Reminder",
            options: { tag: "athar-reminder:cr:r1:1" },
          });
          ports?.[0]?.postMessage({ ok: true });
        }),
      },
      getRegistrations: vi.fn(async () => []),
    });

    await showServiceWorkerNotification("Reminder", { tag: "athar-reminder:cr:r1:1" });

    expect(constructor).not.toHaveBeenCalled();
  });

  it("carries the configured snooze delay into the service worker schedule", async () => {
    const postMessage = vi.fn();
    setServiceWorker({ controller: { postMessage }, getRegistrations: vi.fn(async () => []) });

    await scheduleCustomNotification(
      makeReminder({ notification: { snoozeMinutes: 30 } }),
      new Date(Date.now() + 60_000),
      "",
    );

    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: "athar-reminder-schedule",
      snoozeMinutes: 30,
    }));
  });

  it("passes the reminder vibration preference to the service worker schedule", async () => {
    const messages: Array<{ type?: string; vibration?: boolean }> = [];
    setServiceWorker({
      controller: {
        postMessage: vi.fn((message: { type?: string; vibration?: boolean }, ports?: MessagePort[]) => {
          messages.push(message);
          ports?.[0]?.postMessage({ ok: true });
        }),
      },
      getRegistrations: vi.fn(async () => []),
    });

    await scheduleCustomNotification(
      makeReminder({ notification: { vibration: false } }),
      new Date(Date.now() + 60_000),
      "",
    );

    expect(messages.find((message) => message.type === "athar-reminder-schedule"))
      .toMatchObject({ vibration: false });
  });

  it("does not create an untrackable page notification when service workers are unavailable", async () => {
    const constructor = vi.fn();
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: Object.assign(constructor, { permission: "granted" }),
    });
    setServiceWorker(undefined);

    await showServiceWorkerNotification("Reminder", { tag: "athar-reminder:cr:r1:1" });

    expect(constructor).not.toHaveBeenCalled();
  });

  it("closes a web notification if its account changes while the browser is showing it", async () => {
    const postMessage = vi.fn((_message: unknown, ports?: MessagePort[]) => {
      setAccountStorageOwner("user:b");
      ports?.[0]?.postMessage({ ok: true });
    });
    setAccountStorageOwner("user:a");
    setServiceWorker({ controller: { postMessage }, getRegistrations: vi.fn(async () => []) });

    const shown = await showServiceWorkerNotification("Reminder", {
      tag: "athar-reminder:cr:r1:1",
      data: { accountOwner: "user:a" },
    });

    expect(shown).toBe(false);
    expect(postMessage).toHaveBeenCalledOnce();
  });

  it("refuses a notification whose captured owner is no longer active", async () => {
    const postMessage = vi.fn();
    setAccountStorageOwner("user:b");
    setServiceWorker({ controller: { postMessage }, getRegistrations: vi.fn(async () => []) });

    const shown = await showServiceWorkerNotification(
      "Private summary",
      { tag: "athar-notification:weekly-report:user%3Aa:2026-10-03" },
      "user:a",
    );

    expect(shown).toBe(false);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it("requires service-worker support before reporting web reminder delivery as available", () => {
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: { permission: "granted", requestPermission: vi.fn() },
    });
    setServiceWorker({});
    expect(getCustomReminderPermissionState()).toBe("granted");

    setServiceWorker(undefined);
    expect(getCustomReminderPermissionState()).toBe("unsupported");
  });
});

describe("hasCustomReminderPermission", () => {
  it("checks existing web permission without prompting", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(false);
    mockLocalNotifications.requestPermissions.mockClear();
    setServiceWorker({});
    const requestPermission = vi.fn();
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: { permission: "granted", requestPermission },
    });

    await expect(hasCustomReminderPermission()).resolves.toBe(true);
    expect(requestPermission).not.toHaveBeenCalled();
    expect(mockLocalNotifications.requestPermissions).not.toHaveBeenCalled();
  });

  it("returns false when web notifications are not already granted", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(false);
    setServiceWorker({});
    const requestPermission = vi.fn();
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: { permission: "default", requestPermission },
    });

    await expect(hasCustomReminderPermission()).resolves.toBe(false);
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("checks native notification permission without requesting it", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    mockLocalNotifications.checkPermissions.mockResolvedValue({ display: "denied" } as never);
    mockLocalNotifications.checkPermissions.mockClear();
    mockLocalNotifications.requestPermissions.mockClear();

    await expect(hasCustomReminderPermission()).resolves.toBe(false);
    expect(mockLocalNotifications.checkPermissions).toHaveBeenCalledOnce();
    expect(mockLocalNotifications.requestPermissions).not.toHaveBeenCalled();
  });
});

describe("exact-alarm access", () => {
  beforeEach(() => {
    mockLocalNotifications.checkExactNotificationSetting.mockResolvedValue({ exact_alarm: "granted" } as never);
    mockLocalNotifications.changeExactNotificationSetting.mockResolvedValue({ exact_alarm: "granted" } as never);
  });

  it("checks Android access without opening system settings", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    mockCapacitor.getPlatform.mockReturnValue("android");
    mockLocalNotifications.checkExactNotificationSetting.mockResolvedValue({ exact_alarm: "denied" } as never);
    mockLocalNotifications.changeExactNotificationSetting.mockClear();

    await expect(getExactAlarmPermissionState()).resolves.toBe("denied");
    expect(mockLocalNotifications.checkExactNotificationSetting).toHaveBeenCalledOnce();
    expect(mockLocalNotifications.changeExactNotificationSetting).not.toHaveBeenCalled();
  });

  it("opens Android alarm settings only after the explicit action and returns the resulting state", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    mockCapacitor.getPlatform.mockReturnValue("android");
    mockLocalNotifications.changeExactNotificationSetting.mockResolvedValue({ exact_alarm: "granted" } as never);

    await expect(requestExactAlarmPermission()).resolves.toBe("granted");
    expect(mockLocalNotifications.changeExactNotificationSetting).toHaveBeenCalledOnce();
  });

  it("does not open an Android alarm screen on web or iOS", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(false);
    mockCapacitor.getPlatform.mockReturnValue("web");
    mockLocalNotifications.changeExactNotificationSetting.mockClear();

    await expect(requestExactAlarmPermission()).resolves.toBe("not-applicable");
    expect(mockLocalNotifications.changeExactNotificationSetting).not.toHaveBeenCalled();

    mockCapacitor.isNativePlatform.mockReturnValue(true);
    mockCapacitor.getPlatform.mockReturnValue("ios");
    await expect(getExactAlarmPermissionState()).resolves.toBe("not-applicable");
  });
});

describe("scheduleCustomNotification (native bridge)", () => {
  beforeEach(() => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    mockCapacitor.getPlatform.mockReturnValue("android");
    mockLocalNotifications.schedule.mockClear();
    mockLocalNotifications.registerActionTypes.mockClear();
    mockLocalNotifications.createChannel.mockClear();
  });

  it("registers action types and creates a channel then schedules", async () => {
    setAccountStorageOwner("user:custom-notification-owner");
    const reminder = makeReminder({ notification: { snoozeMinutes: 30 } });
    const fireAt = new Date(Date.now() + 60_000);
    const id = await scheduleCustomNotification(reminder, fireAt, "explicit body");
    expect(id).toContain(":rem-1:");
    expect(mockLocalNotifications.registerActionTypes).toHaveBeenCalledTimes(1);
    expect(mockLocalNotifications.registerActionTypes.mock.calls[0]![0]).toMatchObject({
      types: [
        { id: "PRAYER_ACTIONS" },
        { id: "REMINDER_ACTIONS" },
        { id: CUSTOM_REMINDER_ACTION_TYPE_ID },
      ],
    });
    expect(mockLocalNotifications.createChannel).toHaveBeenCalledTimes(1);
    expect(mockLocalNotifications.createChannel).toHaveBeenCalledWith(expect.objectContaining({
      id: "athar-custom-reminders-v2-rain-calm-vibration",
      sound: "rain_calm.ogg",
      vibration: true,
    }));
    expect(mockLocalNotifications.schedule).toHaveBeenCalledTimes(1);
    const arg = mockLocalNotifications.schedule.mock.calls[0]![0];
    expect(arg.notifications).toHaveLength(1);
    const notif = arg.notifications[0];
    expect(notif.body).toBe("explicit body");
    expect(notif.title).toBe(reminder.title);
    expect(notif.actionTypeId).toBe(CUSTOM_REMINDER_ACTION_TYPE_ID);
    expect(notif.extra.scheduleId).toBe(id);
    expect(notif.extra.reminderId).toBe(reminder.id);
    expect(notif.extra.route).toBe("/c/morning");
    expect(notif.extra.accountOwner).toBe("user:custom-notification-owner");
    expect(notif.extra.snoozeMinutes).toBe(30);
    expect(notif.id).toBe(numericIdFor(id));
  });

  it("applies the selected sound and vibration to an Android channel", async () => {
    const reminder = makeReminder({ notification: { soundId: "rain_calm", vibration: false } });

    await scheduleCustomNotification(reminder, new Date(Date.now() + 60_000), "");

    const channelId = "athar-custom-reminders-v2-rain-calm-no-vibration";
    expect(mockLocalNotifications.createChannel).toHaveBeenCalledWith(expect.objectContaining({
      id: channelId,
      sound: "rain_calm.ogg",
      vibration: false,
    }));
    expect(mockLocalNotifications.schedule.mock.calls[0]?.[0].notifications[0])
      .toMatchObject({ channelId, sound: "rain_calm.ogg" });
  });

  it("keeps scheduling through the system default if channel setup fails", async () => {
    mockLocalNotifications.createChannel.mockRejectedValueOnce(new Error("channel unavailable"));

    await scheduleCustomNotification(makeReminder(), new Date(Date.now() + 60_000), "");

    expect(mockLocalNotifications.schedule).toHaveBeenCalledOnce();
    expect(mockLocalNotifications.schedule.mock.calls[0]?.[0].notifications[0]?.channelId).toBeUndefined();
  });

  it("cancels a notification if its account changes while native scheduling is in flight", async () => {
    let signalScheduleStarted!: () => void;
    let releaseSchedule!: () => void;
    const scheduleStarted = new Promise<void>((resolve) => { signalScheduleStarted = resolve; });
    const scheduleGate = new Promise<void>((resolve) => { releaseSchedule = resolve; });
    mockLocalNotifications.schedule.mockImplementationOnce(async () => {
      signalScheduleStarted();
      await scheduleGate;
      return { notifications: [] };
    });
    setAccountStorageOwner("user:custom-reminder-owner-a");
    const fireAt = new Date(Date.now() + 60_000);
    const scheduled = scheduleCustomNotification(makeReminder(), fireAt, "", "user:custom-reminder-owner-a");
    await scheduleStarted;

    setAccountStorageOwner("user:custom-reminder-owner-b");
    releaseSchedule();
    const scheduleId = await scheduled;

    expect(mockLocalNotifications.cancel).toHaveBeenCalledWith({
      notifications: [{ id: numericIdFor(scheduleId) }],
    });
  });

  it("iOS skips channel creation but still schedules", async () => {
    mockCapacitor.getPlatform.mockReturnValue("ios");
    mockLocalNotifications.createChannel.mockClear();
    const fireAt = new Date(Date.now() + 60_000);
    await scheduleCustomNotification(makeReminder(), fireAt, "");
    expect(mockLocalNotifications.createChannel).not.toHaveBeenCalled();
    expect(mockLocalNotifications.schedule).toHaveBeenCalled();
  });
});

describe("cancelCustomNotification / cancelAllCustomNotifications", () => {
  beforeEach(() => {
    mockLocalNotifications.cancel.mockClear();
    mockLocalNotifications.getPending.mockClear();
  });

  it("rebases cleanup on the active worker owner when the page's persisted owner is stale", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(false);
    const messages: Array<{ type?: string; sourceOwner?: string; accountOwner?: string; requestedAtMs?: number }> = [];
    setAccountStorageOwner("user:a");
    setServiceWorker({
      controller: {
        postMessage: vi.fn((message: { type?: string; sourceOwner?: string; accountOwner?: string; requestedAtMs?: number }, ports?: MessagePort[]) => {
          messages.push(message);
          if (message.type === "athar-reminder-owner-query") {
            ports?.[0]?.postMessage({ ok: true, owner: "user:b", transitioning: false, requestAtMs: 199 });
          } else {
            ports?.[0]?.postMessage({ ok: true });
          }
        }),
      },
      getRegistrations: vi.fn(async () => []),
    });

    await cancelAllCustomNotifications({
      targetOwner: "user:c",
      sourceOwner: "user:a",
      requestedAtMs: 100,
    });

    expect(messages).toContainEqual(expect.objectContaining({
      type: "athar-reminder-cancel-all",
      accountOwner: "user:c",
      sourceOwner: "user:b",
      requestedAtMs: 200,
    }));
  });

  it("skips account cleanup after its owning account transition becomes stale", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(false);
    const postMessage = vi.fn();
    setServiceWorker({
      controller: { postMessage },
      getRegistrations: vi.fn(async () => [{ active: {}, getNotifications: vi.fn(async () => []) }]),
    });

    await cancelAllCustomNotifications({
      targetOwner: "user:b",
      stillCurrent: () => false,
    });

    expect(postMessage).not.toHaveBeenCalled();
  });

  it("rebases a still-current retry after a concurrent tab advances the worker owner", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(false);
    const messages: Array<{ type?: string; sourceOwner?: string; accountOwner?: string; requestedAtMs?: number }> = [];
    let queries = 0;
    let cancellations = 0;
    setServiceWorker({
      controller: {
        postMessage: vi.fn((message: { type?: string; sourceOwner?: string; accountOwner?: string; requestedAtMs?: number }, ports?: MessagePort[]) => {
          messages.push(message);
          if (message.type === "athar-reminder-owner-query") {
            queries += 1;
            ports?.[0]?.postMessage({
              ok: true,
              owner: queries === 1 ? "user:a" : "user:b",
              transitioning: false,
              requestAtMs: queries === 1 ? 100 : 101,
            });
          } else {
            cancellations += 1;
            ports?.[0]?.postMessage({ ok: cancellations === 2 });
          }
        }),
      },
      getRegistrations: vi.fn(async () => []),
    });

    await cancelAllCustomNotifications({ targetOwner: "user:c", requestedAtMs: 50 });

    expect(messages.filter((message) => message.type === "athar-reminder-cancel-all")).toEqual([
      expect.objectContaining({ sourceOwner: "user:a", accountOwner: "user:c", requestedAtMs: 101 }),
      expect.objectContaining({ sourceOwner: "user:b", accountOwner: "user:c", requestedAtMs: 102 }),
    ]);
  });

  it("cancels a native schedule by numeric id", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    const sid = "cr:r1:1700";
    await cancelCustomNotification(sid);
    expect(mockLocalNotifications.cancel).toHaveBeenCalledWith({
      notifications: [{ id: numericIdFor(sid) }],
    });
  });

  it("cancelAllCustomNotifications preserves prayer and built-in reminders", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    mockLocalNotifications.getPending.mockResolvedValueOnce({
      notifications: [
        { id: 1, title: "Fajr", body: "Prayer", extra: { prayerName: "Fajr" } },
        { id: 2, title: "Morning", body: "Adhkar", extra: { reminderKey: "morning" } },
        { id: 3, title: "Custom", body: "Read", extra: { scheduleId: "cr:r1:1700", reminderId: "r1" } },
        { id: 4, title: "Unknown", body: "", extra: null },
      ],
    });
    await cancelAllCustomNotifications();
    expect(mockLocalNotifications.getPending).toHaveBeenCalled();
    expect(mockLocalNotifications.cancel).toHaveBeenCalledWith({
      notifications: [{ id: 3 }],
    });
  });

  it("does not cancel anything when native pending schedules have no custom reminders", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    mockLocalNotifications.getPending.mockResolvedValueOnce({
      notifications: [{ id: 1, title: "Fajr", body: "Prayer", extra: { prayerName: "Fajr" } }],
    });
    await cancelAllCustomNotifications();
    expect(mockLocalNotifications.cancel).not.toHaveBeenCalled();
  });

  it("surfaces native pending-reminder lookup failures so account hydration remains gated", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    mockLocalNotifications.getPending.mockRejectedValueOnce(new Error("native lookup failed"));

    await expect(cancelAllCustomNotifications()).rejects.toThrow("native lookup failed");
  });

  it("can cancel pending native custom alarms without clearing same-account delivered alerts", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);

    await cancelAllCustomNotifications({ clearDelivered: false });

    expect(mockLocalNotifications.getPending).toHaveBeenCalled();
    expect(mockLocalNotifications.removeAllDeliveredNotifications).not.toHaveBeenCalled();
  });

  it("closes current and legacy web reminder notifications but preserves unrelated notifications", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(false);
    const current = { tag: `${WEB_ATHAR_TAG_PREFIX}cr:user%3Aa:r1:1700`, close: vi.fn() };
    const legacy = { tag: "customReminder:r1:1700", close: vi.fn() };
    const weeklyReport = { tag: `${WEB_ATHAR_NOTIFICATION_TAG_PREFIX}weekly-report:user%3Aa:2026-10-03`, close: vi.fn() };
    const unrelated = { tag: "weekly-report", close: vi.fn() };
    const events: string[] = [];
    const getNotifications = vi.fn(async () => {
      events.push("page-enumeration");
      return [current, legacy, weeklyReport, unrelated];
    });
    const postedMessages: Array<{ type?: string; accountOwner?: string }> = [];
    setServiceWorker({
      controller: {
        postMessage: vi.fn((message: { type?: string; accountOwner?: string }, ports?: MessagePort[]) => {
          postedMessages.push(message);
          events.push(message.type === "athar-reminder-owner-query" ? "worker-owner-query" : "worker-cancel");
          setTimeout(() => {
            events.push(message.type === "athar-reminder-owner-query" ? "worker-owner-ack" : "worker-ack");
            respondToWorkerMessage(message, ports);
          }, 10);
        }),
      },
      getRegistrations: vi.fn(async () => [{ getNotifications }]),
    });

    await cancelAllCustomNotifications({ targetOwner: "user:b" });

    expect(current.close).toHaveBeenCalledOnce();
    expect(legacy.close).toHaveBeenCalledOnce();
    expect(weeklyReport.close).toHaveBeenCalledOnce();
    expect(unrelated.close).not.toHaveBeenCalled();
    expect(events.indexOf("worker-ack")).toBeLessThan(events.indexOf("page-enumeration"));
    expect(postedMessages).toContainEqual(expect.objectContaining({
      type: "athar-reminder-cancel-all",
      accountOwner: "user:b",
    }));
  });

  it("waits for active page notification delivery before clearing account reminders", async () => {
    let signalShowStarted!: () => void;
    let releaseShow!: () => void;
    const showStarted = new Promise<void>((resolve) => { signalShowStarted = resolve; });
    const showGate = new Promise<void>((resolve) => { releaseShow = resolve; });
    const notification = { tag: "athar-reminder:cr:user%3Aa:r1:1", data: { accountOwner: "user:a" }, close: vi.fn() };
    const getNotifications = vi.fn(async () => [notification]);
    let showPort: MessagePort | undefined;
    const postMessage = vi.fn((message: { type?: string }, ports?: MessagePort[]) => {
      if (message.type === "athar-notification-show") {
        signalShowStarted();
        showPort = ports?.[0];
      } else {
        respondToWorkerMessage(message, ports);
      }
    });
    setAccountStorageOwner("user:a");
    setServiceWorker({
      controller: { postMessage },
      getRegistrations: vi.fn(async () => [{ active: {}, getNotifications }]),
    });

    const inFlight = showServiceWorkerNotification("Reminder", {
      tag: notification.tag,
      data: notification.data,
    });
    await showStarted;
    beginAccountReminderTransition();
    const clearing = cancelAllCustomNotifications();

    expect(getNotifications).not.toHaveBeenCalled();
    releaseShow();
    showPort?.postMessage({ ok: true });
    await Promise.all([inFlight, clearing]);

    expect(notification.close).toHaveBeenCalled();
    expect(getNotifications).toHaveBeenCalled();
  });

  it("keeps account cleanup gated if the service worker does not confirm cancellation", async () => {
    setServiceWorker({
      controller: { postMessage: vi.fn((message: { type?: string }, ports?: MessagePort[]) => {
        if (message.type === "athar-reminder-owner-query") respondToWorkerMessage(message, ports);
        else ports?.[0]?.postMessage({ ok: false });
      }) },
      getRegistrations: vi.fn(async () => [{ active: {}, getNotifications: vi.fn(async () => []) }]),
    });

    await expect(cancelAllCustomNotifications()).rejects.toThrow("Service worker did not confirm");
  });

  it("waits for a custom native schedule already in flight before clearing the account's reminders", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    const events: string[] = [];
    let signalScheduleStarted!: () => void;
    let releaseSchedule!: () => void;
    const scheduleStarted = new Promise<void>((resolve) => { signalScheduleStarted = resolve; });
    const scheduleGate = new Promise<void>((resolve) => { releaseSchedule = resolve; });
    mockLocalNotifications.schedule.mockImplementationOnce(async () => {
      events.push("schedule-started");
      signalScheduleStarted();
      await scheduleGate;
      events.push("schedule-finished");
      return { notifications: [] };
    });
    mockLocalNotifications.cancel.mockImplementation(async () => {
      events.push("cancel-schedule");
      return { notifications: [] };
    });
    mockLocalNotifications.getPending.mockImplementation(async () => {
      events.push("read-pending");
      return { notifications: [] };
    });
    setAccountStorageOwner("user:reminder-race-a");

    const scheduled = scheduleCustomNotification(
      makeReminder(),
      new Date(Date.now() + 60_000),
      "",
      "user:reminder-race-a",
    );
    await scheduleStarted;

    beginAccountReminderTransition();
    const cancellation = cancelRemindersForAccountSwitch("user:reminder-race-b");
    expect(events).toEqual(["schedule-started"]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(events).not.toContain("read-pending");

    releaseSchedule();
    await Promise.all([scheduled, cancellation]);

    expect(events.indexOf("schedule-finished")).toBeLessThan(events.indexOf("read-pending"));
    expect(events.indexOf("cancel-schedule")).toBeLessThan(events.indexOf("read-pending"));
  });
});

describe("snoozeFireAt", () => {
  it("returns a Date ~minutes ahead", () => {
    const before = Date.now();
    const at = snoozeFireAt(10);
    const after = Date.now();
    expect(at.getTime()).toBeGreaterThanOrEqual(before + 10 * 60_000);
    expect(at.getTime()).toBeLessThanOrEqual(after + 10 * 60_000 + 100);
  });
});

describe("WEB_ATHAR_TAG_PREFIX", () => {
  it("uses the documented prefix", () => {
    expect(WEB_ATHAR_TAG_PREFIX).toBe("athar-reminder:");
  });
});
