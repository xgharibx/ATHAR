/** @vitest-environment jsdom */
import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestPrayerLocation: vi.fn<() => Promise<boolean>>(),
  reminders: [],
  timings: { Fajr: "05:00", Sunrise: "06:20", Dhuhr: "12:00", Asr: "15:30", Maghrib: "18:00", Isha: "19:30" },
  prayerFetching: false,
  syncReminders: vi.fn().mockResolvedValue(undefined),
  toast: { error: vi.fn(), success: vi.fn() },
  favoriteCities: [{ id: "tokyo", city: "Tokyo", country: "Japan", label: "طوكيو" }],
  queries: [] as Array<{ queryKey?: readonly unknown[]; queryFn?: () => unknown }>,
  calendarData: {} as Record<string, unknown[]>,
}));

vi.mock("@/hooks/usePrayerTimes", () => ({
  requestPrayerLocation: mocks.requestPrayerLocation,
  usePrayerTimes: () => ({
    data: {
      data: {
        timings: mocks.timings,
        date: { hijri: { date: "01", month: { ar: "محرم" } } },
      },
    },
    isLoading: false,
    isFetching: mocks.prayerFetching,
    refetch: vi.fn().mockResolvedValue({ data: { data: { timings: mocks.timings } } }),
  }),
}));
vi.mock("@/store/noorStore", () => ({
  useNoorStore: (selector: (state: Record<string, unknown>) => unknown) => selector({
    reminders: mocks.reminders,
    prefs: { prayerCalcMethod: 5, asrMadhab: 0 },
    favoriteCities: mocks.favoriteCities,
    prayerLog: {},
  }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey?: readonly unknown[]; queryFn?: () => unknown }) => {
    mocks.queries.push(options);
    const [kind, year, month] = options.queryKey ?? [];
    const data = kind === "prayer-calendar" ? mocks.calendarData[`${year}-${month}`] : undefined;
    return { data, isLoading: false, error: null };
  },
}));
vi.mock("@/hooks/usePullToRefresh", () => ({
  usePullToRefresh: () => ({ isPulling: false, isRefreshing: false }),
  PTRIndicator: () => null,
}));
vi.mock("@/components/layout/PrayerCountdown", () => ({ PrayerCountdown: () => React.createElement("div", null, "Prayer countdown") }));
vi.mock("@/lib/reminders", () => ({ syncReminders: mocks.syncReminders }));
vi.mock("react-hot-toast", () => ({ default: mocks.toast }));

let root: Root | undefined;
let container: HTMLDivElement | undefined;
const suppressExpectedRenderError = (event: Event) => event.preventDefault();

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queries.length = 0;
  mocks.favoriteCities = [{ id: "tokyo", city: "Tokyo", country: "Japan", label: "طوكيو" }];
  mocks.calendarData = {};
  mocks.requestPrayerLocation.mockResolvedValue(true);
  mocks.prayerFetching = false;
  mocks.timings = { Fajr: "05:00", Sunrise: "06:20", Dhuhr: "12:00", Asr: "15:30", Maghrib: "18:00", Isha: "19:30" };
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });
  window.addEventListener("error", suppressExpectedRenderError);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  window.removeEventListener("error", suppressExpectedRenderError);
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function renderMonthlyPrayerCalendar() {
  const { PrayerTimesPage } = await import("@/pages/PrayerTimes");
  const tree = () => createElement(
    MemoryRouter,
    { future: { v7_startTransition: true, v7_relativeSplatPath: true } },
    createElement(PrayerTimesPage),
  );
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(tree()); });
  await act(async () => { container!.querySelector<HTMLButtonElement>("#pt-tab-monthly")?.click(); });
  return async () => { await act(async () => { root!.render(tree()); }); };
}

function calendarDays(year: number, month: number) {
  const count = new Date(year, month, 0).getDate();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(year, month - 1, index + 1);
    const day = String(index + 1).padStart(2, "0");
    const monthText = String(month).padStart(2, "0");
    return {
      timings: { Fajr: "05:00", Dhuhr: "12:00", Asr: "15:00", Maghrib: "18:00", Isha: "19:00" },
      date: {
        readable: `${day} ${monthText} ${year}`,
        gregorian: {
          date: `${day}-${monthText}-${year}`,
          day: String(index + 1),
          month: { number: month, en: "Month" },
          year: String(year),
          weekday: { en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()] },
        },
        hijri: { date: "01-01-1448", day: "1", month: { number: 1, en: "Muharram", ar: "محرم" }, year: "1448" },
      },
    };
  });
}

