// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { requestPrayerLocation, usePrayerTimes } from "@/hooks/usePrayerTimes";
import { accountScopedStorageKey, setAccountStorageOwner } from "@/lib/accountStorageScope";

const query = vi.hoisted(() => ({
  run: undefined as undefined | (() => Promise<{ data: { timings: Record<string, string> }; __sourceLabel?: string }>),
  tomorrowRun: undefined as undefined | (() => Promise<{ data: { timings: Record<string, string> }; __sourceLabel?: string }>),
  todayKey: undefined as readonly unknown[] | undefined,
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryFn: typeof query.run; queryKey?: readonly unknown[] }) => {
    if (options.queryKey?.[1] === "tomorrow-v1") query.tomorrowRun = options.queryFn;
    else {
      query.run = options.queryFn;
      query.todayKey = options.queryKey;
    }
    return { data: undefined, isPlaceholderData: false, refetch: () => Promise.resolve() };
  },
}));

let root: Root;
let container: HTMLDivElement;
const oldTimezone = process.env.TZ;
let getPrayerTimingsForDate: (date: Date) => Record<string, string>;

function Probe() {
  getPrayerTimingsForDate = (usePrayerTimes() as ReturnType<typeof usePrayerTimes> & {
    getPrayerTimingsForDate: (date: Date) => Record<string, string>;
  }).getPrayerTimingsForDate;
  return null;
}
function mountAtMecca() {
  const getCurrentPosition = vi.fn((success: PositionCallback) => success({
    coords: { latitude: 21.4225, longitude: 39.8262 },
  } as GeolocationPosition));
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(createElement(Probe)));
  return getCurrentPosition;
}

beforeEach(() => {
  setAccountStorageOwner("local");
  process.env.TZ = "UTC";
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-02T12:00:00Z"));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
});
afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  process.env.TZ = oldTimezone;
  setAccountStorageOwner("local");
});

describe("offline prayer fallback", () => {
  it("does not request device location while loading prayer times", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const getCurrentPosition = mountAtMecca();

    await query.run!();

    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("uses the city fallback on first load when permission was not requested", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const getCurrentPosition = mountAtMecca();
    const result = await query.run!();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(result.__sourceLabel).toContain("القاهرة");
  });

  it("refreshes the prayer schedule context after the device timezone changes", () => {
    mountAtMecca();
    const originalKey = query.todayKey;

    process.env.TZ = "America/New_York";
    act(() => document.dispatchEvent(new Event("visibilitychange")));

    expect(query.todayKey).not.toEqual(originalKey);
    expect(query.todayKey).toContain("America/New_York");
    expect(query.todayKey).toContain(-240);
  });

  it("uses coordinates only after the user requests their location", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    mountAtMecca();
    expect(await requestPrayerLocation()).toBe(true);
    act(() => root.render(createElement(Probe)));

    const result = await query.run!();
    expect(result.data.timings.Dhuhr).toBe("09:11");
    expect(JSON.parse(localStorage.getItem("noor_prayer_coords_v1") ?? "null")).toMatchObject({ lat: 21.4225, lng: 39.8262 });
  });

  it("uses a distinct query cache entry after the saved prayer location changes", async () => {
    mountAtMecca();
    const cityQueryKey = query.todayKey;

    let locationSaved = false;
    await act(async () => { locationSaved = await requestPrayerLocation(); });

    expect(locationSaved).toBe(true);
    expect(query.todayKey).not.toEqual(cityQueryKey);
    expect(query.todayKey).toContain("coords:21.4225:39.8262");
  });

  it("calculates prayer-aligned schedules from the requested future date", () => {
    mountAtMecca();

    const november = getPrayerTimingsForDate(new Date(2026, 10, 1));
    const december = getPrayerTimingsForDate(new Date(2026, 11, 1));

    expect(november.Fajr).toBeTruthy();
    expect(december.Fajr).toBeTruthy();
    expect(december.Fajr).not.toBe(november.Fajr);
  });

  it("calculates for saved coordinates instead of returning another location's cached city times", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    localStorage.setItem("noor_prayer_times_v1:2026-10-02:city:Cairo:Egypt:5:0", JSON.stringify({
      data: { timings: { Dhuhr: "10:00" } },
      __sourceLabel: "القاهرة",
    }));
    mountAtMecca();
    expect(await requestPrayerLocation()).toBe(true);
    act(() => root.render(createElement(Probe)));

    const result = await query.run!();

    expect(result.data.timings.Dhuhr).toBe("09:11");
    expect(result.__sourceLabel).toContain("حساب محلي");
  });

  it("keeps the last saved coordinates when location access is denied", async () => {
    const saved = { lat: 30.0444, lng: 31.2357, savedAt: "2026-09-01" };
    localStorage.setItem("noor_prayer_coords_v1", JSON.stringify(saved));
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
      getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => error({ code: 1, message: "denied" } as GeolocationPositionError),
    } });

    expect(await requestPrayerLocation()).toBe(false);
    expect(JSON.parse(localStorage.getItem("noor_prayer_coords_v1") ?? "null")).toEqual(saved);
  });

  it("does not save coordinates into a different account after a slow location request", async () => {
    let resolvePosition!: PositionCallback;
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
      getCurrentPosition: (success: PositionCallback) => { resolvePosition = success; },
    } });
    setAccountStorageOwner("user:account-a");
    const request = requestPrayerLocation();
    const accountBSavedLocation = { lat: 35.6762, lng: 139.6503, savedAt: "2026-10-02T00:00:00.000Z" };
    const accountBKey = accountScopedStorageKey("noor_prayer_coords_v1", "user:account-b");
    localStorage.setItem(accountBKey, JSON.stringify(accountBSavedLocation));

    setAccountStorageOwner("user:account-b");
    resolvePosition({ coords: { latitude: 21.4225, longitude: 39.8262 } } as GeolocationPosition);

    expect(await request).toBe(false);
    expect(localStorage.getItem(accountScopedStorageKey("noor_prayer_coords_v1", "user:account-a"))).toBeNull();
    expect(JSON.parse(localStorage.getItem(accountBKey) ?? "null")).toEqual(accountBSavedLocation);
  });

  it("reaches local calculation when network requests remain pending until aborted", async () => {
    vi.stubGlobal("fetch", (_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    }));
    mountAtMecca();
    let result: Awaited<ReturnType<NonNullable<typeof query.run>>> | undefined;
    void query.run!().then((data) => { result = data; });
    await vi.advanceTimersByTimeAsync(40_000);
    expect(result?.__sourceLabel).toContain("القاهرة");
  });

  it("fetches tomorrow's timings for the same saved coordinates and falls back locally offline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    mountAtMecca();

    expect(await requestPrayerLocation()).toBe(true);
    act(() => root.render(createElement(Probe)));
    await query.run!();
    const tomorrow = await query.tomorrowRun!();
    const requestUrls = vi.mocked(fetch).mock.calls.map(([url]) => String(url));

    expect(requestUrls.some((url) => url.includes("/timings/03-10-2026?latitude=21.4225&longitude=39.8262"))).toBe(true);
    expect(tomorrow.data.timings.Fajr).toBeTruthy();
    expect(tomorrow.__sourceLabel).toContain("بلا إنترنت");
  });
});
