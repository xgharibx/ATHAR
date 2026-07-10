/**
 * رفيق أثر — the Athar AI companion.
 *
 * Personalized Islamic study companion powered by the Claude API:
 *  - The user's API key is stored ONLY on their device (localStorage) and the
 *    request goes directly from their device to Anthropic — no middle server.
 *  - Every conversation is grounded in the user's live journey: streak, score,
 *    today's adhkar progress, Quran wird position, and next prayer.
 *  - Guardrails: cite sources, distinguish authenticity levels, refer fiqh
 *    rulings to qualified scholars, keep Islamic adab.
 */
import Anthropic from "@anthropic-ai/sdk";
import { useNoorStore } from "@/store/noorStore";

const KEY_STORAGE = "noor_companion_api_key_v1";
const MINIMAX_KEY_STORAGE = "noor_companion_minimax_key_v1";
const MODEL_STORAGE = "noor_companion_model_v1";

/**
 * App-provided credentials — the user never has to enter anything.
 * Configure at build time (.env.local / CI secret):
 *   VITE_COMPANION_PROXY_URL — the companion proxy (supabase/functions/companion):
 *                              same Messages API surface, injects keys server-side,
 *                              routes by model name (claude-* → Anthropic,
 *                              MiniMax-* → MiniMax), and adds the CORS headers
 *                              MiniMax's own API lacks. THE way to ship.
 *   VITE_COMPANION_API_KEY   — Anthropic API key baked into the build (dev only)
 *   VITE_MINIMAX_API_KEY     — MiniMax API key baked into the build (dev only;
 *                              browsers can't reach MiniMax directly — CORS)
 * A locally-stored key (advanced settings) is kept as a final fallback.
 */
const APP_KEY: string = (import.meta.env.VITE_COMPANION_API_KEY as string | undefined) ?? "";
const PROXY_URL: string = (import.meta.env.VITE_COMPANION_PROXY_URL as string | undefined) ?? "";
const MINIMAX_APP_KEY: string = (import.meta.env.VITE_MINIMAX_API_KEY as string | undefined) ?? "";

/** MiniMax serves an Anthropic-compatible Messages API — same SDK, different base URL. */
const MINIMAX_BASE_URL = "https://api.minimax.io/anthropic";

export type CompanionProvider = "anthropic" | "minimax";

export type CompanionMessage = { role: "user" | "assistant"; content: string };

export const COMPANION_MODELS: ReadonlyArray<{ id: string; label: string; provider: CompanionProvider }> = [
  { id: "claude-opus-4-8", label: "Opus — الأذكى", provider: "anthropic" },
  { id: "claude-sonnet-5", label: "Sonnet — متوازن", provider: "anthropic" },
  { id: "claude-haiku-4-5", label: "Haiku — الأسرع", provider: "anthropic" },
  { id: "MiniMax-M3", label: "MiniMax M3 — الاقتصادي", provider: "minimax" },
] as const;

export function providerForModel(model: string): CompanionProvider {
  return COMPANION_MODELS.find((m) => m.id === model)?.provider ?? "anthropic";
}

/**
 * The proxy (supabase/functions/companion) only forwards to upstreams it has a
 * server-side secret for. Today that's MINIMAX_API_KEY only — Claude has never
 * had an app-wide key (ANTHROPIC_API_KEY secret was never set); it stays a
 * bring-your-own-key model. Keep this in sync with `npx supabase secrets list`.
 */
const PROXY_SERVES_MINIMAX = true;
const PROXY_SERVES_ANTHROPIC = false;

/** True when the given provider has app-shipped credentials (no user setup needed). */
export function hasAppProvidedAccess(provider: CompanionProvider = providerForModel(getModel())): boolean {
  if (provider === "minimax") return !!((PROXY_URL && PROXY_SERVES_MINIMAX) || MINIMAX_APP_KEY);
  return !!((PROXY_URL && PROXY_SERVES_ANTHROPIC) || APP_KEY);
}

/** True when a specific provider can chat right now (proxy, app key, or local key). */
export function isProviderReady(provider: CompanionProvider): boolean {
  if (provider === "minimax") return !!((PROXY_URL && PROXY_SERVES_MINIMAX) || MINIMAX_APP_KEY || getMinimaxKey());
  return !!((PROXY_URL && PROXY_SERVES_ANTHROPIC) || APP_KEY || getApiKey());
}

/** True when the companion can chat right now with the currently selected model. */
export function isCompanionReady(): boolean {
  return isProviderReady(providerForModel(getModel()));
}

