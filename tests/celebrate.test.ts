/**
 * @vitest-environment jsdom
 *
 * The celebration must never outlive the moment it belongs to.
 *
 * Every call site used canvas-confetti's GLOBAL instance, which owns a canvas
 * it never gives back and a loop nobody can stop. Backgrounding the app
 * mid-burst — finishing a dhikr and putting the phone down — freezes
 * requestAnimationFrame, so the loop never reaches its last frame and the
 * half-fallen particles sit on top of the app until it is relaunched.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reset = vi.fn();
const fire = vi.fn();

vi.mock("canvas-confetti", () => ({
  default: { create: () => Object.assign(fire, { reset }) },
}));

let mod: typeof import("@/lib/celebrate");

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  reset.mockClear();
  fire.mockClear();
  document.body.innerHTML = "";
  Object.defineProperty(window, "matchMedia", {
    writable: true, configurable: true,
    value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
  mod = await import("@/lib/celebrate");
});
afterEach(() => vi.useRealTimers());

describe("firing", () => {
  it("fires a burst", async () => {
    await mod.celebrate([{ particleCount: 10 }]);
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it("staggers delayed bursts instead of firing them at once", async () => {
    await mod.celebrate([{ particleCount: 10 }, { particleCount: 5, delay: 200 }]);
    expect(fire).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(250);
    expect(fire).toHaveBeenCalledTimes(2);
  });

  it("does not pass `delay` through to confetti", async () => {
    await mod.celebrate([{ particleCount: 10, delay: 0 }]);
    expect(fire.mock.calls[0]![0]).not.toHaveProperty("delay");
  });

  it("uses one canvas no matter how many bursts", async () => {
    await mod.celebrate([{ particleCount: 1 }]);
    await mod.celebrate([{ particleCount: 1 }]);
    expect(document.querySelectorAll("#athar-celebration")).toHaveLength(1);
  });

  it("never intercepts a tap", async () => {
    await mod.celebrate([{ particleCount: 1 }]);
    const c = document.querySelector("#athar-celebration") as HTMLCanvasElement;
    expect(c.style.pointerEvents).toBe("none");
  });
});

describe("clearing — the actual bug", () => {
  it("clears when the page is hidden, because rAF stops there", async () => {
    await mod.celebrate([{ particleCount: 50, ticks: 200 }]);
    reset.mockClear();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(reset).toHaveBeenCalled();
  });

  it("clears on pagehide", async () => {
    await mod.celebrate([{ particleCount: 50 }]);
    reset.mockClear();
    window.dispatchEvent(new Event("pagehide"));
    expect(reset).toHaveBeenCalled();
  });

  it("clears itself after the longest burst, even if a frame is dropped", async () => {
    await mod.celebrate([{ particleCount: 50, ticks: 60 }]); // ~1s of animation
    reset.mockClear();
    vi.advanceTimersByTime(600);
    expect(reset).not.toHaveBeenCalled();   // still legitimately animating
    vi.advanceTimersByTime(3000);
    expect(reset).toHaveBeenCalled();
  });

  it("extends the watchdog for a later burst rather than cutting it short", async () => {
    await mod.celebrate([{ particleCount: 10, ticks: 60 }]);
    vi.advanceTimersByTime(500);
    await mod.celebrate([{ particleCount: 10, ticks: 300 }]);
    reset.mockClear();
    vi.advanceTimersByTime(2000);
    expect(reset).not.toHaveBeenCalled();
    vi.advanceTimersByTime(6000);
    expect(reset).toHaveBeenCalled();
  });

  it("can be cleared on demand, for navigating away", async () => {
    await mod.celebrate([{ particleCount: 50 }]);
    reset.mockClear();
    mod.resetCelebration();
    expect(reset).toHaveBeenCalled();
  });
});

describe("reduced motion", () => {
  it("fires nothing at all", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true, configurable: true,
      value: () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });
    await mod.celebrate([{ particleCount: 50 }]);
    expect(fire).not.toHaveBeenCalled();
  });
});
