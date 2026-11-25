/**
 * «القرآن ٢» — noticing what you read, for the khatma and the reading log.
 *
 * An ayah counts as read when it has been on screen, the app in front, for
 * about the time it takes to read it (0.3 s a word, between 1.5 and 15 s), so
 * scrolling past does not count. An ayah the reciter recited while you
 * listened counts too, when the next one begins.
 */
import * as React from "react";
import { dayKey } from "../hooks";
import { useQ2Store } from "../store";

const TICK = 1000;

export function needMs(words: number): number {
  return Math.min(15_000, Math.max(1500, words * 300));
}

export function useReadingTracker(options: {
  container: React.RefObject<HTMLElement | null>;
  /** Mushaf index (0–6235) of the surah's first ayah. */
  base: number | null;
  /** Words in each ayah of the surah. */
  words: number[];
  /** The ayah the reciter is on, while playing. */
  listening: number | null;
}) {
  const { container, base, words, listening } = options;
  const markRead = useQ2Store((s) => s.markRead);

  React.useEffect(() => {
    const root = container.current;
    if (!root || base == null || !words.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Set<number>();
    const dwell = new Map<number, number>();
    const counted = new Set<number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const a = Number((e.target as HTMLElement).dataset.ayah);
          if (!a) continue;
          // Most of the ayah, or most of the screen for an ayah taller than it.
          const seen = e.isIntersecting && (e.intersectionRatio >= 0.5 || e.intersectionRect.height >= window.innerHeight * 0.4);
          if (seen) visible.add(a);
          else visible.delete(a);
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    const observed = new WeakSet<Element>();
    const scan = () => {
      root.querySelectorAll<HTMLElement>("[data-ayah]").forEach((el) => {
        if (!observed.has(el)) {
          observed.add(el);
          io.observe(el);
        }
      });
    };
    scan();
    // The text is drawn again when the translation is switched on or off.
    const mo = new MutationObserver(scan);
    mo.observe(root, { childList: true, subtree: true });
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible" || !visible.size) return;
      const done: number[] = [];
      for (const a of visible) {
        if (counted.has(a)) continue;
        const t = (dwell.get(a) ?? 0) + TICK;
        dwell.set(a, t);
        if (t >= needMs(words[a - 1] ?? 1)) {
          counted.add(a);
          done.push(base + a - 1);
        }
      }
      if (done.length) markRead(done, dayKey());
    }, TICK);
    return () => {
      clearInterval(timer);
      io.disconnect();
      mo.disconnect();
    };
  }, [container, base, words, markRead]);

  // Listening: the ayah before the one now recited has been heard in full.
  const previous = React.useRef<number | null>(null);
  React.useEffect(() => {
    const before = previous.current;
    previous.current = listening;
    if (base == null || before == null || listening == null || listening !== before + 1) return;
    markRead([base + before - 1], dayKey());
  }, [listening, base, markRead]);
}
