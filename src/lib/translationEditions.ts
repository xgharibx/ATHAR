/**
 * Multi-language translation library — sourced from fawazahmed0/quran-api
 * (Unlicense/public domain, no auth, CDN-served via jsDelivr, 490+ editions —
 * https://github.com/fawazahmed0/quran-api). The app's bundled "Sahih
 * International" English translation (src/lib/quranTranslationLocal.ts) stays
 * the default — it ships offline with zero network needed — this adds a
 * curated set of well-known translations in other major languages on top.
 *
 * Each edition ships as one whole-Quran JSON file (~1-1.6MB); fetched once and
 * cached in IndexedDB (1-year TTL) so every edition works offline after first read.
 */
import Dexie, { type Table } from "dexie";

export interface TranslationEdition {
  slug: string;
  /** Arabic display label: language + translator, matches the rest of the app's UI language */
  label: string;
  isBundled?: boolean;
}

export const TRANSLATION_EDITIONS: TranslationEdition[] = [
  { slug: "bundled-en-sahih", label: "الإنجليزية — Saheeh International", isBundled: true },
  { slug: "eng_abdullahyusufal", label: "الإنجليزية — Yusuf Ali" },
  { slug: "urd_fatehmuhammadja", label: "الأردية — Jalandhry" },
  { slug: "tur_diyanetisleri", label: "التركية — Diyanet" },
  { slug: "fra_muhammadhamidul", label: "الفرنسية — Hamidullah" },
  { slug: "ind_indonesianislam", label: "الإندونيسية — Kemenag" },
  { slug: "ben_abubakrzakaria", label: "البنغالية — Zakaria" },
  { slug: "fas_nasermakaremshi", label: "الفارسية — Makarem Shirazi" },
  { slug: "spa_islamicfoundati", label: "الإسبانية — Islamic Foundation" },
  { slug: "msa_abdullahmuhamma", label: "الملايوية — Basmeih" },
  { slug: "rus_elmirkuliev", label: "الروسية — Kuliev" },
];

export function getTranslationLabel(slug: string): string {
  return TRANSLATION_EDITIONS.find((e) => e.slug === slug)?.label ?? slug;
}

interface QuranApiVerse {
  chapter: number;
  verse: number;
  text: string;
}

/** ayahs[surah][ayah] — 1-indexed, index 0 unused on both axes */
type WholeQuranTranslation = Record<number, string[]>;

interface CacheRow {
  slug: string;
  data: WholeQuranTranslation;
  cachedAt: number;
}

class TranslationDexie extends Dexie {
  cache!: Table<CacheRow, string>;
  constructor() {
    super("noor-translation-cache-v1");
    this.version(1).stores({ cache: "slug" });
  }
}

let _db: TranslationDexie | null = null;
function getDB(): TranslationDexie {
  if (!_db) _db = new TranslationDexie();
  return _db;
}

const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const memoryCache = new Map<string, WholeQuranTranslation>();

/** Loads (and caches) an entire translation edition, returned as ayahs[surah][ayah]. */
export async function loadTranslationEdition(slug: string): Promise<WholeQuranTranslation> {
  const mem = memoryCache.get(slug);
  if (mem) return mem;

  try {
    const row = await getDB().cache.get(slug);
    if (row && Date.now() - row.cachedAt < MAX_AGE_MS) {
      memoryCache.set(slug, row.data);
      return row.data;
    }
  } catch {
    // ignore read failure, fall through to network
  }

  const url = `https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/${slug.replace(/_/g, "-")}.min.json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Translation fetch failed: ${resp.status}`);
  const json: { quran: QuranApiVerse[] } = await resp.json();

  const data: WholeQuranTranslation = {};
  for (const v of json.quran) {
    if (!data[v.chapter]) data[v.chapter] = [""];
    data[v.chapter][v.verse] = v.text;
  }

  memoryCache.set(slug, data);
  try {
    await getDB().cache.put({ slug, data, cachedAt: Date.now() });
  } catch {
    // non-fatal — still works from memory for this session
  }
  return data;
}

export async function getTranslatedAyah(slug: string, surahId: number, ayahIndex: number): Promise<string> {
  const data = await loadTranslationEdition(slug);
  return data[surahId]?.[ayahIndex] ?? "";
}
