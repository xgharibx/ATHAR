// @vitest-environment jsdom
import { describe, expect, it, vi, beforeAll, beforeEach } from "vitest";

import "fake-indexeddb/auto";

/** Phase 4 perf — confirms that the IDB-cached index is hydrated synchronously
 *  on the very first retrievePassages call after a page reload (no network). */
let cached: unknown = null;
const idbGetExtras = vi.fn(async () => cached);
const idbSetExtras = vi.fn(async (_k: string, v: unknown) => {
  cached = v;
});

vi.mock("@/lib/quranIDB", () => ({
  idbGetExtras,
  idbSetExtras,
}));

const { retrievePassages, retrievePassagesAsync } = await import("@/lib/companionKnowledge");

function prime(passages: Array<{ source: string; sourceLabel: string; text: string }>) {
  cached = { cachedAt: Date.now(), data: passages };
}

beforeEach(() => {
  cached = null;
});

describe("companionKnowledge IDB cache (Phase 4 #2)", () => {
  it("retrieves synchronously after the cache is warm", async () => {
    prime([
      { source: "sharh:1", sourceLabel: "تجربة ١", text: "الصبر الجميل خير من الجزع عند المصائب" },
      { source: "sharh:2", sourceLabel: "تجربة ٢", text: "تحبَّب إلينا بالصبر الجميل فإنه مفتاح الفرج" },
    ]);
    await retrievePassagesAsync("تهيئة", 5);
    const out = retrievePassages("الصبر والجزع", 5);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].text).toMatch(/الجميل|الجزع|المصائب|الفرج/);
  });

  it("k=5 yields more or equal hits vs k=3", async () => {
    prime(
      Array.from({ length: 8 }, (_, i) => ({
        source: `sharh:${i + 1}`,
        sourceLabel: `حديث رقم ${i + 1}`,
        text: `كلمة الفجر الصادق تضيء حديث رقم ${i + 1}`,
      })),
    );
    await retrievePassagesAsync("تهيئة", 5);
    const out3 = retrievePassages("الفجر الصادق", 3);
    const out5 = retrievePassages("الفجر الصادق", 5);
    expect(out5.length).toBeLessThanOrEqual(5);
    expect(out3.length).toBeLessThanOrEqual(3);
    expect(out5.length).toBeGreaterThanOrEqual(out3.length);
  });

  it("returns an empty list when nothing matches", async () => {
    prime([{ source: "x", sourceLabel: "x", text: "نص غير مرتبط" }]);
    await retrievePassagesAsync("تهيئة", 5);
    const out = retrievePassages("كلمات غير موجودة zzzzzz", 5);
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBe(0);
  });
});
