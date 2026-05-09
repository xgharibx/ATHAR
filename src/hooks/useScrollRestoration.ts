/**
 * useScrollRestoration — restores window vertical scroll position when returning
 * to a page via browser back/forward. Positions are keyed by the current
 * location pathname so every route has its own saved position.
 *
 * Usage (in page component):
 *   useScrollRestoration();
 *
 * useElementScrollRestoration — same but for a horizontally-scrollable element
 * (e.g. the adhkar category strip). Pass a stable key unique to that element.
 *
 * Usage:
 *   const stripRef = useElementScrollRestoration<HTMLDivElement>("home-strip");
 *   <div ref={stripRef} className="overflow-x-auto" />
 */

import * as React from "react";
import { useLocation } from "react-router-dom";

// ─── Window-level vertical scroll ────────────────────────────────────────────

const STORAGE_PREFIX = "scroll_y:";

export function useScrollRestoration() {
  const { pathname } = useLocation();
  const key = STORAGE_PREFIX + pathname;

  // On mount: restore saved position (after paint so layout is ready)
  React.useLayoutEffect(() => {
    const saved = sessionStorage.getItem(key);
    if (saved !== null) {
      const y = parseInt(saved, 10);
      if (y > 0) {
        // rAF ensures the DOM has settled before we scroll
        requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior }));
      }
    }
    // We intentionally do NOT clear the saved value here so it survives
    // multiple back navigations within the same session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);                // run once per mount

  // While on this route: save position continuously (debounced)
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        sessionStorage.setItem(key, String(Math.round(window.scrollY)));
      }, 100);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [key]);
}

// ─── Element-level horizontal scroll ─────────────────────────────────────────

const ELEM_PREFIX = "scroll_x:";

export function useElementScrollRestoration<T extends HTMLElement>(elementKey: string) {
  const ref = React.useRef<T | null>(null);
  const storageKey = ELEM_PREFIX + elementKey;

  // Restore on mount
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const saved = sessionStorage.getItem(storageKey);
    if (saved !== null) {
      const x = parseInt(saved, 10);
      if (x > 0) {
        requestAnimationFrame(() => { el.scrollLeft = x; });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save on scroll
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        sessionStorage.setItem(storageKey, String(Math.round(el.scrollLeft)));
      }, 100);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", onScroll);
    };
  }, [storageKey]);

  return ref;
}
