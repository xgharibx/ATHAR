// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";

const query = vi.hoisted(() => ({ run: undefined as undefined | (() => Promise<{ data: { timings: Record<string, string> }; __sourceLabel?: string }>) }));
vi.mock("@tanstack/react-query", () => ({ useQuery: (options: { queryFn: typeof query.run }) => { query.run = options.queryFn; return { data: undefined, refetch: () => Promise.resolve() }; } }));

let root: Root;
let container: HTMLDivElement;
const oldTimezone = process.env.TZ;

function Probe() { usePrayerTimes(); return null; }
function mountAtMecca() {
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
    getCurrentPosition: (success: PositionCallback) => success({ coords: { latitude: 21.4225, longitude: 39.8262 } } as GeolocationPosition),
  } });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(createElement(Probe)));
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
  it("uses fresh GPS coordinates on the first session when the API is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    mountAtMecca();
    const result = await query.run!();
    expect(result.data.timings.Dhuhr).toBe("09:11");
    expect(result.data.timings.Fajr).toBe("01:52");
  });

  it("uses fresh GPS coordinates after moving away from the saved location", async () => {
    localStorage.setItem("noor_prayer_coords_v1", JSON.stringify({ lat: 30.0444, lng: 31.2357, savedAt: "2026-09-01" }));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    mountAtMecca();
    expect((await query.run!()).data.timings.Dhuhr).toBe("09:11");
  });

  it("reaches local calculation when network requests remain pending until aborted", async () => {
    vi.stubGlobal("fetch", (_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    }));
    mountAtMecca();
    let result: Awaited<ReturnType<NonNullable<typeof query.run>>> | undefined;
    void query.run!().then((data) => { result = data; });
    await vi.advanceTimersByTimeAsync(40_000);
    expect(result?.data.timings.Dhuhr).toBe("09:11");
  });
});
