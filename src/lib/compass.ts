/**
 * Compass heading for the Qibla, measured from TRUE north.
 *
 * In the Android and iOS apps the heading comes from the native CompassPlugin
 * (Android's fused rotation vector; Core Location on iOS), which also corrects
 * magnetic north to true north. On the web it comes from the browser's
 * orientation events, which report magnetic north, so the World Magnetic
 * Model (WMM2025, via the `geomagnetism` package) supplies the correction.
 * Without it the Qibla is off by the local declination: about 5° in Cairo,
 * 6° in Istanbul, 12° in New York and 15° in Vancouver.
 */
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type CompassReading = {
  /** Degrees clockwise from true north (or magnetic north when `trueNorth` is false). */
  heading: number;
  trueNorth: boolean;
  /** Possible error in degrees, when the device reports one. */
  accuracy: number | null;
  calibrationNeeded: boolean;
};

export type NativeHeadingEvent = {
  magneticHeading: number;
  trueHeading?: number;
  accuracy?: number;
  calibrationNeeded?: boolean;
};

export type CompassLocation = { lat: number; lng: number };

export function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** Smallest signed turn from `from` to `to`, in degrees (-180..180]. */
export function angleDelta(from: number, to: number): number {
  const delta = normalizeDegrees(to - from);
  return delta > 180 ? delta - 360 : delta;
}

/** Turn a magnetic reading into a true-north one when the declination is known. */
export function toTrueHeading(magnetic: number, declination: number | null): { heading: number; trueNorth: boolean } {
  if (declination == null || !Number.isFinite(declination)) return { heading: normalizeDegrees(magnetic), trueNorth: false };
  return { heading: normalizeDegrees(magnetic + declination), trueNorth: true };
}

/** A native reading, preferring the platform's own true heading. */
export function readingFromNative(event: NativeHeadingEvent, declination: number | null): CompassReading | null {
  if (!Number.isFinite(event.magneticHeading)) return null;
  const native = typeof event.trueHeading === "number" && Number.isFinite(event.trueHeading) && event.trueHeading >= 0;
  const { heading, trueNorth } = native
    ? { heading: normalizeDegrees(event.trueHeading!), trueNorth: true }
    : toTrueHeading(event.magneticHeading, declination);
  return {
    heading,
    trueNorth,
    accuracy: typeof event.accuracy === "number" && event.accuracy >= 0 ? event.accuracy : null,
    calibrationNeeded: event.calibrationNeeded === true,
  };
}

/**
 * Magnetic declination at a place, in degrees east of true north, from the
 * World Magnetic Model. Loaded on demand: only the compass needs it.
 */
export async function magneticDeclination(location: CompassLocation, date = new Date()): Promise<number | null> {
  try {
    const loaded = await import("geomagnetism");
    // A CommonJS package: bundlers expose it as the default export, or flat.
    const geomagnetism: typeof loaded.default = loaded.default ?? loaded;
    const declination = geomagnetism.model(date).point([location.lat, location.lng]).decl;
    return Number.isFinite(declination) ? declination : null;
  } catch {
    return null;
  }
}

type CompassPluginApi = {
  start(options: { latitude?: number; longitude?: number }): Promise<{ available: boolean }>;
  stop(): Promise<void>;
  setLocation(options: { latitude: number; longitude: number }): Promise<void>;
  addListener(event: "heading", listener: (event: NativeHeadingEvent) => void): Promise<PluginListenerHandle>;
};

let compassPlugin: CompassPluginApi | null = null;

function nativeCompass(): CompassPluginApi | null {
  if (!Capacitor.isNativePlatform()) return null;
  compassPlugin ??= registerPlugin<CompassPluginApi>("Compass");
  return compassPlugin;
}

export function hasNativeCompass(): boolean {
  return Capacitor.isNativePlatform();
}

export type NativeCompassSession = {
  setLocation(location: CompassLocation): void;
  stop(): void;
};

/**
 * Start native heading updates. Resolves to null when the app build or the
 * device has no compass, so the caller can fall back to the web events.
 */
export async function startNativeCompass(
  onEvent: (event: NativeHeadingEvent) => void,
  location: CompassLocation | null,
): Promise<NativeCompassSession | null> {
  const plugin = nativeCompass();
  if (!plugin) return null;
  let handle: PluginListenerHandle | null = null;
  try {
    handle = await plugin.addListener("heading", onEvent);
    const { available } = await plugin.start(location ? { latitude: location.lat, longitude: location.lng } : {});
    if (!available) {
      await handle.remove();
      return null;
    }
  } catch {
    // An app build from before the native compass existed.
    await handle?.remove().catch(() => {});
    return null;
  }
  return {
    setLocation(next) {
      void plugin.setLocation({ latitude: next.lat, longitude: next.lng }).catch(() => {});
    },
    stop() {
      void handle?.remove().catch(() => {});
      void plugin.stop().catch(() => {});
    },
  };
}
