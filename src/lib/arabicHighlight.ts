/**
 * Finds a search term in Arabic text the way the search matched it (no
 * harakat, any alef form), and gives back the original text cut into plain
 * and matched parts, so results can show the words that matched.
 */
import { normalizeArabicSearch } from "@/lib/arabic";

export type HighlightPart = { text: string; hit: boolean };

const MARK = /[ؐ-ًؚ-ٰٟۖ-ۭ]/;

/** The text with each letter's place in the original, harakat left out. */
function fold(text: string): { folded: string; at: number[] } {
  let folded = "";
  const at: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (MARK.test(ch)) continue;
    folded += normalizeArabicSearch(ch);
    at.push(i);
  }
  return { folded, at };
}

/** Where each match of the term starts and ends in the original text. */
export function findArabicMatches(text: string, query: string): [number, number][] {
  const term = normalizeArabicSearch(query.trim());
  if (term.length < 2) return [];
  const { folded, at } = fold(text);
  const out: [number, number][] = [];
  let from = 0;
  for (;;) {
    const i = folded.indexOf(term, from);
    if (i < 0) break;
    let end = at[i + term.length - 1]! + 1;
    while (end < text.length && MARK.test(text[end]!)) end++;
    out.push([at[i]!, end]);
    from = i + term.length;
  }
  return out;
}

/**
 * A short window of the text around the first match (whole words, with «…»
 * where it was cut), split into plain and matched parts. Without a match,
 * the start of the text.
 */
export function highlightWindow(text: string, query: string, size = 170): HighlightPart[] {
  const matches = findArabicMatches(text, query);
  let start = 0;
  if (matches.length && matches[0]![0] > size * 0.35) {
    start = matches[0]![0] - Math.round(size * 0.3);
    const space = text.lastIndexOf(" ", start);
    start = space > 0 ? space + 1 : start;
  }
  let end = Math.min(text.length, start + size);
  if (end < text.length) {
    const space = text.indexOf(" ", end);
    end = space > 0 && space - end < 24 ? space : end;
  }
  const parts: HighlightPart[] = [];
  if (start > 0) parts.push({ text: "…", hit: false });
  let pos = start;
  for (const [a, b] of matches) {
    if (b <= start || a >= end) continue;
    const s = Math.max(a, start);
    const e = Math.min(b, end);
    if (s > pos) parts.push({ text: text.slice(pos, s), hit: false });
    parts.push({ text: text.slice(s, e), hit: true });
    pos = e;
  }
  if (pos < end) parts.push({ text: text.slice(pos, end), hit: false });
  if (end < text.length) parts.push({ text: "…", hit: false });
  return parts;
}
