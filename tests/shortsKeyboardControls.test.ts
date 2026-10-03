import { describe, expect, it } from "vitest";
import { getShortsSeekTarget } from "@/lib/shortsKeyboardControls";

describe("Shorts keyboard seeking", () => {
  it("moves by small steps and larger page steps", () => {
    expect(getShortsSeekTarget("ArrowRight", 0.5)).toBeCloseTo(0.55);
    expect(getShortsSeekTarget("ArrowUp", 0.5)).toBeCloseTo(0.55);
    expect(getShortsSeekTarget("ArrowLeft", 0.5)).toBeCloseTo(0.45);
    expect(getShortsSeekTarget("ArrowDown", 0.5)).toBeCloseTo(0.45);
    expect(getShortsSeekTarget("PageUp", 0.5)).toBeCloseTo(0.6);
    expect(getShortsSeekTarget("PageDown", 0.5)).toBeCloseTo(0.4);
  });

  it("supports Home and End and clamps at the clip boundaries", () => {
    expect(getShortsSeekTarget("Home", 0.5)).toBe(0);
    expect(getShortsSeekTarget("End", 0.5)).toBe(1);
    expect(getShortsSeekTarget("ArrowRight", 0.99)).toBe(1);
    expect(getShortsSeekTarget("ArrowLeft", 0.01)).toBe(0);
  });

  it("ignores keys unrelated to the slider", () => {
    expect(getShortsSeekTarget("Enter", 0.5)).toBeNull();
    expect(getShortsSeekTarget("Tab", 0.5)).toBeNull();
  });
});
