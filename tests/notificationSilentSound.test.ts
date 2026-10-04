import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  capacitor: {
    isNativePlatform: vi.fn(() => true),
    getPlatform: vi.fn(() => "ios"),
  },
  quietChannelCreate: vi.fn(async (_options: unknown) => undefined),
  cancelAllCustomNotifications: vi.fn(async (_options: {
    clearDelivered?: boolean;
    requestedAtMs?: number;
    stillCurrent?: () => boolean;
  }) => undefined),
  localNotifications: {
    cancel: vi.fn(async (_options: unknown) => undefined),
    checkPermissions: vi.fn(async () => ({ display: "granted" })),
    schedule: vi.fn(async (_options: unknown) => ({ notifications: [] })),
    removeAllDeliveredNotifications: vi.fn(async () => undefined),
  },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: mocks.capacitor,
  registerPlugin: vi.fn(() => ({ create: mocks.quietChannelCreate })),
}));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: mocks.localNotifications }));
vi.mock("@/lib/customReminderNotifications", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/customReminderNotifications")>()),
  cancelAllCustomNotifications: mocks.cancelAllCustomNotifications,
}));

import {
  beginAccountReminderTransition,
  buildPrayerNotificationsForDays,
  cancelRemindersForAccountSwitch,
  completeAccountReminderTransition,
  syncReminders,
} from "@/lib/reminders";
import { NOTIFICATION_ACTION_TYPES, REMINDER_ACTION_TYPE_ID, CUSTOM_REMINDER_ACTION_TYPE_ID } from "@/lib/notificationActionTypes";
import type { Reminders } from "@/store/noorStore";
import { setAccountStorageOwner } from "@/lib/accountStorageScope";

const PRAYER_ALERTS = { Fajr: true, Dhuhr: false, Asr: false, Maghrib: false, Isha: false };

function scheduledNotifications(): Array<Record<string, unknown>> {
  const request = mocks.localNotifications.schedule.mock.calls.at(-1)?.[0] as {
    notifications: Array<Record<string, unknown>>;
  } | undefined;
  return request?.notifications ?? [];
}

function adhkarReminders(): Reminders {
  return {
    enabled: true,
    morningEnabled: true,
    morningTime: "08:00",
    eveningEnabled: false,
    eveningTime: "18:00",
    dailyWirdEnabled: false,
    dailyWirdTime: "12:00",
    khatmaEnabled: false,
    khatmaTime: "13:00",
    tasbeehEnabled: false,
    tasbeehTime: "14:00",
    prayerAlertsEnabled: false,
    prayerAlerts: PRAYER_ALERTS,
    dailyHadithNotif: false,
    soundProfile: "rain_calm",
    prayerSoundProfile: "adhan_haram",
  } as Reminders;
}

beforeEach(() => {
  completeAccountReminderTransition();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 2, 7, 0, 0));
  mocks.capacitor.isNativePlatform.mockReturnValue(true);
  mocks.capacitor.getPlatform.mockReturnValue("ios");
  mocks.quietChannelCreate.mockClear();
  mocks.cancelAllCustomNotifications.mockClear();
  mocks.localNotifications.cancel.mockClear();
  mocks.localNotifications.removeAllDeliveredNotifications.mockClear();
  mocks.localNotifications.checkPermissions.mockResolvedValue({ display: "granted" });
  mocks.localNotifications.schedule.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  completeAccountReminderTransition();
  setAccountStorageOwner("local");
  vi.unstubAllGlobals();
});

