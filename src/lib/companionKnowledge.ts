/**
 * Athar knowledge layer — retrieval + verification.
 *
 * Retrieval: a tiny in-memory inverted index over the bundled Islamic library
 * (sharh-bundled.json, the search-index.json, and the Quran). Built lazily on
 * first access and kept in module memory (rebuilt on app start). The index is
 * plain JS — no embeddings, no network — so it's instant, private, and free.
 *
 * The bundle is ~27 MB so we cache the parsed index to IndexedDB after the
 * first build (mirrors mutashabihat.ts:55-68) — the next cold start skips the
 * network/parse entirely.
 *
 * Verification: scans an assistant answer for Quran refs (e.g. "سورة البقرة:٢٥٥")
 * and hadith attributions (e.g. "رواه البخاري") and checks whether the cited
 * source contains something compatible. Returns a VerificationReport the UI
 * can surface as a soft "تحقق من المصدر" chip — never blocks the reply.
 */

import { idbGetExtras, idbSetExtras } from "@/lib/quranIDB";
import { useNoorStore } from "@/store/noorStore";

type Passage = { source: string; sourceLabel: string; text: string };

const INDEX_IDB_KEY = "noor_companion_knowledge_index_v1";
const INDEX_IDB_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let INDEX: Passage[] | null = null;
let INDEX_PROMISE: Promise<Passage[]> | null = null;
let QURAN_VERSES: Map<string, string> | null = null;

const ARABIC_DIACRITICS = /[\u064B-\u0652\u0670\u0640]/g;
function normalize(s: string): string {
  return s.replace(ARABIC_DIACRITICS, "").replace(/\s+/g, " ").trim();
}

const STOPWORDS = new Set([
  "في", "من", "على", "إلى", "عن", "ما", "لا", "إن", "أن", "أو", "ثم", "لم", "قد", "إنما",
  "هذا", "هذه", "ذلك", "تلك", "التي", "الذي", "الذين", "اللتي", "كما", "كان", "كانت",
  "هو", "هي", "هم", "هن", "أنا", "نحن", "أنت", "أنتم", "به", "بها", "به", "لهم", "لها",
  "به", "بها", "بعد", "قبل", "حتى", "بين", "عند", "لدى", "حول", "أي", "كل", "بعض",
]);

function tokenize(s: string): string[] {
  return normalize(s)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/** Exposed for tests only. */
export const __test__ = { tokenize, STOPWORDS, normalize };

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`fetch ${path}: ${res.status}`);
  return (await res.json()) as T;
}

async function buildSharhIndex(): Promise<Passage[]> {
  try {
    const raw = await fetchJSON<Record<string, {
      id: string;
      title: string;
      hadeeth: string;
      attribution: string;
      grade?: string;
      explanation: string;
      hints?: string[];
    }>>("/data/hadith/sharh-bundled.json");
    const out: Passage[] = [];
    for (const id of Object.keys(raw)) {
      const h = raw[id];
      if (!h) continue;
      const text = [
        `الحديث: ${h.hadeeth ?? ""}`,
        `الشرح: ${h.explanation ?? ""}`,
        h.hints?.length ? `فوائد: ${h.hints.join(" • ")}` : "",
      ].filter(Boolean).join("\n");
      out.push({
        source: `sharh:${h.id}`,
        sourceLabel: `${h.attribution ?? ""} — ${h.title ?? ""}`.trim(),
        text,
      });
    }
    return out;
  } catch (err) {
    console.warn("[athar-knowledge] sharh index skipped:", err);
    return [];
  }
}

async function buildSearchIndex(): Promise<Passage[]> {
  try {
    const raw = await fetchJSON<Array<[string, string, string, string]>>(
      "/data/hadith/search-index.json",
    );
    return raw
      .filter((row) => row && row[2] && row[2].length > 30)
      .slice(0, 8000)
      .map((row, i) => ({
        source: `searchidx:${row[0]}:${row[1]}:${i}`,
        sourceLabel: `${row[0]} — حديث رقم ${row[1]}`,
        text: row[2],
      }));
  } catch (err) {
    console.warn("[athar-knowledge] search-index skipped:", err);
    return [];
  }
}

