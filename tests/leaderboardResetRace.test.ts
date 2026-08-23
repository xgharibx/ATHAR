/**
 * @vitest-environment jsdom
 *
 * The "it didn't reset at Fajr" bug.
 *
 * The leaderboard's day key flips at Fajr on its own timer, but `progress`
 * only clears when ensureDailyResets runs. Nothing coupled the two, so in the
 * window between them the sync bridge posted YESTERDAY's totals under TODAY's
 * date. The server rolls scores up with max(), so that inflated number stuck
 * for the whole day and the later zero could never pull it back down.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { useNoorStore } from "@/store/noorStore";
import { buildLeaderboardScoreStats } from "@/lib/leaderboardScores";
import type { Section } from "@/data/types";

const sections = [
  { id: "morning", title: "الصباح", content: [{ text: "أ", count: 100 }, { text: "ب", count: 100 }] },
] as unknown as Section[];

function todayISO() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
const YESTERDAY = "2020-01-01";

beforeEach(() => {
  useNoorStore.setState({
    progress: { "morning:0": 100, "morning:1": 100 }, // yesterday's completed work
    quickTasbeeh: { subhanallah: 100 },
    asmaHusnaCounts: { 7: 100 },
    activity: {},
    lastIbadahResetISO: YESTERDAY,
    lastCivilResetISO: YESTERDAY,
    lastKnownFajrTime: "04:30",
  });
});

describe("the reset must run before any score is attributed to the new day", () => {
  it("a stale reset marker is detectable — this is the guard the bridge uses", () => {
    // The bridge refuses to submit while lastIbadahResetISO is behind the day
    // key, which is exactly this state.
    expect(useNoorStore.getState().lastIbadahResetISO < todayISO()).toBe(true);
  });

  it("yesterday's progress would otherwise be scored under today", () => {
    const s = useNoorStore.getState();
    const stale = buildLeaderboardScoreStats({
      sections,
      progress: s.progress,
      quranAyahsToday: 0,
      prayersDone: {},
      quickTasbeeh: s.quickTasbeeh,
      todayISO: todayISO(),
    });
    // 200 dhikr carried over from a day that already ended.
    expect(stale.dhikr).toBe(200);
  });

  it("after the reset the marker matches and the score is zero", () => {
    useNoorStore.getState().ensureDailyResets();
    const s = useNoorStore.getState();
    expect(s.lastIbadahResetISO).toBe(todayISO());
    expect(s.lastIbadahResetISO < todayISO()).toBe(false); // guard now allows submitting

    const fresh = buildLeaderboardScoreStats({
      sections,
      progress: s.progress,
      quranAyahsToday: 0,
      prayersDone: {},
      quickTasbeeh: s.quickTasbeeh,
      todayISO: todayISO(),
    });
    expect(fresh.dhikr).toBe(0);
    expect(fresh.global).toBe(0);
  });
});

describe("every flat counter resets at Fajr", () => {
  it("clears adhkar progress, quick tasbeeh and asma al-husna together", () => {
    useNoorStore.getState().ensureDailyResets();
    const s = useNoorStore.getState();
    expect(s.progress).toEqual({});
    expect(s.quickTasbeeh).toEqual({});
    // Asma al-Husna had no reset at all: a name counted to its target was
    // finished permanently and could never be counted again.
    expect(s.asmaHusnaCounts).toEqual({});
  });

  it("a completed name can be counted again the next day", () => {
    useNoorStore.getState().ensureDailyResets();
    expect(useNoorStore.getState().incAsmaHusnaCount(7, 100)).toBe(1);
  });

  it("lifetime totals survive the reset", () => {
    useNoorStore.setState({ tasbeehLifetime: { subhanallah: 5000 } });
    useNoorStore.getState().ensureDailyResets();
    expect(useNoorStore.getState().tasbeehLifetime.subhanallah).toBe(5000);
  });

  it("custom pack progress resets too", () => {
    useNoorStore.setState({
      progress: { "my_adhkar:0": 9, "custom_123:2": 4 },
      lastIbadahResetISO: YESTERDAY,
    });
    useNoorStore.getState().ensureDailyResets();
    expect(useNoorStore.getState().progress).toEqual({});
  });
});
