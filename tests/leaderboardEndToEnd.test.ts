/**
 * @vitest-environment jsdom
 *
 * End-to-end audit of the leaderboard scoring pipeline: real store actions →
 * real scorer → the exact numbers the bridge would submit. Every input, every
 * board, and the reset that clears them.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNoorStore } from "@/store/noorStore";
import { buildLeaderboardScoreStats, TASBEEH_DAILY_CAP } from "@/lib/leaderboardScores";
import { getIbadahDateKey } from "@/lib/dayBoundaries";
import type { Section } from "@/data/types";

const FAJR = "04:30";
const SECTIONS = [
  { id: "morning", title: "الصباح", content: [{ text: "أ", count: 100 }, { text: "ب", count: 10 }] },
  { id: "evening", title: "المساء", content: [{ text: "ج", count: 50 }] },
  { id: "my_adhkar", title: "أذكاري", content: [{ text: "خاص", count: 7 }] },
] as unknown as Section[];

const dayKey = () => getIbadahDateKey(new Date(), FAJR);

/** Exactly what LeaderboardSyncBridge feeds the scorer. */
function submitted() {
  const s = useNoorStore.getState();
  const k = dayKey();
  return buildLeaderboardScoreStats({
    sections: SECTIONS,
    progress: s.progress,
    quranAyahsToday: s.quranDailyAyahs[k] ?? 0,
    prayersDone: s.dailyChecklist[k] ?? {},
    prayersLoggedToday: s.prayerLog?.[k] ?? {},
    quickTasbeeh: s.quickTasbeeh,
    tasbeehTodayTotal: s.tasbeehDayTotals?.[k] ?? 0,
    todayISO: k,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 7, 23, 10, 0, 0)); // mid-morning, after Fajr
  useNoorStore.setState({
    progress: {}, quickTasbeeh: {}, tasbeehDayTotals: {}, tasbeehLifetime: {},
    tasbeehDailyLog: {}, quranDailyAyahs: {}, dailyChecklist: {}, prayerLog: {}, activity: {},
    asmaHusnaCounts: {}, quranStreak: 0, quranLastReadDate: null,
    lastKnownFajrTime: FAJR, lastIbadahResetISO: dayKey(), lastCivilResetISO: dayKey(),
  });
});
afterEach(() => vi.useRealTimers());

describe("every input reaches the score", () => {
  it("adhkar taps count, clamped to each dhikr's target", () => {
    const inc = useNoorStore.getState().increment;
    for (let i = 0; i < 30; i += 1) inc({ sectionId: "morning", index: 0, target: 100 });
    for (let i = 0; i < 50; i += 1) inc({ sectionId: "morning", index: 1, target: 10 }); // over target
    expect(submitted().dhikr).toBe(40); // 30 + 10 clamped
  });

  it("custom adhkar count like any category", () => {
    const inc = useNoorStore.getState().increment;
    for (let i = 0; i < 7; i += 1) inc({ sectionId: "my_adhkar", index: 0, target: 7 });
    expect(submitted().dhikr).toBe(7);
    expect(submitted().sectionScores.my_adhkar).toBe(7);
  });

  it("quran ayahs count, weighted x3", () => {
    useNoorStore.getState().recordQuranRead(9);
    const s = submitted();
    expect(s.quran).toBe(9);
    expect(s.global).toBe(27);
  });

  it("a logged prayer is what the prayers score counts, at x40", () => {
    useNoorStore.getState().setPrayerLogged(dayKey(), "Fajr", true);
    useNoorStore.getState().setPrayerLogged(dayKey(), "Dhuhr", true);
    const s = submitted();
    expect(s.prayers).toBe(2);
    expect(s.global).toBe(80);
  });

  it("never counts more than the five fard prayers", () => {
    for (const p of ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha", "Tahajjud", "Duha"]) {
      useNoorStore.getState().setPrayerLogged(dayKey(), p, true);
    }
    expect(submitted().prayers).toBe(5);
  });

  it("checklist ticks score as tasks, not as prayers", () => {
    // This is the fix: the daily-growth list grew to 25 items, and every one of
    // them was being counted as a prayer at 40 points — up to 1,000 for ticking
    // boxes, which dwarfed the actual worship it was supposed to sit beside.
    useNoorStore.getState().toggleDailyChecklist(dayKey(), "fajr_on_time", true);
    useNoorStore.getState().toggleDailyChecklist(dayKey(), "quran_reading", true);
    const s = submitted();
    expect(s.prayers).toBe(0);
    expect(s.scores.tasks).toBe(2);
    expect(s.global).toBe(16);
  });

  it("tasbeeh counts every tap past the sebha target, up to 1000", () => {
    const inc = useNoorStore.getState().incQuickTasbeeh;
    for (let i = 0; i < 250; i += 1) inc("subhanallah", 33);
    expect(submitted().tasbeehDaily ?? submitted().scores.tasbeehDaily).toBe(250);
    for (let i = 0; i < 900; i += 1) inc("alhamdulillah", 33);
    expect(submitted().scores.tasbeehDaily).toBe(TASBEEH_DAILY_CAP);
  });

  it("global is exactly the sum of its parts", () => {
    const st = useNoorStore.getState();
    for (let i = 0; i < 20; i += 1) st.increment({ sectionId: "morning", index: 0, target: 100 });
    st.recordQuranRead(5);
    st.toggleDailyChecklist(dayKey(), "fajr_on_time", true);
    st.setPrayerLogged(dayKey(), "Fajr", true);
    for (let i = 0; i < 60; i += 1) st.incQuickTasbeeh("subhanallah", 33);
    const s = submitted();
    expect(s.global).toBe(
      s.dhikr + s.quran * 3 + s.prayers * 40 + (s.scores.tasks ?? 0) * 8 + s.scores.tasbeehDaily,
    );
    expect(s.global).toBe(20 + 15 + 40 + 8 + 60);
  });

  it("per-section boards match the sum of their own items", () => {
    const st = useNoorStore.getState();
    for (let i = 0; i < 12; i += 1) st.increment({ sectionId: "morning", index: 0, target: 100 });
    for (let i = 0; i < 4; i += 1) st.increment({ sectionId: "evening", index: 0, target: 50 });
    const s = submitted();
    expect(s.sectionScores.morning).toBe(12);
    expect(s.sectionScores.evening).toBe(4);
    expect(s.dhikr).toBe(16);
  });
});