async function buildTafsirIndex(): Promise<Passage[]> {
  try {
    // tafseer-muyassar.json — Spanish tafsir, but rich Arabic text is interleaved.
    // We grab the Arabic intro/summary if present.
    const raw = await fetchJSON<{ surahs?: Array<{ id: number; name: string; verses?: Array<{ number: number; text: string }> }> }>(
      "/data/tafseer-muyassar.json",
    );
    const out: Passage[] = [];
    for (const s of raw.surahs ?? []) {
      for (const v of s.verses ?? []) {
        const text = String(v.text ?? "").trim();
        if (text.length < 40) continue;
        out.push({
          source: `tafsir:${s.id}:${v.number}`,
          sourceLabel: `تفسير الميسر — سورة ${s.name} (${v.number})`,
          text,
        });
      }
    }
    return out;
  } catch (err) {
    console.warn("[athar-knowledge] tafsir index skipped:", err);
    return [];
  }
}

async function buildProphetStoriesIndex(): Promise<Passage[]> {
  try {
    const mod = await import("@/data/prophetStories" as string);
    const stories: Array<{ id?: string; name?: string; title?: string; summary?: string; text?: string; lessons?: string[] }> =
      (mod as { PROPHET_STORIES?: unknown }).PROPHET_STORIES as Array<{ id?: string; name?: string; title?: string; summary?: string; text?: string; lessons?: string[] }> ??
      (mod as unknown as Array<{ id?: string; name?: string; title?: string; summary?: string; text?: string; lessons?: string[] }>);
    if (!Array.isArray(stories)) return [];
    return stories.map((s, i) => ({
      source: `prophet:${s.id ?? i}`,
      sourceLabel: `قصة ${s.name ?? s.title ?? ""}`,
      text: [
        s.title ? `العنوان: ${s.title}` : "",
        s.summary ?? "",
        s.text ?? "",
        s.lessons?.length ? `الدروس: ${s.lessons.join(" • ")}` : "",
      ].filter(Boolean).join("\n"),
    }));
  } catch (err) {
    console.warn("[athar-knowledge] prophet stories skipped:", err);
    return [];
  }
}

async function buildQuranVerses(): Promise<Map<string, string>> {
  if (QURAN_VERSES) return QURAN_VERSES;
  try {
    const q = await fetchJSON<{
      surahs: Array<{
        id: number;
        name: string;
        verses: Array<{ number: number; text: string }>;
      }>;
    }>("/data/quran.json");
    const m = new Map<string, string>();
    for (const s of q.surahs ?? []) {
      for (const v of s.verses ?? []) {
        m.set(`${s.id}:${v.number}`, v.text);
      }
    }
    QURAN_VERSES = m;
    return m;
  } catch (err) {
    console.warn("[athar-knowledge] quran loading skipped:", err);
    QURAN_VERSES = new Map();
    return QURAN_VERSES;
  }
}

function scorePassage(queryTokens: string[], text: string): number {
  if (queryTokens.length === 0) return 0;
  const norm = normalize(text);
  let hits = 0;
  for (const tok of queryTokens) {
    if (norm.includes(tok)) hits++;
  }
  return hits / queryTokens.length;
}

async function getIndex(): Promise<Passage[]> {
  if (INDEX) return INDEX;
  if (!INDEX_PROMISE) {
    INDEX_PROMISE = (async () => {
      // 1) Try IDB cache first — saves the 27 MB parse on cold start.
      try {
        const cached = await idbGetExtras<{ cachedAt: number; data: Passage[] }>(INDEX_IDB_KEY);
        if (cached && Date.now() - cached.cachedAt < INDEX_IDB_TTL_MS && Array.isArray(cached.data)) {
          INDEX = cached.data;
          return INDEX;
        }
      } catch { /* IDB unavailable — fall through to network */ }

      // 2) Build from network + persist.
      const [a, b, c, d] = await Promise.all([
        buildSharhIndex(),
        buildSearchIndex(),
        buildTafsirIndex(),
        buildProphetStoriesIndex(),
      ]);
      const all = [...a, ...b, ...c, ...d];
      INDEX = all;
      void idbSetExtras(INDEX_IDB_KEY, { cachedAt: Date.now(), data: all }).catch(() => {});
      return all;
    })().catch((err) => {
      INDEX_PROMISE = null;
      console.warn("[athar-knowledge] index build failed:", err);
      return [];
    });
  }
  return INDEX_PROMISE;
}

