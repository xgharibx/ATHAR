/**
 * Copying that works the same on a phone as on a desktop.
 *
 * The async Clipboard API is picky inside a phone's WebView: it can reject when
 * the page does not hold focus (a sheet just closed, a native share returned) or
 * be missing altogether on an older WebView. About sixty places call
 * navigator.clipboard.writeText directly, so rather than touch each one this
 * wraps it once: the normal call is tried first, and only if it fails does the
 * old selection-and-copy route run, which the WebView always allows from a tap.
 */

export function copyViaSelection(text: string): boolean {
  if (typeof document === "undefined" || !document.body) return false;
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  // Off-screen and non-zooming: iOS zooms the page for inputs under 16px.
  ta.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0;font-size:16px;user-select:text;-webkit-user-select:text;";
  const active = document.activeElement as HTMLElement | null;
  document.body.appendChild(ta);
  try {
    ta.focus({ preventScroll: true });
    ta.select();
    ta.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    ta.remove();
    active?.focus?.({ preventScroll: true });
  }
}

export function installClipboardFallback(): void {
  if (typeof navigator === "undefined") return;
  const existing = navigator.clipboard as Clipboard | undefined;
  if ((existing?.writeText as { __athar?: boolean } | undefined)?.__athar) return; // already installed
  // Keep the browser's own function: `existing.writeText` is replaced below, and
  // calling it from inside the replacement would recurse forever.
  const original = existing && typeof existing.writeText === "function" ? existing.writeText.bind(existing) : null;
  const wrapped = async (text: string) => {
    if (original) {
      try {
        await original(text);
        return;
      } catch (err) {
        if (copyViaSelection(text)) return;
        throw err;
      }
    }
    if (!copyViaSelection(text)) throw new Error("copy failed");
  };
  (wrapped as { __athar?: boolean }).__athar = true;
  try {
    if (existing) {
      Object.defineProperty(existing, "writeText", { value: wrapped, configurable: true, writable: true });
    } else {
      Object.defineProperty(navigator, "clipboard", { value: { writeText: wrapped }, configurable: true });
    }
  } catch {
    /* A browser that locks the property down keeps its own behaviour. */
  }
}
