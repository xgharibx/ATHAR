/**
 * رفيق أثر — AI companion page.
 *
 * Two modes:
 *  - Smart offline mode (no API key): a personalized daily-guidance board
 *    computed from the user's real journey — always useful, fully private.
 *  - AI mode (user's own Claude API key, stored only on-device): a guarded,
 *    personalized chat companion that knows today's progress and suggests
 *    the next best step, with sources and scholarly-referral guardrails.
 */
import * as React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, Send, Settings2, KeyRound, Trash2, Square } from "lucide-react";
import { toast } from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

import {
  COMPANION_MODELS,
  buildCompanionContext,
  buildWeeklyReflectionPrompt,
  clearMemory,
  describeError,
  getApiKey,
  getMinimaxKey,
  getModel,
  hasAppProvidedAccess,
  isCompanionReady,
  isProviderReady,
  providerForModel,
  setApiKey,
  setMinimaxKey,
  setModel,
  streamCompanionReply,
  type CompanionMessage,
} from "@/lib/companionAI";
import { GrowthTree } from "@/components/brand/GrowthTree";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

const QUICK_PROMPTS = [
  "ما الخطوة الأنسب لي الآن في يومي الإيماني؟",
  "اشرح لي فضل أذكار الصباح والمساء",
  "اقترح لي وردًا قرآنيًا يناسب وقتي",
  "كيف أحافظ على سلسلة المواظبة دون فتور؟",
  "دعاء مأثور يناسب حالي اليوم",
];

