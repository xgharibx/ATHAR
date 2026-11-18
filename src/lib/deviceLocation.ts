/**
 * The phone's location, from the phone itself.
 *
 * In the apps the web view's geolocation was a second layer on top of the
 * system's: on iPhone it could add a web-style "localhost would like to use
 * your location" question after the system one, and neither phone's web view
 * knew about approximate location. The apps now ask the phone directly
 * (LocationAccessPlugin: Core Location on iPhone, Android's LocationManager,
 * which also works on phones without Google services), with one system
 * question and an answer that says when the location is only approximate.
 *
 * Errors keep the web's codes (1 denied, 2 unavailable, 3 timed out), so the
 * screens handle both the same way.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

export type DeviceLocation = {
  lat: number;
  lng: number;
  /** Metres; null when unknown. */
  accuracy: number | null;
  /** The person allowed only an approximate location (iPhone and Android 12+). */
  approximate: boolean;
};

export type DeviceLocationOptions = {
  /** Ask for a precise fix (nearby mosques). Prayer times and Qibla do well with a city-level one. */
  precise?: boolean;
  timeoutMs?: number;
  /** A fix this recent is good enough. */
  maxAgeMs?: number;
  /**
   * Never show a permission question: fail with code 1 unless already allowed.
   * For background checks such as travel detection.
   */
  onlyIfGranted?: boolean;
};

export class DeviceLocationError extends Error {
  readonly code: 1 | 2 | 3;
  constructor(code: 1 | 2 | 3, message: string) {
    super(message);
    this.name = "DeviceLocationError";
    this.code = code;
  }
}

type LocationAccessPlugin = {
  status(): Promise<{ granted: boolean }>;
  current(options: { precise: boolean; timeoutMs: number; maxAgeMs: number; onlyIfGranted: boolean }): Promise<{
    lat: number;
    lng: number;
    accuracy?: number | null;
    approximate?: boolean;
  }>;
};

let plugin: LocationAccessPlugin | null = null;

function native(): LocationAccessPlugin | null {
  if (!Capacitor.isNativePlatform()) return null;
  plugin ??= registerPlugin<LocationAccessPlugin>("LocationAccess");
  return plugin;
}

const NATIVE_CODES: Record<string, 1 | 2 | 3> = { denied: 1, unavailable: 2, timeout: 3 };

function nativeErrorCode(error: unknown): 1 | 2 | 3 | null {
  const record = (error ?? {}) as { code?: unknown; message?: unknown };
  for (const value of [record.code, record.message]) {
    if (typeof value === "string" && value in NATIVE_CODES) return NATIVE_CODES[value];
  }
  return null;
}

function validCoordinates(lat: unknown, lng: unknown): lat is number {
  return typeof lat === "number" && typeof lng === "number"
    && Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function webLocation(options: Required<Omit<DeviceLocationOptions, "onlyIfGranted">>): Promise<DeviceLocation> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new DeviceLocationError(2, "geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        approximate: false,
      }),
      (error) => {
        const code = error?.code === 1 || error?.code === 3 ? error.code : 2;
        reject(new DeviceLocationError(code, error?.message || "location unavailable"));
      },
      { enableHighAccuracy: options.precise, timeout: options.timeoutMs, maximumAge: options.maxAgeMs },
    );
  });
}

/** Whether this browser or app can locate the device at all. */
export function deviceLocationSupported(): boolean {
  if (native()) return true;
  return typeof navigator !== "undefined" && Boolean(navigator.geolocation);
}

/** Whether location is already allowed, without asking. Browsers: unknown, so false. */
export async function locationPermissionGranted(): Promise<boolean> {
  const bridge = native();
  if (!bridge) return false;
  try {
    return (await bridge.status()).granted === true;
  } catch {
    return false;
  }
}

/** Where the device is now. Rejects with a DeviceLocationError. */
export async function getDeviceLocation(options: DeviceLocationOptions = {}): Promise<DeviceLocation> {
  const settled = {
    precise: options.precise ?? false,
    timeoutMs: options.timeoutMs ?? 10_000,
    maxAgeMs: options.maxAgeMs ?? 0,
  };
  const bridge = native();
  if (bridge) {
    try {
      const fix = await bridge.current({ ...settled, onlyIfGranted: options.onlyIfGranted ?? false });
      if (!validCoordinates(fix.lat, fix.lng)) throw new DeviceLocationError(2, "invalid location");
      return {
        lat: fix.lat,
        lng: fix.lng,
        accuracy: typeof fix.accuracy === "number" && Number.isFinite(fix.accuracy) ? fix.accuracy : null,
        approximate: fix.approximate === true,
      };
    } catch (error) {
      if (error instanceof DeviceLocationError) throw error;
      const code = nativeErrorCode(error);
      if (code !== null) throw new DeviceLocationError(code, String((error as Error)?.message ?? "location error"));
      // An app build from before the native location: the web view's, as before.
      if (options.onlyIfGranted && !(await locationPermissionGranted())) {
        throw new DeviceLocationError(1, "not granted");
      }
    }
  }
  return webLocation(settled);
}
