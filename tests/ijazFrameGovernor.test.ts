// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cancelVisualFrame, particleCount, setStageVisible, visualDpr, visualFrame } from "@/ijaz/components/visuals/frameGovernor";

describe("miracle visuals frame governor", () => {
  afterEach(() => vi.useRealTimers());

  it("caps the drawing density on phones", () => {
    Object.defineProperty(window, "devicePixelRatio", { value: 3, configurable: true });
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    expect(visualDpr()).toBe(1.5);
    expect(particleCount(300)).toBe(150);
    expect(particleCount(60)).toBe(30);
  });

  it("sleeps while the stage is off screen, and wakes when it returns", () => {
    vi.useFakeTimers();
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    setStageVisible(true);
    setStageVisible(false); // registered and off screen
    const cb = vi.fn();
    const id = visualFrame(cb);
    expect(raf).not.toHaveBeenCalled();
    setStageVisible(true);
    vi.advanceTimersByTime(260);
    expect(raf).toHaveBeenCalledTimes(1);
    cancelVisualFrame(id);
    raf.mockRestore();
  });
});
