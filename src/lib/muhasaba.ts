/**
 * Muhasaba — the arithmetic of a daily self-accounting table.
 *
 * The log maps "YYYY-MM-DD|deedId" to the rung reached: 0 means "recorded as
 * missed", 1..N means that rung of the deed's ladder. A key that is absent means
 * "not recorded", which is NOT a miss: averages are taken over recorded days and
 * coverage is reported on its own, so forgetting to open the app never lowers a
 * score.
 *
 * Pure: log in, numbers out. The page only renders them.
 */
import { addDays, daysBetween, parseISO } from "@/lib/qadaa";
import type { Deed } from "@/data/muhasabaCatalog";

export type MuhasabaLog = Record<string, number>;

export const logKey = (day: string, deedId: string) => `${day}|${deedId}`;

/** The rung recorded for a deed on a day: null = not recorded, 0 = missed. */
export function levelOf(log: MuhasabaLog, day: string, deedId: string): number | null {
  const v = log[logKey(day, deedId)];
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null;
}

/** Whether a deed is asked on a day (e.g. Monday/Thursday fasts, Friday's Kahf). */
export function appliesOn(deed: Deed, day: string): boolean {
  if (!deed.weekdays) return true;
  const ms = parseISO(day);
  if (ms === null) return false;
  return deed.weekdays.includes(new Date(ms).getUTCDay());
}

/** 0..1: how far up its ladder a recorded rung is. */
export const fraction = (deed: Deed, level: number): number =>
  deed.levels.length === 0 ? 0 : Math.min(1, Math.max(0, level / deed.levels.length));

/** The day's mean over the deeds that were asked AND recorded; null when nothing was recorded. */
export function dayScore(log: MuhasabaLog, deeds: Deed[], day: string): { score: number | null; recorded: number; asked: number } {
  let sum = 0;
  let recorded = 0;
  let asked = 0;
  for (const d of deeds) {
    if (!appliesOn(d, day)) continue;
    asked += 1;
    const lv = levelOf(log, day, d.id);
    if (lv === null) continue;
    recorded += 1;
    sum += fraction(d, lv);
  }
  return { score: recorded ? sum / recorded : null, recorded, asked };
}

/** Recorded values for a deed over the `n` days ending at `end` (inclusive), oldest first. */
export function history(log: MuhasabaLog, deed: Deed, end: string, n: number): Array<{ day: string; level: number | null }> {
  const out: Array<{ day: string; level: number | null }> = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const day = addDays(end, -i);
    out.push({ day, level: appliesOn(deed, day) ? levelOf(log, day, deed.id) : null });
  }
  return out;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export type DeedTrend = {
  deedId: string;
  /** Mean fraction over the last 7 days, over recorded days only. */
  recent: number | null;
  /** Mean fraction over the 21 days before that. */
  baseline: number | null;
  recordedRecent: number;
  /** recent - baseline, when both are trustworthy; negative = slipping. */
  delta: number | null;
  status: "rising" | "steady" | "slipping" | "unknown";
  /** Consecutive recorded misses ending at `end`. */
  missRun: number;
  /** The rung most often reached lately (median of the last 14 recorded), 0 if none. */
  usual: number;
};

/** Enough data to judge: 3 recorded days lately, 7 in the baseline. Below that, say "unknown". */
export const MIN_RECENT = 3;
export const MIN_BASELINE = 7;
export const SLIP_THRESHOLD = 0.15;

