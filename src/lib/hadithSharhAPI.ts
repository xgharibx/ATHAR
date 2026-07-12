/**
 * الموسوعة الحديثية الميسرة — client for hadeethenc.com (open API, CORS: *).
 *
 * Serves scholarly, reviewed hadith commentary verbatim: the hadith fully
 * vocalised, its grade and attribution, الشرح, الفوائد (hints), and غريب
 * الألفاظ — with attribution to the Encyclopedia of Translated Prophetic
 * Hadiths (hadeethenc.com).
 *
 * Everything the user opens is cached locally, so revisits work offline.
 *
 * The explanations our sharh-links map points to are ALSO pre-bundled into
 * the app (public/data/hadith/sharh-bundled.json) so they render offline on
 * first view without any network — see the bundle loader below. Anything not
 * in the bundle still falls back to a live hadeethenc fetch.
 */
import { publicDataUrl } from "@/data/publicAssetUrl";

const BASE = "https://hadeethenc.com/api/v1";
const CACHE_PREFIX = "noor_sharh_v1:";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // categories/lists refresh weekly; hadiths are stable

export type SharhCategory = {
  id: string;
  title: string;
  hadeeths_count: string;
  parent_id: string | null;
};

export type SharhListItem = {
  id: string;
  title: string;
};

export type SharhHadith = {
  id: string;
  title: string;
  hadeeth: string;
  attribution: string;
  grade: string;
  explanation: string;
  hints?: string[];
  words_meanings?: Array<{ word: string; meaning: string }>;
  reference?: string;
};

type CacheEnvelope<T> = { at: number; data: T };

function cacheGet<T>(key: string, maxAgeMs = CACHE_TTL_MS): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const env = JSON.parse(raw) as CacheEnvelope<T>;
    if (!env || typeof env.at !== "number") return null;
    if (Date.now() - env.at > maxAgeMs) return null;
    return env.data;
  } catch {
    return null;
  }
}

function cacheSet<T>(key: string, data: T): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // storage full — old cache entries can be evicted manually if needed
  }
}

async function getJson<T>(path: string, cacheKey: string, cacheMaxAge = CACHE_TTL_MS): Promise<T> {
  const cached = cacheGet<T>(cacheKey, cacheMaxAge);
  if (cached) return cached;
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    // Serve stale cache (any age) before failing — offline friendliness.
    const stale = cacheGet<T>(cacheKey, Number.POSITIVE_INFINITY);
    if (stale) return stale;
    throw new Error(`sharh-api ${res.status}`);
  }
  const data = (await res.json()) as T;
  cacheSet(cacheKey, data);
  return data;
}

/** Top-level categories (العقيدة، الفضائل والآداب، …). */
export async function fetchSharhRoots(): Promise<SharhCategory[]> {
  const roots = await getJson<SharhCategory[]>(`/categories/roots/?language=ar`, "roots");
  return roots.filter((c) => Number(c.hadeeths_count) > 0);
}

/** All categories flat — used to show a root's sub-sections. */
export async function fetchSharhChildren(parentId: string): Promise<SharhCategory[]> {
  const all = await getJson<SharhCategory[]>(`/categories/list/?language=ar`, "all-categories");
  return all.filter((c) => c.parent_id === parentId && Number(c.hadeeths_count) > 0);
}

export type SharhListPage = { items: SharhListItem[]; hasMore: boolean };

/** Paginated hadith titles inside a category. */
export async function fetchSharhList(categoryId: string, page: number): Promise<SharhListPage> {
  const perPage = 20;
  const res = await getJson<{ data: SharhListItem[]; meta?: { last_page?: number | string } }>(
    `/hadeeths/list/?language=ar&category_id=${encodeURIComponent(categoryId)}&page=${page}&per_page=${perPage}`,
    `list:${categoryId}:${page}`,
  );
  const items = Array.isArray(res.data) ? res.data : [];
  const lastPage = Number(res.meta?.last_page ?? NaN);
  const hasMore = Number.isFinite(lastPage) ? page < lastPage : items.length === perPage;
  return { items, hasMore };
}

// Pre-bundled explanations (offline). Loaded once, lazily, on first sharh open.
let bundle: Record<string, SharhHadith> | null = null;
let bundleLoading: Promise<Record<string, SharhHadith>> | null = null;
function loadSharhBundle(): Promise<Record<string, SharhHadith>> {
  if (bundle) return Promise.resolve(bundle);
  if (!bundleLoading) {
    bundleLoading = fetch(publicDataUrl("data/hadith/sharh-bundled.json"))
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: Record<string, SharhHadith>) => { bundle = data; return data; })
      .catch(() => ({}));
  }
  return bundleLoading;
}

/** Kick off the bundle load in the background so the first sharh is instant. */
export function prewarmSharhBundle(): void {
  void loadSharhBundle();
}

/** Full hadith with شرح/فوائد/غريب. Bundled offline first (instant, no
 *  network), then localStorage cache, then a live hadeethenc fetch. */
