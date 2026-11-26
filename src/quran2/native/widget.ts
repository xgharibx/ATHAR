/**
 * «القرآن الكريم» — what the home-screen widget "حفظك اليوم" shows.
 *
 * The widget redraws on its own (at midnight and whenever the app asks), long
 * after the app last ran, so it is given the far-review dates themselves and
 * counts what is due on the day it draws, not a number frozen at sync time.
 */
import { Capacitor } from "@capacitor/core";
import type { Q2HifzPage, Q2Prefs } from "../store";
import { buildPlan, FAR_PER_DAY, newPagesToday } from "../hifz/plan";

export const HIFZ_WIDGET_KEY = "noor_widget_q2_hifz_v1";

export type HifzWidgetPayload = {
  /** Pages memorised. */
  memorised: number;
  /** Day (YYYY-MM-DD) the counts below were made for. */
  day: string;
  /** New pages still to learn that day, and on a later day. */
  newToday: number;
  newLater: number;
  /** Latest pages still to revise that day, and on a later day. */
  near: number;
  nearLater: number;
  /** When each older page is due (ms), for the widget to count on its own day. */
  dues: number[];
  updatedAt: string;
};

function dayKey(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function buildHifzWidgetPayload(options: {
  hifz: Record<number, Q2HifzPage>;
  prefs: Pick<Q2Prefs, "newPerDay" | "direction" | "nearCount">;
  learnedLog: Record<string, number[]>;
  now: number;
}): HifzWidgetPayload {
  const { hifz, prefs, learnedLog, now } = options;
  const today = dayKey(now);
  const yesterday = dayKey(now - 86_400_000);
  const learnedToday = learnedLog[today] ?? [];
  const newToday = newPagesToday(prefs.newPerDay, learnedToday.length, (learnedLog[yesterday] ?? []).length > 0);
  // Far-review candidates are every page but the latest ones (revised daily).
  const plan = buildPlan({ hifz, now, newCount: newToday, direction: prefs.direction, nearCount: prefs.nearCount, learnedToday });
  const latest = Object.keys(hifz)
    .map(Number)
    .filter((p) => !learnedToday.includes(p))
    .sort((a, b) => hifz[b]!.learnedAt - hifz[a]!.learnedAt)
    .slice(0, prefs.nearCount);
  // A page revised today is not asked again today, whatever its next date.
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  const tomorrow = new Date(now).setHours(24, 0, 0, 0);
  const revisedToday = (last: number) => last >= startOfToday;
  const dues = Object.entries(hifz)
    .filter(([p]) => !latest.includes(Number(p)) && !learnedToday.includes(Number(p)))
    .map(([, card]) => (revisedToday(card.last) ? Math.max(card.due, tomorrow) : card.due))
    .sort((a, b) => a - b);
  return {
    memorised: Object.keys(hifz).length,
    day: today,
    newToday: plan.newPages.length,
    newLater: prefs.newPerDay >= 1 ? Math.floor(prefs.newPerDay) : 1,
    near: plan.near.length,
    nearLater: Math.min(prefs.nearCount, Object.keys(hifz).length),
    dues,
    updatedAt: new Date(now).toISOString(),
  };
}

/**
 * Pages in the session of a day: today (0) or tomorrow (1), from a payload.
 * The same count the widgets make: far review is capped as in the session.
 */
export function sessionPagesOn(payload: HifzWidgetPayload, now: number, day: 0 | 1): number {
  if (payload.memorised === 0 && payload.newToday === 0 && day === 0) return 0;
  const end = new Date(now);
  end.setDate(end.getDate() + day);
  end.setHours(23, 59, 59, 999);
  const far = Math.min(FAR_PER_DAY, payload.dues.filter((d) => d <= end.getTime()).length);
  return day === 0 ? payload.newToday + payload.near + far : payload.newLater + payload.nearLater + far;
}

let lastWritten = "";

/** Write the payload where the widgets read it and ask them to redraw. Phones only. */
export async function syncHifzWidget(payload: HifzWidgetPayload): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  // Only the counts matter to the widget; the time stamp alone is no reason to redraw.
  const value = JSON.stringify(payload);
  const signature = JSON.stringify({ ...payload, updatedAt: "" });
  if (signature === lastWritten) return;
  lastWritten = signature;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key: HIFZ_WIDGET_KEY, value });
    const { refreshHomeWidgets } = await import("@/lib/widgetRefresh");
    await refreshHomeWidgets();
  } catch {
    lastWritten = "";
  }
}
