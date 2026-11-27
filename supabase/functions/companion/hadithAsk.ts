/**
 * «اسأل عن الحديث» — a question about one hadith in the app's books,
 * answered only from that hadith, its scholars' rulings and its explanation.
 *
 * The app names the hadith (book and number). The server reads the hadith
 * itself from Athar's own published data (www.athark.org/data/hadith: the
 * book's table of contents, then the chapter it is in) and its explanation
 * from HadeethEnc when the two are linked; nothing the client sends is taken
 * as hadith or explanation text. These are given to the answering call with
 * rules that bind the answer to them, and passed to the reply guard as the
 * only trusted texts besides the Quran.
 */
import { clip, tafsirPlainText } from "./ayah.ts";

export type HadithAskRequest = { book: string; n: number };

export const HADITH_ASK_BOOKS: Record<string, string> = {
  bukhari: "صحيح البخاري",
  muslim: "صحيح مسلم",
  abudawud: "سنن أبي داود",
  tirmidhi: "جامع الترمذي",
  nasai: "سنن النسائي",
  ibnmajah: "سنن ابن ماجه",
  malik: "موطأ مالك",
  nawawi: "الأربعون النووية",
  qudsi: "الأربعون القدسية",
};

/** The scholars whose rulings the books carry, in the order the data numbers them (src/data/hadithTypes.ts). */
export const HADITH_GRADERS = [
  "الألباني",
  "زبير علي زئي",
  "شعيب الأرناؤوط",
  "عبد الفتاح أبو غدة",
  "محمد محيي الدين عبد الحميد",
  "محمد فؤاد عبد الباقي",
  "أحمد محمد شاكر",
  "بشار عواد معروف",
  "سليم الهلالي",
];

const DEFAULT_DATA_URL = "https://www.athark.org/data/hadith";
const TIMEOUT_MS = 8_000;
const MAX_HADITH_CHARS = 6_000;
const MAX_EXPLANATION_CHARS = 9_000;

export function readHadithAskRequest(value: unknown): HadithAskRequest | null {
  if (!value || typeof value !== "object") return null;
  const { book, n } = value as { book?: unknown; n?: unknown };
  if (typeof book !== "string" || !Object.hasOwn(HADITH_ASK_BOOKS, book)) return null;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 100_000) return null;
  return { book, n };
}

export type HadithSources = {
  book: string;
  /** The printed number people cite («1144», «1144/2»). */
  ref: string;
  title?: string;
  text: string;
  /** The book's own grade code, when it gives one. */
  grade?: string;
  rulings: Array<{ scholar: string; ruling: string }>;
  explanation?: { text: string; hints: string[]; words: Array<{ word: string; meaning: string }> };
};

type Fetcher = typeof fetch;

async function getJson<T>(fetcher: Fetcher, url: string): Promise<T | null> {
  try {
    const response = await fetcher(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return null;
    }
    return await response.json() as T;
  } catch {
    return null;
  }
}

let linksCache: { url: string; at: number; links: Record<string, string> } | null = null;

async function sharhIdFor(fetcher: Fetcher, base: string, request: HadithAskRequest): Promise<string | null> {
  const url = `${base}/sharh-links.json`;
  if (!linksCache || linksCache.url !== url || Date.now() - linksCache.at > 6 * 3_600_000) {
    const links = await getJson<Record<string, string>>(fetcher, url);
    if (links) linksCache = { url, at: Date.now(), links };
  }
  const id = linksCache?.links[`${request.book}:${request.n}`];
  return typeof id === "string" && /^\d{1,7}$/.test(id) ? id : null;
}

/** The book's own grade code (the books write it as a list), when it gives one. */
function bookGrade(value: unknown): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  const code = typeof first === "string" ? first.trim() : "";
  return code && code !== "-" ? code : undefined;
}

const asText = (value: unknown, limit: number) => (typeof value === "string" ? clip(tafsirPlainText(value), limit) : "");

