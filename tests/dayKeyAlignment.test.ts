/**
 * @vitest-environment jsdom
 *
 * ONE ibaadah day key, used by both the writer and the reader.
 *
 * The store used to bucket counters by getIbadahDateKey(now, lastKnownFajrTime)
 * while the leaderboard bridge read them by getIbadahDateKey(now, livePrayer-
 * Times). Between midnight and Fajr, on a device whose cached Fajr was missing
 * or stale, those are DIFFERENT days — so every tasbeeh tap and every ayah read
 * in that window was written under one key and looked up under another, and
 * scored as zero.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNoorStore } from "@/store/noorStore";
import { getIbadahDateKey } from "@/lib/dayBoundaries";

const FAJR = "04:30";
/** What the bridge computes once prayer times are available. */
const bridgeKey = () => getIbadahDateKey(new Date(), FAJR);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 7, 23, 2, 0, 0)); // 02:00 — after midnight, before Fajr
  useNoorStore.setState({
    quickTasbeeh: {}, tasbeehDayTotals: {}, tasbeehLifetime: {}, tasbeehDailyLog: {},
    quranDailyAyahs: {}, activity: {}, asmaHusnaCounts: {}, progress: {},
    lastKnownFajrTime: null,
    lastIbadahResetISO: null,
    lastCivilResetISO: null,
    quranLastReadDate: null, quranStreak: 0,
  });
});
afterEach(() => vi.useRealTimers());

describe("tasbeeh taps land where the leaderboard looks", () => {
  it("counts taps made before Fajr once the Fajr time is known", () => {
    for (let i = 0; i < 40; i += 1) useNoorStore.getState().incQuickTasbeeh("subhanallah", 33);
    // Prayer times arrive; the day marker is corrected backwards.
    useNoorStore.getState().ensureDailyResets(FAJR);
    expect(useNoorStore.getState().tasbeehDayTotals[bridgeKey()]).toBe(40);
  });

  it("does not lose the taps to a reset when the day is merely relabelled", () => {
    for (let i = 0; i < 10; i += 1) useNoorStore.getState().incQuickTasbeeh("subhanallah", 33);
    const before = useNoorStore.getState().quickTasbeeh.subhanallah;
    useNoorStore.getState().ensureDailyResets(FAJR);
    // Relabelling is not a new day — the visible counter must survive.
    expect(useNoorStore.getState().quickTasbeeh.subhanallah).toBe(before);
  });

  it("keeps counting into the corrected key afterwards", () => {
    useNoorStore.getState().incQuickTasbeeh("subhanallah", 33);
    useNoorStore.getState().ensureDailyResets(FAJR);
    useNoorStore.setState({ lastKnownFajrTime: FAJR });
    for (let i = 0; i < 5; i += 1) useNoorStore.getState().incQuickTasbeeh("subhanallah", 33);
    expect(useNoorStore.getState().tasbeehDayTotals[bridgeKey()]).toBe(6);
  });
});

describe("quran ayahs land where the leaderboard looks", () => {
  it("counts ayahs read before Fajr once the Fajr time is known", () => {
    useNoorStore.getState().recordQuranRead(12);
    useNoorStore.getState().ensureDailyResets(FAJR);
    expect(useNoorStore.getState().quranDailyAyahs[bridgeKey()]).toBe(12);
  });
});

describe("a genuine new day still resets", () => {
  it("clears counters when the day moves FORWARD", () => {
    useNoorStore.setState({ lastKnownFajrTime: FAJR, lastIbadahResetISO: "2020-01-01" });
    useNoorStore.getState().incQuickTasbeeh("subhanallah", 33);
    useNoorStore.setState({ progress: { "morning:0": 5 }, lastIbadahResetISO: "2020-01-01" });
    useNoorStore.getState().ensureDailyResets(FAJR);
    expect(useNoorStore.getState().progress).toEqual({});
    expect(useNoorStore.getState().quickTasbeeh).toEqual({});
    expect(useNoorStore.getState().lastIbadahResetISO).toBe(bridgeKey());
  });
});
