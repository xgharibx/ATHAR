// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

function mockNative(plugin: Record<string, unknown>) {
  vi.doMock("@capacitor/core", () => ({
    Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" },
    registerPlugin: () => plugin,
  }));
}

function mockWebGeolocation(result: { lat: number; lng: number } | { code: number }) {
  const getCurrentPosition = vi.fn((ok: PositionCallback, fail: PositionErrorCallback) => {
    if ("lat" in result) ok({ coords: { latitude: result.lat, longitude: result.lng, accuracy: 50 } } as GeolocationPosition);
    else fail({ code: result.code, message: "nope" } as GeolocationPositionError);
  });
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
  return getCurrentPosition;
}

describe("device location", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    vi.doUnmock("@capacitor/core");
    Reflect.deleteProperty(navigator, "geolocation");
  });

  it("asks the phone itself in the apps and reports an approximate location", async () => {
    const current = vi.fn(async () => ({ lat: 30.04, lng: 31.24, accuracy: 2000, approximate: true }));
    mockNative({ current, status: vi.fn(async () => ({ granted: true })) });
    const web = mockWebGeolocation({ lat: 0, lng: 0 });
    const { getDeviceLocation } = await import("@/lib/deviceLocation");

    await expect(getDeviceLocation({ precise: true, timeoutMs: 5000 })).resolves.toEqual({
      lat: 30.04, lng: 31.24, accuracy: 2000, approximate: true,
    });
    expect(current).toHaveBeenCalledWith({ precise: true, timeoutMs: 5000, maxAgeMs: 0, onlyIfGranted: false });
    expect(web).not.toHaveBeenCalled();
  });

  it("keeps the web's error codes for the phone's refusals", async () => {
    mockNative({ current: vi.fn(async () => { throw Object.assign(new Error("denied"), { code: "denied" }); }) });
    const { getDeviceLocation } = await import("@/lib/deviceLocation");
    await expect(getDeviceLocation()).rejects.toMatchObject({ code: 1 });

    vi.resetModules();
    mockNative({ current: vi.fn(async () => { throw Object.assign(new Error("timeout"), { code: "timeout" }); }) });
    const again = await import("@/lib/deviceLocation");
    await expect(again.getDeviceLocation()).rejects.toMatchObject({ code: 3 });
  });

  it("falls back to the web view's location in an older app build", async () => {
    mockNative({ status: vi.fn(async () => ({ granted: true })) }); // no current()
    const web = mockWebGeolocation({ lat: 21.42, lng: 39.83 });
    const { getDeviceLocation } = await import("@/lib/deviceLocation");
    await expect(getDeviceLocation()).resolves.toMatchObject({ lat: 21.42, lng: 39.83, approximate: false });
    expect(web).toHaveBeenCalledTimes(1);
  });

  it("never asks in an older app build when only an existing permission may be used", async () => {
    mockNative({ status: vi.fn(async () => ({ granted: false })) });
    const web = mockWebGeolocation({ lat: 21.42, lng: 39.83 });
    const { getDeviceLocation } = await import("@/lib/deviceLocation");
    await expect(getDeviceLocation({ onlyIfGranted: true })).rejects.toMatchObject({ code: 1 });
    expect(web).not.toHaveBeenCalled();
  });

  it("uses the browser's location on the web", async () => {
    vi.doMock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false }, registerPlugin: vi.fn() }));
    mockWebGeolocation({ code: 1 });
    const { getDeviceLocation, deviceLocationSupported } = await import("@/lib/deviceLocation");
    expect(deviceLocationSupported()).toBe(true);
    await expect(getDeviceLocation()).rejects.toMatchObject({ code: 1 });
  });

  it("has native location on both phones, and no screen calls the web view's directly", () => {
    const ios = read("ios/App/App/LocationAccessPlugin.swift");
    expect(ios).toContain("requestWhenInUseAuthorization");
    expect(ios).toContain('requestTemporaryFullAccuracyAuthorization(withPurposeKey: "NearbyMosques")');
    expect(read("ios/App/App/Info.plist")).toContain("<key>NSLocationTemporaryUsageDescriptionDictionary</key>");
    expect(read("ios/App/App/ar.lproj/InfoPlist.strings")).toContain('"NearbyMosques"');
    const android = read("android/app/src/main/java/com/athar/adhkar/LocationAccessPlugin.java");
    expect(android).toContain("requestPermissionForAlias(\"location\"");
    expect(android).toContain("LocationManager");
    expect(android).not.toContain("com.google.android.gms.location");
    for (const file of ["src/hooks/usePrayerTimes.ts", "src/lib/travelLocation.ts", "src/pages/NearbyMosques.tsx", "src/pages/Qibla.tsx"]) {
      expect(read(file)).not.toContain("navigator.geolocation");
      expect(read(file)).toContain("getDeviceLocation");
    }
  });
});
