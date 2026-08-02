/**
 * Athar cloud sync — pure merge logic.
 *
 * This file decides what happens when the same account has been used on two
 * devices. It is deliberately free of Supabase, React and I/O so the rules can
 * be tested exhaustively: a bug here silently destroys someone's years of
 * adhkar progress, which is the worst failure this app can have.
 *
 * ## The rule that matters most
 *
 * **Sync must never lose data the user can see.** A naive "last write wins"
 * would do exactly that: read 10 ayahs on the phone, open the tablet, and the
 * tablet's older snapshot overwrites the phone. So instead every field is
 * merged with a THREE-WAY merge against `base` — the snapshot this device last
 * successfully exchanged with the server.
 *
 *   local === remote            → agreed, nothing to decide
 *   base === local              → only the other device moved  → take remote
 *   base === remote             → only this device moved       → take local
 *   both moved (real conflict)  → resolve by type (max for counters, union for
 *                                 sets, newer-writer for plain settings)
 *
 * The base is what lets deletion work. Without it, "un-favourite on the phone"
 * looks identical to "the tablet hasn't heard about this favourite yet", and a
 * union-merge would resurrect the favourite forever. With it, a key that was in
 * base and is now gone on one side is a genuine delete and stays deleted.
 *
 * On a device with no base (first sign-in) the rules degrade to a pure union /
 * max, which is exactly the desired behaviour: an empty or partial cloud can
 * never wipe existing local data.
 */

export const SYNC_KINDS = [
  "progress",
  "favorites",
  "bookmarks",
  "reminders",
  "quran",
  "settings",
] as const;

export type SyncKind = (typeof SYNC_KINDS)[number];

export type SyncBlob = Record<string, unknown>;
export type SyncBuckets = Record<SyncKind, SyncBlob>;

/**
 * Which document each exported field belongs to. Splitting the state means a
 * settings change doesn't have to rewrite the (much larger) progress blob, and
 * a conflict in one area can't disturb another.
 *
 * Anything NOT listed here falls into `settings`. That default is deliberate:
 * when someone later adds a field to `exportState()` and forgets this map, the
 * field still syncs (in the catch-all bucket) instead of silently never
 * syncing — a bug that would be invisible until a user lost data.
 */
const DEFAULT_KIND: SyncKind = "settings";

const FIELD_KIND: Record<string, SyncKind> = {
  // — progress —
  progress: "progress",
  activity: "progress",
  quickTasbeeh: "progress",
  tasbeehLifetime: "progress",
  tasbeehDailyLog: "progress",
  tasbeehStreak: "progress",
  tasbeehStreakBest: "progress",
  tasbeehLastActiveDate: "progress",
  tasbeehDailyGoal: "progress",
  tasbeehGoalCelebratedDate: "progress",
  asmaHusnaCounts: "progress",
  prayerLog: "progress",
  sectionCompletions: "progress",
  dailyChecklist: "progress",
  dailyBetterStepDone: "progress",
  dailyWirdDone: "progress",
  dailyWirdStartISO: "progress",
  khatmaStartISO: "progress",
  khatmaDays: "progress",
  khatmaDone: "progress",
  sebhaSessions: "progress",
  sebhaCustom: "progress",
  sebhaCustomList: "progress",
  videoLibraryProgress: "progress",
  videoLibraryLastVideoId: "progress",
  lastDailyResetISO: "progress",
  lastCivilResetISO: "progress",
  lastIbadahResetISO: "progress",
  lastKnownFajrTime: "progress",
  weeklyReportSentISO: "progress",

  // — favorites —
  favorites: "favorites",
  libraryFavorites: "favorites",
  videoLibraryBookmarks: "favorites",
  favoriteCities: "favorites",

  // — bookmarks (Quran + hadith reading position and annotations) —
  quranBookmarks: "bookmarks",
  hadithBookmarks: "bookmarks",
  hadithProgress: "bookmarks",
  hadithNotes: "bookmarks",
  hadithMemoCards: "bookmarks",

  // — reminders —
  reminders: "reminders",
  customReminders: "reminders",

  // — quran —
  quranLastRead: "quran",
  quranLastReadDate: "quran",
  quranNotes: "quran",
  quranHighlights: "quran",
  quranReadingHistory: "quran",
  quranStreak: "quran",
  quranDailyAyahs: "quran",
  reviewedPagesToday: "quran",

  // — settings — (plus every unlisted field, see DEFAULT_KIND)
  prefs: "settings",
  onboardingDone: "settings",
  sectionItemOrder: "settings",
  customPacks: "settings",
  leaderboardIdentity: "settings",
  dataPacks: "settings",
};

