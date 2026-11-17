import { afterEach, describe, expect, it, vi } from "vitest";

const notificationMock = vi.hoisted(() => ({ cancel: vi.fn(async () => undefined) }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" } }));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: { cancel: notificationMock.cancel } }));

import { buildPrayerNotificationsForDays, cancelPrayerFollowUp, fitToNotificationBudget, prayerScheduleDays } from "@/lib/reminders";

const ALL_PRAYERS_ENABLED = {
  Fajr: true,
  Dhuhr: true,
  Asr: true,
  Maghrib: true,
  Isha: true,
};

const LOUD = { channelId: "adhan", soundFile: "adhan.wav" };
const QUIET = { channelId: "quiet", soundFile: "silent.wav" };

afterEach(() => vi.useRealTimers());

describe("native prayer notification schedule horizon", () => {
  it("schedules future prayers and follow-ups for today and tomorrow with date-specific IDs", () => {
    const now = new Date(2026, 9, 2, 8, 0, 0);
    const notifications = buildPrayerNotificationsForDays([
      {
        dateISO: "2026-10-02",
        timings: { Fajr: "05:00", Dhuhr: "12:00", Asr: "15:00", Maghrib: "18:00", Isha: "20:00" },
      },
      {
        dateISO: "2026-10-03",
        timings: { Fajr: "05:01", Dhuhr: "12:01", Asr: "15:01", Maghrib: "18:01", Isha: "20:01" },
      },
    ], LOUD, ALL_PRAYERS_ENABLED, QUIET, { includeDailyHadith: true, now });

    const todayDhuhr = notifications.find((item) => item.title === "أثر — الأذان" && item.extra?.prayerName === "Dhuhr" && item.extra?.dateISO === "2026-10-02");
    const tomorrowFajr = notifications.find((item) => item.title === "أثر — الأذان" && item.extra?.prayerName === "Fajr" && item.extra?.dateISO === "2026-10-03");
    const tomorrowFollowUp = notifications.find((item) => item.title === "أثر — تذكير لطيف" && item.extra?.prayerName === "Fajr" && item.extra?.dateISO === "2026-10-03");
    const tomorrowHadith = notifications.find((item) => item.title === "أثر — حديث اليوم ﷺ");

    expect(todayDhuhr?.schedule.at).toEqual(new Date(2026, 9, 2, 12, 0, 0));
    expect(tomorrowFajr?.schedule.at).toEqual(new Date(2026, 9, 3, 5, 1, 0));
    expect(tomorrowFollowUp?.schedule.at).toEqual(new Date(2026, 9, 3, 5, 31, 0));
    expect(tomorrowHadith?.schedule.at).toEqual(new Date(2026, 9, 3, 5, 1, 0));
    expect(tomorrowFajr?.id).not.toBe(9201);
    expect(tomorrowFollowUp?.id).not.toBe(9301);
    expect(tomorrowHadith?.id).not.toBe(9501);
    expect(notifications.some((item) => item.extra?.prayerName === "Fajr" && item.extra?.dateISO === "2026-10-02")).toBe(false);
  });

  it("does not replay the Adhan for a passed prayer but keeps its pending follow-up", () => {
    const now = new Date(2026, 9, 2, 12, 0, 0);
    const notifications = buildPrayerNotificationsForDays([
      { dateISO: "2026-10-02", timings: { Fajr: "05:00", Dhuhr: "11:59" } },
    ], LOUD, ALL_PRAYERS_ENABLED, QUIET, { now });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe("أثر — تذكير لطيف");
    expect(notifications[0].extra).toMatchObject({ prayerName: "Dhuhr", dateISO: "2026-10-02" });
  });

  it("keeps an uncompleted prayer follow-up when syncing after the Adhan time", () => {
    const now = new Date(2026, 9, 2, 5, 15, 0);
    const notifications = buildPrayerNotificationsForDays([
      { dateISO: "2026-10-02", timings: { Fajr: "05:00" } },
    ], LOUD, ALL_PRAYERS_ENABLED, QUIET, { now });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe("أثر — تذكير لطيف");
    expect(notifications[0].extra).toMatchObject({ prayerName: "Fajr", dateISO: "2026-10-02" });
    expect(notifications[0].schedule.at).toEqual(new Date(2026, 9, 2, 5, 30, 0));
  });

  it("does not recreate a prayer follow-up after it was marked complete", () => {
    const notifications = buildPrayerNotificationsForDays([
      { dateISO: "2026-10-02", timings: { Fajr: "05:00" } },
    ], LOUD, ALL_PRAYERS_ENABLED, QUIET, {
      now: new Date(2026, 9, 2, 5, 15, 0),
      prayerLog: { "2026-10-02": { Fajr: true } },
    });

    expect(notifications).toEqual([]);
  });

  it("cancels the matching date's follow-up when a tomorrow prayer is logged", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 2, 8, 0, 0));
    notificationMock.cancel.mockClear();

    const notifications = buildPrayerNotificationsForDays([
      { dateISO: "2026-10-03", timings: { Fajr: "05:01" } },
    ], LOUD, ALL_PRAYERS_ENABLED, QUIET);
    const tomorrowFollowUp = notifications.find((item) => item.title === "أثر — تذكير لطيف");
    await cancelPrayerFollowUp("Fajr", "2026-10-03");

    expect(notificationMock.cancel).toHaveBeenCalledWith({ notifications: [{ id: tomorrowFollowUp?.id }] });
  });

  it("queues a week of prayer alarms with unique IDs that stay in their blocks", () => {
    const now = new Date(2026, 9, 2, 4, 0, 0);
    const days = Array.from({ length: 7 }, (_, index) => ({
      dateISO: `2026-10-${String(2 + index).padStart(2, "0")}`,
      timings: { Fajr: "05:00", Dhuhr: "12:00", Asr: "15:00", Maghrib: "18:00", Isha: "20:00" },
    }));
    const notifications = buildPrayerNotificationsForDays(days, LOUD, ALL_PRAYERS_ENABLED, QUIET, { includeDailyHadith: true, now });

    const adhans = notifications.filter((item) => item.title === "أثر — الأذان");
    const followUps = notifications.filter((item) => item.title === "أثر — تذكير لطيف");
    const hadiths = notifications.filter((item) => item.title === "أثر — حديث اليوم ﷺ");
    expect(adhans).toHaveLength(35);
    expect(new Set(adhans.map((item) => item.extra?.dateISO)).size).toBe(7);
    expect(new Set(followUps.map((item) => item.extra?.dateISO))).toEqual(new Set(["2026-10-02", "2026-10-03"]));
    expect(hadiths.map((item) => item.extra?.dateISO)).toEqual(["2026-10-02", "2026-10-03"]);

    const ids = notifications.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of adhans) expect(item.id).toBeGreaterThanOrEqual(9201), expect(item.id).toBeLessThan(9300);
    for (const item of followUps) expect(item.id).toBeGreaterThanOrEqual(9301), expect(item.id).toBeLessThan(9400);
    const lastFajr = adhans.find((item) => item.extra?.dateISO === "2026-10-08" && item.extra?.prayerName === "Fajr");
    expect(lastFajr?.schedule.at).toEqual(new Date(2026, 9, 8, 5, 0, 0));
  });

  it("only extends the schedule over consecutive days after tomorrow", () => {
    const timings = { Fajr: "05:00" };
    expect(prayerScheduleDays("2026-10-02", timings).map((day) => day.dateISO)).toEqual(["2026-10-02"]);
    expect(prayerScheduleDays("2026-10-02", timings, null, [{ dateISO: "2026-10-04", timings }])
      .map((day) => day.dateISO)).toEqual(["2026-10-02"]);
    expect(prayerScheduleDays("2026-10-02", timings, timings, [
      { dateISO: "2026-10-04", timings },
      { dateISO: "2026-10-06", timings },
      { dateISO: "2026-10-05", timings },
    ]).map((day) => day.dateISO)).toEqual(["2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06"]);
  });

  it("drops the latest prayer days first to fit the iOS notification budget", () => {
    const item = (id: number, dateISO?: string) => ({ id, title: "", body: "", schedule: { at: new Date() }, extra: dateISO ? { dateISO } : {} });
    const notifications = [
      item(9101),
      ...["2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"].flatMap((dateISO, day) =>
        [0, 1, 2, 3, 4].map((prayer) => item(9201 + prayer + day * 10, dateISO))),
    ];
    const fitted = fitToNotificationBudget(notifications, 12, "2026-10-02");
    expect(fitted.map((entry) => entry.extra?.dateISO ?? "reminder")).toEqual([
      "reminder", ...Array(5).fill("2026-10-02"), ...Array(5).fill("2026-10-03"),
    ]);
    expect(fitToNotificationBudget(notifications, 100, "2026-10-02")).toBe(notifications);
  });

  it("cancels a logged prayer's follow-up anywhere in the week window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 2, 8, 0, 0));
    notificationMock.cancel.mockClear();
    await cancelPrayerFollowUp("Asr", "2026-10-07");
    expect(notificationMock.cancel).toHaveBeenCalledTimes(1);
    notificationMock.cancel.mockClear();
    await cancelPrayerFollowUp("Asr", "2026-10-09");
    expect(notificationMock.cancel).not.toHaveBeenCalled();
  });
});
