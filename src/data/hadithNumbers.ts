/**
 * The numbers hadiths are cited by, and the clean-up every loaded book goes
 * through before any screen sees it.
 *
 * The packs number entries one after another («n»), which is what routes,
 * bookmarks and notes are keyed on. People cite books by their printed
 * numbers instead: «صحيح مسلم ١١٤٤», not entry 2683. The printed number is
 * in the data («a»); Muslim writes the narrations sharing one number as
 * «1144.01», «1144.02»… This turns that into a short ref:
 *   "1144"   one entry under that number
 *   "1144/2" the second narration under 1144
 *   "i1"     the first hadith of Muslim's introduction (المقدمة)
 * The search index carries the same ref for each entry whose ref is not
 * simply its «n» (scripts/hadith-bundle.py writes it the same way).
 */
import { arNum } from "@/lib/formatNumber";
import { tidyHadithMarkup } from "@/lib/hadithText";
import type { HadithItem, HadithPack } from "@/data/hadithTypes";

const NORMALIZED = Symbol("hadith-normalized");

/** Short refs for every entry, in order (see the note above). */
export function hadithRefs(hadiths: readonly Pick<HadithItem, "a">[]): string[] {
  // Muslim gives printed numbers as strings; everything before the first
  // one is the introduction, which the printed numbering does not count.
  const printed = hadiths.some((h) => typeof h.a === "string");
  let inIntro = printed;
  let intro = 0;
  let prevKey: string | null = null;
  const keys: (string | null)[] = [];
  for (const h of hadiths) {
    if (inIntro && typeof h.a === "string") inIntro = false;
    if (inIntro) {
      keys.push(null);
      continue;
    }
    // A plain number among printed strings means the source had no printed
    // number for it: it is one more narration under the number before it.
    const key: string = printed && typeof h.a === "number" && prevKey ? prevKey : String(h.a).split(".")[0]!;
    keys.push(key);
    prevKey = key;
  }
  const size = new Map<string, number>();
  for (const k of keys) if (k) size.set(k, (size.get(k) ?? 0) + 1);
  const seen = new Map<string, number>();
  return keys.map((k) => {
    if (!k) return `i${++intro}`;
    if ((size.get(k) ?? 0) < 2) return k;
    const i = (seen.get(k) ?? 0) + 1;
    seen.set(k, i);
    return `${k}/${i}`;
  });
}

/** «١١٤٤»، «١١٤٤ (٢)» or «المقدمة ١». */
export function hadithRefLabel(ref: string): string {
  if (ref.startsWith("i")) return `المقدمة ${arNum(ref.slice(1))}`;
  const [num, sub] = ref.split("/");
  return sub ? `${arNum(num!)} (${arNum(sub)})` : arNum(num!);
}

/** The printed number to jump to, or null inside Muslim's introduction. */
export function hadithRefNumber(ref: string): number | null {
  if (ref.startsWith("i")) return null;
  const n = Number(ref.split("/")[0]);
  return Number.isFinite(n) ? n : null;
}

/** The number a hadith is cited by, in Arabic digits. */
export function hadithNumberLabel(item: Pick<HadithItem, "a" | "r">): string {
  return item.r ? hadithRefLabel(item.r) : arNum(item.a);
}

/** «الحديث ١١٤٤ (٢)», or «المقدمة ١» for Muslim's introduction. */
export function hadithPlaceLabel(item: Pick<HadithItem, "a" | "r">): string {
  const label = hadithNumberLabel(item);
  return item.r?.startsWith("i") ? label : `الحديث ${label}`;
}

/** The first entry printed under number «n» (what «اذهب إلى رقم» and links mean). */
export function findByPrintedNumber(pack: HadithPack, n: number): HadithItem | undefined {
  return pack.hadiths.find((h) => (h.r ? hadithRefNumber(h.r) === n : h.n === n));
}

/**
 * Every book goes through this once after loading, cached copy or fresh:
 * entries with no text (numbering placeholders the source kept, most in
 * Muslim) are left out, the forties' markup is cleaned, and each entry gets
 * its printed-number ref.
 */
export function normalizeHadithPack(pack: HadithPack): HadithPack {
  if ((pack as { [NORMALIZED]?: true })[NORMALIZED]) return pack;
  const hadiths = pack.hadiths
    .filter((h) => h.t.trim())
    .map((h) => (h.t.includes("<") ? { ...h, t: tidyHadithMarkup(h.t) } : h));
  const refs = hadithRefs(hadiths);
  const out: HadithPack = {
    ...pack,
    count: hadiths.length,
    hadiths: hadiths.map((h, i) => ({ ...h, r: refs[i] })),
  };
  Object.defineProperty(out, NORMALIZED, { value: true });
  return out;
}

/** The public link to a hadith: opens the app where it is installed (universal / app links), the site otherwise. */
export function hadithShareUrl(bookKey: string, n: number): string {
  return `https://www.athark.org/hadith/${bookKey}/${n}`;
}
