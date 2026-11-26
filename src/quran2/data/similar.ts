/**
 * «القرآن الكريم» — the similar ayahs (mutashabihat), found in the text itself.
 *
 * Two ayahs are similar when they share a run of at least MIN_RUN words in a
 * row (compared without diacritics). For each pair the shared run is kept, and
 * so is what follows it in each ayah: that is where people who memorise slip,
 * reciting one ayah's continuation in the other's place.
 *
 * Computed on the device from the verified text, so it needs no outside data
 * and changes nothing.
 */
import type { Q2Text } from "./text";
import { plainKey } from "./arabic";

export const MIN_RUN = 3;

export type SimilarMatch = {
  s: number;
  a: number;
  /** The shared run in this ayah: first word number and length. */
  start: number;
  length: number;
  /** The shared run in the ayah it was compared with. */
  otherStart: number;
  /** The two ayahs are word for word the same. */
  identical: boolean;
};

export type Q2SimilarIndex = {
  keys: Map<string, string[]>; // "s:a" → plain words
  grams: Map<string, string[]>; // three plain words → "s:a:w" where they start
};

export function buildSimilarIndex(text: Q2Text): Q2SimilarIndex {
  const keys = new Map<string, string[]>();
  const grams = new Map<string, string[]>();
  for (const surah of text.surahs) {
    for (const ayah of surah.ayahs) {
      const words = ayah.words.map((w) => plainKey(w.text));
      keys.set(`${ayah.s}:${ayah.a}`, words);
      for (let i = 0; i + MIN_RUN <= words.length; i++) {
        const g = words.slice(i, i + MIN_RUN).join(" ");
        const at = `${ayah.s}:${ayah.a}:${i + 1}`;
        const list = grams.get(g);
        if (list) list.push(at);
        else grams.set(g, [at]);
      }
    }
  }
  return { keys, grams };
}

/** The longest run the two word lists share: [start in a, start in b, length], 0-based. */
function longestRun(a: string[], b: string[]): [number, number, number] {
  let best: [number, number, number] = [0, 0, 0];
  const prev = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let diag = 0;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j]!;
      prev[j] = a[i - 1] === b[j - 1] ? diag + 1 : 0;
      if (prev[j]! > best[2]) best = [i - prev[j]!, j - prev[j]!, prev[j]!];
      diag = up;
    }
  }
  return best;
}

/** The ayahs similar to one ayah, the closest first. */
export function similarTo(index: Q2SimilarIndex, s: number, a: number, limit = 12): SimilarMatch[] {
  const self = `${s}:${a}`;
  const words = index.keys.get(self);
  if (!words || words.length < MIN_RUN) return [];
  const candidates = new Set<string>();
  for (let i = 0; i + MIN_RUN <= words.length; i++) {
    for (const at of index.grams.get(words.slice(i, i + MIN_RUN).join(" ")) ?? []) {
      const key = at.slice(0, at.lastIndexOf(":"));
      if (key !== self) candidates.add(key);
    }
  }
  const out: SimilarMatch[] = [];
  for (const key of candidates) {
    const other = index.keys.get(key)!;
    const [mine, theirs, length] = longestRun(words, other);
    if (length < MIN_RUN) continue;
    const [os, oa] = key.split(":").map(Number) as [number, number];
    out.push({
      s: os,
      a: oa,
      start: theirs + 1,
      length,
      otherStart: mine + 1,
      identical: length === words.length && length === other.length,
    });
  }
  return out
    .sort((x, y) => Number(y.identical) - Number(x.identical) || y.length - x.length || x.s - y.s || x.a - y.a)
    .slice(0, limit);
}
