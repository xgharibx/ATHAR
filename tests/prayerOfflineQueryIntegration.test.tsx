// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock("@/lib/prayerWidget", () => ({
  getPrayerWidgetClockContext: () => ({ timeZoneId: "UTC", utcOffsetMinutes: 0 }),
  syncPrayerWidget: vi.fn(async () => undefined),
}));

import { usePrayerTimes } from "@/hooks/usePrayerTimes";

function Probe() {
  usePrayerTimes();
  return null;
}

let root: Root;
let container: HTMLDivElement;
let queryClient: QueryClient;
const originalTimezone = process.env.TZ;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  process.env.TZ = "UTC";
  Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: vi.fn() },
  });
  onlineManager.setOnline(false);
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  queryClient.clear();
  onlineManager.setOnline(true);
  vi.unstubAllGlobals();
  process.env.TZ = originalTimezone;
});

describe("prayer queries while React Query is offline", () => {
  it("resolves today's and tomorrow's local timings without reconnecting or requesting GPS", async () => {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <Probe />
        </QueryClientProvider>,
      );
    });

    const findPrayerQuery = (kind: string) =>
      queryClient.getQueryCache().getAll().find((query) => query.queryKey[1] === kind);

    await vi.waitFor(() => {
      expect(findPrayerQuery("v3")?.state.data).toBeDefined();
      expect(findPrayerQuery("tomorrow-v1")?.state.data).toBeDefined();
    });

    const today = findPrayerQuery("v3")?.state.data as {
      data: { timings: { Fajr: string } };
      __sourceLabel?: string;
    };
    const tomorrow = findPrayerQuery("tomorrow-v1")?.state.data as {
      data: { timings: { Fajr: string } };
      __sourceLabel?: string;
    };

    expect(today.data.timings.Fajr).toMatch(/^\d{2}:\d{2}$/);
    expect(tomorrow.data.timings.Fajr).toMatch(/^\d{2}:\d{2}$/);
    expect(today.__sourceLabel).toContain("بلا إنترنت");
    expect(tomorrow.__sourceLabel).toContain("بلا إنترنت");
    expect(fetch).not.toHaveBeenCalled();
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
  });
});
