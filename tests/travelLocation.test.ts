import fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  granted: true,
  saved: { lat: 30.0444, lng: 31.2357 } as { lat: number; lng: number } | null,
  here: { lat: 30.05, lng: 31.24 },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" },
  registerPlugin: vi.fn(() => ({ status: vi.fn(async () => ({ granted: mocks.granted })) })),
}));
vi.mock("@/lib/prayerLocation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/prayerLocation")>()),
  readCachedPrayerCoordinates: () => mocks.saved,
}));

import { distanceKm, followTravel, resetTravelCheck } from "@/lib/travelLocation";
import { buildPrayerTopUpPlan } from "@/lib/prayerTopUp";

const getCurrentPosition = vi.fn((success: PositionCallback) =>
  success({ coords: { latitude: mocks.here.lat, longitude: mocks.here.lng } } as GeolocationPosition));

beforeEach(() => {
  resetTravelCheck();
  mocks.granted = true;
  mocks.saved = { lat: 30.0444, lng: 31.2357 };
  mocks.here = { lat: 30.05, lng: 31.24 };
  getCurrentPosition.mockClear();
  Object.defineProperty(globalThis, "navigator", { value: { geolocation: { getCurrentPosition } }, configurable: true });
});

describe("prayer times follow you when you travel", () => {
  it("measures distance on the globe", () => {
    // Cairo → Alexandria is about 180 km.
    const km = distanceKm({ lat: 30.0444, lng: 31.2357 }, { lat: 31.2001, lng: 29.9187 });
    expect(km).toBeGreaterThan(170);
    expect(km).toBeLessThan(190);
  });

  it("keeps the location for moves within the city", async () => {
    const save = vi.fn();
    expect(await followTravel(save, { enabled: true, now: 1 })).toBe("same");
    expect(save).not.toHaveBeenCalled();
  });

  it("updates the location after travel to another city", async () => {
    mocks.here = { lat: 31.2001, lng: 29.9187 };
    const save = vi.fn();
    expect(await followTravel(save, { enabled: true, now: 1 })).toBe("moved");
    expect(save).toHaveBeenCalledWith(31.2001, 29.9187);
  });

  it("never asks for location, and stays out of city mode and when turned off", async () => {
    const save = vi.fn();
    mocks.granted = false;
    expect(await followTravel(save, { enabled: true, now: 1 })).toBe("skipped");
    expect(getCurrentPosition).not.toHaveBeenCalled();
    resetTravelCheck();
    mocks.granted = true;
    mocks.saved = null;
    expect(await followTravel(save, { enabled: true, now: 1 })).toBe("skipped");
    resetTravelCheck();
    mocks.saved = { lat: 30.0444, lng: 31.2357 };
    expect(await followTravel(save, { enabled: false, now: 1 })).toBe("skipped");
    expect(save).not.toHaveBeenCalled();
  });

  it("checks at most every twenty minutes", async () => {
    const save = vi.fn();
    await followTravel(save, { enabled: true, now: 1_000_000 });
    expect(await followTravel(save, { enabled: true, now: 1_000_000 + 60_000 })).toBe("skipped");
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("tells the phone which time zone the plan's times are for", () => {
    const plan = buildPrayerTopUpPlan({
      scheduledThrough: "2026-10-02", coords: { lat: 30, lng: 31 }, method: 5, school: 0, templates: {},
      slotCount: 10, slotOffset: 10, slotForDate: () => 0, planDays: 1, timeZone: "Africa/Cairo",
    });
    expect(plan.tz).toBe("Africa/Cairo");
  });

  it("stops queuing old-city times after a time-zone change, and says why", () => {
    const java = (name: string) => fs.readFileSync(`android/app/src/main/java/com/athar/adhkar/${name}.java`, "utf8");
    expect(java("PrayerTopUp")).toContain("TravelNotice.show(context");
    expect(java("AdhanAlarm")).toContain("PrayerTopUp.timeZoneMatches(plan)");
    expect(java("PrayerSilence")).toContain("PrayerTopUp.timeZoneMatches(plan)");
    expect(java("AtharActivity")).toContain("registerPlugin(LocationAccessPlugin.class)");
    const swift = fs.readFileSync("ios/App/App/PrayerTopUp.swift", "utf8");
    expect(swift).toContain("guard timeZoneMatches(plan) else");
    expect(fs.readFileSync("ios/App/App/AdhanAlarmKit.swift", "utf8")).toContain("PrayerTopUp.timeZoneMatches(plan)");
    expect(fs.readFileSync("ios/App/App/AtharBridgeViewController.swift", "utf8")).toContain("registerPluginInstance(LocationAccessPlugin())");
    for (const file of ["values/strings.xml", "values-ar/strings.xml"]) {
      expect(fs.readFileSync(`android/app/src/main/res/${file}`, "utf8")).toContain('name="travel_text"');
    }
  });
});
