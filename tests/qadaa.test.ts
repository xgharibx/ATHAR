/**
 * قضاء الفوائت — the arithmetic and the rules.
 *
 * A wrong number here is not a cosmetic bug: it tells someone how much of their
 * prayer they still owe. So these tests pin the behaviour the fatwas require
 * (lean towards more, order only while five or fewer, women's exemption) and the
 * edges where a counting tool quietly goes wrong (impossible dates, a start
 * date before puberty, an estimate that reaches past today).
 */
import { describe, expect, it } from "vitest";
import {
  CALENDAR_MARGIN_DAYS,
  DEFAULT_PLAN,
  addDays,
  daysBetween,
  dailyQuota,
  estimateFastDebt,
  estimatePrayerDebt,
  fastAdvice,
  fidyaApplies,
  fidyaTotal,
  finishDate,
  hijriMonthStartISO,
  lastNDays,
  nextRamadan,
  orderHint,
  paceFromHistory,
  parseISO,
  planDaysToFinish,
  prayerKey,
  fastKey,
  parseFastKey,
  parsePrayerKey,
  prayerOwedTotal,
  prayerRemaining,
  projectFinish,
  remainingOf,
  streak,
  surplusOf,
  toISO,
  witrIsOwed,
  type PrayerCounts,
} from "@/lib/qadaa";

const TODAY = "2026-10-17";

const counts = (o: Partial<PrayerCounts>): PrayerCounts => ({
  fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, witr: 0, ...o,
});

