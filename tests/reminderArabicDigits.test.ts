// @vitest-environment jsdom
/**
 * Regression: reminder times authored in Arabic-Indic numerals must resolve.
 *
 * The app stores and displays times in Arabic numerals ("٠٦:٣٠"), but the
 * recurrence parser matched `\d`, which in JavaScript is ASCII 0-9 only. So
 * parseClock returned null, nextOccurrences returned an empty list, and the
 * reminder silently never fired — on web and native alike. This was the real
 * reason AI-created reminders "didn't give notifications": they persisted and
 * showed in the UI, but never resolved a single fire time.
 *
 * Verified against a live device beforehand:
 *   [ATHARDIAG] أذكار الصباح repeat= daily at= ٠٦:٣٠ dates= 0
 */
import { describe, expect, it } from "vitest";
import { nextOccurrences } from "@/lib/reminderRecurrence";
import { defaultDailyResolver } from "@/lib/customReminderDelivery";
import type { CustomReminder } from "@/data/reminderTypes";

function makeReminder(overrides: Partial<CustomReminder> = {}): CustomReminder {
  const now = new Date().toISOString();
  return {
    id: "cr_test",
    createdAt: now,
    updatedAt: now,
    enabled: true,
    category: "dhikr",
    title: "أذكار الصباح",
    repeat: "daily",
    atTimeOfDay: "٠٦:٣٠",
    ...overrides,
  } as CustomReminder;
}

describe("reminder times in Arabic-Indic numerals", () => {
  it("resolves a daily reminder written as ٠٦:٣٠", () => {
    const dates = nextOccurrences(makeReminder(), { count: 3 });
    expect(dates.length).toBeGreaterThan(0);
    for (const d of dates) {
      expect(d.getHours()).toBe(6);
      expect(d.getMinutes()).toBe(30);
    }
  });

  it("matches the ASCII spelling of the same time exactly", () => {
    const arabic = nextOccurrences(makeReminder({ atTimeOfDay: "٠٦:٣٠" }), { count: 2 });
    const ascii = nextOccurrences(makeReminder({ atTimeOfDay: "06:30" }), { count: 2 });
    expect(arabic.map((d) => d.getTime())).toEqual(ascii.map((d) => d.getTime()));
  });

  it("also handles Persian/Extended digits (۰۶:۳۰)", () => {
    const dates = nextOccurrences(makeReminder({ atTimeOfDay: "۰۶:۳۰" }), { count: 1 });
    expect(dates.length).toBe(1);
    expect(dates[0].getHours()).toBe(6);
    expect(dates[0].getMinutes()).toBe(30);
  });

  it("resolves in the native delivery resolver too", () => {
    const at = defaultDailyResolver(makeReminder(), new Date());
    expect(at).not.toBeNull();
    expect(at?.getHours()).toBe(6);
    expect(at?.getMinutes()).toBe(30);
  });

  it("still rejects genuinely unparseable times", () => {
    expect(nextOccurrences(makeReminder({ atTimeOfDay: "not-a-time" }), { count: 1 })).toHaveLength(0);
    expect(defaultDailyResolver(makeReminder({ atTimeOfDay: "٩٩:٩٩" }), new Date())).toBeNull();
  });
});
