/**
 * The pieces of «أفق» that are loaded only when the design is on — its home
 * and its garden — and the means to have them ready before the switch, so
 * that the new design appears whole, in one movement, with no pause.
 */
import { lazyWithPreload } from "@/lib/lazyPreload";
import { warmGarden } from "@/components/ufuq/garden/gardenWarm";
import type { LiveGardenBackdrop } from "@/components/ufuq/garden/LiveGardenBackdrop";

export const UfuqHomeLazy = lazyWithPreload(() => import("@/components/ufuq/UfuqHome"));

type GardenProps = NonNullable<Parameters<typeof LiveGardenBackdrop>[0]>;

export const LiveGardenLazy = lazyWithPreload<GardenProps>(() =>
  import("@/components/ufuq/garden/LiveGardenBackdrop").then((m) => ({ default: m.LiveGardenBackdrop })),
);

// The weights «أفق» writes in: fetched with its code, so no text changes face after the switch.
const FONTS = [...["400", "500", "600", "700"].map((w) => `${w} 16px "IBM Plex Sans Arabic"`), `400 16px "Amiri Quran"`];

function loadFonts(): Promise<unknown> {
  const fonts = document.fonts;
  if (!fonts?.load) return Promise.resolve();
  return Promise.all(FONTS.flatMap((f) => [fonts.load(f, "أثر"), fonts.load(f, "Athar 1")])).catch(() => undefined);
}

let code: Promise<unknown> | null = null;

/** «أفق»'s code and type, fetched quietly (while the classic design is idle). */
export function preloadUfuqCode(): Promise<unknown> {
  return (code ??= Promise.all([UfuqHomeLazy.preload(), LiveGardenLazy.preload(), loadFonts()]).catch(() => {
    code = null;
  }));
}

/** Everything the switch needs, the garden's worker included. */
export function preloadUfuq(): Promise<unknown> {
  warmGarden();
  return preloadUfuqCode();
}

// The moment of the switch: the home then draws what is on screen first, and the rest right after.
let arrivedAt = -Infinity;

export function markUfuqArrival(): void {
  arrivedAt = performance.now();
}

export function isUfuqArriving(): boolean {
  return performance.now() - arrivedAt < 1500;
}
