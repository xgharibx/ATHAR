// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { useHomePrayerClock } from "@/hooks/useHomePrayerClock";

const timings = {
  Fajr: "05:00",
  Dhuhr: "12:00",
  Asr: "15:30",
  Maghrib: "18:00",
  Isha: "19:30",
};

let root: Root;
let container: HTMLDivElement;

function ClockProbe() {
  const revision = useHomePrayerClock(timings, timings, "2026-11-09");
  return <output>{revision}</output>;
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 9, 14, 44, 59));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe("useHomePrayerClock", () => {
  it("refreshes only at relevant prayer urgency and prayer-time boundaries", async () => {
    act(() => root.render(<ClockProbe />));
    expect(container.querySelector("output")?.textContent).toBe("0");

    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(container.querySelector("output")?.textContent).toBe("1");

    await act(async () => { await vi.advanceTimersByTimeAsync(15 * 60_000); });
    expect(container.querySelector("output")?.textContent).toBe("2");
  });

  it("recalculates and reschedules immediately after app focus", () => {
    act(() => root.render(<ClockProbe />));
    vi.setSystemTime(new Date(2026, 10, 9, 16, 0));

    act(() => { window.dispatchEvent(new Event("focus")); });
    expect(container.querySelector("output")?.textContent).toBe("1");
  });
});
