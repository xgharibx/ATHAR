import fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  platform: "android",
  status: { available: true, authorized: true } as { available: boolean; authorized: boolean },
  configure: vi.fn(async (_options: unknown) => ({ queued: 0 })),
  clear: vi.fn(async () => undefined),
  schedule: vi.fn(async (_options: unknown) => ({ notifications: [] })),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => mocks.platform },
  registerPlugin: vi.fn((name: string) => name === "AdhanAlarm"
    ? { status: vi.fn(async () => mocks.status) }
    : { configure: mocks.configure, clear: mocks.clear, create: vi.fn() }),
}));
vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    cancel: vi.fn(async () => undefined),
    checkPermissions: vi.fn(async () => ({ display: "granted" })),
    schedule: mocks.schedule,
    createChannel: vi.fn(async () => undefined),
    getPending: vi.fn(async () => ({ notifications: [] })),
  },
}));

import { alarmPrayers, adhanAlarmPreferences } from "@/lib/adhanAlarm";
import { syncReminders } from "@/lib/reminders";
import type { PrayerTopUpPlan } from "@/lib/prayerTopUp";
import type { Reminders } from "@/store/noorStore";
import { useNoorStore } from "@/store/noorStore";

const ALL = { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true };
const TIMES = { Fajr: "05:00", Dhuhr: "12:00", Asr: "15:00", Maghrib: "18:00", Isha: "20:00" };

function reminders(adhanAlarm?: Reminders["adhanAlarm"]): Reminders {
  return {
    enabled: true, morningEnabled: false, morningTime: "08:00", eveningEnabled: false, eveningTime: "18:00",
    dailyWirdEnabled: false, dailyWirdTime: "12:00", khatmaEnabled: false, khatmaTime: "13:00",
    tasbeehEnabled: false, tasbeehTime: "14:00", prayerAlertsEnabled: true, prayerAlerts: ALL,
    dailyHadithNotif: false, soundProfile: "birds", prayerSoundProfile: "adhan_ahmad_al_nafees", adhanAlarm,
  } as Reminders;
}

const lastPlan = () => (mocks.configure.mock.calls.at(-1)?.[0] as { plan: PrayerTopUpPlan }).plan;
const scheduled = () => (mocks.schedule.mock.calls.at(-1)?.[0] as { notifications: Array<{ channelId?: string; extra?: { prayerName?: string; dateISO?: string }; title: string }> }).notifications;
const adhanFor = (prayer: string) => scheduled().find((n) => n.title === "أثر — الأذان" && n.extra?.prayerName === prayer && n.extra?.dateISO === "2026-10-03");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 2, 7, 0, 0));
  mocks.platform = "android";
  mocks.status = { available: true, authorized: true };
  mocks.configure.mockClear();
  mocks.schedule.mockClear();
  useNoorStore.setState({ prayerLog: {} });
});

