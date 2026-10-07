/** Intent-based preloading uses the same module cache as React.lazy.
 * Only the chosen destination is warmed; no network data or private state. */
const warmed = new Set<string>();
export function preloadAppRoute(href: string): void {
  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) return;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const path = base && url.pathname.startsWith(`${base}/`) ? url.pathname.slice(base.length) : url.pathname;
  if (warmed.has(path)) return;
  let load: Promise<unknown> | undefined;
  if (path === "/") load = import("@/pages/Home");
  else if (path.startsWith("/c/")) load = import("@/pages/Category");
  else if (path === "/quran") load = import("@/pages/Quran");
  else if (path === "/companion") load = import("@/pages/Companion");
  else if (path === "/settings") load = import("@/pages/Settings");
  else if (path === "/leaderboard") load = import("@/pages/Leaderboard");
  else if (path === "/library") load = import("@/pages/Library");
  else if (path === "/ijaz") load = import("@/ijaz/pages/IjazHome");
  if (load) {
    warmed.add(path);
    void load.catch(() => { warmed.delete(path); });
  }
}
