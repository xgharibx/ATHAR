import { describe, expect, it } from "vitest";
import {
  SYNC_KINDS,
  bucketize,
  debucketize,
  emptyBuckets,
  kindForField,
  mergeDoc,
} from "@/lib/syncMerge";

const noBase = { remoteNewer: false, base: null };

describe("bucketize / debucketize", () => {
  it("routes fields to their documents", () => {
    const b = bucketize({ progress: { a: 1 }, favorites: { x: true }, prefs: { theme: "layl" } });
    expect(b.progress).toEqual({ progress: { a: 1 } });
    expect(b.favorites).toEqual({ favorites: { x: true } });
    expect(b.settings).toEqual({ prefs: { theme: "layl" } });
  });

  it("sends unknown fields to settings so a new field still syncs", () => {
    // Guards the trap where someone adds a field to exportState() and forgets
    // the FIELD_KIND map — it must degrade to syncing, never to silence.
    expect(kindForField("somethingInventedLater")).toBe("settings");
    expect(bucketize({ somethingInventedLater: 42 }).settings).toEqual({
      somethingInventedLater: 42,
    });
  });

  it("round-trips losslessly", () => {
    const blob = {
      progress: { "a:1": 3 },
      favorites: { f: true },
      quranStreak: 7,
      prefs: { theme: "ghaba" },
      customReminders: [{ id: "r1", at: "06:30" }],
    };
    expect(debucketize(bucketize(blob))).toEqual(blob);
  });

  it("drops undefined rather than writing nulls to the server", () => {
    expect(bucketize({ a: undefined, b: 1 }).settings).toEqual({ b: 1 });
  });

  it("covers every kind the database constraint allows", () => {
    expect(Object.keys(emptyBuckets()).sort()).toEqual([...SYNC_KINDS].sort());
  });
});

describe("first sign-in (no base) can never lose local data", () => {
  it("keeps local counters when the cloud is empty", () => {
    const local = { progress: { "morning:0": 5, "evening:2": 3 } };
    expect(mergeDoc(local, {}, noBase)).toEqual(local);
  });

  it("keeps local favourites when the cloud is empty", () => {
    const local = { favorites: { "a:1": true, "b:2": true } };
    expect(mergeDoc(local, {}, noBase)).toEqual(local);
  });

  it("unions two devices that have never met", () => {
    const local = { progress: { a: 10, b: 2 }, favorites: { x: true } };
    const remote = { progress: { a: 4, c: 7 }, favorites: { y: true } };
    expect(mergeDoc(local, remote, noBase)).toEqual({
      progress: { a: 10, b: 2, c: 7 },
      favorites: { x: true, y: true },
    });
  });

  it("never lets an empty cloud document blank a populated local one", () => {
    const local = { progress: { a: 9 }, favorites: { x: true }, quranStreak: 12 };
    const merged = mergeDoc(local, { progress: {}, favorites: {}, quranStreak: 0 }, noBase);
    expect(merged).toEqual(local);
  });

  it("takes the larger counter on a genuine conflict", () => {
    // 10 ayahs on the phone, 5 on the tablet — the phone's must survive.
    const merged = mergeDoc({ quranDailyAyahs: { "2026-08-02": 10 } }, { quranDailyAyahs: { "2026-08-02": 5 } }, noBase);
    expect(merged.quranDailyAyahs).toEqual({ "2026-08-02": 10 });
  });

  it("takes the larger streak", () => {
    expect(mergeDoc({ quranStreak: 3 }, { quranStreak: 11 }, noBase).quranStreak).toBe(11);
  });
});

describe("three-way merge propagates real changes", () => {
  it("accepts a remote edit this device has not made", () => {
    const base = { progress: { a: 5 } };
    const merged = mergeDoc({ progress: { a: 5 } }, { progress: { a: 9 } }, { remoteNewer: true, base });
    expect(merged.progress).toEqual({ a: 9 });
  });

  it("keeps a local edit the server has not seen", () => {
    const base = { progress: { a: 5 } };
    const merged = mergeDoc({ progress: { a: 9 } }, { progress: { a: 5 } }, { remoteNewer: false, base });
    expect(merged.progress).toEqual({ a: 9 });
  });

  it("takes the max when both sides advanced from the same base", () => {
    const base = { progress: { a: 5 } };
    const merged = mergeDoc({ progress: { a: 7 } }, { progress: { a: 12 } }, { remoteNewer: false, base });
    expect(merged.progress).toEqual({ a: 12 });
  });
});