describe("Prayer Times location privacy disclosure", () => {
  it("names AlAdhan and explains coordinate sharing before the location action", async () => {
    const { PrayerTimesPage } = await import("@/pages/PrayerTimes");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(createElement(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } }, createElement(PrayerTimesPage)));
    });

    const disclosure = Array.from(container.querySelectorAll("p,div,span"))
      .find((element) => element.textContent?.includes("AlAdhan") && element.textContent.includes("إحداثياتك"));
    const locationButton = container.querySelector<HTMLButtonElement>('button[aria-label="استخدام موقعي لمواقيت الصلاة"]');

    expect(disclosure).not.toBeUndefined();
    expect(locationButton).not.toBeNull();
    expect(disclosure!.compareDocumentPosition(locationButton!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("lets the user stop using saved coordinates and returns to Cairo timings", async () => {
    localStorage.clear();
    localStorage.setItem("noor_prayer_coords_v1", JSON.stringify({ lat: 21.4225, lng: 39.8262 }));
    mocks.syncReminders.mockClear();
    mocks.toast.success.mockClear();
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const { PrayerTimesPage } = await import("@/pages/PrayerTimes");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(createElement(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } }, createElement(PrayerTimesPage)));
    });

    const stopUsingLocation = container.querySelector<HTMLButtonElement>(
      'button[aria-label="إيقاف استخدام موقعي لمواقيت الصلاة"]',
    );
    expect(stopUsingLocation).not.toBeNull();

    await act(async () => {
      stopUsingLocation!.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(localStorage.getItem("noor_prayer_coords_v1")).toBeNull();
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "athar:prayer-location-changed" }));
    expect(mocks.syncReminders).toHaveBeenCalledWith([], {
      Fajr: "05:00", Dhuhr: "12:00", Asr: "15:30", Maghrib: "18:00", Isha: "19:30",
    });
    expect(mocks.toast.success).toHaveBeenCalledWith("تم إيقاف استخدام الموقع والعودة إلى القاهرة");
  });

  it("keeps comparison cities from changing the calendar's Cairo fallback", async () => {
    localStorage.clear();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    await renderMonthlyPrayerCalendar();

    const calendarQuery = mocks.queries.find((query) => query.queryKey?.[0] === "prayer-calendar");
    expect(calendarQuery).toBeDefined();
    await act(async () => { await calendarQuery?.queryFn?.(); });

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("calendarByCity");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("city=Cairo&country=Egypt");
  });

  it("uses a distinct calendar cache entry and request when saved coordinates change", async () => {
    localStorage.clear();
    localStorage.setItem("noor_prayer_coords_v1", JSON.stringify({ lat: 21.4225, lng: 39.8262 }));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    const rerender = await renderMonthlyPrayerCalendar();
    const firstQuery = mocks.queries.find((query) => query.queryKey?.[0] === "prayer-calendar");
    const firstKey = firstQuery?.queryKey;
    await act(async () => { await firstQuery?.queryFn?.(); });

    localStorage.setItem("noor_prayer_coords_v1", JSON.stringify({ lat: 35.6762, lng: 139.6503 }));
    await rerender();
    const calendarQueries = mocks.queries.filter((query) => query.queryKey?.[0] === "prayer-calendar");
    const secondQuery = calendarQueries.at(-1);
    expect(secondQuery?.queryKey).not.toEqual(firstKey);
    await act(async () => { await secondQuery?.queryFn?.(); });

    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.includes("latitude=21.4225&longitude=39.8262"))).toBe(true);
    expect(urls.some((url) => url.includes("latitude=35.6762&longitude=139.6503"))).toBe(true);
  });

  it("shows seven days when the current week crosses into the next month", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 31, 12));
    mocks.calendarData = {
      "2026-10": calendarDays(2026, 10),
      "2026-11": calendarDays(2026, 11),
    };
    await renderMonthlyPrayerCalendar();

    await act(async () => { container!.querySelector<HTMLButtonElement>("#pt-tab-weekly")?.click(); });

    const calendarQueries = mocks.queries.filter((query) => query.queryKey?.[0] === "prayer-calendar");
    expect(calendarQueries.some((query) => query.queryKey?.[1] === 2026 && query.queryKey?.[2] === 11)).toBe(true);
    expect(container!.querySelectorAll("#pt-panel-weekly tbody tr")).toHaveLength(7);
  });

  it("requests saved-city prayer times for today's local date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 4, 12));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { timings: {} } }) });
    vi.stubGlobal("fetch", fetchMock);
    await renderMonthlyPrayerCalendar();

    await act(async () => { container!.querySelector<HTMLButtonElement>("#pt-tab-cities")?.click(); });
    const cityQuery = mocks.queries.find((query) => query.queryKey?.[0] === "city-times");
    expect(cityQuery?.queryKey).toContain("2026-10-04");
    await act(async () => { await cityQuery?.queryFn?.(); });

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/timingsByCity/04-10-2026?");

    vi.setSystemTime(new Date(2026, 9, 5, 0, 1));
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    const nextDayQuery = mocks.queries.filter((query) => query.queryKey?.[0] === "city-times").at(-1);
    expect(nextDayQuery?.queryKey).toContain("2026-10-05");
    await act(async () => { await nextDayQuery?.queryFn?.(); });
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/timingsByCity/05-10-2026?");
  });

  it("waits for prayer times at the new location before rescheduling reminders", async () => {
    localStorage.clear();
    mocks.syncReminders.mockClear();
    mocks.requestPrayerLocation.mockImplementation(async () => {
      localStorage.setItem("noor_prayer_coords_v1", JSON.stringify({ lat: 21.4225, lng: 39.8262 }));
      mocks.prayerFetching = true;
      return true;
    });
    const rerender = await renderMonthlyPrayerCalendar();
    const locationButton = container!.querySelector<HTMLButtonElement>('button[aria-label="استخدام موقعي لمواقيت الصلاة"]');

    await act(async () => { locationButton?.click(); await Promise.resolve(); });
    expect(mocks.syncReminders).not.toHaveBeenCalled();

    mocks.timings = { ...mocks.timings, Dhuhr: "09:11" };
    mocks.prayerFetching = false;
    await rerender();
    await act(async () => { await Promise.resolve(); });

    expect(mocks.syncReminders).toHaveBeenCalledWith([], {
      Fajr: "05:00", Dhuhr: "09:11", Asr: "15:30", Maghrib: "18:00", Isha: "19:30",
    });
  });
});