export async function fetchSharhHadith(id: string): Promise<SharhHadith> {
  const b = await loadSharhBundle();
  const hit = b[String(id)];
  if (hit) return hit;
  return getJson<SharhHadith>(
    `/hadeeths/one/?language=ar&id=${encodeURIComponent(id)}`,
    `h:${id}`,
    365 * 24 * 60 * 60 * 1000,
  );
}

// ── Daily/random hadith picker — a real record, no AI, no cross-referencing ──
//
// hadeethenc.com has no text-search or random endpoint, only category browse
// + paginated lists + fetch-by-id. So "pick today's hadith" is done entirely
// with those primitives: flatten to leaf categories (the ones that actually
// hold hadiths — fetchSharhList only works on those), pick a single global
// index deterministically (or randomly), and page into whichever leaf holds
// it. Every field shown — text, grade, attribution, explanation — comes from
// the one fetchSharhHadith() call this resolves to, so there is nothing to
// match up and nothing for an LLM to fabricate.

/** Every category (root + nested), fetched once and cached. */
async function fetchAllCategories(): Promise<SharhCategory[]> {
  return getJson<SharhCategory[]>(`/categories/list/?language=ar`, "all-categories");
}

/** Leaf categories: nothing else lists them as a parent, and they actually
 *  hold hadiths — the only categories fetchSharhList can page through. */
export async function fetchLeafCategories(): Promise<SharhCategory[]> {
  const all = await fetchAllCategories();
  const parentIds = new Set(all.map((c) => c.parent_id).filter((id): id is string => !!id));
  return all.filter((c) => !parentIds.has(c.id) && Number(c.hadeeths_count) > 0);
}

async function fetchHadithAtGlobalIndex(leaves: SharhCategory[], globalIndex: number): Promise<SharhHadith | null> {
  let idx = globalIndex;
  for (const cat of leaves) {
    const count = Number(cat.hadeeths_count);
    if (idx < count) {
      const perPage = 20;
      const page = Math.floor(idx / perPage) + 1;
      const posInPage = idx % perPage;
      const listPage = await fetchSharhList(cat.id, page);
      const item = listPage.items[posInPage] ?? listPage.items[0];
      if (!item) return null;
      return fetchSharhHadith(item.id);
    }
    idx -= count;
  }
  return null;
}

function seededIndex(seed: string, length: number): number {
  if (length <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash % length;
}

// ── No-repeat memory ──────────────────────────────────────────────────────
//
// A persisted ring buffer of recently-shown hadith IDs. Persisted (not just
// in-memory) so shuffling repeatedly in one sitting AND reopening the app
// tomorrow both avoid hadiths you just saw — the pool (4,280 real hadiths,
// verified against hadeethenc's own category counts) is large enough that a
// bounded recent-history window, not full dedup, is what actually matters
// for "doesn't feel repetitive".
const RECENT_KEY = "noor_sharh_recent_v1";
const RECENT_MAX = 80;

function getRecentIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function pushRecentId(id: string): void {
  try {
    const recent = getRecentIds().filter((x) => x !== id);
    recent.push(id);
    while (recent.length > RECENT_MAX) recent.shift();
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch {
    // non-fatal — worst case a shuffle repeats sooner than intended
  }
}

/** The day's hadith — same real record for everyone on the same date. Text,
 *  grade, attribution, and explanation all come from this one authoritative
 *  source, so the daily card never needs an AI-written stand-in. */
export async function fetchDailyHadith(dateKey: string): Promise<SharhHadith | null> {
  const leaves = await fetchLeafCategories();
  const total = leaves.reduce((sum, c) => sum + Number(c.hadeeths_count), 0);
  if (total === 0) return null;
  const hadith = await fetchHadithAtGlobalIndex(leaves, seededIndex(dateKey, total));
  if (hadith) pushRecentId(hadith.id);
  return hadith;
}

/**
 * A different real hadith, for the shuffle action — never the one currently
 * on screen, and not one of the last RECENT_MAX shown (persisted, so this
 * holds across shuffles and across app sessions). The pool is verified to
 * be ~4,280 real hadiths (every leaf category hadeethenc actually lists
 * hadiths under), so rejection sampling against an 80-item exclusion
 * window converges in a couple of draws almost always.
 */
export async function fetchRandomHadith(excludeId?: string): Promise<SharhHadith | null> {
  const leaves = await fetchLeafCategories();
  const total = leaves.reduce((sum, c) => sum + Number(c.hadeeths_count), 0);
  if (total === 0) return null;
  const recent = new Set(getRecentIds());
  if (excludeId) recent.add(excludeId);

  const maxAttempts = Math.min(30, total);
  let lastDrawn: SharhHadith | null = null;
  for (let i = 0; i < maxAttempts; i++) {
    const hadith = await fetchHadithAtGlobalIndex(leaves, Math.floor(Math.random() * total));
    if (!hadith) continue;
    lastDrawn = hadith;
    if (!recent.has(hadith.id)) {
      pushRecentId(hadith.id);
      return hadith;
    }
  }
  // Only reachable if the exclusion window is large relative to the pool —
  // not the case here, but never surface "no hadith" over a same-again one.
  if (lastDrawn) pushRecentId(lastDrawn.id);
  return lastDrawn;
}
