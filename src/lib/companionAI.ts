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
const MODEL_STORAGE = "noor_companion_model_v1";

/**
 * App-provided credentials — the user never has to enter anything.
 * Configure ONE of these at build time (.env.local / CI secret):
 *   VITE_COMPANION_API_KEY   — Anthropic API key baked into the build
 *   VITE_COMPANION_PROXY_URL — your proxy that injects the key server-side
 *                              (same Messages API surface; safer to ship)
 * A locally-stored key (advanced settings) is kept as a final fallback.
 */
const APP_KEY: string = (import.meta.env.VITE_COMPANION_API_KEY as string | undefined) ?? "";
const PROXY_URL: string = (import.meta.env.VITE_COMPANION_PROXY_URL as string | undefined) ?? "";

export function hasAppProvidedAccess(): boolean {
  return !!(APP_KEY || PROXY_URL);
}

/** True when the companion can chat right now (app key, proxy, or local key). */
export function isCompanionReady(): boolean {
  return hasAppProvidedAccess() || !!getApiKey();
}

export type CompanionMessage = { role: "user" | "assistant"; content: string };

export const COMPANION_MODELS = [
  { id: "claude-opus-4-8", label: "Opus — الأذكى" },
  { id: "claude-sonnet-5", label: "Sonnet — متوازن" },
  { id: "claude-haiku-4-5", label: "Haiku — الأسرع" },
] as const;

export function getApiKey(): string {
  try { return localStorage.getItem(KEY_STORAGE) ?? ""; } catch { return ""; }
}
export function setApiKey(key: string): void {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch { /* storage unavailable */ }
}
export function getModel(): string {
  try { return localStorage.getItem(MODEL_STORAGE) ?? "claude-opus-4-8"; } catch { return "claude-opus-4-8"; }
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
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  };
}

// ─── System prompt ───────────────────────────────────────────────────────────

/** Stable core — cached across turns (prefix caching). Keep byte-stable. */
const SYSTEM_CORE = `أنت «رفيق أثر»، مرشد روحي ذكي داخل تطبيق أثر للأذكار والقرآن الكريم.

آداب الإجابة وضوابطها:
- أجب بالعربية الفصحى الميسّرة بأسلوب رحيم ومشجّع، وبإيجاز يناسب السؤال.
- عند الاستشهاد بآية اذكر اسم السورة ورقم الآية، وعند الاستشهاد بحديث اذكر مصدره (مثل: رواه البخاري) ودرجته إن كانت معروفة، ولا تنسب شيئًا للنبي ﷺ دون تثبّت.
- لا تُفتِ في مسائل الخلاف الفقهي أو النوازل: بيّن الأقوال المشهورة بإنصاف ثم وجّه السائل إلى أهل العلم الموثوقين في بلده.
- لا تقدّم نصائح طبية أو نفسية متخصصة؛ شجّع على استشارة المختصين مع الدعاء والذكر.
- إن سُئلت عن مصادر بيانات القرآن فأرشد إلى المكتبة القرآنية الشاملة QUL من ترتيل (qul.tarteel.ai) وإلى المصاحف المعتمدة.
- روابط التطبيق التي يمكنك اقتراحها بين قوسين معقوفين عند المناسبة: [/c/morning أذكار الصباح] [/c/evening أذكار المساء] [/quran القرآن] [/sebha السبحة] [/prayer-times مواقيت الصلاة] [/duas الأدعية] [/asma أسماء الله الحسنى].
- استعمل سياق رحلة المستخدم المرفق لتجعل نصيحتك شخصية وعملية: اقترح الخطوة التالية الأنسب له اليوم.`;

export function buildContextBlock(ctx: CompanionContext): string {
  const lines = [
    `سياق رحلة المستخدم اليوم (${todayISO()}):`,
    `- سلسلة المواظبة: ${ctx.streakDays} يوم | النقاط: ${ctx.totalScore}`,
    `- أذكار الصباح: ${ctx.morningDone ? "أُنجزت ✓" : "لم تُنجز بعد"} | أذكار المساء: ${ctx.eveningDone ? "أُنجزت ✓" : "لم تُنجز بعد"}`,
    `- ورد القرآن: ${ctx.ayahsReadToday} من ${ctx.dailyGoal} آية${ctx.lastSurahId ? ` | آخر قراءة: سورة رقم ${ctx.lastSurahId}` : ""}`,
    `- تسبيح اليوم: ${ctx.tasbeehToday}`,
  ];
  if (ctx.nextPrayer) lines.push(`- الصلاة القادمة: ${ctx.nextPrayer.nameAr} في ${ctx.nextPrayer.time}`);
  return lines.join("\n");
}

// ─── Streaming chat ──────────────────────────────────────────────────────────

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
function createClient(): Anthropic {
  if (PROXY_URL) {
    // The proxy injects the real key server-side; the placeholder keeps the SDK happy.
    return new Anthropic({ apiKey: "proxy", baseURL: PROXY_URL, dangerouslyAllowBrowser: true });
  }
  const apiKey = APP_KEY || getApiKey();
  if (!apiKey) throw new Error("no-api-key");
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

export async function* streamCompanionReply(
  history: CompanionMessage[],
): AsyncGenerator<string, void, void> {
  const client = createClient();
  const model = getModel();
  const ctx = buildCompanionContext();

  // Haiku doesn't support adaptive thinking; Opus/Sonnet do.
  const thinking = model === "claude-haiku-4-5" ? undefined : ({ type: "adaptive" } as const);

  const stream = client.messages.stream({
    model,
    max_tokens: 4096,
    ...(thinking ? { thinking } : {}),
    system: [
      // Stable core first (cacheable prefix) …
      { type: "text", text: SYSTEM_CORE, cache_control: { type: "ephemeral" } },
      // … volatile per-day context after the breakpoint.
      { type: "text", text: buildContextBlock(ctx) },
    ],
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }

  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") {
    yield "\n\nأعتذر — لا أستطيع المساعدة في هذا الطلب.";
  }
}