describe("everything returns to zero at Fajr", () => {
  it("a new ibaadah day scores zero across every board", () => {
    const st = useNoorStore.getState();
    for (let i = 0; i < 25; i += 1) st.increment({ sectionId: "morning", index: 0, target: 100 });
    for (let i = 0; i < 40; i += 1) st.incQuickTasbeeh("subhanallah", 33);
    st.incAsmaHusnaCount(3, 100);
    expect(submitted().global).toBeGreaterThan(0);

    // Next day, after Fajr.
    vi.setSystemTime(new Date(2026, 7, 24, 6, 0, 0));
    useNoorStore.getState().ensureDailyResets(FAJR);

    const s = submitted();
    expect(s.dhikr).toBe(0);
    expect(s.quran).toBe(0);
    expect(s.prayers).toBe(0);
    expect(s.scores.tasbeehDaily).toBe(0);
    expect(s.global).toBe(0);
    expect(useNoorStore.getState().asmaHusnaCounts).toEqual({});
  });

  it("yesterday's totals stay on yesterday", () => {
    for (let i = 0; i < 40; i += 1) useNoorStore.getState().incQuickTasbeeh("subhanallah", 33);
    const yesterday = dayKey();
    vi.setSystemTime(new Date(2026, 7, 24, 6, 0, 0));
    useNoorStore.getState().ensureDailyResets(FAJR);
    expect(useNoorStore.getState().tasbeehDayTotals[yesterday]).toBe(40);
    expect(useNoorStore.getState().tasbeehDayTotals[dayKey()] ?? 0).toBe(0);
  });

  it("lifetime totals are never reset", () => {
    for (let i = 0; i < 40; i += 1) useNoorStore.getState().incQuickTasbeeh("subhanallah", 33);
    vi.setSystemTime(new Date(2026, 7, 24, 6, 0, 0));
    useNoorStore.getState().ensureDailyResets(FAJR);
    expect(useNoorStore.getState().tasbeehLifetime.subhanallah).toBe(40);
  });
});

describe("no score can be negative or NaN", () => {
  it("survives corrupt progress values", () => {
    useNoorStore.setState({ progress: { "morning:0": -5 as number, "junk:9": NaN as number } });
    const s = submitted();
    expect(Number.isFinite(s.global)).toBe(true);
    expect(s.global).toBeGreaterThanOrEqual(0);
  });
});
