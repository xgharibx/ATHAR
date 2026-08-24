/**
 * What a clip is *about*, inferred from its title.
 *
 * The feed has six channels and 7,551 clips, so knowing which channel someone
 * likes barely narrows anything — one channel alone holds 88% of the library.
 * Subject is where the real signal is: someone who watches الرقية and الحسد
 * clips through to the end wants more of those, and that preference cuts
 * across every channel.
 *
 * Titles are the only text available (the index carries no tags or category),
 * so this is deliberately shallow: normalise, drop the furniture, keep the
 * words that carry meaning. No stemming — Arabic stemming done badly conflates
 * unrelated roots, and done well is a library this app does not need.
 */

/** Harakat (fatha…sukun) plus the superscript alef, and tatweel. */
const DIACRITICS = /[ً-ْٰـ]/g;

/** Anything that is not an Arabic letter or a digit is a separator. */
const NOT_WORD = /[^ء-غف-ي0-9]+/g;

/**
 * Words too common to say anything about subject. Particles, pronouns,
 * question words, and the handful of verbs that open half the titles in the
 * library ("حكم", "معنى" and friends are deliberately NOT here — they are
 * genuinely topical).
 */
const RAW_STOPWORDS = [
  "في", "من", "على", "عن", "الى", "مع", "هذا", "هذه", "ذلك", "التي", "الذي",
  "ما", "ماذا", "لماذا", "كيف", "متى", "اين", "هل", "لا", "لم", "لن", "ان",
  "انه", "انها", "كان", "كانت", "يكون", "قد", "كل", "بعض", "بين", "بعد",
  "قبل", "عند", "هو", "هي", "هم", "نحن", "انت", "انا", "او", "ثم", "حتى",
  "اذا", "لكن", "الا", "غير", "دون", "كما", "قال", "يقول", "قوله", "شيخ", "الشيخ",
  "ابو", "ام", "بن", "ابن", "الجزء", "الحلقة", "مقطع",
  // Formulae that follow a name or a mention rather than describing a subject.
  "تعالى", "رضي", "عليه", "عنه", "سلام", "صلى", "وسلم",
];

/**
 * Fold the spellings that differ only by orthography.
 *
 * أ/إ/آ→ا and ى→ي and ة→ه are the three that actually matter here: titles are
 * written by six different channels with no shared convention, so the same
 * word arrives spelled several ways and would otherwise count as several
 * different topics.
 */
export function normaliseArabic(input: string): string {
  return input
    .replace(DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
}

/**
 * The stopwords, folded the same way titles are.
 *
 * This matters more than it looks: `على` normalises to `علي`, which is also
 * the name Ali. Comparing raw stopwords against normalised tokens let the
 * three commonest prepositions — على, إلى, إلا — through as if they were
 * subjects, on hundreds of titles each.
 */
const STOPWORDS = new Set(RAW_STOPWORDS.map(normaliseArabic));

/** Strip a leading "700-" style episode number, which many titles carry. */
const LEADING_NUMBER = /^\s*\d+\s*[-–—.)]\s*/;

/**
 * The meaningful words in a title, deduplicated.
 *
 * Short tokens are dropped: in Arabic almost everything under three letters is
 * a particle, and keeping them makes every title look similar to every other.
 */
export function topicTokens(title: string, extraStop?: ReadonlySet<string>): string[] {
  if (!title) return [];
  const cleaned = normaliseArabic(title.replace(LEADING_NUMBER, ""));
  const out = new Set<string>();
  for (const raw of cleaned.split(NOT_WORD)) {
    if (raw.length < 3) continue;
    if (/^\d+$/.test(raw)) continue;
    // "ال" prefix is the definite article; fold it so الرقية and رقية agree.
    const token = raw.length > 4 && raw.startsWith("ال") ? raw.slice(2) : raw;
    if (token.length < 3) continue;
    if (STOPWORDS.has(token)) continue;
    if (extraStop?.has(token)) continue;
    out.add(token);
  }
  return [...out];
}

/** How many topic weights to keep. Beyond this the tail is noise. */
export const TOPIC_MEMORY = 300;

/**
 * Fold a title's tokens into the running affinity map.
 *
 * `delta` is positive for engagement and negative for a fast skip, so
 * disinterest is recorded as deliberately as interest. Weights are clamped:
 * without a ceiling a single obsession would swamp the feed, and without a
 * floor a topic could be buried so deep it never recovers.
 */
export function foldTopics(
  affinity: Record<string, number>,
  title: string,
  delta: number,
  extraStop?: ReadonlySet<string>,
): Record<string, number> {
  const tokens = topicTokens(title, extraStop);
  if (!tokens.length) return affinity;

  const next = { ...affinity };
  for (const t of tokens) {
    const v = (next[t] ?? 0) + delta;
    next[t] = Math.max(-3, Math.min(6, v));
  }

  const excess = Object.keys(next).length - TOPIC_MEMORY;
  if (excess > 0) {
    // Drop the weakest feelings first — a weight near zero says nothing.
    //
    // The words just folded are exempt. Without that, a newly discovered
    // interest arrives at the same weight as the 300 topics already held, sorts
    // level with them, and is dropped by the very prune it triggered — so taste
    // would freeze around whatever happened to be learned first and could never
    // change. Ties fall to insertion order, which retires the oldest.
    const touched = new Set(tokens);
    const prunable = Object.keys(next).filter((k) => !touched.has(k));
    prunable.sort((a, b) => Math.abs(next[a] ?? 0) - Math.abs(next[b] ?? 0));
    for (const k of prunable.slice(0, excess)) delete next[k];
  }
  return next;
}

/**
 * How well a title matches what the viewer has shown interest in, as roughly
 * -1..1.
 *
 * Averaged over the title's own tokens rather than summed, so a long title
 * does not outscore a precise one simply by containing more words.
 */
export function topicAffinity(
  affinity: Record<string, number>,
  title: string,
  extraStop?: ReadonlySet<string>,
): number {
  const tokens = topicTokens(title, extraStop);
  if (!tokens.length) return 0;
  let sum = 0;
  for (const t of tokens) sum += affinity[t] ?? 0;
  return Math.max(-1, Math.min(1, sum / tokens.length / 3));
}

/**
 * The words that make up the channels' own names.
 *
 * Most channels sign every title — "… - عثمان الخميس" appears on 5,352 of the
 * 7,551 clips. Those tokens describe who is speaking, not what about, and
 * left in they would make topic affinity a second, noisier copy of the channel
 * preference the ranker already models directly.
 */
export function channelNameStopwords(names: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const name of names) for (const t of topicTokens(name)) out.add(t);
  return out;
}