describe("dates", () => {
  it("rejects dates that are not real", () => {
    expect(parseISO("2026-02-31")).toBeNull();
    expect(parseISO("2026-13-01")).toBeNull();
    expect(parseISO("not a date")).toBeNull();
    expect(parseISO("")).toBeNull();
    expect(parseISO(null)).toBeNull();
    expect(parseISO("2024-02-29")).not.toBeNull(); // a real leap day
    expect(parseISO("2026-02-29")).toBeNull(); // not a leap year
  });

  it("counts whole days regardless of month length or time zone", () => {
    expect(daysBetween("2026-01-31", "2026-02-01")).toBe(1);
    expect(daysBetween("2026-10-17", "2026-10-17")).toBe(0);
    expect(daysBetween("2026-10-17", "2026-10-10")).toBe(-7);
    expect(daysBetween("2025-12-31", "2026-12-31")).toBe(365);
  });

  it("adds days across a month and a year", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("round-trips", () => {
    expect(toISO(parseISO("2026-10-17")!)).toBe("2026-10-17");
  });

  it("finds the start of Ramadan within a day of the real one", () => {
    // 1 Ramadan 1447 was sighted on 18/19 February 2026. The app's calendar is
    // arithmetic, measured at up to two days from a sighted one — which is why
    // fastAdvice carries CALENDAR_MARGIN_DAYS rather than trusting it exactly.
    const s = hijriMonthStartISO(1447, 9);
    expect(Math.abs(daysBetween("2026-02-18", s))).toBeLessThanOrEqual(CALENDAR_MARGIN_DAYS);
  });
});

describe("keys", () => {
  it("round-trips prayer and fast keys", () => {
    expect(parsePrayerKey(prayerKey("asr"))).toBe("asr");
    expect(parseFastKey(fastKey(1445))).toBe(1445);
  });

  it("refuses anything else", () => {
    expect(parsePrayerKey("p:nonsense")).toBeNull();
    expect(parsePrayerKey("f:1445")).toBeNull();
    expect(parseFastKey("f:abc")).toBeNull();
    expect(parseFastKey("p:fajr")).toBeNull();
  });
});

describe("estimating missed prayers", () => {
  const male = {
    gender: "male" as const,
    birthDate: "2000-01-01",
    bulughAge: 15,
    startedPrayingDate: "2020-01-01",
    today: TODAY,
  };

  it("counts from bulugh to the day prayer began", () => {
    const e = estimatePrayerDebt(male);
    expect(e.missedDays.likely).toBe(daysBetween(e.bulughDate, "2020-01-01"));
    // ~5.5 years of days, not zero and not the full 20
    expect(e.missedDays.likely).toBeGreaterThan(1800);
    expect(e.missedDays.likely).toBeLessThan(2200);
  });

  it("owes one of each prayer per missed day, and Witr only when asked", () => {
    const without = estimatePrayerDebt(male);
    expect(Object.keys(without.perPrayer).sort()).toEqual(["asr", "dhuhr", "fajr", "isha", "maghrib"]);
    expect(without.total.likely).toBe(without.missedDays.likely * 5);

    const withWitr = estimatePrayerDebt({ ...male, includeWitr: true });
    expect(Object.keys(withWitr.perPrayer)).toContain("witr");
    expect(withWitr.total.likely).toBe(withWitr.missedDays.likely * 6);
  });

  it("gives the same number three ways when the person is certain", () => {
    const e = estimatePrayerDebt({ ...male, certainty: "exact" });
    expect(e.missedDays.min).toBe(e.missedDays.likely);
    expect(e.missedDays.safe).toBe(e.missedDays.likely);
  });

  it("widens into a range when the person is unsure, and the safe end is the larger", () => {
    const e = estimatePrayerDebt({ ...male, certainty: "unsure" });
    expect(e.missedDays.min).toBeLessThan(e.missedDays.likely);
    expect(e.missedDays.safe).toBeGreaterThan(e.missedDays.likely);
    // Two years either way, give or take rounding.
    expect(e.missedDays.safe - e.missedDays.min).toBeGreaterThan(1400);
  });

  it("never orders the range the wrong way round", () => {
    for (const certainty of ["exact", "approx", "unsure"] as const) {
      for (const gender of ["male", "female"] as const) {
        const e = estimatePrayerDebt({ ...male, gender, certainty, births: 2 });
        expect(e.missedDays.min).toBeLessThanOrEqual(e.missedDays.likely);
        expect(e.missedDays.likely).toBeLessThanOrEqual(e.missedDays.safe);
        expect(e.total.min).toBeLessThanOrEqual(e.total.safe);
      }
    }
  });

  it("takes off the days of hayd for a woman, and not for a man", () => {
    const m = estimatePrayerDebt(male);
    const f = estimatePrayerDebt({ ...male, gender: "female", haydDays: 6 });
    expect(f.missedDays.likely).toBeLessThan(m.missedDays.likely);
    // 6 of every ~29.5 days
    const expectedExempt = (m.periodDays.likely / 29.530588) * 6;
    expect(Math.abs(f.exemptDays.likely - expectedExempt)).toBeLessThan(2);
    expect(m.exemptDays.likely).toBe(0);
  });

  it("takes off nifas for each birth", () => {
    const none = estimatePrayerDebt({ ...male, gender: "female", births: 0 });
    const three = estimatePrayerDebt({ ...male, gender: "female", births: 3, nifasDays: 40 });
    expect(none.missedDays.likely - three.missedDays.likely).toBeGreaterThanOrEqual(119);
    expect(none.missedDays.likely - three.missedDays.likely).toBeLessThanOrEqual(121);
  });

  it("counts only the part of the period that was not prayed", () => {
    const all = estimatePrayerDebt(male);
    const half = estimatePrayerDebt({ ...male, prayedFraction: 0.5 });
    expect(Math.abs(half.missedDays.likely - all.missedDays.likely / 2)).toBeLessThanOrEqual(1);
    expect(estimatePrayerDebt({ ...male, prayedFraction: 1 }).missedDays.likely).toBe(0);
  });

  it("owes nothing for someone who prayed from the day it became obligatory", () => {
    const e = estimatePrayerDebt({ ...male, startedPrayingDate: "2014-01-01" }); // before bulugh
    expect(e.missedDays.safe).toBe(0);
    expect(e.warnings.length).toBeGreaterThan(0);
  });

  it("does not let even the safe estimate reach past today", () => {
    const e = estimatePrayerDebt({
      ...male,
      startedPrayingDate: "2026-09-01",
      certainty: "unsure",
    });
    expect(e.missedDays.safe).toBeLessThanOrEqual(daysBetween(e.bulughDate, TODAY));
  });

  it("treats a start date in the future as today, and says so", () => {
    const e = estimatePrayerDebt({ ...male, startedPrayingDate: "2030-01-01" });
    expect(e.warnings.join(" ")).toContain("بعد اليوم");
    expect(e.missedDays.likely).toBe(daysBetween(e.bulughDate, TODAY));
  });

  it("answers an impossible date with zero and a reason, not NaN", () => {
    const a = estimatePrayerDebt({ ...male, birthDate: "2000-02-31" });
    expect(a.total.likely).toBe(0);
    expect(a.warnings.length).toBeGreaterThan(0);
    const b = estimatePrayerDebt({ ...male, startedPrayingDate: "garbage" });
    expect(b.total.likely).toBe(0);
    expect(Number.isNaN(b.missedDays.safe)).toBe(false);
  });

  it("clamps absurd inputs rather than producing nonsense", () => {
    const e = estimatePrayerDebt({ ...male, bulughAge: 999, haydDays: 999, prayedFraction: 9 });
    for (const v of [e.missedDays.min, e.missedDays.likely, e.missedDays.safe, e.total.likely]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("estimating missed fasts", () => {
  const base = {
    gender: "male" as const,
    birthDate: "2000-01-01",
    bulughAge: 15,
    startedFastingDate: "2020-01-01",
    today: TODAY,
  };

  it("lists each Ramadan between bulugh and the day fasting began", () => {
    const e = estimateFastDebt(base);
    expect(e.years.length).toBeGreaterThanOrEqual(5);
    expect(e.years.length).toBeLessThanOrEqual(7);
    for (const y of e.years) expect(y.year).toBeGreaterThan(1420);
    // consecutive years, none repeated
    const ys = e.years.map((y) => y.year);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    expect(new Set(ys).size).toBe(ys.length);
  });

  it("owes the whole month for someone who did not fast, 30 days at the likely end", () => {
    const e = estimateFastDebt(base);
    for (const y of e.years) {
      expect(y.days.likely).toBe(30);
      expect(y.days.min).toBeLessThanOrEqual(30);
    }
  });

  it("owes only the unfasted days for someone who fasted most of each Ramadan", () => {
    // A woman who fasted all but a six-day period.
    const e = estimateFastDebt({ ...base, gender: "female", fastedDaysPerRamadan: 24 });
    for (const y of e.years) expect(y.days.likely).toBe(6);
    expect(e.total.likely).toBe(e.years.length * 6);
  });

  it("owes nothing to someone who fasted every day", () => {
    const e = estimateFastDebt({ ...base, fastedDaysPerRamadan: 30 });
    expect(e.total.safe).toBe(0);
  });

  it("returns an empty ledger, with a reason, for a bad date", () => {
    const e = estimateFastDebt({ ...base, birthDate: "nope" });
    expect(e.years).toEqual([]);
    expect(e.warnings.length).toBeGreaterThan(0);
  });

  it("never lists a Ramadan that has not happened yet", () => {
    const e = estimateFastDebt({ ...base, startedFastingDate: "2030-01-01" });
    const upto = nextRamadan(TODAY).hijriYear;
    for (const y of e.years) expect(y.year).toBeLessThan(upto);
  });
});

describe("what remains", () => {
  const owed = { "p:fajr": 100, "p:dhuhr": 100, "p:witr": 50 };
  const done = { "p:fajr": 30, "p:dhuhr": 100, "p:witr": 10 };

  it("is owed minus done, never below zero", () => {
    expect(remainingOf(owed, done, "p:fajr")).toBe(70);
    expect(remainingOf(owed, done, "p:dhuhr")).toBe(0);
    expect(remainingOf(owed, done, "p:asr")).toBe(0);
    expect(remainingOf({ "p:asr": 5 }, { "p:asr": 9 }, "p:asr")).toBe(0);
  });

  it("counts extra as surplus (nafl), not as an error", () => {
    expect(surplusOf({ "p:asr": 5 }, { "p:asr": 9 }, "p:asr")).toBe(4);
    expect(surplusOf(owed, done, "p:fajr")).toBe(0);
  });

  it("ignores a stored Witr figure for a madhhab that does not owe it", () => {
    expect(prayerRemaining(owed, done, false).witr).toBe(0);
    expect(prayerRemaining(owed, done, true).witr).toBe(40);
    expect(prayerOwedTotal(owed, false)).toBe(200);
    expect(prayerOwedTotal(owed, true)).toBe(250);
  });

  it("knows which madhhab owes Witr", () => {
    expect(witrIsOwed("hanafi")).toBe(true);
    for (const m of ["maliki", "shafii", "hanbali"] as const) expect(witrIsOwed(m)).toBe(false);
    expect(witrIsOwed(null)).toBe(false);
  });

  it("tolerates fractions and junk from an older or hand-edited store", () => {
    expect(remainingOf({ "p:fajr": 10.9 }, { "p:fajr": 3.2 }, "p:fajr")).toBe(7);
  });
});

describe("today's quota", () => {
  const remaining = counts({ fajr: 100, dhuhr: 100, asr: 100, maghrib: 3, isha: 0 });

  it("is one with each fard by default — the method the fatwa calls easiest", () => {
    const q = dailyQuota(DEFAULT_PLAN, remaining, TODAY);
    expect(q).toEqual(counts({ fajr: 1, dhuhr: 1, asr: 1, maghrib: 1, isha: 0 }));
  });

  it("never asks for a prayer that is already finished", () => {
    expect(dailyQuota(DEFAULT_PLAN, remaining, TODAY).isha).toBe(0);
  });

  it("asks for N full days and never more than remains", () => {
    const q = dailyQuota({ mode: "daily", perDay: 5 }, remaining, TODAY);
    expect(q.fajr).toBe(5);
    expect(q.maghrib).toBe(3); // only 3 left
  });

  it("spreads the debt evenly to finish by a date", () => {
    // today + 9 = ten days including today → 100 / 10 = 10 each
    const q = dailyQuota({ mode: "byDate", finishBy: addDays(TODAY, 9) }, remaining, TODAY);
    expect(q.fajr).toBe(10);
    expect(q.maghrib).toBe(1); // ceil(3 / 10)
  });

  it("asks for everything today when the date is today or already past", () => {
    const q = dailyQuota({ mode: "byDate", finishBy: addDays(TODAY, -3) }, remaining, TODAY);
    expect(q.fajr).toBe(100);
  });

  it("falls back to one-per-fard when a date plan has no date", () => {
    const q = dailyQuota({ mode: "byDate", finishBy: null }, remaining, TODAY);
    expect(q.fajr).toBe(1);
  });
});

describe("how long the plan takes", () => {
  const remaining = counts({ fajr: 40, dhuhr: 25, asr: 25, maghrib: 25, isha: 25 });

  it("is set by the largest debt when praying one of each per day", () => {
    expect(planDaysToFinish(DEFAULT_PLAN, remaining, TODAY)).toBe(40);
    expect(finishDate(DEFAULT_PLAN, remaining, TODAY)).toBe(addDays(TODAY, 39));
  });

  it("shortens with more days a day", () => {
    expect(planDaysToFinish({ mode: "daily", perDay: 2 }, remaining, TODAY)).toBe(20);
  });

  it("is the number of days to the date when the date is the plan", () => {
    expect(planDaysToFinish({ mode: "byDate", finishBy: addDays(TODAY, 29) }, remaining, TODAY)).toBe(30);
  });

  it("is null when nothing remains", () => {
    expect(planDaysToFinish(DEFAULT_PLAN, counts({}), TODAY)).toBeNull();
    expect(finishDate(DEFAULT_PLAN, counts({}), TODAY)).toBeNull();
  });
});

describe("pace, projection and streak", () => {
  it("judges a new starter on the days they have actually had", () => {
    // Started three days ago and did 5, 5, 5 → 5 a day, not 15 over fourteen days.
    const t = {
      [addDays(TODAY, -2)]: 5,
      [addDays(TODAY, -1)]: 5,
      [TODAY]: 5,
    };
    expect(paceFromHistory(t, TODAY)).toBe(5);
  });

  it("counts a gap in the middle against the pace", () => {
    const t = { [addDays(TODAY, -3)]: 6, [TODAY]: 6 };
    // 12 prayers over four days
    expect(paceFromHistory(t, TODAY)).toBe(3);
  });

  it("is zero with no history, and projects nothing", () => {
    expect(paceFromHistory({}, TODAY)).toBe(0);
    expect(projectFinish(100, 0, TODAY)).toBeNull();
  });

  it("projects a finish date from the pace", () => {
    expect(projectFinish(100, 5, TODAY)).toBe(addDays(TODAY, 20));
    expect(projectFinish(101, 5, TODAY)).toBe(addDays(TODAY, 21)); // rounds up
  });

  it("says done when nothing remains", () => {
    expect(projectFinish(0, 0, TODAY)).toBe(TODAY);
  });

  it("builds the last n days oldest first", () => {
    const days = lastNDays({ [TODAY]: 4 }, TODAY, 3);
    expect(days.map((d) => d.iso)).toEqual([addDays(TODAY, -2), addDays(TODAY, -1), TODAY]);
    expect(days.map((d) => d.count)).toEqual([0, 0, 4]);
  });

  it("counts consecutive days, and does not break a streak because today is not done yet", () => {
    const t = { [addDays(TODAY, -1)]: 1, [addDays(TODAY, -2)]: 1, [addDays(TODAY, -3)]: 1 };
    expect(streak(t, TODAY)).toBe(3);
    expect(streak({ ...t, [TODAY]: 2 }, TODAY)).toBe(4);
  });

  it("stops at the first missed day", () => {
    const t = { [TODAY]: 1, [addDays(TODAY, -1)]: 1, [addDays(TODAY, -3)]: 1 };
    expect(streak(t, TODAY)).toBe(2);
    expect(streak({}, TODAY)).toBe(0);
  });
});

describe("the order of making up", () => {
  it("applies while five or fewer remain, in the canonical order", () => {
    expect(orderHint(counts({ isha: 1, fajr: 1, asr: 2 }))).toEqual(["fajr", "asr", "asr", "isha"]);
  });

  it("stops applying beyond five — the ruling is that it falls away", () => {
    expect(orderHint(counts({ fajr: 3, dhuhr: 3 }))).toBeNull();
  });

  it("has nothing to say when nothing remains", () => {
    expect(orderHint(counts({}))).toBeNull();
  });

  it("applies at exactly five", () => {
    expect(orderHint(counts({ fajr: 1, dhuhr: 1, asr: 1, maghrib: 1, isha: 1 }))).toHaveLength(5);
  });
});

describe("the clock to the next Ramadan", () => {
  it("finds the coming Ramadan from a month that is not Ramadan", () => {
    const n = nextRamadan(TODAY);
    expect(n.inRamadan).toBe(false);
    expect(n.hijriYear).toBe(1448);
    expect(n.daysUntil).toBeGreaterThan(90);
    expect(n.daysUntil).toBeLessThan(140);
    expect(n.startISO).toBe(hijriMonthStartISO(1448, 9));
  });

  it("points at NEXT year's Ramadan while this one is running", () => {
    const n = nextRamadan("2026-03-01"); // inside Ramadan 1447
    expect(n.inRamadan).toBe(true);
    expect(n.hijriYear).toBe(1448);
  });

  it("is never negative", () => {
    expect(nextRamadan("2026-09-30").daysUntil).toBeGreaterThanOrEqual(0);
  });
});

describe("advice about owed fasts", () => {
  it("says nothing when nothing is owed", () => {
    expect(fastAdvice(0, TODAY, "shafii").level).toBe("none");
  });

  it("is comfortable with months to spare", () => {
    expect(fastAdvice(5, TODAY, "shafii").level).toBe("comfortable");
  });

  it("tells you to start when the time is getting short", () => {
    const left = nextRamadan(TODAY).daysUntil;
    expect(fastAdvice(left - 30, TODAY, "shafii").level).toBe("start");
  });

  it("is urgent with under two weeks to spare", () => {
    const left = nextRamadan(TODAY).daysUntil;
    expect(fastAdvice(left - 5, TODAY, "shafii").level).toBe("urgent");
  });

  it("says it cannot be finished when there are more fasts than days", () => {
    const left = nextRamadan(TODAY).daysUntil;
    const a = fastAdvice(left + 10, TODAY, "shafii");
    expect(a.level).toBe("cannot");
    expect(a.spare).toBe(-10 - CALENDAR_MARGIN_DAYS);
  });

  it("never promises more time than the calendar's own error allows", () => {
    // Exactly as many fasts as days until Ramadan looks feasible on paper, but
    // the calendar may be two days generous — so it must not read as comfortable.
    const left = nextRamadan(TODAY).daysUntil;
    const a = fastAdvice(left, TODAY, "shafii");
    expect(a.spare).toBe(-CALENDAR_MARGIN_DAYS);
    expect(a.level).toBe("cannot");
  });

  it("applies the fidya rule by madhhab — not for the Hanafis, yes for the majority", () => {
    expect(fidyaApplies("hanafi")).toBe(false);
    for (const m of ["maliki", "shafii", "hanbali"] as const) expect(fidyaApplies(m)).toBe(true);
    expect(fidyaApplies(null)).toBe(false);
    expect(fastAdvice(5, TODAY, "hanafi").fidyaIfDelayed).toBe(false);
    expect(fastAdvice(5, TODAY, "shafii").fidyaIfDelayed).toBe(true);
  });

  it("totals the cost of feeding one poor person per day", () => {
    expect(fidyaTotal(10, 25)).toBe(250);
    expect(fidyaTotal(10, -5)).toBe(0);
    expect(fidyaTotal(-3, 25)).toBe(0);
    expect(fidyaTotal(10, Number.NaN)).toBe(0);
  });
});
