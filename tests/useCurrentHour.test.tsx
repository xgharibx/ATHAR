// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { useCurrentHour } from "@/hooks/useCurrentHour";

let root: Root;
let container: HTMLDivElement;

function HourProbe() {
  return <output data-testid="hour">{useCurrentHour()}</output>;
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 9, 14, 59, 30));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe("useCurrentHour", () => {
  it("updates at the next local hour without waiting for another store change", () => {
    act(() => root.render(<HourProbe />));
    expect(container.querySelector("output")?.textContent).toBe("14");

    act(() => { vi.advanceTimersByTime(30_000); });
    expect(container.querySelector("output")?.textContent).toBe("15");
  });

  it("refreshes the hour immediately when the app regains focus", () => {
    act(() => root.render(<HourProbe />));
    vi.setSystemTime(new Date(2026, 10, 9, 21, 5));

    act(() => { window.dispatchEvent(new Event("focus")); });
    expect(container.querySelector("output")?.textContent).toBe("21");
  });
});
