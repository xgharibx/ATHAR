import { afterEach, describe, expect, it, vi } from "vitest";
import type { CustomReminder } from "@/data/reminderTypes";
import { getReminderScheduleStats } from "@/lib/reminderScheduleStats";

function reminder(overrides: Partial<CustomReminder> = {}): CustomReminder {
  return {
    id: "daily-reminder",
    category: "custom",
    title: "ورد الصباح",
    enabled: true,
    repeat: "daily",
    atTimeOfDay: "18:00",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("getReminderScheduleStats", () => {
  afterEach(() => vi.useRealTimers());

  it("counts enabled reminders and future occurrences for today and the next seven days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 4, 12, 0, 0));

    const stats = getReminderScheduleStats([
      reminder(),
      reminder({ id: "paused", enabled: false }),
    ]);

    expect(stats).toEqual({
      enabledCount: 1,
      totalCount: 2,
      todayOccurrences: 1,
      nextSevenDaysOccurrences: 7,
    });
  });

  it("does not report past or disabled occurrences as upcoming", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 4, 20, 0, 0));

    const stats = getReminderScheduleStats([
      reminder({ id: "past-today", atTimeOfDay: "18:00" }),
      reminder({ id: "disabled", enabled: false }),
    ]);

    expect(stats.todayOccurrences).toBe(0);
    expect(stats.nextSevenDaysOccurrences).toBe(7);
  });

  it("returns zero upcoming counts when there are no reminders", () => {
    expect(getReminderScheduleStats([])).toEqual({
      enabledCount: 0,
      totalCount: 0,
      todayOccurrences: 0,
      nextSevenDaysOccurrences: 0,
    });
  });
});
