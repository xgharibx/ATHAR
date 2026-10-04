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
    isFetching: false,
    refetch: vi.fn().mockResolvedValue({ data: { data: { timings: mocks.timings } } }),
  }),
}));
vi.mock("@/store/noorStore", () => ({
  useNoorStore: (selector: (state: Record<string, unknown>) => unknown) => selector({ reminders: mocks.reminders }),
}));
vi.mock("@/hooks/usePullToRefresh", () => ({
  usePullToRefresh: () => ({ isPulling: false, isRefreshing: false }),
  PTRIndicator: () => null,
}));
vi.mock("@/components/layout/PrayerCountdown", () => ({ PrayerCountdown: () => React.createElement("div", null, "Prayer countdown") }));
vi.mock("@/lib/reminders", () => ({ syncReminders: vi.fn().mockResolvedValue(undefined) }));
vi.mock("react-hot-toast", () => ({ default: { error: vi.fn(), success: vi.fn() } }));

let root: Root | undefined;
let container: HTMLDivElement | undefined;
const suppressExpectedRenderError = (event: Event) => event.preventDefault();

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requestPrayerLocation.mockResolvedValue(true);
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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

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
});
