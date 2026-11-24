/**
 * «القرآن ٢» — seven tafsirs, side by side (Quran.com API v4). Each ayah's
 * text is kept on the device once read.
 */
import { cached } from "./cache";

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
  for (const ch of html) {
    if (inTag) {
      if (ch === ">") {
        inTag = false;
        // Block ends and line breaks become paragraph breaks.
        if (/^\/?\s*(br|p|div|h\d|li)\b/i.test(tag.trim())) text += "\n";
        tag = "";
      } else tag += ch;
    } else if (ch === "<") {
      inTag = true;
    } else text += ch;
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

export function loadTafsir(id: number, s: number, a: number): Promise<string[]> {
  return cached(`tafsir:${id}:${s}:${a}`, async () => {
    const res = await fetch(`https://api.quran.com/api/v4/tafsirs/${id}/by_ayah/${s}:${a}`);
    if (!res.ok) throw new Error(`tafsir: HTTP ${res.status}`);
    const body = (await res.json()) as { tafsir?: { text?: string } };
    return tafsirParagraphs(body.tafsir?.text ?? "");
  });
}
