import { type HadithEvidence, cleanHadithQuery, distinctNarrations, formatHadithAttribution, parseDorarResults, selectAuthentic } from "./hadith.ts";
import { type QuranPassage, QuranCorpus, SURAH_NAMES } from "./quran.ts";
import { stripMarks, toArabicDigits } from "./text.ts";

/**
 * Evidence gathering: before the assistant answers, collect the texts it is
 * allowed to quote for this question.
 */

export const EVIDENCE_TOOL_NAME = "find_evidence";
const MAX_HADITH_QUERIES = 2;
const MAX_QURAN_REFERENCES = 3;
const MAX_HADITH_PER_QUERY = 2;
const MAX_FOLLOW_UPS = 3;
const MAX_FOLLOW_UP_CHARS = 70;
// A reply quotes one narration; a short list lets the model pick the closest.
const MAX_HADITH_TOTAL = 3;
const DORAR_TIMEOUT_MS = 7_000;
const QURAN_TIMEOUT_MS = 8_000;
const DORAR_ENDPOINT = "https://dorar.net/dorar_api.json?skey=";
const DORAR_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const DEFAULT_QURAN_URL = "https://www.athark.org/data/quran.json";

export const EVIDENCE_TOOL = {
  name: EVIDENCE_TOOL_NAME,
  description:
    "Request the source texts needed to answer the user's latest message. Call exactly once.",
  input_schema: {
    type: "object",
    properties: {
      hadith_queries: {
        type: "array",
        maxItems: MAX_HADITH_QUERIES,
        items: { type: "string" },
        description:
          "Up to 2 short Arabic keyword phrases (2-4 words each) made of distinctive words that would appear in the wording of the best-known authentic hadith that answers this exact question. No question words. Empty if no hadith answers it.",
      },
      quran_refs: {
        type: "array",
        maxItems: MAX_QURAN_REFERENCES,
        items: { type: "string" },
        description:
          "Up to 3 verse references as surah:ayah or surah:from-to using numbers, e.g. 2:255 or 2:183-185. Only verses you are certain answer this exact question. Empty if none.",
      },
      needs_sources: {
        type: "boolean",
        description:
          "true when answering correctly requires a scholarly ruling or explanation (fiqh rulings, what is permitted or required, creed, interpretation of a verse or hadith, authenticity of a narration). false for greetings, encouragement, supplications, app usage, and personal conversation.",
      },
      follow_ups: {
        type: "array",
        maxItems: MAX_FOLLOW_UPS,
        items: { type: "string" },
        description:
          "Up to 3 short follow-up questions in Arabic (each under 9 words) that this user would most naturally ask next about the same topic, written in the user's own voice as questions to the assistant. Empty for greetings, thanks and small talk.",
      },
      wants_wording: {
        type: "boolean",
        description:
          "true when the user asks for the text itself of a specific supplication, dhikr or hadith (for example: what is the Istikhara dua, what do I say when..., give me the hadith of...). false otherwise.",
      },
    },
    required: ["hadith_queries", "quran_refs", "needs_sources", "wants_wording"],
  },
};

export const EVIDENCE_STEP_SYSTEM = `You prepare source material for an Islamic knowledge assistant. You do not answer the user.
Call the ${EVIDENCE_TOOL_NAME} tool exactly once and write nothing else.
- hadith_queries: short Arabic keyword phrases for searching a hadith encyclopedia by wording. Use the words a hadith on this topic would actually contain, in plain Arabic without vowel marks.
- quran_refs: numeric references of verses that directly address the question.
- needs_sources: whether a scholarly ruling or explanation must be looked up.
- follow_ups: up to three short questions, in Arabic, that this user would naturally ask next about the same topic.
For greetings, thanks, small talk, or questions about using the app, pass empty arrays and false.`;

export type EvidencePlan = {
  hadithQueries: string[];
  quranReferences: string[];
  needsSources: boolean;
  wantsWording: boolean;
  /** Questions offered to the reader after the answer, on the same topic. */
  followUps?: string[];
};

/**
 * A suggested question as shown on a button: Arabic letters and the usual
 * punctuation only, one short line. Anything else is dropped.
 */
