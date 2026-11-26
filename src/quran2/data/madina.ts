/**
 * «القرآن الكريم» — «مصحف المدينة»: a page drawn the way the Madina mushaf is printed,
 * with the King Fahd Complex's own page fonts (QCF V2, one font per page: each
 * word of the page is one glyph, as on the printed page) and the glyph codes and
 * line numbers Quran.com publishes for them.
 *
 * Every glyph is tied to this section's own word (the Tanzil text, Corpus
 * numbering): Quran.com numbers the words the same way (checked on all 6236
 * ayahs, docs/QURAN_V2.md). An ayah whose word count does not match ours is
 * still drawn, but its words are not linked to anything.
 */
import { cached, cacheDelete, cachedKeys } from "./cache";
import { layoutPage } from "./layout";

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

export async function loadMadinaPage(page: number, wordCount: (s: number, a: number) => number | undefined): Promise<MadinaPage> {
  // Kept in the app: the page opens with no connection.
  try {
    const verses = await layoutPage(page);
    if (verses.length) return parseMadinaPage(page, verses, wordCount);
  } catch {
    // The app's copy did not load: the network, as before.
  }
  return cached(`madina:${page}`, async () => {
    const res = await fetch(`https://api.quran.com/api/v4/verses/by_page/${page}?words=true&word_fields=code_v2,line_number&mushaf=1&per_page=50`);
    if (!res.ok) throw new Error(`madina: HTTP ${res.status}`);
    const body = (await res.json()) as { verses?: ApiVerse[] };
    return parseMadinaPage(page, body.verses ?? [], wordCount);
  });
}

const fontLoads = new Map<string, Promise<string>>();

/** Which page fonts: plain (QCF V2), or with the tajweed colours (QCF V4, same glyphs). */
export type MadinaFontKind = "plain" | "tajweed" | "tajweed-dark";

/**
 * The colour fonts come in two formats: COLRv1 (Chromium: Android, desktop)
 * and OpenType-SVG with its colours drawn in (WebKit: iPhone, iPad, Safari),
 * in a light and a dark printing.
 */
function tajweedFormat(dark: boolean): string {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const webkitOnly = /AppleWebKit/.test(ua) && !/(Chrome|Chromium|CriOS|Edg|Android)/.test(ua);
  const firefox = /Firefox|FxiOS/.test(ua);
  if (webkitOnly || firefox) return `ot-svg/${dark ? "dark" : "light"}/woff2`;
  return "colrv1/woff2";
}

export function madinaFontUrl(page: number, kind: MadinaFontKind): string {
  if (kind === "plain") return `https://static.qurancdn.com/fonts/quran/hafs/v2/woff2/p${page}.woff2`;
  return `https://verses.quran.foundation/fonts/quran/hafs/v4/${tajweedFormat(kind === "tajweed-dark")}/p${page}.woff2`;
}

/** Where a page's font is kept on the device. */
function fontKey(page: number, kind: MadinaFontKind): string {
  return kind === "plain" ? `madina-font:${page}` : `madina-font:${madinaFontUrl(page, kind)}`;
}

/** On Apple devices the colour fonts are drawn in (OpenType-SVG): several times larger. */
export function madinaTajweedIsSvg(): boolean {
  return tajweedFormat(false).startsWith("ot-svg");
}

/** How many of the 604 pages' fonts of this kind are on the device. */
export async function madinaFontsSaved(kind: MadinaFontKind): Promise<number> {
  const keys = new Set(await cachedKeys("madina-font:"));
  let n = 0;
  for (let p = 1; p <= 604; p++) if (keys.has(fontKey(p, kind))) n++;
  return n;
}

/** Keep every page's font of this kind on the device (the ones missing), a few at a time. */
export async function saveMadinaFonts(kind: MadinaFontKind, onProgress: (done: number, total: number) => void, signal?: AbortSignal): Promise<{ saved: number; total: number }> {
  const have = new Set(await cachedKeys("madina-font:"));
  let saved = 0;
  const todo: number[] = [];
  for (let p = 1; p <= 604; p++) {
    if (have.has(fontKey(p, kind))) saved++;
    else todo.push(p);
  }
  onProgress(saved, 604);
  let next = 0;
  const worker = async () => {
    while (next < todo.length && !signal?.aborted) {
      const p = todo[next++]!;
      try {
        await cached(fontKey(p, kind), async () => {
          const res = await fetch(madinaFontUrl(p, kind), { signal });
          if (!res.ok) throw new Error(`madina font: HTTP ${res.status}`);
          return res.arrayBuffer();
        });
        saved++;
      } catch {
        // Fetched again on the next try.
      }
      onProgress(saved, 604);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return { saved, total: 604 };
}

/** Remove the pages' fonts of this kind from the device. */
export async function removeMadinaFonts(kind: MadinaFontKind): Promise<void> {
  const keys = new Set(await cachedKeys("madina-font:"));
  const drop: string[] = [];
  for (let p = 1; p <= 604; p++) if (keys.has(fontKey(p, kind))) drop.push(fontKey(p, kind));
  await cacheDelete(drop);
}

/**
 * The page's own font, loaded once; resolves to its family name. The font's bytes
 * are fetched as data and kept on the device (so a page read once opens offline),
 * which also keeps the app's font policy (fonts from the app only) unchanged.
 */
export function madinaFont(page: number, kind: MadinaFontKind = "plain"): Promise<string> {
  const url = madinaFontUrl(page, kind);
  const id = `${kind}:${url}`;
  let p = fontLoads.get(id);
  if (!p) {
    const family = kind === "plain" ? `q2-madina-p${page}` : `q2-madina-${kind}-p${page}-${url.includes("colrv1") ? "c" : "s"}`;
    p = (async () => {
      const key = fontKey(page, kind);
      const bytes = await cached(key, async () => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`madina font: HTTP ${res.status}`);
        return res.arrayBuffer();
      });
      const face = new FontFace(family, bytes, { display: "block" });
      await face.load();
      document.fonts.add(face);
      return family;
    })().catch((error) => {
      fontLoads.delete(id);
      throw error;
    });
    fontLoads.set(id, p);
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
