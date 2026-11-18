import fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  platform: "android",
  granted: true,
  configure: vi.fn(async (_options: unknown) => ({ queued: 0 })),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => mocks.platform },
  registerPlugin: vi.fn((name: string) => {
    if (name === "PrayerSilence") return { status: vi.fn(async () => ({ granted: mocks.granted })) };
    if (name === "AdhanAlarm") return { status: vi.fn(async () => ({ available: false, authorized: false })) };
    return { configure: mocks.configure, clear: vi.fn(async () => undefined), create: vi.fn() };
  }),
}));
vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    cancel: vi.fn(async () => undefined),
    checkPermissions: vi.fn(async () => ({ display: "granted" })),
    schedule: vi.fn(async () => ({ notifications: [] })),
    createChannel: vi.fn(async () => undefined),
    getPending: vi.fn(async () => ({ notifications: [] })),
  },
}));

import { prayerSilencePreferences } from "@/lib/prayerSilence";
import { syncReminders } from "@/lib/reminders";
import type { PrayerTopUpPlan } from "@/lib/prayerTopUp";
import type { Reminders } from "@/store/noorStore";
import { useNoorStore } from "@/store/noorStore";

const TIMES = { Fajr: "05:00", Dhuhr: "12:00", Asr: "15:00", Maghrib: "18:00", Isha: "20:00" };

function reminders(prayerSilence?: Reminders["prayerSilence"]): Reminders {
  return {
    enabled: true, morningEnabled: false, morningTime: "08:00", eveningEnabled: false, eveningTime: "18:00",
    dailyWirdEnabled: false, dailyWirdTime: "12:00", khatmaEnabled: false, khatmaTime: "13:00",
    tasbeehEnabled: false, tasbeehTime: "14:00", prayerAlertsEnabled: true,
    prayerAlerts: { Fajr: true, Dhuhr: true, Asr: false, Maghrib: true, Isha: true },
    dailyHadithNotif: false, soundProfile: "birds", prayerSoundProfile: "adhan_ahmad_al_nafees", prayerSilence,
  } as Reminders;
}

const lastPlan = () => (mocks.configure.mock.calls.at(-1)?.[0] as { plan: PrayerTopUpPlan }).plan;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 2, 7, 0, 0));
  mocks.platform = "android";
  mocks.granted = true;
  mocks.configure.mockClear();
  useNoorStore.setState({ prayerLog: {} });
});

describe("silence the phone during prayer", () => {
  it("is off by default, with a sensible length", () => {
    expect(prayerSilencePreferences({})).toEqual({ enabled: false, minutes: 20 });
    expect(prayerSilencePreferences({ prayerSilence: { enabled: true, minutes: 999 } }).minutes).toBe(20);
    expect(prayerSilencePreferences({ prayerSilence: { enabled: true, minutes: 30 } }).minutes).toBe(30);
  });

  it("hands Android the minutes and the prayers that have alerts", async () => {
    await syncReminders(reminders({ enabled: true, minutes: 30 }), TIMES, undefined, TIMES);
    expect(lastPlan().silence).toMatchObject({ minutes: 30, prayers: ["Fajr", "Dhuhr", "Maghrib", "Isha"] });
    expect(lastPlan().silence!.appDays.map((day) => day.d)).toEqual(["2026-10-02", "2026-10-03"]);
  });

  it("does nothing without Do Not Disturb access, when off, or on iPhone", async () => {
    mocks.granted = false;
    await syncReminders(reminders({ enabled: true, minutes: 20 }), TIMES);
    expect(lastPlan().silence).toBeNull();
    mocks.granted = true;
    await syncReminders(reminders(), TIMES);
    expect(lastPlan().silence).toBeNull();
    mocks.platform = "ios";
    await syncReminders(reminders({ enabled: true, minutes: 20 }), TIMES);
    expect(lastPlan().silence).toBeNull();
  });

  it("is wired on Android and restores only its own change", () => {
    const silence = fs.readFileSync("android/app/src/main/java/com/athar/adhkar/PrayerSilence.java", "utf8");
    expect(silence).toContain("INTERRUPTION_FILTER_PRIORITY");
    expect(silence).toContain("manager.getCurrentInterruptionFilter() == NotificationManager.INTERRUPTION_FILTER_PRIORITY");
    expect(silence).toContain("current != NotificationManager.INTERRUPTION_FILTER_ALL");
    const manifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
    expect(manifest).toContain("android.permission.ACCESS_NOTIFICATION_POLICY");
    expect(manifest).toContain('android:name=".PrayerSilence"');
    expect(fs.readFileSync("android/app/src/main/java/com/athar/adhkar/PrayerTopUp.java", "utf8")).toContain("PrayerSilence.sync(context)");
    expect(fs.readFileSync("android/app/src/main/java/com/athar/adhkar/AtharActivity.java", "utf8")).toContain("registerPlugin(PrayerSilencePlugin.class)");
  });
});
