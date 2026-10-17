// @vitest-environment jsdom
/**
 * Qadaa as data: what is stored, how it is changed, and how it survives a trip
 * through persistence and the cloud.
 *
 * This is a record of someone's worship, so the failure modes that matter are
 * the quiet ones: a count that goes negative after an undo across midnight, a
 * hand-edited backup that smuggles in a nonsense key, and two devices that each
 * log prayers and end up with one device's total instead of both.
 */
// importState also restores the hadith store, which lives in IndexedDB.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { useNoorStore } from "@/store/noorStore";
import { bucketize, debucketize, kindForField, mergeDoc } from "@/lib/syncMerge";
import { getIbadahDateKey } from "@/lib/dayBoundaries";

const FAJR = "04:30";
const store = () => useNoorStore.getState();
const today = () => getIbadahDateKey(new Date(), FAJR);

beforeEach(() => {
  const day = today();
  useNoorStore.setState({
    qadaaOwed: {},
    qadaaDone: {},
    qadaaDayTotals: {},
    qadaaDayKinds: {},
    qadaaSettings: {},
    lastKnownFajrTime: FAJR,
    lastIbadahResetISO: day,
    lastCivilResetISO: day,
  });
});

describe("logging", () => {
  it("counts a prayer made up, and tallies it against today", () => {
    store().logQadaa("p:fajr");
    store().logQadaa("p:fajr", 3);
    expect(store().qadaaDone["p:fajr"]).toBe(4);
    expect(store().qadaaDayTotals[today()]).toBe(4);
  });

  it("logs a fast against its Ramadan", () => {
    store().logQadaa("f:1446", 2);
    expect(store().qadaaDone["f:1446"]).toBe(2);
  });

  it("logs a full day as one of each, in one step", () => {
    store().logQadaaBatch(["p:fajr", "p:dhuhr", "p:asr", "p:maghrib", "p:isha"]);
    expect(Object.keys(store().qadaaDone)).toHaveLength(5);
    expect(store().qadaaDayTotals[today()]).toBe(5);
  });

  it("refuses keys that are not a prayer or a Ramadan", () => {
    store().logQadaa("p:nonsense");
    store().logQadaa("__proto__");
    store().logQadaa("f:abc");
    store().logQadaa("");
    store().logQadaaBatch(["p:fajr", "p:nope"]);
    expect(store().qadaaDone).toEqual({ "p:fajr": 1 });
    expect(store().qadaaDayTotals[today()]).toBe(1);
  });

  it("refuses zero, negative, fractional-below-one and absurd amounts", () => {
    store().logQadaa("p:fajr", 0);
    store().logQadaa("p:fajr", -5);
    store().logQadaa("p:fajr", Number.NaN);
    expect(store().qadaaDone).toEqual({});
    store().logQadaa("p:fajr", 9_999_999);
    expect(store().qadaaDone["p:fajr"]).toBeLessThanOrEqual(1000);
  });
});

