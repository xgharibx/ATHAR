import * as React from "react";
import { getNextHomePrayerRefreshAt, type HomePrayerTimings } from "@/lib/homePrayerContext";

/** Refreshes prayer-driven Home advice at meaningful thresholds and on resume. */
export function useHomePrayerClock(
  todayTimings: HomePrayerTimings | undefined,
  tomorrowTimings: HomePrayerTimings | undefined,
  dayKey: string,
): number {
  const [revision, setRevision] = React.useState(0);

  React.useEffect(() => {
    let timeoutId: number | null = null;

    const schedule = () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      const now = new Date();
      const nextRefreshAt = getNextHomePrayerRefreshAt(todayTimings, tomorrowTimings, now);
      if (!nextRefreshAt) return;

      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        setRevision((current) => current + 1);
        schedule();
      }, Math.max(1, nextRefreshAt.getTime() - Date.now()));
    };
    const refreshAndReschedule = () => {
      setRevision((current) => current + 1);
      schedule();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshAndReschedule();
    };

    schedule();
    window.addEventListener("focus", refreshAndReschedule);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      window.removeEventListener("focus", refreshAndReschedule);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [dayKey, todayTimings, tomorrowTimings]);

  return revision;
}
