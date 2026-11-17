import { describe, expect, it } from "vitest";
import {
  angleDelta,
  magneticDeclination,
  readingFromNative,
  toTrueHeading,
} from "@/lib/compass";
import { nextAlignment } from "@/hooks/useCompassHeading";

describe("true-north compass", () => {
  it("knows the local magnetic declination (WMM2025)", async () => {
    const when = new Date("2026-11-17T12:00:00Z");
    // Published NOAA values for late 2026, to within a fraction of a degree.
    const cases: Array<[string, number, number, number]> = [
      ["Cairo", 30.0444, 31.2357, 4.8],
      ["New York", 40.7128, -74.006, -12.5],
      ["Vancouver", 49.28, -123.12, 15.4],
      ["Jakarta", -6.2, 106.85, 0.7],
    ];
    for (const [, lat, lng, expected] of cases) {
      const declination = await magneticDeclination({ lat, lng }, when);
      expect(declination).not.toBeNull();
      expect(Math.abs(declination! - expected)).toBeLessThan(0.3);
    }
  });

  it("corrects magnetic headings to true north", () => {
    const corrected = toTrueHeading(100, 4.8);
    expect(corrected.heading).toBeCloseTo(104.8);
    expect(corrected.trueNorth).toBe(true);
    expect(toTrueHeading(5, -12.5).heading).toBeCloseTo(352.5);
    expect(toTrueHeading(100, null)).toEqual({ heading: 100, trueNorth: false });
  });

  it("prefers the phone's own true heading, falling back to the model", () => {
    expect(readingFromNative({ magneticHeading: 90, trueHeading: 95, accuracy: 8, calibrationNeeded: false }, 3))
      .toEqual({ heading: 95, trueNorth: true, accuracy: 8, calibrationNeeded: false });
    // iOS reports -1 when it has no location fix.
    expect(readingFromNative({ magneticHeading: 90, trueHeading: -1 }, 3)?.heading).toBe(93);
    expect(readingFromNative({ magneticHeading: 90, accuracy: -1, calibrationNeeded: true }, null))
      .toEqual({ heading: 90, trueNorth: false, accuracy: null, calibrationNeeded: true });
    expect(readingFromNative({ magneticHeading: Number.NaN }, 0)).toBeNull();
  });

  it("turns the short way across north", () => {
    expect(angleDelta(359, 1)).toBe(2);
    expect(angleDelta(1, 359)).toBe(-2);
    expect(angleDelta(90, 270)).toBe(180);
    expect(angleDelta(10, 10)).toBe(0);
  });

  it("decides when the user faces the Qibla without flickering", () => {
    const qibla = 136;
    expect(nextAlignment(false, 140, qibla)).toBe(false); // 4° off: not yet
    expect(nextAlignment(false, 138, qibla)).toBe(true); // within 3°
    expect(nextAlignment(true, 141, qibla)).toBe(true); // 5° off: still facing it
    expect(nextAlignment(true, 143, qibla)).toBe(false); // beyond 6°
    expect(nextAlignment(false, 358, 1)).toBe(true); // across north
    expect(nextAlignment(true, null, qibla)).toBe(false);
  });
});
