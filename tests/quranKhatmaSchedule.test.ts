import { describe, expect, it } from "vitest";
import {
  countCompletedKhatmaDays,
  getKhatmaTimeline,
  getKhatmaDayRange,
  getKhatmaPlanStatus,
  isKhatmaDateWithinPlan,
} from "@/lib/quranKhatma";

describe("Quran khatma schedule", () => {
  it("uses civil date boundaries for upcoming, active, and expired plans", () => {
    expect(getKhatmaTimeline("2026-10-12", "2026-10-10", 3)).toMatchObject({
      isUpcoming: true,
      startsInDays: 2,
      isWithinPlan: false,
      isExpired: false,
      daysRemaining: 3,
    });
    expect(getKhatmaTimeline("2026-10-10", "2026-10-10", 3)).toMatchObject({
      isUpcoming: false,
      isWithinPlan: true,
      isExpired: false,
      elapsedDays: 0,
      daysRemaining: 3,
    });
    expect(getKhatmaTimeline("2026-10-10", "2026-10-13", 3)).toMatchObject({
      isUpcoming: false,
      isWithinPlan: false,
      isExpired: true,
      elapsedDays: 3,
      daysRemaining: 0,
    });
  });

  it.each([30, 60, 90, 180, 365, 730])(
    "splits all ayahs into consecutive, non-overlapping ranges for a %i-day plan",
    (days) => {
      let nextAyah = 1;

      for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
        const range = getKhatmaDayRange(dayIndex, days);
        expect(range.firstAyah).toBe(nextAyah);
        expect(range.lastAyah).toBeGreaterThanOrEqual(range.firstAyah);
        expect(range.count).toBe(range.lastAyah - range.firstAyah + 1);
        nextAyah = range.lastAyah + 1;
      }

      expect(nextAyah).toBe(6237);
    },
  );

  it("does not repeat the final ayah across the final days of a yearly plan", () => {
    const day347 = getKhatmaDayRange(346, 365);
    const day348 = getKhatmaDayRange(347, 365);
    const day349 = getKhatmaDayRange(348, 365);
    const finalDay = getKhatmaDayRange(364, 365);

    expect(day347.lastAyah).toBe(day348.firstAyah - 1);
    expect(day348.lastAyah).toBe(day349.firstAyah - 1);
    expect(day348.lastAyah).toBeLessThan(6236);
    expect(finalDay.lastAyah).toBe(6236);
  });

  it("keeps existing yearly plans on their original schedule while new plans are balanced", () => {
    expect(getKhatmaDayRange(199, 365, 6236, 1).firstAyah).toBe(3583);
    expect(getKhatmaDayRange(199, 365, 6236, 2).firstAyah).toBe(3400);
    expect(getKhatmaDayRange(346, 365, 6236, 1)).toMatchObject({ firstAyah: 6219, lastAyah: 6236, dailyTarget: 18 });
  });

  it("counts only completion dates inside the plan window", () => {
    const done = {
      "2026-01-01": true,
      "2026-01-02": true,
      "2026-01-03": true,
      "2025-12-31": true,
      "2026-01-04": true,
      "not-a-date": true,
      "2026-01-02-extra": true,
    };

    expect(countCompletedKhatmaDays("2026-01-01", 3, done)).toBe(3);
    expect(isKhatmaDateWithinPlan("2026-01-03", "2026-01-01", 3)).toBe(true);
    expect(isKhatmaDateWithinPlan("2026-01-04", "2026-01-01", 3)).toBe(false);
  });

  it("distinguishes an expired schedule from a completed khatma", () => {
    expect(getKhatmaPlanStatus(365, 365, 0)).toBe("expired");
    expect(getKhatmaPlanStatus(100, 365, 365)).toBe("completed");
    expect(getKhatmaPlanStatus(364, 365, 364)).toBe("active");
  });
});
