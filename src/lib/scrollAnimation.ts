/**
 * Animated scroll helpers.
 *
 * The browser-native `element.scrollTo({ top, behavior: "smooth" })` honors
 * the element's `scroll-behavior: smooth` declaration, but the actual sweep
 * duration is OS / browser defined and usually very fast (≈ 250-350ms). For
 * the dhikr / Sebha auto-advance transition we want a noticeably slower
 * glide (around 1100ms), so we drive `scrollTop` ourselves with a
 * cubic-bezier easing and `requestAnimationFrame`.
 *
 * Honors `prefers-reduced-motion: reduce` — falls back to the native
 * smooth scroll in that case so motion-sensitive users keep their
 * fast transition.
 */

const REDUCED_MOTION_MS = 220; // snappy fallback when the user prefers no motion

/**
 * Animate `el.scrollTop` from its current value to `target` over
 * `duration` ms, eased with a cubic ease-in-out.
 *
 * Cancels any prior animation in-flight on the same element so rapid
 * back-to-back calls don't fight each other.
 */
export function smoothScrollTo(
  el: HTMLElement,
  target: number,
  duration = 1100,
): () => void {
  if (!el) return () => {};
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) {
    el.scrollTo({ top: target, behavior: "smooth" });
    return () => {};
  }
  // Cancel any animation in-flight on this element
  const cancelExisting = (el as unknown as { __atharScrollRaf?: number }).__atharScrollRaf;
  if (typeof cancelExisting === "number") {
    cancelAnimationFrame(cancelExisting);
  }
  const startTop = el.scrollTop;
  const delta = target - startTop;
  if (Math.abs(delta) < 2) {
    el.scrollTop = target;
    return () => {};
  }
  const startTime =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const ease = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic
  const tick = (now: number) => {
    const elapsed = (now ?? startTime) - startTime;
    const t = Math.min(1, elapsed / Math.max(1, duration));
    el.scrollTop = startTop + delta * ease(t);
    if (t < 1) {
      (el as unknown as { __atharScrollRaf?: number }).__atharScrollRaf =
        requestAnimationFrame(tick);
    } else {
      (el as unknown as { __atharScrollRaf?: number }).__atharScrollRaf = undefined;
    }
  };
  (el as unknown as { __atharScrollRaf?: number }).__atharScrollRaf =
    requestAnimationFrame(tick);
  return () => {
    const raf = (el as unknown as { __atharScrollRaf?: number }).__atharScrollRaf;
    if (typeof raf === "number") {
      cancelAnimationFrame(raf);
      (el as unknown as { __atharScrollRaf?: number }).__atharScrollRaf = undefined;
    }
  };
}

/**
 * Find a Virtuoso scroll container inside the given root element. Walks up
 * looking for `data-viewport-type="auto"` plus the `.virtuoso-scroller`
 * marker Virtuoso renders. Returns null when not found so callers can
 * fall back to the native scrollToIndex behavior.
 */
export function findVirtuosoScroller(root: HTMLElement | null): HTMLElement | null {
  if (!root) return null;
  // Virtuoso injects `.virtuoso-scroller` on its main scroll container.
  const fromRef = (root.querySelector && root.querySelector(".virtuoso-scroller")) as HTMLElement | null;
  if (fromRef) return fromRef;
  const all = root.querySelectorAll('[data-virtuoso-scroller="true"], .virtuoso-scroller');
  return (all[0] as HTMLElement | undefined) ?? null;
}
