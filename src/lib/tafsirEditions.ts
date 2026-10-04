/**
 * Tafsir library — curated Arabic commentaries sourced from spa5k/tafsir_api
 * (free, no-auth, CDN-served via jsDelivr; itself an open mirror of quran.com's
 * tafsir corpus — https://github.com/spa5k/tafsir_api). "muyassar" stays on the
 * app's own bundled offline JSON (src/lib/tafseerLocal.ts) since it already
 * ships with the app and needs no network at all.
 *
 * Cached per-surah in IndexedDB (Dexie) with source-version and completeness
 * checks. A cached edition stays available offline through its 365-day
 * freshness period and a bounded 30-day stale fallback.
 */
import Dexie, { type Table } from "dexie";
import { LOOKUP_CACHE_STALE_GRACE_MS, pruneLookupCacheRows } from "@/lib/lookupCacheRetention";
import { getSurahAyahCount } from "@/data/quranSurahCounts";

export interface TafsirEdition {
  slug: string;
  label: string;
  /** true only for the one edition bundled with the app (no network needed) */
  isBundled?: boolean;
}

export const TAFSIR_EDITIONS: TafsirEdition[] = [
  { slug: "muyassar", label: "الميسر", isBundled: true },
  { slug: "ar-tafsir-al-jalalayn", label: "الجلالين" },
  { slug: "ar-tafsir-ibn-kathir", label: "ابن كثير" },
  { slug: "ar-tafsir-al-tabari", label: "الطبري" },
  { slug: "ar-tafseer-al-qurtubi", label: "القرطبي" },
  { slug: "ar-tafseer-al-saddi", label: "السعدي" },
  { slug: "ar-tafsir-al-baghawi", label: "البغوي" },
  { slug: "ar-tafsir-al-wasit", label: "الوسيط" },
  { slug: "ar-tafseer-tanwir-al-miqbas", label: "تنوير المقباس" },
  { slug: "ar-tafsir-al-mukhtasar", label: "المختصر" },
  // English editions — same spa5k/tafsir_api source/CDN as the Arabic set above.
  { slug: "en-tafisr-ibn-kathir", label: "الإنجليزية — ابن كثير" },
  { slug: "en-tafsir-al-mukhtasar", label: "الإنجليزية — المختصر" },
  { slug: "en-tafsir-maarif-ul-quran", label: "الإنجليزية — معارف القرآن" },
];

export function getTafsirLabel(slug: string): string {
  return TAFSIR_EDITIONS.find((e) => e.slug === slug)?.label ?? slug;
}

interface TafsirApiAyah {
  text: string;
  ayah: number;
  surah: number;
}

export const TAFSIR_API_VERSION = "v1.2.2";
const TAFSIR_API_BASE = `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@${TAFSIR_API_VERSION}/tafsir`;
const REQUEST_TIMEOUT_MS = 15_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateEmptyAyahs(emptyAyahs: readonly number[], expectedSurah: number): Set<number> {
  const ayahCount = getSurahAyahCount(expectedSurah);
  const emptySet = new Set<number>();
  for (const ayah of emptyAyahs) {
    if (!Number.isInteger(ayah) || ayah < 1 || ayah > ayahCount || emptySet.has(ayah)) {
      throw new Error("Invalid tafsir response");
    }
    emptySet.add(ayah);
  }
  return emptySet;
}

/** Parses the provider's per-edition metadata for ayahs with no commentary. */
export function parseTafsirEmptyAyahs(payload: unknown, expectedSurah: number): number[] {
  if (!Array.isArray(payload) || !Number.isInteger(expectedSurah) || expectedSurah < 1 || expectedSurah > 114) {
    throw new Error("Invalid tafsir response");
  }

  const emptyAyahs = payload.map((entry): number => {
    if (!isRecord(entry) || entry.surah !== expectedSurah || !Number.isInteger(entry.ayah)) {
      throw new Error("Invalid tafsir response");
    }
    return Number(entry.ayah);
  });
  validateEmptyAyahs(emptyAyahs, expectedSurah);
  return emptyAyahs;
}

/** Accepts both API shapes and requires each non-empty ayah to be represented. */
export function parseTafsirApiResponse(
  payload: unknown,
  expectedSurah: number,
  declaredEmptyAyahs: readonly number[] = [],
): TafsirApiAyah[] {
  const entries = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.ayahs)
      ? payload.ayahs
      : null;
  if (!entries || entries.length === 0 || !Number.isInteger(expectedSurah) || expectedSurah < 1 || expectedSurah > 114) {
    throw new Error("Invalid tafsir response");
  }

  const ayahCount = getSurahAyahCount(expectedSurah);
  const emptyAyahs = validateEmptyAyahs(declaredEmptyAyahs, expectedSurah);
  const seenAyahs = new Set<number>();
  const normalized = entries.map((entry): TafsirApiAyah => {
    if (!isRecord(entry)) throw new Error("Invalid tafsir response");
    const ayah = entry.ayah;
    const surah = entry.surah ?? expectedSurah;
    const text = entry.text;
    if (
      !Number.isInteger(ayah) || Number(ayah) < 1 || Number(ayah) > ayahCount ||
      !Number.isInteger(surah) || Number(surah) !== expectedSurah ||
      typeof text !== "string" || text.trim().length === 0 || seenAyahs.has(Number(ayah)) || emptyAyahs.has(Number(ayah))
    ) {
      throw new Error("Invalid tafsir response");
    }
    seenAyahs.add(Number(ayah));
    return { ayah: Number(ayah), surah: Number(surah), text };
  });

  for (let ayah = 1; ayah <= ayahCount; ayah += 1) {
    if (!seenAyahs.has(ayah) && !emptyAyahs.has(ayah)) throw new Error("Invalid tafsir response");
  }
  return normalized;
}

