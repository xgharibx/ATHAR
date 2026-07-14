export type HapticStrength = "off" | "light" | "medium" | "strong";

function hapticMs(strength: HapticStrength | undefined, base: number): number {
  const s = strength ?? "medium";
  if (s === "off") return 0;
  if (s === "light") return Math.max(4, Math.round(base * 0.5));
  if (s === "strong") return Math.round(base * 1.7);
  return base;
}

/**
 * Play a haptic pulse via navigator.vibrate. Respects the user's
 * enableHaptics preference and the chosen hapticStrength. Safe to call
 * even when navigator.vibrate is unavailable — no-op in that case.
 */
export function doHaptic(
  count: number,
  target: number | null,
  enabled: boolean,
  strength: HapticStrength | undefined = "medium",
): void {
  if (!enabled || strength === "off") return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  const isCompletion = target !== null && count >= target;
  const isHundred = count % 100 === 0 && count > 0;
  const isThirtyThree = count % 33 === 0 && count > 0 && !isHundred;
  if (isCompletion) {
    navigator.vibrate([
      hapticMs(strength, 40), 30,
      hapticMs(strength, 40), 30,
      hapticMs(strength, 60),
    ]);
    return;
  }
  if (isHundred) {
    navigator.vibrate([
      hapticMs(strength, 30), 20,
      hapticMs(strength, 30), 20,
      hapticMs(strength, 30),
    ]);
    return;
  }
  if (isThirtyThree) {
    navigator.vibrate([hapticMs(strength, 40), 20, hapticMs(strength, 40)]);
    return;
  }
  navigator.vibrate(hapticMs(strength, 10));
}

import type { SoundProfileDef } from "./dhikrCatalog";

/**
 * Play a soft chime when the user reaches the target. Uses Web Audio
 * oscillators (no asset files) so it works offline. Respects enableSounds.
 */
export function playCompletionSound(
  enabled: boolean,
  profile: SoundProfileDef,
): void {
  if (!enabled) return;
  if (typeof window === "undefined") return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    for (const note of profile.notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = note.freq;
      const start = now + note.startOffset;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + note.duration + 0.05);
    }
    const totalMs = Math.max(...profile.notes.map((n) => (n.startOffset + n.duration) * 1000)) + 100;
    setTimeout(() => ctx.close().catch(() => {}), totalMs);
  } catch { /* audio unavailable */ }
}