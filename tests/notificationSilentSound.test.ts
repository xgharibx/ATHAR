import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  capacitor: {
    isNativePlatform: vi.fn(() => true),
    getPlatform: vi.fn(() => "ios"),
  },
  quietChannelCreate: vi.fn(async (_options: unknown) => undefined),
  localNotifications: {
    cancel: vi.fn(async (_options: unknown) => undefined),
    checkPermissions: vi.fn(async () => ({ display: "granted" })),
    schedule: vi.fn(async (_options: unknown) => ({ notifications: [] })),
  },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: mocks.capacitor,
  registerPlugin: vi.fn(() => ({ create: mocks.quietChannelCreate })),
}));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: mocks.localNotifications }));

import { buildPrayerNotificationsForDays, syncReminders } from "@/lib/reminders";
import type { Reminders } from "@/store/noorStore";

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
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 2, 7, 0, 0));
  mocks.capacitor.isNativePlatform.mockReturnValue(true);
  mocks.capacitor.getPlatform.mockReturnValue("ios");
  mocks.quietChannelCreate.mockClear();
  mocks.localNotifications.cancel.mockClear();
  mocks.localNotifications.checkPermissions.mockResolvedValue({ display: "granted" });
  mocks.localNotifications.schedule.mockClear();
});

afterEach(() => vi.useRealTimers());

describe("silent native notification sound payloads", () => {
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
});