export function getApiKey(): string {
  try { return localStorage.getItem(KEY_STORAGE) ?? ""; } catch { return ""; }
}
export function setApiKey(key: string): void {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch { /* storage unavailable */ }
}
export function getMinimaxKey(): string {
  try { return localStorage.getItem(MINIMAX_KEY_STORAGE) ?? ""; } catch { return ""; }
}
export function setMinimaxKey(key: string): void {
  try {
    if (key) localStorage.setItem(MINIMAX_KEY_STORAGE, key);
    else localStorage.removeItem(MINIMAX_KEY_STORAGE);
  } catch { /* storage unavailable */ }
}
/**
 * Default model: prefer the first model whose provider is actually usable,
 * so a build shipping only a MiniMax key still works out of the box.
 */
function defaultModel(): string {
  const usable = COMPANION_MODELS.find((m) => isProviderReady(m.provider));
  return usable?.id ?? "claude-opus-4-8";
}
export function getModel(): string {
  try {
    const stored = localStorage.getItem(MODEL_STORAGE);
    if (stored) return stored;
  } catch { /* storage unavailable */ }
  return defaultModel();
}
export function setModel(model: string): void {
  try { localStorage.setItem(MODEL_STORAGE, model); } catch { /* ignore */ }
}

// ─── Live user context ───────────────────────────────────────────────────────

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
  khatma: { day: number; totalDays: number; onTrack: boolean } | null;
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const WEEKDAYS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/** Today in the Umm al-Qura Hijri calendar, e.g. "١٥ محرم ١٤٤٨ هـ". */
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
  const s = useNoorStore.getState();
  const today = todayISO();

  const activity: Record<string, number> = (s as { activity?: Record<string, number> }).activity ?? {};
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

  // Active khatma plan: which day are we on, and is the reader keeping pace?
  let khatma: CompanionContext["khatma"] = null;
  try {
    const start = (s as { khatmaStartISO?: string | null }).khatmaStartISO;
    const totalDays = (s as { khatmaDays?: number | null }).khatmaDays;
    const doneMap = (s as { khatmaDone?: Record<string, boolean> }).khatmaDone ?? {};
    if (start && totalDays) {
      const elapsed = Math.floor((Date.now() - new Date(start + "T00:00:00").getTime()) / 86_400_000) + 1;
      if (elapsed >= 1 && elapsed <= totalDays) {
        const doneCount = Object.values(doneMap).filter(Boolean).length;
        khatma = { day: elapsed, totalDays, onTrack: doneCount >= elapsed - 1 };
      }
    }
  } catch { /* no khatma context */ }

  const now = new Date();
  return {
    streakDays: Math.max(1, streakDays),
    totalScore: (s as { score?: number }).score ?? 0,
    morningDone: (s.sectionCompletions?.["morning"] ?? []).includes(today),
    eveningDone: (s.sectionCompletions?.["evening"] ?? []).includes(today),
    ayahsReadToday: (s.quranDailyAyahs ?? {})[today] ?? 0,
    dailyGoal: s.prefs.quranDailyGoal ?? 10,
    lastSurahId: s.quranLastRead?.surahId ?? null,
    tasbeehToday,
    nextPrayer,
    hijriDate: hijriToday(),
    weekdayAr: WEEKDAYS_AR[now.getDay()],
    isFriday: now.getDay() === 5,
    khatma,
  };
}

// ─── System prompt ───────────────────────────────────────────────────────────

