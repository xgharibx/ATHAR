/**
 * From a whole recitation to remarks on every word of every ayah.
 *
 * The audio is cut into pieces of at most 28 s at its quietest moments (the
 * model hears 30 s at a time); each piece is heard by the model; what was
 * heard is laid over the passage's expected script, piece after piece; each
 * ayah then gets the sounds that fell on it, and imam.ts judges it — where the
 * reciter stopped and started again, every rule, every word.
 */
import { boundaries, expected, listen, recited, type AyahPieces, type Ref, type WordResult } from "./imam";
import type { Heard } from "./ctc";

export const RATE = 16000;
const MAX_PIECE = 28;
const MIN_PIECE = 10;

/** Where to cut the audio: the quietest 300 ms between 10 and 28 s after the last cut. */
export function cutPoints(audio: Float32Array): number[] {
  const frame = RATE / 50;
  const n = Math.floor(audio.length / frame);
  const energy = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let sum = 0;
    for (let i = f * frame; i < (f + 1) * frame; i++) sum += audio[i]! * audio[i]!;
    energy[f] = sum / frame;
  }
  const cuts = [0];
  let start = 0;
  while ((audio.length - start) / RATE > MAX_PIECE) {
    const lo = start / frame + MIN_PIECE * 50;
    const hi = Math.min(n - 15, start / frame + MAX_PIECE * 50);
    let best = hi;
    let bestE = Infinity;
    for (let f = lo; f + 15 <= hi; f++) {
      let e = 0;
      for (let k = 0; k < 15; k++) e += energy[f + k]!;
      if (e < bestE) {
        bestE = e;
        best = f + 7;
      }
    }
    start = best * frame;
    cuts.push(start);
  }
  cuts.push(audio.length);
  return cuts;
}

/** Heard symbols with absolute times (s from the start of the recitation). */
export type TimedHeard = Heard;

/**
 * Lay the heard script over the expected one, the heard part used up in full
 * and the expected part only as far as it goes (the rest is for the next
 * piece): b[i] is the heard position at expected position i, from `from`.
 *
 * Gaps cost little once open (Gotoh's affine gaps), and leaving out whole
 * ayahs (from one ayah start to another, `starts`) costs least of all: an
 * ayah forgotten is taken for what it is, not forced onto the next one's
 * sounds when they share words.
 */
export function alignPiece(expectedAll: string, from: number, heard: string, starts: number[] = []): { to: number; b: number[] } {
  const room = Math.min(expectedAll.length - from, Math.round(heard.length * 1.6) + 120);
  const exp = expectedAll.slice(from, from + room);
  const n = exp.length;
  const m = heard.length;
  // Costs in tenths, kept whole so the path can be traced back exactly.
  const SUB = 10;
  const DEL_OPEN = 15;
  const DEL_EXT = 2;
  const INS_OPEN = 15;
  const INS_EXT = 5;
  const SKIP_OPEN = 20;
  const SKIP_EXT = 1;
  const edge = new Uint8Array(n + 1);
  for (const st of starts) if (st - from >= 0 && st - from <= n) edge[st - from] = 1;
  edge[0] = 1;
  edge[n] = 1;
  const w = m + 1;
  const INF = 1e9;
  // M: ends with a pair; X: an expected sound left out; Y: a heard sound extra; Z: whole ayahs left out.
  const M = new Int32Array((n + 1) * w).fill(INF);
  const X = new Int32Array((n + 1) * w).fill(INF);
  const Y = new Int32Array((n + 1) * w).fill(INF);
  const Z = new Int32Array((n + 1) * w).fill(INF);
  M[0] = 0;
  // Leaving Z is allowed only at an ayah's edge.
  const best = (k: number, i: number) => Math.min(M[k]!, X[k]!, Y[k]!, edge[i] ? Z[k]! : INF);
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      if (!i && !j) continue;
      const k = i * w + j;
      if (i && j) {
        const d = (i - 1) * w + j - 1;
        M[k] = best(d, i - 1) + (exp.charCodeAt(i - 1) === heard.charCodeAt(j - 1) ? 0 : SUB);
      }
      if (i) {
        const up = (i - 1) * w + j;
        X[k] = Math.min(M[up]! + DEL_OPEN, X[up]! + DEL_EXT, Y[up]! + DEL_OPEN, edge[i - 1] ? Z[up]! + DEL_OPEN : INF);
        Z[k] = Math.min(Z[up]! + SKIP_EXT, edge[i - 1] ? Math.min(M[up]!, X[up]!, Y[up]!, i - 1 === 0 && j === 0 ? 0 : INF) + SKIP_OPEN : INF);
      }
      if (j) {
        const left = i * w + j - 1;
        Y[k] = Math.min(M[left]! + INS_OPEN, Y[left]! + INS_EXT, X[left]! + INS_OPEN, edge[i] ? Z[left]! + INS_OPEN : INF);
      }
    }
  }
  // The expected text read: wherever it ends best (what follows is not reached yet).
  let end = 0;
  for (let i = 1; i <= n; i++) if (best(i * w + m, i) < best(end * w + m, end)) end = i;
  const b = new Array<number>(end + 1).fill(Number.MAX_SAFE_INTEGER);
  let i = end;
  let j = m;
  const stateOf = (k: number, ii: number, v: number): 0 | 1 | 2 | 3 => (v === M[k] ? 0 : v === X[k] ? 1 : v === Y[k] ? 2 : edge[ii] && v === Z[k] ? 3 : 0);
  let state = stateOf(i * w + j, i, best(i * w + j, i));
  b[i] = j;
  while (i > 0 || j > 0) {
    const k = i * w + j;
    if (state === 0 && i && j) {
      const d = (i - 1) * w + j - 1;
      const prev = M[k]! - (exp.charCodeAt(i - 1) === heard.charCodeAt(j - 1) ? 0 : SUB);
      state = stateOf(d, i - 1, prev);
      i--;
      j--;
    } else if ((state === 1 || state === 3 || state === 0) && i && (state !== 0 || !j)) {
      const up = (i - 1) * w + j;
      if (state === 3) {
        if (Z[k] === Z[up]! + SKIP_EXT) state = 3;
        else state = stateOf(up, i - 1, Z[k]! - SKIP_OPEN) === 3 ? 0 : stateOf(up, i - 1, Z[k]! - SKIP_OPEN);
      } else {
        const v = X[k]!;
        state = v === X[up]! + DEL_EXT ? 1 : v === M[up]! + DEL_OPEN ? 0 : v === Y[up]! + DEL_OPEN ? 2 : 3;
      }
      i--;
    } else {
      const left = i * w + j - 1;
      const v = Y[k]!;
      state = v === Y[left]! + INS_EXT ? 2 : v === M[left]! + INS_OPEN ? 0 : v === X[left]! + INS_OPEN ? 1 : 3;
      j--;
    }
    b[i] = Math.min(b[i]!, j);
  }
  b[0] = 0;
  for (let k = 1; k <= end; k++) b[k] = Math.min(m, Math.max(b[k] === Number.MAX_SAFE_INTEGER ? b[k - 1]! : b[k]!, b[k - 1]!));
  return { to: from + end, b };
}

