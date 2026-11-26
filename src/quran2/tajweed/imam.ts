/**
 * «الإمام»: what the model heard (the Quran phonetic script) turned into
 * per-word tajweed remarks, the way a teacher corrects a student:
 * «لَنَآ: المد المنفصل حركتان بدل أربع»، «ٱلْغُيُوبِ: القلقلة غير ظاهرة».
 *
 * A port of imam.py from HisnLabs Tajweed v2 (Apache-2.0), for Hafs. The
 * expected script of any stretch of an ayah is built from per-word pieces
 * computed by quran-transcript's phonetizer (MIT) ahead of time
 * (tools/quran2/tajweed-pieces.py): each word as it sounds continuing,
 * starting a breath, ending one (waqf) and alone; a stretch is the first
 * word as started, the middle words as continued, the last as stopped on.
 * tests/quran2Tajweed.test.ts checks this against the Python reference.
 */
import { distance, opcodes } from "./levenshtein";

/** [start, end) within the word's piece, and the rule (RULES[i]). */
export type PieceRule = [number, number, number];
type Variant = string | [string, PieceRule[]];
/** p: continuing; i: starting a breath; w: ending one (waqf); o: alone. v: its nun / tanween vanishes into the next word. */
export type WordPiece = { p: string; r?: PieceRule[]; v?: 1; i?: Variant; w?: Variant; o?: Variant };
/** One ayah: its words (quran-transcript's Uthmani spelling) and their pieces. */
export type AyahPieces = { t: string[]; w: WordPiece[] };

export const RULES = ["NormalMaddRule", "MonfaselMaddRule", "MottaselMaddRule", "MottaselMaddPauseRule", "LazemMaddRule", "AaredMaddRule", "LeenMaddRule", "Qalqalah"] as const;
export type RuleName = (typeof RULES)[number];

const LONG = new Set(["ا", "ۥ", "ۦ"]);
const HARAKAT = new Set(["َ", "ُ", "ِ"]);
const NASAL = new Set(["ن", "م"]);
const ONSET = 3;
// Lengths a teacher accepts in Hafs ʿan ʿĀṣim (the ṭuruq of the Shatibiyya and the Tayyiba), ascending.
const MADD: Record<string, { allowed: number[]; ar: string }> = {
  NormalMaddRule: { allowed: [2], ar: "المد الطبيعي" },
  MonfaselMaddRule: { allowed: [2, 4, 5], ar: "المد المنفصل" },
  MottaselMaddRule: { allowed: [4, 5, 6], ar: "المد المتصل" },
  MottaselMaddPauseRule: { allowed: [4, 5, 6], ar: "المد المتصل وقفا" },
  LazemMaddRule: { allowed: [6], ar: "المد اللازم" },
  AaredMaddRule: { allowed: [2, 4, 6], ar: "المد العارض للسكون" },
  LeenMaddRule: { allowed: [2, 4, 6], ar: "مد اللين" },
};
// The model writes at most 4 counts: a 4 or a 5 is timed against the reciter's own natural madd.
const TIME_SIX = 8.3;
const TIME_FIVE = 7.0;
const COUNTS: Record<number, string> = { 2: "حركتان", 3: "ثلاث حركات", 4: "أربع حركات", 5: "خمس حركات", 6: "ست حركات" };
const counts = (n: number) => (n ? COUNTS[n] ?? `${n} حركات` : "بلا مد");

export type Unit = { s: number; e: number; kind: string; word: number; golden: number; allowed: number[]; rule: string; char: string };

export type Ref = {
  words: string[];
  phonemes: string;
  spans: Array<[number, number]>;
  units: Unit[];
  /** Per word: its index in the ayah (a word repeated after a stop appears twice). */
  index: number[];
  /** Ayah indices of the words the reciter stopped on. */
  stops: number[];
  /** The ayah index each breath started from. */
  restarts: number[];
  /** Positions in `words` where a breath ends. */
  ends: number[];
};

const unit = (s: number, e: number, kind: string, word: number, golden = 0, allowed: number[] = [], rule = "", char = ""): Unit => ({ s, e, kind, word, golden, allowed, rule, char });

function variant(piece: WordPiece, key: "p" | "i" | "w" | "o"): [string, PieceRule[]] {
  if (key === "p") return [piece.p, piece.r ?? []];
  const v = piece[key];
  if (v === undefined) return [piece.p, piece.r ?? []];
  return typeof v === "string" ? [v, []] : v;
}