export async function retrievePassagesAsync(query: string, k = 3): Promise<Passage[]> {
  const tokens = tokenize(query).slice(0, 12);
  if (tokens.length === 0) return [];
  const idx = await getIndex();
  if (idx.length === 0) return [];
  const scored: Array<{ p: Passage; s: number }> = [];
  for (const p of idx) {
    const s = scorePassage(tokens, p.text);
    if (s > 0) scored.push({ p, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, k).map((x) => x.p);
}

/* ─── User reminders surface ───────────────────────────────────────────── */
/** Heuristic AR/EN keywords that signal a user is asking about the list of
 *  reminders they've already created. Stored as a Set for O(1) lookups. */
const REMINDERS_QUERY_RE =
  /(تذكير|تذكيرات|تذكّير|أذكاري|ورد يومي|مواعيدي|reminder|reminders|schedule|مواعيد|ما\s+الذي\s+أنبهك|ما\s+الذي\s+تذكرني|reminders\s+do\s+I\s+have|my\s+reminders|adhkar\s+schedule|جدولي)/i;

/** When the user asks about their own reminders ("show my daily adhkar schedule",
 *  "what reminders do I have", …), surface them from the store as ad-hoc
 *  passages so the assistant can answer with the real list. We deliberately
 *  reuse the same Passage shape so the existing context-builder picks them
 *  up without any extra wiring. */
export function retrieveUserRemindersAsPassages(query: string, k = 16): Passage[] {
  if (!REMINDERS_QUERY_RE.test(query)) return [];
  let reminders: ReturnType<typeof useNoorStore.getState>["customReminders"] = [];
  try { reminders = useNoorStore.getState().customReminders ?? []; } catch { return []; }
  if (!Array.isArray(reminders) || reminders.length === 0) return [];
  const out: Passage[] = [];
  for (const r of reminders.slice(0, k)) {
    if (!r || typeof r !== "object" || typeof r.title !== "string") continue;
    const when = r.atTimeOfDay ? ` الساعة ${r.atTimeOfDay}` : "";
    const repeat = r.repeat === "daily" ? "يوميًا" : r.repeat === "weekly" ? "أسبوعيًا" : r.repeat === "monthly" ? "شهريًا" : "مرة واحدة";
    const category = r.category ? ` [${r.category}]` : "";
    out.push({
      source: `customReminder:${r.id}`,
      sourceLabel: `تذكير محفوظ${category}`,
      text: `${r.title}${when} — ${repeat}${r.description ? ` — ${r.description}` : ""}`,
    });
  }
  return out;
}

export function retrievePassages(query: string, k = 3): Passage[] {
  const tokens = tokenize(query).slice(0, 12);
  if (tokens.length === 0) return [];
  if (!INDEX) {
    // Best-effort: kick off the build and return whatever we have now (likely
    // nothing on first call, but cached on subsequent calls).
    void getIndex();
    return [];
  }
  const idx = INDEX;
  const scored: Array<{ p: Passage; s: number }> = [];
  for (const p of idx) {
    const s = scorePassage(tokens, p.text);
    if (s > 0) scored.push({ p, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, k).map((x) => x.p);
}

/* ─── Mood detection (cheap heuristic, no extra round-trip) ─────────── */

const MOOD_RULES: Array<{ mood: string; re: RegExp }> = [
  { mood: "حزين أو مهموم", re: /(حزين|مهموم|مكتئب|تعيس|يائس|وحيد|خايف|متوتر|قلقان|قلق|مضغوط|تعبان|همّ|هموم)/ },
  { mood: "فرحان ومتحمس", re: /(فرحان|مبسوط|سعيد|الحمد لله|ممتن|شاكر|متحمس)/ },
  { mood: "تائب وقريب من الله", re: /(تائب|توبة|استغفر|أخطأت|ذنوب|مقصّر)/ },
  { mood: "يشتكي أو غاضب", re: /(غاضب|زعلان|متضايق|محروق|ظلم|اتظلمت)/ },
  { mood: "منهك أو مُرهق", re: /(تعبان|مرهق|مش قادر|إرهاق|لا أنام|أرق)/ },
];

export function detectMood(text: string): string {
  const t = text.trim();
  for (const r of MOOD_RULES) if (r.re.test(t)) return r.mood;
  return "";
}

/* ─── Verification ─────────────────────────────────────────────────── */

const SURAH_RE = /(?:سورة|سورت)\s+([\u0621-\u063A\u0648\u064A]+(?:\s+[\u0621-\u063A\u0648\u064A]+)?)\s*[:\s]\s*([٠-٩0-9]+)/g;
const ARABIC_TO_NUM: Record<string, number> = { "٠":0,"١":1,"٢":2,"٣":3,"٤":4,"٥":5,"٦":6,"٧":7,"٨":8,"٩":9 };
function toNum(s: string): number {
  s = s.trim();
  if (/^[0-9]+$/.test(s)) return Number(s);
  let n = 0;
  for (const ch of s) n = n * 10 + (ARABIC_TO_NUM[ch] ?? 0);
  return n;
}

const SURAH_NUM: Record<string, number> = {
  "الفاتحة": 1, "البقرة": 2, "آل عمران": 3, "النساء": 4, "المائدة": 5, "الأنعام": 6, "الأعراف": 7,
  "الأنفال": 8, "التوبة": 9, "يونس": 10, "هود": 11, "يوسف": 12, "الرعد": 13, "إبراهيم": 14,
  "الحجر": 15, "النحل": 16, "الإسراء": 17, "الكهف": 18, "مريم": 19, "طه": 20, "الأنبياء": 21,
  "الحج": 22, "المؤمنون": 23, "النور": 24, "الفرقان": 25, "الشعراء": 26, "النمل": 27, "القصص": 28,
  "العنكبوت": 29, "الروم": 30, "لقمان": 31, "السجدة": 32, "الأحزاب": 33, "سبأ": 34, "فاطر": 35,
  "يس": 36, "الصافات": 37, "ص": 38, "الزمر": 39, "غافر": 40, "فصلت": 41, "الشورى": 42,
  "الزخرف": 43, "الدخان": 44, "الجاثية": 45, "الأحقاف": 46, "محمد": 47, "الفتح": 48,
  "الحجرات": 49, "ق": 50, "الذاريات": 51, "الطور": 52, "النجم": 53, "القمر": 54, "الرحمن": 55,
  "الواقعة": 56, "الحديد": 57, "المجادلة": 58, "الحشر": 59, "الممتحنة": 60, "الصف": 61,
  "الجمعة": 62, "المنافقون": 63, "التغابن": 64, "الطلاق": 65, "التحريم": 66, "الملك": 67,
  "القلم": 68, "الحاقة": 69, "المعارج": 70, "نوح": 71, "الجن": 72, "المزمل": 73, "المدثر": 74,
  "القيامة": 75, "الإنسان": 76, "المرسلات": 77, "النبأ": 78, "النازعات": 79, "عبس": 80,
  "التكوير": 81, "الانفطار": 82, "المطففين": 83, "الانشقاق": 84, "البروج": 85, "الطارق": 86,
  "الأعلى": 87, "الغاشية": 88, "الفجر": 89, "البلد": 90, "الشمس": 91, "الليل": 92, "الضحى": 93,
  "الشرح": 94, "التين": 95, "العلق": 96, "القدر": 97, "البينة": 98, "الزلزلة": 99, "العاديات": 100,
  "القارعة": 101, "التكاثر": 102, "العصر": 103, "الهمزة": 104, "الفيل": 105, "قريش": 106,
  "الماعون": 107, "الكوثر": 108, "الكافرون": 109, "النصر": 110, "المسد": 111, "الإخلاص": 112,
  "الفلق": 113, "الناس": 114,
};

/** Fire-and-forget warm-up for the Quran verse lookup map used by
 *  `verifyAnswer` (sync). `verifyAnswer` reads the module-level QURAN_VERSES
 *  cache directly rather than awaiting it — call this as early as possible
 *  in a reply cycle (well before the synchronous check runs at stream end)
 *  so the map is populated by the time it's needed. */
export function warmQuranVerses(): void {
  void buildQuranVerses();
}

export function verifyAnswer(text: string): VerificationReport {
  const map = QURAN_VERSES;
  const flags: string[] = [];
  const notes: string[] = [];

  // Only check citations if the verse map has actually loaded — otherwise
  // every citation would look "unfound" and get falsely flagged.
  if (map && map.size > 0) {
    let m: RegExpExecArray | null;
    SURAH_RE.lastIndex = 0;
    while ((m = SURAH_RE.exec(text))) {
      const surahName = (m[1] ?? "").trim();
      const ayah = toNum(m[2] ?? "0");
      const sid = SURAH_NUM[surahName];
      if (!sid) continue;
      const expected = map.get(`${sid}:${ayah}`);
      if (!expected) {
        flags.push(`referenced verse ${surahName}:${ayah}`);
        notes.push(`سورة ${surahName} ${ayah} — لم أعثر عليها في المصحف المحلي، تحقَّق من المصدر.`);
      }
    }
  }
  // Hadith attribution heuristic: look for "رواه X" / "أخرجه X" and flag if
  // X is a known collection but the cited text doesn't contain a recognisable
  // marker. This is best-effort — never blocks, just nudges verification.
  let hm: RegExpExecArray | null;
  HADITH_ATTR_RE.lastIndex = 0;
  while ((hm = HADITH_ATTR_RE.exec(text))) {
    const cited = (hm[1] ?? "").replace(/[،.].*$/, "").trim();
    const collection = HADITH_COLLECTIONS[cited];
    if (!collection) {
      const firstToken = cited.split(/\s+/)[0] ?? "";
      let cleanedCited = cited;
      cleanedCited = cleanedCited.replace(/\s*(?:في\s+(?:كتابه|صحيحه|مسنده|سننه|موطأه|صحيحها|الأم)|عن\s+\S.*)$/i, "").trim();
      const cleanedFirst = cleanedCited.split(/\s+/)[0] ?? firstToken;
      if (cleanedCited && HADITH_COLLECTIONS[cleanedCited]) continue;
      if (cleanedCited && cleanedCited === cleanedFirst && HADITH_COLLECTIONS[cleanedFirst]) continue;
      const binCount = (cleanedCited.match(/\s+بن\s+/g) ?? []).length;
      if (binCount >= 2) {
        notes.push(`نسبت حديثًا إلى سلسلة رواتٍ «${cleanedCited}» لم أتعرَّف عليها — تحقَّق من المصدر.`);
        continue;
      }
      const known = RECOGNISED_NARRATORS.has(cleanedCited) || RECOGNISED_FULL_FORMS.has(cleanedCited)
        || (RECOGNISED_NARRATORS.has(cleanedFirst) && RECOGNISED_FULL_FORMS.has(cleanedCited))
        || (cleanedCited === cleanedFirst && RECOGNISED_NARRATORS.has(cleanedFirst));
      if (cleanedCited.length > 0 && !known) {
        notes.push(`نسبت حديثًا إلى «${cleanedCited}» ولم أتعرَّف على هذا الراوي — تحقَّق من المصدر.`);
      }
      continue;
    }
    if (collection === "bukhari") {
      const hasMarker = /البخاري|رقم\s*\d+|كتاب\s+/.test(text);
      if (!hasMarker) {
        notes.push(`ذكرت «رواه ${cited}» دون تحديد رقم أو كتاب — تحقَّق من المصدر.`);
      }
    } else if (collection === "muslim") {
      const hasMarker = /مسلم|رقم\s*\d+|كتاب\s+/.test(text);
      if (!hasMarker) {
        notes.push(`ذكرت «أخرجه ${cited}» دون تحديد رقم أو كتاب — تحقَّق من المصدر.`);
      }
    }
  }
  // Extended: «ذكر البخاري في صحيحه» / «أخرجاه» — make sure a recognisable
  // narrator (companion or collector) is also in the surrounding text.
  if (/(ذكر\s+البخاري|أخرجاه)/.test(text)) {
    const hasRecognisedNarrator = Array.from(RECOGNISED_NARRATORS).some((n) => text.includes(n));
    if (!hasRecognisedNarrator) {
      notes.push("ذكرت اسم البخاري في صحيحه دون إيراد راوٍ معروف — تحقَّق من المصدر.");
    }
  }
  const hv = verifyHadith(text);
  for (const n of hv.notes) notes.push(n);
  // verifyHadith() re-scans the same HADITH_ATTR_RE matches as the loop
  // above, so an unrecognized narrator produces the identical note twice —
  // dedupe before returning.
  const uniqueNotes = Array.from(new Set(notes));
  return { flagged: flags.length > 0 || uniqueNotes.length > 0, notes: uniqueNotes };
}

export type VerificationReport = { flagged: boolean; notes: string[] };

const HADITH_COLLECTIONS: Record<string, "bukhari" | "muslim" | "other"> = {
  "البخاري": "bukhari",
  "مسلم": "muslim",
  "أبو داود": "other",
  "الترمذي": "other",
  "النسائي": "other",
  "ابن ماجه": "other",
  "مالك": "other",
  "أحمد": "other",
};

/** Recognised hadith narrators / books. Used to flag claims like
 *  «رواه أحمد بن محمد الفقيه» where the narrator is invented.
 *  Known canonical full-name forms so a lone «أحمد» matches Imam Ahmad but
 *  «أحمد بن محمد الفقيه» doesn't. */
const RECOGNISED_NARRATORS = new Set([
  "البخاري", "مسلم", "أبو داود", "الترمذي", "النسائي", "ابن ماجه", "مالك", "أحمد",
  "الطيالسي", "الدارمي", "البيهقي", "الطيبراني", "ابن حبان", "الحاكم",
  "ابن أبي شيبة", "عبد الرزاق", "ابن عدي", "العقيلي", "القطان",
]);

/** Full-name forms of canonical collectors (with their nasab). A claim like
 *  «أحمد بن محمد الفقيه» starts with a recognised first token but the rest
 *  doesn't match any of these. */
const RECOGNISED_FULL_FORMS = new Set([
  "أحمد بن حنبل",
  "أحمد بن شعيب النسائي",
  "أحمد بن يوسف",
  "أحمد بن محمد بن حنبل",
  "البخاري",
  "مسلم بن الحجاج",
  "أبو داود السجستاني",
  "الترمذي",
  "النسائي",
  "ابن ماجه",
  "مالك بن أنس",
]);

/** Match a hadith-attribution phrase like «رواه البخاري» or
 *  «رواه أحمد بن محمد الفقيه» or «ذكره الفقيه». We capture the full name
 *  chain up to a comma / dot / EOL so that fabricated nasabs
 *  (e.g. «أحمد بن محمد الفقيه») don't get truncated to a single recognised
 *  token like «أحمد». Then in the verifier we treat the FIRST whitespace-
 *  separated token as the canonical narrator name. */
// Negative lookbehind blocks a false match on "اذكر" (imperative "remember!")
// — without it, "ذكر" as a bare substring inside "اذكر" was misread as the
// hadith-citation verb "ذكر" (he mentioned), flagging ordinary sentences like
// "ثم اذكر الله معي بدعاء..." as a fabricated attribution to a fake narrator.
const HADITH_ATTR_RE = /(?<![ء-ي])(?:رواه|أخرجه|أخرّجه|روتنا|ذكره|ذكر)\s+([^،.\n]{1,120}?)(?=[،.\n]|$)/g;

/** Detect an unsupported surah:ayah citation in the surrounding text — if the
 *  assistant claims «رواه الفلاني» and embeds a fabricated Quran verse nearby,
 *  flag it. */
const FABRICATED_AYAH_RE = /(?:آية|قال\s+تعالى|قال\s+الله)\s*\(?\s*([٠-٩0-9]+)\s*[:：]\s*([٠-٩0-9]+)/g;

export type HadithVerifyResult = {
  plausible: boolean;
  flagged: boolean;
  notes: string[];
};

export function verifyHadith(text: string): HadithVerifyResult {
  const notes: string[] = [];
  let flagged = false;

  // 1) Detect fabricated Quran reference.
  let fm: RegExpExecArray | null;
  FABRICATED_AYAH_RE.lastIndex = 0;
  while ((fm = FABRICATED_AYAH_RE.exec(text))) {
    const surah = toNum(fm[1] ?? "0");
    const ayah = toNum(fm[2] ?? "0");
    const map = QURAN_VERSES;
    if (map && map.size > 0) {
      const expected = map.get(`${surah}:${ayah}`);
      if (!expected) {
        flagged = true;
        notes.push(`آية ${surah}:${ayah} — لم أعثر عليها في المصحف المحلي، تحقَّق من المصدر.`);
      }
    }
  }

  // 2) Look at every attribution phrase.
  let hm: RegExpExecArray | null;
  HADITH_ATTR_RE.lastIndex = 0;
  while ((hm = HADITH_ATTR_RE.exec(text))) {
    const cited = (hm[1] ?? "").trim();
    if (!cited) continue;
    const firstToken = cited.split(/\s+/)[0] ?? "";
    // Strip a leading trailing prepositional phrase ("في كتابه", "في صحيحه",
    // "عن فلان") so the cited name is purely a noun phrase.
    let cleanedCited = cited;
    cleanedCited = cleanedCited.replace(/\s*(?:في\s+(?:كتابه|صحيحه|مسنده|سننه|موطأه|صحيحها|الأم)|عن\s+\S.*)$/i, "").trim();
    const cleanedFirst = cleanedCited.split(/\s+/)[0] ?? firstToken;
    // Direct hit: cited IS exactly a known collection name (e.g. «البخاري»).
    if (cleanedCited && HADITH_COLLECTIONS[cleanedCited]) continue;
    if (cleanedCited && cleanedCited === cleanedFirst && HADITH_COLLECTIONS[cleanedFirst]) continue;
    // Multi-narrator chains ("محمد بن علي بن عبد الله") are almost always fabricated.
    const binCount = (cleanedCited.match(/\s+بن\s+/g) ?? []).length;
    if (binCount >= 2) {
      flagged = true;
      notes.push(`نسبت حديثًا إلى سلسلة رواتٍ «${cleanedCited}» لم أتعرَّف عليها — تحقَّق من المصدر.`);
      continue;
    }
    // Multi-word narrator with no canonical form: e.g. "أحمد بن محمد الفقيه"
    // first word matches RECOGNISED but the rest doesn't.
    if (RECOGNISED_NARRATORS.has(cleanedCited) || RECOGNISED_FULL_FORMS.has(cleanedCited)) continue;
    if (RECOGNISED_NARRATORS.has(cleanedFirst) && RECOGNISED_FULL_FORMS.has(cleanedCited)) continue;
    if (cleanedCited === cleanedFirst && RECOGNISED_NARRATORS.has(cleanedFirst)) continue;
    flagged = true;
    notes.push(`نسبت حديثًا إلى «${cleanedCited}» ولم أتعرَّف على هذا الراوي — تحقَّق من المصدر.`);
  }

  return { plausible: !flagged, flagged, notes };
}

export async function verifyAnswerAsync(text: string): Promise<VerificationReport> {
  const flags: string[] = [];
  const notes: string[] = [];

  let m: RegExpExecArray | null;
  SURAH_RE.lastIndex = 0;
  while ((m = SURAH_RE.exec(text))) {
    const surahName = (m[1] ?? "").trim();
    const ayah = toNum(m[2] ?? "0");
    const sid = SURAH_NUM[surahName];
    if (!sid) continue;
    const map = await buildQuranVerses();
    const expected = map.get(`${sid}:${ayah}`);
    if (!expected) {
      flags.push(`referenced verse سورة ${surahName}:${ayah} but no such ayah in local mushaf`);
      notes.push(`سورة ${surahName} ${ayah} — لم أعثر عليها في المصحف المحلي، تحقَّق من المصدر.`);
    }
  }
  // Combine with hadith attribution verification.
  const hv = verifyHadith(text);
  if (hv.flagged) {
    for (const n of hv.notes) notes.push(n);
  }
  return { flagged: flags.length > 0 || notes.length > 0, notes };
}
