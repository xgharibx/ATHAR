import { describe, expect, it } from "vitest";
import { getHomePrayerContext, getNextHomePrayerRefreshAt } from "@/lib/homePrayerContext";

const today = {
  Fajr: "05:00",
  Dhuhr: "12:00",
  Asr: "15:30",
  Maghrib: "18:00",
  Isha: "19:30",
};

describe("Home prayer context refresh boundaries", () => {
  it("selects the next prayer and schedules the 45- and 30-minute urgency boundaries", () => {
    const at144459 = new Date(2026, 10, 9, 14, 44, 59);
    expect(getHomePrayerContext(today, today, at144459)).toMatchObject({
      nextPrayer: { label: "العصر" },
      nextPrayerMinutes: 45,
    });
    expect(getNextHomePrayerRefreshAt(today, today, at144459))
      .toEqual(new Date(2026, 10, 9, 14, 45));
    expect(getNextHomePrayerRefreshAt(today, today, new Date(2026, 10, 9, 14, 45)))
      .toEqual(new Date(2026, 10, 9, 15, 0));
    expect(getNextHomePrayerRefreshAt(today, today, new Date(2026, 10, 9, 15, 0)))
      .toEqual(new Date(2026, 10, 9, 15, 30));
  });

  it("moves to tomorrow's Fajr after the last prayer of today", () => {
    const tomorrow = { ...today, Fajr: "04:58" };
    const context = getHomePrayerContext(today, tomorrow, new Date(2026, 10, 9, 20, 0));

    expect(context.nextPrayer?.label).toBe("الفجر");
    expect(context.nextPrayer?.at).toEqual(new Date(2026, 10, 10, 4, 58));
    expect(context.nextPrayerMinutes).toBe(538);
  });

  it("does not guess tomorrow's prayer times when no tomorrow data is supplied", () => {
    const context = getHomePrayerContext(today, undefined, new Date(2026, 10, 9, 20, 0));
    expect(context.nextPrayer).toBeNull();
    expect(context.nextPrayerMinutes).toBeNull();
  });
});
