import * as React from "react";
import {
  type DayKeyMode,
  getIbadahDateKey,
  getLocalDateKey,
  getNextIbadahBoundary,
  getNextLocalMidnight,
} from "@/lib/dayBoundaries";

type UseTodayKeyOptions = {
  mode?: DayKeyMode;
  fajrTime?: string | null;
};

function resolveDateKey(mode: DayKeyMode, fajrTime?: string | null) {
  return mode === "ibadah"
    ? getIbadahDateKey(new Date(), fajrTime)
    : getLocalDateKey(new Date());
}

function resolveNextBoundary(mode: DayKeyMode, fajrTime?: string | null) {
  return mode === "ibadah"
    ? getNextIbadahBoundary(new Date(), fajrTime) ?? getNextLocalMidnight(new Date())
    : getNextLocalMidnight(new Date());
}

export function useTodayKey(options: UseTodayKeyOptions = {}) {
  const { mode = "civil", fajrTime } = options;
  const [todayKey, setTodayKey] = React.useState(() => resolveDateKey(mode, fajrTime));

  React.useEffect(() => {
    const refresh = () => setTodayKey(resolveDateKey(mode, fajrTime));
    let timeoutId: number | null = null;

    const schedule = () => {
      const nextBoundary = resolveNextBoundary(mode, fajrTime);
      const msUntilBoundary = Math.max(1000, nextBoundary.getTime() - Date.now());
      timeoutId = window.setTimeout(() => {
        refresh();
        schedule();
      }, msUntilBoundary);
    };

    refresh();
    schedule();

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onFocus = () => refresh();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [fajrTime, mode]);

  return todayKey;
}
