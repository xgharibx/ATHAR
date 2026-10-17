/**
 * قضاء الفوائت — the arithmetic and the rules, with no UI and no store.
 *
 * Everything the Qadaa page decides lives here so it can be tested on its own.
 * The rulings it encodes come from Dar al-Ifta al-Misriyyah and are written up,
 * with sources, in docs/QADAA_DESIGN.md.
 *
 * Two commitments shape the code:
 *
 *  - It CALCULATES, it does not RULE. Where scholars differ (witr, the fidya for
 *    delaying a fast) the madhhab is an input and the result says whose rule it
 *    is. Nothing here presents one view as the only one.
 *  - It leans towards MORE. The fatwa for an unknown count is to estimate by
 *    ghalabat al-zann and err towards the larger number, so the "safe" estimate
 *    is the default and a shortfall is never the app's doing.
 *
 * Dates are ISO `YYYY-MM-DD` strings throughout, compared as UTC midnights. A
 * Date object would drag the device's time zone into a count of days.
 */
import { gregorianToHijri } from "@/lib/hijri";

// ── Keys ────────────────────────────────────────────────────────────────

export const PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha", "witr"] as const;
export type PrayerKey = (typeof PRAYER_KEYS)[number];

/** The five obligatory prayers, in the order they are made up. */
export const FARD_KEYS: readonly PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export const PRAYER_LABELS: Record<PrayerKey, string> = {
  fajr: "الفجر",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
  witr: "الوتر",
};

export type Madhhab = "hanafi" | "maliki" | "shafii" | "hanbali";

export const MADHHAB_LABELS: Record<Madhhab, string> = {
  hanafi: "الحنفي",
  maliki: "المالكي",
  shafii: "الشافعي",
  hanbali: "الحنبلي",
};

/** Witr is wajib for the Hanafis and sunnah for the rest, so only they owe it. */
export function witrIsOwed(madhhab: Madhhab | null | undefined): boolean {
  return madhhab === "hanafi";
}

/** Keys in the synced maps. Prefixed so prayers and fasts can share one map. */
export const prayerKey = (k: PrayerKey) => `p:${k}`;
export const fastKey = (hijriYear: number) => `f:${hijriYear}`;

export function parsePrayerKey(key: string): PrayerKey | null {
  if (!key.startsWith("p:")) return null;
  const k = key.slice(2) as PrayerKey;
  return (PRAYER_KEYS as readonly string[]).includes(k) ? k : null;
}

export function parseFastKey(key: string): number | null {
  if (!key.startsWith("f:")) return null;
  const y = Number(key.slice(2));
  return Number.isInteger(y) && y > 0 ? y : null;
}

// ── Dates ───────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
/** Mean lengths — enough for counting years of missed prayers, not for a calendar. */
export const HIJRI_YEAR_DAYS = 354.367;
export const HIJRI_MONTH_DAYS = 29.530588;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** UTC-midnight milliseconds for an ISO date, or null when it is not a real date. */
export function parseISO(iso: string | null | undefined): number | null {
  const m = ISO_RE.exec(String(iso ?? ""));
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const back = new Date(ms);
  // Date.UTC rolls 2026-02-31 into March; a real date survives the round trip.
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return ms;
}

