/**
 * «حديث اليوم»: one hadith a day, the same on the classic home, «أفق», the
 * hadith page, the widget and the Fajr reminder. It is a reviewed record
 * from the hadith encyclopedia (text, grade, attribution and explanation
 * together), picked from the date, so every screen agrees all day.
 */
import * as React from "react";
import { fetchDailyHadith, type SharhHadith } from "@/lib/hadithSharhAPI";
import { syncSunnahWidget } from "@/lib/widgetDataBridge";

export type DailyHadithState = { key: string; hadith: SharhHadith | null; done: boolean };

export function useDailyHadith(dateKey: string, options: { syncWidget?: boolean } = {}): DailyHadithState {
  const { syncWidget = false } = options;
  const [state, setState] = React.useState<DailyHadithState>({ key: "", hadith: null, done: false });
  React.useEffect(() => {
    let alive = true;
    fetchDailyHadith(dateKey)
      .then((h) => {
        if (!alive) return;
        setState({ key: dateKey, hadith: h, done: true });
        // The widget shows the same hadith, whichever design opened today.
        if (h && syncWidget) void syncSunnahWidget({ id: h.id, hadeeth: h.hadeeth, attribution: h.attribution, grade: h.grade });
      })
      .catch(() => alive && setState({ key: dateKey, hadith: null, done: true }));
    return () => {
      alive = false;
    };
  }, [dateKey, syncWidget]);
  return state.key === dateKey ? state : { key: dateKey, hadith: null, done: false };
}