describe("what was made up today, prayer by prayer", () => {
  const dk = (key: string) => `${today()}|${key}`;

  it("records which prayer, so the page can show Fajr 0/1 and Dhuhr 1/1", () => {
    store().logQadaa("p:dhuhr");
    store().logQadaa("p:dhuhr");
    store().logQadaa("p:fajr");
    expect(store().qadaaDayKinds[dk("p:dhuhr")]).toBe(2);
    expect(store().qadaaDayKinds[dk("p:fajr")]).toBe(1);
    expect(store().qadaaDayKinds[dk("p:asr")]).toBeUndefined();
  });

  it("a full day records one of each", () => {
    store().logQadaaBatch(["p:fajr", "p:dhuhr", "p:asr"]);
    expect(store().qadaaDayKinds[dk("p:fajr")]).toBe(1);
    expect(store().qadaaDayKinds[dk("p:asr")]).toBe(1);
  });

  it("undo takes one off that prayer for today, and removes the entry at zero", () => {
    store().logQadaa("p:asr", 2);
    store().undoQadaa("p:asr");
    expect(store().qadaaDayKinds[dk("p:asr")]).toBe(1);
    store().undoQadaa("p:asr");
    expect(dk("p:asr") in store().qadaaDayKinds).toBe(false);
  });

  it("keeps the last few weeks and forgets older days, without touching today", () => {
    useNoorStore.setState({
      qadaaDayKinds: { "2020-01-01|p:fajr": 4, "2026-10-10|p:fajr": 2 },
    });
    store().logQadaa("p:isha");
    const kinds = store().qadaaDayKinds;
    expect(kinds["2020-01-01|p:fajr"]).toBeUndefined(); // years old: dropped
    expect(kinds[dk("p:isha")]).toBe(1); // today: kept
  });

  it("is not part of the long history, which keeps every day", () => {
    useNoorStore.setState({ qadaaDayTotals: { "2020-01-01": 5 } });
    store().logQadaa("p:isha");
    expect(store().qadaaDayTotals["2020-01-01"]).toBe(5);
  });

  it("cleans a backup of bad keys", () => {
    store().importState({
      ...store().exportState(),
      qadaaDayKinds: {
        [dk("p:fajr")]: 3,
        "garbage": 5,
        "2026-10-17|evil": 4,
        "not-a-date|p:fajr": 2,
        [dk("p:asr")]: -9,
      },
    } as never);
    expect(store().qadaaDayKinds).toEqual({ [dk("p:fajr")]: 3 });
  });

  it("adds across devices like the other counters", () => {
    const k = dk("p:fajr");
    const merged = mergeDoc(
      { qadaaDayKinds: { [k]: 3 } },
      { qadaaDayKinds: { [k]: 2 } },
      { remoteNewer: true, base: { qadaaDayKinds: { [k]: 1 } } },
    );
    expect((merged.qadaaDayKinds as Record<string, number>)[k]).toBe(4);
  });
});

describe("undo", () => {
  it("takes one off, and off today's tally", () => {
    store().logQadaa("p:asr", 2);
    store().undoQadaa("p:asr");
    expect(store().qadaaDone["p:asr"]).toBe(1);
    expect(store().qadaaDayTotals[today()]).toBe(1);
  });

  it("removes the entry when it reaches zero rather than leaving a zero", () => {
    store().logQadaa("p:asr");
    store().undoQadaa("p:asr");
    expect("p:asr" in store().qadaaDone).toBe(false);
    expect(today() in store().qadaaDayTotals).toBe(false);
  });

  it("does nothing when there is nothing to undo", () => {
    store().undoQadaa("p:asr");
    expect(store().qadaaDone).toEqual({});
  });

  it("never drives today's tally below zero when undoing something done on an earlier day", () => {
    // Done yesterday, undone today: the prayer count goes down, but today has
    // nothing logged to subtract from and must stay at zero, not -1.
    useNoorStore.setState({ qadaaDone: { "p:isha": 3 }, qadaaDayTotals: { "2020-01-01": 3 } });
    store().undoQadaa("p:isha");
    expect(store().qadaaDone["p:isha"]).toBe(2);
    expect(store().qadaaDayTotals[today()] ?? 0).toBe(0);
    expect(store().qadaaDayTotals["2020-01-01"]).toBe(3);
  });

  it("ignores a bad key", () => {
    useNoorStore.setState({ qadaaDone: { "p:fajr": 1 } });
    store().undoQadaa("p:bogus");
    expect(store().qadaaDone).toEqual({ "p:fajr": 1 });
  });
});

describe("what is owed", () => {
  it("sets only the keys it is given and leaves the rest", () => {
    store().setQadaaOwed({ "p:fajr": 100, "p:dhuhr": 100 });
    store().setQadaaOwed({ "p:fajr": 120 });
    expect(store().qadaaOwed).toEqual({ "p:fajr": 120, "p:dhuhr": 100 });
  });

  it("clears an entry set to zero", () => {
    store().setQadaaOwed({ "p:fajr": 100 });
    store().setQadaaOwed({ "p:fajr": 0 });
    expect(store().qadaaOwed).toEqual({});
  });

  it("drops unknown keys and bad values", () => {
    store().setQadaaOwed({ "p:fajr": -4, "x:y": 10, "p:asr": Number.NaN, "p:isha": 7.9 });
    expect(store().qadaaOwed).toEqual({ "p:isha": 7 });
  });

  it("caps an absurd number", () => {
    store().setQadaaOwed({ "p:fajr": 1e12 });
    expect(store().qadaaOwed["p:fajr"]).toBeLessThanOrEqual(1_000_000);
  });
});

