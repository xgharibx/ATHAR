// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import { loadPacks, removeCustomDhikrItem, savePacks, updateCustomDhikrItem } from "@/data/packs";

const firstPack = {
  packId: "pack-one",
  name: "الأول",
  importedAt: "2026-11-09T00:00:00.000Z",
  sections: [{ id: "morning", title: "الصباح", content: [{ id: "item-one", text: "الأول", count: 3 }] }],
};
const secondPack = {
  packId: "pack-two",
  name: "الثاني",
  importedAt: "2026-11-09T00:00:00.000Z",
  sections: [{ id: "morning", title: "الصباح", content: [{ id: "item-two", text: "الثاني", count: 5 }] }],
};

describe("custom pack item identity operations", () => {
  beforeEach(() => savePacks([firstPack, secondPack]));

  it("deletes the requested item from the right source pack", () => {
    expect(removeCustomDhikrItem("morning", 1, "item-two")).toBe(true);
    expect(loadPacks().map((pack) => pack.sections[0]?.content.map((item) => item.id))).toEqual([
      ["item-one"], [],
    ]);
  });

  it("edits by identity rather than applying a combined section index to the first pack", () => {
    expect(updateCustomDhikrItem("morning", 1, { text: "الثاني بعد التعديل", count: 7 }, "item-two")).toBe(true);
    const packs = loadPacks();
    expect(packs[0]?.sections[0]?.content[0]).toMatchObject({ id: "item-one", text: "الأول" });
    expect(packs[1]?.sections[0]?.content[0]).toMatchObject({ id: "item-two", text: "الثاني بعد التعديل", count: 7 });
  });
});
