import { describe, expect, it } from "vitest";
import { deedsFor, DEEDS } from "@/data/muhasabaCatalog";
import { addDays } from "@/lib/qadaa";
import {
  appliesOn, dayScore, fraction, levelOf, logKey, nextRung, pruneLog, steadyDays, trendOf, weeklyScores, type MuhasabaLog,
} from "@/lib/muhasaba";

const END = "2026-10-17"; // a Saturday
const fajr = deedsFor("male").find((d) => d.id === "fajr")!;

function fill(deedId: string, from: number, to: number, level: number, log: MuhasabaLog = {}) {
  for (let i = from; i <= to; i += 1) log[logKey(addDays(END, -i), deedId)] = level;
  return log;
}

describe("catalog", () => {
  it("gives every deed at least two rungs and unique ids", () => {
    expect(new Set(DEEDS.map((d) => d.id)).size).toBe(DEEDS.length);
    for (const d of DEEDS) expect(d.levels.length).toBeGreaterThanOrEqual(2);
  });
  it("follows the Fajr ladder the owner described", () => {
    expect(fajr.levels.slice(0, 5)).toEqual([
      "أدّيتُها في وقتها", "في الجامع مع الجماعة", "دخلتُ المسجد قبل الإقامة", "في الصفوف الأولى", "في الصف الأول",
    ]);
    expect(fajr.levels.at(-1)).toBe("وقيام الليل قبلها");
  });
  it("gives women their own ladders and no congregation rungs, under the same ids", () => {
    const f = deedsFor("female").find((d) => d.id === "fajr")!;
    expect(f.levels).not.toContain("في الصف الأول");
    expect(f.id).toBe("fajr");
    expect(deedsFor("female").some((d) => d.id === "tahiyya")).toBe(false);
  });
});

describe("scoring", () => {
  it("reads 'not recorded' as different from 'missed'", () => {
    const log: MuhasabaLog = { [logKey(END, "fajr")]: 0 };
    expect(levelOf(log, END, "fajr")).toBe(0);
    expect(levelOf(log, END, "dhuhr")).toBeNull();
  });
  it("averages over recorded deeds only", () => {
    const deeds = deedsFor("male").filter((d) => d.id === "fajr" || d.id === "dhuhr");
    const log: MuhasabaLog = { [logKey(END, "fajr")]: fajr.levels.length }; // top rung, dhuhr unrecorded
    const s = dayScore(log, deeds, END);
    expect(s.score).toBe(1);
    expect(s.recorded).toBe(1);
    expect(s.asked).toBe(2);
  });
  it("only asks the Monday/Thursday fast on those days", () => {
    const fast = DEEDS.find((d) => d.id === "fast-mon-thu")!;
    expect(appliesOn(fast, "2026-10-19")).toBe(true); // Monday
    expect(appliesOn(fast, "2026-10-17")).toBe(false); // Saturday
  });
  it("clamps a rung into 0..1", () => {
    expect(fraction(fajr, 99)).toBe(1);
    expect(fraction(fajr, -4)).toBe(0);
  });
});

describe("trends", () => {
  it("flags a slip when the last week falls well below the weeks before", () => {
    const log = fill("fajr", 7, 27, 5);
    fill("fajr", 0, 6, 1, log);
    const t = trendOf(log, fajr, END);
    expect(t.status).toBe("slipping");
    expect(t.delta!).toBeLessThan(-0.15);
  });
  it("says unknown, not slipping, when there is too little data", () => {
    const t = trendOf(fill("fajr", 0, 1, 1), fajr, END);
    expect(t.status).toBe("unknown");
  });
  it("sees a steady climb as rising", () => {
    const log = fill("fajr", 7, 27, 2);
    fill("fajr", 0, 6, 6, log);
    expect(trendOf(log, fajr, END).status).toBe("rising");
  });
  it("counts consecutive recorded misses", () => {
    const log = fill("fajr", 3, 20, 3);
    fill("fajr", 0, 2, 0, log);
    expect(trendOf(log, fajr, END).missRun).toBe(3);
  });
  it("suggests the rung above the usual one, and nothing at the top", () => {
    expect(nextRung(fajr, 2)).toEqual({ index: 3, label: fajr.levels[2] });
    expect(nextRung(fajr, fajr.levels.length)).toBeNull();
  });
});

describe("rollups", () => {
  it("builds weekly scores oldest first", () => {
    const log = fill("fajr", 0, 6, fajr.levels.length);
    const w = weeklyScores(log, [fajr], END, 3);
    expect(w).toHaveLength(3);
    expect(w[2].score).toBe(1);
    expect(w[0].score).toBeNull();
  });
  it("keeps a run of steady days and does not break it for an unfilled today", () => {
    const log = fill("fajr", 1, 5, 1);
    expect(steadyDays(log, [fajr], END, ["fajr"])).toBe(5);
  });
  it("prunes entries older than the window", () => {
    const log: MuhasabaLog = { [logKey("2020-01-01", "fajr")]: 3, [logKey(END, "fajr")]: 2 };
    expect(Object.keys(pruneLog(log, END, 500))).toEqual([logKey(END, "fajr")]);
  });
});
