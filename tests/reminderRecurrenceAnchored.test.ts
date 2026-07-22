// @vitest-environment jsdom
/**
 * Coverage for prayer_aligned / sunnah_aligned recurrence — previously
 * untested despite being the exact feature wired up in the 2026-07-19/22
 * session (App.tsx → reminderSync.ts → Reminders.tsx prayer-times
 * threading, plus the AI tool schema's dayOfWeek/dayOfMonth/anchorKey
 * overhaul that replaced the bogus "friday" anchor concept).
 */
import { describe, expect, it } from "vitest";
import { nextOccurrences } from "@/lib/reminderRecurrence";
import type { CustomReminder } from "@/data/reminderTypes";

const PRAYER_TIMES = {
  Fajr: "04:30",
  Sunrise: "06:00",
  Dhuhr: "12:15",
  Asr: "15:45",
  Maghrib: "19:20",
  Isha: "20:50",
};

function makeReminder(overrides: Partial<CustomReminder> = {}): CustomReminder {
  const now = new Date().toISOString();
  return {
    id: "r1",
    category: "salat",
    title: "تذكير",
    enabled: true,
    repeat: "prayer_aligned",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("prayer_aligned recurrence", () => {
  it("resolves to the real prayer clock time, not atTimeOfDay, when prayer times are supplied", () => {
    const now = new Date(2026, 6, 22, 10, 0); // Wed 2026-07-22, 10:00 — before Maghrib
    const reminder = makeReminder({ anchorKey: "maghrib", atTimeOfDay: "18:00" });
    const [next] = nextOccurrences(reminder, { now, count: 1, prayerTimes: PRAYER_TIMES });
    expect(next).toBeDefined();
    expect(next!.getHours()).toBe(19);
    expect(next!.getMinutes()).toBe(20);
    expect(next!.getDate()).toBe(22); // still today — Maghrib hasn't passed yet
  });

  it("applies anchorOffsetMinutes (negative = before the prayer)", () => {
    const now = new Date(2026, 6, 22, 10, 0);
    const reminder = makeReminder({ anchorKey: "fajr", anchorOffsetMinutes: -15 });
    const [next] = nextOccurrences(reminder, { now, count: 1, prayerTimes: PRAYER_TIMES });
    // Fajr is 04:30 and has already passed for "now" (10:00), so the next
    // occurrence rolls to tomorrow — 15 minutes before 04:30 = 04:15.
    expect(next!.getHours()).toBe(4);
    expect(next!.getMinutes()).toBe(15);
    expect(next!.getDate()).toBe(23);
  });

  it("rolls to tomorrow once today's anchor prayer has already passed", () => {
    const now = new Date(2026, 6, 22, 20, 0); // 8pm — after Maghrib (19:20)
    const reminder = makeReminder({ anchorKey: "maghrib" });
    const [next] = nextOccurrences(reminder, { now, count: 1, prayerTimes: PRAYER_TIMES });
    expect(next!.getDate()).toBe(23);
    expect(next!.getHours()).toBe(19);
    expect(next!.getMinutes()).toBe(20);
  });

  it("falls back to atTimeOfDay when no prayerTimes source is supplied at all", () => {
    const now = new Date(2026, 6, 22, 10, 0);
    const reminder = makeReminder({ anchorKey: "maghrib", atTimeOfDay: "18:30" });
    const [next] = nextOccurrences(reminder, { now, count: 1 }); // no prayerTimes
    expect(next!.getHours()).toBe(18);
    expect(next!.getMinutes()).toBe(30);
  });

  it("accepts the { data: { timings } } shape (matches usePrayerTimes()'s query.data shape)", () => {
    const now = new Date(2026, 6, 22, 10, 0);
    const reminder = makeReminder({ anchorKey: "asr" });
    const [next] = nextOccurrences(reminder, {
      now,
      count: 1,
      prayerTimes: { data: { timings: PRAYER_TIMES } },
    });
    expect(next!.getHours()).toBe(15);
    expect(next!.getMinutes()).toBe(45);
  });
});

describe("sunnah_aligned recurrence", () => {
  it("resolves duha to ~20 minutes after sunrise by default", () => {
    const now = new Date(2026, 6, 22, 4, 0); // before sunrise
    const reminder = makeReminder({ repeat: "sunnah_aligned", anchorKey: "duha" });
    const [next] = nextOccurrences(reminder, { now, count: 1, prayerTimes: PRAYER_TIMES });
    expect(next!.getHours()).toBe(6);
    expect(next!.getMinutes()).toBe(20);
  });

  it("resolves witr to Isha time (plus offset)", () => {
    const now = new Date(2026, 6, 22, 10, 0);
    const reminder = makeReminder({ repeat: "sunnah_aligned", anchorKey: "witr", anchorOffsetMinutes: 30 });
    const [next] = nextOccurrences(reminder, { now, count: 1, prayerTimes: PRAYER_TIMES });
    expect(next!.getHours()).toBe(21);
    expect(next!.getMinutes()).toBe(20);
  });

  it("resolves tahajjud to a time between Maghrib and next-day Fajr", () => {
    const now = new Date(2026, 6, 22, 10, 0);
    const reminder = makeReminder({ repeat: "sunnah_aligned", anchorKey: "tahajjud" });
    const [next] = nextOccurrences(reminder, { now, count: 1, prayerTimes: PRAYER_TIMES });
    expect(next).toBeDefined();
    // Must fall strictly between tonight's Maghrib and tomorrow's Fajr.
    const maghribToday = new Date(2026, 6, 22, 19, 20);
    const fajrTomorrow = new Date(2026, 6, 23, 4, 30);
    expect(next!.getTime()).toBeGreaterThan(maghribToday.getTime());
    expect(next!.getTime()).toBeLessThan(fajrTomorrow.getTime());
  });
});

describe("weekly / monthly recurrence with an explicit day (the AI tool-schema fix)", () => {
  it("weekly with dayOfWeek lands on the correct weekday, not the creation day", () => {
    // 2026-07-22 is a Wednesday; ask for Friday (5).
    const now = new Date(2026, 6, 22, 10, 0);
    const reminder = makeReminder({ repeat: "weekly", dayOfWeek: 5, atTimeOfDay: "09:00" });
    const [next] = nextOccurrences(reminder, { now, count: 1 });
    expect(next!.getDay()).toBe(5);
    expect(next!.getDate()).toBe(24); // next Friday
  });

  it("weekly with NO dayOfWeek falls back to the creation day (the pre-fix, ambiguous behavior)", () => {
    const now = new Date(2026, 6, 22, 10, 0);
    const startDate = "2026-07-22"; // Wednesday
    const reminder = makeReminder({ repeat: "weekly", startDate, atTimeOfDay: "09:00" });
    const [next] = nextOccurrences(reminder, { now, count: 1 });
    expect(next!.getDay()).toBe(3); // Wednesday — startDate's weekday, not necessarily what the user meant
  });

  it("monthly with dayOfMonth lands on that day of the month", () => {
    const now = new Date(2026, 6, 22, 10, 0);
    const reminder = makeReminder({ repeat: "monthly", dayOfMonth: 1, atTimeOfDay: "08:00" });
    const [next] = nextOccurrences(reminder, { now, count: 1 });
    expect(next!.getDate()).toBe(1);
    expect(next!.getMonth()).toBe(7); // August (0-indexed) — next occurrence of the 1st
  });

  it("monthly clamps a day past the month's end to the last real day", () => {
    const now = new Date(2026, 1, 1); // Feb 1 2026 (28 days)
    const reminder = makeReminder({ repeat: "monthly", dayOfMonth: 31, atTimeOfDay: "08:00" });
    const [next] = nextOccurrences(reminder, { now, count: 1 });
    expect(next!.getMonth()).toBe(1); // February
    expect(next!.getDate()).toBe(28);
  });
});
