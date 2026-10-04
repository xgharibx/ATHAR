// @vitest-environment jsdom
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeArabicSearch } from "@/lib/arabic";
import { pruneLookupCacheRows } from "@/lib/lookupCacheRetention";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 5, 1);
const STALE_AT = NOW - 366 * DAY_MS;
const EXPIRED_AT = NOW - 396 * DAY_MS;

async function seedVersionOneCache(databaseName: string, row: Record<string, unknown>) {
  const db = new Dexie(databaseName);
  db.version(1).stores({ cache: "key" });
  await db.open();
  await db.table("cache").put(row);
  db.close();
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("expired lookup cache fallback", () => {
  it("serves cached Tafsir when refresh is unavailable and retains the saved row", async () => {
    const key = "ar-tafsir-al-jalalayn:1";
    const cached = Array.from({ length: 8 }, (_, ayah) => ayah === 0 ? "" : `شرح محفوظ ${ayah}`);
    await seedVersionOneCache("noor-tafsir-cache-v1", {
      key,
      ayahs: cached,
      emptyAyahs: [],
      sourceVersion: "v1.2.2",
      cachedAt: STALE_AT,
    });
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const { loadTafsirSurah } = await import("@/lib/tafsirEditions");
    await expect(loadTafsirSurah("ar-tafsir-al-jalalayn", 1)).resolves.toEqual(cached);

    const verify = new Dexie("noor-tafsir-cache-v1");
    verify.version(3).stores({ cache: "key,cachedAt" });
    await verify.open();
    await expect(verify.table("cache").get(key)).resolves.toMatchObject({ ayahs: cached, cachedAt: STALE_AT });
    verify.close();
  });

  it("does not serve Tafsir rows beyond the refresh grace period", async () => {
    const key = "ar-tafsir-al-jalalayn:1";
    const cached = Array.from({ length: 8 }, (_, ayah) => ayah === 0 ? "" : `شرح قديم ${ayah}`);
    await seedVersionOneCache("noor-tafsir-cache-v1", {
      key,
      ayahs: cached,
      emptyAyahs: [],
      sourceVersion: "v1.2.2",
      cachedAt: EXPIRED_AT,
    });
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const { loadTafsirSurah } = await import("@/lib/tafsirEditions");
    await expect(loadTafsirSurah("ar-tafsir-al-jalalayn", 1)).rejects.toThrow("Failed to fetch");
  });

  it("does not present a sparse legacy Tafsir cache row as a complete surah", async () => {
    const key = "ar-tafsir-al-jalalayn:1";
    await seedVersionOneCache("noor-tafsir-cache-v1", {
      key,
      ayahs: ["", "شرح محفوظ لآية واحدة فقط"],
      cachedAt: NOW - DAY_MS,
    });
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const { loadTafsirSurah } = await import("@/lib/tafsirEditions");
    await expect(loadTafsirSurah("ar-tafsir-al-jalalayn", 1)).rejects.toThrow("Failed to fetch");
  });

  it("serves cached Dorar grading when refresh is unavailable and retains the saved row", async () => {
    const key = "nawawi:1";
    const data = { exact: null, others: [{ snippet: "حكم محفوظ", narrator: "راوٍ", muhaddith: "ناقد", source: "مصدر", pageOrNumber: "1", verdict: "حسن" }] };
    await seedVersionOneCache("noor-dorar-cache-v2", { key, data, cachedAt: STALE_AT });
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const { getTakhrijFor } = await import("@/lib/dorarTakhrij");
    await expect(getTakhrijFor("nawawi", 1, "هذا متن حديث طويل بما يكفي ليُرسل إلى خدمة البحث عن التخريج")).resolves.toEqual(data);

    const verify = new Dexie("noor-dorar-cache-v2");
    verify.version(2).stores({ cache: "key,cachedAt" });
    await verify.open();
    await expect(verify.table("cache").get(key)).resolves.toMatchObject({ data, cachedAt: STALE_AT });
    verify.close();
  });

  it("serves cached narrator biographies when Wikipedia cannot refresh them", async () => {
    const name = "سفيان بن عيينة";
    const key = normalizeArabicSearch(name);
    const bio = { name, source: "wikipedia", extract: "ترجمة محفوظة للاستخدام دون اتصال", url: "https://ar.wikipedia.org/wiki/example" };
    await seedVersionOneCache("noor-narrator-cache-v2", { key, bio, cachedAt: STALE_AT });
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const { lookupNarratorBio } = await import("@/lib/narratorLookup");
    await expect(lookupNarratorBio(name)).resolves.toEqual(bio);

    const verify = new Dexie("noor-narrator-cache-v2");
    verify.version(2).stores({ cache: "key,cachedAt" });
    await verify.open();
    await expect(verify.table("cache").get(key)).resolves.toMatchObject({ bio, cachedAt: STALE_AT });
    verify.close();
  });

  it("does not cache a narrator miss when Wikipedia is unavailable, so later lookups can retry", async () => {
    const name = "راوي تجريبي منقطع عن الشبكة";
    const key = normalizeArabicSearch(name);
    const { lookupNarratorBio } = await import("@/lib/narratorLookup");
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(lookupNarratorBio(name)).resolves.toBeNull();
    const verify = new Dexie("noor-narrator-cache-v2");
    verify.version(2).stores({ cache: "key,cachedAt" });
    await verify.open();
    await expect(verify.table("cache").get(key)).resolves.toBeUndefined();
    verify.close();

    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("opensearch")) {
        return { ok: true, json: async () => [name, [name], ["محدث"], [`https://ar.wikipedia.org/wiki/${encodeURIComponent(name)}`]] };
      }
      return { ok: true, json: async () => ({ description: "محدث وفقيه", extract: "ترجمة موثقة لعالم في الحديث" }) };
    }));

    await expect(lookupNarratorBio(name)).resolves.toMatchObject({
      name,
      source: "wikipedia",
      extract: "ترجمة موثقة لعالم في الحديث",
    });
  });
});

