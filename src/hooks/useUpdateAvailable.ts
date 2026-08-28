/**
 * Is the app the user is holding older than the one that has been released?
 *
 * People stay on an old build for days without knowing a new one exists, and
 * then hit bugs that were fixed a week ago. There is no public API that answers
 * "what version is live on Google Play", so this compares the version baked
 * into this bundle against `version.json`, which the site emits at build time
 * from package.json. The web deploy and the store release go out together, so
 * an older APK fetching that file learns it is behind.
 *
 * Deliberately quiet: it checks once on mount and at most hourly after that,
 * never blocks anything, and stays silent on any failure. An update prompt that
 * appears because a request timed out is worse than no prompt at all.
 */
import React from "react";

import { publicDataUrl } from "@/data/publicAssetUrl";

declare const __APP_VERSION__: string;

/** Where the released build is published, per platform. */
export const STORE_URL = {
  android: "https://play.google.com/store/apps/details?id=com.athar.adhkar&hl=ar",
  web: "https://www.athark.org",
} as const;

const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const DISMISS_KEY = "noor_update_dismissed_v1";

/** `1.2.53` → [1, 2, 53]; anything unparseable sorts lowest. */
function parseVersion(v: string): number[] {
  return String(v ?? "")
    .split(".")
    .map((p) => Number.parseInt(p, 10))
    .map((n) => (Number.isFinite(n) ? n : 0));
}

/** True when `latest` is strictly newer than `current`. */
export function isNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

export function currentAppVersion(): string {
  try {
    return typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

type UpdateState = { available: boolean; latest: string | null };

export function useUpdateAvailable(): UpdateState & { dismiss: () => void } {
  const [state, setState] = React.useState<UpdateState>({ available: false, latest: null });
  const [dismissed, setDismissed] = React.useState<string | null>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY);
    } catch {
      return null;
    }
  });

  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const check = async () => {
      try {
        // Cache-busted: the whole point is to notice a change, and a cached
        // copy of this file is a copy of the answer we already had.
        const res = await fetch(`${publicDataUrl("version.json")}?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json: unknown = await res.json();
        const latest =
          json && typeof json === "object" && typeof (json as { version?: unknown }).version === "string"
            ? (json as { version: string }).version
            : null;
        if (cancelled || !latest) return;
        setState({ available: isNewer(latest, currentAppVersion()), latest });
      } catch {
        /* offline, blocked, or a bad deploy — say nothing */
      }
    };

    void check();
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    timer = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      if (timer) clearInterval(timer);
    };
  }, []);

  const dismiss = React.useCallback(() => {
    if (!state.latest) return;
    try {
      localStorage.setItem(DISMISS_KEY, state.latest);
    } catch {
      /* private mode — the dismissal lasts the session */
    }
    setDismissed(state.latest);
  }, [state.latest]);

  // A dismissal applies to the version it was made about; the next release asks
  // again rather than being silenced forever by one tap.
  const available = state.available && state.latest !== null && dismissed !== state.latest;

  return { available, latest: state.latest, dismiss };
}
