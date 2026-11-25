/**
 * «القرآن ٢» — finding an ayah from a few words recited aloud.
 *
 * The speech recogniser writes everyday spelling and makes mistakes. Each heard
 * word is looked up the way search does (data/search.ts), then each ayah is
 * scored by the longest chain of heard words it holds in the same order, side
 * by side; one word may be missing or misheard on either side. The ayahs with
 * the longest chains come first.
 */
import { queryKey, skeletonKey } from "./arabic";
import type { AyahHit, Q2SearchIndex, WordRef } from "./search";

export type RecitedHit = AyahHit & { run: number };

const MAX_WORDS = 40;

function refsFor(index: Q2SearchIndex, token: string): WordRef[] {
  const out = [...(index.exact.get(token) ?? [])];
  const sk = skeletonKey(token);
  if (sk.length >= 3) {
    const seen = new Set(out.map((r) => `${r.s}:${r.a}:${r.w}`));
    for (const r of index.skeleton.get(sk) ?? []) if (!seen.has(`${r.s}:${r.a}:${r.w}`)) out.push(r);
  }
  return out;
}

export function findRecited(index: Q2SearchIndex, transcript: string, limit = 5): RecitedHit[] {
  const tokens = transcript
    .split(/\s+/)
    .map(queryKey)
    .filter((t) => t.length >= 2)
    .slice(-MAX_WORDS);
  if (tokens.length < 2) return [];

  // Ayah → the (heard word, ayah word) pairs that match.
  const byAyah = new Map<string, Array<[number, number]>>();
  tokens.forEach((token, ti) => {
    for (const r of refsFor(index, token)) {
      const key = `${r.s}:${r.a}`;
      const list = byAyah.get(key);
      if (list) list.push([ti, r.w]);
      else byAyah.set(key, [[ti, r.w]]);
    }
  });

  const hits: RecitedHit[] = [];
  for (const [key, pairs] of byAyah) {
    if (new Set(pairs.map((p) => p[0])).size < 2) continue;
    pairs.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    const chain = new Map<string, { len: number; prev: string | null; w: number }>();
    let best: { len: number; key: string } = { len: 0, key: "" };
    for (const [ti, w] of pairs) {
      let len = 1;
      let prev: string | null = null;
      for (let dt = 1; dt <= 2; dt++) {
        for (let dw = 1; dw <= 2; dw++) {
          const before = chain.get(`${ti - dt}:${w - dw}`);
          if (before && before.len + 1 > len) {
            len = before.len + 1;
            prev = `${ti - dt}:${w - dw}`;
          }
        }
      }
      const k = `${ti}:${w}`;
      if (!chain.has(k) || chain.get(k)!.len < len) chain.set(k, { len, prev, w });
      if (len > best.len) best = { len, key: k };
    }
    if (best.len < Math.min(3, tokens.length)) continue;
    const words: number[] = [];
    for (let k: string | null = best.key; k; k = chain.get(k)?.prev ?? null) words.unshift(chain.get(k)!.w);
    const [s, a] = key.split(":").map(Number) as [number, number];
    hits.push({ s, a, words, phrase: true, run: best.len });
  }
  return hits.sort((x, y) => y.run - x.run || x.s - y.s || x.a - y.a).slice(0, limit);
}
