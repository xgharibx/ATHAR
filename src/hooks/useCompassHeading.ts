import * as React from "react";
import {
  angleDelta,
  hasNativeCompass,
  magneticDeclination,
  normalizeDegrees,
  readingFromNative,
  startNativeCompass,
  toTrueHeading,
  type CompassLocation,
  type CompassReading,
  type NativeCompassSession,
} from "@/lib/compass";

/** How much of each new reading to take: lower is steadier, higher is quicker. */
const SMOOTHING = { native: 0.4, web: 0.28 } as const;

export type CompassSource = "native" | "web";

export type CompassHeadingState = {
  /** Degrees clockwise from true north, 0..360, or null before the first reading. */
  heading: number | null;
  /**
   * The same heading without wrapping at 360, so an animated needle always
   * turns the short way across north instead of spinning round.
   */
  continuousHeading: number | null;
  trueNorth: boolean;
  accuracy: number | null;
  calibrationNeeded: boolean;
  /** Web only: the phone is held too upright for the browser's compass. */
  tiltWarning: boolean;
  source: CompassSource | null;
};

const EMPTY: CompassHeadingState = {
  heading: null,
  continuousHeading: null,
  trueNorth: false,
  accuracy: null,
  calibrationNeeded: false,
  tiltWarning: false,
  source: null,
};

type OrientationPermissionApi = { requestPermission?: () => Promise<string> };

function orientationPermissionApi(): OrientationPermissionApi | undefined {
  return (globalThis as typeof globalThis & { DeviceOrientationEvent?: OrientationPermissionApi }).DeviceOrientationEvent;
}

/** Browser compass events, which report magnetic north. */
function listenToWebOrientation(onMagnetic: (heading: number, accuracy: number | null, tiltWarning: boolean) => void): () => void {
  let gotAbsolute = false;
  const handleAbsolute = (event: DeviceOrientationEvent) => {
    if (event.alpha == null) return;
    gotAbsolute = true;
    // alpha runs counter-clockwise; a compass bearing runs clockwise.
    onMagnetic(normalizeDegrees(360 - event.alpha), null, Math.abs(event.beta ?? 0) > 65);
  };
  const handleOrientation = (event: DeviceOrientationEvent) => {
    if (gotAbsolute) return;
    const webkit = event as DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };
    // A plain alpha is relative to wherever the phone started, so only Safari's own heading counts.
    if (typeof webkit.webkitCompassHeading !== "number") return;
    const accuracy = typeof webkit.webkitCompassAccuracy === "number" && webkit.webkitCompassAccuracy >= 0
      ? webkit.webkitCompassAccuracy
      : null;
    onMagnetic(webkit.webkitCompassHeading, accuracy, false);
  };
  globalThis.addEventListener("deviceorientationabsolute", handleAbsolute as EventListener, true);
  globalThis.addEventListener("deviceorientation", handleOrientation, true);
  return () => {
    globalThis.removeEventListener("deviceorientationabsolute", handleAbsolute as EventListener, true);
    globalThis.removeEventListener("deviceorientation", handleOrientation, true);
  };
}

/**
 * The device's heading from true north, for the Qibla compass. Uses the
 * native compass in the Android and iOS apps and the browser's orientation
 * events on the web, correcting magnetic north for `location`.
 */
export function useCompassHeading(location: CompassLocation | null) {
  const [state, setState] = React.useState<CompassHeadingState>(EMPTY);
  const [webPermissionNeeded, setWebPermissionNeeded] = React.useState(
    () => !hasNativeCompass() && typeof orientationPermissionApi()?.requestPermission === "function",
  );
  const declinationRef = React.useRef<number | null>(null);
  const continuousRef = React.useRef<number | null>(null);
  const sessionRef = React.useRef<NativeCompassSession | null>(null);
  const locationRef = React.useRef(location);
  const lat = location?.lat;
  const lng = location?.lng;

  const apply = React.useCallback((reading: CompassReading, source: CompassSource, tiltWarning = false) => {
    const previous = continuousRef.current;
    const continuous = previous == null
      ? reading.heading
      : previous + angleDelta(previous, reading.heading) * SMOOTHING[source];
    continuousRef.current = continuous;
    setState({
      heading: normalizeDegrees(continuous),
      continuousHeading: continuous,
      trueNorth: reading.trueNorth,
      accuracy: reading.accuracy,
      calibrationNeeded: reading.calibrationNeeded,
      tiltWarning,
      source,
    });
  }, []);

  // Magnetic declination for where the user is.
  React.useEffect(() => {
    if (lat == null || lng == null) {
      declinationRef.current = null;
      return;
    }
    const here = { lat, lng };
    locationRef.current = here;
    sessionRef.current?.setLocation(here);
    let cancelled = false;
    void magneticDeclination(here).then((declination) => {
      if (!cancelled) declinationRef.current = declination;
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  React.useEffect(() => {
    let cancelled = false;
    let stopWeb: (() => void) | null = null;

    const startWeb = () => {
      stopWeb = listenToWebOrientation((magnetic, accuracy, tiltWarning) => {
        const { heading, trueNorth } = toTrueHeading(magnetic, declinationRef.current);
        apply({ heading, trueNorth, accuracy, calibrationNeeded: false }, "web", tiltWarning);
      });
    };

    if (hasNativeCompass()) {
      void startNativeCompass((event) => {
        const reading = readingFromNative(event, declinationRef.current);
        if (reading) apply(reading, "native");
      }, locationRef.current).then((session) => {
        if (cancelled) {
          session?.stop();
          return;
        }
        if (session) sessionRef.current = session;
        else startWeb();
      });
    } else {
      startWeb();
    }

    return () => {
      cancelled = true;
      sessionRef.current?.stop();
      sessionRef.current = null;
      stopWeb?.();
    };
  }, [apply]);

  /** Safari asks before sharing compass data, and only from a tap. */
  const requestWebPermission = React.useCallback(async () => {
    const api = orientationPermissionApi();
    if (typeof api?.requestPermission !== "function") {
      setWebPermissionNeeded(false);
      return true;
    }
    try {
      const granted = (await api.requestPermission()) === "granted";
      setWebPermissionNeeded(!granted);
      return granted;
    } catch {
      return false;
    }
  }, []);

  return { ...state, webPermissionNeeded: webPermissionNeeded && state.heading == null, requestWebPermission };
}

/** Within this many degrees, the user is facing the Qibla. */
export const QIBLA_ALIGNED_DEGREES = 3;
/** And they stop facing it only beyond this, so the state does not flicker at the edge. */
export const QIBLA_RELEASE_DEGREES = 6;

/** Whether the user faces the Qibla, with a little hysteresis. */
export function nextAlignment(wasAligned: boolean, heading: number | null, qiblaBearing: number | null): boolean {
  if (heading == null || qiblaBearing == null) return false;
  const off = Math.abs(angleDelta(heading, qiblaBearing));
  return wasAligned ? off <= QIBLA_RELEASE_DEGREES : off <= QIBLA_ALIGNED_DEGREES;
}
