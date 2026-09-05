/**
 * The scoring the SERVER does — the module the edge function imports.
 *
 * This is now the authority on what a day is worth, so it is the thing that
 * must not be wrong: a mistake here is instantly live for every user at once,
 * which is exactly the property that made moving it worth doing and exactly
 * the property that makes it dangerous.
 *
 * Imported by relative path rather than through the `@/` alias, because this
 * file lives in the Deno function and is deliberately dependency-free so both
 * runtimes can load the same source.
 */
import { describe, expect, it } from "vitest";
import {
  computeScores,
  hasMetrics,
  clampComponent,
  FARD_PRAYERS_PER_DAY,
  TASBEEH_DAILY_CAP,
  PRAYER_POINTS,
  TASK_POINTS,
  QURAN_POINTS,
} from "../supabase/functions/leaderboard/scoring";

describe("the weights", () => {
  it("adds its parts and nothing else", () => {
    const s = computeScores({
      dhikr: 100,
      quranAyahs: 10,
      prayersLogged: 3,
      tasksDone: 4,
      tasbeehTaps: 50,
    });
    expect(s.global).toBe(100 + 10 * QURAN_POINTS + 3 * PRAYER_POINTS + 4 * TASK_POINTS + 50);
    expect(s.global).toBe(100 + 30 + 120 + 32 + 50);
  });

  it("keeps a full day of prayers and a full checklist worth the same", () => {
    // Deliberate: the checklist is worth encouraging, not worth more than the
    // prayers it sits beside.
    const prayersOnly = computeScores({ prayersLogged: 5 });
    const tasksOnly = computeScores({ tasksDone: 25 });
    expect(prayersOnly.global).toBe(200);
    expect(tasksOnly.global).toBe(200);
  });

  it("scores an empty day as zero, not as NaN", () => {
    expect(computeScores({}).global).toBe(0);
    expect(computeScores(null).global).toBe(0);
    expect(computeScores(undefined).global).toBe(0);
  });
});

describe("the caps belong to the server", () => {
  it("never counts more than the five fard prayers", () => {
    // The distortion this whole migration exists to stop reaching the board:
    // older builds counted 25 checklist ticks here, at 40 points each.
    const s = computeScores({ prayersLogged: 25 });
    expect(s.prayers).toBe(FARD_PRAYERS_PER_DAY);
    expect(s.global).toBe(FARD_PRAYERS_PER_DAY * PRAYER_POINTS);
  });

  it("caps tasbeeh at a day's worth", () => {
    expect(computeScores({ tasbeehTaps: 999_999 }).tasbeehDaily).toBe(TASBEEH_DAILY_CAP);
  });

  it("cannot be talked out of its own limits by the client", () => {
    // Whatever a client reports, the ceiling is applied here.
    const s = computeScores({ prayersLogged: 1e9, tasbeehTaps: 1e9 });
    expect(s.prayers).toBe(FARD_PRAYERS_PER_DAY);
    expect(s.tasbeehDaily).toBe(TASBEEH_DAILY_CAP);
  });
});

describe("hostile and broken input", () => {
  it("treats negatives, NaN and junk as zero", () => {
    for (const bad of [-50, Number.NaN, Number.POSITIVE_INFINITY, "abc", null, undefined, {}]) {
      expect(clampComponent(bad as never)).toBe(0);
    }
  });

  it("floors fractions rather than carrying them into a score", () => {
    expect(clampComponent(7.9)).toBe(7);
  });

  it("refuses a section list long enough to be an attack", () => {
    const sections: Record<string, number> = {};
    for (let i = 0; i < 500; i += 1) sections[`s${i}`] = 5;
    expect(Object.keys(computeScores({ sections }, 64).sections)).toHaveLength(64);
  });

  it("bounds the total no matter what is sent", () => {
    const s = computeScores({ dhikr: 1e12, quranAyahs: 1e12 });
    expect(s.global).toBeLessThanOrEqual(1_000_000);
  });
});

describe("which submissions the server scores", () => {
  it("scores one that carries its components", () => {
    expect(hasMetrics({ metrics: { dhikr: 1 } })).toBe(true);
  });

  it("leaves an older client's own scores alone", () => {
    // Builds from before this existed send only `scores`. Dropping them would
    // take real users off the board until they happened to update.
    expect(hasMetrics({})).toBe(false);
    expect(hasMetrics({ metrics: null } as never)).toBe(false);
  });
});

describe("the app and the server agree", () => {
  it("computes the same total from the same day", async () => {
    // Two implementations exist on purpose: the app must score offline and
    // instantly for display, the server decides the ranking. They are allowed
    // to be separate — they are not allowed to disagree, or someone watches
    // their own screen say one number while the board says another.
    const { buildLeaderboardScoreStats } = await import("@/lib/leaderboardScores");

    const sections = [
      { id: "morning", title: "الصباح", content: [{ text: "a", count: 10 }, { text: "b", count: 3 }] },
      { id: "evening", title: "المساء", content: [{ text: "c", count: 7 }] },
    ] as never;

    const stats = buildLeaderboardScoreStats({
      sections,
      progress: { "morning:0": 10, "morning:1": 2, "evening:0": 5 },
      quranAyahsToday: 12,
      prayersDone: { fajr_on_time: true, quran_reading: true, tahajjud: true },
      prayersLoggedToday: { Fajr: true, Dhuhr: true, Asr: true },
      quickTasbeeh: {},
      tasbeehTodayTotal: 140,
      todayISO: "2026-09-05",
    });

    const server = computeScores(stats.metrics);
    expect(server.global).toBe(stats.global);
    expect(server.dhikr).toBe(stats.dhikr);
    expect(server.quran).toBe(stats.quran);
    expect(server.prayers).toBe(stats.prayers);
    expect(server.tasbeehDaily).toBe(stats.tasbeehDailyScore);
  });

  it("still agrees when the day is over every cap", async () => {
    const { buildLeaderboardScoreStats } = await import("@/lib/leaderboardScores");
    const stats = buildLeaderboardScoreStats({
      sections: [] as never,
      progress: {},
      quranAyahsToday: 0,
      prayersDone: {},
      // More "prayers" than exist, and more tasbeeh than a day allows.
      prayersLoggedToday: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true, Extra: true },
      quickTasbeeh: {},
      tasbeehTodayTotal: 50_000,
      todayISO: "2026-09-05",
    });

    const server = computeScores(stats.metrics);
    expect(stats.prayers).toBe(FARD_PRAYERS_PER_DAY);
    expect(server.prayers).toBe(FARD_PRAYERS_PER_DAY);
    expect(server.tasbeehDaily).toBe(TASBEEH_DAILY_CAP);
    expect(server.global).toBe(stats.global);
  });
});