export async function gatherHadithSources(
  request: HadithAskRequest,
  options: { fetcher?: Fetcher; dataUrl?: string } = {},
): Promise<HadithSources | null> {
  const fetcher = options.fetcher ?? fetch;
  const base = (options.dataUrl || DEFAULT_DATA_URL).replace(/\/+$/, "");
  const [toc, sharhId] = await Promise.all([
    getJson<{ rows?: unknown }>(fetcher, `${base}/books/${request.book}.json`),
    sharhIdFor(fetcher, base, request),
  ]);
  const rows = Array.isArray(toc?.rows) ? toc!.rows as unknown[] : [];
  const row = rows.find((r) => Array.isArray(r) && r[0] === request.n) as unknown[] | undefined;
  if (!row || typeof row[1] !== "number") return null;
  const [chapter, sharh] = await Promise.all([
    getJson<{ hadiths?: unknown }>(fetcher, `${base}/books/${request.book}/${row[1]}.json`),
    sharhId ? getJson<Record<string, unknown>>(fetcher, `https://hadeethenc.com/api/v1/hadeeths/one/?language=ar&id=${sharhId}`) : null,
  ]);
  const items = Array.isArray(chapter?.hadiths) ? chapter!.hadiths as Array<Record<string, unknown>> : [];
  const item = items.find((h) => h.n === request.n);
  const text = asText(item?.t, MAX_HADITH_CHARS);
  if (!item || !text) return null;
  const rulings = (Array.isArray(item.gr) ? item.gr : [])
    .filter((r): r is [number, string] => Array.isArray(r) && typeof r[0] === "number" && typeof r[1] === "string" && !!HADITH_GRADERS[r[0]])
    .map(([i, ruling]) => ({ scholar: HADITH_GRADERS[i]!, ruling: ruling.slice(0, 200) }));
  const explanationText = asText(sharh?.explanation, MAX_EXPLANATION_CHARS);
  return {
    book: HADITH_ASK_BOOKS[request.book]!,
    ref: typeof item.r === "string" ? item.r : typeof row[2] === "string" ? row[2] : String(item.a ?? request.n),
    title: typeof item.ti === "string" ? item.ti : undefined,
    text,
    grade: bookGrade(item.g),
    rulings,
    explanation: explanationText
      ? {
        text: explanationText,
        hints: (Array.isArray(sharh?.hints) ? sharh!.hints as unknown[] : []).filter((h): h is string => typeof h === "string").slice(0, 12).map((h) => clip(h, 400)),
        words: (Array.isArray(sharh?.words_meanings) ? sharh!.words_meanings as unknown[] : [])
          .map((w) => w as { word?: unknown; meaning?: unknown })
          .filter((w) => typeof w.word === "string" && typeof w.meaning === "string")
          .slice(0, 20)
          .map((w) => ({ word: String(w.word).slice(0, 60), meaning: String(w.meaning).slice(0, 300) })),
      }
      : undefined,
  };
}

/** The texts the reply guard may let the answer quote. */
export function hadithTrustedTexts(sources: HadithSources | null): string[] {
  if (!sources) return [];
  return [
    sources.text,
    ...(sources.explanation ? [sources.explanation.text, ...sources.explanation.hints, ...sources.explanation.words.map((w) => `${w.word}: ${w.meaning}`)] : []),
  ];
}

/** The rules of this mode and the hadith's own texts, for the answering call. */
export function buildHadithBlock(request: HadithAskRequest, sources: HadithSources | null): string {
  const where = sources ? `${sources.book}، رقم ${sources.ref}${sources.title ? ` («${sources.title}»)` : ""}` : `${HADITH_ASK_BOOKS[request.book]}، رقم ${request.n}`;
  const parts: string[] = [];
  if (sources) {
    parts.push(`#### نص الحديث\n${sources.text}`);
    const rulings = [
      ...(sources.grade ? [`حكم الكتاب: ${sources.grade}`] : []),
      ...sources.rulings.map((r) => `${r.scholar}: ${r.ruling}`),
    ];
    if (rulings.length) parts.push(`#### أحكام العلماء على الحديث\n${rulings.join("\n")}`);
    else if (request.book === "bukhari" || request.book === "muslim") parts.push(`#### أحكام العلماء على الحديث\nفي ${sources.book}، وأحاديثه صحيحة عند العلماء.`);
    if (sources.explanation) {
      parts.push(`#### شرح الحديث (موسوعة الأحاديث النبوية HadeethEnc)\n${sources.explanation.text}`);
      if (sources.explanation.hints.length) parts.push(`#### من فوائد الحديث (من الموسوعة)\n${sources.explanation.hints.map((h) => `- ${h}`).join("\n")}`);
      if (sources.explanation.words.length) parts.push(`#### معاني الكلمات (من الموسوعة)\n${sources.explanation.words.map((w) => `- ${w.word}: ${w.meaning}`).join("\n")}`);
    } else {
      parts.push("#### شرح الحديث\nلا شرح مرتبطًا بهذا الحديث في التطبيق.");
    }
  } else {
    parts.push("تعذّر جلب نص الحديث الآن.");
  }
  return `### سؤال عن حديث بعينه — هذه القواعد مقدَّمة على كل ما سبق
الحديث: ${where}

أجب عن سؤال المستخدم عن هذا الحديث مما نُقل أدناه وحده: نصه، وأحكام العلماء عليه، وشرحه وفوائده إن وُجدت:
١. انسب كل معنى إلى مصدره: «في الشرح: …»، «حكم عليه الألباني بـ…». لا تذكر معنى أو حكمًا لم يرد فيما نُقل.
٢. إن اختلفت أحكام العلماء فاعرضها منسوبة إلى أصحابها دون ترجيح من عندك.
٣. إن لم يتناول ما نُقل ما سُئل عنه فقل بوضوح: «لم يتناول الشرح المنقول هذا»، ولا تُجب من معرفتك العامة.
٤. لا تفتِ ولا تستنبط حكمًا فقهيًّا لم ينص عليه الشرح، ولا تضف قصة أو سببًا أو عددًا لم يرد فيه.
٥. إذا نقلت عبارة بنصها فضعها بين «» كما وردت حرفيًّا. لا تورد حديثًا آخر إلا إن ورد بنصه فيما نُقل.
٦. اختصر: فقرة أو فقرتان أو ثلاث، بلغة واضحة، دون مقدمات.

### ما نُقل لهذا الحديث
${parts.join("\n\n")}`;
}
