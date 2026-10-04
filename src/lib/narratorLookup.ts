/**
 * Narrator (rawi) biography lookup for isnad chain taps.
 *
 * Two real sources, no invented text:
 *  1. The app's own COMPANIONS dataset (20 major Sahaba, hand-written with
 *     citations) — checked first, instant, no network.
 *  2. Arabic Wikipedia's public REST API for everyone else in the chain
 *     (the tabi'in and later narrators — imams like Malik, Sufyan
 *     ath-Thawri, az-Zuhri — who have real, substantial Wikipedia articles
 *     but aren't in the companions dataset). Fetched on tap, cached in
 *     IndexedDB (name lookups don't change) so repeat taps are instant and
 *     offline-friendly after the first read.
 *
 * A name that matches neither returns null — the UI shows "لم يُعثر على
 * ترجمة" rather than fabricating anything.
 */
import Dexie, { type Table } from "dexie";
import { pruneLookupCacheRows } from "@/lib/lookupCacheRetention";
import { COMPANIONS, type Companion } from "@/data/companions";
import { normalizeArabicSearch } from "@/lib/arabic";

export type NarratorBio = {
  name: string;
  source: "companion" | "wikipedia";
  extract: string;
  url?: string;
  /** Only set for companion matches — lets the caller deep-link to the full bio page. */
  companionId?: string;
};

// Honorifics that trail a name in isnad text but aren't part of it.
const HONORIFIC_RE = /(رضي|رضى)\s*الله\s*(عنه|عنها|عنهم|عنهما)\s*$/u;

function stripHonorific(name: string): string {
  return name.replace(HONORIFIC_RE, "").trim();
}

function findCompanion(name: string): Companion | null {
  const norm = normalizeArabicSearch(stripHonorific(name));
  if (norm.length < 3) return null;
  let best: Companion | null = null;
  for (const c of COMPANIONS) {
    const cNorm = normalizeArabicSearch(c.name);
    if (cNorm === norm || cNorm.includes(norm) || norm.includes(cNorm)) {
      // Prefer the longest / most specific match if more than one contains it.
      if (!best || cNorm.length > normalizeArabicSearch(best.name).length) best = c;
    }
  }
  return best;
}

type NarratorCacheRow = { key: string; bio: NarratorBio | null; cachedAt: number };

class NarratorCacheDexie extends Dexie {
  cache!: Table<NarratorCacheRow, string>;
  constructor() {
    // v2: added the scholar-relevance filter to fromWikipedia() — a v1 cache
    // could hold a wrong match from before that filter existed (e.g. a bare
    // "سفيان" resolving to an unrelated modern namesake), so this bumps the
    // store name to start clean rather than ever serving a stale wrong answer.
    super("noor-narrator-cache-v2");
    this.version(1).stores({ cache: "key" });
    this.version(2).stores({ cache: "key,cachedAt" });
  }
}
let _db: NarratorCacheDexie | null = null;
function getDB(): NarratorCacheDexie {
  if (!_db) _db = new NarratorCacheDexie();
  return _db;
}

const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

function maintainCache(): void {
  void pruneLookupCacheRows(getDB().cache, {
    maxAgeMs: MAX_AGE_MS,
    maxEntries: MAX_CACHE_ENTRIES,
  }).catch(() => {});
}

// Wikipedia's opensearch ranks by general popularity, not by fit — a bare
// first name like "سفيان" resolves to a modern footballer before the hadith
// narrator it actually means. Every candidate is checked and only accepted
// if its own description/extract reads as a religious scholar/narrator;
// an unrelated top match is worse than no match, so this is a hard filter,
// not just a tiebreaker.
const SCHOLAR_KEYWORDS = [
  "محدث", "فقيه", "مفسر", "تابعي", "الصحاب", "صحابي", "عالم", "إمام", "فقهاء",
  "الحديث النبوي", "رواية الحديث", "راوي", "رواة", "الفقه الإسلامي", "قاضي",
  "مقرئ", "مسند", "التابعين", "أهل السنة", "الأئمة",
];

function looksLikeScholar(text: string): boolean {
  return SCHOLAR_KEYWORDS.some((k) => text.includes(k));
}

type WikipediaLookup =
  | { status: "found"; bio: NarratorBio }
  | { status: "not-found" }
  | { status: "unavailable" };

async function fromWikipedia(name: string): Promise<WikipediaLookup> {
  const cleaned = stripHonorific(name);
  try {
    const searchRes = await fetch(
      `https://ar.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleaned)}&limit=6&namespace=0&format=json&origin=*`,
    );
    if (!searchRes.ok) return { status: "unavailable" };
    const searchPayload = await searchRes.json() as unknown;
    if (!Array.isArray(searchPayload)) return { status: "unavailable" };
    const titles = searchPayload[1];
    const urls = searchPayload[3];
    if (!Array.isArray(titles) || !Array.isArray(urls)) return { status: "unavailable" };
    if (!titles.length) return { status: "not-found" };

    let summaryUnavailable = false;
    for (let i = 0; i < titles.length; i++) {
      const title = titles[i];
      if (typeof title !== "string") continue;
      const url = typeof urls[i] === "string" ? urls[i] as string : undefined;
      let summaryRes: Response;
      let summary: { extract?: string; description?: string; type?: string };
      try {
        summaryRes = await fetch(`https://ar.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
        if (!summaryRes.ok) {
          summaryUnavailable = true;
          continue;
        }
        summary = await summaryRes.json() as { extract?: string; description?: string; type?: string };
      } catch {
        summaryUnavailable = true;
        continue;
      }
      if (!summary.extract || summary.type === "disambiguation") continue;
      if (!looksLikeScholar(`${summary.description ?? ""} ${summary.extract}`)) continue;
      return { status: "found", bio: { name: title, source: "wikipedia", extract: summary.extract, url } };
    }
    return summaryUnavailable ? { status: "unavailable" } : { status: "not-found" };
  } catch {
    return { status: "unavailable" };
  }
}

/** Look up a narrator by the name text isolated from the isnad chain. */
export async function lookupNarratorBio(name: string): Promise<NarratorBio | null> {
  const companion = findCompanion(name);
  if (companion) {
    return {
      name: companion.name,
      source: "companion",
      extract: companion.brief,
      companionId: companion.id,
    };
  }

  const key = normalizeArabicSearch(stripHonorific(name));
  if (key.length < 3) return null;

  let stale: NarratorCacheRow | null = null;
  try {
    const cached = await getDB().cache.get(key);
    if (
      cached && Number.isFinite(cached.cachedAt) &&
      (cached.bio === null || (typeof cached.bio === "object" && typeof cached.bio.name === "string"))
    ) {
      stale = cached;
      const age = Date.now() - cached.cachedAt;
      if (age >= 0 && age < MAX_AGE_MS) {
        return cached.bio;
      }
    }
  } catch {
    // IDB unavailable — fall through to a live fetch
  }

  const result = await fromWikipedia(name);
  if (result.status === "unavailable") return stale?.bio ?? null;
  const bio = result.status === "found" ? result.bio : null;
  try {
    await getDB().cache.put({ key, bio, cachedAt: Date.now() });
    maintainCache();
  } catch {
    // non-fatal
  }
  return bio;
}
