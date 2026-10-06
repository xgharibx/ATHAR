import { describe, expect, it, vi } from "vitest";
import { animateDhikrCountPress } from "../src/lib/dhikrPressFeedback";

describe("dhikr count press feedback", () => {
  it("animates only the button transform to avoid WebView filter flicker", () => {
    const animate = vi.fn();
    const button = { animate } as unknown as HTMLElement;

    animateDhikrCountPress(button, false);

    expect(animate).toHaveBeenCalledOnce();
    const frames = animate.mock.calls[0]![0] as Array<Record<string, unknown>>;
    expect(frames.every((frame) => "transform" in frame)).toBe(true);
    expect(frames.some((frame) => "filter" in frame)).toBe(false);
  });

  it("does not animate when reduced motion is enabled", () => {
    const animate = vi.fn();
    animateDhikrCountPress({ animate } as unknown as HTMLElement, true);
    expect(animate).not.toHaveBeenCalled();
  });
});
