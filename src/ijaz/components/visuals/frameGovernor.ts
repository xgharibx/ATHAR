/**
 * One governor for the miracle illustrations' animation loops.
 *
 * They are canvas animations; drawn at a phone's full 3× pixel density, every
 * frame, even after you scroll past them, they made the miracle pages heavy
 * (as low as 10 fps on a mid-range phone). Through here they:
 *   - draw at no more than 1.5× density on phones (2× on larger screens):
 *     about a quarter of the pixels, and no visible difference at this size;
 *   - sleep while their stage is off screen or the app is in the background,
 *     looking again four times a second instead of drawing.
 */
let visibleStages = 0;
let anyStage = false;

/** Called by the stage around a visual when it enters or leaves the screen. */
export function setStageVisible(visible: boolean, registered = true): void {
  anyStage = anyStage || registered;
  visibleStages = Math.max(0, visibleStages + (visible ? 1 : -1));
}

function asleep(): boolean {
  if (typeof document !== 'undefined' && document.hidden) return true;
  return anyStage && visibleStages === 0;
}

/** The pixel density to draw at. */
export function visualDpr(): number {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const small = typeof window !== 'undefined' && window.innerWidth < 768;
  return Math.min(dpr, small ? 1.5 : 2);
}

type Handle = { raf?: number; timer?: number };
let seq = 0;
const live = new Map<number, Handle>();

/** requestAnimationFrame that sleeps while the visual cannot be seen. */
export function visualFrame(cb: FrameRequestCallback): number {
  const id = ++seq;
  const h: Handle = {};
  live.set(id, h);
  const run = () => {
    if (!live.has(id)) return;
    if (asleep()) {
      h.raf = undefined;
      h.timer = window.setTimeout(run, 250);
      return;
    }
    h.timer = undefined;
    h.raf = requestAnimationFrame((ts) => {
      live.delete(id);
      cb(ts);
    });
  };
  run();
  return id;
}

export function cancelVisualFrame(id: number | null | undefined): void {
  if (id == null) return;
  const h = live.get(id);
  if (!h) return;
  if (h.raf !== undefined) cancelAnimationFrame(h.raf);
  if (h.timer !== undefined) clearTimeout(h.timer);
  live.delete(id);
}

/** Particle counts for the big effects: half on a phone, where half is plenty at that size. */
export function particleCount(n: number): number {
  const small = typeof window !== 'undefined' && window.innerWidth < 768;
  return small ? Math.max(30, Math.round(n * 0.5)) : n;
}