export function CompanionPage() {
  useScrollRestoration();
  const navigate = useNavigate();

  const [hasKey, setHasKey] = React.useState(() => !!getApiKey());
  const [hasMinimaxKey, setHasMinimaxKey] = React.useState(() => !!getMinimaxKey());
  const [showSettings, setShowSettings] = React.useState(false);
  const [keyDraft, setKeyDraft] = React.useState("");
  const [model, setModelState] = React.useState(getModel);
  const provider = providerForModel(model);
  const ready = isProviderReady(provider);

  const [messages, setMessages] = React.useState<CompanionMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [streamingText, setStreamingText] = React.useState<string | null>(null);
  const busyRef = React.useRef(false);
  const stopRef = React.useRef(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  const ctx = React.useMemo(buildCompanionContext, []);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamingText]);

  // Deep-linked question (e.g. اشرح الحديث / تدبّر الآية from the home carousel):
  // /companion?ask=… — auto-send when the companion is ready, else prefill.
  const [searchParams, setSearchParams] = useSearchParams();
  const askHandled = React.useRef(false);
  React.useEffect(() => {
    const ask = searchParams.get("ask");
    if (!ask || askHandled.current) return;
    askHandled.current = true;
    setSearchParams({}, { replace: true });
    if (isCompanionReady()) void send(ask);
    else setInput(ask);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const send = React.useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busyRef.current) return;
    if (!isCompanionReady()) {
      toast("المحادثة الذكية قيد التفعيل — قريبًا بإذن الله ✨", { icon: "🤝" });
      return;
    }

    busyRef.current = true;
    stopRef.current = false;
    const history: CompanionMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(history);
    setInput("");
    setStreamingText("");

    let acc = "";
    try {
      for await (const chunk of streamCompanionReply(history)) {
        if (stopRef.current) break;
        acc += chunk;
        setStreamingText(acc);
      }
      setMessages([...history, { role: "assistant", content: acc || "…" }]);
    } catch (err) {
      const e = describeError(err);
      toast.error(e.message);
      if (e.kind === "auth") setShowSettings(true);
      // keep the user's message so they can retry
      if (acc) setMessages([...history, { role: "assistant", content: acc }]);
      else setMessages(history);
    } finally {
      setStreamingText(null);
      busyRef.current = false;
    }
  }, [messages]);

  const saveKey = () => {
    const k = keyDraft.trim();
    if (!k) return;
    if (provider === "minimax") { setMinimaxKey(k); setHasMinimaxKey(true); }
    else { setApiKey(k); setHasKey(true); }
    setKeyDraft("");
    setShowSettings(false);
    toast.success("تم حفظ المفتاح على جهازك فقط");
  };

  const clearKey = () => {
    if (provider === "minimax") { setMinimaxKey(""); setHasMinimaxKey(false); }
    else { setApiKey(""); setHasKey(false); }
    toast("تم حذف المفتاح", { icon: "🗑️" });
  };
  const hasLocalKey = provider === "minimax" ? hasMinimaxKey : hasKey;

  const isBusy = streamingText !== null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-40 pt-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-15 border border-accent-35">
            <Sparkles className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          </span>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-[var(--fg)]">
              رفيق أثر
              {ready && hasAppProvidedAccess(provider) ? (
                <span className="rounded-full bg-accent-15 border border-accent-35 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                  مجاني الآن ✨
                </span>
              ) : null}
            </h1>
            <p className="text-xs text-[var(--muted-2)]">
              {ready ? "مرشدك الذكي — يعرف رحلتك ويقترح خطوتك التالية" : "الوضع الذكي يعمل الآن — والمحادثة الذكية قريبًا"}
            </p>
          </div>
        </div>
        <button type="button"
          onClick={() => setShowSettings((v) => !v)}
          aria-label="إعدادات الرفيق"
          aria-expanded={showSettings}
          className="rounded-xl border border-[var(--stroke)] bg-[var(--card)] p-2.5 hover:bg-[var(--card-2)] transition"
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings ? (
        <div className="mt-4 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-[var(--muted)]" htmlFor="companion-model">النموذج</label>
            <select
              id="companion-model"
              value={model}
              onChange={(e) => { setModelState(e.target.value); setModel(e.target.value); }}
              className="form-field-readable rounded-xl border border-[var(--stroke)] px-3 py-1.5 text-xs"
            >
              {COMPANION_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          <button type="button"
            onClick={() => { clearMemory(); toast("تم مسح ذاكرة الرفيق", { icon: "🧹" }); }}
            className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--fg)]"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> مسح ذاكرة الرفيق (ما يتذكره من محادثاتك)
          </button>

          {hasAppProvidedAccess(provider) ? (
            <p className="text-xs leading-relaxed text-[var(--muted)]">
              المحادثة الذكية مفعّلة لجميع المستخدمين على هذا النموذج — لا حاجة لأي إعداد. 🤝
            </p>
          ) : (
            <details className="text-xs">
              <summary className="cursor-pointer text-[var(--muted)] flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
                خيارات متقدمة: مفتاح خاص
              </summary>
              <p className="mt-2 leading-relaxed text-[var(--muted-2)]">
                {provider === "minimax"
                  ? "إن كان لديك مفتاح MiniMax API خاص يمكنك استعماله — يُحفظ على جهازك فقط ولا يغادر إلا مباشرةً إلى MiniMax."
                  : "إن كان لديك مفتاح Claude API خاص يمكنك استعماله مؤقتًا — يُحفظ على جهازك فقط ولا يغادر إلا مباشرةً إلى Anthropic."}
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  type="password"
                  dir="ltr"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  placeholder={provider === "minimax" ? "sk-api-…" : "sk-ant-…"}
                  aria-label="مفتاح API"
                  className="form-field-readable flex-1 rounded-xl border border-[var(--stroke)] px-3 py-2 text-sm"
                />
                <button type="button" onClick={saveKey}
                  className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-black/80 active:scale-95 transition">
                  حفظ
                </button>
              </div>
              {hasLocalKey ? (
                <button type="button" onClick={clearKey}
                  className="mt-2 flex items-center gap-1.5 text-xs text-[var(--danger)] hover:opacity-80">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> حذف المفتاح من هذا الجهاز
                </button>
              ) : null}
            </details>
          )}
        </div>
      ) : null}

      {/* Smart offline board — always available, shows the user's real next steps */}
      {messages.length === 0 && streamingText === null ? (
        <div className="mt-5 space-y-3">
          {/* شجرة الأثر — your week, growing */}
          <GrowthTree />

          {/* خاطرة الجمعة — the personal weekly reflection */}
          <button type="button"
            onClick={() => void send(buildWeeklyReflectionPrompt())}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-accent-35 bg-accent-15 px-4 py-3 text-start transition hover:opacity-90 active:scale-[0.99]"
          >
            <div>
              <div className="text-sm font-bold text-[var(--accent)]">
                خاطرة الجمعة ✨
                {new Date().getDay() === 5 ? (
                  <span className="ms-2 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold text-black/80">اليوم جمعة</span>
                ) : null}
              </div>
              <div className="mt-0.5 text-xs text-[var(--muted)]">
                خاطرة مكتوبة لك وحدك — من أسبوعك الحقيقي: قراءتك، أذكارك، وتسبيحك
              </div>
            </div>
            <Sparkles className="h-5 w-5 shrink-0 text-[var(--accent)]" aria-hidden="true" />
          </button>

          <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-4">
            <div className="text-sm font-semibold mb-3">خطواتك المقترحة اليوم</div>
            <div className="grid gap-2">
              {!ctx.morningDone ? (
                <SmartStep icon="☀️" label="أذكار الصباح لم تكتمل بعد" action="ابدأ الآن" onClick={() => navigate("/c/morning")} />
              ) : null}
              {!ctx.eveningDone ? (
                <SmartStep icon="🌙" label="أذكار المساء بانتظارك" action="ابدأ الآن" onClick={() => navigate("/c/evening")} />
              ) : null}
              {ctx.ayahsReadToday < ctx.dailyGoal ? (
                <SmartStep
                  icon="📖"
                  label={`وردك اليومي: ${ctx.ayahsReadToday} من ${ctx.dailyGoal} آية`}
                  action="أكمل القراءة"
                  onClick={() => navigate("/quran")}
                />
              ) : null}
              {ctx.nextPrayer ? (
                <SmartStep
                  icon="🕌"
                  label={`الصلاة القادمة: ${ctx.nextPrayer.nameAr} في ${ctx.nextPrayer.time}`}
                  action="المواقيت"
                  onClick={() => navigate("/prayer-times")}
                />
              ) : null}
              <SmartStep
                icon="📿"
                label={ctx.tasbeehToday > 0 ? `سبّحت اليوم ${ctx.tasbeehToday} مرة — أكمل` : "افتتح يومك بالتسبيح"}
                action="السبحة"
                onClick={() => navigate("/sebha")}
              />
            </div>
            <div className="mt-3 text-[11px] text-[var(--muted-2)]">
              سلسلة المواظبة: {ctx.streakDays.toLocaleString("ar-EG")} يوم 🔥
            </div>
          </div>

          {/* Quick prompts (AI mode) */}
          <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-4">
            <div className="text-sm font-semibold mb-2">اسأل رفيقك</div>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((q) => (
                <button type="button" key={q}
                  onClick={() => void send(q)}
                  className="rounded-full border border-[var(--stroke)] bg-[var(--card-2)] px-3 py-1.5 text-xs hover:border-accent-35 transition">
                  {q}
                </button>
              ))}
            </div>
            {!ready ? (
              <p className="mt-3 text-[11px] text-[var(--muted-2)]">
                المحادثة الذكية قيد التفعيل وستصل للجميع قريبًا — الوضع الذكي أعلاه يعمل الآن. ✨
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Conversation */}
      <div className="mt-5 space-y-3" aria-live="polite">
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} text={m.content} />
        ))}
        {streamingText !== null ? (
          streamingText ? <MessageBubble role="assistant" text={streamingText} streaming /> : <TypingIndicator />
        ) : null}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="fixed inset-x-0 z-40" style={{ bottom: "calc(var(--mobile-nav-height) + var(--sab) + 16px)" }}>
        <div className="mx-auto w-full max-w-3xl px-4">
          <div className="flex items-end gap-2 rounded-2xl border border-[var(--stroke)] bg-[var(--bg)]/95 p-2 shadow-2xl backdrop-blur-xl">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder="اكتب سؤالك لرفيق أثر…"
              aria-label="رسالتك"
              className="form-field-readable max-h-32 flex-1 resize-none rounded-xl border border-transparent bg-transparent px-3 py-2 text-sm focus:outline-none"
            />
            {isBusy ? (
              <button type="button"
                onClick={() => { stopRef.current = true; }}
                aria-label="إيقاف"
                className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--stroke)] bg-[var(--card)]">
                <Square className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button type="button"
                onClick={() => void send(input)}
                disabled={!input.trim()}
                aria-label="إرسال"
                className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent)] text-black/80 disabled:opacity-40 active:scale-95 transition">
                <Send className="h-4 w-4 -scale-x-100" aria-hidden="true" />
              </button>
            )}
          </div>
          <p className="mt-1.5 text-center text-[10px] text-[var(--muted-2)]">
            قد يخطئ الذكاء الاصطناعي — تحقق دائمًا من المصادر، واستشر أهل العلم في الفتوى.
          </p>
        </div>
      </div>
    </div>
  );
}

