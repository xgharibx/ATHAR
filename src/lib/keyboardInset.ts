/**
 * How much of the screen the on-screen keyboard covers, as the CSS variable
 * `--kb` on <html>.
 *
 * On iPhone the keyboard slides over the page instead of shrinking it, so a
 * bar pinned to the bottom (the companion's message box, a bottom sheet with a
 * field) ends up behind it. Elements that use `var(--kb)` lift by exactly the
 * covered height. On Android the app already shrinks the page above the
 * keyboard, so the value stays 0 there and nothing moves twice.
 */
export function startKeyboardInset(): () => void {
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  if (!vv) return () => {};
  const root = document.documentElement;
  let last = -1;
  const update = () => {
    const covered = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    // Ignore tiny differences (toolbars settling); a keyboard is far taller.
    const value = covered > 80 ? covered : 0;
    if (value === last) return;
    last = value;
    root.style.setProperty("--kb", `${value}px`);
    root.toggleAttribute("data-keyboard", value > 0);
  };
  update();
  vv.addEventListener("resize", update);
  vv.addEventListener("scroll", update);
  return () => {
    vv.removeEventListener("resize", update);
    vv.removeEventListener("scroll", update);
  };
}