describe("lookup cache retention", () => {
  it("removes rows beyond the expiry grace period", async () => {
    const db = new Dexie("lookup-cache-grace-test");
    db.version(1).stores({ cache: "key,cachedAt" });
    await db.open();
    const table = db.table("cache");
    await table.bulkPut([
      { key: "expired", cachedAt: NOW - 61 * DAY_MS },
      { key: "grace", cachedAt: NOW - 32 * DAY_MS },
      { key: "fresh", cachedAt: NOW - 2 * DAY_MS },
    ]);

    await pruneLookupCacheRows(table, { maxAgeMs: 30 * DAY_MS, maxEntries: 10, now: NOW });

    await expect(table.toCollection().primaryKeys()).resolves.toEqual(["fresh", "grace"]);
    db.close();
    await Dexie.delete("lookup-cache-grace-test");
  });

  it("keeps only the newest lookup rows when the store exceeds its entry cap", async () => {
    const db = new Dexie("lookup-cache-cap-test");
    db.version(1).stores({ cache: "key,cachedAt" });
    await db.open();
    const table = db.table("cache");
    await table.bulkPut([
      { key: "oldest", cachedAt: NOW - 3 * DAY_MS },
      { key: "middle", cachedAt: NOW - 2 * DAY_MS },
      { key: "newer", cachedAt: NOW - DAY_MS },
      { key: "newest", cachedAt: NOW },
    ]);

    await pruneLookupCacheRows(table, { maxAgeMs: 30 * DAY_MS, maxEntries: 2, now: NOW });

    await expect(table.toCollection().primaryKeys()).resolves.toEqual(["newer", "newest"]);
    db.close();
    await Dexie.delete("lookup-cache-cap-test");
  });
});
