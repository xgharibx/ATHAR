/** «القرآن الكريم» — what each page of the Madani mushaf holds. */
import type { Q2Meta } from "./meta";
import { pageRange, refFromIndex } from "./meta";
import type { Q2Text, Q2Ayah } from "./text";
import { arDigits } from "./arabic";

export type PageAyah = { ayah: Q2Ayah; surahStart: boolean };

/** The ayahs on a page of the Madani mushaf, in order. */
export function pageAyahs(text: Q2Text, meta: Q2Meta, page: number): PageAyah[] {
  const [first, last] = pageRange(meta, page);
  const out: PageAyah[] = [];
  for (let i = first; i <= last; i++) {
    const [s, a] = refFromIndex(meta, i);
    const ayah = text.surahs[s - 1]?.ayahs[a - 1];
    if (ayah) out.push({ ayah, surahStart: a === 1 });
  }
  return out;
}

/** "البقرة ٦ – ١٦" or "النبأ ٣١ – النازعات ١٥": what a page holds. */
export function pageLabel(text: Q2Text, meta: Q2Meta, page: number): string {
  const ayahs = pageAyahs(text, meta, page);
  const first = ayahs[0]?.ayah;
  const last = ayahs[ayahs.length - 1]?.ayah;
  if (!first || !last) return "";
  const name = (s: number) => meta.surahs[s - 1]!.name;
  return first.s === last.s
    ? `${name(first.s)} ${arDigits(first.a)}–${arDigits(last.a)}`
    : `${name(first.s)} ${arDigits(first.a)} – ${name(last.s)} ${arDigits(last.a)}`;
}