/** What a correct recitation of words [a, b) of the ayah sounds like, as one breath. */
export function expected(ayah: AyahPieces, a: number, b: number): Ref {
  const words = ayah.t.slice(a, b);
  let ph = "";
  const spans: Array<[number, number]> = [];
  const tags: Array<[number, number, string]> = [];
  const vanish: boolean[] = [];
  for (let k = a; k < b; k++) {
    const key = b - a === 1 ? "o" : k === a ? "i" : k === b - 1 ? "w" : "p";
    const [p, r] = variant(ayah.w[k]!, key);
    const o = ph.length;
    spans.push([o, o + p.length]);
    for (const [x, y, c] of r) tags.push([o + x, o + y, RULES[c]!]);
    vanish.push(Boolean(ayah.w[k]!.v) && k !== b - 1);
    ph += p;
  }
  const wordAt = (i: number) => {
    const k = spans.findIndex(([x, y]) => x <= i && i < y);
    return k >= 0 ? k : spans.length - 1;
  };
  const units: Unit[] = [];
  const ruled = new Set<number>();
  for (const [s0, e0, name] of tags) {
    if (MADD[name]) {
      const seg = ph.slice(s0, e0);
      let c: string | undefined = [...seg].find((ch) => LONG.has(ch));
      if (!c && name === "LeenMaddRule") c = seg[0];
      if (!c) continue;
      const j = seg.indexOf(c);
      let k = j;
      while (k < seg.length && seg[k] === c) k++;
      const golden = k - j + (name === "LeenMaddRule" ? 1 : 0);
      units.push(unit(s0 + j, s0 + k, "madd", wordAt(s0), golden, MADD[name].allowed, name, c));
      for (let x = s0 + j; x < s0 + k; x++) ruled.add(x);
    } else if (name === "Qalqalah") {
      const q = ph.indexOf("ڇ", s0);
      if (q >= 0 && q < e0) {
        units.push(unit(q, q + 1, "qalqalah", wordAt(q), 0, [], "", "ڇ"));
        ruled.add(q);
      }
    }
  }
  // The rules the script itself shows: ikhfa ں, iqlab ۾, ghunnah, idgham, shadda.
  let i = 0;
  while (i < ph.length) {
    let j = i;
    while (j < ph.length && ph[j] === ph[i]) j++;
    const c = ph[i]!;
    const n = j - i;
    const w = wordAt(i);
    if (!ruled.has(i)) {
      if (c === "ں") units.push(unit(i, j, "ikhfa", w, n, [], "", c));
      else if (c === "۾") units.push(unit(i, j, "iqlab", w, n, [], "", c));
      else if (NASAL.has(c) && n >= 3) {
        const prevW = i ? wordAt(i - 1) : w;
        const merged = prevW !== w && vanish[prevW];
        units.push(unit(i, j, merged ? "idgham_ghunnah" : "ghunnah", merged ? prevW : w, n, [], "", c));
      } else if ((c === "ي" || c === "و") && n >= 3) {
        units.push(unit(i, j, "idgham_ghunnah", w, n, [], "", c));
      } else if (!LONG.has(c) && !HARAKAT.has(c) && n === 2) {
        const prevW = i ? wordAt(i - 1) : w;
        if (i === spans[w]![0] && prevW !== w && vanish[prevW]) units.push(unit(i, j, "idgham", prevW, 2, [], "", c));
        else units.push(unit(i, j, "shadda", w, 2, [], "", c));
      }
    }
    i = j;
  }
  units.sort((x, y) => x.s - y.s);
  return { words, phonemes: ph, spans, units, index: words.map((_, k) => k), stops: [], restarts: [0], ends: [words.length - 1] };
}

function join(parts: Array<[Ref, number]>): Ref {
  const words: string[] = [];
  const index: number[] = [];
  const spans: Array<[number, number]> = [];
  const units: Unit[] = [];
  let ph = "";
  for (const [r, a] of parts) {
    const o = ph.length;
    const w0 = words.length;
    words.push(...r.words);
    index.push(...r.words.map((_, k) => a + k));
    spans.push(...r.spans.map(([x, y]) => [x + o, y + o] as [number, number]));
    units.push(...r.units.map((u) => ({ ...u, s: u.s + o, e: u.e + o, word: u.word + w0 })));
    ph += r.phonemes;
  }
  const ends: number[] = [];
  let k = 0;
  for (const [r] of parts) {
    k += r.words.length;
    ends.push(k - 1);
  }
  return { words, phonemes: ph, spans, units, index, stops: ends.slice(0, -1).map((e) => index[e]!), restarts: parts.map(([, a]) => a), ends };
}

