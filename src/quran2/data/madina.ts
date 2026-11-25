/**
 * «القرآن ٢» — «مصحف المدينة»: a page drawn the way the Madina mushaf is printed,
 * with the King Fahd Complex's own page fonts (QCF V2, one font per page: each
 * word of the page is one glyph, as on the printed page) and the glyph codes and
 * line numbers Quran.com publishes for them.
 *
 * Every glyph is tied to this section's own word (the Tanzil text, Corpus
 * numbering): Quran.com numbers the words the same way (checked on all 6236
 * ayahs, docs/QURAN_V2.md). An ayah whose word count does not match ours is
 * still drawn, but its words are not linked to anything.
 */
import { cached } from "./cache";

export type MadinaGlyph = { s: number; a: number; /** word number, or 0 for the ayah's end marker */ n: number; line: number; code: string };
export type MadinaPage = { page: number; glyphs: MadinaGlyph[]; /** ayahs whose words matched ours */ linked: string[] };

type ApiWord = { char_type_name?: string; position?: number; line_number?: number; code_v2?: string };
type ApiVerse = { verse_key?: string; words?: ApiWord[] };

export function parseMadinaPage(page: number, verses: ApiVerse[], wordCount: (s: number, a: number) => number | undefined): MadinaPage {
  const glyphs: MadinaGlyph[] = [];
  const linked: string[] = [];
  for (const v of verses) {
    const [s, a] = (v.verse_key ?? "").split(":").map(Number) as [number, number];
    if (!s || !a) continue;
    const words = (v.words ?? []).filter((w) => typeof w.code_v2 === "string" && w.line_number);
    const count = words.filter((w) => w.char_type_name === "word").length;
    if (count === wordCount(s, a)) linked.push(`${s}:${a}`);
    for (const w of words) {
      glyphs.push({
        s,
        a,
        n: w.char_type_name === "word" ? w.position ?? 0 : 0,
        line: w.line_number!,
        code: w.code_v2!,
      });
    }
  }
  return { page, glyphs, linked };
}

export function loadMadinaPage(page: number, wordCount: (s: number, a: number) => number | undefined): Promise<MadinaPage> {
  return cached(`madina:${page}`, async () => {
    const res = await fetch(`https://api.quran.com/api/v4/verses/by_page/${page}?words=true&word_fields=code_v2,line_number&mushaf=1&per_page=50`);
    if (!res.ok) throw new Error(`madina: HTTP ${res.status}`);
    const body = (await res.json()) as { verses?: ApiVerse[] };
    return parseMadinaPage(page, body.verses ?? [], wordCount);
  });
}

const fontLoads = new Map<number, Promise<string>>();

/**
 * The page's own font, loaded once; resolves to its family name. The font's bytes
 * are fetched as data and kept on the device (so a page read once opens offline),
 * which also keeps the app's font policy (fonts from the app only) unchanged.
 */
export function madinaFont(page: number): Promise<string> {
  let p = fontLoads.get(page);
  if (!p) {
    const family = `q2-madina-p${page}`;
    p = (async () => {
      const bytes = await cached(`madina-font:${page}`, async () => {
        const res = await fetch(`https://static.qurancdn.com/fonts/quran/hafs/v2/woff2/p${page}.woff2`);
        if (!res.ok) throw new Error(`madina font: HTTP ${res.status}`);
        return res.arrayBuffer();
      });
      const face = new FontFace(family, bytes, { display: "block" });
      await face.load();
      document.fonts.add(face);
      return family;
    })().catch((error) => {
      fontLoads.delete(page);
      throw error;
    });
    fontLoads.set(page, p);
  }
  return p;
}

export type MadinaLine =
  | { kind: "glyphs"; glyphs: MadinaGlyph[] }
  | { kind: "surah"; s: number }
  | { kind: "basmala"; s: number }
  | { kind: "blank" };

const headLines = (s: number) => (s === 1 || s === 9 ? 1 : 2);

/**
 * The fifteen lines of a page: its glyphs on their lines, and, on the empty lines
 * before a surah's first word, its title and basmala (at the foot of the page
 * before when the printed mushaf puts them there: `next`).
 */
export function madinaLines(data: MadinaPage, next?: { s: number; line: number } | null): MadinaLine[] {
  const lines: MadinaLine[] = Array.from({ length: 15 }, () => ({ kind: "blank" }));
  const firstLine = new Map<number, number>();
  for (const g of data.glyphs) {
    const at = g.line - 1;
    if (at < 0 || at > 14) continue;
    const line = lines[at]!;
    if (line.kind === "glyphs") line.glyphs.push(g);
    else lines[at] = { kind: "glyphs", glyphs: [g] };
    if (g.a === 1 && !firstLine.has(g.s)) firstLine.set(g.s, g.line);
  }
  for (const [s, first] of firstLine) {
    const head: MadinaLine[] = headLines(s) === 1 ? [{ kind: "surah", s }] : [{ kind: "surah", s }, { kind: "basmala", s }];
    head.forEach((item, i) => {
      const at = first - 1 - head.length + i;
      if (at >= 0 && lines[at]!.kind === "blank") lines[at] = item;
    });
  }
  if (next) {
    const spill = headLines(next.s) - (next.line - 1);
    const head: MadinaLine[] = headLines(next.s) === 1 ? [{ kind: "surah", s: next.s }] : [{ kind: "surah", s: next.s }, { kind: "basmala", s: next.s }];
    head.slice(0, Math.max(0, spill)).forEach((item, i, shown) => {
      const at = 15 - shown.length + i;
      if (lines[at]!.kind === "blank") lines[at] = item;
    });
  }
  return lines;
}
