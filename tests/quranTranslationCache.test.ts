// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const NOW = Date.now();

describe("Quran Foundation translation cache policy", () => {
  beforeEach(async () => {
    const cache = await import("@/lib/quranIDB");
    const previousRows = await cache.idbGetExtrasByPrefix("noor_quran_translations_");
    await cache.idbDeleteExtras(previousRows.map((row) => row.key));
  });

  afterEach(async () => {
    const cache = await import("@/lib/quranIDB");
    const rows = await cache.idbGetExtrasByPrefix("noor_quran_translations_");
    await cache.idbDeleteExtras(rows.map((row) => row.key));
    await cache.idbPruneQuranTranslationCache();
  });

  it("deletes expired, future-dated, and legacy whole-book rows but retains fresh chapters", async () => {
    const cache = await import("@/lib/quranIDB");
    const oldKey = "noor_quran_translations_v2:yusuf_ali:1";
    const futureKey = "noor_quran_translations_v2:jalandhry:2";
    const freshKey = "noor_quran_translations_v2:yusuf_ali:2";
    const legacyKey = "noor_quran_translations_v1:yusuf_ali";

    await cache.idbSetExtras(oldKey, { text: "expired" }, NOW - cache.QURAN_TRANSLATION_CACHE_TTL_MS);
    await cache.idbSetExtras(futureKey, { text: "future timestamp" }, NOW + 1);
    await cache.idbSetExtras(freshKey, { text: "fresh" }, NOW - cache.QURAN_TRANSLATION_CACHE_TTL_MS + 60_000);
    await cache.idbSetExtras(legacyKey, { text: "legacy whole-book" }, NOW - 1000);

    await expect(cache.idbPruneQuranTranslationCache(NOW)).resolves.toBe(3);
    await expect(cache.idbGetExtras(oldKey)).resolves.toBeNull();
    await expect(cache.idbGetExtras(futureKey)).resolves.toBeNull();
    await expect(cache.idbGetExtras(legacyKey)).resolves.toBeNull();
    await expect(cache.idbGetExtras(freshKey)).resolves.toEqual({ text: "fresh" });
  });
});
