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
const ACTIVE_PATH_KEY = "scroll_active_path";

/** Save the outgoing route before App resets the shared window scroll offset. */
export function activateScrollRestorationPath(pathname: string, previousPathname?: string) {
  if (previousPathname && previousPathname !== pathname) {
    sessionStorage.setItem(
      STORAGE_PREFIX + previousPathname,
      String(Math.round(window.scrollY)),
    );
  }
  sessionStorage.setItem(ACTIVE_PATH_KEY, pathname);
}

/** Persist the outgoing page and reset the shared scroll position on navigation. */
export function resetScrollForRouteChange(pathname: string, previousPathname?: string) {
  activateScrollRestorationPath(pathname, previousPathname);
  window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
}

export function useScrollRestoration() {
  const { pathname } = useLocation();
  // Keep this component attached to the route it was mounted for while its
  // exit animation is visible and React Router exposes the next location.
  const mountedPathname = React.useRef(pathname).current;
  const key = STORAGE_PREFIX + mountedPathname;

  // On mount: restore saved position (after paint so layout is ready)
  React.useLayoutEffect(() => {
    const saved = sessionStorage.getItem(key);
    const validSaved = saved !== null && /^\d+$/.test(saved);
    const y = validSaved ? Number(saved) : 0;
    if (validSaved && Number.isFinite(y) && y > 0) {
      // rAF ensures the DOM has settled before restoring a saved position.
      requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior }));
    } else {
      if (saved !== null) sessionStorage.removeItem(key);
      // A route without a saved position must not inherit the previous page's
      // window offset. Reset before paint so first-time destinations open at
      // their heading instead of showing an arbitrary middle section.
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
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
      const activePathname = sessionStorage.getItem(ACTIVE_PATH_KEY);
      if (activePathname && activePathname !== mountedPathname) return;
      const y = Math.round(window.scrollY);
      timer = setTimeout(() => {
        const currentPathname = sessionStorage.getItem(ACTIVE_PATH_KEY);
        if (currentPathname && currentPathname !== mountedPathname) return;
        sessionStorage.setItem(key, String(y));
      }, 100);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [key, mountedPathname]);
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
