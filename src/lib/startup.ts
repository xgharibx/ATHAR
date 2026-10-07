const STARTUP_READY_EVENT = "athar-startup-ready";

/** Subscribe once, or run immediately when the initial route is already ready. */
export function afterStartupReady(callback: () => void): () => void {
  if (!isStartupPending()) {
    callback();
    return () => undefined;
  }
  document.addEventListener(STARTUP_READY_EVENT, callback, { once: true });
  return () => document.removeEventListener(STARTUP_READY_EVENT, callback);
}

/** True only while the initial branded launch surface still covers the app. */
export function isStartupPending(): boolean {
  const loader = document.getElementById("app-loader");
  return Boolean(loader && loader.getAttribute("data-hidden") !== "true" && loader.style.display !== "none");
}

/** Reveal the app only after a usable route or recovery screen has committed. */
export function markStartupReady(): void {
  const loader = document.getElementById("app-loader");
  if (!loader || loader.getAttribute("data-hidden") === "true") return;
  loader.setAttribute("data-hidden", "true");
  loader.style.display = "none";
  document.dispatchEvent(new Event(STARTUP_READY_EVENT));
}
