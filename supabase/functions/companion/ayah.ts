/**
 * «اسأل عن الآية» — a question about one ayah, answered only from its tafsirs.
 *
 * The app («القرآن ٢») names the ayah; the server fetches that ayah's seven
 * tafsirs itself from Quran.com (nothing the client sends is taken as tafsir
 * text), gives them to the answering call with rules that bind the answer to
 * them, and passes them to the reply guard as the only trusted texts besides
 * the Quran. A question the tafsirs do not answer is said to be so.
 */
import { SURAH_NAMES } from "./quran.ts";

export type AyahRequest = { surah: number; ayah: number };

/** Ayahs in each surah, to check the reference before anything is fetched. */
const AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83,
  182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40,
  31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

export const AYAH_TAFSIRS: Array<{ id: number; name: string }> = [
  { id: 16, name: "التفسير الميسر" },
  { id: 91, name: "تفسير السعدي" },
  { id: 14, name: "تفسير ابن كثير" },
  { id: 15, name: "تفسير الطبري" },
  { id: 90, name: "تفسير القرطبي" },
  { id: 94, name: "تفسير البغوي" },
  { id: 93, name: "التفسير الوسيط لطنطاوي" },
];

/** What of each tafsir is given to the model, and of all of them together. */
const MAX_TAFSIR_CHARS = 5_000;
const MAX_TOTAL_CHARS = 26_000;
const TAFSIR_TIMEOUT_MS = 8_000;

export function readAyahRequest(value: unknown): AyahRequest | null {
  if (!value || typeof value !== "object") return null;
  const { surah, ayah } = value as { surah?: unknown; ayah?: unknown };
  if (typeof surah !== "number" || typeof ayah !== "number" || !Number.isInteger(surah) || !Number.isInteger(ayah)) return null;
  if (surah < 1 || surah > 114 || ayah < 1 || ayah > AYAH_COUNTS[surah - 1]!) return null;
  return { surah, ayah };
}

/**
 * The API's HTML as plain text. Tags are dropped character by character,
 * footnote numbers (<sup>) with them; entities are decoded afterwards and any
 * angle bracket left is removed.
 */
export function tafsirPlainText(html: string): string {
  let text = "";
  let inTag = false;
  let tag = "";
  let inSup = 0;
  for (const ch of html) {
    if (inTag) {
      if (ch === ">") {
        inTag = false;
        const name = tag.trim().toLowerCase();
        if (/^sup\b/.test(name)) inSup += 1;
        else if (/^\/\s*sup\b/.test(name)) inSup = Math.max(0, inSup - 1);
        else if (/^\/?\s*(br|p|div|h\d|li)\b/.test(name)) text += "\n";
        tag = "";
      } else tag += ch;
    } else if (ch === "<") inTag = true;
    else if (!inSup) text += ch;
  }
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;|&gt;/g, "")
    .replace(/&amp;/g, "&")
    .replace(/[<>]/g, "")
    .split(/\n+/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** Cut at a sentence end near the limit, so an excerpt never stops mid-word. */
export function clip(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const end = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("۔"), cut.lastIndexOf("\n"));
  return `${(end > limit * 0.6 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, "")).trim()} …`;
}

export type TafsirExcerpt = { name: string; text: string };

export async function gatherTafsirs(request: AyahRequest, fetcher: typeof fetch = fetch): Promise<TafsirExcerpt[]> {
  const results = await Promise.all(AYAH_TAFSIRS.map(async ({ id, name }) => {
    try {
      const response = await fetcher(`https://api.quran.com/api/v4/tafsirs/${id}/by_ayah/${request.surah}:${request.ayah}`, {
        signal: AbortSignal.timeout(TAFSIR_TIMEOUT_MS),
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        return null;
      }
      const body = await response.json() as { tafsir?: { text?: unknown } };
      const text = tafsirPlainText(typeof body.tafsir?.text === "string" ? body.tafsir.text : "");
      return text ? { name, text: clip(text, MAX_TAFSIR_CHARS) } : null;
    } catch {
      return null;
    }
  }));
  const out: TafsirExcerpt[] = [];
  let total = 0;
  for (const item of results) {
    if (!item || total + item.text.length > MAX_TOTAL_CHARS) continue;
    out.push(item);
    total += item.text.length;
  }
  return out;
}

/** The rules of this mode and the tafsirs themselves, for the answering call. */
export function buildAyahBlock(request: AyahRequest, ayahText: string, tafsirs: TafsirExcerpt[]): string {
  const where = `سورة ${SURAH_NAMES[request.surah - 1]}، الآية ${request.ayah}`;
  const sources = tafsirs.length > 0
    ? tafsirs.map((t) => `#### ${t.name}\n${t.text}`).join("\n\n")
    : "تعذّر جلب التفاسير الآن.";
  return `### سؤال عن آية بعينها — هذه القواعد مقدَّمة على كل ما سبق
الآية: ${where}${ayahText ? `: ﴿${ayahText}﴾` : ""}

أجب عن سؤال المستخدم عن هذه الآية من التفاسير المنقولة أدناه وحدها:
١. كل معنى تذكره منسوب إلى تفسيره باسمه: «قال السعدي: …»، «وفي تفسير ابن كثير: …». لا تذكر معنى لم يرد في واحد منها.
٢. إن اتفقت التفاسير على معنى فقل ذلك واذكر من قاله، وإن اختلفت فاعرض الأقوال منسوبة إلى أصحابها دون ترجيح من عندك.
٣. إن لم تتناول هذه التفاسير ما سُئل عنه فقل بوضوح: «لم تتناول التفاسير السبعة هذا في هذه الآية»، ولا تُجب من معرفتك العامة.
٤. لا تفتِ ولا تستنبط حكمًا لم ينص عليه تفسير منها، ولا تضف قصة أو سبب نزول أو عددًا لم يرد فيها.
٥. إذا نقلت عبارة من تفسير بنصها فضعها بين «» كما وردت حرفيًّا. الحديث لا يُورَد إلا إن ورد بنصه في أحد التفاسير.
٦. اختصر: فقرة أو فقرتان أو ثلاث، بلغة واضحة، دون مقدمات.
٧. لا تكتب نص الآية من حفظك؛ إن احتجت إليها فأشر إليها كما في قاعدة الاستشهاد: :::verse(${request.surah}:${request.ayah}) ثم ::: في سطرين مستقلين.

### التفاسير المنقولة لهذه الآية (Quran.com)
${sources}`;
}
