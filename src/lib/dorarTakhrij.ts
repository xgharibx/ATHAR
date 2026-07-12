/**
 * Real hadith grading (takhrij) from dorar.net's "الموسوعة الحديثية" —
 * الراوي (narrator), المحدث (which scholar graded it), المصدر (source book),
 * الصفحة أو الرقم (page/number), and خلاصة حكم المحدث (the verdict itself,
 * e.g. "صحيح", "حسن", "إسناده ضعيف"). This is the same encyclopedia
 * scholars themselves use for takhrij — replaces/enriches the single grade
 * string bundled with the 9 canonical books, which said "sahih" or "hasan"
 * with no citation for who ruled that or why.
 *
 * dorar.net has no bulk export and no per-hadith-ID endpoint — only a
 * keyword search (`dorar_api.json?skey=...`). So this searches with a
 * chunk of the hadith's own matn, then scans every result (not just the
 * first — verified live that the exact canonical-book match is often
 * several results down, not first) for one whose "المصدر" names the same
 * book and whose "الصفحة أو الرقم" is a bare integer equal to this
 * hadith's number. A bare-integer requirement matters: non-canonical
 * sources (commentaries, takhrij volumes) report "13/210"-style volume/page
 * refs, not the hadith number, and would otherwise collide by accident.
 * Other real results (different scholars/books, same or close wording) are
 * kept too — genuine multi-scholar transparency beats a single flat tag.
 */
import Dexie, { type Table } from "dexie";
import { normalizeArabicSearch } from "@/lib/arabic";

export type DorarGrading = {
  narrator: string;
  muhaddith: string;
  source: string;
  pageOrNumber: string;
  verdict: string;
  snippet: string;
};

export type DorarTakhrij = {
  exact: DorarGrading | null;
  others: DorarGrading[];
};

/** Maps a dorar.net verdict string to a semantic color — shared by every UI that shows takhrij. */
export function verdictColor(verdict: string): string {
  if (/موضوع|باطل|منكر|لا يصح|لا أصل/.test(verdict)) return "#ef4444";
  if (/ضعيف/.test(verdict)) return "#f97316";
  if (/حسن/.test(verdict)) return "#f59e0b";
  if (/صحيح|ثابت|مشهور/.test(verdict)) return "#10b981";
  return "#6b7280";
}

// Keywords dorar.net actually uses in its "المصدر" field for each of the 9
// books, verified against live search results (book titles there don't
// always match this app's own display titles, e.g. "جامع الترمذي" here vs
// dorar sometimes saying "سنن الترمذي").
const BOOK_KEYWORDS: Record<string, string[]> = {
  bukhari: ["صحيح البخاري"],
  muslim: ["صحيح مسلم"],
  abudawud: ["سنن أبي داود", "سنن ابي داود"],
  tirmidhi: ["الترمذي"],
  nasai: ["النسائي"],
  ibnmajah: ["ابن ماجه", "ابن ماجة"],
  malik: ["الموطأ"],
  nawawi: [],
  qudsi: [],
};

function bookMatches(bookKey: string, source: string): boolean {
  const keywords = BOOK_KEYWORDS[bookKey] ?? [];
  return keywords.some((k) => source.includes(k));
}

class DorarCacheDexie extends Dexie {
  cache!: Table<{ key: string; data: DorarTakhrij; cachedAt: number }, string>;
  constructor() {
    // v2: v1 cached "not found" even when the dorar search had thrown a
    // transient error (cold start / rate limit), pinning famous hadiths like
    // نية to a permanent "لم يُعثر". v2 starts clean and only ever caches a
    // real response — see getTakhrijFor.
    super("noor-dorar-cache-v2");
    this.version(1).stores({ cache: "key" });
  }
}
let _db: DorarCacheDexie | null = null;
function getDB(): DorarCacheDexie {
  if (!_db) _db = new DorarCacheDexie();
  return _db;
}

