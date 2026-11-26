/**
 * «القرآن الكريم» — questions on similar ayahs: the words two ayahs share, the
 * surah you are in, and which continuation belongs here. Built from the
 * similar-ayah index, so every question and answer is the text itself.
 */
import type { Q2Text } from "../data/text";
import { plainKey } from "../data/arabic";
import { similarTo, type Q2SimilarIndex } from "../data/similar";

export type DrillQuestion = {
  s: number;
  a: number;
  /** The shared words, as written in this ayah. */
  lead: string;
  /** The continuations: the right one is `answer`. */
  options: string[];
  answer: number;
  /** The ayahs the other options come from. */
  others: Array<{ s: number; a: number }>;
};

const NEXT_WORDS = 3;

function shuffle<T>(list: T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function buildDrill(options: {
  text: Q2Text;
  index: Q2SimilarIndex;
  ayahs: Array<{ s: number; a: number }>;
  count: number;
  random?: () => number;
}): DrillQuestion[] {
  const { text, index, ayahs, count } = options;
  const random = options.random ?? Math.random;
  const words = (s: number, a: number) => text.surahs[s - 1]?.ayahs[a - 1]?.words.map((w) => w.text) ?? [];
  const out: DrillQuestion[] = [];
  for (const { s, a } of shuffle(ayahs, random)) {
    if (out.length >= count) break;
    const mine = words(s, a);
    const seen = new Set<string>();
    let lead = "";
    let right = "";
    const others: Array<{ s: number; a: number; text: string }> = [];
    for (const m of similarTo(index, s, a, 20)) {
      if (m.identical) continue;
      const myNext = mine.slice(m.otherStart - 1 + m.length, m.otherStart - 1 + m.length + NEXT_WORDS).join(" ");
      const theirs = words(m.s, m.a);
      const theirNext = theirs.slice(m.start - 1 + m.length, m.start - 1 + m.length + NEXT_WORDS).join(" ");
      if (!myNext || !theirNext || plainKey(myNext) === plainKey(theirNext)) continue;
      if (!lead) {
        lead = mine.slice(m.otherStart - 1, m.otherStart - 1 + m.length).join(" ");
        right = myNext;
        seen.add(plainKey(myNext));
      }
      // Only ayahs that share this same opening are fair alternatives.
      const theirLead = theirs.slice(m.start - 1, m.start - 1 + m.length).join(" ");
      if (plainKey(theirLead) !== plainKey(lead) || seen.has(plainKey(theirNext))) continue;
      seen.add(plainKey(theirNext));
      others.push({ s: m.s, a: m.a, text: theirNext });
      if (others.length >= 3) break;
    }
    if (!lead || !others.length) continue;
    const choices = shuffle([right, ...others.map((o) => o.text)], random);
    out.push({ s, a, lead, options: choices, answer: choices.indexOf(right), others: others.map(({ s: os, a: oa }) => ({ s: os, a: oa })) });
  }
  return out;
}
