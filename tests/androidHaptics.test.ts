import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  play: vi.fn(async (_options: { effect: string }) => {}),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => "android", isNativePlatform: () => true },
  registerPlugin: () => ({ play: native.play }),
}));
vi.mock("@capacitor/haptics", () => ({
  Haptics: { impact: vi.fn() },
  ImpactStyle: { Light: "LIGHT", Medium: "MEDIUM", Heavy: "HEAVY" },
}));

describe("Android haptics", () => {
  let webVibrate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    native.play.mockClear();
    webVibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate: webVibrate });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("plays each step as the phone's own tick, click or heavy click, in rhythm", async () => {
    const { vibrate } = await import("@/lib/haptics");
    vibrate([8, 40, 20, 40, 60]);
    expect(native.play.mock.calls.map(([options]) => options.effect)).toEqual(["tick"]);
    vi.advanceTimersByTime(48);
    expect(native.play.mock.calls.map(([options]) => options.effect)).toEqual(["tick", "click"]);
    vi.advanceTimersByTime(60);
    expect(native.play.mock.calls.map(([options]) => options.effect)).toEqual(["tick", "click", "heavy"]);
    expect(webVibrate).not.toHaveBeenCalled();
  });

  it("falls back to the Vibration API on an app build without the plugin", async () => {
    native.play.mockRejectedValue(new Error("not implemented"));
    const { vibrate } = await import("@/lib/haptics");
    vibrate(20);
    await vi.runAllTimersAsync();
    expect(webVibrate).toHaveBeenCalledWith(20);
    vibrate(15);
    expect(webVibrate).toHaveBeenLastCalledWith(15);
    expect(native.play).toHaveBeenCalledTimes(1);
    native.play.mockResolvedValue(undefined);
  });
});
