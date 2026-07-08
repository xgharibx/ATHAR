/**
 * الموسوعة الحديثية الميسرة — client for hadeethenc.com (open API, CORS: *).
 *
 * Serves scholarly, reviewed hadith commentary verbatim: the hadith fully
 * vocalised, its grade and attribution, الشرح, الفوائد (hints), and غريب
 * الألفاظ — with attribution to the Encyclopedia of Translated Prophetic
 * Hadiths (hadeethenc.com).
 *
 * Everything the user opens is cached locally, so revisits work offline.
 */

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

/** Full hadith with شرح/فوائد/غريب. Cached forever once opened (content is stable). */
export async function fetchSharhHadith(id: string): Promise<SharhHadith> {
  return getJson<SharhHadith>(
    `/hadeeths/one/?language=ar&id=${encodeURIComponent(id)}`,
    `h:${id}`,
    365 * 24 * 60 * 60 * 1000,
  );
}
