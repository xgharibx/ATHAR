import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  capacitor: {
    isNativePlatform: vi.fn(() => true),
    getPlatform: vi.fn(() => "android"),
  },
  topUp: {
    configure: vi.fn(async (_options: unknown) => ({ queued: 0 })),
    clear: vi.fn(async () => undefined),
    create: vi.fn(async () => undefined),
  },
  localNotifications: {
    cancel: vi.fn(async (_options: unknown) => undefined),
    checkPermissions: vi.fn(async () => ({ display: "granted" })),
    schedule: vi.fn(async (_options: unknown) => ({ notifications: [] })),
    createChannel: vi.fn(async (_options: unknown) => undefined),
    getPending: vi.fn(async () => ({ notifications: [] as Array<{ id: number; extra?: unknown }> })),
  },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: mocks.capacitor,
  registerPlugin: vi.fn(() => mocks.topUp),
}));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: mocks.localNotifications }));

import { buildPrayerNotificationsForDays, buildPrayerTopUpPlanForSync, syncReminders } from "@/lib/reminders";
import { computeLocalPrayerTimings } from "@/lib/localPrayerTimes";
import { TOP_UP_PLAN_DAYS, type PrayerTopUpPlan } from "@/lib/prayerTopUp";
import type { Reminders } from "@/store/noorStore";
import { useNoorStore } from "@/store/noorStore";

const AUDIO = { channelId: "athar-prayer-adhan", soundFile: "adhan.mp3" };
const ALL = { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true };
const WEEK_TIMINGS = { Fajr: "05:00", Dhuhr: "12:00", Asr: "15:00", Maghrib: "18:00", Isha: "20:00" };

function reminders(overrides: Partial<Reminders> = {}): Reminders {
  return {
    enabled: true,
    morningEnabled: false,
    morningTime: "08:00",
    eveningEnabled: false,
    eveningTime: "18:00",
    dailyWirdEnabled: false,
    dailyWirdTime: "12:00",
    khatmaEnabled: false,
    khatmaTime: "13:00",
    tasbeehEnabled: false,
    tasbeehTime: "14:00",
    prayerAlertsEnabled: true,
    prayerAlerts: ALL,
    dailyHadithNotif: false,
    soundProfile: "birds",
    prayerSoundProfile: "adhan_ahmad_al_nafees",
    ...overrides,
  } as Reminders;
}

function lastPlan(): PrayerTopUpPlan {
  const options = mocks.topUp.configure.mock.calls.at(-1)?.[0] as { plan: PrayerTopUpPlan } | undefined;
  if (!options) throw new Error("configure was not called");
  return options.plan;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 2, 7, 0, 0));
  mocks.capacitor.getPlatform.mockReturnValue("android");
  mocks.topUp.configure.mockClear();
  mocks.topUp.clear.mockClear();
  mocks.localNotifications.schedule.mockClear();
  mocks.localNotifications.cancel.mockClear();
  mocks.localNotifications.getPending.mockReset().mockResolvedValue({ notifications: [] });
  useNoorStore.setState({ prayerLog: {} });
});