describe("settings", () => {
  it("merges a patch into what is already there", () => {
    store().setQadaaSettings({ madhhab: "hanafi" });
    store().setQadaaSettings({ planMode: "daily", planPerDay: 2 });
    expect(store().qadaaSettings).toEqual({ madhhab: "hanafi", planMode: "daily", planPerDay: 2 });
  });

  it("rejects values outside what the app understands", () => {
    store().setQadaaSettings({
      madhhab: "klingon" as never,
      planMode: "forever" as never,
      planFinishBy: "tomorrow" as never,
      planPerDay: Number.NaN,
      mealCost: -9,
    });
    const s = store().qadaaSettings;
    expect(s.madhhab).toBeUndefined();
    expect(s.planMode).toBeUndefined();
    expect(s.planFinishBy).toBeUndefined();
    expect(s.planPerDay).toBeUndefined();
    expect(s.mealCost).toBe(0);
  });

  it("clamps the plan to sensible bounds", () => {
    store().setQadaaSettings({ planPerDay: 9999 });
    expect(store().qadaaSettings.planPerDay).toBe(100);
    store().setQadaaSettings({ planPerDay: 0 });
    expect(store().qadaaSettings.planPerDay).toBe(1);
  });

  it("accepts a real finish date and an explicit null", () => {
    store().setQadaaSettings({ planFinishBy: "2027-06-01" });
    expect(store().qadaaSettings.planFinishBy).toBe("2027-06-01");
    store().setQadaaSettings({ planFinishBy: null });
    expect(store().qadaaSettings.planFinishBy).toBeNull();
  });
});

describe("reset", () => {
  it("clears everything qadaa and nothing else", () => {
    useNoorStore.setState({ progress: { "morning:0": 4 } });
    store().setQadaaOwed({ "p:fajr": 10 });
    store().logQadaa("p:fajr");
    store().setQadaaSettings({ madhhab: "shafii" });
    store().resetQadaa();
    expect(store().qadaaOwed).toEqual({});
    expect(store().qadaaDone).toEqual({});
    expect(store().qadaaDayTotals).toEqual({});
    expect(store().qadaaDayKinds).toEqual({});
    expect(store().qadaaSettings).toEqual({});
    expect(store().progress["morning:0"]).toBe(4);
  });

  it("is not touched by the daily reset or by resetting the adhkar", () => {
    store().setQadaaOwed({ "p:fajr": 10 });
    store().logQadaa("p:fajr", 2);
    store().ensureDailyResets(FAJR);
    store().resetAdhkarProgress();
    expect(store().qadaaOwed["p:fajr"]).toBe(10);
    expect(store().qadaaDone["p:fajr"]).toBe(2);
  });
});

