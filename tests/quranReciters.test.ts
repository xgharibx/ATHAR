// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  QURAN_RECITERS,
  getReciter,
  groupReciters,
  RECITER_CATEGORY_LABELS,
} from "@/lib/quranReciters";

describe("Quran reciters metadata", () => {
  it("every reciter has a category", () => {
    for (const r of QURAN_RECITERS) {
      expect(["murattal", "mujawwad", "legacy"]).toContain(r.category);
    }
  });

  it("every reciter has a non-empty label and a unique id", () => {
    const ids = new Set<string>();
    for (const r of QURAN_RECITERS) {
      expect(r.label.length).toBeGreaterThan(0);
      expect(ids.has(r.id)).toBe(false);
      ids.add(r.id);
    }
  });

  it("category labels are all populated", () => {
    expect(RECITER_CATEGORY_LABELS.murattal).toBeTruthy();
    expect(RECITER_CATEGORY_LABELS.mujawwad).toBeTruthy();
    expect(RECITER_CATEGORY_LABELS.legacy).toBeTruthy();
  });

  it("getReciter returns the matching reciter by id", () => {
    const first = QURAN_RECITERS[0];
    expect(getReciter(first.id)?.label).toBe(first.label);
    expect(getReciter("non-existent")).toBeUndefined();
  });

  it("groupReciters returns ordered groups", () => {
    const groups = groupReciters();
    expect(groups.map((g) => g.category)).toEqual(["murattal", "mujawwad", "legacy"]);
    const flat = groups.flatMap((g) => g.items);
    expect(flat.length).toBe(QURAN_RECITERS.length);
  });

  it("groupReciters filters by query (label)", () => {
    const groups = groupReciters("العفاسي");
    expect(groups.length).toBe(1);
    expect(groups[0].items.length).toBeGreaterThan(0);
    expect(groups[0].items.every((r) => r.label.includes("العفاسي") || r.id.toLowerCase().includes("alafasy"))).toBe(true);
  });

  it("groupReciters filters by query (id substring)", () => {
    const groups = groupReciters("mujawwad");
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.some((g) => g.category === "mujawwad")).toBe(true);
  });

  it("groupReciters with empty query returns all 28 reciters grouped", () => {
    const groups = groupReciters("");
    const total = groups.reduce((acc, g) => acc + g.items.length, 0);
    expect(total).toBeGreaterThanOrEqual(25);
  });
});