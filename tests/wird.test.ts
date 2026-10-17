import { describe, expect, it } from "vitest";
import {
  TEMPLATES, completionRate, countOn, dueOn, isDue, sanitizeItem, sanitizeLog, streak, weekRow, wirdKey, type WirdItem, type WirdLog,
} from "@/lib/wird";

const END = "2026-10-17";
const item = (over: Partial<WirdItem> = {}): WirdItem => ({
  id: "w1", title: "ورد", kind: "quran", unit: "وجه", target: 5, slot: "fajr", days: [], createdISO: "2026-09-01", auto: null, ...over,
});

describe("due days", () => {
  it("is due only on its weekdays and after it was created", () => {
    const monThu = item({ days: [1, 4] });
    expect(isDue(monThu, "2026-10-19")).toBe(true); // Monday
    expect(isDue(monThu, "2026-10-17")).toBe(false);
    expect(isDue(item({ createdISO: "2026-10-18" }), END)).toBe(false);
  });
  it("orders a day's list by time slot", () => {
    const a = item({ id: "a", title: "ب", slot: "night" });
    const b = item({ id: "b", title: "أ", slot: "fajr" });
    expect(dueOn([a, b], END).map((i) => i.id)).toEqual(["b", "a"]);
  });
});

describe("progress", () => {
  it("takes the larger of the manual count and what the app already tracked", () => {
    const it1 = item({ auto: "quranAyahs", target: 10 });
    const log: WirdLog = { [wirdKey(END, "w1")]: 3 };
    expect(countOn(log, it1, END, () => 7)).toBe(7);
    expect(countOn(log, it1, END, () => 1)).toBe(3);
  });
  it("builds a seven-day row with the target met flagged", () => {
    const log: WirdLog = { [wirdKey(END, "w1")]: 5, [wirdKey("2026-10-16", "w1")]: 2 };
    const row = weekRow(log, item(), END);
    expect(row).toHaveLength(7);
    expect(row[6].done).toBe(true);
    expect(row[5].done).toBe(false);
    expect(row[5].ratio).toBeCloseTo(0.4);
  });
  it("counts a streak of met due days and does not break on an unfilled today", () => {
    const log: WirdLog = {};
    for (const d of ["2026-10-16", "2026-10-15", "2026-10-14"]) log[wirdKey(d, "w1")] = 5;
    expect(streak(log, item(), END)).toBe(3);
    log[wirdKey(END, "w1")] = 5;
    expect(streak(log, item(), END)).toBe(4);
  });
  it("skips days the item is not due when counting a streak", () => {
    const monThu = item({ days: [1, 4] });
    const log: WirdLog = { [wirdKey("2026-10-15", "w1")]: 5, [wirdKey("2026-10-12", "w1")]: 5 }; // Thu, Mon
    expect(streak(log, monThu, END)).toBe(2);
  });
  it("gives a completion rate, ignoring an unfinished today", () => {
    const log: WirdLog = { [wirdKey("2026-10-16", "w1")]: 5 };
    expect(completionRate(log, [item()], END, 2)).toBe(1);
    expect(completionRate({}, [], END, 7)).toBeNull();
  });
});

describe("sanitising", () => {
  it("rejects junk and bounds the rest", () => {
    expect(sanitizeItem(null)).toBeNull();
    expect(sanitizeItem({ id: "bad id!", title: "x" })).toBeNull();
    const ok = sanitizeItem({ id: "a-1", title: "  ورد  ", kind: "nope", slot: "nope", target: -3, days: [1, 1, 9, "x"], auto: "bogus" })!;
    expect(ok).toMatchObject({ title: "ورد", kind: "task", slot: "any", target: 1, days: [1], auto: null });
  });
  it("treats all seven weekdays as every day", () => {
    expect(sanitizeItem({ id: "a", title: "t", days: [0, 1, 2, 3, 4, 5, 6] })!.days).toEqual([]);
  });
  it("keeps only well-formed log entries", () => {
    expect(sanitizeLog({ "2026-10-17|w1": 4, "bad|w1": 2, "2026-10-17|w1!": 3, "2026-10-17|w2": -1 })).toEqual({ "2026-10-17|w1": 4 });
  });
  it("ships templates that survive their own sanitiser", () => {
    for (const t of TEMPLATES) for (const i of t.items) expect(sanitizeItem({ ...i, id: "t1", createdISO: "2026-10-17" })).not.toBeNull();
  });
});