export function toISO(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

/** Whole days from `a` to `b` (negative if b is earlier). NaN-safe: 0 on bad input. */
export function daysBetween(a: string, b: string): number {
  const x = parseISO(a);
  const y = parseISO(b);
  if (x === null || y === null) return 0;
  return Math.round((y - x) / DAY_MS);
}

export function addDays(iso: string, n: number): string {
  const ms = parseISO(iso);
  return ms === null ? iso : toISO(ms + Math.round(n) * DAY_MS);
}

/** A local calendar date as ISO — what "today" means to the person holding the phone. */
export function localTodayISO(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

function localDateFromISO(iso: string): Date {
  const ms = parseISO(iso) ?? Date.now();
  const d = new Date(ms);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * The Gregorian date on which a Hijri month begins, by the same arithmetic
 * calendar the rest of the app uses.
 *
 * Found by search rather than by formula: estimate the date from the mean
 * lengths, then walk to the day gregorianToHijri calls day 1. That keeps this
 * consistent with every Hijri date the app already shows, instead of being a
 * second calendar that disagrees by a day.
 */
export function hijriMonthStartISO(year: number, month: number): string {
  const epoch = Date.UTC(622, 6, 19); // ≈ 1 Muharram 1 AH, proleptic Gregorian
  const guess = epoch + ((year - 1) * HIJRI_YEAR_DAYS + (month - 1) * HIJRI_MONTH_DAYS) * DAY_MS;
  for (let off = 0; off <= 45; off += 1) {
    for (const sign of off === 0 ? [1] : [1, -1]) {
      const iso = toISO(guess + sign * off * DAY_MS);
      const h = gregorianToHijri(localDateFromISO(iso));
      if (h.year === year && h.month === month && h.day === 1) return iso;
    }
  }
  return toISO(guess); // unreachable for sane input; a near answer beats a throw
}

export function hijriYearOf(iso: string): number {
  return gregorianToHijri(localDateFromISO(iso)).year;
}

// ── Estimating what is owed ─────────────────────────────────────────────

export type Gender = "male" | "female";
export type Certainty = "exact" | "approx" | "unsure";

/** How sure someone is of their own history, as slack in the inputs. */
export const CERTAINTY: Record<Certainty, { uncertaintyMonths: number; haydVariance: number; label: string }> = {
  exact: { uncertaintyMonths: 0, haydVariance: 0, label: "أعرف بدقة" },
  approx: { uncertaintyMonths: 6, haydVariance: 1, label: "تقريبًا" },
  unsure: { uncertaintyMonths: 24, haydVariance: 2, label: "لا أتذكر جيدًا" },
};

export type Range = { min: number; likely: number; safe: number };
export type Scenario = keyof Range;
const SCENARIOS: Scenario[] = ["min", "likely", "safe"];

const rangeOf = (f: (s: Scenario) => number): Range => ({
  min: f("min"),
  likely: f("likely"),
  safe: f("safe"),
});

/** min rounds down, safe rounds up — the same direction as the slack. */
function roundFor(s: Scenario, n: number): number {
  const v = Math.max(0, n);
  const r = s === "min" ? Math.floor(v + 1e-9) : s === "safe" ? Math.ceil(v - 1e-9) : Math.round(v);
  // Math.ceil(-1e-9) is -0, which prints as "0" and fails strict equality.
  return r === 0 ? 0 : r;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export type PrayerCalcInput = {
  gender: Gender;
  birthDate: string;
  /** Age at bulugh in Hijri years. */
  bulughAge: number;
  /** The date regular prayer began. */
  startedPrayingDate: string;
  /** Share of the period that WAS prayed, 0..1 (default 0: none of it). */
  prayedFraction?: number;
  certainty?: Certainty;
  includeWitr?: boolean;
  /** Women: days of hayd per month (default 6). */
  haydDays?: number;
  /** Women: number of births, and days of nifas for each (default 40). */
  births?: number;
  nifasDays?: number;
  today?: string;
};

export type PrayerEstimate = {
  bulughDate: string;
  periodDays: Range;
  exemptDays: Range;
  missedDays: Range;
  perPrayer: Partial<Record<PrayerKey, Range>>;
  /** Sum across the prayers included. */
  total: Range;
  warnings: string[];
};

export function estimatePrayerDebt(input: PrayerCalcInput): PrayerEstimate {
  const today = input.today ?? localTodayISO();
  const warnings: string[] = [];
  const empty = (): PrayerEstimate => ({
    bulughDate: today,
    periodDays: rangeOf(() => 0),
    exemptDays: rangeOf(() => 0),
    missedDays: rangeOf(() => 0),
    perPrayer: {},
    total: rangeOf(() => 0),
    warnings,
  });

  const birth = parseISO(input.birthDate);
  const start = parseISO(input.startedPrayingDate);
  if (birth === null) {
    warnings.push("تاريخ الميلاد غير صالح");
    return empty();
  }
  if (start === null) {
    warnings.push("تاريخ بدء المحافظة على الصلاة غير صالح");
    return empty();
  }

  const bulughAge = clamp(Number(input.bulughAge) || 15, 8, 20);
  const bulughMs = birth + Math.round(bulughAge * HIJRI_YEAR_DAYS) * DAY_MS;
  const bulughDate = toISO(bulughMs);

  let startDate = input.startedPrayingDate;
  if (daysBetween(startDate, today) < 0) {
    warnings.push("تاريخ البدء بعد اليوم، فحُسب إلى اليوم");
    startDate = today;
  }

  const baseDays = daysBetween(bulughDate, startDate);
  if (baseDays <= 0) {
    warnings.push("بدأتَ الصلاة قبل البلوغ أو عنده، فلا قضاء من هذه الفترة");
  }

  const cert = CERTAINTY[input.certainty ?? "exact"];
  const slackDays = cert.uncertaintyMonths * 30.44;
  const prayed = clamp(Number(input.prayedFraction) || 0, 0, 1);
  const female = input.gender === "female";
  const hayd = clamp(Number.isFinite(input.haydDays) ? (input.haydDays as number) : 6, 0, 15);
  const births = Math.max(0, Math.floor(Number(input.births) || 0));
  const nifas = clamp(Number.isFinite(input.nifasDays) ? (input.nifasDays as number) : 40, 0, 60);
  // Even the "safe" count cannot reach back past today.
  const ceiling = Math.max(0, daysBetween(bulughDate, today));

  const periodFor = (s: Scenario) => {
    const slack = s === "min" ? -slackDays : s === "safe" ? slackDays : 0;
    return clamp(baseDays + slack, 0, ceiling);
  };
  const exemptFor = (s: Scenario) => {
    if (!female) return 0;
    // Fewer exempt days means MORE to make up, so "safe" takes the lower hayd.
    const h = clamp(hayd + (s === "min" ? cert.haydVariance : s === "safe" ? -cert.haydVariance : 0), 0, 15);
    return (periodFor(s) / HIJRI_MONTH_DAYS) * h + births * nifas;
  };
  const missedFor = (s: Scenario) =>
    Math.max(0, periodFor(s) - exemptFor(s)) * (1 - prayed);

  const periodDays = rangeOf((s) => roundFor(s, periodFor(s)));
  const exemptDays = rangeOf((s) => roundFor(s === "min" ? "safe" : s === "safe" ? "min" : s, exemptFor(s)));
  const missedDays = rangeOf((s) => roundFor(s, missedFor(s)));

  const perPrayer: Partial<Record<PrayerKey, Range>> = {};
  for (const k of FARD_KEYS) perPrayer[k] = missedDays;
  if (input.includeWitr) perPrayer.witr = missedDays;

  const count = Object.keys(perPrayer).length;
  const total = rangeOf((s) => missedDays[s] * count);

  return { bulughDate, periodDays, exemptDays, missedDays, perPrayer, total, warnings };
}

export type FastCalcInput = {
  gender: Gender;
  birthDate: string;
  bulughAge: number;
  /** The date from which Ramadan was fasted regularly. */
  startedFastingDate: string;
  /** Days of each Ramadan that WERE fasted (default 0). A woman who fasted all but her period enters ~24. */
  fastedDaysPerRamadan?: number;
  certainty?: Certainty;
  today?: string;
};

export type FastEstimate = {
  years: Array<{ year: number; days: Range }>;
  total: Range;
  warnings: string[];
};

export function estimateFastDebt(input: FastCalcInput): FastEstimate {
  const today = input.today ?? localTodayISO();
  const warnings: string[] = [];
  const birth = parseISO(input.birthDate);
  const startMs = parseISO(input.startedFastingDate);
  if (birth === null || startMs === null) {
    warnings.push("تاريخ غير صالح");
    return { years: [], total: rangeOf(() => 0), warnings };
  }

  const bulughAge = clamp(Number(input.bulughAge) || 15, 8, 20);
  const bulughDate = toISO(birth + Math.round(bulughAge * HIJRI_YEAR_DAYS) * DAY_MS);
  let startDate = input.startedFastingDate;
  if (daysBetween(startDate, today) < 0) {
    warnings.push("تاريخ البدء بعد اليوم، فحُسب إلى اليوم");
    startDate = today;
  }

  const slackDays = CERTAINTY[input.certainty ?? "exact"].uncertaintyMonths * 30.44;
  const fasted = clamp(Number(input.fastedDaysPerRamadan) || 0, 0, 30);

  // A Ramadan is owed if it began after bulugh and before regular fasting did.
  // `safe` widens the window, `min` narrows it, same as for prayers.
  const yearsFor = (s: Scenario) => {
    const slack = s === "min" ? -slackDays : s === "safe" ? slackDays : 0;
    const from = hijriYearOf(bulughDate);
    const to = hijriYearOf(toISO(Math.min(parseISO(today) ?? startMs, startMs + slack * DAY_MS)));
    const out: number[] = [];
    for (let y = from; y <= to + 1; y += 1) {
      const rs = hijriMonthStartISO(y, 9);
      if (daysBetween(bulughDate, rs) < 0) continue; // Ramadan came before bulugh
      if (daysBetween(rs, toISO(startMs + slack * DAY_MS)) <= 0) continue; // after fasting began
      if (daysBetween(rs, today) < 0) continue; // not yet
      out.push(y);
    }
    return out;
  };

  const allYears = Array.from(
    new Set(SCENARIOS.flatMap((s) => yearsFor(s))),
  ).sort((a, b) => a - b);

  // Ramadan runs 29 or 30 days; "min" takes 29, the others 30.
  const perYear = (s: Scenario) => Math.max(0, (s === "min" ? 29 : 30) - fasted);
  const years = allYears.map((year) => ({
    year,
    days: rangeOf((s) => (yearsFor(s).includes(year) ? perYear(s) : 0)),
  }));
  const total = rangeOf((s) => years.reduce((sum, y) => sum + y.days[s], 0));
  return { years, total, warnings };
}

// ── Remaining, surplus ──────────────────────────────────────────────────

export type NumMap = Record<string, number>;

export const remainingOf = (owed: NumMap, done: NumMap, key: string): number =>
  Math.max(0, Math.floor(owed[key] ?? 0) - Math.floor(done[key] ?? 0));

/** What was done beyond what was owed — counted as nafl. */
export const surplusOf = (owed: NumMap, done: NumMap, key: string): number =>
  Math.max(0, Math.floor(done[key] ?? 0) - Math.floor(owed[key] ?? 0));

export type PrayerCounts = Record<PrayerKey, number>;

const zeroCounts = (): PrayerCounts => ({ fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, witr: 0 });

/**
 * Remaining per prayer. Witr is zero unless `includeWitr`, so a Shafi'i or
 * Maliki who has an old Witr figure stored does not see it count against them.
 */
export function prayerRemaining(owed: NumMap, done: NumMap, includeWitr: boolean): PrayerCounts {
  const out = zeroCounts();
  for (const k of PRAYER_KEYS) {
    if (k === "witr" && !includeWitr) continue;
    out[k] = remainingOf(owed, done, prayerKey(k));
  }
  return out;
}

export const sumCounts = (c: Partial<Record<PrayerKey, number>>): number =>
  PRAYER_KEYS.reduce((s, k) => s + (c[k] ?? 0), 0);

export function prayerOwedTotal(owed: NumMap, includeWitr: boolean): number {
  return PRAYER_KEYS.reduce(
    (s, k) => s + (k === "witr" && !includeWitr ? 0 : Math.floor(owed[prayerKey(k)] ?? 0)),
    0,
  );
}

// ── The plan ────────────────────────────────────────────────────────────

export type PlanMode = "perFard" | "daily" | "byDate";

export type QadaaPlan = {
  mode: PlanMode;
  /** `daily`: how many "full days" of qadaa to pray each day. */
  perDay?: number;
  /** `byDate`: finish by this date. */
  finishBy?: string | null;
};

export const DEFAULT_PLAN: QadaaPlan = { mode: "perFard" };

/**
 * How many of each prayer to make up today.
 *
 *  - perFard: one with each present fard. The method the Egyptian Dar al-Ifta
 *    calls easiest, and the default.
 *  - daily:   N full days of qadaa each day.
 *  - byDate:  whatever it takes to finish by a date, spread evenly.
 *
 * Never more than what remains of that prayer.
 */
export function dailyQuota(plan: QadaaPlan, remaining: PrayerCounts, today: string): PrayerCounts {
  const out = zeroCounts();
  for (const k of PRAYER_KEYS) {
    const left = remaining[k];
    if (left <= 0) continue;
    if (plan.mode === "daily") {
      out[k] = Math.min(left, Math.max(1, Math.floor(plan.perDay ?? 1)));
    } else if (plan.mode === "byDate" && plan.finishBy) {
      const daysLeft = Math.max(1, daysBetween(today, plan.finishBy) + 1);
      out[k] = Math.min(left, Math.ceil(left / daysLeft));
    } else {
      out[k] = 1;
    }
  }
  return out;
}

/** Days the plan needs, counting today. Null when there is nothing to plan. */
export function planDaysToFinish(plan: QadaaPlan, remaining: PrayerCounts, today: string): number | null {
  const most = Math.max(...PRAYER_KEYS.map((k) => remaining[k]));
  if (most <= 0) return null;
  if (plan.mode === "daily") return Math.ceil(most / Math.max(1, Math.floor(plan.perDay ?? 1)));
  if (plan.mode === "byDate" && plan.finishBy) return Math.max(1, daysBetween(today, plan.finishBy) + 1);
  return most; // perFard: one of each per day, so the largest debt sets the pace
}

export function finishDate(plan: QadaaPlan, remaining: PrayerCounts, today: string): string | null {
  const days = planDaysToFinish(plan, remaining, today);
  return days === null ? null : addDays(today, days - 1);
}

// ── History ─────────────────────────────────────────────────────────────

/** The last `n` days, oldest first, each with how many were made up. */
export function lastNDays(dayTotals: NumMap, today: string, n: number): Array<{ iso: string; count: number }> {
  const out: Array<{ iso: string; count: number }> = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const iso = addDays(today, -i);
    out.push({ iso, count: Math.max(0, Math.floor(dayTotals[iso] ?? 0)) });
  }
  return out;
}

/**
 * Prayers per day over the recent past.
 *
 * Averaged over the days since the first one logged, up to `windowDays` — so a
 * person who began three days ago is judged on three days, not on fourteen of
 * which eleven were before they started.
 */
export function paceFromHistory(dayTotals: NumMap, today: string, windowDays = 14): number {
  const days = lastNDays(dayTotals, today, windowDays);
  const firstActive = days.findIndex((d) => d.count > 0);
  if (firstActive === -1) return 0;
  const span = days.length - firstActive;
  const sum = days.slice(firstActive).reduce((s, d) => s + d.count, 0);
  return sum / span;
}

/** When the debt would be cleared at the current pace, or null with no pace. */
export function projectFinish(totalRemaining: number, pacePerDay: number, today: string): string | null {
  if (totalRemaining <= 0) return today;
  if (pacePerDay <= 0) return null;
  return addDays(today, Math.ceil(totalRemaining / pacePerDay));
}

/** Consecutive days with any qadaa, ending today — or yesterday, if today is not done yet. */
export function streak(dayTotals: NumMap, today: string): number {
  let n = 0;
  let cursor = (dayTotals[today] ?? 0) > 0 ? today : addDays(today, -1);
  while ((dayTotals[cursor] ?? 0) > 0) {
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}

// ── Order ───────────────────────────────────────────────────────────────

/**
 * The order helper applies only while five or fewer remain; beyond that the
 * ruling is that the order falls away. Returns the prayers in the order to make
 * them up, or null when it does not apply.
 */
export function orderHint(remaining: PrayerCounts): PrayerKey[] | null {
  const total = sumCounts(remaining);
  if (total <= 0 || total > 5) return null;
  const seq: PrayerKey[] = [];
  for (const k of PRAYER_KEYS) for (let i = 0; i < remaining[k]; i += 1) seq.push(k);
  return seq;
}

// ── Fasting: the clock to the next Ramadan ──────────────────────────────

export type NextRamadan = {
  startISO: string;
  hijriYear: number;
  daysUntil: number;
  /** True when today is itself in Ramadan. */
  inRamadan: boolean;
};

export function nextRamadan(today: string): NextRamadan {
  const h = gregorianToHijri(localDateFromISO(today));
  const inRamadan = h.month === 9;
  // During Ramadan the "next" one is the following year; before it, this year's.
  const year = h.month < 9 ? h.year : h.year + 1;
  const startISO = hijriMonthStartISO(year, 9);
  return { startISO, hijriYear: year, daysUntil: Math.max(0, daysBetween(today, startISO)), inRamadan };
}

/**
 * The calendar here is arithmetic, not sighted. Measured against published dates
 * it is exact on some days and 1–3 days off on others (1 Ramadan 1447 comes out
 * two days after the 18 February it was observed). A countdown that promised
 * more time than a person really has would be worse than none, so advice treats
 * Ramadan as arriving this many days EARLIER than the calendar says.
 */
export const CALENDAR_MARGIN_DAYS = 2;

export type FastLevel = "none" | "comfortable" | "start" | "urgent" | "cannot";

export type FastAdvice = {
  level: FastLevel;
  owed: number;
  daysUntil: number;
  /** Days to spare once every owed fast has a day of its own. */
  spare: number;
  /** Whether this madhhab adds feeding a poor person if it is delayed without excuse. */
  fidyaIfDelayed: boolean;
};

/** The majority view requires fidya for an unexcused delay; the Hanafis do not. */
export function fidyaApplies(madhhab: Madhhab | null | undefined): boolean {
  return madhhab === "maliki" || madhhab === "shafii" || madhhab === "hanbali";
}

export function fastAdvice(owed: number, today: string, madhhab: Madhhab | null | undefined): FastAdvice {
  const o = Math.max(0, Math.floor(owed));
  const next = nextRamadan(today);
  const spare = next.daysUntil - CALENDAR_MARGIN_DAYS - o;
  let level: FastLevel;
  if (o === 0) level = "none";
  else if (spare < 0) level = "cannot";
  else if (spare < 14) level = "urgent";
  else if (spare < 60) level = "start";
  else level = "comfortable";
  return { level, owed: o, daysUntil: next.daysUntil, spare, fidyaIfDelayed: fidyaApplies(madhhab) };
}

/** Total cost of feeding one poor person per day, given what one meal costs. */
export const fidyaTotal = (days: number, mealCost: number): number =>
  Math.max(0, Math.floor(days)) * Math.max(0, Number.isFinite(mealCost) ? mealCost : 0);
