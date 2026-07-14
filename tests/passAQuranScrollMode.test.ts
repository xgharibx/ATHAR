// @vitest-environment node
/**
 * Pass A — `prefs.quranScrollMode` flips Mushaf's page rendering from
 * "one page at a time" to "continuous flow". The page itself still
 * stores the user's page index; the *visible* items are aggregated from
 * `currentPage` and the next few pages when scroll mode is on. This
 * suite pins the aggregation invariants.
 */
import { describe, expect, it } from "vitest";

type Item = { surahId: number; originalAyah: number };

/** Mirrors the logic in Mushaf.tsx that builds the multi-page flow. */
function buildScrollFlow(
  pageIndex: Map<number, Item[]>,
  currentPage: number,
  totalPages: number,
  trailingPages = 3,
): Item[] {
  const seen = new Set<string>();
  const collected: Item[] = [];
  for (let p = currentPage; p < currentPage + trailingPages && p <= totalPages; p++) {
    const items = pageIndex.get(p) ?? [];
    for (const it of items) {
      const k = `${it.surahId}:${it.originalAyah}`;
      if (seen.has(k)) continue;
      seen.add(k);
      collected.push(it);
    }
  }
  return collected;
}

describe("quranScrollMode aggregation logic (Pass A)", () => {
  const pageIndex = new Map<number, Item[]>([
    [1, [{ surahId: 1, originalAyah: 1 }, { surahId: 1, originalAyah: 2 }]],
    [2, [{ surahId: 1, originalAyah: 3 }, { surahId: 1, originalAyah: 4 }]],
    [3, [{ surahId: 1, originalAyah: 5 }, { surahId: 1, originalAyah: 6 }]],
    [4, [{ surahId: 1, originalAyah: 7 }]],
  ]);

  it("aggregates 3 trailing pages in scroll mode and dedupes by (surah, ayah)", () => {
    const flow = buildScrollFlow(pageIndex, 1, 604, 3);
    expect(flow).toEqual([
      { surahId: 1, originalAyah: 1 },
      { surahId: 1, originalAyah: 2 },
      { surahId: 1, originalAyah: 3 },
      { surahId: 1, originalAyah: 4 },
      { surahId: 1, originalAyah: 5 },
      { surahId: 1, originalAyah: 6 },
    ]);
  });

  it("stops at totalPages when the window would overflow", () => {
    const flow = buildScrollFlow(pageIndex, 3, 4, 3);
    expect(flow).toEqual([
      { surahId: 1, originalAyah: 5 },
      { surahId: 1, originalAyah: 6 },
      { surahId: 1, originalAyah: 7 },
    ]);
  });

  it("returns only the current page's items when currentPage is at the end", () => {
    const flow = buildScrollFlow(pageIndex, 4, 4, 3);
    expect(flow).toEqual([{ surahId: 1, originalAyah: 7 }]);
  });

  it("dedupes across overlapping pages (typical mushaf pages share no ayahs, but defend anyway)", () => {
    const dup = new Map<number, Item[]>([
      [1, [{ surahId: 1, originalAyah: 1 }]],
      [2, [{ surahId: 1, originalAyah: 1 }, { surahId: 1, originalAyah: 2 }]],
    ]);
    const flow = buildScrollFlow(dup, 1, 604, 2);
    expect(flow).toEqual([
      { surahId: 1, originalAyah: 1 },
      { surahId: 1, originalAyah: 2 },
    ]);
  });
});