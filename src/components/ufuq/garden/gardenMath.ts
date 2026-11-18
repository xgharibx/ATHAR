/**
 * The arithmetic behind «الحديقة»: a seeded random source so every phone
 * gets the same garden for its size, the real phase of tonight's moon, the
 * wind, and how many flowers today's dhikr has planted.
 *
 * Kept free of the DOM so it can be tested on its own.
 */

/** Small, fast, seeded PRNG (mulberry32). Same seed, same garden. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mean synodic month, new moon to new moon, in days. */
export const SYNODIC_MONTH = 29.530588853;
/** A known new moon: 2000-01-06 18:14 UTC. */
const NEW_MOON_EPOCH_MS = Date.UTC(2000, 0, 6, 18, 14);

/**
 * Where the moon is in its month, 0 → 1: 0 new, 0.25 first quarter, 0.5 full,
 * 0.75 last quarter. The mean model is within about a day, which is what the
 * eye can tell.
 */
export function moonPhase(date: Date): number {
  const days = (date.getTime() - NEW_MOON_EPOCH_MS) / 86_400_000;
  const phase = (days / SYNODIC_MONTH) % 1;
  return phase < 0 ? phase + 1 : phase;
}

/** Share of the disc that is lit, 0 → 1. */
export function moonIllumination(phase: number): number {
  return (1 - Math.cos(2 * Math.PI * phase)) / 2;
}

/**
 * The breeze at a point and moment: two slow waves travelling across the
 * garden plus a quicker flutter, so neighbouring blades move together but
 * never in lockstep. Roughly −1 … 1.
 */
export function windAt(x: number, t: number): number {
  return (
    Math.sin(t * 0.8 + x * 0.011) * 0.55 +
    Math.sin(t * 1.9 + x * 0.027 + 1.3) * 0.28 +
    Math.sin(t * 4.3 + x * 0.09) * 0.08
  );
}

/**
 * Flowers in today's garden. A garden always blooms (the base), and every
 * remembrance plants more: «غِراسها سبحان الله…». It grows quickly at first
 * and gently after, up to what fits on a phone.
 */
export function bloomTarget(tasbeehToday: number, dhikrToday: number): number {
  const deeds = Math.max(0, tasbeehToday) + Math.max(0, dhikrToday) * 3;
  return Math.min(64, 14 + Math.floor(Math.sqrt(deeds) * 2.2));
}

export function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const v = Math.min(1, Math.max(0, x));
  return 1 + c3 * Math.pow(v - 1, 3) + c1 * Math.pow(v - 1, 2);
}

/** Night in the garden: after Maghrib (or Isha) until Fajr. */
export function isNightByNextPrayer(nextPrayerAr: string | null | undefined, hour: number): boolean {
  const name = nextPrayerAr ?? "";
  if (name.includes("الفجر") || name.includes("العشاء")) return true;
  if (name.includes("الظهر") || name.includes("العصر") || name.includes("المغرب")) return false;
  return hour >= 18 || hour < 5;
}
