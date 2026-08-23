/**
 * Two devices signed into one account must report the SAME score, with no
 * duplicate rows.
 *
 * No duplicates is already structural: the leaderboard identity travels in the
 * account's sync document, so both devices post under one id. What was not
 * guaranteed is agreement — each device scores its own local `progress`, and
 * the server now takes the NEWEST submission, so a device that was just opened
 * could overwrite the other's newer score with its stale snapshot.
 */
import { describe, expect, it } from "vitest";
import { mergeDoc } from "@/lib/syncMerge";
import { buildLeaderboardScoreStats } from "@/lib/leaderboardScores";
import type { Section } from "@/data/types";

const sections = [
  { id: "morning", title: "ص", content: [{ text: "أ", count: 100 }, { text: "ب", count: 100 }] },
] as unknown as Section[];
const DAY = "2026-08-23";

const scoreOf = (progress: Record<string, number>, tasbeeh: number) =>
  buildLeaderboardScoreStats({
    sections, progress, quranAyahsToday: 0, prayersDone: {},
    quickTasbeeh: {}, tasbeehTodayTotal: tasbeeh, todayISO: DAY,
  });

describe("one account, two devices", () => {
  it("converges to one identity, so there is never a duplicate row", () => {
    const A = { leaderboardIdentity: { id: "anon_a", secret: "s", joinedAt: "2026-01-01" } };
    const B = { leaderboardIdentity: { id: "anon_b", secret: "s", joinedAt: "2026-05-01" } };
    const fromA = mergeDoc(A, B, { remoteNewer: true, base: null });
    const fromB = mergeDoc(B, A, { remoteNewer: true, base: null });
    expect(fromA.leaderboardIdentity).toEqual(fromB.leaderboardIdentity);
  });

  it("both devices compute the SAME score once progress has merged", () => {
    const phone = { progress: { "morning:0": 40 }, tasbeehDayTotals: { [DAY]: 120 } };
    const tablet = { progress: { "morning:1": 25 }, tasbeehDayTotals: { [DAY]: 60 } };

    const onPhone = mergeDoc(phone, tablet, { remoteNewer: true, base: null });
    const onTablet = mergeDoc(tablet, phone, { remoteNewer: true, base: null });
    expect(onPhone).toEqual(onTablet);

    const a = scoreOf(onPhone.progress as never, (onPhone.tasbeehDayTotals as never)[DAY]);
    const b = scoreOf(onTablet.progress as never, (onTablet.tasbeehDayTotals as never)[DAY]);
    expect(a.global).toBe(b.global);
  });

  it("work done on each device adds up rather than one replacing the other", () => {
    const phone = { progress: { "morning:0": 40 } };
    const tablet = { progress: { "morning:1": 25 } };
    const merged = mergeDoc(phone, tablet, { remoteNewer: true, base: null });
    expect(scoreOf(merged.progress as never, 0).dhikr).toBe(65);
  });

  it("does not double-count the same dhikr counted on both devices", () => {
    // Counters merge by max per key, not by sum — 30 taps of the same dhikr on
    // both devices is 30, not 60.
    const merged = mergeDoc(
      { progress: { "morning:0": 30 } },
      { progress: { "morning:0": 30 } },
      { remoteNewer: true, base: null },
    );
    expect(scoreOf(merged.progress as never, 0).dhikr).toBe(30);
  });

  it("the higher of two divergent counts survives", () => {
    const merged = mergeDoc(
      { progress: { "morning:0": 90 } },
      { progress: { "morning:0": 10 } },
      { remoteNewer: true, base: null },
    );
    expect(scoreOf(merged.progress as never, 0).dhikr).toBe(90);
  });

  it("tasbeeh totals for the day agree across devices", () => {
    const merged = mergeDoc(
      { tasbeehDayTotals: { [DAY]: 800 } },
      { tasbeehDayTotals: { [DAY]: 300 } },
      { remoteNewer: true, base: null },
    );
    expect((merged.tasbeehDayTotals as never)[DAY]).toBe(800);
  });
});