export type AyahHeard = { heard: string; probs: number[]; times: number[] };

/** Each ayah's share of what was heard, across the pieces of the recitation. */
export function splitByAyah(scripts: string[], pieces: TimedHeard[]): AyahHeard[] {
  const starts: number[] = [];
  let all = "";
  for (const s of scripts) {
    starts.push(all.length);
    all += s;
  }
  starts.push(all.length);
  const parts: AyahHeard[] = scripts.map(() => ({ heard: "", probs: [], times: [] }));
  const lastEnd: number[] = scripts.map(() => 0);
  let at = 0;
  for (const piece of pieces) {
    if (!piece.heard.length) continue;
    const { to, b } = alignPiece(all, at, piece.heard, starts);
    for (let k = 0; k < scripts.length; k++) {
      const s = Math.max(starts[k]!, at);
      const e = Math.min(starts[k + 1]!, to);
      if (e <= s) continue;
      const hs = b[s - at]!;
      const he = e === to ? piece.heard.length : b[e - at]!;
      if (he <= hs) continue;
      const part = parts[k]!;
      part.heard += piece.heard.slice(hs, he);
      part.probs.push(...piece.probs.slice(hs, he));
      part.times.push(...piece.times.slice(hs, he));
      lastEnd[k] = piece.ends[he - 1]!;
    }
    at = to;
  }
  parts.forEach((p, k) => p.times.push(lastEnd[k]!));
  return parts;
}

/** A word judged, with when it was said (s, from the start of the recitation), to hear it back. */
export type JudgedWord = WordResult & { at: [number, number] | null };
export type AyahVerdict = { s: number; a: number; words: JudgedWord[]; heard: string };

function timed(ref: Ref, heard: string, times: number[], words: WordResult[]): JudgedWord[] {
  if (!heard.length) return words.map((w) => ({ ...w, at: null }));
  const b = boundaries(ref.phonemes, heard);
  return words.map((w, k) => {
    const [x, y] = ref.spans[k]!;
    const hs = b[x]!;
    const he = b[y]!;
    if (he <= hs) return { ...w, at: null };
    return { ...w, at: [Math.max(0, times[hs]! - 0.08), times[Math.min(he, times.length - 1)]! + 0.12] };
  });
}

/** Judge one ayah from what was heard of it. */
export function judgeAyah(s: number, a: number, pieces: AyahPieces, part: AyahHeard, tempo: number[]): AyahVerdict {
  if (!part.heard.length) {
    const ref = expected(pieces, 0, pieces.t.length);
    return { s, a, heard: "", words: timed(ref, "", [], listen(ref, "")) };
  }
  const ref = recited(pieces, part.heard);
  const words = listen(ref, part.heard, { probs: part.probs, minProb: 0.3, minProbJali: 0.7, times: part.times, tempo });
  return { s, a, words: timed(ref, part.heard, part.times, words), heard: part.heard };
}

/** The whole recitation: pieces heard by the model → verdicts per ayah. */
export function judgeRecitation(ayahs: Array<{ s: number; a: number; pieces: AyahPieces }>, heardPieces: TimedHeard[]): AyahVerdict[] {
  const scripts = ayahs.map((x) => expected(x.pieces, 0, x.pieces.t.length).phonemes);
  const parts = splitByAyah(scripts, heardPieces);
  const tempo: number[] = [];
  return ayahs.map((x, k) => judgeAyah(x.s, x.a, x.pieces, parts[k]!, tempo));
}