/** Stable core — cached across turns (prefix caching). Keep byte-stable. */
const SYSTEM_CORE = `أنت «رفيق أثر»، مرشد روحي إسلامي أصيل وذكي داخل تطبيق أثر للأذكار والقرآن الكريم. هدفك أن تكون أفضل رفيق إيماني ممكن: دقيق علميًا، رحيم في الأسلوب، وعمليًا في التوجيه.

المرجعية والدقة العلمية:
- التزم بمنهج أهل السنة والجماعة المعتدل في الاستدلال (الكتاب، والسنة الصحيحة، وفهم السلف وعلماء الأمة المعتبرين)، بلا تعصّب مذهبي ظاهر: إن اختلف الفقهاء (حنفية، مالكية، شافعية، حنابلة) في مسألة فرعية، اذكر ذلك بإنصاف دون ترجيح متعجّل، ثم وجّه السائل لأهل العلم الموثوقين في بلده.
- تجنّب الخوض في الخلافات العقدية أو الطائفية الحساسة؛ إن سُئلت عنها فاذكر أن أهل السنة يمثلون جمهور الأمة تاريخيًا مع احترام كل مسلم، ولا تخض في تفاصيل تُشعل نقاشًا لا طائل منه.
- لا تفتِ في النوازل أو المسائل الخلافية الدقيقة (كالطلاق، والميراث المعقد، والمعاملات المالية الحديثة)؛ اعرض الأقوال المشهورة بإيجاز ثم أحِل السائل لعالم موثوق أو دار إفتاء معتمدة.
- عند الاستشهاد بآية اذكر اسم السورة ورقم الآية حرفيًا وبلا تصرف في نصها. عند الاستشهاد بحديث اذكر مصدره الدقيق (رواه البخاري / رواه مسلم / رواه الترمذي وصححه الألباني، إلخ) ودرجته (صحيح/حسن/ضعيف) إن كانت معروفة لديك بثقة — وإن لم تكن متأكدًا تمامًا من درجة حديث أو نصه أو نسبته فقل ذلك صراحة ولا تختلقه أبدًا؛ اختلاق حديث أو درجة كذبًا على النبي ﷺ من أعظم المحاذير. إن ذُكرت لك درجة حديث موثّقة من مصدرها داخل سياق السؤال فاعتمدها كما هي دون تعديل. للتحقق الموسّع من درجة أي حديث ونص شرحه العلمي الكامل، يملك التطبيق موسوعة حديثية علمية محكّمة (رابط: [/library/sharh الموسوعة الحديثية]) — اذكرها للمستخدم عند الحاجة لتوثيق أعمق.
- ميّز دومًا بين القطعي (نصوص صريحة متفق عليها) والاجتهادي (مسائل فيها نظر)، ولا تقدّم رأيك الشخصي على أنه حكم شرعي قاطع.

الأسلوب والأدب:
- أجب بالعربية الفصحى الميسّرة حصرًا من أول الإجابة إلى آخرها — لا تُقحم أي كلمة أو حرف من لغة أخرى (كالصينية أو الروسية أو غيرها) مهما كان السياق. إن اقتبست مصطلحًا أجنبيًا فاكتبه بحروف عربية إن أمكن. وأجب بأسلوب رحيم ومشجّع لا يُشعر بالذنب أو التقصير، وبإيجاز يناسب السؤال (فقرة إلى ثلاث عادة، إلا إن طُلب التفصيل).
- ابدأ غالبًا بلمسة إنسانية دافئة قبل الجواب العلمي إن كان السؤال شخصيًا أو فيه هَمّ، فالرفق جزء من الرسالة لا زيادة عليها.
- لا تقدّم نصائح طبية أو نفسية متخصصة؛ شجّع على استشارة المختصين مع الدعاء والذكر كعون لا كبديل عن العلاج.
- إن سُئلت عن مصادر بيانات القرآن فأرشد إلى المكتبة القرآنية الشاملة QUL من ترتيل (qul.tarteel.ai) وإلى المصاحف المعتمدة.

الشخصنة والتفاعل مع التطبيق:
- استعمل سياق رحلة المستخدم المرفق (تاريخه الهجري، يوم الأسبوع، تقدّمه في الأذكار والورد والختمة والتسبيح، والصلاة القادمة) لتجعل نصيحتك شخصية وعملية ومرتبطة بلحظته الفعلية، لا نصيحة عامة.
- إن كان يوم جمعة ذكّره برفق بفضلها (الصلاة على النبي ﷺ، سورة الكهف، ساعة الإجابة) دون إلزام.
- إن كان في ختمة جارية ومتأخرًا قليلاً، شجّعه بلطف دون تأنيب — التيسير لا التعسير.
- روابط التطبيق: استعمل حصرًا واحدًا من هذه الروابط الجاهزة إن ناسب السياق (لا تُكثر منها، واحد أو اثنان كافيان)، وانسخ الصيغة حرفيًا كما هي — قوس مربّع، ثم المسار كاملًا بالشرطة المائلة الأولى، مسافة واحدة، ثم التسمية العربية، ثم قوس مربّع للإغلاق — لا تُبدّل ترتيبها ولا تحذف الشرطة المائلة ولا تخترع رابطًا غير موجود في هذه القائمة:
[/c/morning أذكار الصباح] [/c/evening أذكار المساء] [/quran القرآن] [/sebha السبحة] [/prayer-times مواقيت الصلاة] [/duas الأدعية] [/asma أسماء الله الحسنى] [/quran/plans الختمة] [/prayer-guide كيفية الصلاة] [/library المكتبة]
- اختم الإجابات الطويلة نسبيًا باقتراح عملي واحد وقابل للتنفيذ فورًا، لا قائمة نصائح.

تنسيق الإجابة (مهم جدًا — أنت تكتب في فقاعة محادثة ضيقة على الهاتف، لا في مستند):
- لا تبدأ أي إجابة بعنوان كبير (# أو ##)، خصوصًا في الأسئلة الشخصية أو العاطفية القصيرة — ابدأ مباشرة بجملة دافئة أو بالجواب نفسه.
- استعمل العناوين (##) فقط في الإجابات الطويلة فعلًا التي تقارن بين أقوال أو تشرح خطوات متعددة، وبحد أقصى عنوانين.
- فضّل الفقرات القصيرة المتصلة والنقاط (-) على الجداول؛ لا تستعمل جدول Markdown إلا إذا كانت المقارنة تحتاج فعلًا أكثر من عمودين وسيكون الجدول أوضح من النثر.
- استعمل **الخط الغامق** بندرة لإبراز كلمة أو اثنتين مهمتين فقط، لا لتنسيق جمل كاملة.
- الإجابة القصيرة المباشرة (سطر إلى ثلاثة) أفضل من إجابة طويلة مقسّمة إلى عناوين لمجرد الإحاطة الشاملة — أجب بقدر ما يحتاجه السؤال فعلًا.`;

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
      `- ختمة جارية: اليوم ${ctx.khatma.day} من ${ctx.khatma.totalDays}${ctx.khatma.onTrack ? " (متابع لخطته)" : " (متأخر قليلاً عن خطته — شجّعه برفق)"}`,
    );
  }
  if (ctx.isFriday) lines.push(`- اليوم الجمعة — فرصة مضاعفة للصلاة على النبي ﷺ وسورة الكهف والدعاء.`);
  return lines.join("\n");
}

