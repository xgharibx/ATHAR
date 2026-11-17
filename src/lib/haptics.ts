import { Capacitor, registerPlugin } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

/**
 * One vibration entry point for the whole app.
 *
 * Patterns use the Vibration API's shape: a duration in milliseconds, or an
 * array alternating vibrate and pause durations. The web plays the pattern
 * as written. The apps play each vibrate step as one crisp native tap, timed
 * to the same rhythm and weighted by the step's duration:
 *   - iOS: a Taptic Engine impact (the web view has no Vibration API).
 *   - Android: one of the phone's predefined tick / click / heavy-click
 *     effects (NativeHapticsPlugin), which feel like the system keyboard
 *     rather than the motor buzz of the Vibration API.
 */
export type VibrationPattern = number | readonly number[];

export type TapWeight = "light" | "medium" | "heavy";

const platform = () => Capacitor.getPlatform();

function weightFor(durationMs: number): TapWeight {
  if (durationMs <= 12) return "light";
  if (durationMs <= 30) return "medium";
  return "heavy";
}

/** When each tap of a pattern starts and how strong it is. */
export function nativeTapsFor(pattern: VibrationPattern): Array<{ atMs: number; weight: TapWeight }> {
  const steps = typeof pattern === "number" ? [pattern] : pattern;
  const taps: Array<{ atMs: number; weight: TapWeight }> = [];
  let elapsed = 0;
  steps.forEach((duration, index) => {
    const ms = Math.max(0, duration);
    if (index % 2 === 0 && ms > 0) taps.push({ atMs: elapsed, weight: weightFor(ms) });
    elapsed += ms;
  });
  return taps;
}

const IOS_STYLE: Record<TapWeight, ImpactStyle> = {
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  heavy: ImpactStyle.Heavy,
};

/** The iOS impacts for a pattern: when each one starts and how strong it is. */
export function iosImpactsFor(pattern: VibrationPattern): Array<{ atMs: number; style: ImpactStyle }> {
  return nativeTapsFor(pattern).map(({ atMs, weight }) => ({ atMs, style: IOS_STYLE[weight] }));
}

const ANDROID_EFFECT: Record<TapWeight, "tick" | "click" | "heavy"> = {
  light: "tick",
  medium: "click",
  heavy: "heavy",
};

type NativeHapticsPlugin = { play(options: { effect: "tick" | "click" | "heavy" }): Promise<void> };
let androidHaptics: NativeHapticsPlugin | null = null;
/** Set once an app build without the native plugin has been detected. */
let androidPluginMissing = false;

function playWebPattern(pattern: VibrationPattern): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(typeof pattern === "number" ? pattern : [...pattern]);
  } catch {
    /* vibration unavailable */
  }
}

function schedule(atMs: number, fire: () => void): void {
  if (atMs === 0) fire();
  else setTimeout(fire, atMs);
}

export function vibrate(pattern: VibrationPattern): void {
  const os = platform();
  if (os === "ios") {
    for (const { atMs, style } of iosImpactsFor(pattern)) {
      schedule(atMs, () => void Haptics.impact({ style }).catch(() => {}));
    }
    return;
  }
  if (os === "android" && !androidPluginMissing) {
    androidHaptics ??= registerPlugin<NativeHapticsPlugin>("NativeHaptics");
    const plugin = androidHaptics;
    for (const { atMs, weight } of nativeTapsFor(pattern)) {
      schedule(atMs, () => {
        if (androidPluginMissing) return;
        plugin.play({ effect: ANDROID_EFFECT[weight] }).catch(() => {
          // An app build from before the native haptics: use the Vibration API.
          if (!androidPluginMissing) {
            androidPluginMissing = true;
            playWebPattern(pattern);
          }
        });
      });
    }
    return;
  }
  playWebPattern(pattern);
}

/** Whether this device can give any haptic feedback. */
export function canVibrate(): boolean {
  const os = platform();
  return os === "ios" || os === "android" || (typeof navigator !== "undefined" && typeof navigator.vibrate === "function");
}
