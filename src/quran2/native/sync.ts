/**
 * «القرآن الكريم» on phones: keeps the "حفظك اليوم" widget and the daily
 * memorisation reminder in step with the memorisation, from app start, so
 * they are right even on days the section is not opened.
 */
import { Capacitor } from "@capacitor/core";
import { useQ2Store } from "../store";
import { buildHifzWidgetPayload, sessionPagesOn, syncHifzWidget } from "./widget";
import { nextFireIsToday, syncHifzReminder } from "./reminder";

let started = false;

/** The widget and the reminder from the current state; `ask` asks for notification permission. */
export function syncQuran2Native(ask = false): Promise<boolean> {
  const s = useQ2Store.getState();
  const now = Date.now();
  const payload = buildHifzWidgetPayload({ hifz: s.hifz, prefs: s.prefs, learnedLog: s.learnedLog, now });
  void syncHifzWidget(payload);
  const { enabled, time } = s.prefs.hifzReminder;
  // The reminder says how many pages wait in the session of the day it rings.
  const due = sessionPagesOn(payload, now, nextFireIsToday(time, now) ? 0 : 1);
  return syncHifzReminder({ enabled, time, due, ask });
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
  const onVisible = () => document.visibilityState === "visible" && soon();
  document.addEventListener("visibilitychange", onVisible);
  soon();
  return () => {
    started = false;
    clearTimeout(timer);
    unsubscribe();
    document.removeEventListener("visibilitychange", onVisible);
  };
}