describe("prayer alerts that keep coming while the app is closed", () => {
  it("plans a year of offline times after the app's own week, for the enabled prayers only", () => {
    useNoorStore.setState((state) => ({ prefs: { ...state.prefs, prayerCalcMethod: 4, asrMadhab: 1 } }));
    const plan = buildPrayerTopUpPlanForSync("2026-10-08", AUDIO, { ...ALL, Asr: false }, "local");
    expect(plan).not.toBeNull();
    expect(plan!.scheduledThrough).toBe("2026-10-08");
    expect(plan!.days).toHaveLength(TOP_UP_PLAN_DAYS);
    expect(plan!.days[0].d).toBe("2026-10-09");
    expect(plan!.windowDays).toBe(10);
    expect(Object.keys(plan!.templates).sort()).toEqual(["Dhuhr", "Fajr", "Isha", "Maghrib"]);
    expect(plan!.templates.Fajr).toMatchObject({
      baseId: 9201,
      notification: {
        title: "صلاة الفجر",
        body: "الصلاة خيرٌ من النوم · {time}",
        channelId: AUDIO.channelId,
        sound: AUDIO.soundFile,
        actionTypeId: "PRAYER_ACTIONS",
        extra: { prayerName: "Fajr", atharTopUp: true, accountOwner: "local" },
      },
    });
    // Same calculation, method and madhab as the app's own offline times (Cairo by default).
    const expected = computeLocalPrayerTimings(30.0444, 31.2357, new Date(2026, 9, 9, 12), 4, 1);
    expect(plan!.days[0].t).toEqual({
      Fajr: expected.Fajr, Dhuhr: expected.Dhuhr, Asr: expected.Asr, Maghrib: expected.Maghrib, Isha: expected.Isha,
    });
  });

  it("returns no plan when every prayer alert is off", () => {
    const none = { Fajr: false, Dhuhr: false, Asr: false, Maghrib: false, Isha: false };
    expect(buildPrayerTopUpPlanForSync("2026-10-08", AUDIO, none, "local")).toBeNull();
  });

  it("gives each date the same ids the app uses, and no two dates in the window share one", () => {
    const plan = buildPrayerTopUpPlanForSync("2026-10-01", AUDIO, ALL, "local", { planDays: 40 })!;
    for (const day of plan.days.slice(0, 12)) {
      const [appFajr] = buildPrayerNotificationsForDays(
        [{ dateISO: day.d, timings: { Fajr: "05:00" } }], AUDIO, { ...ALL, Dhuhr: false, Asr: false, Maghrib: false, Isha: false },
        AUDIO, { now: new Date(2026, 8, 1) },
      );
      expect(plan.templates.Fajr!.baseId + day.s * plan.slotOffset).toBe(appFajr.id);
    }
    for (let start = 0; start + plan.windowDays <= plan.days.length; start += 1) {
      const slots = plan.days.slice(start, start + plan.windowDays).map((day) => day.s);
      expect(new Set(slots).size).toBe(plan.windowDays);
    }
    // Every id stays inside the prayer block.
    const ids = plan.days.flatMap((day) => Object.values(plan.templates).map((t) => t!.baseId + day.s * plan.slotOffset));
    expect(Math.min(...ids)).toBeGreaterThanOrEqual(9201);
    expect(Math.max(...ids)).toBeLessThan(9300);
  });

  it("hands the phone the plan right after the app queues its week", async () => {
    const later = [2, 3, 4, 5, 6].map((offset) => ({ dateISO: `2026-10-0${2 + offset}`, timings: WEEK_TIMINGS }));
    await syncReminders(reminders(), WEEK_TIMINGS, undefined, WEEK_TIMINGS, later);
    expect(mocks.localNotifications.schedule).toHaveBeenCalled();
    const plan = lastPlan();
    expect(plan.scheduledThrough).toBe("2026-10-08");
    expect(plan.days[0].d).toBe("2026-10-09");
  });

  it("continues from the day after the last queued day when only today is known", async () => {
    await syncReminders(reminders(), WEEK_TIMINGS);
    expect(lastPlan().scheduledThrough).toBe("2026-10-02");
  });

  it("stops the phone's own queuing when prayer alerts are turned off", async () => {
    await syncReminders(reminders({ prayerAlertsEnabled: false }), WEEK_TIMINGS);
    expect(mocks.topUp.clear).toHaveBeenCalled();
    expect(mocks.topUp.configure).not.toHaveBeenCalled();

    mocks.topUp.clear.mockClear();
    await syncReminders(reminders({ enabled: false, prayerAlertsEnabled: false }), WEEK_TIMINGS);
    expect(mocks.topUp.clear).toHaveBeenCalled();
  });

  it("keeps the Adhan when only the daily reminders are turned off", async () => {
    await syncReminders(reminders({ enabled: false }), WEEK_TIMINGS);
    expect(mocks.topUp.clear).not.toHaveBeenCalled();
    expect(mocks.topUp.configure).toHaveBeenCalled();
  });

  it("on iPhone, does not let the phone's own days crowd out the app's week", async () => {
    mocks.capacitor.getPlatform.mockReturnValue("ios");
    // 55 alerts the phone queued itself for later days: they must not count.
    mocks.localNotifications.getPending.mockResolvedValue({
      notifications: Array.from({ length: 55 }, (_, index) => ({ id: 1000 + index, extra: { atharTopUp: true } })),
    });
    const later = [2, 3, 4, 5, 6].map((offset) => ({ dateISO: `2026-10-0${2 + offset}`, timings: WEEK_TIMINGS }));
    await syncReminders(reminders(), WEEK_TIMINGS, undefined, WEEK_TIMINGS, later);
    const request = mocks.localNotifications.schedule.mock.calls.at(-1)?.[0] as { notifications: Array<{ extra?: { dateISO?: string } }> };
    const dates = new Set(request.notifications.map((n) => n.extra?.dateISO));
    expect(dates.has("2026-10-08")).toBe(true);
    expect(lastPlan().scheduledThrough).toBe("2026-10-08");
  });
});

describe("native top-up wiring", () => {
  const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

  it("registers the plugin and the background work on Android", () => {
    const activity = read("android/app/src/main/java/com/athar/adhkar/AtharActivity.java");
    expect(activity).toContain("registerPlugin(PrayerTopUpPlugin.class)");
    expect(activity).toContain("PrayerTopUp.ensureScheduled(this)");
    const core = read("android/app/src/main/java/com/athar/adhkar/PrayerTopUp.java");
    for (const key of ["scheduledThrough", "slotOffset", "windowDays", "templates", "baseId", "atharWallClockOnce", "allowWhileIdle"]) {
      expect(core).toContain(`"${key}"`);
    }
    // Same plugin, same alerts: queued through Capacitor's own manager without dismissing visible ones.
    expect(core).toContain("manager.schedule(null, notifications, false)");
  });

  it("registers the plugin, background refresh and project file on iPhone", () => {
    expect(read("ios/App/App/AtharBridgeViewController.swift")).toContain("registerPluginInstance(PrayerTopUpPlugin())");
    const swift = read("ios/App/App/PrayerTopUp.swift");
    const identifier = /taskIdentifier = "([^"]+)"/.exec(swift)?.[1];
    expect(identifier).toBeTruthy();
    const plist = read("ios/App/App/Info.plist");
    expect(plist).toContain(`<string>${identifier}</string>`);
    expect(plist).toMatch(/UIBackgroundModes<\/key>\s*<array>[\s\S]*<string>fetch<\/string>/);
    expect(read("ios/App/App/AppDelegate.swift")).toContain("PrayerTopUp.registerBackgroundTask()");
    expect(read("ios/App/App.xcodeproj/project.pbxproj")).toContain("PrayerTopUp.swift in Sources");
    // The same userInfo shape as Capacitor's notifications, and the same budget as the app.
    expect(swift).toContain('"cap_extra": extra');
    expect(swift).toContain("budget = 60");
  });
});