type Phrase = Array<[number, number]>;

function lessPhrase(x: Phrase, y: Phrase): boolean {
  // Python compares lists of tuples element by element.
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (x[i]![0] !== y[i]![0]) return x[i]![0] < y[i]![0];
    if (x[i]![1] !== y[i]![1]) return x[i]![1] < y[i]![1];
  }
  return x.length < y.length;
}

/**
 * The ayah as the reciter delivered it: where they stopped (the word in its
 * pausal form) and where they started again (often a few words back). A
 * breath is split wherever that brings the expected script clearly closer to
 * what was heard.
 */
export function recited(ayah: AyahPieces, heardRaw: string, back = 4, margin = 3): Ref {
  const heard = heardRaw.replace(/ /g, "");
  const cache = new Map<string, Ref>();
  const ref = (a: number, b: number) => {
    const key = `${a}:${b}`;
    let r = cache.get(key);
    if (!r) {
      r = expected(ayah, a, b);
      cache.set(key, r);
    }
    return r;
  };
  const cost = (phr: Phrase) => distance(phr.map(([a, b]) => ref(a, b).phonemes).join(""), heard);
  let phr: Phrase = [[0, ayah.t.length]];
  let best = cost(phr);
  for (;;) {
    let bestCand: Phrase | null = null;
    let bestCost = Infinity;
    for (let i = 0; i < phr.length; i++) {
      const [a, b] = phr[i]!;
      for (let k = a + 1; k < b; k++) {
        for (let j = Math.max(a + 1, k - back); j <= k; j++) {
          const cand: Phrase = [...phr.slice(0, i), [a, k], [j, b], ...phr.slice(i + 1)];
          const c = cost(cand);
          if (c < bestCost || (c === bestCost && bestCand && lessPhrase(cand, bestCand))) {
            bestCost = c;
            bestCand = cand;
          }
        }
      }
    }
    if (!bestCand) break;
    if (bestCost > best - margin) break;
    best = bestCost;
    phr = bestCand;
  }
  return join(phr.map(([a, b]) => [ref(a, b), a]));
}

/** b[i]: the position in the heard script at position i of the expected one. */
export function boundaries(ref: string, heard: string): number[] {
  const b = new Array<number>(ref.length + 1).fill(0);
  for (const [, i1, i2, j1, j2] of opcodes(ref, heard)) {
    for (let k = i1; k <= i2; k++) b[k] = j1 + (i2 > i1 ? pyRound(((k - i1) * (j2 - j1)) / (i2 - i1)) : 0);
  }
  b[ref.length] = heard.length;
  return b;
}

