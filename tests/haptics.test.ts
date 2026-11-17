import { describe, expect, it } from "vitest";
import { ImpactStyle } from "@capacitor/haptics";
import { iosImpactsFor } from "@/lib/haptics";

describe("iOS haptic mapping", () => {
  it("plays a single pulse as one impact weighted by its length", () => {
    expect(iosImpactsFor(8)).toEqual([{ atMs: 0, style: ImpactStyle.Light }]);
    expect(iosImpactsFor(20)).toEqual([{ atMs: 0, style: ImpactStyle.Medium }]);
    expect(iosImpactsFor(60)).toEqual([{ atMs: 0, style: ImpactStyle.Heavy }]);
  });

  it("keeps the rhythm of a vibrate/pause pattern", () => {
    expect(iosImpactsFor([40, 30, 40, 30, 60])).toEqual([
      { atMs: 0, style: ImpactStyle.Heavy },
      { atMs: 70, style: ImpactStyle.Heavy },
      { atMs: 140, style: ImpactStyle.Heavy },
    ]);
    expect(iosImpactsFor([15, 8, 15])).toEqual([
      { atMs: 0, style: ImpactStyle.Medium },
      { atMs: 23, style: ImpactStyle.Medium },
    ]);
  });

  it("skips zero-length steps", () => {
    expect(iosImpactsFor([0, 10, 12])).toEqual([{ atMs: 10, style: ImpactStyle.Light }]);
  });
});