// ─── Companion memory (on-device only) ──────────────────────────────────────
// The companion remembers what you've asked about across sessions — goals,
// surahs you were working on, struggles you mentioned — so answers build on
// your journey instead of starting cold. Stored only in localStorage.

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
    const entry: MemoryEntry = {
      q: question.replace(/\s+/g, " ").trim().slice(0, 140),
      d: todayISO(),
    };
    const next = [...getMemory(), entry].slice(-MEMORY_MAX);
    localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
  } catch {
    // memory is best-effort
  }
}

export function clearMemory(): void {
  try { localStorage.removeItem(MEMORY_KEY); } catch { /* ignore */ }
}

function buildMemoryBlock(): string {
  const mem = getMemory();
  if (mem.length === 0) return "";
  const lines = mem.slice(-8).map((m) => `- (${m.d}) ${m.q}`);
  return "ذاكرة محادثات سابقة مع هذا المستخدم (استعن بها لتكون نصيحتك متصلة برحلته، ولا تسردها عليه):\n" + lines.join("\n");
}

// ─── خاطرة الجمعة — the personal weekly reflection ──────────────────────────

/** Build a prompt for a personalized weekly reflection from the user's REAL week. */
export function buildWeeklyReflectionPrompt(): string {
  const s = useNoorStore.getState();
  const activity: Record<string, number> = (s as { activity?: Record<string, number> }).activity ?? {};
  const dailyAyahs: Record<string, number> = s.quranDailyAyahs ?? {};
  const tasbeehLog = s.tasbeehDailyLog ?? {};
  const completions = s.sectionCompletions ?? {};

  let activeDays = 0;
  let ayahs = 0;
  let tasbeeh = 0;
  let morningDays = 0;
  let eveningDays = 0;
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

  return [
    "اكتب لي «خاطرة الجمعة»: خاطرة إيمانية قصيرة (٤-٦ فقرات) مخصّصة لي بناءً على أسبوعي الفعلي التالي، تبدأ بحمد الله، وتتضمن آية وحديثًا صحيحًا يناسبان حالي مع ذكر المصدر، وتختم بدعاء ونصيحة عملية واحدة للأسبوع القادم:",
    `- أيام النشاط: ${activeDays} من 7`,
    `- آيات قرأتها: ${ayahs}`,
    `- تسبيحات: ${tasbeeh}`,
    `- أذكار الصباح: ${morningDays} أيام | أذكار المساء: ${eveningDays} أيام`,
    lastRead,
  ].filter(Boolean).join("\n");
}

// ─── Streaming chat ──────────────────────────────────────────────────────────

/** Strip CJK-script runs (Han/Hiragana/Katakana/Hangul) — never legitimate in
 *  an Arabic reply, so removing them can't lose real content. */
