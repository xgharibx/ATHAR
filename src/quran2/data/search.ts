/**
 * «القرآن الكريم» — finding words in the Quran the way people type them.
 *
 * Every word of the text gets the keys of data/arabic.ts (everyday spelling,
 * with and without the small alef, and the consonant skeleton). A typed word
 * finds the words with the same key; if there are none, it finds the words
 * that contain it. An ayah matches when it holds every typed word; ayahs
 * where they come in the typed order, side by side, come first.
 */
import type { Q2Text } from "./text";
import { alefKey, plainKey, queryKey, skeletonKey } from "./arabic";

export type WordRef = { s: number; a: number; w: number };
export type AyahHit = { s: number; a: number; words: number[]; phrase: boolean };

export type Q2SearchIndex = {
  exact: Map<string, WordRef[]>;
  skeleton: Map<string, WordRef[]>;
  /** Every distinct everyday-spelling key, for "contains" matching. */
  plain: Map<string, WordRef[]>;
};

function push(map: Map<string, WordRef[]>, key: string, ref: WordRef) {
  if (!key) return;
  const list = map.get(key);
  if (list) list.push(ref);
  else map.set(key, [ref]);
}

export function buildSearchIndex(text: Q2Text): Q2SearchIndex {
  const exact = new Map<string, WordRef[]>();
  const skeleton = new Map<string, WordRef[]>();
  const plain = new Map<string, WordRef[]>();
  for (const surah of text.surahs) {
    for (const ayah of surah.ayahs) {
      for (const word of ayah.words) {
        const ref = { s: ayah.s, a: ayah.a, w: word.n };
        const p = plainKey(word.text);
        const al = alefKey(word.text);
        push(exact, p, ref);
        if (al !== p) push(exact, al, ref);
        push(plain, p, ref);
        const sk = skeletonKey(word.text);
        if (sk.length >= 3) push(skeleton, sk, ref);
      }
    }
  }
  return { exact, skeleton, plain };
}

/** The words a typed word stands for. */
export function findWord(index: Q2SearchIndex, typed: string): WordRef[] {
  const q = queryKey(typed);
  if (!q) return [];
  const seen = new Set<string>();
  const out: WordRef[] = [];
  const add = (refs: WordRef[] | undefined) => {
    for (const r of refs ?? []) {
      const k = `${r.s}:${r.a}:${r.w}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(r);
      }
    }
  };
  add(index.exact.get(q));
  const sk = skeletonKey(typed);
  if (sk.length >= 3) add(index.skeleton.get(sk));
  if (!out.length && q.length >= 2) {
    for (const [key, refs] of index.plain) if (key.includes(q)) add(refs);
  }
  return out;
}

export function searchText(index: Q2SearchIndex, query: string): AyahHit[] {
  const terms = query.split(/\s+/).map((t) => t.trim()).filter(Boolean).slice(0, 8);
  if (!terms.length) return [];
  const perTerm = terms.map((t) => findWord(index, t));
  const byAyah = new Map<string, Array<Set<number>>>();
  perTerm.forEach((refs, ti) => {
    for (const r of refs) {
      const key = `${r.s}:${r.a}`;
      let sets = byAyah.get(key);
      if (!sets) {
        sets = terms.map(() => new Set<number>());
        byAyah.set(key, sets);
      }
      sets[ti]!.add(r.w);
    }
  });
  const hits: AyahHit[] = [];
  for (const [key, sets] of byAyah) {
    if (sets.some((set) => set.size === 0)) continue;
    const [s, a] = key.split(":").map(Number) as [number, number];
    const words = [...new Set(sets.flatMap((set) => [...set]))].sort((x, y) => x - y);
    const phrase = terms.length > 1 && [...sets[0]!].some((start) => sets.every((set, i) => set.has(start + i)));
    hits.push({ s, a, words, phrase });
  }
  return hits.sort((x, y) => Number(y.phrase) - Number(x.phrase) || x.s - y.s || x.a - y.a);
}

/** Group word references into ayahs, in mushaf order. */
export function hitsFromWords(refs: WordRef[]): AyahHit[] {
  const map = new Map<string, AyahHit>();
  for (const r of refs) {
    const key = `${r.s}:${r.a}`;
    const hit = map.get(key);
    if (hit) hit.words.push(r.w);
    else map.set(key, { s: r.s, a: r.a, words: [r.w], phrase: false });
  }
  return [...map.values()].sort((x, y) => x.s - y.s || x.a - y.a);
}

/** How many hits fall in each of the 114 surahs. */
export function perSurah(hits: Array<{ s: number; words?: number[] }>, countWords = false): number[] {
  const counts = new Array(114).fill(0) as number[];
  for (const h of hits) counts[h.s - 1]! += countWords ? h.words?.length ?? 1 : 1;
  return counts;
}
