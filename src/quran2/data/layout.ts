/**
 * «القرآن الكريم» — where every word stands on the Madina mushaf's 604 pages
 * (its line, and its glyph in the page's own font), kept in the app
 * (public/data/quran2/madina-layout.json.gz, tools/quran2/madina_layout.py),
 * so the printed page opens with no connection. Both page views use it: the
 * Madina page with its own fonts, and the page in the section's Tanzil text.
 */

/** [position in the ayah (0: the ayah's end marker), line 1–15, glyph code]. */
type LayoutWord = [number, number, string];
type LayoutPage = Array<[string, LayoutWord[]]>;

/** The shape the page parsers read (as Quran.com's API gives it). */
export type LayoutVerse = {
  verse_key: string;
  verse_number: number;
  words: Array<{ char_type_name: "word" | "end"; position: number; line_number: number; code_v2: string }>;
};

let loading: Promise<{ pages: LayoutVerse[][]; bySurah: Map<number, LayoutVerse[]> }> | null = null;

async function gunzipJson<T>(res: Response): Promise<T> {
  const bytes = new Uint8Array(await res.arrayBuffer());
  // Served as it is (a .gz file), or already decoded by a server that set its encoding.
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return JSON.parse(await new Response(stream).text()) as T;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

function load() {
  loading ??= (async () => {
    const res = await fetch(`${import.meta.env.BASE_URL ?? "/"}data/quran2/madina-layout.json.gz`);
    if (!res.ok) throw new Error(`layout: HTTP ${res.status}`);
    const raw = await gunzipJson<LayoutPage[]>(res);
    const bySurah = new Map<number, LayoutVerse[]>();
    const pages = raw.map((page) =>
      page.map(([key, words]) => {
        const v: LayoutVerse = {
          verse_key: key,
          verse_number: Number(key.split(":")[1]),
          words: words.map(([position, line, code]) => ({ char_type_name: position ? "word" : "end", position, line_number: line, code_v2: code })),
        };
        const s = Number(key.split(":")[0]);
        const list = bySurah.get(s);
        if (list) list.push(v);
        else bySurah.set(s, [v]);
        return v;
      }),
    );
    return { pages, bySurah };
  })().catch((error) => {
    loading = null;
    throw error;
  });
  return loading;
}

/** The ayahs of a page (1–604), with their words' lines and glyphs. */
export async function layoutPage(page: number): Promise<LayoutVerse[]> {
  const { pages } = await load();
  return pages[page - 1] ?? [];
}

/** The ayahs of a surah (an ayah across two pages is split: its parts are joined back). */
export async function layoutSurah(s: number): Promise<LayoutVerse[]> {
  const { bySurah } = await load();
  const joined = new Map<string, LayoutVerse>();
  for (const v of bySurah.get(s) ?? []) {
    const old = joined.get(v.verse_key);
    if (old) old.words = [...old.words, ...v.words];
    else joined.set(v.verse_key, { ...v, words: [...v.words] });
  }
  return [...joined.values()];
}