describe("persistence", () => {
  it("survives an export and an import", () => {
    store().setQadaaOwed({ "p:fajr": 50, "f:1446": 30 });
    store().logQadaa("p:fajr", 5);
    store().setQadaaSettings({ madhhab: "hanafi", includeWitr: true });
    const blob = store().exportState();

    useNoorStore.setState({ qadaaOwed: {}, qadaaDone: {}, qadaaDayTotals: {}, qadaaSettings: {} });
    store().importState(blob);

    expect(store().qadaaOwed).toEqual({ "p:fajr": 50, "f:1446": 30 });
    expect(store().qadaaDone["p:fajr"]).toBe(5);
    expect(store().qadaaSettings).toEqual({ madhhab: "hanafi", includeWitr: true });
  });

  it("cleans a hand-edited backup instead of trusting it", () => {
    const blob = store().exportState();
    store().importState({
      ...blob,
      qadaaOwed: { "p:fajr": 10, "evil": 99, "p:asr": -3 },
      qadaaDone: { "__proto__": 5, "p:fajr": "7" },
      qadaaSettings: { madhhab: "hanafi", extra: "ignored" },
    } as never);
    expect(store().qadaaOwed).toEqual({ "p:fajr": 10 });
    expect(store().qadaaDone).toEqual({ "p:fajr": 7 });
    expect(store().qadaaSettings).toEqual({ madhhab: "hanafi" });
  });

  it("accepts a backup from before qadaa existed", () => {
    const blob = { ...store().exportState() } as Record<string, unknown>;
    delete blob.qadaaOwed;
    delete blob.qadaaDone;
    delete blob.qadaaDayTotals;
    delete blob.qadaaSettings;
    store().importState(blob as never);
    expect(store().qadaaOwed).toEqual({});
    expect(store().qadaaSettings).toEqual({});
  });
});

describe("syncing between devices", () => {
  it("keeps all four fields in the progress document", () => {
    for (const f of ["qadaaOwed", "qadaaDone", "qadaaDayTotals", "qadaaDayKinds", "qadaaSettings"]) {
      expect(kindForField(f)).toBe("progress");
    }
    const b = bucketize({ qadaaDone: { "p:fajr": 1 }, qadaaSettings: { madhhab: "hanafi" } });
    expect(b.progress.qadaaDone).toEqual({ "p:fajr": 1 });
    expect(debucketize(b).qadaaSettings).toEqual({ madhhab: "hanafi" });
  });

  it("adds what two devices each made up, instead of keeping one total", () => {
    // Both started from 10. The phone made up 3 more, the tablet made up 2 more.
    // Five real prayers happened; keeping only the larger would erase two.
    const base = { qadaaDone: { "p:fajr": 10 } };
    const phone = { qadaaDone: { "p:fajr": 13 } };
    const tablet = { qadaaDone: { "p:fajr": 12 } };
    const merged = mergeDoc(phone, tablet, { remoteNewer: true, base });
    expect((merged.qadaaDone as Record<string, number>)["p:fajr"]).toBe(15);
  });

  it("adds the per-day tally the same way", () => {
    const day = "2026-10-17";
    const base = { qadaaDayTotals: { [day]: 4 } };
    const merged = mergeDoc(
      { qadaaDayTotals: { [day]: 6 } },
      { qadaaDayTotals: { [day]: 5 } },
      { remoteNewer: true, base },
    );
    expect((merged.qadaaDayTotals as Record<string, number>)[day]).toBe(7);
  });

  it("lets the latest edit of what is owed win, key by key", () => {
    const base = { qadaaOwed: { "p:fajr": 100, "p:dhuhr": 100 } };
    const merged = mergeDoc(
      { qadaaOwed: { "p:fajr": 100, "p:dhuhr": 100 } },
      { qadaaOwed: { "p:fajr": 150, "p:dhuhr": 100 } }, // corrected on the other device
      { remoteNewer: true, base },
    );
    expect((merged.qadaaOwed as Record<string, number>)["p:fajr"]).toBe(150);
  });

  it("never wipes local qadaa on a first sign-in to an empty cloud", () => {
    const merged = mergeDoc(
      { qadaaDone: { "p:fajr": 40 }, qadaaOwed: { "p:fajr": 200 } },
      {},
      { remoteNewer: false, base: null },
    );
    expect((merged.qadaaDone as Record<string, number>)["p:fajr"]).toBe(40);
    expect((merged.qadaaOwed as Record<string, number>)["p:fajr"]).toBe(200);
  });

  it("does not lose progress on a first sign-in where both sides already have some", () => {
    const merged = mergeDoc(
      { qadaaDone: { "p:fajr": 40 } },
      { qadaaDone: { "p:fajr": 25 } },
      { remoteNewer: true, base: null },
    );
    expect((merged.qadaaDone as Record<string, number>)["p:fajr"]).toBeGreaterThanOrEqual(40);
  });
});
