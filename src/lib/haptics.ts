import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

/**
 * One vibration entry point for the whole app.
 *
 * Patterns use the Vibration API's shape: a duration in milliseconds, or an
 * array alternating vibrate and pause durations. Android and the web play
 * the pattern as written. iOS has no Vibration API in its web view, so the
 * iOS app plays each vibrate step as a Taptic Engine impact, timed to the
 * same rhythm and weighted by the step's duration.
 */
export type VibrationPattern = number | readonly number[];

const isNativeIos = () => Capacitor.getPlatform() === "ios";

function impactStyleFor(durationMs: number): ImpactStyle {
  if (durationMs <= 12) return ImpactStyle.Light;
  if (durationMs <= 30) return ImpactStyle.Medium;
  return ImpactStyle.Heavy;
}

/** The iOS impacts for a pattern: when each one starts and how strong it is. */
export function iosImpactsFor(pattern: VibrationPattern): Array<{ atMs: number; style: ImpactStyle }> {
  const steps = typeof pattern === "number" ? [pattern] : pattern;
  const impacts: Array<{ atMs: number; style: ImpactStyle }> = [];
  let elapsed = 0;
  steps.forEach((duration, index) => {
    const ms = Math.max(0, duration);
    if (index % 2 === 0 && ms > 0) impacts.push({ atMs: elapsed, style: impactStyleFor(ms) });
    elapsed += ms;
  });
  return impacts;
}

export function vibrate(pattern: VibrationPattern): void {
  if (isNativeIos()) {
    for (const { atMs, style } of iosImpactsFor(pattern)) {
      const fire = () => void Haptics.impact({ style }).catch(() => {});
      if (atMs === 0) fire();
      else setTimeout(fire, atMs);
    }
    return;
  }
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(typeof pattern === "number" ? pattern : [...pattern]);
  } catch {
    /* vibration unavailable */
  }
}

/** Whether this device can give any haptic feedback. */
export function canVibrate(): boolean {
  return isNativeIos() || (typeof navigator !== "undefined" && typeof navigator.vibrate === "function");
}