const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // grading opinions don't change

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/** Parse dorar_api.json's HTML-in-JSON "result" blob into structured entries. */
function parseDorarResult(html: string): DorarGrading[] {
  const out: DorarGrading[] = [];
  const blocks = html.split('<div class="hadith"');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i]!;
    const snippetMatch = /style="text-align:justify;">([\s\S]*?)<\/div>/.exec(block);
    const narratorMatch = /الراوي:<\/span>\s*([\s\S]*?)<\/span>/.exec(block);
    const muhaddithMatch = /المحدث:<\/span>\s*([\s\S]*?)(?:<span|<\/div|\n)/.exec(block);
    const sourceMatch = /المصدر:<\/span>\s*([\s\S]*?)(?:<span|<\/div|\n)/.exec(block);
    const pageMatch = /الصفحة أو الرقم:<\/span>\s*([\s\S]*?)(?:<span|<\/div|\n)/.exec(block);
    const verdictMatch = /خلاصة حكم المحدث:<\/span>\s*(?:<span[^>]*>)?([\s\S]*?)(?:<\/span>|<\/div>)/.exec(block);
    if (!snippetMatch || !narratorMatch || !sourceMatch || !pageMatch) continue;
    out.push({
      snippet: stripTags(snippetMatch[1]!).replace(/^\d+\s*-\s*/, ""),
      narrator: stripTags(narratorMatch[1]!),
      muhaddith: muhaddithMatch ? stripTags(muhaddithMatch[1]!) : "",
      source: stripTags(sourceMatch[1]!),
      pageOrNumber: stripTags(pageMatch[1]!),
      verdict: verdictMatch ? stripTags(verdictMatch[1]!) : "",
    });
  }
  return out;
}

// dorar.net itself rejects a plain browser fetch — no CORS headers on their
// side, and a 403 with no browser-like User-Agent (which browsers won't let
// JS override anyway). supabase/functions/dorar does the real fetch
// server-side (verified working: curl with a UA gets a real 200) and
// re-serves it with CORS headers this app can read. Defaults to this
// project's deployed function; VITE_DORAR_PROXY_URL can override it.
const PROXY_URL: string =
  (import.meta.env.VITE_DORAR_PROXY_URL as string | undefined) ??
  "https://ojstudhmcypoqfnwugbf.functions.supabase.co/dorar";

