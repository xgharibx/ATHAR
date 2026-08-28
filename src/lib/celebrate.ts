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
 *   - and nothing else: no timer may cut a burst short before it lands.
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
/**
 * There is deliberately no timer that clears the canvas.
 *
 * Any duration computed from `ticks` is a guess at a frame rate, and every
 * guess that came in under the real one wiped confetti out of the air. The
 * burst is meant to fall until the last particle lands, so the only thing that
 * ends it is the animation reporting that it has — canvas-confetti resolves
 * its promise when that genuinely happens.
 *
 * The one exception stays in `bindLifecycle`: backgrounding the app freezes
 * requestAnimationFrame, so a burst caught mid-flight can never land by itself
 * and would still be sitting there on return.
 */

let instance: ConfettiInstance | null = null;
let canvas: HTMLCanvasElement | null = null;
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

  // Each burst resolves when ITS OWN animation has actually finished, which is
  // the only honest signal that the confetti has landed. Waiting on these
  // rather than on a computed duration is what lets a burst finish falling on
  // a slow device instead of being wiped out of the air.
  const landed: Array<Promise<unknown>> = [];

  for (const { delay = 0, ...opts } of bursts) {
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
}

/** Warm the module so the first celebration is not delayed by the import. */
export function preloadCelebration(): void {
  void getInstance();
}
