/**
 * «القرآن الكريم» — the printed page: on which of the 15 lines of the Madani mushaf
 * each word stands (Quran.com API v4, word line numbers). Only the line number
 * is taken; the words are this section's own Tanzil text.
 *
 * Checked against the whole Quran (docs/QURAN_V2.md): Quran.com and this section
 * give every one of the 6236 ayahs the same words (77,429) and the same page.
 * Each ayah is checked again when loaded; one that does not line up is left out
 * of the page view, which then says so.
 */
import { cached } from "./cache";
import { layoutSurah } from "./layout";

/** Per ayah, the line (1–15) of each word on its page; null when it does not line up. */
export type Q2SurahLines = Array<number[] | null>;

type ApiVerse = { verse_number?: number; words?: Array<{ char_type_name?: string; position?: number; line_number?: number }> };

export function parseLines(verses: ApiVerse[], wordCounts: number[]): Q2SurahLines {
  const out: Q2SurahLines = wordCounts.map(() => null);
  for (const v of verses) {
    const a = v.verse_number ?? 0;
    if (a < 1 || a > wordCounts.length) continue;
    const lines = (v.words ?? [])
      .filter((w) => w.char_type_name === "word")
      .sort((x, y) => (x.position ?? 0) - (y.position ?? 0))
      .map((w) => w.line_number ?? 0);
    out[a - 1] = lines.length === wordCounts[a - 1] && lines.every((l) => l >= 1 && l <= 15) ? lines : null;
  }
  return out;
}

async function fetchPage(s: number, page: number): Promise<{ verses: ApiVerse[]; pages: number }> {
  const res = await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${s}?words=true&word_fields=line_number&per_page=50&page=${page}`);
  if (!res.ok) throw new Error(`lines: HTTP ${res.status}`);
  const body = (await res.json()) as { verses?: ApiVerse[]; pagination?: { total_pages?: number } };
  return { verses: body.verses ?? [], pages: body.pagination?.total_pages ?? 1 };
}

export async function loadSurahLines(s: number, wordCounts: number[]): Promise<Q2SurahLines> {
  // The Madina mushaf's own lines, kept in the app (the same lines as the Madina page view).
  try {
    const verses = await layoutSurah(s);
    if (verses.length) return parseLines(verses, wordCounts);
  } catch {
    // The app's copy did not load: the network, as before.
  }
  return cached(`lines:${s}`, async () => {
    const first = await fetchPage(s, 1);
    const rest = await Promise.all(Array.from({ length: Math.max(0, first.pages - 1) }, (_, i) => fetchPage(s, i + 2)));
    return parseLines([first, ...rest].flatMap((p) => p.verses), wordCounts);
  });
}

export type PageWord = { s: number; a: number; n: number; text: string; after?: string; before?: string; end?: boolean };
export type PageLine =
  | { kind: "words"; words: PageWord[] }
  | { kind: "surah"; s: number }
  | { kind: "basmala"; s: number }
  | { kind: "blank" };

/** How many lines come before a surah's text: its title, and the basmala but for al-Fatiha and at-Tawba. */
const headLines = (s: number) => (s === 1 || s === 9 ? 1 : 2);

/**
 * The 15 lines of a page from its ayahs and their line numbers. Lines with no
 * words before a surah's first word hold its title and, but for at-Tawba and
 * al-Fatiha (whose first ayah is the basmala), the basmala. When a surah's text
 * starts too near the top for them, they stand at the foot of the page before,
 * as printed: `next` is the surah beginning on the next page, and the line its
 * text starts on.
 */
export function layPage(
  ayahs: Array<{ s: number; a: number; words: Array<{ n: number; text: string; after?: string }>; before?: string }>,
  linesOf: (s: number, a: number) => number[] | null,
  next?: { s: number; line: number } | null,
): PageLine[] | null {
  const lines: PageLine[] = Array.from({ length: 15 }, () => ({ kind: "blank" }));
  for (const ayah of ayahs) {
    const ls = linesOf(ayah.s, ayah.a);
    if (!ls) return null;
    if (ayah.a === 1) {
      const first = ls[0]!;
      if (headLines(ayah.s) === 1) {
        if (first - 1 >= 1) lines[first - 2] = { kind: "surah", s: ayah.s };
      } else {
        if (first - 2 >= 1) lines[first - 3] = { kind: "surah", s: ayah.s };
        if (first - 1 >= 1) lines[first - 2] = { kind: "basmala", s: ayah.s };
      }
    }
    ayah.words.forEach((w, i) => {
      const at = ls[i]! - 1;
      const line = lines[at]!;
      const word: PageWord = { s: ayah.s, a: ayah.a, n: w.n, text: w.text, after: w.after, before: i === 0 ? ayah.before : undefined, end: i === ayah.words.length - 1 };
      if (line.kind === "words") line.words.push(word);
      else lines[at] = { kind: "words", words: [word] };
    });
  }
  if (next) {
    // What of the next surah's head does not fit above its text on its own page.
    const spill = headLines(next.s) - (next.line - 1);
    const head: PageLine[] = headLines(next.s) === 1 ? [{ kind: "surah", s: next.s }] : [{ kind: "surah", s: next.s }, { kind: "basmala", s: next.s }];
    head.slice(0, Math.max(0, spill)).forEach((item, i, shown) => {
      const at = 15 - shown.length + i;
      if (lines[at]!.kind === "blank") lines[at] = item;
    });
  }
  return lines;
}
