import { describe, expect, it } from "vitest";
import { buildReview, type ReviewInput } from "@/lib/weeklyReview";
import { addDays } from "@/lib/qadaa";

const TODAY = "2026-10-17";
const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

function input(over: Partial<ReviewInput> = {}): ReviewInput {
  return {
    today: TODAY,
    prayerLog: {},
    quranDailyAyahs: {},
    quranDailyGoal: 10,
    sectionCompletions: {},
    wirdRate: () => null,
    muhasabaMean: () => null,
    qadaaDayTotals: {},
    ...over,
  };
}

const fullPrayers = (from: number, to: number) => {
  const log: Record<string, Record<string, boolean>> = {};
  for (let i = from; i <= to; i += 1) log[addDays(TODAY, -i)] = Object.fromEntries(PRAYERS.map((p) => [p, true]));
  return log;
};

describe("buildReview", () => {
  it("has nothing to say when nothing is tracked", () => {
    const r = buildReview(input());
    expect(r.consistency).toBeNull();
    expect(r.areas).toEqual([]);
    expect(r.lines).toEqual([]);
  });

  it("scores only the areas that have data", () => {
    const r = buildReview(input({ prayerLog: fullPrayers(0, 6) }));
    expect(r.areas.map((a) => a.id)).toEqual(["prayer"]);
    expect(r.consistency).toBe(1);
  });

  it("does not read two logged days as a week of missed prayers", () => {
    expect(buildReview(input({ prayerLog: fullPrayers(0, 0) })).areas).toEqual([]);
  });

  it("names the strongest and the weakest area", () => {
    const r = buildReview(input({ prayerLog: fullPrayers(0, 6), quranDailyAyahs: { [TODAY]: 2 } }));
    expect(r.strongest?.id).toBe("prayer");
    expect(r.weakest?.id).toBe("quran");
    expect(r.lines.some((l) => l.includes("الأحوج"))).toBe(true);
  });

  it("notices an improvement over the week before", () => {
    const r = buildReview(input({ prayerLog: { ...fullPrayers(0, 6), ...Object.fromEntries([7, 8].map((i) => [addDays(TODAY, -i), { Fajr: true }])) } }));
    expect(r.areas[0].delta).toBeGreaterThan(0.1);
    expect(r.lines[0]).toContain("أفضل");
  });

  it("notices a decline and speaks gently", () => {
    const r = buildReview(input({ prayerLog: { ...fullPrayers(7, 13), [TODAY]: { Fajr: true }, [addDays(TODAY, -1)]: { Fajr: true } } }));
    expect(r.lines[0]).toContain("أقلّ");
    expect(r.lines[0]).toContain("لا بأس");
  });

  it("uses wird and muhasaba when supplied, and reports qadaa made up", () => {
    const r = buildReview(input({ wirdRate: () => 0.5, muhasabaMean: () => 0.7, qadaaDayTotals: { [TODAY]: 3, [addDays(TODAY, -2)]: 2 } }));
    expect(r.areas.map((a) => a.id)).toEqual(["wird", "muhasaba"]);
    expect(r.consistency).toBeCloseTo(0.6);
    expect(r.qadaaMadeUp).toBe(5);
    expect(r.lines.some((l) => l.includes("٥"))).toBe(true);
  });

  it("finds the best day of the week", () => {
    const r = buildReview(input({ prayerLog: { [addDays(TODAY, -3)]: Object.fromEntries(PRAYERS.map((p) => [p, true])), [addDays(TODAY, -1)]: { Fajr: true } } }));
    expect(r.bestDay).toBe(addDays(TODAY, -3));
    expect(r.days).toHaveLength(7);
  });
});
