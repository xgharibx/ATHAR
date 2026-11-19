/**
 * The chapters («الكتب») of each hadith collection, in Arabic.
 *
 * The bundled packs came without their chapters (the importer read the wrong
 * field), so a book of seven thousand hadiths was one flat list. The chapter
 * ranges come from the same hadith-api source as the texts; their Arabic
 * names («كتاب بدء الوحي»، «كتاب الإيمان»…) are the collections' own
 * classical titles, matched to each range one for one. The file is small
 * (≈24 KB), so it is loaded once and applied to every pack, cached or fresh.
 */
import type { HadithItem, HadithPack, HadithSection } from "@/data/hadithTypes";
import { publicDataUrl } from "@/data/publicAssetUrl";

type RawChapter = { id: number; t: string; f: number; l: number };

let pending: Promise<Record<string, RawChapter[]>> | null = null;

function loadChapterTable(): Promise<Record<string, RawChapter[]>> {
  pending ??= Promise.resolve()
    .then(() => fetch(publicDataUrl("data/hadith/sections.json")))
    .then((r) => (r.ok ? (r.json() as Promise<Record<string, RawChapter[]>>) : Promise.reject(new Error(`sections ${r.status}`))))
    .catch(() => {
      pending = null;
      return {};
    });
  return pending;
}

/** «كتاب الإيمان» → «الإيمان», for chips and tight places. */
export function shortChapterTitle(title: string): string {
  return title.replace(/^(كتاب|أبواب)\s+/, "");
}

/** Gives each hadith its chapter, using `n` against each chapter's first number. */
export function assignChapters(hadiths: HadithItem[], chapters: HadithSection[]): HadithItem[] {
  if (!chapters.length) return hadiths;
  const firsts = chapters.map((c) => c.first);
  return hadiths.map((h) => {
    let lo = 0;
    let hi = firsts.length - 1;
    let found = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (firsts[mid]! <= h.n) {
        found = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    const id = chapters[found]!.id;
    return h.s === id ? h : { ...h, s: id };
  });
}

/** Adds the Arabic chapters to a pack that has none. Packs that already carry chapters are left as they are. */
/** The books divided into chapters; the two forties are one list each. */
const CHAPTERED = new Set(["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"]);

export async function withChapters(pack: HadithPack): Promise<HadithPack> {
  if (pack.sections.length > 1 || !CHAPTERED.has(pack.key)) return pack;
  const table = await loadChapterTable();
  const raw = table[pack.key];
  if (!raw?.length) return pack;
  const sections: HadithSection[] = raw
    .map((c) => ({ id: c.id, title: c.t, first: c.f, last: c.l }))
    .sort((a, b) => a.first - b.first);
  return { ...pack, sections, hadiths: assignChapters(pack.hadiths, sections) };
}

/** How many chapters each book has, for the library cards. */
export async function loadChapterCounts(): Promise<Record<string, number>> {
  const table = await loadChapterTable();
  return Object.fromEntries(Object.entries(table).map(([k, v]) => [k, v.length]));
}