/** Python's round: halves go to the even neighbour. */
function pyRound(x: number): number {
  const f = Math.floor(x);
  const d = x - f;
  if (d > 0.5) return f + 1;
  if (d < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

function runOf(heard: string, a: number, b: number, c: string): [number, number, number] {
  let k = -1;
  for (let x = a; x < b; x++) {
    if (heard[x] === c) {
      k = x;
      break;
    }
  }
  if (k < 0) return [0, a, a];
  let s = k;
  let e = k;
  while (s > 0 && heard[s - 1] === c) s--;
  while (e < heard.length && heard[e] === c) e++;
  return [e - s, s, e];
}

function dur(heard: string, times: number[], s: number, e: number): number {
  const a = s && HARAKAT.has(heard[s - 1]!) ? times[s - 1]! : times[s]!;
  return Math.max(0, times[Math.min(e, times.length - 1)]! - a);
}

function tempoOf(ref: Ref, heard: string, b: number[], times: number[] | null | undefined, tempo: number[] | null | undefined): number | null {
  if (!times || times.length !== heard.length + 1) return null;
  const ends = new Set(ref.ends.length ? ref.ends : [ref.words.length - 1]);
  let nat: number[] = [];
  for (const u of ref.units) {
    if (u.kind === "madd" && u.rule === "NormalMaddRule" && !ends.has(u.word)) {
      const [n, s, e] = runOf(heard, Math.max(0, b[u.s]! - 1), Math.min(heard.length, b[u.e]! + 1), u.char);
      if (n >= 1 && n <= 3) nat.push(dur(heard, times, s, e));
    }
  }
  nat = nat.filter((d) => d > 0.08 && d < 2.0);
  if (tempo) {
    tempo.push(...nat);
    tempo.splice(0, Math.max(0, tempo.length - 40));
  }
  const src = nat.length >= 2 ? nat : tempo && tempo.length >= 3 ? tempo : [];
  if (!src.length) return null;
  const srt = [...src].sort((x, y) => x - y);
  return srt[Math.floor(srt.length / 2)]! / 2;
}

const MSG = {
  madd_short: ({ name, heard, want }: Record<string, string>) => `${name}: ${heard} بدل ${want}`,
  madd_long: ({ name, heard, want }: Record<string, string>) => `${name}: ${heard} بدل ${want}`,
  madd_missing: ({ name }: Record<string, string>) => `${name}: المد محذوف`,
  madd_added: () => "مد زائد في غير موضعه",
  madd_uneven: ({ name, lens }: Record<string, string>) => `${name}: سوِّ بين المدود (${lens})`,
  ghunnah_short: () => "الغنة ناقصة: أطِل الغنة حركتين",
  ikhfa_izhar: () => "إخفاء: أظهرتَ النون، والصواب إخفاؤها مع الغنة",
  ikhfa_short: () => "إخفاء: الغنة قصيرة",
  iqlab_missed: () => "إقلاب: تُقلب النون ميمًا مخفاة مع الغنة",
  idgham_missed: ({ letter }: Record<string, string>) => `إدغام: أظهرتَ النون، والصواب إدغامها في ${letter}`,
  idgham_ghunnah_short: () => "إدغام بغنة: الغنة ناقصة",
  shadda_missing: ({ letter }: Record<string, string>) => `الشدة على ${letter} غير ظاهرة`,
  qalqalah_missing: ({ letter }: Record<string, string>) => `القلقلة غير ظاهرة على ${letter}`,
  letter: ({ heard, want }: Record<string, string>) => `نطقتَ ${heard} بدل ${want}`,
  vowel: ({ heard, want }: Record<string, string>) => `الحركة: ${heard} بدل ${want}`,
  dropped: ({ want }: Record<string, string>) => `سقط حرف: ${want}`,
  added: ({ heard }: Record<string, string>) => `زيادة: ${heard}`,
  word_missing: () => "لم تُقرأ هذه الكلمة",
} as const;
type MsgKind = keyof typeof MSG;
const VOWEL_NAME: Record<string, string> = { "َ": "فتحة", "ُ": "ضمة", "ِ": "كسرة" };

export type Note = { rule: string; severity: "jali" | "khafi"; expected: unknown; heard: unknown; pos: number | null; msg: string };
export type WordResult = {
  word: string;
  /** The word's index in the ayah. */
  index: number;
  /** The reciter stopped on it (and started a new breath after it). */
  stop: boolean;
  ok: boolean;
  notes: Note[];
  /** Every madd other than the natural one, with the length heard (2, 4, 6). */
  madd: Array<{ rule: string; heard: number; name: string }>;
};

/** A sound without its length: runs collapsed, the length marks of madd and ghunnah removed. */
export function stripLen(s: string): string {
  let out = "";
  for (const c of s) if (out[out.length - 1] !== c) out += c;
  return [...out].filter((c) => !LONG.has(c) && c !== "ں" && c !== "ڇ" && c !== "۾").join("");
}

const subset = (a: string, b: Set<string>) => [...a].every((c) => b.has(c));

/**
 * The remarks, word by word. probs: the model's confidence for each heard
 * symbol (a remark about a sound it is not sure of is left out); times: the
 * time of each symbol plus the end of the last (long madds are then measured
 * in seconds); tempo: the natural madds heard so far in the session.
 */
export function listen(
  ref: Ref,
  heardRaw: string,
  opts: { probs?: number[] | null; minProb?: number; minProbJali?: number; times?: number[] | null; tempo?: number[] | null } = {},
): WordResult[] {
  const heard = heardRaw.replace(/ /g, "");
  const probs = opts.probs ?? null;
  const minProb = opts.minProb ?? 0.7;
  const jaliThr = opts.minProbJali ?? minProb;
  const b = boundaries(ref.phonemes, heard);
  const notes: Note[][] = ref.words.map(() => []);
  const covered = new Array<boolean>(ref.phonemes.length).fill(false);
  let pos: number | null = null;
  let span: [number, number] = [0, 0];

  const unsure = (hs: number, he: number, thr?: number) => {
    if (!probs || !probs.length) return false;
    const seg = probs.slice(Math.max(0, hs - 1), Math.min(probs.length, he + 1));
    return seg.length > 0 && Math.min(...seg) < (thr ?? minProb);
  };
  const add = (w: number, rule: string, severity: "jali" | "khafi", exp: unknown, got: unknown, kind: MsgKind, k: Record<string, string> = {}) => {
    if (unsure(span[0], span[1])) return;
    notes[w]!.push({ rule, severity, expected: exp, heard: got, pos, msg: MSG[kind](k) });
  };
  const count = (s: string, c: string) => [...s].filter((x) => x === c).length;
  const moreNun = (u: Unit, hs: number, he: number) => count(heard.slice(Math.max(0, hs - 2), he), "ن") > count(ref.phonemes.slice(Math.max(0, u.s - 2), u.e), "ن");

  const maddSeen = new Map<string, Array<[number, number]>>();
  const maddHeard: WordResult["madd"][] = ref.words.map(() => []);
  const tunit = tempoOf(ref, heard, b, opts.times, opts.tempo);
  for (const u of ref.units) {
    for (let x = u.s; x < u.e; x++) covered[x] = true;
    const hs = b[u.s]!;
    const he = b[u.e]!;
    pos = u.s;
    span = [hs, he];
    if (u.kind === "madd") {
      let [n, rs, re] = runOf(heard, Math.max(0, hs - 1), Math.min(heard.length, he + 1), u.char);
      if (u.rule.startsWith("Leen") && n > 0) n += 1;
      const sym = n;
      const allowed = u.allowed;
      let shown = n ? (n <= 3 ? 2 : n <= 5 ? 4 : 6) : 0;
      if (tunit && (n === 4 || n === 5) && opts.times) {
        const tc = dur(heard, opts.times, rs, re) / tunit;
        n = tc >= TIME_SIX ? 6 : tc >= TIME_FIVE ? 5 : 4;
        shown = tc >= TIME_SIX ? 6 : 4;
      }
      void rs;
      void re;
      const name = MADD[u.rule]!.ar;
      let near = allowed[0]!;
      for (const a of allowed) if (Math.abs(a - n) < Math.abs(near - n)) near = a;
      if (!maddSeen.has(u.rule)) maddSeen.set(u.rule, []);
      maddSeen.get(u.rule)!.push([u.word, sym]);
      if (shown && u.rule !== "NormalMaddRule") maddHeard[u.word]!.push({ rule: u.rule, heard: shown, name });
      if (n === 0 && !u.rule.startsWith("Leen")) {
        add(u.word, u.rule, "jali", u.golden, 0, "madd_missing", { name });
      } else if (Math.abs(n - near) > 1 && !unsure(hs, he)) {
        const want = counts(allowed.includes(u.golden) ? u.golden : near);
        notes[u.word]!.push({
          rule: u.rule,
          severity: "khafi",
          expected: [...allowed],
          heard: n,
          pos: u.s,
          msg: MSG[n > near ? "madd_long" : "madd_short"]({ name, heard: counts(n), want }),
        });
      }
    } else if (u.kind === "qalqalah") {
      if (!heard.slice(Math.max(0, hs - 1), he + 1).includes("ڇ")) {
        const letter = u.s ? ref.phonemes[u.s - 1]! : "";
        add(u.word, "qalqalah", "khafi", "ڇ", "", "qalqalah_missing", { letter });
      }
    } else if (u.kind === "ikhfa") {
      const [n] = runOf(heard, hs, Math.max(he, hs + 1), "ں");
      if (n === 0 && heard.slice(hs, he + 1).includes("ن")) add(u.word, "ikhfa", "khafi", u.golden, 0, "ikhfa_izhar");
      else if (n && n < u.golden - 1) add(u.word, "ikhfa", "khafi", u.golden, n, "ikhfa_short");
    } else if (u.kind === "iqlab") {
      if (!heard.slice(Math.max(0, hs - 1), he + 1).includes("۾")) add(u.word, "iqlab", "khafi", u.golden, 0, "iqlab_missed");
    } else if (u.kind === "ghunnah" || u.kind === "idgham_ghunnah") {
      const [n] = runOf(heard, Math.max(0, hs - 1), Math.min(heard.length, he + 1), u.char);
      if (u.kind === "idgham_ghunnah" && u.char !== "ن" && moreNun(u, hs, he)) add(u.word, "idgham", "khafi", u.golden, n, "idgham_missed", { letter: u.char });
      else if (n < u.golden) add(u.word, u.kind, "khafi", u.golden, n, u.kind === "ghunnah" ? "ghunnah_short" : "idgham_ghunnah_short");
    } else if (u.kind === "shadda" || u.kind === "idgham") {
      const [n] = runOf(heard, Math.max(0, hs - 1), Math.min(heard.length, he + 1), u.char);
      if (u.kind === "idgham" && moreNun(u, hs, he)) add(u.word, "idgham", "khafi", 2, n, "idgham_missed", { letter: u.char });
      else if (n === 1) add(u.word, "shadda", "jali", 2, 1, "shadda_missing", { letter: u.char });
    }
  }

  // Whatever the rules did not explain: another letter, another vowel, a sound dropped or added (clear mistakes).
  const spare = new Set([...LONG, "ڇ", "ں", "۾", "ن", "م"]);
  for (const [tag, i1, i2, j1, j2] of opcodes(ref.phonemes, heard)) {
    if (tag === "equal") continue;
    const exp = ref.phonemes.slice(i1, i2);
    const got = heard.slice(j1, j2);
    if (i2 > i1 && covered.slice(i1, i2).every(Boolean) && (!got || subset(got, new Set([...exp, ...spare])))) continue;
    if (tag === "insert" && ref.units.some((u) => u.kind === "madd" && u.s <= i1 && i1 <= u.e && subset(got, new Set([u.char])))) continue;
    let w = ref.spans.findIndex(([a, z]) => a <= i1 && i1 < z);
    if (w < 0) w = ref.words.length - 1;
    pos = i1;
    span = [j1, j2];
    if (i1 < ONSET) continue;
    const eCore = stripLen(exp);
    const gCore = stripLen(got);
    if (eCore === gCore) continue;
    if (unsure(j1, j2, jaliThr)) continue;
    if (tag === "replace" && eCore.length === 1 && gCore.length === 1 && HARAKAT.has(eCore) && HARAKAT.has(gCore)) {
      notes[w]!.push({ rule: "vowel", severity: "jali", expected: exp, heard: got, pos: i1, msg: MSG.vowel({ want: VOWEL_NAME[eCore]!, heard: VOWEL_NAME[gCore]! }) });
    } else if (tag === "replace") {
      add(w, "letter", "jali", exp, got, "letter", { want: exp, heard: got });
    } else if (tag === "delete") {
      if (subset(exp, new Set([...LONG, ...HARAKAT])) && exp.length === 1) continue;
      add(w, "dropped", "jali", exp, "", "dropped", { want: exp });
    } else if (tag === "insert") {
      if (i1 === 0 || i1 === ref.phonemes.length) continue;
      if (subset(got, LONG)) {
        if (got.length >= 2) add(w, "madd_added", "khafi", "", got, "madd_added");
        continue;
      }
      if (got.length === 1 && HARAKAT.has(got)) continue;
      add(w, "added", "jali", "", got, "added", { heard: got });
    }
  }

  // A word whose sounds are (almost) all missing was skipped.
  ref.spans.forEach(([a, z], k) => {
    if (z > a && b[z]! - b[a]! <= Math.max(0, Math.floor((z - a) / 4))) {
      notes[k] = [{ rule: "word", severity: "jali", expected: ref.phonemes.slice(a, z), heard: heard.slice(b[a]!, b[z]!), pos: a, msg: MSG.word_missing() }];
    }
  });

  // The same kind of madd keeps the same length through the recitation.
  for (const [rule, seen] of maddSeen) {
    if (!["MonfaselMaddRule", "MottaselMaddRule", "AaredMaddRule"].includes(rule) || seen.length < 2) continue;
    const lens = seen.map(([, n]) => n).filter(Boolean);
    if (!lens.length || Math.max(...lens) - Math.min(...lens) < 2) continue;
    const mean = pyRound(lens.reduce((x, y) => x + y, 0) / lens.length);
    let pick = seen[0]!;
    for (const x of seen) if (Math.abs(x[1] - mean) > Math.abs(pick[1] - mean)) pick = x;
    notes[pick[0]]!.push({
      rule: `${rule}:uneven`,
      severity: "khafi",
      expected: "same",
      heard: lens,
      pos: null,
      msg: MSG.madd_uneven({ name: MADD[rule]!.ar, lens: lens.join(" / ") }),
    });
  }

  const stopsAt = new Set(ref.ends.slice(0, -1));
  return ref.words.map((word, k) => ({
    word,
    index: ref.index[k] ?? k,
    stop: stopsAt.has(k),
    ok: !notes[k]!.length,
    notes: notes[k]!,
    madd: maddHeard[k]!,
  }));
}