function SmartStep(props: { icon: string; label: string; action: string; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--stroke)] bg-[var(--card-2)] px-3 py-2.5">
      <div className="flex items-center gap-2.5 text-sm">
        <span aria-hidden="true">{props.icon}</span>
        <span>{props.label}</span>
      </div>
      <button type="button" onClick={props.onClick}
        className="shrink-0 rounded-lg bg-accent-15 border border-accent-35 px-3 py-1 text-xs font-semibold text-[var(--accent)] hover:bg-accent-15/80 transition">
        {props.action}
      </button>
    </div>
  );
}

/** Human-friendly fallback labels for known routes, used when the model emits
 *  a bare path with no label (malformed output — should be rare, not absent). */
const ROUTE_FALLBACK_LABELS: Record<string, string> = {
  "/c/morning": "أذكار الصباح", "/c/evening": "أذكار المساء", "/quran": "القرآن",
  "/quran/plans": "خطة الختمة", "/sebha": "السبحة", "/prayer-times": "مواقيت الصلاة",
  "/duas": "الأدعية", "/asma": "أسماء الله الحسنى", "/prayer-guide": "طريقة الصلاة",
  "/library": "المكتبة",
};

/**
 * The model's own [/route label] shorthand (documented in the system prompt)
 * becomes a real Markdown link before rendering, e.g. [/quran القرآن] →
 * [القرآن](/quran) — from there react-markdown treats it like any other link.
 *
 * Also tolerates the malformed forms actually observed from the model
 * (missing leading slash, missing label, trailing slash) instead of leaving
 * raw bracket syntax visible in the chat — a label-less bracket is still a
 * broken-looking chat bubble even if the intent was clear.
 */
