// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { requestPrayerLocation, usePrayerTimes } from "@/hooks/usePrayerTimes";

const query = vi.hoisted(() => ({
  run: undefined as undefined | (() => Promise<{ data: { timings: Record<string, string> }; __sourceLabel?: string }>),
  tomorrowRun: undefined as undefined | (() => Promise<{ data: { timings: Record<string, string> }; __sourceLabel?: string }>),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryFn: typeof query.run; queryKey?: readonly unknown[] }) => {
    if (options.queryKey?.[1] === "tomorrow-v1") query.tomorrowRun = options.queryFn;
    else query.run = options.queryFn;
    return { data: undefined, isPlaceholderData: false, refetch: () => Promise.resolve() };
  },
}));

let root: Root;
let container: HTMLDivElement;
const oldTimezone = process.env.TZ;

function Probe() { usePrayerTimes(); return null; }
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

  it("uses coordinates only after the user requests their location", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    mountAtMecca();
    expect(await requestPrayerLocation()).toBe(true);

    const result = await query.run!();
    expect(result.data.timings.Dhuhr).toBe("09:11");
    expect(JSON.parse(localStorage.getItem("noor_prayer_coords_v1") ?? "null")).toMatchObject({ lat: 21.4225, lng: 39.8262 });
  });

  it("calculates for saved coordinates instead of returning another location's cached city times", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    localStorage.setItem("noor_prayer_times_v1:2026-10-02:city:Cairo:Egypt:5:0", JSON.stringify({
      data: { timings: { Dhuhr: "10:00" } },
      __sourceLabel: "القاهرة",
    }));
    mountAtMecca();
    expect(await requestPrayerLocation()).toBe(true);

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
    await query.run!();
    const tomorrow = await query.tomorrowRun!();
    const requestUrls = vi.mocked(fetch).mock.calls.map(([url]) => String(url));

    expect(requestUrls.some((url) => url.includes("/timings/03-10-2026?latitude=21.4225&longitude=39.8262"))).toBe(true);
    expect(tomorrow.data.timings.Fajr).toBeTruthy();
    expect(tomorrow.__sourceLabel).toContain("بلا إنترنت");
  });
});
