/**
 * Inverted word index over the Quran ayah corpus.
 *
 * Why: the Quran page searches all 6,236 ayahs on every keystroke. A naive
 * scan + normalize is ~0.5–2 MB of text per query. Tokenising into a postings
 * list lets multi-word queries intersect tiny lists instead of scanning the
 * full corpus.
 *
 * Behaviour:
 *  - The index is built lazily on first use, then memoised at module scope.
 *  - Tokenisation drops diacritics, lower-cases, and discards tokens shorter
 *    than 2 letters to avoid noise + huge posting lists for "و", "في", etc.
 *  - `search()` returns a result list capped at `limit`, with the total match
 *    count for the UI.
 *  - Single-token queries use the token's posting list directly; multi-token
 *    queries intersect the lists in ascending-length order for efficiency.
 */
import type { QuranDB } from "@/data/quranTypes";

export type AyahHit = { surahId: number; surahName: string; ayahIndex: number; text: string };

type Posting = { surahId: number; ayahIndex: number; surahName: string; text: string };

const MIN_TOKEN_LEN = 2;
const STOPWORDS = new Set(["في", "من", "على", "إلى", "عن", "ما", "لا", "إن", "أن", "أو", "ثم", "لم", "قد", "إنما"]);

/** Strip the Arabic definite article (الـ) for matching purposes. The Quran
 *  uses it heavily, so 'كتب' should match 'الكتاب'. */
function stripDefiniteArticle(s: string): string {
  return s.replace(/^(ال|ٱل|إل|أل)/, "");
}

let CACHE: {
  tokens: Map<string, Posting[]>;
  total: number;
} | null = null;

function build(db: QuranDB): { tokens: Map<string, Posting[]>; total: number } {
  const tokens = new Map<string, Posting[]>();
  let total = 0;
  for (const s of db) {
    const name = s.name;
    for (let i = 0; i < s.ayahs.length; i++) {
      const text = s.ayahs[i] ?? "";
      if (!text) continue;
      total++;
      const seen = new Set<string>();
      for (const raw of text.split(/\s+/)) {
        const t = normalizeToken(raw);
        if (!t || t.length < MIN_TOKEN_LEN) continue;
        if (STOPWORDS.has(t)) continue;
        if (seen.has(t)) continue;
        seen.add(t);
        let bucket = tokens.get(t);
        if (!bucket) { bucket = []; tokens.set(t, bucket); }
        bucket.push({ surahId: s.id, surahName: name, ayahIndex: i + 1, text });
      }
    }
  }
  return { tokens, total };
}

function normalizeToken(s: string): string {
  return s
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "") // diacritics
    .replace(/\u0640/g, "")                                              // tatweel
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
}

function getIndex(db: QuranDB) {
  if (!CACHE || CACHE.total === 0) {
    CACHE = build(db);
  }
  return CACHE;
}

export function invalidateAyahIndex() {
  CACHE = null;
}

export function buildAyahIndex(db: QuranDB) {
  CACHE = build(db);
  return CACHE;
}

