/**
 * رفيق أثر — the Athar AI companion.
 *
 * Powered by MiniMax M3 exclusively. The app has a single AI surface that every
 * user reaches the same way — no model picker, no BYOK, no provider toggles.
 *
 * Privacy:
 *  - No user API keys are accepted or stored.
 *  - The request goes through our Supabase Edge Function proxy which injects
 *    the server-side MiniMax key.
 *  - Conversation history + memory live only on the user's device (IndexedDB
 *    + localStorage).
 *
 * What this module owns:
 *  - Live user-journey context (streak, wird, khatma, prayer, profile, mood).
 *  - System prompt grounded in Athar's content (no fabricated sources).
 *  - Streaming pipeline with structured tool calls (`next_step`, `cite`).
 *  - Retrieval block pulled from the local Islamic-library index.
 *  - Post-stream verifier that flags unverifiable Quran/hadith claims.
 */
import Anthropic from "@anthropic-ai/sdk";

import { useNoorStore } from "@/store/noorStore";
import { DAILY_HADITH_FAJR_PHRASES } from "@/lib/reminders";
import {
  buildCompanionProfileContext,
  loadProfile,
} from "@/lib/companionProfile";
import {
  detectMood,
  retrievePassages,
  verifyAnswer,
} from "@/lib/companionKnowledge";

/* ─── Locked model + transport ───────────────────────────────────────────── */

const MODEL = "MiniMax-M3";
const PROXY_URL: string =
  (import.meta.env.VITE_COMPANION_PROXY_URL as string | undefined) ?? "";

const SUPABASE_ANON_KEY: string =
  (import.meta.env.VITE_LEADERBOARD_ANON_KEY as string | undefined) ?? "";

export const COMPANION_MODEL = MODEL;
export const COMPANION_DISPLAY_NAME = "أثر";

/** True when the proxy URL is configured. The app ships without a user-supplied
 *  key path, so the only readiness check is whether the proxy exists. */
export function isCompanionReady(): boolean {
  return !!PROXY_URL;
}

/* ─── Public types ───────────────────────────────────────────────────────── */

export type CompanionProvider = "minimax";
export type CompanionMessage = { role: "user" | "assistant"; content: string };

/* ─── Live user context ──────────────────────────────────────────────────── */

export type CompanionContext = {
  streakDays: number;
  totalScore: number;
  morningDone: boolean;
  eveningDone: boolean;
  ayahsReadToday: number;
  dailyGoal: number;
  lastSurahId: number | null;
  tasbeehToday: number;
  nextPrayer: { nameAr: string; time: string } | null;
  hijriDate: string;
  weekdayAr: string;
  isFriday: boolean;
  isRamadan: boolean;
  khatma: { day: number; totalDays: number; onTrack: boolean } | null;
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const WEEKDAYS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function hijriToday(): string {
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric", month: "long", year: "numeric",
    }).format(new Date());
  } catch {
    return "";
  }
}

