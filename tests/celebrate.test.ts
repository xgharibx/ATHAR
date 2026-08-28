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

  it("clears as soon as the confetti itself reports it has landed", async () => {
    // The normal path, and the reason the burst is no longer cut off mid-air:
    // canvas-confetti resolves when ITS animation has genuinely finished, so
    // nothing here has to guess a duration.
    let land: () => void = () => {};
    fire.mockImplementationOnce(() => new Promise<void>((r) => { land = r; }));

    await mod.celebrate([{ particleCount: 50, ticks: 60 }]);
    reset.mockClear();

    vi.advanceTimersByTime(600);
    expect(reset).not.toHaveBeenCalled();   // still legitimately in the air

    land();
    // Promise.all -> .catch -> .then is several microtask hops deep.
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
    expect(reset).toHaveBeenCalled();
  });

  it("no timer ever cuts a burst short", async () => {
    // The whole point. Any duration derived from `ticks` is a guess at a frame
    // rate, and every guess that came in under the real one wiped confetti out
    // of the air. While the animation has not reported back, nothing clears it
    // — however long that takes.
    fire.mockImplementationOnce(() => new Promise<void>(() => {}));

    await mod.celebrate([{ particleCount: 50, ticks: 60 }]);
    reset.mockClear();

    vi.advanceTimersByTime(120_000);
    expect(reset).not.toHaveBeenCalled();
    fire.mockReset();
  });

  it("a finished burst never clears a newer one still in the air", async () => {
    let landFirst: () => void = () => {};
    fire.mockImplementationOnce(() => new Promise<void>((r) => { landFirst = r; }));
    fire.mockImplementationOnce(() => new Promise<void>(() => {}));

    await mod.celebrate([{ particleCount: 10 }]);
    await mod.celebrate([{ particleCount: 10 }]);   // the newer one
    reset.mockClear();

    landFirst();                                    // the older one lands
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
    expect(reset).not.toHaveBeenCalled();           // the newer burst survives
    fire.mockReset();
  });

  it("backgrounding still clears, since a frozen burst can never land", async () => {
    fire.mockImplementationOnce(() => new Promise<void>(() => {}));
    await mod.celebrate([{ particleCount: 50 }]);
    reset.mockClear();

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(reset).toHaveBeenCalled();
    fire.mockReset();
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
