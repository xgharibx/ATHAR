import { describe, expect, it } from "vitest";
import { buildQadaaSummary, fullDayKeys } from "@/lib/qadaaSummary";

const TODAY = "2026-10-17";

const base = () => ({
  owed: {} as Record<string, number>,
  done: {} as Record<string, number>,
  dayTotals: {} as Record<string, number>,
  dayKinds: {} as Record<string, number>,
  settings: {},
  today: TODAY,
});

describe("buildQadaaSummary", () => {
  it("is unconfigured with nothing owed", () => {
    const s = buildQadaaSummary(base());
    expect(s.configured).toBe(false);
    expect(s.remainingTotal).toBe(0);
    expect(s.todayComplete).toBe(false);
  });

  it("counts remaining, percent and the per-fard quota", () => {
    const i = base();
    i.owed = { "p:fajr": 10, "p:dhuhr": 10, "p:asr": 10, "p:maghrib": 10, "p:isha": 10 };
    i.done = { "p:fajr": 5 };
    const s = buildQadaaSummary(i);
    expect(s.configured).toBe(true);
    expect(s.owedTotal).toBe(50);
    expect(s.remainingTotal).toBe(45);
    expect(s.percent).toBe(10);
    expect(s.quotaTotal).toBe(5);
    expect(s.quotaLeftTotal).toBe(5);
  });

  it("does not let today's own progress shrink today's quota", () => {
    const i = base();
    i.owed = { "p:fajr": 3, "p:dhuhr": 3 };
    i.done = { "p:fajr": 1 };
    i.dayKinds = { [`${TODAY}|p:fajr`]: 1 };
    const s = buildQadaaSummary(i);
    // one fajr was made up today, so the day asked for fajr + dhuhr and fajr is done
    expect(s.quotaTotal).toBe(2);
    expect(s.quotaLeft.fajr).toBe(0);
    expect(s.quotaLeft.dhuhr).toBe(1);
    expect(s.todayComplete).toBe(false);
  });

  it("marks the day complete once every asked prayer is made up", () => {
    const i = base();
    i.owed = { "p:fajr": 3, "p:dhuhr": 3 };
    i.done = { "p:fajr": 1, "p:dhuhr": 1 };
    i.dayKinds = { [`${TODAY}|p:fajr`]: 1, [`${TODAY}|p:dhuhr`]: 1 };
    expect(buildQadaaSummary(i).todayComplete).toBe(true);
  });

  it("ignores witr unless owed (non-Hanafi) and includes it for Hanafis", () => {
    const i = base();
    i.owed = { "p:fajr": 2, "p:witr": 4 };
    expect(buildQadaaSummary({ ...i, settings: { madhhab: "shafii" } }).remainingTotal).toBe(2);
    expect(buildQadaaSummary({ ...i, settings: { madhhab: "hanafi" } }).remainingTotal).toBe(6);
  });

  it("reports surplus as nafl rather than negative remaining", () => {
    const i = base();
    i.owed = { "p:fajr": 2 };
    i.done = { "p:fajr": 5 };
    const s = buildQadaaSummary(i);
    expect(s.remaining.fajr).toBe(0);
    expect(s.surplus.fajr).toBe(3);
    expect(s.percent).toBe(100);
  });

  it("lists fasting years and advises against the next Ramadan", () => {
    const i = base();
    i.owed = { "f:1446": 5, "f:1447": 3 };
    i.done = { "f:1446": 1 };
    const s = buildQadaaSummary(i);
    expect(s.configured).toBe(true);
    expect(s.fasts.map((f) => f.year)).toEqual([1446, 1447]);
    expect(s.fastRemaining).toBe(7);
    expect(s.fastAdvice.level).not.toBe("none");
  });

  it("builds a full day from the prayers still open", () => {
    const i = base();
    i.owed = { "p:fajr": 1, "p:asr": 2 };
    expect(fullDayKeys(buildQadaaSummary(i))).toEqual(["p:fajr", "p:asr"]);
  });
});