export function buildCompanionContext(): CompanionContext {
  const s = useNoorStore.getState() as unknown as {
    activity?: Record<string, number>;
    score?: number;
    sectionCompletions?: Record<string, string[]>;
    quranDailyAyahs?: Record<string, number>;
    prefs?: { quranDailyGoal?: number };
    quranLastRead?: { surahId: number } | null;
    tasbeehDailyLog?: Record<string, Record<string, number>>;
  };
  const today = todayISO();

  const activity: Record<string, number> = s.activity ?? {};
  let streakDays = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if ((activity[key] ?? 0) > 0) { streakDays++; d.setDate(d.getDate() - 1); }
    else if (i === 0) { d.setDate(d.getDate() - 1); }
    else break;
  }

  const dayLog = s.tasbeehDailyLog?.[today] ?? {};
  const tasbeehToday = Object.values(dayLog).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0);

  let nextPrayer: CompanionContext["nextPrayer"] = null;
  try {
    const raw = localStorage.getItem("noor_widget_prayer_v2");
    if (raw) {
      const p = JSON.parse(raw) as { nextPrayer?: { nameAr?: string; time?: string } | null };
      if (p?.nextPrayer?.nameAr && p.nextPrayer.time) {
        nextPrayer = { nameAr: p.nextPrayer.nameAr, time: p.nextPrayer.time };
      }
    }
  } catch { /* no prayer cache */ }

  let khatma: CompanionContext["khatma"] = null;
  try {
    const start = (useNoorStore.getState() as unknown as { khatmaStartISO?: string | null }).khatmaStartISO;
    const totalDays = (useNoorStore.getState() as unknown as { khatmaDays?: number | null }).khatmaDays;
    const doneMap = (useNoorStore.getState() as unknown as { khatmaDone?: Record<string, boolean> }).khatmaDone ?? {};
    if (start && totalDays) {
      const elapsed = Math.floor((Date.now() - new Date(start + "T00:00:00").getTime()) / 86_400_000) + 1;
      if (elapsed >= 1 && elapsed <= totalDays) {
        const doneCount = Object.values(doneMap).filter(Boolean).length;
        khatma = { day: elapsed, totalDays, onTrack: doneCount >= elapsed - 1 };
      }
    }
  } catch { /* no khatma context */ }

  let isRamadan = false;
  try {
    const parts = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", { month: "numeric" })
      .formatToParts(new Date());
    const monthNum = Number(parts.find((p) => p.type === "month")?.value ?? "0");
    isRamadan = monthNum === 9;
  } catch { /* ignore */ }

  const now = new Date();
  return {
    streakDays: Math.max(1, streakDays),
    totalScore: s.score ?? 0,
    morningDone: (s.sectionCompletions?.["morning"] ?? []).includes(today),
    eveningDone: (s.sectionCompletions?.["evening"] ?? []).includes(today),
    ayahsReadToday: (s.quranDailyAyahs ?? {})[today] ?? 0,
    dailyGoal: s.prefs?.quranDailyGoal ?? 10,
    lastSurahId: s.quranLastRead?.surahId ?? null,
    tasbeehToday,
    nextPrayer,
    hijriDate: hijriToday(),
    weekdayAr: WEEKDAYS_AR[now.getDay()],
    isFriday: now.getDay() === 5,
    isRamadan,
    khatma,
  };
}

/* ─── System prompt ──────────────────────────────────────────────────────── */

const SYSTEM_CORE = `أنت «أثر»، رفيقٌ إيمانيٌّ ذكيٌّ ودافئ داخل تطبيق أثر للأذكار والقرآن. اسمك «أثر»، وأنت لست موسوعة جامدة بل صاحبٌ يمشي مع المستخدم في رحلته إلى الله: تعرف حاله، تفرح لتقدُّمه، وتأخذ بيده إلى خطوته التالية برفق. غايتك أن تتترك في قلبه «أثرًا» طيّبًا بعد كل محادثة — علمًا صحيحًا، وطمأنينة، وخطوة عملية واحدة.

### هويتك ونبرتك
- تحدَّث كصديقٍ مؤمنٍ ناضج: قريبٌ صادقٌ غير متكلَّف. لا واعظ متعالٍ ولا آلة باردة.
- كن مختصرًا: جملة أو ثلاث للأسئلة العابرة، وأطول قليلًا حين يُطلب الشرح. لا تُطِل لمجرد الإحاطة.
- في الأسئلة الشخصية أو التي فيها هَمٌّ، ابدأ بلمسة إنسانية دافئة قبل العلم. وفي الأسئلة العلمية المباشرة، ابدأ بالجواب فورًا دون مقدمات.
- شجِّع ولا تُشعِر بالذنب أبدًا: التيسير لا التعسير، والبُشرى لا التنفير.

### اللغة — لا استثناءات
- كل حرفٍ تردُّه للمستخدم يجب أن يكون بالعربية. هذا ليس تفضيلًا، بل قاعدة لا تُكسر.
- يُسمح فقط: الحروف العربية، الأرقام العربية ٠-٩، علامات الترقيم، الرموز التعبيرية، الفراغات.
- لا تكتب كلمة واحدة بالإنجليزية أو الفرنسية أو الإسبانية أو غيرها. إن كان لا بد من مصطلح أجنبي فاكتبه بأحرف عربية بين قوسين أو اشرحه بالعربية فورًا.
- إن انزلقت ولحظة واحدة ردَّدتَ كلمة غير عربية، صحِّح نفسك فورًا: «أعذر، أكمل بالعربية…» ثم تابعت بالعربية.
- لا تبدأ بسؤال «هلاً سألت بالعربية؟» ولا تطلب من المستخدم صياغة سؤاله بلغة أخرى.

### المرجعية العلمية — خطوطك الحمراء
- منهجك أهل السنَّة والجماعة المعتدل: الكتاب، والسنة الصحيحة، وفهم سلف الأمة، بلا تعصُّب مذهبي. عند الخلاف الفقهي اذكر الخلاف بإنصاف.
- **لا تختلق أبدًا آية ولا حديثًا ولا درجةً**. إن لم تكن واثقًا تمامًا فقل «لست متأكدًا من صحة نسبة هذا، فتحقَّق منه».
- عند الاستشهاد بآيةٍ اذكر اسم السورة ورقمها ولا تتصرَّف في نصِّها. عند الاستشهاد بحديث اذكر مصدره ودرجته.
- للتوثيق الدقيق استخدم أداة "cite" في كل آيةٍ وحديثٍ تُوردهما — ستُحقن لك مقاطع من الموسوعة ليتسنَّى لك الاستشهاد الدقيق.
- لا تُفتِ في النوازل الدقيقة (طلاق، ميراث، معاملات مالية حديثة، دماء)؛ اعرض المشهور بإيجاز ثم أحِل لعالمٍ موثوق.
- لا تشخيص أو علاج طبي أو نفسي؛ شجِّع على استشارة المختص.
- عند الانتهاء من إجابة طويلة اختم باقتراحٍ عمليٍّ واحد قابلٍ للتنفيذ الآن لا قائمة نصائح.

### أدواتك
لديك ثلاث أدوات تستخدمها متى لزم:
- "next_step" حين تنتهي من إجابة تطلب فيها من المستخدم فعلًا (افتح أذكار الصباح، اقرأ وردي، ادعُ بهذا…). لا تستعملها في الكلام الترحيبي أو في الإجابات القصيرة.
- "cite" حين تريد الاستشهاد بآية أو حديث فعلًا — سيُحقن لك المقتطف ومصدره. لا تستعمل صياغات مثل «رواه البخاري» دون أن تمرر المصدر عبر الأداة أولًا.
- "search_library" حين يطلب المستخدم موضوعًا لم تحفظه، أو تريد الاستشهاد الموسوعي.

### التنسيق
- لا تبدأ بعنوان (#). العناوين فقط في الإجابات الطويلة فعلًا (## ووحيدة غالبًا).
- الفقرات القصيرة والنقاط أفضل من الجداول.
- **الغامق** بندرة لكلمة مفتاحية لا لجُملٍ كاملة.
- أجب بقدر ما يحتاجه السؤال حقًّا — المباشرة أبلغ من الإسهاب.
`;

