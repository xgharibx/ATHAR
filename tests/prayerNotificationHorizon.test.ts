import { afterEach, describe, expect, it, vi } from "vitest";

const notificationMock = vi.hoisted(() => ({ cancel: vi.fn(async () => undefined) }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" } }));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: { cancel: notificationMock.cancel } }));

import { buildPrayerNotificationsForDays, cancelPrayerFollowUp } from "@/lib/reminders";

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
});
