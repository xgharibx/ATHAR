/** Run a reminder reconciliation when the app returns to the foreground. */
export function listenForAppResume(onResume: () => void): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};

  let queued = false;
  const reconcileWhenVisible = () => {
    if (document.visibilityState === "hidden" || queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (document.visibilityState !== "hidden") onResume();
    });
  };

  const onVisibilityChange = () => {
    if (document.visibilityState !== "hidden") reconcileWhenVisible();
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("focus", reconcileWhenVisible);
  window.addEventListener("athar-app-resume", reconcileWhenVisible);
  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("focus", reconcileWhenVisible);
    window.removeEventListener("athar-app-resume", reconcileWhenVisible);
  };
}