export function searchAyah(
  db: QuranDB,
  normalizedQuery: string,
  limit = 60,
): { results: AyahHit[]; totalFound: number } {
  if (!normalizedQuery || normalizedQuery.length < 2) return { results: [], totalFound: 0 };
  const { tokens } = getIndex(db);

  const queryTokens: string[] = [];
  const seenTok = new Set<string>();
  for (const raw of normalizedQuery.split(/\s+/)) {
    const t = normalizeToken(raw);
    if (!t || t.length < MIN_TOKEN_LEN) continue;
    if (STOPWORDS.has(t)) continue;
    if (seenTok.has(t)) continue;
    seenTok.add(t);
    queryTokens.push(t);
  }

  // If every query token was a stopword, we have nothing useful to query
  // (a query of just "في من على" should return 0, not scan the full corpus).
  if (normalizedQuery.length >= 2 && queryTokens.length === 0) {
    return { results: [], totalFound: 0 };
  }

/** Reduce a word to its consonant skeleton (alif/waaw/yaa removed) so
 *  that Arabic root forms match (e.g. كتب ⇄ كتاب ⇄ كاتب). */
function skeleton(s: string): string {
  return s.replace(/[اوي]/g, "").replace(/[^\p{L}]/gu, "");
}

  /** Try to find a posting list for `t` allowing article-stripped variants
   *  and Arabic-root matches via the consonant skeleton. */
  const lookup = (t: string): Posting[] | null => {
    const exact = tokens.get(t);
    if (exact && exact.length > 0) return exact;
    const stripped = stripDefiniteArticle(t);
    if (stripped !== t) {
      const e2 = tokens.get(stripped);
      if (e2 && e2.length > 0) return e2;
    }
    const querySkel = skeleton(stripped);
    // Partial-token: any indexed token whose article-stripped form contains
    // our (article-stripped) query as a substring, OR whose consonant
    // skeleton contains ours.
    const partial: Posting[] = [];
    for (const [key, bucket] of tokens) {
      const keyNorm = stripDefiniteArticle(key);
      if (keyNorm.length > stripped.length * 2.5) continue;
      if (keyNorm === key && key.length > stripped.length * 1.5) continue;
      const skel = skeleton(keyNorm);
      const matches =
        keyNorm.includes(stripped) ||
        stripped.startsWith(keyNorm) ||
        (skel && querySkel && skel.includes(querySkel)) ||
        (skel && querySkel && querySkel.includes(skel));
      if (matches) {
        for (const p of bucket) partial.push(p);
      }
    }
    return partial;
  };

  let candidate: Posting[] | null = null;
  if (queryTokens.length === 1) {
    candidate = lookup(queryTokens[0]!);
  } else {
    // Multi-token: sort postings lists by length, intersect the smallest first
    const lists = queryTokens
      .map((t) => lookup(t))
      .filter((l): l is Posting[] => l !== null && l.length > 0)
      .sort((a, b) => a.length - b.length);
    if (lists.length === 0) {
      candidate = [];
    } else {
      const smallest = lists[0]!;
      const set = new Map<string, Posting>();
      for (const p of smallest) set.set(`${p.surahId}:${p.ayahIndex}`, p);
      let alive = true;
      for (let i = 1; i < lists.length && alive; i++) {
        const next = lists[i]!;
        const nextKeys = new Set<string>();
        for (const p of next) {
          const key = `${p.surahId}:${p.ayahIndex}`;
          if (set.has(key)) nextKeys.add(key);
        }
        if (nextKeys.size === 0) { set.clear(); alive = false; break; }
        for (const k of Array.from(set.keys())) if (!nextKeys.has(k)) set.delete(k);
      }
      candidate = Array.from(set.values());
    }
  }

  if (candidate === null || candidate.length === 0) {
    // Last-ditch: substring scan of the normalised full query against each
    // ayah's normalised text. Slow but correct.
    const seen = new Set<string>();
    const out: Posting[] = [];
    const needle = normalizedQuery.replace(/\s+/g, "");
    for (const s of db) {
      for (let i = 0; i < s.ayahs.length; i++) {
        const text = s.ayahs[i] ?? "";
        const norm = normalizeToken(text);
        if (norm.includes(needle)) {
          const key = `${s.id}:${i + 1}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ surahId: s.id, surahName: s.name, ayahIndex: i + 1, text });
          if (out.length >= 500) break;
        }
      }
      if (out.length >= 500) break;
    }
    candidate = out;
  }

  // Dedupe and cap
  const out: AyahHit[] = [];
  const seen = new Set<string>();
  let totalFound = 0;
  for (const p of candidate ?? []) {
    const key = `${p.surahId}:${p.ayahIndex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    totalFound++;
    if (out.length < limit) {
      out.push({ surahId: p.surahId, surahName: p.surahName, ayahIndex: p.ayahIndex, text: p.text });
    }
  }
  return { results: out, totalFound };
}