/**
 * How each field resolves a genuine two-sided conflict.
 *
 *  counter    Record<string, number>            — larger wins (monotonic)
 *  counter2   Record<string, Record<_, number>> — nested counter
 *  flags      Record<string, boolean>           — true wins
 *  flags2     Record<string, Record<_, boolean>>
 *  map        Record<string, anything>          — per key, newer writer wins
 *  strListMap Record<string, string[]>          — per key, union
 *  listById   object[] keyed by `id`            — union by identity
 *  strList    string[]                          — union
 *  maxNum     number                            — larger wins
 *  scalar     anything else                     — newer writer wins
 */
type Rule =
  | "counter"
  | "counter2"
  | "flags"
  | "flags2"
  | "map"
  | "strListMap"
  | "listById"
  | "strList"
  | "maxNum"
  | "identity"
  | "packs"
  | "scalar";

const FIELD_RULE: Record<string, Rule> = {
  progress: "counter",
  activity: "counter",
  quickTasbeeh: "counter",
  tasbeehLifetime: "counter",
  asmaHusnaCounts: "counter",
  quranDailyAyahs: "counter",
  quranReadingHistory: "counter",
  hadithProgress: "counter",
  tasbeehDailyLog: "counter2",

  favorites: "flags",
  libraryFavorites: "flags",
  videoLibraryBookmarks: "flags",
  quranBookmarks: "flags",
  hadithBookmarks: "flags",
  dailyWirdDone: "flags",
  dailyBetterStepDone: "flags",
  khatmaDone: "flags",
  prayerLog: "flags2",
  dailyChecklist: "flags2",

  quranNotes: "map",
  quranHighlights: "map",
  hadithNotes: "map",
  hadithMemoCards: "map",
  videoLibraryProgress: "map",
  sectionItemOrder: "map",
  sectionCompletions: "strListMap",

  sebhaSessions: "listById",
  sebhaCustomList: "listById",
  customPacks: "listById",
  customReminders: "listById",
  favoriteCities: "listById",

  reviewedPagesToday: "strList",

  quranStreak: "maxNum",
  tasbeehStreak: "maxNum",
  tasbeehStreakBest: "maxNum",

  leaderboardIdentity: "identity",
  dataPacks: "packs",
};

/** Which bucket a field belongs to (exported for tests and diagnostics). */
export function kindForField(field: string): SyncKind {
  return FIELD_KIND[field] ?? DEFAULT_KIND;
}

/** Split a flat export blob into the six documents stored server-side. */
export function bucketize(blob: SyncBlob | null | undefined): SyncBuckets {
  const out = emptyBuckets();
  if (!blob) return out;
  for (const [field, value] of Object.entries(blob)) {
    if (value === undefined) continue;
    out[kindForField(field)][field] = value;
  }
  return out;
}

/** Recombine documents into a flat blob `importState()` can consume. */
export function debucketize(buckets: Partial<SyncBuckets> | null | undefined): SyncBlob {
  const out: SyncBlob = {};
  if (!buckets) return out;
  for (const kind of SYNC_KINDS) {
    const doc = buckets[kind];
    if (!doc) continue;
    for (const [field, value] of Object.entries(doc)) {
      if (value !== undefined) out[field] = value;
    }
  }
  return out;
}

export function emptyBuckets(): SyncBuckets {
  return {
    progress: {},
    favorites: {},
    bookmarks: {},
    reminders: {},
    quran: {},
    settings: {},
  };
}

// ————————————————————————————————————————————————————————————————
// merge primitives
// ————————————————————————————————————————————————————————————————

/** Order-insensitive structural equality, good enough for JSON state. */
function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  return stable(a) === stable(b);
}

