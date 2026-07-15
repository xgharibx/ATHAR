// @vitest-environment jsdom
/**
 * Custom-reminder notification layer — permission, scheduling, cancel, action wiring.
 *
 * We exercise both the web (Notification API) and native (Capacitor
 * LocalNotifications) paths in isolation by mocking `@capacitor/core` and the
 * lazy-imported `@capacitor/local-notifications` module.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

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
      registerActionTypes: vi.fn(async () => undefined),
      createChannel: vi.fn(async () => undefined),
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
  CUSTOM_REMINDER_ACTION_TYPE_ID,
  numericIdFor,
  requestCustomReminderPermission,
  scheduleCustomNotification,
  scheduleIdFor,
  snoozeFireAt,
  WEB_ATHAR_TAG_PREFIX,
} from "@/lib/customReminderNotifications";
import type { CustomReminder } from "@/lib/customReminderTypes";

const { mockCapacitor, mockLocalNotifications } = mocks;

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
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: {
        permission: "default",
        requestPermission: vi.fn(async () => "granted"),
      },
    });
    const ok = await requestCustomReminderPermission();
    expect(ok).toBe(true);
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

  it("defaults body to description || body || title when override is empty", async () => {
    const r1 = makeReminder({ description: undefined });
    const r2 = makeReminder({ description: "from-desc" });
    const r3 = makeReminder({ description: undefined, body: undefined });
    const fireAt = new Date(Date.now() + 60_000);
    expect(await scheduleCustomNotification(r1, fireAt, "")).toMatch(/^cr:/);
    expect(await scheduleCustomNotification(r2, fireAt, "")).toMatch(/^cr:/);
    expect(await scheduleCustomNotification(r3, fireAt, "")).toMatch(/^cr:/);
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
    const reminder = makeReminder();
    const fireAt = new Date(Date.now() + 60_000);
    const id = await scheduleCustomNotification(reminder, fireAt, "explicit body");
    expect(id.startsWith("cr:rem-1:")).toBe(true);
    expect(mockLocalNotifications.registerActionTypes).toHaveBeenCalledTimes(1);
    expect(mockLocalNotifications.registerActionTypes.mock.calls[0]![0]).toMatchObject({
      types: [{ id: CUSTOM_REMINDER_ACTION_TYPE_ID }],
    });
    expect(mockLocalNotifications.createChannel).toHaveBeenCalledTimes(1);
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
    expect(notif.id).toBe(numericIdFor(id));
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

  it("cancels a native schedule by numeric id", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    const sid = "cr:r1:1700";
    await cancelCustomNotification(sid);
    expect(mockLocalNotifications.cancel).toHaveBeenCalledWith({
      notifications: [{ id: numericIdFor(sid) }],
    });
  });

  it("cancelAllCustomNotifications drains pending native schedules", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    mockLocalNotifications.getPending.mockResolvedValueOnce({
      notifications: [{ id: 1 }, { id: 2 }],
    });
    await cancelAllCustomNotifications();
    expect(mockLocalNotifications.getPending).toHaveBeenCalled();
    expect(mockLocalNotifications.cancel).toHaveBeenCalledWith({
      notifications: [{ id: 1 }, { id: 2 }],
    });
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
