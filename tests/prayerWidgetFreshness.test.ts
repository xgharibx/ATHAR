import { describe, expect, it, vi } from "vitest";
import { buildWidgetPayload } from "@/lib/prayerWidget";

describe("prayer widget freshness metadata", () => {
  it("stamps timings with their local prayer date, timezone, and current offset", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-03T12:00:00.000Z"));
    try {
      const payload = buildWidgetPayload({ Fajr: "05:00", Dhuhr: "12:00" }, "2026-10-03");

      expect(payload.dateKey).toBe("2026-10-03");
      expect(payload.timeZoneId).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
      expect(payload.utcOffsetMinutes).toBe(-new Date().getTimezoneOffset());
    } finally {
      vi.useRealTimers();
    }
  });
});
