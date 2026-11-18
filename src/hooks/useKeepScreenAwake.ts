import * as React from "react";
import { holdScreenAwake } from "@/lib/screenAwake";
import { useNoorStore } from "@/store/noorStore";

/** How long the screen stays on with nobody touching it, unless `idleMinutes` says otherwise. */
export const DEFAULT_AWAKE_IDLE_MINUTES = 10;

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

/**
 * Keep the screen on while `active`, if the person has not turned it off in
 * Settings. With `idleMinutes`, the phone may sleep again after that long
 * without a touch (a page left open on the table), and the next touch keeps
 * it on once more. `idleMinutes: null` holds it for as long as `active`,
 * for listening and recitation, where nobody touches the screen.
 */
export function useKeepScreenAwake(active: boolean, options: { idleMinutes?: number | null } = {}): void {
  const enabled = useNoorStore((s) => s.prefs.keepScreenAwake !== false);
  const idleMinutes = options.idleMinutes === undefined ? DEFAULT_AWAKE_IDLE_MINUTES : options.idleMinutes;

  React.useEffect(() => {
    if (!active || !enabled) return;
    let release: (() => void) | null = holdScreenAwake();
    if (idleMinutes === null || idleMinutes <= 0) {
      return () => release?.();
    }
    const idleMs = idleMinutes * 60_000;
    let timer = window.setTimeout(() => {
      release?.();
      release = null;
    }, idleMs);
    const onActivity = () => {
      window.clearTimeout(timer);
      release ??= holdScreenAwake();
      timer = window.setTimeout(() => {
        release?.();
        release = null;
      }, idleMs);
    };
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, onActivity, { passive: true });
    return () => {
      window.clearTimeout(timer);
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, onActivity);
      release?.();
    };
  }, [active, enabled, idleMinutes]);
}
