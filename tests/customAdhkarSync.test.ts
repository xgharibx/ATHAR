import { describe, expect, it } from "vitest";
import { bucketize, debucketize, kindForField, mergeDoc } from "@/lib/syncMerge";

const noBase = { remoteNewer: false, base: null };
const pack = (id: string, sections: unknown[]) => ({ packId: id, name: "n", importedAt: "2026-08-01", sections });
const sec = (id: string, items: string[]) => ({ id, title: "t", content: items.map((text) => ({ text, count: 3 })) });
const texts = (out: unknown, packIdx = 0, secIdx = 0) =>
  ((out as Record<string, unknown>).dataPacks as never[])[packIdx]["sections"][secIdx]["content"].map((i: never) => i["text"]);

describe("custom adhkar reach a second device", () => {
  it("is carried by the sync at all", () => {
    // The whole bug: this lived in localStorage, outside exportState(), so it
    // was never in any synced document.
    expect(kindForField("dataPacks")).toBe("settings");
    expect(bucketize({ dataPacks: [pack("p", [])] }).settings.dataPacks).toBeTruthy();
  });

  it("a fresh device receives the packs", () => {
    const remote = { dataPacks: [pack("my_adhkar_pack", [sec("my_adhkar", ["ذكر أ"])])] };
    const merged = mergeDoc({ dataPacks: [] }, remote, noBase);
    expect(texts(merged)).toEqual(["ذكر أ"]);
  });

  it("keeps local packs when the cloud has none", () => {
    const local = { dataPacks: [pack("p1", [sec("s", ["ذكري"])])] };
    expect(mergeDoc(local, { dataPacks: [] }, noBase)).toEqual(local);
  });

  it("UNIONS adhkar both phones added to أذكاري", () => {
    // Both devices have a pack with the SAME id, so picking one side would
    // delete the other phone's adhkar outright.
    const a = { dataPacks: [pack("my_adhkar_pack", [sec("my_adhkar", ["ذكر من الهاتف", "مشترك"])])] };
    const b = { dataPacks: [pack("my_adhkar_pack", [sec("my_adhkar", ["مشترك", "ذكر من اللوح"])])] };
    const merged = mergeDoc(a, b, noBase);
    expect(texts(merged).sort()).toEqual(["ذكر من الهاتف", "ذكر من اللوح", "مشترك"].sort());
  });

  it("is symmetric so both devices converge", () => {
    const a = { dataPacks: [pack("my_adhkar_pack", [sec("my_adhkar", ["أ"])])] };
    const b = { dataPacks: [pack("my_adhkar_pack", [sec("my_adhkar", ["ب"])])] };
    expect(texts(mergeDoc(a, b, noBase)).sort()).toEqual(texts(mergeDoc(b, a, noBase)).sort());
  });

  it("unions whole categories from different devices", () => {
    const a = { dataPacks: [pack("p1", [sec("s1", ["أ"])])] };
    const b = { dataPacks: [pack("p2", [sec("s2", ["ب"])])] };
    const merged = mergeDoc(a, b, noBase) as Record<string, unknown>;
    expect((merged.dataPacks as never[]).map((p) => p["packId"]).sort()).toEqual(["p1", "p2"]);
  });

  it("merges a new section added on one device only", () => {
    const a = { dataPacks: [pack("p", [sec("s1", ["أ"])])] };
    const b = { dataPacks: [pack("p", [sec("s1", ["أ"]), sec("s2", ["ب"])])] };
    const merged = mergeDoc(a, b, noBase) as Record<string, unknown>;
    expect((merged.dataPacks as never[])[0]["sections"]).toHaveLength(2);
  });

  it("round-trips through bucketize", () => {
    const blob = { dataPacks: [pack("p", [sec("s", ["ذكر"])])] };
    expect(debucketize(bucketize(blob))).toEqual(blob);
  });

  it("survives a malformed remote payload", () => {
    const local = { dataPacks: [pack("p", [sec("s", ["ذكر"])])] };
    expect(mergeDoc(local, { dataPacks: "corrupt" }, noBase)).toEqual(local);
  });
});

describe("deleting a custom dhikr sticks", () => {
  const withItems = (...t: string[]) => ({ dataPacks: [pack("my_adhkar_pack", [sec("my_adhkar", t)])] });

  it("does not resurrect a dhikr deleted on this device", () => {
    // The reported bug: union-always meant the other device still had it, so
    // every sync restored it and the user could never get rid of it.
    const base = withItems("أ", "ب");
    const local = withItems("أ");            // user deleted "ب" here
    const remote = withItems("أ", "ب");      // other device hasn't heard yet
    expect(texts(mergeDoc(local, remote, { remoteNewer: true, base }))).toEqual(["أ"]);
  });

  it("accepts a deletion made on the other device", () => {
    const base = withItems("أ", "ب");
    expect(texts(mergeDoc(withItems("أ", "ب"), withItems("أ"), { remoteNewer: true, base }))).toEqual(["أ"]);
  });

  it("still adds a dhikr that was never in base", () => {
    const base = withItems("أ");
    const merged = mergeDoc(withItems("أ"), withItems("أ", "جديد"), { remoteNewer: true, base });
    expect(texts(merged).sort()).toEqual(["أ", "جديد"].sort());
  });

  it("handles a delete and an add at the same time", () => {
    const base = withItems("أ", "ب");
    const local = withItems("أ", "من الهاتف");   // deleted ب, added one
    const remote = withItems("أ", "ب");
    expect(texts(mergeDoc(local, remote, { remoteNewer: true, base })).sort())
      .toEqual(["أ", "من الهاتف"].sort());
  });

  it("deletes a whole custom category", () => {
    const base = { dataPacks: [pack("p1", [sec("s", ["أ"])]), pack("p2", [sec("s2", ["ب"])])] };
    const local = { dataPacks: [pack("p1", [sec("s", ["أ"])])] };
    const remote = base;
    const merged = mergeDoc(local, remote, { remoteNewer: true, base }) as Record<string, unknown>;
    expect((merged.dataPacks as never[]).map((p) => p["packId"])).toEqual(["p1"]);
  });

  it("deletes a section without touching its siblings", () => {
    const base = { dataPacks: [pack("p", [sec("s1", ["أ"]), sec("s2", ["ب"])])] };
    const local = { dataPacks: [pack("p", [sec("s1", ["أ"])])] };
    const merged = mergeDoc(local, base, { remoteNewer: true, base }) as Record<string, unknown>;
    expect(((merged.dataPacks as never[])[0]["sections"] as never[]).map((s) => s["id"])).toEqual(["s1"]);
  });

  it("with no base it still unions, so a first sign-in never deletes", () => {
    expect(texts(mergeDoc(withItems("أ"), withItems("ب"), noBase)).sort()).toEqual(["أ", "ب"].sort());
  });
});
