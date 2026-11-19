import { describe, it, expect } from "vitest";
import {
  parseClockToMinutes,
  formatMinutes12h,
  format12h,
  formatCountdown,
  buildPrayerSchedule,
  type PrayerTimings,
} from "@/lib/prayerSchedule";

// Real Aladhan API response captured for Cairo, Egypt on 2026-07-09 (method 5 / Egyptian, school 0 / Shafi).
const CAIRO_2026_07_09: PrayerTimings = {
  Fajr: "04:16",
  Sunrise: "06:01",
  Dhuhr: "13:00",
  Asr: "16:36",
  Maghrib: "19:59",
  Isha: "21:31",
};

function at(hours: number, minutes: number, seconds = 0) {
  return new Date(2026, 6, 9, hours, minutes, seconds);
}

describe("parseClockToMinutes", () => {
  it("parses HH:MM into total minutes since midnight", () => {
    expect(parseClockToMinutes("04:16")).toBe(4 * 60 + 16);
    expect(parseClockToMinutes("00:00")).toBe(0);
    expect(parseClockToMinutes("23:59")).toBe(23 * 60 + 59);
  });

  it("tolerates trailing text (e.g. timezone suffixes)", () => {
    expect(parseClockToMinutes("13:00 (+03)")).toBe(13 * 60);
  });

  it("returns null for unparseable input", () => {
    expect(parseClockToMinutes("")).toBeNull();
    expect(parseClockToMinutes("not a time")).toBeNull();
  });
});

describe("formatMinutes12h", () => {
  it("formats midnight and noon correctly", () => {
    expect(formatMinutes12h(0)).toContain("١٢:٠٠");
    expect(formatMinutes12h(0)).toContain("ص");
    expect(formatMinutes12h(12 * 60)).toContain("١٢:٠٠");
    expect(formatMinutes12h(12 * 60)).toContain("م");
  });

  it("wraps minutes past 24h back into a valid clock time", () => {
    expect(formatMinutes12h(24 * 60 + 30)).toContain("١٢:٣٠");
  });

  it("marks afternoon hours with م and morning hours with ص", () => {
    expect(formatMinutes12h(16 * 60 + 36)).toContain("٤:٣٦");
    expect(formatMinutes12h(16 * 60 + 36)).toContain("م");
    expect(formatMinutes12h(4 * 60 + 16)).toContain("٤:١٦");
    expect(formatMinutes12h(4 * 60 + 16)).toContain("ص");
  });
});

describe("format12h", () => {
  it("round-trips a raw HH:MM API value through parse+format", () => {
    expect(format12h("13:00")).toContain("١:٠٠");
    expect(format12h("13:00")).toContain("م");
  });
});

describe("formatRange order", () => {
  it("writes ranges start first, as one right-to-left unit", async () => {
    const { buildPrayerSchedule: build } = await import("@/lib/prayerSchedule");
    const schedule = build({ Fajr: "04:53", Sunrise: "06:23", Dhuhr: "11:40", Asr: "14:38", Maghrib: "16:57", Isha: "18:18" }, new Date(2026, 10, 19, 10, 0));
    const fajr = schedule!.detailRows.find((r) => r.id === "fajr")!;
    expect(fajr.timeLabel.indexOf("٤:٥٣")).toBeLessThan(fajr.timeLabel.indexOf("٦:٢٢"));
    expect(fajr.timeLabel.startsWith("\u2067")).toBe(true);
    expect(schedule!.detailRows.filter((r) => r.timeLabel === schedule!.detailRows.find((x) => x.id === "tahajjud")!.timeLabel)).toHaveLength(1);
  });
});

describe("formatCountdown", () => {
  it("shows mm:ss under an hour", () => {
    expect(formatCountdown(65)).toBe("١ د ٥ ث");
  });

  it("shows hh:mm:ss once an hour or more remains", () => {
    expect(formatCountdown(3661)).toBe("١ س ١ د");
  });

  it("treats zero/negative as 'now'", () => {
    expect(formatCountdown(0)).toBe("الآن");
    expect(formatCountdown(-5)).toBe("الآن");
  });
});

describe("buildPrayerSchedule", () => {
  it("resolves Asr as current and Maghrib as next mid-afternoon", () => {
    const schedule = buildPrayerSchedule(CAIRO_2026_07_09, at(17, 0));
    expect(schedule).not.toBeNull();
    expect(schedule!.current.name).toBe("Asr");
    expect(schedule!.next.name).toBe("Maghrib");
    expect(schedule!.diffSec).toBeGreaterThan(0);
  });

  it("resolves Fajr as current right at its start time", () => {
    const schedule = buildPrayerSchedule(CAIRO_2026_07_09, at(4, 16, 0));
    expect(schedule!.current.name).toBe("Fajr");
  });

  it("rolls over to the previous day's Isha as current just after midnight, before Fajr", () => {
    const schedule = buildPrayerSchedule(CAIRO_2026_07_09, at(2, 0));
    expect(schedule).not.toBeNull();
    // Before Fajr, the most recent prayer is yesterday's Isha.
    expect(schedule!.current.name).toBe("Isha");
    expect(schedule!.next.name).toBe("Fajr");
  });

  it("calculates pre-Fajr prayer state when Array.prototype.at is unavailable", () => {
    const originalAt = Array.prototype.at;
    Object.defineProperty(Array.prototype, "at", { configurable: true, value: undefined });
    try {
      const schedule = buildPrayerSchedule(CAIRO_2026_07_09, at(2, 0));
      expect(schedule?.current.name).toBe("Isha");
      expect(schedule?.next.name).toBe("Fajr");
    } finally {
      Object.defineProperty(Array.prototype, "at", { configurable: true, value: originalAt });
    }
  });

  it("never produces a negative countdown", () => {
    for (let h = 0; h < 24; h += 3) {
      const schedule = buildPrayerSchedule(CAIRO_2026_07_09, at(h, 0));
      expect(schedule!.diffSec).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns null when no primary prayer times parse", () => {
    const empty: PrayerTimings = {
      Fajr: "", Sunrise: "", Dhuhr: "", Asr: "", Maghrib: "", Isha: "",
    };
    expect(buildPrayerSchedule(empty, at(12, 0))).toBeNull();
  });
});
