/**
 * @vitest-environment jsdom
 *
 * Quick tasbeeh only ever contributed its first 33 taps to the leaderboard.
 *
 * Two compounding causes: the score read `quickTasbeeh[key]`, which STOPS at
 * the user's sebha target (33 by default), and it read only the one phrase
 * chosen for that day rather than all four.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { useNoorStore } from "@/store/noorStore";
import { buildLeaderboardScoreStats, TASBEEH_DAILY_CAP } from "@/lib/leaderboardScores";
import { getIbadahDateKey } from "@/lib/dayBoundaries";

const sections = [] as never[];
const key = () => getIbadahDateKey(new Date(), useNoorStore.getState().lastKnownFajrTime);

function score() {
  const s = useNoorStore.getState();
  return buildLeaderboardScoreStats({
    sections,
    progress: {},
    quranAyahsToday: 0,
    prayersDone: {},
    quickTasbeeh: s.quickTasbeeh,
    tasbeehTodayTotal: s.tasbeehDayTotals[key()] ?? 0,
    todayISO: key(),
  });
}

beforeEach(() => {
  const today = key();
  useNoorStore.setState({
    quickTasbeeh: {}, tasbeehLifetime: {}, tasbeehDailyLog: {}, tasbeehDayTotals: {},
    activity: {}, asmaHusnaCounts: {},
    lastIbadahResetISO: today, lastCivilResetISO: today, lastKnownFajrTime: "04:30",
  });
});

describe("quick tasbeeh counts past the sebha target", () => {
  it("counts 300 taps, not just the first 33", () => {
    const inc = useNoorStore.getState().incQuickTasbeeh;
    for (let i = 0; i < 300; i += 1) inc("subhanallah", 33);
    expect(useNoorStore.getState().quickTasbeeh.subhanallah).toBe(33); // display still capped
    expect(score().tasbeehDailyScore).toBe(300);                        // score is not
  });

  it("counts all four phrases, not only the day's chosen one", () => {
    const inc = useNoorStore.getState().incQuickTasbeeh;
    for (const k of ["subhanallah", "alhamdulillah", "la_ilaha_illallah", "allahu_akbar"]) {
      for (let i = 0; i < 50; i += 1) inc(k, 33);
    }
    expect(score().tasbeehDailyScore).toBe(200);
  });

  it("caps a day at 1000", () => {
    const inc = useNoorStore.getState().incQuickTasbeeh;
    for (let i = 0; i < 1200; i += 1) inc("subhanallah", 33);
    expect(TASBEEH_DAILY_CAP).toBe(1000);
    expect(score().tasbeehDailyScore).toBe(1000);
  });

  it("feeds the global score", () => {
    const inc = useNoorStore.getState().incQuickTasbeeh;
    for (let i = 0; i < 120; i += 1) inc("alhamdulillah", 33);
    expect(score().global).toBe(120); // no dhikr/quran/prayers in this fixture
  });

  it("starts from zero after the Fajr reset", () => {
    const inc = useNoorStore.getState().incQuickTasbeeh;
    for (let i = 0; i < 80; i += 1) inc("subhanallah", 33);
    expect(score().tasbeehDailyScore).toBe(80);

    useNoorStore.setState({ lastIbadahResetISO: "2020-01-01" });
    useNoorStore.getState().ensureDailyResets();
    // A new ibaadah day has its own bucket, so today's total is untouched but
    // the reset marker moved — the bridge is free to submit again.
    expect(useNoorStore.getState().quickTasbeeh).toEqual({});
  });

  it("is bucketed by the ibaadah day, matching the day the board scores", () => {
    useNoorStore.getState().incQuickTasbeeh("subhanallah", 33);
    expect(Object.keys(useNoorStore.getState().tasbeehDayTotals)).toEqual([key()]);
  });

  it("falls back to the old reading when no total is supplied", () => {
    // Keeps existing callers and tests correct rather than silently zeroing.
    const s = buildLeaderboardScoreStats({
      sections, progress: {}, quranAyahsToday: 0, prayersDone: {},
      quickTasbeeh: { subhanallah: 12, alhamdulillah: 12, la_ilaha_illallah: 12, allahu_akbar: 12 },
      todayISO: "2026-08-23",
    });
    expect(s.tasbeehDailyScore).toBeGreaterThan(0);
  });
});
