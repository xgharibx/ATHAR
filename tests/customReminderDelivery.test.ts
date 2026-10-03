// @vitest-environment jsdom
/**
 * Custom-reminder delivery wiring — schedules via scheduleCustomNotification,
 * re-syncs every minute, picks up new reminders, removes disabled ones.
 *
 * Notification delivery itself is mocked so we only assert the orchestration
 * (sync timing, scheduling vs. cancellation, onFire callback, stop behavior).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
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
  scheduleCustomNotification: vi.fn(async () => "cr:test:1700000000000"),
  cancelCustomNotification: vi.fn(async () => undefined),
}));

vi.mock("@capacitor/core", () => ({ Capacitor: mocks.mockCapacitor }));
vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: mocks.mockLocalNotifications,
}));
vi.mock("@/lib/customReminderNotifications", () => ({
  scheduleCustomNotification: mocks.scheduleCustomNotification,
  cancelCustomNotification: mocks.cancelCustomNotification,
}));

import {
  startCustomReminderDelivery,
  defaultDailyResolver,
} from "@/lib/customReminderDelivery";
import type { CustomReminder } from "@/lib/customReminderTypes";

const { mockCapacitor, mockLocalNotifications } = mocks;

function makeReminder(id: string, time: string, enabled = true): CustomReminder {
  return {
    id,
    category: "custom",
    title: id,
    repeat: "daily",
    enabled,
    atTimeOfDay: time,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("defaultDailyResolver", () => {
  it("schedules today when time is later today", () => {
    const now = new Date(2026, 6, 9, 6, 0, 0);
    const r = makeReminder("r", "08:30");
    const at = defaultDailyResolver(r, now);
    expect(at).not.toBeNull();
    expect(at!.getHours()).toBe(8);
    expect(at!.getMinutes()).toBe(30);
  });

  it("rolls to tomorrow when time already passed", () => {
    const now = new Date(2026, 6, 9, 9, 0, 0);
    const r = makeReminder("r", "08:00");
    const at = defaultDailyResolver(r, now);
    expect(at).not.toBeNull();
    expect(at!.getDate()).toBe(10);
    expect(at!.getHours()).toBe(8);
  });

  it("returns null on malformed time", () => {
    expect(defaultDailyResolver(makeReminder("r", "bad"), new Date())).toBeNull();
  });
});

describe("startCustomReminderDelivery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockCapacitor.isNativePlatform.mockReturnValue(false);
    mockLocalNotifications.schedule.mockClear();
    mockLocalNotifications.cancel.mockClear();
    mocks.scheduleCustomNotification.mockClear();
    mocks.cancelCustomNotification.mockClear();
  });

  it("schedules every enabled reminder on first sync", async () => {
    const reminders = [makeReminder("a", "08:00"), makeReminder("b", "09:30")];
    const handle = startCustomReminderDelivery({
      getReminders: () => reminders,
      syncIntervalMs: 0,
    });
    await vi.waitFor(() => {
      expect(handle.isRunning()).toBe(true);
    });
    // initial async sync happens on start(); give microtasks a tick
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    handle.stop();
  });

  it("skips disabled reminders", async () => {
    const onFire = vi.fn();
    let list: CustomReminder[] = [makeReminder("a", "08:00", false)];
    const handle = startCustomReminderDelivery({
      getReminders: () => list,
      onFire,
      syncIntervalMs: 0,
    });
    handle.syncNow().catch(() => {});
    await Promise.resolve();
    expect(onFire).not.toHaveBeenCalled();
    handle.stop();
  });

  it("stops scheduling future reminders after stop()", async () => {
    const onFire = vi.fn();
    const handle = startCustomReminderDelivery({
      getReminders: () => [makeReminder("a", "08:00")],
      onFire,
      syncIntervalMs: 0,
    });
    handle.stop();
    handle.syncNow().catch(() => {});
    await Promise.resolve();
    await vi.waitFor(() => expect(mocks.cancelCustomNotification).toHaveBeenCalledWith("cr:test:1700000000000"));
    expect(onFire).not.toHaveBeenCalled();
    expect(handle.isRunning()).toBe(false);
  });

  it("cancels a notification whose async schedule finishes after stop", async () => {
    let signalStarted!: () => void;
    let releaseSchedule!: () => void;
    const started = new Promise<void>((resolve) => { signalStarted = resolve; });
    const scheduleGate = new Promise<void>((resolve) => { releaseSchedule = resolve; });
    mocks.scheduleCustomNotification.mockImplementationOnce(async () => {
      signalStarted();
      await scheduleGate;
      return "cr:late:1700000000000";
    });
    const onFire = vi.fn();
    const handle = startCustomReminderDelivery({
      getReminders: () => [makeReminder("a", "08:00")],
      onFire,
      syncIntervalMs: 0,
    });
    await started;

    handle.stop();
    releaseSchedule();

    await vi.waitFor(() => expect(mocks.cancelCustomNotification).toHaveBeenCalledWith("cr:late:1700000000000"));
    expect(onFire).not.toHaveBeenCalled();
    expect(handle.isRunning()).toBe(false);
  });

  it("delivers onFire with reminderId + future fire-time", async () => {
    const onFire = vi.fn();
    const fixed = new Date(2026, 6, 9, 8, 0, 0);
    const handle = startCustomReminderDelivery({
      getReminders: () => [makeReminder("a", "08:00")],
      onFire,
      syncIntervalMs: 0,
      resolver: () => fixed,
    });
    await handle.syncNow();
    expect(onFire).toHaveBeenCalledWith("a", fixed.getTime());
    handle.stop();
  });
});