describe("silent native notification sound payloads", () => {
  it("uses a neutral snooze label when reminder snooze durations can vary", () => {
    const reminderSnooze = NOTIFICATION_ACTION_TYPES.find((type) => type.id === REMINDER_ACTION_TYPE_ID)?.actions[0];
    const customSnooze = NOTIFICATION_ACTION_TYPES.find((type) => type.id === CUSTOM_REMINDER_ACTION_TYPE_ID)
      ?.actions.find((action) => action.id === "snooze");

    expect(reminderSnooze?.title).toBe("تأجيل التذكير");
    expect(customSnooze?.title).toBe("تأجيل التذكير");
  });

  it("omits sound from iOS prayer follow-up and daily Hadith notifications", () => {
    const notifications = buildPrayerNotificationsForDays(
      [{ dateISO: "2026-10-03", timings: { Fajr: "05:01" } }],
      { channelId: "adhan", soundFile: "adhan.caf" },
      PRAYER_ALERTS,
      { channelId: "quiet" },
      { includeDailyHadith: true, now: new Date(2026, 9, 2, 7, 0, 0) },
    );
    const quietNotifications = notifications.filter((notification) =>
      notification.title === "أثر — تذكير لطيف" || notification.title === "أثر — حديث اليوم ﷺ",
    );

    expect(quietNotifications).toHaveLength(2);
    expect(quietNotifications.every((notification) => !Object.hasOwn(notification, "sound"))).toBe(true);
  });

  it("omits sound from iOS adhkar notifications", async () => {
    await syncReminders(adhkarReminders());

    const morning = scheduledNotifications().find((notification) =>
      (notification.extra as { reminderKey?: string } | undefined)?.reminderKey === "morning",
    );
    expect(morning).toBeDefined();
    expect(morning).not.toHaveProperty("sound");
  });

  it("keeps the empty sound field used by Android's explicitly silent channel", async () => {
    mocks.capacitor.getPlatform.mockReturnValue("android");

    await syncReminders(adhkarReminders());

    const morning = scheduledNotifications().find((notification) =>
      (notification.extra as { reminderKey?: string } | undefined)?.reminderKey === "morning",
    );
    expect(mocks.quietChannelCreate).toHaveBeenCalledOnce();
    expect(morning).toHaveProperty("sound", "");
  });

  it("uses a local calendar time for recurring adhkar reminders", async () => {
    await syncReminders(adhkarReminders());

    const morning = scheduledNotifications().find((notification) =>
      (notification.extra as { reminderKey?: string } | undefined)?.reminderKey === "morning",
    );
    expect(morning?.schedule).toEqual({ on: { hour: 8, minute: 0, second: 0 } });
  });

  it("preserves the configured clock through a Cairo DST gap", async () => {
    const previousTimeZone = process.env.TZ;
    process.env.TZ = "Africa/Cairo";
    try {
      vi.setSystemTime(new Date("2026-04-23T13:00:00.000Z"));
      await syncReminders({ ...adhkarReminders(), morningTime: "0:30" });

      const morning = scheduledNotifications().find((notification) =>
        (notification.extra as { reminderKey?: string } | undefined)?.reminderKey === "morning",
      );
      expect(morning?.extra).toMatchObject({ reminderTime: "00:30" });
      expect(morning?.schedule).toEqual({ on: { hour: 0, minute: 30, second: 0 } });
    } finally {
      if (previousTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimeZone;
    }
  });

  it("defers a completed morning reminder to tomorrow without an iOS interval repeat", async () => {
    await syncReminders(adhkarReminders(), undefined, { morningDone: true });

    const morning = scheduledNotifications().find((notification) =>
      (notification.extra as { reminderKey?: string } | undefined)?.reminderKey === "morning",
    );
    expect(morning?.schedule).toEqual({ at: new Date(2026, 9, 3, 8, 0, 0) });
  });

  it("keeps Android completed-reminder recurrence on its daily interval", async () => {
    mocks.capacitor.getPlatform.mockReturnValue("android");
    await syncReminders(adhkarReminders(), undefined, { morningDone: true });

    const morning = scheduledNotifications().find((notification) =>
      (notification.extra as { reminderKey?: string } | undefined)?.reminderKey === "morning",
    );
    expect(morning?.schedule).toEqual({
      at: new Date(2026, 9, 3, 8, 0, 0),
      repeats: true,
      every: "day",
    });
  });

  it("binds built-in notification actions to the account that scheduled them", async () => {
    setAccountStorageOwner("user:notification-owner");

    await syncReminders(adhkarReminders());

    const morning = scheduledNotifications().find((notification) =>
      (notification.extra as { reminderKey?: string } | undefined)?.reminderKey === "morning",
    );
    expect(morning?.extra).toMatchObject({ accountOwner: "user:notification-owner" });
  });

  it("finishes an older in-flight schedule before cancelling it for the next account", async () => {
    const events: string[] = [];
    let signalScheduleStarted!: () => void;
    let releaseSchedule!: () => void;
    const scheduleStarted = new Promise<void>((resolve) => { signalScheduleStarted = resolve; });
    const scheduleGate = new Promise<void>((resolve) => { releaseSchedule = resolve; });
    mocks.localNotifications.schedule.mockImplementationOnce(async () => {
      signalScheduleStarted();
      await scheduleGate;
      events.push("previous schedule finished");
      return { notifications: [] };
    });

    setAccountStorageOwner("user:previous");
    const previousSync = syncReminders(adhkarReminders());
    await scheduleStarted;
    mocks.localNotifications.cancel.mockImplementation(async () => {
      events.push("next account cancel");
      return { notifications: [] };
    });

    setAccountStorageOwner("user:next");
    const nextSync = syncReminders({ ...adhkarReminders(), enabled: false });
    vi.useRealTimers();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(events).toEqual([]);

    releaseSchedule();
    await Promise.all([previousSync, nextSync]);
    expect(events).toEqual(["previous schedule finished", "next account cancel"]);
  });

  it("cancels outgoing built-in reminders before the next account can hydrate", async () => {
    const events: string[] = [];
    let signalScheduleStarted!: () => void;
    let releaseSchedule!: () => void;
    const scheduleStarted = new Promise<void>((resolve) => { signalScheduleStarted = resolve; });
    const scheduleGate = new Promise<void>((resolve) => { releaseSchedule = resolve; });
    mocks.localNotifications.cancel.mockImplementation(async (options: unknown) => {
      const notifications = (options as { notifications: Array<{ id: number }> }).notifications;
      events.push(notifications.some(({ id }) => id === 9111) ? "cancel-all-reminders" : "cancel-current-schedule");
      return { notifications: [] };
    });
    mocks.localNotifications.removeAllDeliveredNotifications.mockImplementation(async () => {
      events.push("remove-delivered-reminders");
    });
    mocks.cancelAllCustomNotifications.mockImplementation(async ({ clearDelivered }) => {
      events.push(`cancel-custom-reminders:${String(clearDelivered)}`);
    });
    mocks.localNotifications.schedule.mockImplementationOnce(async () => {
      signalScheduleStarted();
      await scheduleGate;
      events.push("previous schedule finished");
      return { notifications: [] };
    });

    setAccountStorageOwner("user:previous");
    const previousSync = syncReminders(adhkarReminders());
    await scheduleStarted;

    beginAccountReminderTransition();
    const cancelForSwitch = cancelRemindersForAccountSwitch("user:next");
    expect(events).toEqual(["cancel-current-schedule"]);

    releaseSchedule();
    await Promise.all([previousSync, cancelForSwitch]);

    expect(events).toEqual([
      "cancel-current-schedule",
      "previous schedule finished",
      "cancel-all-reminders",
      "remove-delivered-reminders",
      "cancel-custom-reminders:false",
    ]);
    expect(mocks.localNotifications.cancel.mock.calls.at(-1)?.[0]).toMatchObject({
      notifications: expect.arrayContaining([{ id: 9111 }]),
    });
  });

  it("preserves delivered reminders when the persisted notification owner matches", async () => {
    const stored = new Map<string, string>([["athar:reminder-owner", "user:previous"]]);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
    });

    await cancelRemindersForAccountSwitch("user:previous");

    expect(mocks.localNotifications.removeAllDeliveredNotifications).not.toHaveBeenCalled();
    expect(mocks.cancelAllCustomNotifications).toHaveBeenCalledWith(expect.objectContaining({
      clearDelivered: false,
      sourceOwner: "user:previous",
      targetOwner: "user:previous",
      requestedAtMs: expect.any(Number),
      stillCurrent: expect.any(Function),
    }));
  });

  it("records the settled reminder owner before a later account transition starts", async () => {
    const stored = new Map<string, string>([["athar:reminder-owner", "user:a"]]);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
    });

    await cancelRemindersForAccountSwitch("user:b");
    await cancelRemindersForAccountSwitch("user:c");

    expect(mocks.cancelAllCustomNotifications.mock.calls).toEqual([
      [expect.objectContaining({
        clearDelivered: false,
        sourceOwner: "user:a",
        targetOwner: "user:b",
        requestedAtMs: expect.any(Number),
        stillCurrent: expect.any(Function),
      })],
      [expect.objectContaining({
        clearDelivered: false,
        sourceOwner: "user:b",
        targetOwner: "user:c",
        requestedAtMs: expect.any(Number),
        stillCurrent: expect.any(Function),
      })],
    ]);
    expect(mocks.cancelAllCustomNotifications.mock.calls[1][0].requestedAtMs)
      .toBeGreaterThan(mocks.cancelAllCustomNotifications.mock.calls[0][0].requestedAtMs);
    expect(stored.get("athar:reminder-owner")).toBe("user:c");
  });

  it("keeps account hydration blocked when delivered-reminder cleanup fails", async () => {
    mocks.localNotifications.removeAllDeliveredNotifications.mockRejectedValueOnce(new Error("delivered cleanup failed"));

    await expect(cancelRemindersForAccountSwitch("user:next")).rejects.toThrow("delivered cleanup failed");
    expect(mocks.cancelAllCustomNotifications).not.toHaveBeenCalled();
  });
});