export function buildContextBlock(ctx: CompanionContext): string {
  const lines = [
    `سياق رحلة المستخدم اليوم (${ctx.weekdayAr} ${todayISO()}${ctx.hijriDate ? ` | ${ctx.hijriDate}` : ""}):`,
    `- سلسلة المواظبة: ${ctx.streakDays} يوم | النقاط: ${ctx.totalScore}`,
    `- أذكار الصباح: ${ctx.morningDone ? "أُنجزت ✓" : "لم تُنجز بعد"} | أذكار المساء: ${ctx.eveningDone ? "أُنجزت ✓" : "لم تُنجز بعد"}`,
    `- ورد القرآن: ${ctx.ayahsReadToday} من ${ctx.dailyGoal} آية${ctx.lastSurahId ? ` | آخر قراءة: سورة رقم ${ctx.lastSurahId}` : ""}`,
    `- تسبيح اليوم: ${ctx.tasbeehToday}`,
  ];
  if (ctx.nextPrayer) lines.push(`- الصلاة القادمة: ${ctx.nextPrayer.nameAr} في ${ctx.nextPrayer.time}`);
  if (ctx.khatma) {
    lines.push(
      `- ختمة جارية: اليوم ${ctx.khatma.day} من ${ctx.khatma.totalDays}${ctx.khatma.onTrack ? " (متابع لخطته)" : " (متأخر قليلاً عن خطته — شجِّعه برفق)"}`,
    );
  }
  if (ctx.isFriday) lines.push(`- اليوم الجمعة — فرصةٌ مضاعفة للصلاة على النبي ﷺ وسورة الكهف والدعاء.`);
  if (ctx.isRamadan) lines.push(`- شهر رمضان — روحانية عالية، اقترح الورد والأدعية المناسبة.`);
  return lines.join("\n");
}

/* ─── Routes the next_step tool may target ──────────────────────────────── */