function proxyHeaders(): Record<string, string> {
  // Same anon key already used for the leaderboard/companion functions on
  // this project — Supabase's gateway requires it even when the function
  // itself has verify_jwt off.
  const apiKey =
    (import.meta.env.VITE_LEADERBOARD_ANON_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
    "";
  if (!apiKey) return {};
  const headers: Record<string, string> = { apikey: apiKey };
  if (apiKey.split(".").length === 3) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

async function searchDorar(query: string): Promise<DorarGrading[]> {
  const url = `${PROXY_URL}?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: "application/json", ...proxyHeaders() } });
  if (!res.ok) throw new Error(`dorar-proxy ${res.status}`);
  const data = (await res.json()) as { ok?: boolean; result?: string };
  if (!data.ok || !data.result) return [];
  return parseDorarResult(data.result);
}

/** How much of the normalized matn text overlaps a dorar snippet — a cheap
 *  word-overlap ratio, not a full diff, but enough to reject a wrong hit. */
function textOverlap(a: string, b: string): number {
  const wordsA = new Set(normalizeArabicSearch(a).split(" ").filter((w) => w.length > 1));
  const wordsB = new Set(normalizeArabicSearch(b).split(" ").filter((w) => w.length > 1));
  if (wordsA.size === 0) return 0;
  let hits = 0;
  for (const w of wordsA) if (wordsB.has(w)) hits++;
  return hits / wordsA.size;
}

// Throws if the dorar search itself failed (so the caller can avoid caching a
// transient error as a permanent "not found"). Returns empty data only when
// the search genuinely succeeded but nothing matched.
async function fetchTakhrij(bookKey: string, n: number, matnText: string): Promise<DorarTakhrij> {
  // A long query can over-constrain dorar's search; a very short one is too
  // noisy. ~90 normalized characters of the matn (skipping the isnad, which
  // callers already strip) is a good middle ground, verified against
  // several live searches this session.
  const query = normalizeArabicSearch(matnText).slice(0, 90);
  if (query.length < 10) return { exact: null, others: [] };

  const results = await searchDorar(query); // may throw — intentional

  let exact: DorarGrading | null = null;
  const others: DorarGrading[] = [];
  let best: { r: DorarGrading; overlap: number } | null = null;
  for (const r of results) {
    const overlap = textOverlap(matnText, r.snippet);
    if (!best || overlap > best.overlap) best = { r, overlap };
    const isBareInteger = /^\d+$/.test(r.pageOrNumber.trim());
    if (!exact && bookMatches(bookKey, r.source) && isBareInteger && Number(r.pageOrNumber) === n) {
      // Cross-check text overlap so a numbering-scheme collision (rare, but
      // possible for books with more than one numbering tradition) doesn't
      // slip through just because the book name and number happened to match.
      if (overlap > 0.35) {
        exact = r;
        continue;
      }
    }
    if (overlap > 0.45) others.push(r);
  }
  let otherResults = others.filter((r) => r !== exact).slice(0, 6);

  // Best-candidate fallback: nothing crossed the strict thresholds, but the
  // hadith is clearly present (e.g. نية, whose الأربعون النووية wording differs
  // enough from dorar's to miss 0.45). Rather than "لم يُعثر", surface the
  // single most authoritative close ruling. Books like nawawi/qudsi collect
  // from the canonical books and have no keyword/number alignment of their
  // own, so this is their normal path.
  //
  // Prefer a result from a PRIMARY canonical book (البخاري/مسلم/السنن…) — its
  // grading is authoritative — over a random high-overlap commentary. Picking
  // purely by word-overlap once surfaced a niche عِلَل discussion claiming the
  // نية chains "لا يصح منها شيء", which is actively misleading for the single
  // most authentic hadith.
  if (!exact && otherResults.length === 0 && results.length > 0) {
    const CANON = Object.values(BOOK_KEYWORDS).flat();
    // Being in either Sahih IS the grade — prefer صحيح البخاري/مسلم over the
    // sunan when both matched, then fall back to word-overlap order.
    const isSahihayn = (s: string) => s.includes("صحيح البخاري") || s.includes("صحيح مسلم");
    const canonical = results
      .map((r) => ({ r, overlap: textOverlap(matnText, r.snippet) }))
      .filter((x) => x.overlap > 0.3 && CANON.some((k) => x.r.source.includes(k)))
      .sort((a, b) => {
        const rank = Number(isSahihayn(b.r.source)) - Number(isSahihayn(a.r.source));
        return rank !== 0 ? rank : b.overlap - a.overlap;
      });
    if (canonical.length > 0) {
      otherResults = [canonical[0]!.r];
    } else if (best && best.overlap > 0.5) {
      // No canonical source at all — only accept a non-canonical commentary
      // when the wording match is very strong, so a loose match can't
      // masquerade as this hadith's ruling.
      otherResults = [best.r];
    }
  }

  return { exact, others: otherResults };
}

/** Real, cited grading for a hadith — exact canonical match plus other
 *  scholarly opinions on the same or very similar wording, or nulls/empty
 *  if nothing reliable was found. Never invents a verdict. */
export async function getTakhrijFor(bookKey: string, n: number, matnText: string): Promise<DorarTakhrij> {
  const key = `${bookKey}:${n}`;
  try {
    const cached = await getDB().cache.get(key);
    if (cached && Date.now() - cached.cachedAt < MAX_AGE_MS) return cached.data;
  } catch {
    // IDB unavailable — fall through to a live fetch
  }

  let data: DorarTakhrij;
  try {
    data = await fetchTakhrij(bookKey, n, matnText);
  } catch {
    // The search errored (network / proxy cold start / rate limit). Return
    // empty for now but DON'T cache it — a retry on the next visit can still
    // find the real grading. Caching here is what used to pin famous hadiths
    // to a permanent "not found".
    return { exact: null, others: [] };
  }
  try {
    await getDB().cache.put({ key, data, cachedAt: Date.now() });
  } catch {
    // non-fatal
  }
  return data;
}