describe("deletion", () => {
  it("un-favouriting propagates instead of resurrecting", () => {
    // The bug this whole `base` mechanism exists to prevent: without it, a
    // union merge re-adds the favourite the user just removed, forever.
    const base = { favorites: { x: true, y: true } };
    const merged = mergeDoc({ favorites: { y: true } }, { favorites: { x: true, y: true } }, {
      remoteNewer: true,
      base,
    });
    expect(merged.favorites).toEqual({ y: true });
  });

  it("an explicit false also removes it", () => {
    const base = { favorites: { x: true } };
    const merged = mergeDoc({ favorites: { x: false } }, { favorites: { x: true } }, {
      remoteNewer: false,
      base,
    });
    expect(merged.favorites).toEqual({ x: false });
  });

  it("does not resurrect pruned daily logs", () => {
    const base = { activity: { "2026-01-01": 4, "2026-08-01": 2 } };
    const merged = mergeDoc(
      { activity: { "2026-08-01": 2 } }, // local pruned the old day
      { activity: { "2026-01-01": 4, "2026-08-01": 2 } },
      { remoteNewer: true, base },
    );
    expect(merged.activity).toEqual({ "2026-08-01": 2 });
  });

  it("deleting a whole field removes it", () => {
    const base = { sebhaCustom: { phrase: "x", target: 100 } };
    const merged = mergeDoc({}, { sebhaCustom: { phrase: "x", target: 100 } }, {
      remoteNewer: true,
      base,
    });
    expect("sebhaCustom" in merged).toBe(false);
  });

  it("but a field absent from base is an addition, not a deletion", () => {
    const merged = mergeDoc({}, { quranStreak: 4 }, { remoteNewer: true, base: {} });
    expect(merged.quranStreak).toBe(4);
  });
});

describe("lists keyed by id", () => {
  it("unions custom reminders from two devices", () => {
    const merged = mergeDoc(
      { customReminders: [{ id: "a", label: "A" }] },
      { customReminders: [{ id: "b", label: "B" }] },
      noBase,
    );
    expect(merged.customReminders).toEqual([{ id: "a", label: "A" }, { id: "b", label: "B" }]);
  });

  it("keeps the newer edit of the same reminder", () => {
    const merged = mergeDoc(
      { customReminders: [{ id: "a", label: "old", updatedAt: 100 }] },
      { customReminders: [{ id: "a", label: "new", updatedAt: 200 }] },
      noBase,
    );
    expect(merged.customReminders).toEqual([{ id: "a", label: "new", updatedAt: 200 }]);
  });

  it("honours a deleted reminder", () => {
    const base = { customReminders: [{ id: "a" }, { id: "b" }] };
    const merged = mergeDoc(
      { customReminders: [{ id: "b" }] },
      { customReminders: [{ id: "a" }, { id: "b" }] },
      { remoteNewer: true, base },
    );
    expect(merged.customReminders).toEqual([{ id: "b" }]);
  });

  it("dedupes id-less items by content", () => {
    const s = { at: "2026-08-01T10:00:00Z", count: 33 };
    const merged = mergeDoc({ sebhaSessions: [s] }, { sebhaSessions: [{ ...s }] }, noBase);
    expect(merged.sebhaSessions).toHaveLength(1);
  });
});

describe("nested maps", () => {
  it("merges prayer log per day and per prayer", () => {
    const merged = mergeDoc(
      { prayerLog: { "2026-08-02": { fajr: true } } },
      { prayerLog: { "2026-08-02": { asr: true }, "2026-08-01": { fajr: true } } },
      noBase,
    );
    expect(merged.prayerLog).toEqual({
      "2026-08-02": { fajr: true, asr: true },
      "2026-08-01": { fajr: true },
    });
  });

  it("merges the tasbeeh daily log by max", () => {
    const merged = mergeDoc(
      { tasbeehDailyLog: { "2026-08-02": { subhanallah: 100 } } },
      { tasbeehDailyLog: { "2026-08-02": { subhanallah: 30, alhamdulillah: 10 } } },
      noBase,
    );
    expect(merged.tasbeehDailyLog).toEqual({
      "2026-08-02": { subhanallah: 100, alhamdulillah: 10 },
    });
  });

  it("unions section completion dates", () => {
    const merged = mergeDoc(
      { sectionCompletions: { morning: ["2026-08-01"] } },
      { sectionCompletions: { morning: ["2026-08-02"] } },
      noBase,
    );
    expect(merged.sectionCompletions).toEqual({ morning: ["2026-08-01", "2026-08-02"] });
  });
});

describe("plain settings", () => {
  it("prefers the newer writer on a real conflict", () => {
    const base = { prefs: { theme: "layl" } };
    const local = { prefs: { theme: "ghaba" } };
    const remote = { prefs: { theme: "faham" } };
    expect(mergeDoc(local, remote, { remoteNewer: true, base }).prefs).toEqual({ theme: "faham" });
    expect(mergeDoc(local, remote, { remoteNewer: false, base }).prefs).toEqual({ theme: "ghaba" });
  });

  it("is order-insensitive about object keys", () => {
    const local = { quranLastRead: { surahId: 2, ayahIndex: 5 } };
    const remote = { quranLastRead: { ayahIndex: 5, surahId: 2 } };
    expect(mergeDoc(local, remote, { remoteNewer: true, base: null }).quranLastRead).toEqual({
      surahId: 2,
      ayahIndex: 5,
    });
  });
});

describe("robustness against bad server payloads", () => {
  it("survives a counter map that arrives as the wrong type", () => {
    const merged = mergeDoc({ progress: { a: 3 } }, { progress: "corrupt" }, noBase);
    expect(merged.progress).toEqual({ a: 3 });
  });

  it("survives a list that arrives as an object", () => {
    const merged = mergeDoc({ customReminders: [{ id: "a" }] }, { customReminders: {} }, noBase);
    expect(merged.customReminders).toEqual([{ id: "a" }]);
  });

  it("survives null payloads", () => {
    expect(mergeDoc({ favorites: { x: true } }, { favorites: null }, noBase).favorites).toEqual({
      x: true,
    });
  });
});
