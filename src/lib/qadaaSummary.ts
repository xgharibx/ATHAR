/**
 * Everything the Qadaa surfaces need to know, derived once.
 *
 * The page, the bottom-bar button and the home-screen widget all show a slice of
 * the same picture — what remains, what is asked of today, how it is going. They
 * read it from here rather than each recomputing it, because a badge that says
 * "2 left today" over a page that says "done" is the kind of disagreement that
 * makes people stop trusting a counter.
 *
 * Pure: state in, summary out. The hook that feeds it lives in useQadaa.ts.
 */
import {
  DEFAULT_PLAN,
  FARD_KEYS,
  PRAYER_KEYS,
  addDays,
  daysBetween,
  dailyQuota,
  fastAdvice,
  finishDate,
  lastNDays,
  nextRamadan,
  orderHint,
  paceFromHistory,
  parseFastKey,
  planDaysToFinish,
  prayerKey,
  prayerOwedTotal,
  prayerRemaining,
  projectFinish,
  remainingOf,
  streak as streakOf,
  sumCounts,
  surplusOf,
  witrIsOwed,
  type FastAdvice,
  type Madhhab,
  type NextRamadan,
  type NumMap,
  type PrayerCounts,
  type PrayerKey,
  type QadaaPlan,
} from "@/lib/qadaa";

export type QadaaSettingsLike = {
  madhhab?: Madhhab | null;
  includeWitr?: boolean;
  planMode?: QadaaPlan["mode"];
  planPerDay?: number;
  planFinishBy?: string | null;
  mealCost?: number;
  startedISO?: string | null;
};

export type QadaaInput = {
  owed: NumMap;
  done: NumMap;
  dayTotals: NumMap;
  dayKinds: NumMap;
  settings: QadaaSettingsLike;
  /** The ibadah-day key — what "today" means everywhere else in the app. */
  today: string;
};

export type FastYearRow = {
  year: number;
  owed: number;
  done: number;
  remaining: number;
  surplus: number;
};

export type QadaaSummary = {
  today: string;
  /** Anything owed at all — prayers or fasts. False means: show the set-up screen. */
  configured: boolean;
  madhhab: Madhhab | null;
  includeWitr: boolean;
  plan: QadaaPlan;

  // prayers
  owed: PrayerCounts;
  remaining: PrayerCounts;
  surplus: PrayerCounts;
  owedTotal: number;
  remainingTotal: number;
  doneTotal: number;
  /** 0..100, how much of what is owed has been made up. */
  percent: number;
  /** The prayers that still have something to make up, in order. */
  open: PrayerKey[];
  /** How many of each prayer are made up so far today. */
  todayDone: PrayerCounts;
  quota: PrayerCounts;
  /** What is still asked of today after what was already made up. */
  quotaLeft: PrayerCounts;
  quotaLeftTotal: number;
  quotaTotal: number;
  /** Today's quota is met (and there was something to meet). */
  todayComplete: boolean;

  // pace and dates
  pace: number;
  streak: number;
  last14: Array<{ iso: string; count: number }>;
  /** Days the plan needs, counting today. */
  planDays: number | null;
  planFinish: string | null;
  /** When the debt would clear at the pace actually being kept, or null with no pace yet. */
  paceFinish: string | null;
  /** Days ahead (+) or behind (-) of the plan's own finish, by pace. Null when not comparable. */
  aheadByDays: number | null;
  order: PrayerKey[] | null;

  // fasting
  fasts: FastYearRow[];
  fastOwedTotal: number;
  fastRemaining: number;
  nextRamadan: NextRamadan;
  fastAdvice: FastAdvice;
};

const zero = (): PrayerCounts => ({ fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, witr: 0 });

export function planFromSettings(s: QadaaSettingsLike): QadaaPlan {
  return {
    mode: s.planMode ?? DEFAULT_PLAN.mode,
    perDay: s.planPerDay,
    finishBy: s.planFinishBy ?? null,
  };
}

