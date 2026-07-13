/**
 * Athar knowledge layer — retrieval + verification.
 *
 * Retrieval: a tiny in-memory inverted index over the bundled Islamic library
 * (sharh-bundled.json, the search-index.json, and the Quran). Built lazily on
 * first access and kept in module memory (rebuilt on app start). The index is
 * plain JS — no embeddings, no network — so it's instant, private, and free.
 *
 * Verification: scans an assistant answer for Quran refs (e.g. "سورة البقرة:٢٥٥")
 * and hadith attributions (e.g. "رواه البخاري") and checks whether the cited
 * source contains something compatible. Returns a VerificationReport the UI
 * can surface as a soft "تحقق من المصدر" chip — never blocks the reply.
 */

type Passage = { source: string; sourceLabel: string; text: string };

let INDEX: Passage[] | null = null;
let INDEX_PROMISE: Promise<Passage[]> | null = null;
let QURAN_VERSES: Map<string, string> | null = null;

const ARABIC_DIACRITICS = /[\u064B-\u0652\u0670\u0640]/g;
function normalize(s: string): string {
  return s.replace(ARABIC_DIACRITICS, "").replace(/\s+/g, " ").trim();
}

function tokenize(s: string): string[] {
  return normalize(s)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 3);
}

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
      const [a, b, c, d] = await Promise.all([
        buildSharhIndex(),
        buildSearchIndex(),
        buildTafsirIndex(),
        buildProphetStoriesIndex(),
      ]);
      const all = [...a, ...b, ...c, ...d];
      INDEX = all;
      return all;
    })();
  }
  return INDEX_PROMISE;
}

export function retrievePassages(query: string, k = 3): Passage[] {
  const tokens = tokenize(query).slice(0, 12);
  if (tokens.length === 0) return [];
  const idx = INDEX;
  if (!idx) {
    void getIndex();
    return [];
  }
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
  return { flagged: flags.length > 0, notes };
}

export function verifyAnswer(text: string): VerificationReport {
  const map = QURAN_VERSES;
  const flags: string[] = [];
  const notes: string[] = [];
  if (!map || map.size === 0) return { flagged: false, notes: [] };

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
  return { flagged: flags.length > 0, notes };
}

export type VerificationReport = { flagged: boolean; notes: string[] };
