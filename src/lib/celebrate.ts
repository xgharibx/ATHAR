/**
 * Celebration bursts, with a lifecycle.
 *
 * Every call site used to reach for canvas-confetti's GLOBAL instance, which
 * owns a canvas it never gives back and an animation loop nobody can stop.
 * That is why the celebration froze: when the app is backgrounded mid-burst —
 * exactly what happens when you finish a dhikr and put the phone down —
 * requestAnimationFrame stops firing, the loop never reaches its last frame,
 * the canvas is never cleared, and the half-fallen particles sit on top of the
 * app until it is relaunched.
 *
 * So this module owns its own canvas and clears it on every path that can
 * strand an animation:
 *   - the page being hidden (the actual cause),
 *   - navigating away,
 *   - a watchdog sized to the longest burst, in case a frame is simply dropped.
 *
 * Clearing while hidden costs nothing: nobody is looking at it.
 */

type ConfettiFn = (opts: Record<string, unknown>) => Promise<null> | null;
type ConfettiInstance = ConfettiFn & { reset: () => void };

export type Burst = Record<string, unknown> & {
  /** Fire this burst this many ms after celebrate() is called. */
  delay?: number;
};

const CANVAS_ID = "athar-celebration";
/** canvas-confetti's own default when `ticks` is not given. */
const DEFAULT_TICKS = 200;
/**
 * The watchdog's frame-rate assumption.
 *
 * `ticks` is a count of FRAMES, not milliseconds, so turning it into a duration
 * means guessing a frame rate. Assuming 60 was the bug: a phone painting at 30
 * takes twice as long, so the canvas was wiped while the confetti was still
 * mid-air and the burst vanished rather than landing. The watchdog exists only
 * for the case where the animation never finishes at all, so it should assume
 * the worst plausible rate and be late rather than early.
 */
const WATCHDOG_ASSUMED_FPS = 15;
const WATCHDOG_BUFFER_MS = 2000;

let instance: ConfettiInstance | null = null;
let canvas: HTMLCanvasElement | null = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;
let listenersBound = false;
/** Bumped per celebration so a finished burst never clears a newer one. */
let celebrationGeneration = 0;

function bindLifecycle() {
  if (listenersBound || typeof document === "undefined") return;
  listenersBound = true;

  // The important one. rAF is frozen while hidden, so anything mid-flight can
  // never finish on its own.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") resetCelebration();
  });
  window.addEventListener("pagehide", resetCelebration);
}

async function getInstance(): Promise<ConfettiInstance | null> {
  if (instance) return instance;
  if (typeof document === "undefined") return null;

  try {
    const mod = await import("canvas-confetti");
    const confetti = (mod.default ?? mod) as unknown as {
      create: (c: HTMLCanvasElement, o: Record<string, unknown>) => ConfettiInstance;
    };

    canvas = document.createElement("canvas");
    canvas.id = CANVAS_ID;
    // Never intercept a tap: a stuck canvas must not also block the UI.
    canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483000";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);

    instance = confetti.create(canvas, { resize: true, useWorker: true });
    bindLifecycle();
    return instance;
  } catch {
    return null; // a missing celebration must never break counting
  }
}

/** Clear anything on screen right now. Safe to call at any time. */
export function resetCelebration(): void {
  if (watchdog) {
    clearTimeout(watchdog);
    watchdog = null;
  }
  try {
    instance?.reset();
  } catch {
    /* ignore */
  }
}

/**
 * Fire one or more bursts. Resolves once they have all been *started* — the
 * caller never needs to await the animation.
 */
export async function celebrate(bursts: Burst[]): Promise<void> {
  if (!bursts.length) return;
  // Respect the OS setting rather than relying on every call site to pass it.
  if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const c = await getInstance();
  if (!c) return;

  let longest = 0;
  // Each burst resolves when ITS OWN animation has actually finished, which is
  // the only honest signal that the confetti has landed. Waiting on these
  // rather than on a computed duration is what lets a burst finish falling on
  // a slow device instead of being wiped out of the air.
  const landed: Array<Promise<unknown>> = [];

  for (const { delay = 0, ...opts } of bursts) {
    const ticks = typeof opts.ticks === "number" ? opts.ticks : DEFAULT_TICKS;
    longest = Math.max(longest, delay + (ticks / WATCHDOG_ASSUMED_FPS) * 1000);
    if (delay > 0) {
      landed.push(
        new Promise((resolve) => {
          setTimeout(() => {
            try { resolve(c(opts)); } catch { resolve(undefined); }
          }, delay);
        }),
      );
    } else {
      try { landed.push(Promise.resolve(c(opts))); } catch { /* ignore */ }
    }
  }

  const generation = ++celebrationGeneration;
  void Promise.all(landed)
    .catch(() => undefined)
    .then(() => {
      // A later celebration may have started while this one was in the air;
      // clearing then would wipe ITS confetti instead of ours.
      if (generation === celebrationGeneration) resetCelebration();
    });

  // Belt and braces, for the case where the loop stalls and those promises
  // never settle at all — deliberately generous, so it can only ever fire
  // after the animation should long since have ended.
  if (watchdog) clearTimeout(watchdog);
  watchdog = setTimeout(resetCelebration, longest + WATCHDOG_BUFFER_MS);
}

/** Warm the module so the first celebration is not delayed by the import. */
export function preloadCelebration(): void {
  void getInstance();
}
