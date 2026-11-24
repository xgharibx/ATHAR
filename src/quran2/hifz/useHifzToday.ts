import * as React from "react";
import { useQ2Store } from "../store";
import { dayKey } from "../hooks";
import { buildPlan, newPagesToday } from "./plan";

/** Today's memorisation plan, from the store. */
export function useHifzToday() {
  const hifz = useQ2Store((s) => s.hifz);
  const prefs = useQ2Store((s) => s.prefs);
  const learnedLog = useQ2Store((s) => s.learnedLog);
  // The plan is for "now"; it is taken again when the app comes back to the screen.
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const refresh = () => document.visibilityState === "visible" && setNow(Date.now());
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);
  return React.useMemo(() => {
    const today = dayKey(new Date(now));
    const yesterday = dayKey(new Date(now - 86_400_000));
    const learnedToday = learnedLog[today] ?? [];
    const newCount = newPagesToday(prefs.newPerDay, learnedToday.length, (learnedLog[yesterday] ?? []).length > 0);
    const plan = buildPlan({ hifz, now, newCount, direction: prefs.direction, nearCount: prefs.nearCount, learnedToday });
    return { plan, learnedToday, memorised: Object.keys(hifz).length, now };
  }, [hifz, prefs.newPerDay, prefs.direction, prefs.nearCount, learnedLog, now]);
}
