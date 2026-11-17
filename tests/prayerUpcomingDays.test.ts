// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadUpcomingPrayerDaysForTest as loadUpcoming } from "@/hooks/usePrayerTimes";

const location = { coords: { lat: 30.0444, lng: 31.2357 }, city: "Cairo", country: "Egypt" };

function calendarDay(date: string, fajr: string) {
  const [yyyy, mm, dd] = date.split("-");
  return {
    timings: { Fajr: `${fajr} (EET)`, Sunrise: "06:10 (EET)", Dhuhr: "11:40 (EET)", Asr: "14:45 (EET)", Maghrib: "17:05 (EET)", Isha: "18:25 (EET)" },
    date: {
      readable: date,
      gregorian: { date: `${dd}-${mm}-${yyyy}` },
      hijri: { date: "01-06-1448", month: { en: "Jumada", ar: "جمادى" }, weekday: { en: "Monday", ar: "الإثنين" } },
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("upcoming prayer days", () => {
  it("reads AlAdhan's monthly calendar once per month and normalises its times", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const month = /calendar\/2026\/(\d+)/.exec(url)?.[1];
      const days = month === "11"
        ? [calendarDay("2026-11-29", "04:50"), calendarDay("2026-11-30", "04:51")]
        : [calendarDay("2026-12-01", "04:52"), calendarDay("2026-12-02", "04:53"), calendarDay("2026-12-03", "04:54")];
      return new Response(JSON.stringify({ data: days }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const keys = ["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03"];
    const days = await loadUpcoming(keys, "coords:test", location, 5, 0, "Africa/Cairo");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/v1/calendar/2026/11?latitude=30.0444&longitude=31.2357&method=5&school=0");
    expect(days.map((day) => [day.dateISO, day.timings.Fajr])).toEqual([
      ["2026-11-29", "04:50"], ["2026-11-30", "04:51"], ["2026-12-01", "04:52"], ["2026-12-02", "04:53"], ["2026-12-03", "04:54"],
    ]);
    expect(days[0].timings.Isha).toBe("18:25");

    // A second load is served from the cache without the network.
    fetchMock.mockClear();
    const cached = await loadUpcoming(keys, "coords:test", location, 5, 0, "Africa/Cairo");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(cached.map((day) => day.timings.Fajr)).toEqual(["04:50", "04:51", "04:52", "04:53", "04:54"]);
  });

  it("falls back to the offline calculation when the calendar is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const days = await loadUpcoming(["2026-11-29", "2026-11-30"], "coords:none", location, 5, 0, "Africa/Cairo");
    expect(days.map((day) => day.dateISO)).toEqual(["2026-11-29", "2026-11-30"]);
    for (const day of days) {
      for (const value of Object.values(day.timings)) expect(value).toMatch(/^\d{2}:\d{2}$/);
    }
  });
});
