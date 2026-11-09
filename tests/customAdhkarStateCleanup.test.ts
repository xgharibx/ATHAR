// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import { buildLeaderboardScoreStats } from "@/lib/leaderboardScores";
import { createDhikrItemId } from "@/lib/dhikrItemIdentity";
import { useNoorStore } from "@/store/noorStore";

const pack = {
  id: "custom_trip",
  title: "أذكار السفر",
  createdAt: "2026-11-09T00:00:00.000Z",
  items: [
    { id: "item-a", text: "الأول", count: 10 },
    { id: "item-b", text: "المحذوف", count: 10 },
    { id: "item-c", text: "الأخير", count: 10 },
  ],
};
const otherPack = {
  id: "custom_trip_extra",
  title: "أذكار أخرى",
  createdAt: "2026-11-09T00:00:00.000Z",
  items: [{ id: "item-extra", text: "ذكر آخر", count: 100 }],
};

function currentCustomDhikrScore() {
  const state = useNoorStore.getState();
  return buildLeaderboardScoreStats({
    sections: [],
    customPacks: state.customPacks,
    progress: state.progress,
    quranAyahsToday: 0,
    prayersDone: {},
    quickTasbeeh: {},
    todayISO: "2026-11-09",
  }).global;
}

describe("custom adhkar state cleanup", () => {
  beforeEach(() => {
    useNoorStore.setState({
      customPacks: [pack, otherPack],
      progress: {
        "custom_trip:item:item-a": 2,
        "custom_trip:item:item-b": 4,
        "custom_trip:item:item-c": 6,
        "custom_trip:3": 50,
        "custom_trip_extra:item:item-extra": 80,
      },
      favorites: {
        "custom_trip:item:item-a": true,
        "custom_trip:item:item-b": true,
        "custom_trip:item:item-c": true,
        "custom_trip:3": true,
        "custom_trip_extra:item:item-extra": true,
      },
      migratedDhikrStateKeys: {},
      sectionItemOrder: { custom_trip: [2, 1, 0], custom_trip_extra: [0] },
      sectionResume: {
        custom_trip: { index: 2, dayKey: "2026-11-09" },
        custom_trip_extra: { index: 0, dayKey: "2026-11-09" },
      },
      sectionCompletions: {
        custom_trip: ["2026-11-08"],
        custom_trip_extra: ["2026-11-08"],
      },
    });
  });

  it("deletes only the chosen item's progress and favorite, without reattaching them", () => {
    useNoorStore.getState().removeCustomPackItem("custom_trip", 1);

    const state = useNoorStore.getState();
    expect(state.customPacks[0]?.items.map((item) => item.text)).toEqual(["الأول", "الأخير"]);
    expect(state.progress).toEqual({
      "custom_trip:item:item-a": 2,
      "custom_trip:item:item-c": 6,
      "custom_trip_extra:item:item-extra": 80,
    });
    expect(state.favorites).toEqual({
      "custom_trip:item:item-a": true,
      "custom_trip:item:item-c": true,
      "custom_trip_extra:item:item-extra": true,
    });
    expect(state.sectionItemOrder).toEqual({ custom_trip: [1, 0], custom_trip_extra: [0] });
    expect(state.sectionResume.custom_trip).toEqual({ index: 1, dayKey: "2026-11-09" });
    expect(currentCustomDhikrScore()).toBe(88);
  });

  it("deleting a whole custom pack removes its state without touching other packs", () => {
    useNoorStore.getState().deleteCustomPack("custom_trip");

    const state = useNoorStore.getState();
    expect(state.customPacks.map((customPack) => customPack.id)).toEqual(["custom_trip_extra"]);
    expect(state.progress).toEqual({ "custom_trip_extra:item:item-extra": 80 });
    expect(state.favorites).toEqual({ "custom_trip_extra:item:item-extra": true });
    expect(state.sectionItemOrder).toEqual({ custom_trip_extra: [0] });
    expect(state.sectionResume).toEqual({ custom_trip_extra: { index: 0, dayKey: "2026-11-09" } });
    expect(state.sectionCompletions).toEqual({ custom_trip_extra: ["2026-11-08"] });
    expect(currentCustomDhikrScore()).toBe(80);
  });

  it("migrates legacy index state once and refuses to attach a stale key to a shifted item", () => {
    useNoorStore.setState({
      progress: { "my_adhkar:0": 1, "my_adhkar:1": 2, "my_adhkar:2": 3 },
      favorites: { "my_adhkar:1": true, "my_adhkar:2": true },
      migratedDhikrStateKeys: {},
    });
    useNoorStore.getState().migrateDhikrItemState("my_adhkar", [
      { index: 0, itemId: "item-a" },
      { index: 1, itemId: "item-b" },
      { index: 2, itemId: "item-c" },
    ]);
    expect(useNoorStore.getState().progress).toEqual({
      "my_adhkar:item:item-a": 1,
      "my_adhkar:item:item-b": 2,
      "my_adhkar:item:item-c": 3,
    });

    // A delayed old-client update writes the former index for B after C has
    // shifted into that list position. It stays orphaned instead of becoming C.
    useNoorStore.setState({ progress: { ...useNoorStore.getState().progress, "my_adhkar:1": 7 } });
    useNoorStore.getState().migrateDhikrItemState("my_adhkar", [
      { index: 0, itemId: "item-a" },
      { index: 1, itemId: "item-c" },
    ]);

    const state = useNoorStore.getState();
    expect(state.progress["my_adhkar:item:item-c"]).toBe(3);
    expect(state.progress["my_adhkar:1"]).toBe(7);
    expect(state.migratedDhikrStateKeys["my_adhkar:1"]).toBe(true);
  });

  it("preserves old custom-pack counts and favorites during the v38 persisted-state upgrade", async () => {
    const migrate = useNoorStore.persist.getOptions().migrate!;
    const migrated = await migrate({
      customPacks: [{
        id: "custom_trip",
        title: "أذكار السفر",
        createdAt: "2026-11-09T00:00:00.000Z",
        items: [{ text: "الأول", count: 10 }, { text: "المحذوف", count: 10 }, { text: "الأخير", count: 10 }],
      }],
      progress: { "custom_trip:0": 1, "custom_trip:1": 2, "custom_trip:2": 3 },
      favorites: { "custom_trip:1": true },
    }, 37) as ReturnType<typeof useNoorStore.getState>;
    const migratedPack = migrated.customPacks[0]!;
    const migratedIds = migratedPack.items.map((item) => item.id);

    expect(migratedIds).toEqual([
      createDhikrItemId("custom_trip/custom", 0, "الأول"),
      createDhikrItemId("custom_trip/custom", 1, "المحذوف"),
      createDhikrItemId("custom_trip/custom", 2, "الأخير"),
    ]);
    expect(migrated.progress).toEqual({
      [`custom_trip:item:${encodeURIComponent(migratedIds[0]!)}`]: 1,
      [`custom_trip:item:${encodeURIComponent(migratedIds[1]!)}`]: 2,
      [`custom_trip:item:${encodeURIComponent(migratedIds[2]!)}`]: 3,
    });
    expect(migrated.favorites).toEqual({ [`custom_trip:item:${encodeURIComponent(migratedIds[1]!)}`]: true });
    expect(migrated.migratedDhikrStateKeys).toMatchObject({
      "custom_trip:0": true, "custom_trip:1": true, "custom_trip:2": true,
    });
  });
});
