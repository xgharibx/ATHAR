/**
 * «حبر من نور» — how a new answer is written onto the screen.
 *
 * The server sends an answer only once every verse and hadith in it has been
 * checked, so it arrives whole. Shown whole it lands at once, like a page
 * dropped in front of the reader. Instead it is written: word after word in
 * reading order, each word rising out of a soft blur with a brief glow of the
 * theme's light that cools into ink; a verse or hadith card unfolds when the
 * writing reaches it, and its text is then written in turn, a little slower
 * for the Quran.
 *
 * All of it is CSS animation with a delay per word (`--d`), worked out here
 * from the text, so the page renders once and the browser does the rest.
 * This module plans the timing; ReplyContent applies it.
 */
import { splitIntoSegments } from "@/lib/companionBlocks";
import { extractSources, parseHadithBlock, parseVerseBlock } from "@/lib/companionEvidence";

/** Fastest and slowest pace per word, and the longest a whole answer may take. */
const STEP_MAX_MS = 34;
const STEP_MIN_MS = 3;
const TOTAL_MAX_MS = 6500;
/** Pauses, counted in words: before a card, after it, before a button. */
export const CARD_GAP = 5;
export const CARD_TEXT_LEAD = 3;
/** Quranic text is written more slowly than prose. */
export const VERSE_PACE = 1.5;
/** How long one word takes to settle (matches the CSS animation). */
export const WORD_SETTLE_MS = 620;

/** Words as they will appear, for a short markdown paragraph. */
export function countWords(markdown: string): number {
  return markdown
    .replace(/\[([^\]\n]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#>]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

export type RevealPlan = {
  /** Milliseconds per word. */
  step: number;
  /** When the last word has settled, from the start. */
  totalMs: number;
  /** Words (and pauses) in the whole answer. */
  units: number;
};

/** Units the answer takes, in the same order and measure ReplyContent uses. */
function countUnits(text: string): number {
  let units = 0;
  let sources = 0;
  for (const segment of splitIntoSegments(text)) {
    if (segment.kind === "action") {
      units += CARD_GAP;
      continue;
    }
    if (segment.kind === "text") {
      const split = extractSources(segment.text);
      sources += split.sources.length;
      units += countWords(split.text);
      continue;
    }
    const body = segment.calloutKind === "hadith"
      ? parseHadithBlock(segment.text).text
      : segment.calloutKind === "verse"
        ? parseVerseBlock(segment.text).text
        : segment.text;
    const pace = segment.calloutKind === "verse" ? VERSE_PACE : 1;
    units += CARD_GAP + CARD_TEXT_LEAD + Math.ceil(countWords(body) * pace) + 2;
  }
  return units + sources;
}

export function planReveal(text: string): RevealPlan {
  const units = Math.max(1, countUnits(text));
  const step = Math.max(STEP_MIN_MS, Math.min(STEP_MAX_MS, TOTAL_MAX_MS / units));
  return { step, units, totalMs: Math.round(units * step + WORD_SETTLE_MS) };
}

/** True when the reader asked the phone, or the app, for less motion. */
export function prefersStillText(): boolean {
  if (typeof window === "undefined") return true;
  if (document.documentElement.classList.contains("reduce-motion")) return true;
  // Where the motion preference cannot be read, the text is shown still.
  if (typeof window.matchMedia !== "function") return true;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}
