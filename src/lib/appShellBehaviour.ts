/**
 * Make Athar behave like an app rather than a web page.
 *
 * Everything here suppresses a *browser* affordance that has no place in an
 * installed app: the page zooming under your fingers, a long-press offering to
 * "Look Up" an ayah, the rubber-band overscroll at the end of a list.
 *
 * Scoped to touch devices. On a desktop browser athark.org is still a website,
 * and taking away text selection or ctrl+scroll zoom there would be hostile —
 * so the CSS half of this lives behind `@media (pointer: coarse)`.
 *
 * The viewport meta in index.html already carries `user-scalable=no`, which is
 * enough for Chrome and the Android WebView. **iOS Safari has ignored it since
 * iOS 10**, so pinch-zoom there has to be refused explicitly through Safari's
 * own non-standard `gesture*` events — which is why the Quran page zoomed twice
 * on iPhone: our font-scale pinch handler ran, and Safari zoomed the page too.
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

  // 1. iOS Safari pinch-zoom. Non-standard events, hence the cast.
  const refuse = (e: Event) => e.preventDefault();
  for (const name of ["gesturestart", "gesturechange", "gestureend"]) {
    document.addEventListener(name, refuse, { passive: false });
    cleanups.push(() => document.removeEventListener(name, refuse));
  }

  // 2. Double-tap to zoom. `touch-action: manipulation` covers most engines,
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

  // 3. Multi-touch anywhere outside an element that opted into handling it
  //    (the Mushaf's font pinch marks itself with data-pinch-zoom).
  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length < 2 || !e.cancelable) return;
    const target = e.target as Element | null;
    if (target?.closest?.("[data-pinch-zoom]")) return; // owner handles it
    e.preventDefault();
  };
  document.addEventListener("touchmove", onTouchMove, { passive: false });
  cleanups.push(() => document.removeEventListener("touchmove", onTouchMove));

  document.documentElement.classList.add("app-shell-touch");
  cleanups.push(() => document.documentElement.classList.remove("app-shell-touch"));

  return () => {
    for (const fn of cleanups) {
      try { fn(); } catch { /* ignore */ }
    }
    installed = false;
  };
}
