import { coerceCount, type CustomAdhkarPack, type Section } from "@/data/types";
import { dhikrStateKey } from "@/lib/dhikrItemIdentity";

const DAILY_TASBEEH_POOL: Array<{ key: string; label: string }> = [
  { key: "subhanallah", label: "سُبْحَانَ الله" },
  { key: "alhamdulillah", label: "الْحَمْدُ لِلَّه" },
  { key: "la_ilaha_illallah", label: "لا إِلَهَ إِلَّا الله" },
  { key: "allahu_akbar", label: "اللهُ أَكْبَر" }
];

/**
 * How much tasbeeh can count toward one day's score.
 *
 * Was effectively the sebha target (33 by default) because the score read a
 * counter that stops there. A day of real dhikr is worth far more than that,
 * but it still needs a ceiling so the tasbeeh board cannot be farmed past
 * every other activity.
 */
export const TASBEEH_DAILY_CAP = 1000;

/** The five fard prayers — the ceiling for the prayers score. */
export const FARD_PRAYERS_PER_DAY = 5;

/**
 * What a prayer and a checklist tick are each worth.
 *
 * 40 was chosen when "prayers" meant the five fard prayers, so a full day of
 * them is 200. The daily-growth checklist has 25 items and is a different kind
 * of thing — worth encouraging, not worth more than the prayers themselves —
 * so a full sweep of it is 200 as well, at 8 apiece.
 */
export const PRAYER_POINTS = 40;
export const TASK_POINTS = 8;

function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getDailyTasbeeh(todayISO: string) {
  const hash = hashString(todayISO);
  const item = DAILY_TASBEEH_POOL[hash % DAILY_TASBEEH_POOL.length];
  const target = 100 + (hash % 5) * 50;
  return { ...item, target };
}