export function getTafsirEditionSlug(value: string | null | undefined): string | null {
  return TAFSIR_EDITIONS.find((edition) => edition.slug === value)?.slug ?? null;
}

/** ayahs[0] unused (1-based, matching the rest of the codebase's WbwSurah convention) */
type SurahTafsir = string[];

interface CacheRow {
  key: string; // `${slug}:${surahId}`
  ayahs: SurahTafsir;
  emptyAyahs?: number[];
  sourceVersion?: string;
  cachedAt: number;
}

class TafsirDexie extends Dexie {
  cache!: Table<CacheRow, string>;
  constructor() {
    super("noor-tafsir-cache-v1");
    this.version(1).stores({ cache: "key" });
    this.version(2).stores({ cache: "key,cachedAt" });
    this.version(3).stores({ cache: "key,cachedAt" });
  }
}

let _db: TafsirDexie | null = null;
function getDB(): TafsirDexie {
  if (!_db) _db = new TafsirDexie();
  return _db;
}

const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_STALE_AGE_MS = MAX_AGE_MS + LOOKUP_CACHE_STALE_GRACE_MS;
const MAX_CACHE_ENTRIES = 1_500;

function hasCompleteCachedTafsir(
  ayahs: unknown,
  declaredEmptyAyahs: unknown,
  surahId: number,
): ayahs is SurahTafsir {
  const count = getSurahAyahCount(surahId);
  if (!Array.isArray(ayahs) || ayahs.length !== count + 1 || ayahs[0] !== "" || !Array.isArray(declaredEmptyAyahs)) {
    return false;
  }

  let emptySet: Set<number>;
  try {
    emptySet = validateEmptyAyahs(declaredEmptyAyahs as number[], surahId);
  } catch {
    return false;
  }

  for (let ayah = 1; ayah <= count; ayah += 1) {
    const text = ayahs[ayah];
    if (emptySet.has(ayah) ? text !== "" : typeof text !== "string" || text.trim().length === 0) {
      return false;
    }
  }
  return true;
}

async function readCache(slug: string, surahId: number): Promise<CacheRow | null> {
  try {
    const row = await getDB().cache.get(`${slug}:${surahId}`);
    if (
      !row || row.key !== `${slug}:${surahId}` || !Number.isFinite(row.cachedAt) ||
      row.cachedAt < 0 || row.cachedAt > Date.now() ||
      !hasCompleteCachedTafsir(row.ayahs, row.emptyAyahs ?? [], surahId)
    ) {
      return null;
    }
    return row;
  } catch {
    return null;
  }
}

function maintainCache(): void {
  void pruneLookupCacheRows(getDB().cache, {
    maxAgeMs: MAX_AGE_MS,
    maxEntries: MAX_CACHE_ENTRIES,
  }).catch(() => {});
}

async function writeCache(
  slug: string,
  surahId: number,
  ayahs: SurahTafsir,
  emptyAyahs: number[],
): Promise<void> {
  try {
    await getDB().cache.put({
      key: `${slug}:${surahId}`,
      ayahs,
      emptyAyahs,
      sourceVersion: TAFSIR_API_VERSION,
      cachedAt: Date.now(),
    });
    maintainCache();
  } catch {
    // non-fatal
  }
}

/**
 * Loads a whole surah's tafsir text for the given edition slug, returned as a
 * 1-indexed array (index 0 unused) so callers can do `ayahs[ayahNumber]`.
 * Throws on network failure so callers can fall back/retry as they already do
 * for the jalalayn/WBW fetches elsewhere in the app.
 */
export async function loadTafsirSurah(slug: string, surahId: number): Promise<SurahTafsir> {
  const editionSlug = getTafsirEditionSlug(slug);
  if (!editionSlug) throw new Error("Unknown tafsir edition");
  if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) throw new Error("Invalid surah number");

  const cached = await readCache(editionSlug, surahId);
  const cacheAge = cached ? Date.now() - cached.cachedAt : null;
  if (
    cached && cached.sourceVersion === TAFSIR_API_VERSION &&
    cacheAge !== null && cacheAge < MAX_AGE_MS
  ) {
    return cached.ayahs;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const url = `${TAFSIR_API_BASE}/${editionSlug}/${surahId}.json`;
    const emptyUrl = `${TAFSIR_API_BASE}/${editionSlug}/${surahId}/empty_ayahs.json`;
    const [response, emptyResponse] = await Promise.all([
      fetch(url, { signal: controller.signal }),
      fetch(emptyUrl, { signal: controller.signal }),
    ]);
    if (!response.ok) throw new Error(`Tafsir fetch failed: ${response.status}`);

    let emptyAyahs: number[] = [];
    if (emptyResponse.status !== 404) {
      if (!emptyResponse.ok) throw new Error(`Tafsir metadata fetch failed: ${emptyResponse.status}`);
      emptyAyahs = parseTafsirEmptyAyahs(await emptyResponse.json(), surahId);
    }
    const data = parseTafsirApiResponse(await response.json(), surahId, emptyAyahs);

    const ayahs: SurahTafsir = Array.from({ length: getSurahAyahCount(surahId) + 1 }, () => "");
    for (const item of data) {
      ayahs[item.ayah] = item.text;
    }

    await writeCache(editionSlug, surahId, ayahs, emptyAyahs);
    return ayahs;
  } catch (error) {
    if (cached && cacheAge !== null && cacheAge <= MAX_STALE_AGE_MS) return cached.ayahs;
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
