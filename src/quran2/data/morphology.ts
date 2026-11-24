/**
 * «القرآن ٢» — the language of every word: root, lemma and grammar.
 *
 * Source: the Quranic Arabic Corpus (corpus.quran.com) version 0.4, in the Arabic
 * edition of mustafa0x/quran-morphology, pinned to one commit. GNU GPL 3.0: it
 * is fetched by the app while it runs (Athar does not redistribute it), kept on
 * the device, and credited with a link wherever it is shown.
 *
 * Line format: "surah:ayah:word:segment<TAB>form<TAB>N|V|P<TAB>TAG|ROOT:…|LEM:…|…"
 */
import { cached } from "./cache";
import type { Q2Pos } from "./grammar";

export const MORPHOLOGY_COMMIT = "8f38b39016824284f9ed16ae15069ff9102c4acf";
export const MORPHOLOGY_URL = `https://cdn.jsdelivr.net/gh/mustafa0x/quran-morphology@${MORPHOLOGY_COMMIT}/quran-morphology.txt`;
export const MORPHOLOGY_CREDIT = {
  name: "المدوّنة القرآنية العربية (Quranic Arabic Corpus)",
  url: "https://corpus.quran.com",
  licence: "GNU GPL 3.0",
};

export type Q2Segment = { form: string; pos: Q2Pos; tags: string[]; root?: string; lemma?: string };

/** "s:a:w" */
export type WordKey = string;

export type Q2Morphology = {
  segments: Map<WordKey, Q2Segment[]>;
  rootOf: Map<WordKey, string>;
  lemmaOf: Map<WordKey, string>;
  /** Root → its words, in mushaf order. */
  roots: Map<string, WordKey[]>;
  lemmas: Map<string, WordKey[]>;
  /** Lemma → its root (when it has one). */
  lemmaRoot: Map<string, string>;
  wordCount: number;
};

export function parseMorphology(raw: string): Q2Morphology {
  const segments = new Map<WordKey, Q2Segment[]>();
  const rootOf = new Map<WordKey, string>();
  const lemmaOf = new Map<WordKey, string>();
  const roots = new Map<string, WordKey[]>();
  const lemmas = new Map<string, WordKey[]>();
  const lemmaRoot = new Map<string, string>();

  for (const line of raw.split("\n")) {
    if (!line) continue;
    const [loc, form, pos, feats] = line.split("\t");
    if (!loc || !form || !pos) continue;
    const parts = loc.split(":");
    const key = `${parts[0]}:${parts[1]}:${parts[2]}`;
    const tags: string[] = [];
    let root: string | undefined;
    let lemma: string | undefined;
    for (const f of (feats ?? "").split("|")) {
      if (!f) continue;
      if (f.startsWith("ROOT:")) root = f.slice(5);
      else if (f.startsWith("LEM:")) lemma = f.slice(4);
      else tags.push(f);
    }
    const segment: Q2Segment = { form, pos: pos as Q2Pos, tags, root, lemma };
    const list = segments.get(key);
    if (list) list.push(segment);
    else segments.set(key, [segment]);

    const isAffix = tags.includes("PREF") || tags.includes("SUFF");
    if (root && !rootOf.has(key)) {
      rootOf.set(key, root);
      const r = roots.get(root);
      if (r) r.push(key);
      else roots.set(root, [key]);
    }
    if (lemma && !isAffix && !lemmaOf.has(key)) {
      lemmaOf.set(key, lemma);
      const l = lemmas.get(lemma);
      if (l) l.push(key);
      else lemmas.set(lemma, [key]);
      if (root) lemmaRoot.set(lemma, root);
    }
  }
  return { segments, rootOf, lemmaOf, roots, lemmas, lemmaRoot, wordCount: segments.size };
}

let morphPromise: Promise<Q2Morphology> | null = null;

export function loadMorphology(): Promise<Q2Morphology> {
  if (!morphPromise) {
    morphPromise = cached(`morph:${MORPHOLOGY_COMMIT}`, async () => {
      const res = await fetch(MORPHOLOGY_URL);
      if (!res.ok) throw new Error(`morphology: HTTP ${res.status}`);
      const text = await res.text();
      if (!text.startsWith("1:1:1:1\t")) throw new Error("morphology: unexpected file");
      return text;
    })
      .then(parseMorphology)
      .catch((error) => {
        morphPromise = null;
        throw error;
      });
  }
  return morphPromise;
}

export function wordKey(s: number, a: number, w: number): WordKey {
  return `${s}:${a}:${w}`;
}

export function splitKey(key: WordKey): [number, number, number] {
  const [s, a, w] = key.split(":").map(Number);
  return [s!, a!, w!];
}

/** Root letters spaced for reading: «رحم» → «ر ح م». */
export function spacedRoot(root: string): string {
  return [...root].join(" ");
}
