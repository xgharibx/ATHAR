import * as React from "react";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function useTodayKey() {
  const [todayKey, setTodayKey] = React.useState(() => todayISO());

  React.useEffect(() => {
    const refresh = () => setTodayKey(todayISO());
    let intervalId: number | null = null;

    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = Math.max(1000, nextMidnight.getTime() - now.getTime());

    const timeoutId = window.setTimeout(() => {
      refresh();
      intervalId = window.setInterval(refresh, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onFocus = () => refresh();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return todayKey;
}
