/**
 * Tafsir library — curated Arabic commentaries sourced from spa5k/tafsir_api
 * (free, no-auth, CDN-served via jsDelivr; itself an open mirror of quran.com's
 * tafsir corpus — https://github.com/spa5k/tafsir_api). "muyassar" stays on the
 * app's own bundled offline JSON (src/lib/tafseerLocal.ts) since it already
 * ships with the app and needs no network at all.
 *
 * Cached per-surah in IndexedDB (Dexie) with a 1-year TTL — tafsir text never
 * changes — so every edition works fully offline after the first read.
 */
import Dexie, { type Table } from "dexie";
import { pruneLookupCacheRows } from "@/lib/lookupCacheRetention";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Accepts the bare-array API shape and Tanwir al-Miqbas' `{ ayahs }` envelope. */
export function parseTafsirApiResponse(payload: unknown, expectedSurah: number): TafsirApiAyah[] {
  const entries = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.ayahs)
      ? payload.ayahs
      : null;
  if (!entries || entries.length === 0 || !Number.isInteger(expectedSurah) || expectedSurah < 1 || expectedSurah > 114) {
    throw new Error("Invalid tafsir response");
  }

  const seenAyahs = new Set<number>();
  return entries.map((entry): TafsirApiAyah => {
    if (!isRecord(entry)) throw new Error("Invalid tafsir response");
    const ayah = entry.ayah;
    const surah = entry.surah ?? expectedSurah;
    const text = entry.text;
    if (
      !Number.isInteger(ayah) || Number(ayah) < 1 || Number(ayah) > 286 ||
      !Number.isInteger(surah) || Number(surah) !== expectedSurah ||
      (typeof text !== "string" && text !== null) || seenAyahs.has(Number(ayah))
    ) {
      throw new Error("Invalid tafsir response");
    }
    seenAyahs.add(Number(ayah));
    return { ayah: Number(ayah), surah: Number(surah), text: typeof text === "string" ? text : "" };
  });
}

export function getTafsirEditionSlug(value: string | null | undefined): string | null {
  return TAFSIR_EDITIONS.find((edition) => edition.slug === value)?.slug ?? null;
}

/** ayahs[0] unused (1-based, matching the rest of the codebase's WbwSurah convention) */
type SurahTafsir = string[];

interface CacheRow {
  key: string; // `${slug}:${surahId}`
  ayahs: SurahTafsir;
  cachedAt: number;
}

class TafsirDexie extends Dexie {
  cache!: Table<CacheRow, string>;
  constructor() {
    super("noor-tafsir-cache-v1");
    this.version(1).stores({ cache: "key" });
    this.version(2).stores({ cache: "key,cachedAt" });
  }
}

let _db: TafsirDexie | null = null;
function getDB(): TafsirDexie {
  if (!_db) _db = new TafsirDexie();
  return _db;
}

const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 1_500;

async function readCache(slug: string, surahId: number): Promise<CacheRow | null> {
  try {
    const row = await getDB().cache.get(`${slug}:${surahId}`);
    if (!row || !Number.isFinite(row.cachedAt) || !Array.isArray(row.ayahs)) return null;
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

async function writeCache(slug: string, surahId: number, ayahs: SurahTafsir): Promise<void> {
  try {
    await getDB().cache.put({ key: `${slug}:${surahId}`, ayahs, cachedAt: Date.now() });
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

  const cached = await readCache(editionSlug, surahId);
  const cacheAge = cached ? Date.now() - cached.cachedAt : null;
  if (cached && cacheAge !== null && cacheAge >= 0 && cacheAge < MAX_AGE_MS) {
    return cached.ayahs;
  }

  try {
    const url = `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/${editionSlug}/${surahId}.json`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Tafsir fetch failed: ${resp.status}`);
    const data = parseTafsirApiResponse(await resp.json(), surahId);

    const ayahs: SurahTafsir = [""];
    for (const item of data) {
      ayahs[item.ayah] = item.text ?? "";
    }

    await writeCache(editionSlug, surahId, ayahs);
    return ayahs;
  } catch (error) {
    if (cached) return cached.ayahs;
    throw error;
  }
}
