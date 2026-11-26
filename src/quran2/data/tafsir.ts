/**
 * «القرآن الكريم» — seven tafsirs, side by side (Quran.com API v4). Each ayah's
 * text is kept on the device once read.
 */
import { cached, cachedKeys, cacheDelete } from "./cache";
import { loadMuyassarCache } from "@/lib/tafseerLocal";

/** «الميسّر» ships inside the app: read without the internet from the first day. */
export const Q2_BUNDLED_TAFSIR = 16;

async function bundledAyah(s: number, a: number): Promise<string[] | null> {
  try {
    const all = await loadMuyassarCache();
    const text = all[String(s)]?.[a];
    return typeof text === "string" && text.trim() ? tafsirParagraphs(text) : null;
  } catch {
    return null;
  }
}

export type Q2Tafsir = { id: number; name: string; author: string; short: string };

export const Q2_TAFSIRS: Q2Tafsir[] = [
  { id: 16, name: "التفسير الميسّر", author: "مجمع الملك فهد", short: "الميسّر" },
  { id: 91, name: "تيسير الكريم الرحمن", author: "عبد الرحمن السعدي", short: "السعدي" },
  { id: 14, name: "تفسير القرآن العظيم", author: "ابن كثير", short: "ابن كثير" },
  { id: 15, name: "جامع البيان", author: "ابن جرير الطبري", short: "الطبري" },
  { id: 90, name: "الجامع لأحكام القرآن", author: "القرطبي", short: "القرطبي" },
  { id: 94, name: "معالم التنزيل", author: "البغوي", short: "البغوي" },
  { id: 93, name: "التفسير الوسيط", author: "محمد سيد طنطاوي", short: "الوسيط" },
];

/**
 * The API's HTML as paragraphs of plain text. Tags are dropped character by
 * character (no regex can be trusted with nested or broken markup), entities
 * are decoded afterwards, and any angle bracket left is removed, so nothing
 * that looks like markup can come out. React renders the result as text.
 */
export function tafsirParagraphs(html: string): string[] {
  let text = "";
  let inTag = false;
  let tag = "";
  // Footnote markers (<sup>1</sup>) are dropped with their number.
  let inSup = 0;
  for (const ch of html) {
    if (inTag) {
      if (ch === ">") {
        inTag = false;
        const name = tag.trim().toLowerCase();
        if (/^sup\b/.test(name)) inSup += 1;
        else if (/^\/\s*sup\b/.test(name)) inSup = Math.max(0, inSup - 1);
        // Block ends and line breaks become paragraph breaks.
        else if (/^\/?\s*(br|p|div|h\d|li)\b/.test(name)) text += "\n";
        tag = "";
      } else tag += ch;
    } else if (ch === "<") {
      inTag = true;
    } else if (!inSup) text += ch;
  }
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;|&gt;/g, "")
    .replace(/&amp;/g, "&")
    .replace(/[<>]/g, "");
  return text
    .split(/\n+/)
    .map((p) => p.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
}

export async function loadTafsir(id: number, s: number, a: number): Promise<string[]> {
  if (id === Q2_BUNDLED_TAFSIR) {
    const local = await bundledAyah(s, a);
    if (local) return local;
  }
  return cached(`tafsir:${id}:${s}:${a}`, async () => {
    const res = await fetch(`https://api.quran.com/api/v4/tafsirs/${id}/by_ayah/${s}:${a}`);
    if (!res.ok) throw new Error(`tafsir: HTTP ${res.status}`);
    const body = (await res.json()) as { tafsir?: { text?: string } };
    return tafsirParagraphs(body.tafsir?.text ?? "");
  });
}

/** A few words on each tafsir, for the tafsir section (facts about the books, not their content). */
export const Q2_TAFSIR_NOTES: Record<number, { era: string; note: string }> = {
  16: { era: "مجمع الملك فهد لطباعة المصحف الشريف", note: "موجز بلغة سهلة، يبيّن المعنى في سطور" },
  91: { era: "ت ١٣٧٦هـ", note: "يبسط المعاني والهدايات بعبارة قريبة" },
  14: { era: "ت ٧٧٤هـ", note: "يفسّر القرآن بالقرآن ثم بالسنة وأقوال السلف" },
  15: { era: "ت ٣١٠هـ", note: "من أقدم التفاسير الجامعة، يورد أقوال السلف بأسانيدها" },
  90: { era: "ت ٦٧١هـ", note: "يعنى بأحكام الفقه المستنبطة من الآيات" },
  94: { era: "ت ٥١٦هـ", note: "تفسير بالمأثور، مختصر محرَّر" },
  93: { era: "ت ١٤٣١هـ", note: "تفسير معاصر وسيط بين الإيجاز والبسط" },
};

/** A whole surah's tafsir: per ayah, its paragraphs (empty when explained with the ayah before). */
export async function loadSurahTafsir(id: number, s: number, ayahs: number): Promise<string[][]> {
  if (id === Q2_BUNDLED_TAFSIR) {
    try {
      const all = await loadMuyassarCache();
      const surah = all[String(s)];
      if (surah?.length) return Array.from({ length: ayahs }, (_, i) => (typeof surah[i + 1] === "string" ? tafsirParagraphs(surah[i + 1]!) : []));
    } catch {
      // Fall through to the network.
    }
  }
  return cached(`tafsir-surah:${id}:${s}`, async () => {
    const out: string[][] = Array.from({ length: ayahs }, () => []);
    const fetchPage = async (page: number) => {
      const res = await fetch(`https://api.quran.com/api/v4/tafsirs/${id}/by_chapter/${s}?per_page=50&page=${page}`);
      if (!res.ok) throw new Error(`tafsir: HTTP ${res.status}`);
      return (await res.json()) as { tafsirs?: Array<{ verse_key?: string; text?: string }>; pagination?: { total_pages?: number } };
    };
    const first = await fetchPage(1);
    const rest = await Promise.all(Array.from({ length: Math.max(0, (first.pagination?.total_pages ?? 1) - 1) }, (_, i) => fetchPage(i + 2)));
    for (const body of [first, ...rest]) {
      for (const t of body.tafsirs ?? []) {
        const a = Number(t.verse_key?.split(":")[1]);
        if (a >= 1 && a <= ayahs) out[a - 1] = tafsirParagraphs(t.text ?? "");
      }
    }
    return out;
  });
}

/** How many surahs of a tafsir are kept on the device (all 114 for «الميسّر»). */
export async function savedTafsirSurahCount(id: number): Promise<number> {
  if (id === Q2_BUNDLED_TAFSIR) return 114;
  const keys = await cachedKeys(`tafsir-surah:${id}:`);
  return new Set(keys).size;
}

/** Keep a whole tafsir on the device, surah by surah, for reading without the internet. */
export async function saveTafsirOffline(
  id: number,
  ayahCounts: number[],
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<{ saved: number; total: number }> {
  const total = ayahCounts.length;
  let saved = 0;
  let next = 0;
  // Three surahs at a time: quick, and gentle with the server.
  const worker = async () => {
    while (next < total && !signal?.aborted) {
      const s = ++next;
      try {
        await loadSurahTafsir(id, s, ayahCounts[s - 1]!);
        saved += 1;
      } catch {
        // A surah that failed is fetched again on the next try.
      }
      onProgress(saved, total);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return { saved, total };
}

/** Remove a saved tafsir from the device. */
export async function removeTafsirOffline(id: number): Promise<void> {
  const keys = [...(await cachedKeys(`tafsir-surah:${id}:`)), ...(await cachedKeys(`tafsir:${id}:`))];
  await cacheDelete(keys);
}
