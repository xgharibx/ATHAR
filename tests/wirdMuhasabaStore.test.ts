// @vitest-environment jsdom
/**
 * The wird and muhasaba tables as stored data: how they change, what a hostile
 * import cannot smuggle in, and how two devices combine.
 */
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { useNoorStore } from "@/store/noorStore";
import { bucketize, kindForField, mergeDoc } from "@/lib/syncMerge";
import { getIbadahDateKey } from "@/lib/dayBoundaries";
import type { WirdItem } from "@/lib/wird";

const FAJR = "04:30";
const store = () => useNoorStore.getState();
const today = () => getIbadahDateKey(new Date(), FAJR);
const item = (over: Partial<WirdItem> = {}): WirdItem => ({
  id: "w1", title: "ورد القرآن", kind: "quran", unit: "وجه", target: 5, slot: "fajr", days: [], createdISO: "2026-01-01", auto: null, ...over,
});

beforeEach(() => {
  const day = today();
  useNoorStore.setState({
    muhasabaLog: {}, muhasabaGender: null, muhasabaHidden: {}, wirdItems: {}, wirdLog: {},
    lastKnownFajrTime: FAJR, lastIbadahResetISO: day, lastCivilResetISO: day,
  });
});

describe("muhasaba log", () => {
  it("records a rung, a miss (0) and clears with null", () => {
    store().setMuhasaba("2026-10-17", "fajr", 3);
    store().setMuhasaba("2026-10-17", "dhuhr", 0);
    expect(store().muhasabaLog).toEqual({ "2026-10-17|fajr": 3, "2026-10-17|dhuhr": 0 });
    store().setMuhasaba("2026-10-17", "fajr", null);
    expect(store().muhasabaLog).toEqual({ "2026-10-17|dhuhr": 0 });
  });
  it("refuses a malformed day or deed id", () => {
    store().setMuhasaba("tomorrow", "fajr", 1);
    store().setMuhasaba("2026-10-17", "bad id!", 1);
    expect(store().muhasabaLog).toEqual({});
  });
  it("toggles a deed hidden and back", () => {
    store().toggleMuhasabaHidden("kahf");
    expect(store().muhasabaHidden).toEqual({ kahf: true });
    store().toggleMuhasabaHidden("kahf");
    expect(store().muhasabaHidden).toEqual({});
  });
  it("drops hostile entries on import", async () => {
    await store().importState({
      ...store().exportState(),
      muhasabaLog: { "2026-10-17|fajr": 3, "x|fajr": 2, "2026-10-17|e v i l": 1, "2026-10-17|asr": -4, "2026-10-17|isha": 999 },
      muhasabaGender: "robot",
      muhasabaHidden: { kahf: true, "bad id": true, dhuhr: "yes" },
    } as never);
    expect(store().muhasabaLog).toEqual({ "2026-10-17|fajr": 3 });
    expect(store().muhasabaGender).toBeNull();
    expect(store().muhasabaHidden).toEqual({ kahf: true });
  });
});

describe("wird items and counts", () => {
  it("adds, counts, never goes below zero, and removes an item with its history", () => {
    store().upsertWirdItem(item());
    store().adjustWird("w1", 3);
    store().adjustWird("w1", 4);
    const key = `${today()}|w1`;
    expect(store().wirdLog[key]).toBe(7);
    store().adjustWird("w1", -50);
    expect(store().wirdLog[key]).toBeUndefined();
    store().adjustWird("w1", 2);
    store().removeWirdItem("w1");
    expect(store().wirdItems).toEqual({});
    expect(store().wirdLog).toEqual({});
  });
  it("ignores counts for an item that does not exist", () => {
    store().adjustWird("ghost", 5);
    expect(store().wirdLog).toEqual({});
  });
  it("sanitises what it is given", () => {
    store().upsertWirdItem(item({ id: "a-1", title: "  x  ", target: -9 }));
    expect(store().wirdItems["a-1"]).toMatchObject({ title: "x", target: 1 });
    store().upsertWirdItem({ id: "bad id", title: "no" } as never);
    expect(Object.keys(store().wirdItems)).toEqual(["a-1"]);
  });
  it("survives a trip through export and import", async () => {
    store().upsertWirdItem(item());
    store().adjustWird("w1", 2, "2026-10-16");
    store().setMuhasaba("2026-10-16", "fajr", 4);
    store().setMuhasabaGender("female");
    const blob = JSON.parse(JSON.stringify(store().exportState()));
    useNoorStore.setState({ muhasabaLog: {}, muhasabaGender: null, wirdItems: {}, wirdLog: {} });
    await store().importState(blob);
    expect(store().wirdItems.w1.title).toBe("ورد القرآن");
    expect(store().wirdLog["2026-10-16|w1"]).toBe(2);
    expect(store().muhasabaLog["2026-10-16|fajr"]).toBe(4);
    expect(store().muhasabaGender).toBe("female");
  });
});

describe("syncing", () => {
  it("files the fields where the merge rules expect them", () => {
    for (const f of ["muhasabaLog", "wirdItems", "wirdLog"]) expect(kindForField(f)).toBe("progress");
    const b = bucketize({ wirdLog: { "2026-10-17|w1": 1 }, muhasabaHidden: { kahf: true } });
    expect(b.progress.wirdLog).toEqual({ "2026-10-17|w1": 1 });
  });
  it("adds wird counts made on two devices", () => {
    const k = "2026-10-17|w1";
    const merged = mergeDoc({ wirdLog: { [k]: 7 } }, { wirdLog: { [k]: 5 } }, { remoteNewer: true, base: { wirdLog: { [k]: 3 } } });
    expect((merged.wirdLog as Record<string, number>)[k]).toBe(9); // 3 + 4 + 2
  });
  it("keeps entries recorded on different devices for different deeds", () => {
    const merged = mergeDoc(
      { muhasabaLog: { "2026-10-17|fajr": 3 } },
      { muhasabaLog: { "2026-10-17|asr": 2 } },
      { remoteNewer: true, base: { muhasabaLog: {} } },
    );
    expect(merged.muhasabaLog).toEqual({ "2026-10-17|fajr": 3, "2026-10-17|asr": 2 });
  });
  it("keeps a wird item added on another device", () => {
    const merged = mergeDoc({ wirdItems: {} }, { wirdItems: { w2: item({ id: "w2" }) } }, { remoteNewer: true, base: { wirdItems: {} } });
    expect(Object.keys(merged.wirdItems as object)).toEqual(["w2"]);
  });
});