export function trendOf(log: MuhasabaLog, deed: Deed, end: string): DeedTrend {
  const last28 = history(log, deed, end, 28);
  const recentVals = last28.slice(21).flatMap((h) => (h.level === null ? [] : [fraction(deed, h.level)]));
  const baseVals = last28.slice(0, 21).flatMap((h) => (h.level === null ? [] : [fraction(deed, h.level)]));
  const recent = mean(recentVals);
  const baseline = mean(baseVals);
  const trustworthy = recentVals.length >= MIN_RECENT && baseVals.length >= MIN_BASELINE;
  const delta = trustworthy && recent !== null && baseline !== null ? recent - baseline : null;

  let missRun = 0;
  for (let i = last28.length - 1; i >= 0; i -= 1) {
    const lv = last28[i].level;
    if (lv === null) {
      if (!appliesOn(deed, last28[i].day)) continue; // a day it is not asked does not break the run
      break;
    }
    if (lv === 0) missRun += 1;
    else break;
  }

  const lately = last28.slice(14).flatMap((h) => (h.level === null ? [] : [h.level])).sort((a, b) => a - b);
  const usual = lately.length ? lately[Math.floor(lately.length / 2)] : 0;

  let status: DeedTrend["status"] = "unknown";
  if (delta !== null) status = delta <= -SLIP_THRESHOLD ? "slipping" : delta >= SLIP_THRESHOLD ? "rising" : "steady";
  return { deedId: deed.id, recent, baseline, recordedRecent: recentVals.length, delta, status, missRun, usual };
}

/** The next rung up from where someone usually is, or null at the top. */
export function nextRung(deed: Deed, usual: number): { index: number; label: string } | null {
  if (usual >= deed.levels.length) return null;
  return { index: usual + 1, label: deed.levels[usual] };
}

/** Consecutive days, ending at `end`, with every ASKED deed recorded at its first rung or higher. */
export function steadyDays(log: MuhasabaLog, deeds: Deed[], end: string, core: string[]): number {
  const coreDeeds = deeds.filter((d) => core.includes(d.id));
  if (!coreDeeds.length) return 0;
  let run = 0;
  for (let i = 0; i < 400; i += 1) {
    const day = addDays(end, -i);
    const asked = coreDeeds.filter((d) => appliesOn(d, day));
    if (!asked.length) continue;
    const ok = asked.every((d) => (levelOf(log, day, d.id) ?? 0) >= 1);
    if (!ok) {
      // Today may simply not be filled in yet; do not break the run for it.
      if (i === 0 && asked.every((d) => levelOf(log, day, d.id) === null)) continue;
      break;
    }
    run += 1;
  }
  return run;
}

export type Week = { days: string[]; score: number | null; recorded: number };

/** Mean day-score for each of the last `weeks` calendar-spans of 7 days ending at `end`, oldest first. */
export function weeklyScores(log: MuhasabaLog, deeds: Deed[], end: string, weeks: number): Week[] {
  const out: Week[] = [];
  for (let w = weeks - 1; w >= 0; w -= 1) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(end, -(w * 7 + 6 - i)));
    const scores = days.map((d) => dayScore(log, deeds, d));
    const rec = scores.filter((s) => s.score !== null) as Array<{ score: number; recorded: number; asked: number }>;
    out.push({ days, score: rec.length ? rec.reduce((a, b) => a + b.score, 0) / rec.length : null, recorded: rec.length });
  }
  return out;
}

/** Drop entries older than `keepDays` before `today`; ISO dates compare as strings. */
export function pruneLog(log: MuhasabaLog, today: string, keepDays = 500): MuhasabaLog {
  const cutoff = addDays(today, -keepDays);
  const out: MuhasabaLog = {};
  for (const [k, v] of Object.entries(log)) {
    const day = k.split("|")[0] ?? "";
    if (day >= cutoff) out[k] = v;
  }
  return out;
}

/** How many days a deed has been recorded in the last `n` days, for a coverage line. */
export function coverage(log: MuhasabaLog, deeds: Deed[], end: string, n: number): number {
  let asked = 0;
  let recorded = 0;
  for (let i = 0; i < n; i += 1) {
    const day = addDays(end, -i);
    for (const d of deeds) {
      if (!appliesOn(d, day)) continue;
      asked += 1;
      if (levelOf(log, day, d.id) !== null) recorded += 1;
    }
  }
  return asked ? recorded / asked : 0;
}

export { daysBetween };
