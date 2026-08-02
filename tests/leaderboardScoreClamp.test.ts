import { describe, expect, it } from "vitest";
import { buildLeaderboardScoreStats } from "@/lib/leaderboardScores";
import type { Section } from "@/data/types";

const sections = [
  {
    id: "morning",
    title: "الصباح",
    content: [
      { text: "أ", count: 3 },
      { text: "ب", count: 1 },
    ],
  },
] as unknown as Section[];

function build(progress: Record<string, number>) {
  return buildLeaderboardScoreStats({
    sections,
    progress,
    quranAyahsToday: 0,
    prayersDone: {},
    quickTasbeeh: {},
    todayISO: "2026-08-02",
  });
}

describe("dhikr score", () => {
  it("matches the sum of its own sections", () => {
    const s = build({ "morning:0": 2, "morning:1": 1 });
    expect(s.dhikr).toBe(3);
    expect(s.sectionScores.morning).toBe(3);
  });

  it("clamps a counter that exceeds its target", () => {
    // Happens when a dhikr's `count` is lowered in a data update, or when
    // state arrives from an import. Before this, the global score could drift
    // above the sum of the very sections it is built from.
    const s = build({ "morning:0": 99, "morning:1": 1 });
    expect(s.sectionScores.morning).toBe(4); // 3 + 1, both clamped
    expect(s.dhikr).toBe(4);
  });

  it("still counts custom packs that have no section target", () => {
    const s = build({ "morning:0": 1, "my_adhkar:0": 7 });
    expect(s.dhikr).toBe(8);
  });

  it("floors negative counters at zero", () => {
    expect(build({ "morning:0": -5 }).dhikr).toBe(0);
  });

  it("ignores unparseable counters instead of producing NaN", () => {
    const s = build({ "morning:0": "x" as unknown as number, "my_adhkar:0": "y" as unknown as number });
    expect(Number.isFinite(s.dhikr)).toBe(true);
    expect(s.dhikr).toBe(0);
    expect(Number.isFinite(s.global)).toBe(true);
  });
});