export function buildLeaderboardScoreStats(input: {
  sections: Section[];
  customPacks?: CustomAdhkarPack[];
  progress: Record<string, number>;
  /**
   * Ayahs actually *read today* (from `quranDailyAyahs[todayKey]`), NOT the
   * bookmark position. Using the bookmark meant the Quran score never reset,
   * counted identically on every day, and inflated when jumping to a late
   * surah — so it now reflects genuine daily reading activity instead.
   */
  quranAyahsToday: number;
  /**
   * The daily-growth checklist for today. 25 items, only a handful of which
   * are prayers — which is why this no longer drives the "prayers" figure.
   */
  prayersDone: Record<string, boolean>;
  /**
   * Prayers actually logged today, from `prayerLog[todayKey]` — the five
   * fard prayers, marked from the notification or the prayer screen.
   *
   * This is the real signal and it fed nothing at all: the prayers score was
   * counting checklist ticks instead.
   */
  prayersLoggedToday?: Record<string, boolean>;
  quickTasbeeh: Record<string, number>;
  /**
   * Every tasbeeh tap made today, across ALL phrases, uncapped
   * (`tasbeehDayTotals[todayKey]`).
   *
   * The score used to read `quickTasbeeh[<the day's chosen phrase>]`, which was
   * wrong twice over: that counter stops at the user's sebha target, so only
   * the first 33 taps ever counted, and it looked at one of the four phrases
   * instead of all of them.
   */
  tasbeehTodayTotal?: number;
  todayISO: string;
}) {
  const sectionScores: Record<string, number> = {};
  // Keys we were able to score against a known target, so the dhikr total below
  // can reuse the clamped value instead of trusting the raw counter.
  const clampedByKey: Record<string, number> = {};
  for (const section of input.sections) {
    let score = 0;
    section.content.forEach((item, index) => {
      const target = coerceCount(item.count);
      const key = dhikrStateKey(section.id, index, item.id);
      const current = Math.min(target, Math.max(0, Number(input.progress[key]) || 0));
      clampedByKey[key] = current;
      score += current;
    });
    sectionScores[section.id] = score;
  }

  for (const pack of input.customPacks ?? []) {
    let score = 0;
    pack.items.forEach((item, index) => {
      const target = coerceCount(item.count);
      const key = dhikrStateKey(pack.id, index, item.id);
      const current = Math.min(target, Math.max(0, Number(input.progress[key]) || 0));
      clampedByKey[key] = current;
      score += current;
    });
    sectionScores[pack.id] = score;
  }

  const dailyTasbeeh = getDailyTasbeeh(input.todayISO);
  // Fall back to the old single-phrase reading only when the caller has not
  // supplied a real total, so this stays correct for existing callers/tests.
  const rawTasbeeh = typeof input.tasbeehTodayTotal === "number"
    ? input.tasbeehTodayTotal
    : Number(input.quickTasbeeh[dailyTasbeeh.key] ?? 0) || 0;
  const tasbeehDailyScore = Math.max(0, Math.min(rawTasbeeh, TASBEEH_DAILY_CAP));

  // Count only active items above. Raw orphaned keys can belong to deleted
  // custom adhkar and must not keep awarding leaderboard points.
  const dhikr = input.customPacks === undefined
    ? Object.entries(input.progress).reduce((total, [key, value]) =>
        total + (clampedByKey[key] ?? Math.max(0, Number(value) || 0)), 0)
    : Object.values(clampedByKey).reduce((total, value) => total + value, 0);
  const quran = Math.max(0, input.quranAyahsToday || 0);
  /**
   * Prayers = prayers.
   *
   * This counted completed CHECKLIST items, which grew from a handful to 25 as
   * the daily-growth list was extended — so at 40 points each it silently
   * became worth up to 1,000, dwarfing everything else, and a day of ticking
   * boxes outscored a day of actual worship. It now counts the five fard
   * prayers that were genuinely logged, capped there, which is what the ×40
   * weight was designed around (5 x 40 = 200).
   *
   * The checklist keeps its own board and its own weight below; it was never
   * worthless, it was just being counted as something it is not.
   */
  const logged = input.prayersLoggedToday ?? {};
  const prayersLogged = Object.keys(logged).filter((key) => logged[key]).length;
  const prayers = Math.min(FARD_PRAYERS_PER_DAY, prayersLogged);

  /** Checklist items ticked today, scored in their own right. */
  const tasks = Object.keys(input.prayersDone).filter((key) => input.prayersDone[key]).length;

  const global =
    dhikr + quran * 3 + prayers * PRAYER_POINTS + tasks * TASK_POINTS + tasbeehDailyScore;

  /**
   * The same day, as raw components for the server to score.
   *
   * Sent alongside the scores above so the ranking is decided in one place:
   * change a weight in the edge function and every submission is re-weighted
   * that day, instead of waiting for people to update. Caps are deliberately
   * NOT applied here — `prayersLogged` and `tasbeehTaps` go up as counted and
   * the server bounds them, so a client cannot argue about its own limits.
   *
   * `dhikr` and `sections` are already clamped per item, because that needs
   * each dhikr's own target from the bundled adhkar data, which only the app
   * has.
   */
  const metrics = {
    dhikr,
    quranAyahs: quran,
    prayersLogged,
    tasksDone: tasks,
    tasbeehTaps: rawTasbeeh,
    sections: sectionScores,
  };

  return {
    global,
    dhikr,
    quran,
    prayers,
    tasks,
    metrics,
    tasbeehDailyLabel: dailyTasbeeh.label,
    tasbeehDailyTarget: TASBEEH_DAILY_CAP,
    tasbeehDailyScore,
    sectionScores,
    scores: {
      global,
      dhikr,
      quran,
      prayers,
      tasks,
      tasbeehDaily: tasbeehDailyScore,
      sections: sectionScores
    }
  };
}

/** Builds scores from one Fajr-based day snapshot for Home, the leaderboard, and background sync. */
export function buildLeaderboardScoreStatsForDay(input: {
  sections: Section[];
  customPacks?: CustomAdhkarPack[];
  progress: Record<string, number>;
  quranDailyAyahs: Record<string, number>;
  dailyChecklist: Record<string, Record<string, boolean>>;
  prayerLog: Record<string, Record<string, boolean>>;
  quickTasbeeh: Record<string, number>;
  tasbeehDayTotals: Record<string, number>;
  todayISO: string;
  /** Prayer logs are historically stored by civil date, unlike the Fajr-based score day. */
  civilTodayISO?: string;
}) {
  const civilTodayISO = input.civilTodayISO ?? input.todayISO;
  const prayersLoggedToday = { ...(input.prayerLog[input.todayISO] ?? {}) };
  if (civilTodayISO !== input.todayISO) {
    for (const [prayer, logged] of Object.entries(input.prayerLog[civilTodayISO] ?? {})) {
      prayersLoggedToday[prayer] = prayersLoggedToday[prayer] || logged;
    }
  }

  return buildLeaderboardScoreStats({
    sections: input.sections,
    customPacks: input.customPacks,
    progress: input.progress,
    quranAyahsToday: input.quranDailyAyahs[input.todayISO] ?? 0,
    prayersDone: input.dailyChecklist[input.todayISO] ?? {},
    prayersLoggedToday,
    quickTasbeeh: input.quickTasbeeh,
    tasbeehTodayTotal: input.tasbeehDayTotals[input.todayISO] ?? 0,
    todayISO: input.todayISO,
  });
}
