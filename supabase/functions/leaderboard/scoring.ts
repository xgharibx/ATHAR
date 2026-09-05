/**
 * How a day's worship becomes a score. **This is the authority.**
 *
 * Scoring used to live only in the app, which meant every correction to it —
 * a weight that turned out wrong, a counter that was being read as something
 * it is not — reached people only as fast as they updated. The last such fix
 * (prayers were counting daily-checklist ticks, at 40 points each) is still
 * arriving on phones weeks later, and until it does those users are ranked by
 * a formula nobody believes in any more.
 *
 * So the client now sends the raw components and the server turns them into a
 * score. A weighting change is a function deploy, and everyone is ranked by the
 * same rules the same day.
 *
 * The app still scores locally, because it must: the counters have to read
 * correctly offline and instantly. That copy is for display. This one decides
 * the board, and where they disagree this one wins.
 *
 * Deliberately dependency-free so the Deno function and the Node test suite can
 * both import it and there is only ever one implementation to be wrong.
 */

/** An ayah read is worth three dhikr. */
export const QURAN_POINTS = 3;

/**
 * A prayer is worth 40, and there are five of them — so a full day of prayers
 * is 200. Every other weight is set relative to that.
 */
export const PRAYER_POINTS = 40;
export const FARD_PRAYERS_PER_DAY = 5;

/**
 * The daily-growth checklist has 25 items. At 8 apiece a full sweep is also
 * 200: worth encouraging, deliberately not worth more than the prayers.
 */
export const TASK_POINTS = 8;

/** Tasbeeh counts every tap, up to a day's worth. */
export const TASBEEH_DAILY_CAP = 1000;

/** The largest score any single board will accept, as a sanity bound. */
export const MAX_COMPONENT = 1_000_000;

export type LeaderboardMetrics = {
  /** Adhkar taps, already clamped per item to that dhikr's own target. */
  dhikr?: number;
  /** Ayahs read today. */
  quranAyahs?: number;
  /** Fard prayers logged today. Capped here, not by the caller. */
  prayersLogged?: number;
  /** Daily-growth checklist items ticked today. */
  tasksDone?: number;
  /** Every tasbeeh tap today, uncapped. Capped here. */
  tasbeehTaps?: number;
  /** sectionId → that section's clamped total. */
  sections?: Record<string, number>;
};

export type LeaderboardScores = {
  global: number;
  dhikr: number;
  quran: number;
  prayers: number;
  tasks: number;
  tasbeehDaily: number;
  sections: Record<string, number>;
};

/** A finite, non-negative, whole number within the sanity bound. */
export function clampComponent(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, MAX_COMPONENT);
}

/**
 * Turn the day's raw components into the score the board ranks by.
 *
 * Every cap lives here rather than in the caller, so a client that under- or
 * over-reports one component cannot change how it is weighed.
 */
export function computeScores(
  metrics: LeaderboardMetrics | null | undefined,
  maxSections = 64,
): LeaderboardScores {
  const m = metrics ?? {};

  const dhikr = clampComponent(m.dhikr);
  const quran = clampComponent(m.quranAyahs);
  const prayers = Math.min(clampComponent(m.prayersLogged), FARD_PRAYERS_PER_DAY);
  const tasks = clampComponent(m.tasksDone);
  const tasbeehDaily = Math.min(clampComponent(m.tasbeehTaps), TASBEEH_DAILY_CAP);

  const sections: Record<string, number> = {};
  for (const [id, value] of Object.entries(m.sections ?? {}).slice(0, maxSections)) {
    sections[id] = clampComponent(value);
  }

  const global = Math.min(
    dhikr + quran * QURAN_POINTS + prayers * PRAYER_POINTS + tasks * TASK_POINTS + tasbeehDaily,
    MAX_COMPONENT,
  );

  return { global, dhikr, quran, prayers, tasks, tasbeehDaily, sections };
}

/** Does this submission carry the components needed to score it server-side? */
export function hasMetrics(payload: { metrics?: unknown }): boolean {
  return !!payload && typeof payload.metrics === "object" && payload.metrics !== null;
}