const CJK_RE = /[぀-ヿ㐀-䶿一-鿿가-힯]+\s*/g;
function stripStrayCJK(text: string): string {
  return CJK_RE.test(text) ? text.replace(CJK_RE, "") : text;
}

export type CompanionError = { kind: "auth" | "rate" | "network" | "other"; message: string };

export function describeError(err: unknown): CompanionError {
  if (err instanceof Anthropic.AuthenticationError) {
    return { kind: "auth", message: "مفتاح API غير صالح — تحقق منه في الإعدادات." };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { kind: "rate", message: "تم تجاوز حد الطلبات مؤقتًا — انتظر قليلًا ثم أعد المحاولة." };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { kind: "network", message: "تعذّر الاتصال — تحقق من اتصالك بالإنترنت." };
  }
  if (err instanceof Anthropic.APIError) {
    return { kind: "other", message: `خطأ من الخدمة (${err.status ?? "?"}) — أعد المحاولة.` };
  }
  return { kind: "other", message: "حدث خطأ غير متوقع — أعد المحاولة." };
}

/**
 * Stream a companion reply. Yields incremental text chunks.
 * The caller is responsible for aborting via the returned controller if needed.
 */
/** Supabase's Kong gateway requires its own `apikey`/Authorization on top of
 *  whatever the function itself checks — same pattern as leaderboard.ts. */
const SUPABASE_ANON_KEY: string = (import.meta.env.VITE_LEADERBOARD_ANON_KEY as string | undefined) ?? "";

function createClient(model: string): Anthropic {
  const provider = providerForModel(model);

  if (PROXY_URL && ((provider === "minimax" && PROXY_SERVES_MINIMAX) || (provider === "anthropic" && PROXY_SERVES_ANTHROPIC))) {
    // The proxy injects the real key server-side and routes by model name.
    // The placeholder apiKey keeps the SDK happy — the proxy ignores it.
    return new Anthropic({
      apiKey: "proxy",
      baseURL: PROXY_URL,
      dangerouslyAllowBrowser: true,
      defaultHeaders: SUPABASE_ANON_KEY
        ? { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
        : undefined,
    });
  }
  if (provider === "minimax") {
    // Direct MiniMax only works where CORS doesn't apply (dev tools, native shells).
    const apiKey = MINIMAX_APP_KEY || getMinimaxKey();
    if (!apiKey) throw new Error("no-api-key");
    return new Anthropic({ apiKey, baseURL: MINIMAX_BASE_URL, dangerouslyAllowBrowser: true });
  }
  const apiKey = APP_KEY || getApiKey();
  if (!apiKey) throw new Error("no-api-key");
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

export async function* streamCompanionReply(
  history: CompanionMessage[],
): AsyncGenerator<string, void, void> {
  const model = getModel();
  const client = createClient(model);
  const ctx = buildCompanionContext();

  // Remember what was asked so future sessions build on this one.
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  if (lastUser) recordMemory(lastUser.content);

  // Adaptive thinking trades latency for reasoning depth — worth it on Opus/Sonnet
  // for a spiritual guide that should reason carefully. Haiku doesn't support it.
  // MiniMax M3 defaults to thinking OFF for a reason: this chat UI never displays
  // reasoning content, so forcing it on here would only add silent, invisible
  // latency (measured: ~15s of dead air per reply) for zero visible benefit —
  // leave MiniMax at its own default.
  const thinking = providerForModel(model) === "anthropic" && model !== "claude-haiku-4-5"
    ? ({ type: "adaptive" } as const)
    : undefined;

  const memoryBlock = buildMemoryBlock();
  const stream = client.messages.stream({
    model,
    max_tokens: 4096,
    ...(thinking ? { thinking } : {}),
    system: [
      // Stable core first (cacheable prefix) …
      { type: "text", text: SYSTEM_CORE, cache_control: { type: "ephemeral" } },
      // … volatile per-day context + cross-session memory after the breakpoint.
      { type: "text", text: buildContextBlock(ctx) + (memoryBlock ? "\n\n" + memoryBlock : "") },
    ],
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      // Defense-in-depth against a real MiniMax M3 glitch observed in testing:
      // occasional stray CJK-script tokens leaking into an otherwise-Arabic
      // reply (e.g. "أي سورة 你喜欢"). Arabic religious guidance never
      // legitimately needs CJK characters, so stripping them is a safe,
      // surgical filter — not a fix for the model itself, just a safety net.
      yield stripStrayCJK(event.delta.text);
    }
  }

  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") {
    yield "\n\nأعتذر — لا أستطيع المساعدة في هذا الطلب.";
  }
}
