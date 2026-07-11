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
  }
}

let _db: TafsirDexie | null = null;
function getDB(): TafsirDexie {
  if (!_db) _db = new TafsirDexie();
  return _db;
}

const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

async function readCache(slug: string, surahId: number): Promise<SurahTafsir | null> {
  try {
    const row = await getDB().cache.get(`${slug}:${surahId}`);
    if (!row || Date.now() - row.cachedAt > MAX_AGE_MS) return null;
    return row.ayahs;
  } catch {
    return null;
  }
}

async function writeCache(slug: string, surahId: number, ayahs: SurahTafsir): Promise<void> {
  try {
    await getDB().cache.put({ key: `${slug}:${surahId}`, ayahs, cachedAt: Date.now() });
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
  const cached = await readCache(slug, surahId);
  if (cached) return cached;

  const url = `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/${slug}/${surahId}.json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Tafsir fetch failed: ${resp.status}`);
  const data: TafsirApiAyah[] = await resp.json();

  const ayahs: SurahTafsir = [""];
  for (const item of data) {
    ayahs[item.ayah] = item.text ?? "";
  }

  await writeCache(slug, surahId, ayahs);
  return ayahs;
}
