/**
 * Make Athar behave like an app rather than a web page.
 *
 * Keep touch interactions focused on the app while preserving pinch-to-zoom
 * for users who need browser magnification.
 *
 * Scoped to touch devices. On a desktop browser athark.org is still a website,
 * and taking away text selection or ctrl+scroll zoom there would be hostile —
 * so the CSS half of this lives behind `@media (pointer: coarse)`.
 *
 * `touch-action: manipulation` removes the double-tap zoom delay while still
 * allowing pinch magnification. The Mushaf handles its own font-scale pinch.
 */

let installed = false;

export function installAppShellBehaviour(): () => void {
  if (installed || typeof window === "undefined") return () => {};
  installed = true;

  const isTouch =
    typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  if (!isTouch) {
    installed = false;
    return () => {};
  }

  const cleanups: Array<() => void> = [];

  // 1. Double-tap to zoom. `touch-action: manipulation` covers most engines,
  //    but older iOS still zooms, so swallow the second tap directly.
  //
  //    NEVER over a control. Calling preventDefault() on `touchend` also
  //    cancels the synthetic click that follows it, so this was eating every
  //    second tap inside 300ms anywhere in the app — counting a dhikr quickly
  //    registered roughly half the taps. Zoom only needs suppressing over
  //    content; buttons carry `touch-action: manipulation` and never zoom.
  const INTERACTIVE = "button, a, input, textarea, select, label, [role='button'], [role='tab'], [role='slider'], [contenteditable]";
  let lastTouchEnd = 0;
  const onTouchEnd = (e: TouchEvent) => {
    const now = Date.now();
    const onControl = (e.target as Element | null)?.closest?.(INTERACTIVE);
    if (!onControl && now - lastTouchEnd <= 300 && e.cancelable) e.preventDefault();
    lastTouchEnd = now;
  };
  document.addEventListener("touchend", onTouchEnd, { passive: false });
  cleanups.push(() => document.removeEventListener("touchend", onTouchEnd));

  document.documentElement.classList.add("app-shell-touch");
  cleanups.push(() => document.documentElement.classList.remove("app-shell-touch"));

  return () => {
    for (const fn of cleanups) {
      try { fn(); } catch { /* ignore */ }
    }
    installed = false;
  };
}