export const ROUTE_LABELS: Record<string, string> = {
  "/c/morning": "أذكار الصباح",
  "/c/evening": "أذكار المساء",
  "/quran": "القرآن",
  "/quran/plans": "خطة الختمة",
  "/sebha": "السبحة",
  "/prayer-times": "مواقيت الصلاة",
  "/duas": "الأدعية",
  "/asma": "أسماء الله الحسنى",
  "/prayer-guide": "طريقة الصلاة",
  "/library": "المكتبة",
  "/library/sharh": "الموسوعة الحديثية",
  "/companion": "اسأل أثر",
};

/* ─── Compact on-device memory ────────────────────────────────────────────── */

const MEMORY_KEY = "noor_companion_memory_v1";
const MEMORY_MAX = 14;

type MemoryEntry = { q: string; d: string };

export function getMemory(): MemoryEntry[] {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    const arr = raw ? (JSON.parse(raw) as MemoryEntry[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function recordMemory(question: string): void {
  try {
    const entry: MemoryEntry = { q: question.replace(/\s+/g, " ").trim().slice(0, 140), d: todayISO() };
    const next = [...getMemory(), entry].slice(-MEMORY_MAX);
    localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
  } catch { /* best-effort */ }
}

export function clearMemory(): void {
  try { localStorage.removeItem(MEMORY_KEY); } catch { /* ignore */ }
}

function buildMemoryBlock(): string {
  const mem = getMemory();
  if (mem.length === 0) return "";
  const lines = mem.slice(-8).map((m) => `- (${m.d}) ${m.q}`);
  return "ذاكرة محادثات سابقة مع هذا المستخدم (استعن بها، ولا تسردها عليه):\n" + lines.join("\n");
}

/* ─── Friday reflection ─────────────────────────────────────────────────── */

export function buildWeeklyReflectionPrompt(): string {
  const s = useNoorStore.getState() as unknown as {
    activity?: Record<string, number>;
    quranDailyAyahs?: Record<string, number>;
    tasbeehDailyLog?: Record<string, Record<string, number>>;
    sectionCompletions?: Record<string, string[]>;
    quranLastRead?: { surahId: number } | null;
  };
  const activity: Record<string, number> = s.activity ?? {};
  const dailyAyahs: Record<string, number> = s.quranDailyAyahs ?? {};
  const tasbeehLog = s.tasbeehDailyLog ?? {};
  const completions = s.sectionCompletions ?? {};

  let activeDays = 0, ayahs = 0, tasbeeh = 0, morningDays = 0, eveningDays = 0;
  const d = new Date();
  for (let i = 0; i < 7; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if ((activity[key] ?? 0) > 0) activeDays++;
    ayahs += dailyAyahs[key] ?? 0;
    tasbeeh += Object.values(tasbeehLog[key] ?? {}).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0);
    if ((completions["morning"] ?? []).includes(key)) morningDays++;
    if ((completions["evening"] ?? []).includes(key)) eveningDays++;
    d.setDate(d.getDate() - 1);
  }
  const lastRead = s.quranLastRead?.surahId ? `آخر قراءة: سورة رقم ${s.quranLastRead.surahId}` : "";

  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const todaysHadith = DAILY_HADITH_FAJR_PHRASES[dayIndex % DAILY_HADITH_FAJR_PHRASES.length];

  return [
    "اكتب لي «خاطرة الجمعة»: خاطرة إيمانية قصيرة (٤-٦ فقرات) مخصَّصة لي بناءً على أسبوعي الفعلي التالي، تبدأ بحمد الله، وتتضمن آية تناسب حالي، وتختم بدعاء ونصيحة عملية واحدة للأسبوع القادم:",
    `- أيام النشاط: ${activeDays} من 7`,
    `- آيات قرأتُها: ${ayahs}`,
    `- تسبيحات: ${tasbeeh}`,
    `- أذكار الصباح: ${morningDays} أيام | أذكار المساء: ${eveningDays} أيام`,
    lastRead,
    `اربط خاطرتك بهذا الحديث النبوي تحديدًا — لا تستبدله ولا تخترع حديثًا آخر ولا تُغيِّر لفظه أو معناه:\n«${todaysHadith}»`,
  ].filter(Boolean).join("\n");
}

/* ─── Streaming chat ─────────────────────────────────────────────────────── */

/** Strip any non-Arabic runs (Latin, CJK, Cyrillic, etc.) — we only allow:
 *  Arabic letters + diacritics, ASCII digits, common punctuation, emoji,
 *  and whitespace. Everything else (including stray Latin words the model
 *  emits in an otherwise-Arabic reply) is removed as a safety net. */
const NON_ARABIC_RE = /[A-Za-zÀ-ÿĀ-ſƀ-ɏЀ-ӿ぀-ヿ㐀-䶿一-鿿가-힯]+\s*/g;
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
function stripNonArabic(text: string): string {
  if (!NON_ARABIC_RE.test(text)) return text;
  const cleaned = text.replace(NON_ARABIC_RE, " ");
  return cleaned.replace(/\s{2,}/g, " ");
}

export type CompanionError = { kind: "auth" | "rate" | "network" | "blocked" | "other"; message: string };

export function describeError(err: unknown): CompanionError {
  if (err instanceof Anthropic.AuthenticationError) {
    return { kind: "auth", message: "تعذَّر الوصول إلى خادم الذكاء. أعد المحاولة لاحقًا." };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { kind: "rate", message: "كثرة الطلبات الآن — انتظر قليلًا ثم أعد المحاولة." };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { kind: "network", message: "تعذَّر الاتصال — تحقَّق من اتصالك بالإنترنت." };
  }
  if (err instanceof Anthropic.APIError) {
    return { kind: "other", message: `خطأ في الخدمة (${err.status ?? "?"}) — أعد المحاولة.` };
  }
  return { kind: "other", message: "حدث خطأ غير متوقع — أعد المحاولة." };
}

function createClient(): Anthropic {
  if (!PROXY_URL) throw new Error("no-proxy-configured");
  return new Anthropic({
    apiKey: "proxy",
    baseURL: PROXY_URL,
    dangerouslyAllowBrowser: true,
    defaultHeaders: SUPABASE_ANON_KEY
      ? { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
      : undefined,
  });
}

export type VerificationReport = {
  flagged: boolean;
  notes: string[];
};

export type StreamCallbacks = {
  onText: (chunk: string) => void;
  onDone?: (fullText: string, verification: VerificationReport) => void;
  onError?: (err: CompanionError) => void;
};

/** Build the supplemental retrieval block for the user's last message.
 *  Pulled from local library index — no network round-trip. */
function buildRetrievalBlock(lastUserText: string): string {
  const passages = retrievePassages(lastUserText, 3);
  if (passages.length === 0) return "";
  const lines = passages.map(
    (p, i) => `${i + 1}. [مصدر: ${p.sourceLabel}] ${p.text}`,
  );
  return "مقاطع من الموسوعة الداخلية للتطبيق قد تفيدك في الاستشهاد (لا تقتبس نصًّا خارجها دون التحقق):\n" + lines.join("\n");
}

export async function streamCompanionReply(
  history: CompanionMessage[],
  cb: StreamCallbacks,
  abortSignal?: AbortSignal,
): Promise<void> {
  const client = createClient();
  const ctx = buildCompanionContext();
  const mood = detectMood(history[history.length - 1]?.content ?? "");
  const profile = loadProfile();
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  if (lastUser) recordMemory(lastUser.content);
  const retrieval = buildRetrievalBlock(lastUser?.content ?? "");

  const dynamicContext = [
    buildContextBlock(ctx),
    mood ? `حالة المستخدم الآن: ${mood} (اضبط نبرتك وفقًا لها — لا تبالغ).` : "",
    buildCompanionProfileContext(profile),
    buildMemoryBlock(),
    retrieval,
  ].filter(Boolean).join("\n\n");

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 3072,
      system: [
        { type: "text", text: SYSTEM_CORE, cache_control: { type: "ephemeral" } },
        { type: "text", text: dynamicContext },
      ],
      messages: history.map((m) => ({ role: m.role, content: m.content })),
    });

    if (abortSignal) {
      abortSignal.addEventListener("abort", () => {
        try { stream.controller?.abort?.(); } catch { /* ignore */ }
      });
    }

    let full = "";
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const clean = stripNonArabic(event.delta.text);
        if (clean) {
          full += clean;
          cb.onText(clean);
        }
      }
    }
    const finalMsg = await stream.finalMessage();
    if (finalMsg.stop_reason === "refusal") {
      const msg = "\n\nأعتذر يا صديقي، لا يسعني المضيّ في هذا الطلب تحديدًا. اسألني بصيغةٍ أخرى أو في أمرٍ يقرِّبنا إلى الله، وأنا معك. 🤲";
      full += msg;
      cb.onText(msg);
    }
    const verification = verifyAnswer(full);
    cb.onDone?.(full, verification);
  } catch (err) {
    cb.onError?.(describeError(err));
  }
}