export function buildQadaaSummary(input: QadaaInput): QadaaSummary {
  const { owed, done, dayTotals, dayKinds, settings, today } = input;
  const madhhab = settings.madhhab ?? null;
  const includeWitr = settings.includeWitr ?? witrIsOwed(madhhab);
  const plan = planFromSettings(settings);

  const remaining = prayerRemaining(owed, done, includeWitr);
  const owedCounts = zero();
  const surplus = zero();
  for (const k of PRAYER_KEYS) {
    if (k === "witr" && !includeWitr) continue;
    owedCounts[k] = Math.max(0, Math.floor(owed[prayerKey(k)] ?? 0));
    surplus[k] = surplusOf(owed, done, prayerKey(k));
  }

  const owedTotal = prayerOwedTotal(owed, includeWitr);
  const remainingTotal = sumCounts(remaining);
  // What counts as "made up" against the debt: never more than was owed per
  // prayer, so a surplus in one cannot make another look finished.
  const doneTotal = PRAYER_KEYS.reduce(
    (s, k) => s + Math.min(owedCounts[k], Math.max(0, Math.floor(done[prayerKey(k)] ?? 0))),
    0,
  );
  const percent = owedTotal > 0 ? Math.min(100, Math.floor((doneTotal / owedTotal) * 100)) : 0;
  const open = PRAYER_KEYS.filter((k) => remaining[k] > 0);

  // Today
  const todayDone = zero();
  const quotaLeft = zero();
  for (const k of PRAYER_KEYS) {
    todayDone[k] = Math.max(0, Math.floor(dayKinds[`${today}|${prayerKey(k)}`] ?? 0));
  }
  // A quota is measured against what was LEFT at the start of the day: the
  // plan asks for one, you made it up, remaining fell, and the quota — which
  // is computed from remaining — would otherwise shrink to zero and read as
  // "nothing was ever asked". So add today's own progress back before judging.
  const remainingAtStart = zero();
  for (const k of PRAYER_KEYS) remainingAtStart[k] = remaining[k] + Math.min(todayDone[k], owedCounts[k]);
  const startQuota = dailyQuota(plan, remainingAtStart, today);
  for (const k of PRAYER_KEYS) quotaLeft[k] = Math.max(0, startQuota[k] - todayDone[k]);
  const quotaTotal = sumCounts(startQuota);
  const quotaLeftTotal = sumCounts(quotaLeft);
  const todayComplete = quotaTotal > 0 && quotaLeftTotal === 0;

  // Pace and dates
  const pace = paceFromHistory(dayTotals, today);
  const planDays = planDaysToFinish(plan, remainingAtStart, today);
  const planFinish = finishDate(plan, remainingAtStart, today);
  const paceFinish = remainingTotal > 0 ? projectFinish(remainingTotal, pace, today) : null;
  const aheadByDays =
    planFinish && paceFinish && remainingTotal > 0 ? daysBetween(paceFinish, planFinish) : null;

  // Fasting
  const years = new Set<number>();
  for (const key of [...Object.keys(owed), ...Object.keys(done)]) {
    const y = parseFastKey(key);
    if (y !== null) years.add(y);
  }
  const fasts: FastYearRow[] = [...years]
    .sort((a, b) => a - b)
    .map((year) => {
      const key = `f:${year}`;
      return {
        year,
        owed: Math.max(0, Math.floor(owed[key] ?? 0)),
        done: Math.max(0, Math.floor(done[key] ?? 0)),
        remaining: remainingOf(owed, done, key),
        surplus: surplusOf(owed, done, key),
      };
    })
    .filter((r) => r.owed > 0 || r.done > 0);
  const fastOwedTotal = fasts.reduce((s, r) => s + r.owed, 0);
  const fastRemaining = fasts.reduce((s, r) => s + r.remaining, 0);

  return {
    today,
    configured: owedTotal > 0 || fastOwedTotal > 0,
    madhhab,
    includeWitr,
    plan,
    owed: owedCounts,
    remaining,
    surplus,
    owedTotal,
    remainingTotal,
    doneTotal,
    percent,
    open,
    todayDone,
    quota: startQuota,
    quotaLeft,
    quotaLeftTotal,
    quotaTotal,
    todayComplete,
    pace,
    streak: streakOf(dayTotals, today),
    last14: lastNDays(dayTotals, today, 14),
    planDays,
    planFinish,
    paceFinish,
    aheadByDays,
    order: orderHint(remaining),
    fasts,
    fastOwedTotal,
    fastRemaining,
    nextRamadan: nextRamadan(today),
    fastAdvice: fastAdvice(fastRemaining, today, madhhab),
  };
}

/** The keys making up "a full day": one of each prayer that is still open. */
export function fullDayKeys(summary: Pick<QadaaSummary, "remaining">): string[] {
  const keys: string[] = [];
  for (const k of PRAYER_KEYS) if (summary.remaining[k] > 0) keys.push(prayerKey(k));
  return keys;
}

/** The five fara'id, for callers that never want Witr. */
export const FARD_ONLY = FARD_KEYS;

/** A date a few days out, for tests and examples that need a "later". */
export const inDays = addDays;