export function cleanFollowUp(value: unknown): string {
  if (typeof value !== "string") return "";
  // Line breaks and tabs become spaces; other invisible characters fail the check below.
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || text.length > MAX_FOLLOW_UP_CHARS) return "";
  if (/[A-Za-z<>{}[\]\\|`$#*_=]/.test(text) || [...text].some((ch) => ch.charCodeAt(0) < 32)) return "";
  if (!/[\u0621-\u064a]{2}/.test(text)) return "";
  return text;
}

/** Read the plan out of the evidence step's response content. */
export function readEvidencePlan(content: unknown): EvidencePlan {
  const plan: EvidencePlan = { hadithQueries: [], quranReferences: [], needsSources: false, wantsWording: false };
  if (!Array.isArray(content)) return plan;
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const candidate = block as { type?: unknown; name?: unknown; input?: unknown };
    if (candidate.type !== "tool_use" || candidate.name !== EVIDENCE_TOOL_NAME) continue;
    const input = (candidate.input ?? {}) as { hadith_queries?: unknown; quran_refs?: unknown; needs_sources?: unknown; wants_wording?: unknown; follow_ups?: unknown };
    if (Array.isArray(input.follow_ups)) {
      const followUps = plan.followUps ?? [];
      for (const item of input.follow_ups) {
        const cleaned = cleanFollowUp(item);
        if (cleaned && !followUps.includes(cleaned) && followUps.length < MAX_FOLLOW_UPS) followUps.push(cleaned);
      }
      plan.followUps = followUps;
    }
    if (input.needs_sources === true) plan.needsSources = true;
    if (input.wants_wording === true) plan.wantsWording = true;
    if (Array.isArray(input.hadith_queries)) {
      for (const query of input.hadith_queries) {
        const cleaned = cleanHadithQuery(query);
        if (cleaned.length >= 4 && !plan.hadithQueries.includes(cleaned)) plan.hadithQueries.push(cleaned);
      }
    }
    if (Array.isArray(input.quran_refs)) {
      for (const reference of input.quran_refs) {
        if (typeof reference === "string" && reference.length <= 20) plan.quranReferences.push(reference);
      }
    }
  }
  plan.hadithQueries = plan.hadithQueries.slice(0, MAX_HADITH_QUERIES);
  plan.quranReferences = plan.quranReferences.slice(0, MAX_QURAN_REFERENCES);
  return plan;
}

const hadithCache = new Map<string, { at: number; items: HadithEvidence[] }>();
const HADITH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const HADITH_CACHE_MAX = 300;

async function searchAuthenticHadith(query: string, preferComplete: boolean): Promise<HadithEvidence[]> {
  const cacheKey = `${preferComplete ? "full" : "short"}:${query}`;
  const cached = hadithCache.get(cacheKey);
  if (cached && Date.now() - cached.at < HADITH_CACHE_TTL_MS) return cached.items;
  const response = await fetch(DORAR_ENDPOINT + encodeURIComponent(query), {
    headers: { Accept: "application/json", "User-Agent": DORAR_USER_AGENT },
    signal: AbortSignal.timeout(DORAR_TIMEOUT_MS),
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    return [];
  }
  const data = await response.json() as { ahadith?: { result?: unknown } };
  const items = selectAuthentic(parseDorarResults(data?.ahadith?.result), MAX_HADITH_PER_QUERY, preferComplete);
  if (hadithCache.size >= HADITH_CACHE_MAX) {
    const oldest = hadithCache.keys().next().value;
    if (oldest !== undefined) hadithCache.delete(oldest);
  }
  hadithCache.set(cacheKey, { at: Date.now(), items });
  return items;
}

/** Authentic narrations for the planned queries. Failures yield no evidence. */
export async function gatherHadith(queries: string[], preferComplete = false): Promise<HadithEvidence[]> {
  const batches = await Promise.all(queries.map((query) => searchAuthenticHadith(query, preferComplete).catch(() => [])));
  const merged: HadithEvidence[] = [];
  // Take the best result of each query first, then the next best of each.
  for (let rank = 0; rank < MAX_HADITH_PER_QUERY; rank += 1) {
    for (const batch of batches) {
      if (batch[rank]) merged.push(batch[rank]!);
    }
  }
  return distinctNarrations(merged, MAX_HADITH_TOTAL);
}

let quranLoading: Promise<QuranCorpus> | null = null;

/** The Quran corpus, loaded once per function instance. Null if unavailable. */
export async function loadQuran(url: string | undefined): Promise<QuranCorpus | null> {
  if (!quranLoading) {
    quranLoading = (async () => {
      const response = await fetch(url || DEFAULT_QURAN_URL, { signal: AbortSignal.timeout(QURAN_TIMEOUT_MS) });
      if (!response.ok) throw new Error("quran: fetch failed");
      return new QuranCorpus(await response.json());
    })();
    // A failed load must not be remembered: try again on the next request.
    quranLoading.catch(() => { quranLoading = null; });
  }
  try {
    return await quranLoading;
  } catch {
    return null;
  }
}

export function gatherVerses(quran: QuranCorpus | null, references: string[]): QuranPassage[] {
  if (!quran) return [];
  const passages: QuranPassage[] = [];
  for (const reference of references) {
    const passage = quran.byReference(reference);
    if (passage && !passages.some((p) => p.surah === passage.surah && p.from === passage.from && p.to === passage.to)) {
      passages.push(passage);
    }
  }
  return passages;
}

/** The evidence and the binding citation rules given to the answering call. */
export function buildEvidenceBlock(hadith: HadithEvidence[], verses: QuranPassage[]): string {
  const hadithSection = hadith.length > 0
    // Vowel marks are left out here: the reader is shown the source text, and
    // heavily vowelled input makes this model's output less stable.
    ? hadith.map((item, index) => `[H${index + 1}] «${stripMarks(item.text)}» ${formatHadithAttribution(item)}`).join("\n")
    : "لم يُعثر على حديث ثابت مطابق لهذا السؤال؛ فلا تورد أي حديث بلفظه في هذا الجواب.";
  const verseSection = verses.length > 0
    ? verses.map((passage) => {
      const range = passage.from === passage.to ? `${passage.from}` : `${passage.from}-${passage.to}`;
      return `[${passage.surah}:${range}] سورة ${SURAH_NAMES[passage.surah - 1]} ${toArabicDigits(range)}: ${stripMarks(passage.text)}`;
    }).join("\n")
    : "لم تُجلب آيات مسبقًا؛ يمكنك الاستشهاد بأي آية برقمها وفق القاعدة ٢.";

  return `### الأدلة الموثَّقة لهذا السؤال
جُلبت هذه النصوص الآن لهذا السؤال تحديدًا. ليست كلها لازمة: اختر منها ما يجيب السؤال مباشرة واترك الباقي.

أحاديث ثابتة من الموسوعة الحديثية (الدرر السنية):
${hadithSection}

آيات من المصحف:
${verseSection}

### قواعد الاستشهاد — ملزمة
١. النظام هو الذي يُدرج نص الآية ونص الحديث. أنت تشير إليهما فقط، ولا تكتب نصهما من حفظك أبدًا.
٢. استشهد بدليل واحد في الجواب: حديث واحد أو آية واحدة، الأقرب إلى السؤال. لا تورد دليلًا ثانيًا إلا إذا طلب المستخدم أكثر، ولا تكرر الدليل نفسه.
٣. الإشارة إلى حديث من القائمة، في سطرين مستقلين دون أي نص بينهما:
:::hadith(H1)
:::
٤. الإشارة إلى آية برقم السورة ورقم الآية، في سطرين مستقلين دون أي نص بينهما:
:::verse(2:255)
:::
٥. سيظهر للمستخدم النص ومصدره ودرجته تلقائيًّا؛ فلا تُعِد كتابة نصه ولا مصدره ولا درجته في كلامك، ولا تذكر الرمز H1 خارج سطره.
٦. إذا سأل المستخدم عن نص دعاء أو ذكر أو حديث بعينه فالجواب هو كتلة الحديث نفسها مع جملة تمهيد واحدة؛ لا تكتب نص الدعاء بعبارتك ولا بين علامتي تنصيص.
٧. إن لم يكن في القائمة حديث يجيب السؤال: لا تورد حديثًا، ولا تنسب إلى النبي ﷺ قولًا بلفظه، ولا تكتب «رواه فلان». قل إنك لم تقف على نص موثَّق في المسألة.
٨. أي نص تكتبه بين «» منسوبًا إلى النبي ﷺ أو بين ﴿﴾ يُفحص ويُحذف إن لم يطابق مصدره.
٩. لا تذكر فضلًا أو عددًا أو أثرًا لعبادة إلا إذا نصَّ عليه دليل من هذه القائمة أو من نتائج المصادر الموثوقة.
١٠. لا تزد على ما في نص الدليل: لا تستنبط منه فضلًا آخر، ولا تحدِّد له وقتًا أو كيفية أو شرطًا لم يرد فيه، ولا تبدأ جملة بـ«وهذا معناه».`;
}
