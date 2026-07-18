// @vitest-environment jsdom
/**
 * tests/companionTimePhase.test.ts
 *
 * Regression: computeTimePhase() used fixed clock-hour boundaries
 * (hour < 19 → "maghrib" phase, hour < 22 → "isha") that don't track when
 * Maghrib/Isha actually happen — those shift with season and location. A
 * user whose real Maghrib was still 44 minutes away at wall-clock 19:16 was
 * shown the "isha" greeting ("ليلةٌ طيبة، أذكار النوم الآن") — sleep-adhkar
 * copy, hours before it was actually night. computeTimePhase now derives
 * the phase from the real next-prayer name when available (already
 * location-correct) and only falls back to the fixed-hour heuristic when no
 * prayer-time data exists yet.
 */
import { describe, expect, it } from "vitest";
import { __test__ } from "@/lib/companionAI";

const { computeTimePhase } = __test__;

describe("computeTimePhase — prayer-aware (live bug)", () => {
  it("never returns the sleep phase before Maghrib has actually happened", () => {
    // Wall clock says 19:16 (old heuristic: hour>=19 → "isha"), but Maghrib
    // is still the next prayer — it hasn't happened yet.
    const phase = computeTimePhase(19, "المغرب", 0.73);
    expect(phase).not.toBe("isha");
    expect(phase).not.toBe("late-night");
  });

  it("returns the sleep phase once Maghrib has passed and Isha approaches/has passed", () => {
    const phase = computeTimePhase(20, "الفجر", 9);
    expect(phase).toBe("isha");
  });

  it("falls back to the fixed-hour heuristic when no prayer data is available", () => {
    expect(computeTimePhase(20)).toBe("isha");
    expect(computeTimePhase(6)).toBe("fajr");
    expect(computeTimePhase(2)).toBe("qiyam");
  });

  it("maps the Dhuhr-to-Asr window correctly, including the 'about to enter' sub-case", () => {
    expect(computeTimePhase(13, "العصر", 3)).toBe("dhuhr");
    expect(computeTimePhase(15, "العصر", 0.5)).toBe("asr");
  });

  it("maps Fajr-to-Dhuhr window to fajr/duha by hour", () => {
    expect(computeTimePhase(7, "الظهر", 5)).toBe("fajr");
    expect(computeTimePhase(10, "الظهر", 2)).toBe("duha");
  });

  it("maps the Maghrib-to-Isha window to the 'maghrib' phase", () => {
    expect(computeTimePhase(18, "العشاء", 1)).toBe("maghrib");
  });
});