describe("the Adhan as a real alarm", () => {
  it("is off by default and rings for Fajr once turned on", () => {
    expect(adhanAlarmPreferences({}).enabled).toBe(false);
    const on = reminders({ enabled: true, prayers: { Fajr: true, Dhuhr: false, Asr: false, Maghrib: false, Isha: false } });
    expect(alarmPrayers(on, { available: true, authorized: true })).toEqual(["Fajr"]);
    expect(alarmPrayers(on, { available: true, authorized: false })).toEqual([]);
    expect(alarmPrayers(on, { available: false, authorized: false })).toEqual([]);
    expect(alarmPrayers({ ...on, prayerAlerts: { ...ALL, Fajr: false } }, { available: true, authorized: true })).toEqual([]);
  });

  it("hands the phone the alarm plan and silences that prayer's notification", async () => {
    await syncReminders(reminders({ enabled: true, prayers: { Fajr: true, Dhuhr: false, Asr: false, Maghrib: false, Isha: false } }), TIMES, undefined, TIMES);
    const plan = lastPlan();
    expect(plan.alarm).toMatchObject({
      prayers: ["Fajr"],
      sound: { ios: "adhan_ahmad_al_nafees.caf", android: "adhan_ahmad_al_nafees" },
      names: { Fajr: "الفجر" },
    });
    expect(plan.alarm!.appDays.map((day) => day.d)).toEqual(["2026-10-02", "2026-10-03"]);
    expect(plan.alarm!.appDays[1].t.Fajr).toBe("05:00");
    // No double Adhan: Fajr's alert is silent, the others keep the Adhan.
    expect(adhanFor("Fajr")?.channelId).not.toBe(adhanFor("Dhuhr")?.channelId);
    expect(plan.templates.Fajr!.notification.channelId).toBe(adhanFor("Fajr")?.channelId);
    expect(plan.templates.Dhuhr!.notification.channelId).toBe(adhanFor("Dhuhr")?.channelId);
  });

  it("keeps the Adhan in the notification when the alarm is off or not allowed", async () => {
    await syncReminders(reminders(), TIMES, undefined, TIMES);
    expect(lastPlan().alarm).toBeNull();
    const loud = adhanFor("Fajr")?.channelId;

    mocks.status = { available: true, authorized: false };
    await syncReminders(reminders({ enabled: true, prayers: { Fajr: true, Dhuhr: false, Asr: false, Maghrib: false, Isha: false } }), TIMES, undefined, TIMES);
    expect(lastPlan().alarm).toBeNull();
    expect(adhanFor("Fajr")?.channelId).toBe(loud);
  });
});

describe("the alarm on the phones", () => {
  const read = (path: string) => fs.readFileSync(path, "utf8");

  it("Android: an alarm clock that plays the Adhan as an alarm sound with a Stop screen", () => {
    const manifest = read("android/app/src/main/AndroidManifest.xml");
    expect(manifest).toContain('android:name=".AdhanAlarmReceiver"');
    expect(manifest).toMatch(/android:name="\.AdhanAlarmService"[\s\S]*?foregroundServiceType="mediaPlayback"/);
    expect(manifest).toMatch(/android:name="\.AdhanAlarmActivity"[\s\S]*?showWhenLocked="true"/);
    expect(manifest).toContain("android.permission.USE_FULL_SCREEN_INTENT");
    expect(read("android/app/src/main/java/com/athar/adhkar/AdhanAlarm.java")).toContain("setAlarmClock");
    expect(read("android/app/src/main/java/com/athar/adhkar/AdhanAlarmService.java")).toContain("AudioAttributes.USAGE_ALARM");
    expect(read("android/app/src/main/java/com/athar/adhkar/PrayerTopUp.java")).toContain("AdhanAlarm.sync(context)");
    expect(read("android/app/src/main/java/com/athar/adhkar/AtharActivity.java")).toContain("registerPlugin(AdhanAlarmPlugin.class)");
    for (const file of ["values/strings.xml", "values-ar/strings.xml"]) {
      expect(read(`android/app/src/main/res/${file}`)).toContain('name="adhan_alarm_stop"');
    }
  });

  it("iPhone: AlarmKit alarms with the Adhan sound, renewed with the prayer plan", () => {
    const kit = read("ios/App/App/AdhanAlarmKit.swift");
    expect(kit).toContain("import AlarmKit");
    expect(kit).toContain('static let defaultSound = "adhan_ahmad_al_nafees.caf"');
    expect(fs.existsSync("ios/App/App/sounds/adhan_ahmad_al_nafees.caf")).toBe(true);
    expect(read("ios/App/App/PrayerTopUp.swift")).toContain("AdhanAlarmKit.sync(plan:");
    expect(read("ios/App/App/Info.plist")).toContain("<key>NSAlarmKitUsageDescription</key>");
    expect(read("ios/App/App/ar.lproj/InfoPlist.strings")).toContain('"NSAlarmKitUsageDescription"');
    expect(read("ios/App/App/AtharBridgeViewController.swift")).toContain("registerPluginInstance(AdhanAlarmPlugin())");
    const project = read("ios/App/App.xcodeproj/project.pbxproj");
    expect(project).toContain("AdhanAlarmKit.swift in Sources");
    expect(project).toContain("AdhanAlarmPlugin.swift in Sources");
  });
});