function appLinksToMarkdown(text: string): string {
  let out = text.replace(/\[(\/[a-z0-9/_-]+)\s+([^\]]+)\]/gi, (_m, route, label) => `[${label}](${route})`);
  out = out.replace(/\[\/?(quran\/plans|quran|c\/morning|c\/evening|sebha|prayer-times|duas|asma|prayer-guide|library)\/?\]/gi, (_m, path) => {
    const route = `/${path}`;
    return `[${ROUTE_FALLBACK_LABELS[route] ?? path}](${route})`;
  });
  return out;
}

/** Markdown renderer tuned for a narrow chat bubble: compact spacing, small
 *  heading sizes (a chat reply is never a document), scrollable tables. */
const markdownComponents: Components = {
  a: ({ href, children }) => {
    const to = href ?? "";
    if (to.startsWith("/")) {
      return (
        <Link to={to} className="mx-0.5 inline-block rounded-lg bg-accent-15 px-2 py-0.5 text-xs font-semibold text-[var(--accent)] underline-offset-2 hover:underline">
          {children}
        </Link>
      );
    }
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline underline-offset-2">
        {children}
      </a>
    );
  },
  h1: ({ children }) => <h3 className="mb-1.5 mt-2 text-base font-bold text-[var(--fg)] first:mt-0">{children}</h3>,
  h2: ({ children }) => <h4 className="mb-1.5 mt-2 text-[15px] font-bold text-[var(--fg)] first:mt-0">{children}</h4>,
  h3: ({ children }) => <h5 className="mb-1 mt-2 text-sm font-bold text-[var(--fg)] first:mt-0">{children}</h5>,
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-[var(--fg)]">{children}</strong>,
  ul: ({ children }) => <ul className="mb-2 me-4 list-disc space-y-1 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 me-4 list-decimal space-y-1 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="ps-1">{children}</li>,
  hr: () => <hr className="my-2.5 border-[var(--stroke)]" />,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-e-2 border-accent-35 pe-3 text-[var(--muted)]">{children}</blockquote>
  ),
  code: ({ children }) => <code className="rounded bg-[var(--card-2)] px-1 py-0.5 font-mono text-[12px]" dir="ltr">{children}</code>,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-[var(--stroke)]">
      <table className="w-full text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-[var(--card-2)]">{children}</thead>,
  th: ({ children }) => <th className="px-2 py-1.5 text-start font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-t border-[var(--stroke)] px-2 py-1.5">{children}</td>,
};

function MessageBubble(props: { role: "user" | "assistant"; text: string; streaming?: boolean }) {
  const isUser = props.role === "user";
  return (
    <div className={isUser ? "flex justify-start" : "flex justify-end"}>
      <div
        className={[
          "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "whitespace-pre-wrap bg-accent-15 border border-accent-35"
            : "bg-[var(--card)] border border-[var(--stroke)]",
        ].join(" ")}
      >
        {isUser ? (
          props.text
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {appLinksToMarkdown(props.text)}
          </ReactMarkdown>
        )}
        {props.streaming ? <span className="animate-pulse"> ▍</span> : null}
      </div>
    </div>
  );
}

/** Bouncing-dots "thinking" indicator — shown while streamingText is still empty,
 *  so a long invisible model-thinking phase never looks like a frozen app. */
function TypingIndicator() {
  return (
    <div className="flex justify-end">
      <div className="flex items-center gap-1.5 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)]"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