function stable(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  const keys = Object.keys(v as object).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stable((v as SyncBlob)[k])}`).join(",")}}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function rec(v: unknown): Record<string, unknown> {
  return isRecord(v) ? v : {};
}

/**
 * Walk the union of keys across the three sides, honouring deletions.
 *
 * Returns null for a key that should be dropped: present in `base` and removed
 * on exactly one side means a real delete (an un-favourite, or a daily log the
 * app pruned), and re-adding it from the other side would undo the user's
 * action and grow storage without bound.
 */
function keyDecision(
  key: string,
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
  base: Record<string, unknown> | null,
): "drop" | "keep" {
  if (!base || !(key in base)) return "keep";
  const inL = key in local;
  const inR = key in remote;
  if (inL && inR) return "keep";
  return "drop"; // removed on at least one side, and base proves it once existed
}

function unionKeys(...objs: Array<Record<string, unknown>>): string[] {
  const seen = new Set<string>();
  for (const o of objs) for (const k of Object.keys(o)) seen.add(k);
  return [...seen];
}

/** The three-way core, parameterised by how a real conflict resolves. */
function threeWay<T>(
  local: T,
  remote: T,
  base: T | undefined,
  hasBase: boolean,
  onConflict: (l: T, r: T) => T,
): T {
  if (sameJson(local, remote)) return local;
  if (hasBase && sameJson(base, local)) return remote; // only the other side moved
  if (hasBase && sameJson(base, remote)) return local; // only this side moved
  return onConflict(local, remote);
}

function toNum(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function mergeCounters(
  local: unknown,
  remote: unknown,
  base: unknown,
  hasBase: boolean,
): Record<string, number> {
  const L = rec(local);
  const R = rec(remote);
  const B = hasBase ? rec(base) : null;
  const out: Record<string, number> = {};
  for (const k of unionKeys(L, R)) {
    if (keyDecision(k, L, R, B) === "drop") continue;
    const bv = B && k in B ? toNum(B[k]) : undefined;
    out[k] = threeWay(toNum(L[k]), toNum(R[k]), bv, bv !== undefined, (a, b) => Math.max(a, b));
  }
  return out;
}

function mergeFlags(
  local: unknown,
  remote: unknown,
  base: unknown,
  hasBase: boolean,
): Record<string, boolean> {
  const L = rec(local);
  const R = rec(remote);
  const B = hasBase ? rec(base) : null;
  const out: Record<string, boolean> = {};
  for (const k of unionKeys(L, R)) {
    if (keyDecision(k, L, R, B) === "drop") continue;
    const bv = B && k in B ? Boolean(B[k]) : undefined;
    // Conflict = one side set it and the other cleared it with no shared base.
    // `true` wins, because losing a favourite is worse than an extra one the
    // user can remove again in one tap.
    out[k] = threeWay(Boolean(L[k]), Boolean(R[k]), bv, bv !== undefined, (a, b) => a || b);
  }
  return out;
}

function mergeNested(
  local: unknown,
  remote: unknown,
  base: unknown,
  hasBase: boolean,
  inner: (l: unknown, r: unknown, b: unknown, hb: boolean) => unknown,
): Record<string, unknown> {
  const L = rec(local);
  const R = rec(remote);
  const B = hasBase ? rec(base) : null;
  const out: Record<string, unknown> = {};
  for (const k of unionKeys(L, R)) {
    if (keyDecision(k, L, R, B) === "drop") continue;
    const hb = Boolean(B && k in B);
    out[k] = inner(L[k], R[k], B?.[k], hb);
  }
  return out;
}

/** Per-key last-writer-wins for maps of opaque values (notes, highlights…). */
function mergeMap(
  local: unknown,
  remote: unknown,
  base: unknown,
  hasBase: boolean,
  remoteNewer: boolean,
): Record<string, unknown> {
  const L = rec(local);
  const R = rec(remote);
  const B = hasBase ? rec(base) : null;
  const out: Record<string, unknown> = {};
  for (const k of unionKeys(L, R)) {
    if (keyDecision(k, L, R, B) === "drop") continue;
    if (!(k in L)) { out[k] = R[k]; continue; }
    if (!(k in R)) { out[k] = L[k]; continue; }
    const hb = Boolean(B && k in B);
    out[k] = threeWay(L[k], R[k], B?.[k], hb, (a, b) => (remoteNewer ? b : a));
  }
  return out;
}

function asStrings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function mergeStrList(local: unknown, remote: unknown, base: unknown, hasBase: boolean): string[] {
  const L = asStrings(local);
  const R = asStrings(remote);
  const B = hasBase ? new Set(asStrings(base)) : null;
  const ls = new Set(L);
  const rs = new Set(R);
  const out: string[] = [];
  for (const v of [...L, ...R]) {
    if (out.includes(v)) continue;
    if (B?.has(v) && !(ls.has(v) && rs.has(v))) continue; // deleted on one side
    out.push(v);
  }
  return out;
}

/** Identity for list items: an explicit `id`, else the item's own shape. */
function identityOf(item: unknown): string {
  if (isRecord(item) && typeof item.id === "string" && item.id) return item.id;
  return stable(item);
}

/** Newest timestamp we can find on a list item, for conflict resolution. */
function stampOf(item: unknown): number {
  if (!isRecord(item)) return 0;
  for (const field of ["updatedAt", "createdAt", "at", "date"]) {
    const v = item[field];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const t = Date.parse(v);
      if (!Number.isNaN(t)) return t;
    }
  }
  return 0;
}

function asList(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/**
 * Merge the user's custom adhkar packs.
 *
 * A plain list-by-id merge is not enough here. Both phones almost always have a
 * pack with the SAME id — `my_adhkar_pack` — because that's where every dhikr
 * the user writes goes. Picking one side would silently delete whatever the
 * other phone's أذكاري contained, which is the worst outcome in this app.
 *
 * So packs merge by packId, sections merge by section id, and the adhkar inside
 * a section are UNIONED by their text. Adding a dhikr on either phone can then
 * only ever add.
 */
function mergePacks(local: unknown, remote: unknown): unknown {
  const L = asList(local);
  const R = asList(remote);
  if (L.length === 0) return R.length === 0 ? L : R;
  if (R.length === 0) return L;

  const packId = (p: unknown) => (isRecord(p) && typeof p.packId === "string" ? p.packId : stable(p));
  const index = (arr: unknown[]) => {
    const m = new Map<string, Record<string, unknown>>();
    for (const p of arr) if (isRecord(p)) m.set(packId(p), p);
    return m;
  };
  const lm = index(L);
  const rm = index(R);

  const out: unknown[] = [];
  for (const id of [...lm.keys(), ...rm.keys()]) {
    if (out.some((p) => packId(p) === id)) continue;
    const a = lm.get(id);
    const b = rm.get(id);
    if (!a) { out.push(b); continue; }
    if (!b) { out.push(a); continue; }
    out.push({ ...b, ...a, sections: mergeSections(asList(a.sections), asList(b.sections)) });
  }
  return out;
}

function mergeSections(local: unknown[], remote: unknown[]): unknown[] {
  const secId = (s: unknown) => (isRecord(s) && typeof s.id === "string" ? s.id : stable(s));
  const rm = new Map<string, Record<string, unknown>>();
  for (const s of remote) if (isRecord(s)) rm.set(secId(s), s);

  const out: unknown[] = [];
  const seen = new Set<string>();
  for (const s of local) {
    if (!isRecord(s)) continue;
    const id = secId(s);
    seen.add(id);
    const other = rm.get(id);
    if (!other) { out.push(s); continue; }
    out.push({ ...other, ...s, content: unionByText(asList(s.content), asList(other.content)) });
  }
  for (const s of remote) {
    if (isRecord(s) && !seen.has(secId(s))) out.push(s);
  }
  return out;
}

/** Union adhkar by their text — the only stable identity a written dhikr has. */
function unionByText(local: unknown[], remote: unknown[]): unknown[] {
  const keyOf = (i: unknown) =>
    isRecord(i) && typeof i.text === "string" ? i.text.trim() : stable(i);
  const out: unknown[] = [];
  const seen = new Set<string>();
  for (const item of [...local, ...remote]) {
    const k = keyOf(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

/**
 * Pick which leaderboard identity an account keeps when two devices each
 * brought their own.
 *
 * Whichever joined earlier wins. Cloud-always-wins would be simpler, but it
 * would hand the account to whichever device happened to sign in first and
 * throw away the longer-standing rank — the exact thing the user notices. The
 * oldest identity is the one most likely to carry real history, and picking by
 * `joinedAt` is symmetric, so both devices independently reach the same answer
 * and converge on the next sync instead of fighting.
 */
function mergeIdentity(local: unknown, remote: unknown): unknown {
  const usable = (v: unknown) =>
    isRecord(v) && typeof v.id === "string" && v.id && typeof v.secret === "string" && v.secret;
  if (!usable(local)) return usable(remote) ? remote : local;
  if (!usable(remote)) return local;

  const joined = (v: unknown) => {
    const raw = (v as Record<string, unknown>).joinedAt;
    const t = typeof raw === "string" ? Date.parse(raw) : NaN;
    return Number.isNaN(t) ? Infinity : t;
  };
  const lt = joined(local);
  const rt = joined(remote);
  if (lt !== rt) return lt < rt ? local : remote;
  // Same join date (or neither has one): break the tie on the id so both
  // devices agree rather than each keeping its own forever.
  const li = String((local as Record<string, unknown>).id);
  const ri = String((remote as Record<string, unknown>).id);
  return li <= ri ? local : remote;
}

function mergeListById(
  local: unknown,
  remote: unknown,
  base: unknown,
  hasBase: boolean,
  remoteNewer: boolean,
): unknown[] {
  const L = asList(local);
  const R = asList(remote);
  const index = (arr: unknown[]) => {
    const m = new Map<string, unknown>();
    for (const it of arr) m.set(identityOf(it), it);
    return m;
  };
  const lm = index(L);
  const rm = index(R);
  const bm = hasBase ? index(asList(base)) : null;

  const out: unknown[] = [];
  const emitted = new Set<string>();
  // Local order first so the user's own arrangement is preserved, then any
  // items only the other device knows about.
  for (const it of [...L, ...R]) {
    const id = identityOf(it);
    if (emitted.has(id)) continue;
    const inL = lm.has(id);
    const inR = rm.has(id);
    if (bm?.has(id) && !(inL && inR)) continue; // deleted on one side
    emitted.add(id);
    if (inL && inR) {
      const a = lm.get(id);
      const b = rm.get(id);
      if (sameJson(a, b)) { out.push(a); continue; }
      const bv = bm?.get(id);
      if (bm?.has(id) && sameJson(bv, a)) { out.push(b); continue; }
      if (bm?.has(id) && sameJson(bv, b)) { out.push(a); continue; }
      const sa = stampOf(a);
      const sb = stampOf(b);
      out.push(sa === sb ? (remoteNewer ? b : a) : sa > sb ? a : b);
    } else {
      out.push(inL ? lm.get(id) : rm.get(id));
    }
  }
  return out;
}

// ————————————————————————————————————————————————————————————————
// document merge
// ————————————————————————————————————————————————————————————————

export type MergeOptions = {
  /** Server row is newer than this device's last local edit. Only consulted
   *  for genuine two-sided conflicts on plain settings-style values. */
  remoteNewer: boolean;
  /** The snapshot last exchanged with the server, or null on first sign-in.
   *  Without it the merge falls back to union/max and can never delete. */
  base: SyncBlob | null;
};

/**
 * Merge one document. `local` always wins ties, and any field the remote has
 * never heard of survives untouched — so signing in on a device that already
 * has years of data can only ever ADD to it.
 */
export function mergeDoc(local: SyncBlob, remote: SyncBlob, opts: MergeOptions): SyncBlob {
  const { remoteNewer, base } = opts;
  const out: SyncBlob = {};

  for (const field of unionKeys(local, remote)) {
    const l = local[field];
    const r = remote[field];

    // A field only one side knows about needs no merge — but if base had it and
    // one side dropped it, that's a deliberate removal.
    if (!(field in local)) {
      if (base && field in base) continue;
      out[field] = r;
      continue;
    }
    if (!(field in remote)) {
      if (base && field in base) continue;
      out[field] = l;
      continue;
    }

    const hasBase = Boolean(base && field in base);
    const b = base?.[field];
    const rule: Rule = FIELD_RULE[field] ?? "scalar";

    switch (rule) {
      case "counter":
        out[field] = mergeCounters(l, r, b, hasBase);
        break;
      case "counter2":
        out[field] = mergeNested(l, r, b, hasBase, (li, ri, bi, hb) =>
          mergeCounters(li, ri, bi, hb),
        );
        break;
      case "flags":
        out[field] = mergeFlags(l, r, b, hasBase);
        break;
      case "flags2":
        out[field] = mergeNested(l, r, b, hasBase, (li, ri, bi, hb) => mergeFlags(li, ri, bi, hb));
        break;
      case "map":
        out[field] = mergeMap(l, r, b, hasBase, remoteNewer);
        break;
      case "strListMap":
        out[field] = mergeNested(l, r, b, hasBase, (li, ri, bi, hb) =>
          mergeStrList(li, ri, bi, hb),
        );
        break;
      case "listById":
        out[field] = mergeListById(l, r, b, hasBase, remoteNewer);
        break;
      case "strList":
        out[field] = mergeStrList(l, r, b, hasBase);
        break;
      case "maxNum":
        out[field] = threeWay(toNum(l), toNum(r), toNum(b), hasBase, (a, c) => Math.max(a, c));
        break;
      case "packs":
        // Deliberately ignores `base`: unioning is the whole point, and a
        // dhikr the user wrote must never be removed by a merge.
        out[field] = mergePacks(l, r);
        break;
      case "identity":
        // Deliberately ignores `base`: an identity is never "edited", it is
        // only ever adopted, so the three-way question doesn't apply.
        out[field] = mergeIdentity(l, r);
        break;
      default:
        out[field] = threeWay(l, r, b, hasBase, (a, c) => (remoteNewer ? c : a));
        break;
    }
  }

  return out;
}
