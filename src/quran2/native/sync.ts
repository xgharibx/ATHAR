/**
 * «القرآن الكريم» on phones: keeps the "حفظك اليوم" widget and the daily
 * memorisation reminder in step with the memorisation, from app start, so
 * they are right even on days the section is not opened.
 */
import { Capacitor } from "@capacitor/core";
import { useQ2Store } from "../store";
import { buildHifzWidgetPayload, sessionPagesOn, syncHifzWidget } from "./widget";
import { nextFireIsToday, syncHifzReminder } from "./reminder";
import { useNoorStore } from "@/store/noorStore";
import { hadithDueOn, localDayKey } from "@/lib/reviewToday";

let started = false;

/** The widget and the reminder from the current state; `ask` asks for notification permission. */
export function syncQuran2Native(ask = false): Promise<boolean> {
  const s = useQ2Store.getState();
  const now = Date.now();
  const payload = buildHifzWidgetPayload({ hifz: s.hifz, prefs: s.prefs, learnedLog: s.learnedLog, now });
  // The hadith cards' due days, so the widget counts them with the pages (at most 500).
  const hadithDues = Object.values(useNoorStore.getState().hadithMemoCards).map((c) => c.due).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().slice(0, 500);
  void syncHifzWidget({ ...payload, hadithDues });
  const { enabled, time } = s.prefs.hifzReminder;
  // The reminder says how many pages wait in the session of the day it rings.
  const today = nextFireIsToday(time, now);
  const due = sessionPagesOn(payload, now, today ? 0 : 1);
  // And the hadith cards due that day: one review habit, one reminder.
  const hadithDue = hadithDueOn(useNoorStore.getState().hadithMemoCards, localDayKey(today ? now : now + 86_400_000));
  return syncHifzReminder({ enabled, time, due, hadithDue, ask });
}

/** Start once, from the app shell. No-op on the web. */
export function startQuran2Native(): () => void {
  if (!Capacitor.isNativePlatform() || started) return () => {};
  started = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const soon = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void syncQuran2Native(), 1500);
  };
  const unsubscribe = useQ2Store.subscribe((state, previous) => {
    if (state.hifz !== previous.hifz || state.prefs !== previous.prefs || state.learnedLog !== previous.learnedLog) soon();
  });
  const unsubscribeCards = useNoorStore.subscribe((state, previous) => {
    if (state.hadithMemoCards !== previous.hadithMemoCards) soon();
  });
  const onVisible = () => document.visibilityState === "visible" && soon();
  document.addEventListener("visibilitychange", onVisible);
  soon();
  return () => {
    started = false;
    clearTimeout(timer);
    unsubscribe();
    unsubscribeCards();
    document.removeEventListener("visibilitychange", onVisible);
  };
}
