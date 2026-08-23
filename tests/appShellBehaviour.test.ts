/**
 * @vitest-environment jsdom
 *
 * "Make it a real app, not a website."
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

function setPointer(coarse: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (q: string) => ({
      matches: q.includes("pointer: coarse") ? coarse : false,
      media: q, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    }),
  });
}

beforeEach(() => {
  vi.resetModules();
  document.documentElement.className = "";
});

describe("touch devices", () => {
  it("refuses iOS Safari's pinch-zoom gestures", async () => {
    setPointer(true);
    const { installAppShellBehaviour } = await import("@/lib/appShellBehaviour");
    const stop = installAppShellBehaviour();

    // Safari's non-standard gesture events are the ONLY way to block pinch on
    // iOS — it has ignored user-scalable=no since iOS 10.
    const e = new Event("gesturestart", { cancelable: true, bubbles: true });
    document.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
    stop();
  });

  it("swallows the second tap of a double-tap", async () => {
    setPointer(true);
    const { installAppShellBehaviour } = await import("@/lib/appShellBehaviour");
    const stop = installAppShellBehaviour();

    const first = new Event("touchend", { cancelable: true, bubbles: true });
    document.dispatchEvent(first);
    expect(first.defaultPrevented).toBe(false); // a single tap must work

    const second = new Event("touchend", { cancelable: true, bubbles: true });
    document.dispatchEvent(second);
    expect(second.defaultPrevented).toBe(true);
    stop();
  });

  it("marks the document so the CSS can key off it", async () => {
    setPointer(true);
    const { installAppShellBehaviour } = await import("@/lib/appShellBehaviour");
    const stop = installAppShellBehaviour();
    expect(document.documentElement.classList.contains("app-shell-touch")).toBe(true);
    stop();
    expect(document.documentElement.classList.contains("app-shell-touch")).toBe(false);
  });
});

describe("desktop", () => {
  it("leaves a desktop browser completely alone", async () => {
    // athark.org is still a website on a laptop; removing zoom or selection
    // there would be hostile.
    setPointer(false);
    const { installAppShellBehaviour } = await import("@/lib/appShellBehaviour");
    const stop = installAppShellBehaviour();

    const e = new Event("gesturestart", { cancelable: true, bubbles: true });
    document.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    expect(document.documentElement.classList.contains("app-shell-touch")).toBe(false);
    stop();
  });
});
