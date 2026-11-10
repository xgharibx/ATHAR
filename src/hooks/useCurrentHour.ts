import * as React from "react";

/** Keeps hour-based UI current at the next local-hour boundary and on resume. */
export function useCurrentHour(): number {
  const [hour, setHour] = React.useState(() => new Date().getHours());

  React.useEffect(() => {
    let timeoutId: number | null = null;

    const refresh = () => setHour(new Date().getHours());
    const scheduleNextHour = () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);

      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);
      const delay = Math.max(1, nextHour.getTime() - now.getTime());

      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        refresh();
        scheduleNextHour();
      }, delay);
    };
    const refreshAndReschedule = () => {
      refresh();
      scheduleNextHour();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshAndReschedule();
    };

    refreshAndReschedule();
    window.addEventListener("focus", refreshAndReschedule);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      window.removeEventListener("focus", refreshAndReschedule);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return hour;
}
