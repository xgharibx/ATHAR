import { describe, expect, it } from "vitest";
import { buildTafsirAyahEntries } from "@/lib/tafsirDisplay";

describe("Tafsir display ayah numbering", () => {
  it("omits the reserved zero slot and keeps commentary aligned with Quran ayah numbers", () => {
    expect(buildTafsirAyahEntries(["", "شرح الآية الأولى", "شرح الآية الثانية"])).toEqual([
      { ayahNumber: 1, text: "شرح الآية الأولى" },
      { ayahNumber: 2, text: "شرح الآية الثانية" },
    ]);
  });

  it("keeps the original ayah number when a commentary entry is empty", () => {
    expect(buildTafsirAyahEntries(["", "شرح الآية الأولى", "", "شرح الآية الرابعة"])).toEqual([
      { ayahNumber: 1, text: "شرح الآية الأولى" },
      { ayahNumber: 3, text: "شرح الآية الرابعة" },
    ]);
  });
});
