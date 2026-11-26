/**
 * Following a recitation live with the tajweed engine itself (on phones, where
 * the phone's speech recogniser cannot share the microphone with it).
 *
 * Every second or two, the model hears the last few seconds; what it heard is
 * found in the passage's expected script near where the reciter was — the
 * whole of what was heard laid over a stretch of the script that may start and
 * end anywhere — and the end of that stretch is where the reciter is now.
 */
import { expected, type AyahPieces } from "./imam";
import { ourWord } from "./pieces";

/** A word of the passage ("s:a:n", our numbering) and where it lies in the script. */
export type FollowWord = { key: string; start: number; end: number };
export type FollowPlan = { all: string; words: FollowWord[] };

/** The passage's expected script, and each word's place in it. */
export function planFollow(ayahs: Array<{ s: number; a: number; pieces: AyahPieces }>): FollowPlan {
  let all = "";
  const words: FollowWord[] = [];
  for (const x of ayahs) {
    const ref = expected(x.pieces, 0, x.pieces.t.length);
    ref.spans.forEach(([s0, e0], k) => {
      const key = `${x.s}:${x.a}:${ourWord(x.s, x.a, k)}`;
      const last = words[words.length - 1];
      // Two of the phonetizer's words that are one of ours.
      if (last && last.key === key) last.end = all.length + e0;
      else words.push({ key, start: all.length + s0, end: all.length + e0 });
    });
    all += ref.phonemes;
  }
  return { all, words };
}

/** Too few sounds to place (a breath, a pause). */
const MIN_HEARD = 6;
/** Above this many edits per sound heard, what was heard is not in the passage near there. */
const MAX_COST = 0.45;

/**
 * Where what was just heard ends in the script, looking around `at` (where the
 * reciter was), or null when it fits nowhere there well enough.
 */
export function followStep(all: string, at: number, heard: string): { from: number; to: number; cost: number } | null {
  const m = heard.length;
  if (m < MIN_HEARD) return null;
  const lo = Math.max(0, at - Math.round(m * 1.5) - 40);
  const hi = Math.min(all.length, at + Math.round(m * 1.4) + 120);
  const n = hi - lo;
  if (n <= 0) return null;
  // Rows: the sounds heard (all of them must be placed); columns: the script, free to start and end anywhere.
  // Each cell also carries where in the script its path began.
  let prev = new Int32Array(n + 1);
  let cur = new Int32Array(n + 1);
  let prevFrom = Int32Array.from({ length: n + 1 }, (_, i) => i);
  let curFrom = new Int32Array(n + 1);
  for (let j = 1; j <= m; j++) {
    cur[0] = j;
    curFrom[0] = 0;
    const c = heard.charCodeAt(j - 1);
    for (let i = 1; i <= n; i++) {
      const sub = prev[i - 1]! + (all.charCodeAt(lo + i - 1) === c ? 0 : 1);
      const ins = prev[i]! + 1;
      const del = cur[i - 1]! + 1;
      if (sub <= ins && sub <= del) {
        cur[i] = sub;
        curFrom[i] = prevFrom[i - 1]!;
      } else if (ins <= del) {
        cur[i] = ins;
        curFrom[i] = prevFrom[i]!;
      } else {
        cur[i] = del;
        curFrom[i] = curFrom[i - 1]!;
      }
    }
    [prev, cur] = [cur, prev];
    [prevFrom, curFrom] = [curFrom, prevFrom];
  }
  // The best end; among equals, the furthest (the reciter is at the end of what they said).
  let best = 0;
  for (let i = 1; i <= n; i++) if (prev[i]! <= prev[best]!) best = i;
  const cost = prev[best]! / m;
  if (cost > MAX_COST) return null;
  return { from: lo + prevFrom[best]!, to: lo + best, cost };
}

/** The word the script position falls in (the last word begun before it). */
export function wordAt(words: FollowWord[], pos: number): number {
  let lo = 0;
  let hi = words.length - 1;
  let found = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid]!.start < pos) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}
