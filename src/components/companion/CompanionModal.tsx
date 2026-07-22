/**
 * CompanionModal — an in-page overlay version of the Companion chat.
 *
 * Shares the same AI + memory as the /companion route (both go through
 * companionAI.ts). Lets long-context pages (Mushaf, DhikrList, Hadith
 * detail) host an inline "ask Athar" without forcing a full navigation.
 *
 * The optional `context` prop surfaces a chip at the top of the modal so the
 * user can see what page the AI is looking at, and includes a hint that is
 * prepended to the user's first message so the AI knows which verse/section
 * is in view.
 */
import * as React from "react";
import {
  Sparkles, Send, X as XIcon, AlertCircle, Loader2, History, Plus, Mic, MicOff,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import {
  ROUTE_LABELS,
  isCompanionReady,
  streamCompanionReply,
  type CompanionMessage,
  type VerificationReport,
} from "@/lib/companionAI";
import {
  clearPartialStream,
  loadPartialStream,
  savePartialStream,
  saveConversation,
  newConversationId,
  listConversations,
  getConversation,
  titleFromMessages,
  type CompanionConversation,
} from "@/lib/companionHistory";
import { splitIntoSegments } from "@/lib/companionBlocks";
import { useNoorStore } from "@/store/noorStore";
import {
  addCustomReminder as addCustomReminderAction,
  deleteCustomReminder as deleteCustomReminderAction,
} from "@/store/customReminderActions";
import type { AtharContext } from "@/components/companion/FloatingAthar";

const CALLOUT_STYLES: Record<string, { border: string; bg: string; label: string; icon: string; accent: string }> = {
  verse: { border: "border-sky-400/50", bg: "bg-sky-500/10", label: "آية", icon: "📖", accent: "text-sky-200" },
  hadith: { border: "border-emerald-400/50", bg: "bg-emerald-500/10", label: "حديث", icon: "📜", accent: "text-emerald-200" },
  dua: { border: "border-rose-400/50", bg: "bg-rose-500/10", label: "دعاء", icon: "🤲", accent: "text-rose-200" },
  tip: { border: "border-amber-400/50", bg: "bg-amber-500/10", label: "نصيحة", icon: "💡", accent: "text-amber-200" },
  warn: { border: "border-red-400/50", bg: "bg-red-500/10", label: "تنبيه", icon: "⚠️", accent: "text-red-200" },
  info: { border: "border-violet-400/50", bg: "bg-violet-500/10", label: "معلومة", icon: "ℹ️", accent: "text-violet-200" },
};

function dispatchNavigate(route: string) {
  try { window.dispatchEvent(new CustomEvent("athar-companion-navigate", { detail: { route } })); } catch { /* ignore */ }
}

/* Parse a `:::reminder\n{json}\n:::` block (or several) from an assistant
 *  message body. Used both during the streaming partial and after save. */
type ParsedReminder = {
  id: string;
  /** The reminder's real id in the store (round-tripped from the tool-call
   *  dispatch that actually created it — see injectReminderStoreIds in
   *  companionAI.ts). Falls back to title-matching when absent (e.g. a
   *  conversation saved before this field existed). */
  storeId?: string;
  category: "dhikr" | "quran" | "sunnah" | "fast" | "salat" | "dua" | "custom";
  title: string;
  description?: string;
  body?: string;
  icon?: string;
  repeat:
    | "once" | "daily" | "weekly" | "monthly"
    | "sunnah_aligned" | "prayer_aligned" | "fasting_aligned";
  atTimeOfDay?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  anchorKey?:
    | "tahajjud" | "duha" | "witr" | "fajr" | "dhuhr" | "asr" | "maghrib" | "isha" | "sunrise";
  anchorOffsetMinutes?: number;
  deeplink?: { route: string; hash?: string };
  suggestion?: string;
};

const REMINDER_BLOCK_RE = /:::reminder\n([\s\S]*?)\n:::/g;

const VALID_CATEGORIES: ParsedReminder["category"][] = [
  "dhikr", "quran", "sunnah", "fast", "salat", "dua", "custom",
];

const VALID_REPEATS: ParsedReminder["repeat"][] = [
  "once", "daily", "weekly", "monthly", "sunnah_aligned", "prayer_aligned", "fasting_aligned",
];

const VALID_ANCHORS: NonNullable<ParsedReminder["anchorKey"]>[] = [
  "tahajjud", "duha", "witr", "fajr", "dhuhr", "asr", "maghrib", "isha", "sunrise",
];

const WEEKDAY_NAME_TO_NUMBER: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

function parseDayOfWeek(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6) return value;
  if (typeof value === "string") {
    const n = WEEKDAY_NAME_TO_NUMBER[value.trim().toLowerCase()];
    if (typeof n === "number") return n;
  }
  return undefined;
}

function parseDayOfMonth(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : undefined;
}

export function parseReminderToolCalls(text: string): ParsedReminder[] {
  const out: ParsedReminder[] = [];
  const matches = text.matchAll(REMINDER_BLOCK_RE);
  for (const m of matches) {
    const raw = m[1] ?? "";
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (typeof parsed.title !== "string") continue;
      const repeat = String(parsed.repeat ?? "") as ParsedReminder["repeat"];
      if (!VALID_REPEATS.includes(repeat)) continue;
      const category = (VALID_CATEGORIES as string[]).includes(String(parsed.category))
        ? (parsed.category as ParsedReminder["category"])
        : "custom";
      const anchorKey = (VALID_ANCHORS as string[]).includes(String(parsed.anchorKey ?? ""))
        ? (parsed.anchorKey as NonNullable<ParsedReminder["anchorKey"]>)
        : undefined;
      let deeplink: ParsedReminder["deeplink"] = undefined;
      if (parsed.deeplink && typeof parsed.deeplink === "object") {
        const d = parsed.deeplink as { route?: unknown; hash?: unknown };
        if (typeof d.route === "string") deeplink = { route: d.route, hash: typeof d.hash === "string" ? d.hash : undefined };
      } else if (typeof parsed.deeplink === "string" && parsed.deeplink.startsWith("/")) {
        deeplink = { route: parsed.deeplink };
      }
      out.push({
        id: `pr_${out.length}_${Date.now()}`,
        storeId: typeof parsed.id === "string" ? parsed.id : undefined,
        category,
        title: parsed.title,
        description: typeof parsed.description === "string" ? parsed.description : undefined,
        body: typeof parsed.body === "string" ? parsed.body : undefined,
        icon: typeof parsed.icon === "string" ? parsed.icon : undefined,
        repeat,
        atTimeOfDay: typeof parsed.atTimeOfDay === "string" ? parsed.atTimeOfDay : undefined,
        dayOfWeek: parseDayOfWeek(parsed.dayOfWeek),
        dayOfMonth: parseDayOfMonth(parsed.dayOfMonth),
        anchorKey,
        anchorOffsetMinutes: typeof parsed.anchorOffsetMinutes === "number" ? parsed.anchorOffsetMinutes : undefined,
        deeplink,
        suggestion: typeof parsed.suggestion === "string" ? parsed.suggestion : undefined,
      });
    } catch {
      /* skip malformed block */
    }
  }
  return out;
}

/** Injects the real store id (minted by dispatchCreateReminder at tool-call
 *  time) into each `:::reminder\n{...}\n:::` block in a finished assistant
 *  message, in the same order the tool calls were dispatched. This lets the
 *  chip's cancel/open actions match the exact reminder by id instead of by
 *  title (two reminders can share a title, e.g. "أذكار الصباح" created twice —
 *  matching by title alone can resolve to the wrong one). Safe to call with
 *  an empty `ids` array (no-op passthrough). */
export function injectReminderStoreIds(text: string, ids: string[]): string {
  if (ids.length === 0 || !text.includes(":::reminder")) return text;
  let i = 0;
  return text.replace(REMINDER_BLOCK_RE, (full, raw: string) => {
    const id = ids[i];
    i += 1;
    if (!id) return full;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      parsed.id = id;
      return `:::reminder\n${JSON.stringify(parsed)}\n:::`;
    } catch {
      return full;
    }
  });
}

/** Creates the reminder via the IDB-persisting store helper (see
 *  `@/store/customReminderActions`) — NOT the bare Zustand `addCustomReminder`
 *  action, which only mutates in-memory state and is never written to
 *  IndexedDB or localStorage (customReminders is excluded from the persisted
 *  snapshot; see noorStore.ts's `partialize`). Using the bare store action
 *  here used to mean every companion-created reminder vanished on the next
 *  reload/app restart. */
function dispatchCreateReminder(parsed: ParsedReminder): string | null {
  try {
    return addCustomReminderAction({
      category: parsed.category,
      title: parsed.title,
      description: parsed.description,
      body: parsed.body,
      icon: parsed.icon,
      repeat: parsed.repeat,
      atTimeOfDay: parsed.atTimeOfDay,
      dayOfWeek: parsed.dayOfWeek,
      dayOfMonth: parsed.dayOfMonth,
      anchorKey: parsed.anchorKey,
      anchorOffsetMinutes: parsed.anchorOffsetMinutes,
      deeplink: parsed.deeplink,
      suggestion: parsed.suggestion,
    });
  } catch {
    return null;
  }
}

export function CompanionModal(props: {
  open: boolean;
  onClose: () => void;
  prefill?: string;
  context?: AtharContext;
}) {
  const navigate = useNavigate();
  const navigateRoute = React.useCallback((route: string) => {
    navigate(route);
    dispatchNavigate(route);
  }, [navigate]);
  const [messages, setMessages] = React.useState<CompanionMessage[]>([]);
  const [input, setInput] = React.useState(props.prefill ?? "");
  const [streamingText, setStreamingText] = React.useState<string | null>(null);
  const [verification, setVerification] = React.useState<VerificationReport | null>(null);
  const [showHistory, setShowHistory] = React.useState(false);
  const [history, setHistory] = React.useState<CompanionConversation[]>([]);
  const [convId, setConvId] = React.useState<string | null>(null);
  const [partialStopped, setPartialStopped] = React.useState(false);
  const busyRef = React.useRef(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<string>("");
  /** ids minted by dispatchCreateReminder during this turn's onToolCalls, in
   *  call order — spliced into the persisted `:::reminder\n{...}\n:::` blocks
   *  once the full reply text is known (see onDone below). */
  const createdReminderIdsRef = React.useRef<string[]>([]);

  const refreshHistory = React.useCallback(async () => {
    try { setHistory(await listConversations()); } catch { /* ignore */ }
  }, []);

  React.useEffect(() => {
    if (props.open) {
      setInput(props.prefill ?? "");
      void refreshHistory();
      const partial = loadPartialStream();
      if (partial && partial.text) {
        setMessages(partial.messages);
        setStreamingText(partial.text);
        setConvId(partial.conversationId);
      }
    }
  }, [props.open, props.prefill, refreshHistory]);

  // Auto-scroll — instant ("auto") while actively streaming, since a fresh
  // "smooth" animation queued on every token can't keep up with itself and
  // visibly lags behind, forcing the user to scroll manually. Smooth is
  // kept for discrete message additions (sending a new question, opening a
  // saved conversation), where a single animation reads nicely.
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: streamingText !== null ? "auto" : "smooth", block: "end" });
  }, [messages, streamingText]);

  // Persist history whenever messages change
  React.useEffect(() => {
    if (messages.length === 0) return;
    const id = convId ?? newConversationId();
    if (!convId) setConvId(id);
    if (!titleRef.current) titleRef.current = titleFromMessages(messages);
    void saveConversation({
      id,
      title: titleRef.current,
      messages,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }).then(refreshHistory);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const buildPrefill = (text: string) => {
    if (!props.context?.hint) return text;
    return `${text}\n\n(ملاحظة: الزائر حاليًا في ${props.context.title ?? "صفحة غير محددة"} — ${props.context.hint})`;
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busyRef.current) return;
    if (!isCompanionReady()) return;
    busyRef.current = true;
    setPartialStopped(false);
    const controller = new AbortController();
    abortRef.current = controller;
    const augmented = buildPrefill(trimmed);
    const history: CompanionMessage[] = [...messages, { role: "user", content: augmented }];
    // Ensure a conversation id exists synchronously (not via the debounced
    // "persist history" effect below) so the very first streamed chunk can
    // already be checkpointed — otherwise closing/navigating away mid-stream
    // loses the partial reply since nothing was ever saved for it to resume.
    const streamConvId = convId ?? newConversationId();
    if (!convId) setConvId(streamConvId);
    createdReminderIdsRef.current = [];
    setMessages(history);
    setInput("");
    setStreamingText("");
    setVerification(null);

    let acc = "";
    let done = false;
    try {
      await streamCompanionReply(history, {
        onText: (chunk) => {
          acc += chunk;
          setStreamingText(acc);
          // Use this turn's local `history` (includes the user's just-sent
          // message), not the component's `messages` state — that closure
          // would still reflect the pre-turn value until React re-renders,
          // so a restored partial stream would silently drop the question
          // that prompted it.
          savePartialStream(streamConvId, history, acc);
        },
        onDone: (fullText, ver) => {
          done = true;
          const withIds = injectReminderStoreIds(fullText, createdReminderIdsRef.current);
          setMessages((m) => [...m, { role: "assistant", content: withIds }]);
          setVerification(ver);
          setStreamingText(null);
          clearPartialStream();
        },
        onError: () => { setStreamingText(null); clearPartialStream(); },
        onToolCalls: (calls) => {
          for (const c of calls) {
            if (c.name !== "create_reminder") continue;
            const repeatRaw = typeof c.input.repeat === "string" ? c.input.repeat : "once";
            const repeat = (VALID_REPEATS as string[]).includes(repeatRaw)
              ? (repeatRaw as ParsedReminder["repeat"])
              : "once";
            const categoryRaw = typeof c.input.category === "string" ? c.input.category : "";
            const category = (VALID_CATEGORIES as string[]).includes(categoryRaw)
              ? (categoryRaw as ParsedReminder["category"])
              : "custom";
            const anchorRaw = typeof c.input.anchorKey === "string" ? c.input.anchorKey : "";
            const anchorKey = (VALID_ANCHORS as string[]).includes(anchorRaw)
              ? (anchorRaw as NonNullable<ParsedReminder["anchorKey"]>)
              : undefined;
            let deeplink: ParsedReminder["deeplink"] = undefined;
            if (c.input.deeplink && typeof c.input.deeplink === "object") {
              const d = c.input.deeplink as { route?: unknown; hash?: unknown };
              if (typeof d.route === "string") deeplink = { route: d.route, hash: typeof d.hash === "string" ? d.hash : undefined };
            } else if (typeof c.input.deeplink === "string" && c.input.deeplink.startsWith("/")) {
              deeplink = { route: c.input.deeplink };
            }
            const parsed: ParsedReminder = {
              id: `tool_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              category,
              title: typeof c.input.title === "string" ? c.input.title : "",
              description: typeof c.input.description === "string" ? c.input.description : undefined,
              repeat,
              atTimeOfDay: typeof c.input.atTimeOfDay === "string" ? c.input.atTimeOfDay : undefined,
              dayOfWeek: parseDayOfWeek(c.input.dayOfWeek),
              dayOfMonth: parseDayOfMonth(c.input.dayOfMonth),
              anchorKey,
              anchorOffsetMinutes: typeof c.input.anchorOffsetMinutes === "number" ? c.input.anchorOffsetMinutes : undefined,
              deeplink,
              suggestion: typeof c.input.suggestion === "string" ? c.input.suggestion : undefined,
            };
            const createdId = dispatchCreateReminder(parsed);
            if (createdId) createdReminderIdsRef.current.push(createdId);
          }
        },
      }, controller.signal);
    } finally {
      busyRef.current = false;
      abortRef.current = null;
      if (!done && acc.trim()) {
        // Keep the partial reply so the user can resume / copy it.
        setMessages((m) => [...m, { role: "assistant", content: acc }]);
        setStreamingText(null);
        setPartialStopped(true);
      } else if (!done) {
        setStreamingText(null);
      }
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    busyRef.current = false;
    setStreamingText(null);
    clearPartialStream();
  };

  const startNew = () => {
    stop();
    setMessages([]);
    setInput(props.prefill ?? "");
    setStreamingText(null);
    setVerification(null);
    setConvId(null);
    titleRef.current = "";
    setShowHistory(false);
    setPartialStopped(false);
  };

  const loadHistoryConv = async (c: CompanionConversation) => {
    stop();
    const full = (await getConversation(c.id)) ?? c;
    setMessages(full.messages);
    setConvId(full.id);
    titleRef.current = full.title;
    setStreamingText(null);
    setShowHistory(false);
  };

  if (!props.open) return null;

  const isBusy = streamingText !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-2 sm:p-4 pb-[max(env(safe-area-inset-bottom,0px),0px)]" dir="rtl">
      <div
        aria-hidden="true"
        onClick={props.onClose}
        className="absolute inset-0 bg-black/35 backdrop-blur-md"
      />
      <div
        className="relative flex h-[88vh] mt-[3vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-emerald-400/25 shadow-[0_20px_60px_-12px_rgba(16,185,129,0.45)] backdrop-blur-2xl"
        style={{
          // Match the app's atmospheric starry background but slightly translucent
          backgroundColor: "color-mix(in srgb, var(--bg) 70%, transparent)",
          backgroundImage:
            "radial-gradient(2px 2px at 12% 18%, rgba(255,255,255,0.5) 50%, transparent 51%)," +
            "radial-gradient(1.5px 1.5px at 78% 32%, rgba(255,255,255,0.45) 50%, transparent 51%)," +
            "radial-gradient(2.5px 2.5px at 42% 62%, rgba(255,255,255,0.4) 50%, transparent 51%)," +
            "radial-gradient(1.5px 1.5px at 88% 78%, rgba(255,255,255,0.35) 50%, transparent 51%)," +
            "radial-gradient(2px 2px at 22% 88%, rgba(255,255,255,0.35) 50%, transparent 51%)," +
            "linear-gradient(160deg, color-mix(in srgb, var(--accent) 12%, transparent), color-mix(in srgb, var(--accent) 4%, transparent))",
        }}
      >
        {/* Decorative glow */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -start-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -end-24 h-64 w-64 rounded-full bg-teal-500/8 blur-3xl" />

        {/* Header */}
        <div className="relative flex items-center justify-between gap-2 border-b border-emerald-400/15 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md shadow-emerald-500/30">
              <Sparkles className="h-4 w-4 text-emerald-950" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold leading-tight">أثر</h2>
              <p className="text-[10.5px] text-emerald-200/70">رفيقك الذكي</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setShowHistory((s) => !s)} aria-label="المحادثات"
              className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-100 transition hover:bg-emerald-500/20">
              <History className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={startNew} aria-label="محادثة جديدة"
              className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-100 transition hover:bg-emerald-500/20">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={props.onClose} aria-label="إغلاق"
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10">
              <XIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Context chip */}
        {props.context?.title ? (
          <div className="relative border-b border-emerald-400/10 bg-emerald-500/5 px-4 py-2">
            <div className="flex items-center gap-2 text-[11px]">
              <span aria-hidden="true">{props.context.icon ?? "📍"}</span>
              <span className="font-semibold text-emerald-100">{props.context.title}</span>
              {props.context.subtitle ? <span className="text-emerald-200/60">— {props.context.subtitle}</span> : null}
            </div>
          </div>
        ) : null}

        {/* History panel */}
        {showHistory ? (
          <div className="relative border-b border-emerald-400/10 bg-emerald-950/40 px-3 py-2 max-h-56 overflow-y-auto">
            {history.length === 0 ? (
              <p className="px-2 py-4 text-center text-[11px] text-emerald-200/60">لا توجد محادثات سابقة هنا</p>
            ) : (
              history.map((c) => (
                <button key={c.id} type="button" onClick={() => void loadHistoryConv(c)}
                  className="block w-full truncate rounded-lg px-2 py-1.5 text-start text-[12px] text-emerald-100 transition hover:bg-emerald-500/15">
                  <span className="opacity-60">{new Date(c.updatedAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="ms-2">{c.title}</span>
                </button>
              ))
            )}
          </div>
        ) : null}

        {/* Conversation */}
        <div className="relative flex-1 overflow-y-auto px-3 py-3 space-y-3" aria-live="polite">
          {messages.length === 0 && !streamingText ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-500/20 border border-emerald-400/30 mb-3 shadow-[0_0_30px_-6px_rgba(16,185,129,0.5)]">
                  <Sparkles className="h-7 w-7 text-emerald-200" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold text-emerald-100">اسأل «أثر» عن هذه الصفحة</p>
                <p className="mt-1 text-[11.5px] text-emerald-200/70 max-w-xs">جاوبك هنا دون أن تغادرها. استفسر عن آية، فائدة حديث، أو دعاء.</p>
              </div>
            </div>
          ) : null}
          {messages.map((m, i) => (
            <ModalBubble key={i} role={m.role} text={m.content} onNavigate={navigateRoute} />
          ))}
          {streamingText !== null ? (
            streamingText
              ? <ModalBubble role="assistant" text={streamingText} streaming onNavigate={navigateRoute} />
              : (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3.5 py-2.5 text-[11px] text-emerald-100">
                  <span className="relative grid h-6 w-6 place-items-center rounded-full">
                    <span
                      className="absolute inset-0 rounded-full opacity-60"
                      style={{ background: "conic-gradient(from 0deg, #6ee7b7, transparent, #6ee7b7)", animation: "athar-modal-spin 2.6s linear infinite", filter: "blur(1.5px)" }}
                    />
                    <span className="absolute inset-0.5 rounded-full bg-emerald-900/40" />
                    <Sparkles className="relative h-3 w-3 text-emerald-200" aria-hidden="true" />
                  </span>
                  <span>يفكّر معك…</span>
                  <style>{`@keyframes athar-modal-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
                </div>
              )
          ) : null}
          {verification?.flagged && streamingText === null ? (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <ul className="list-inside list-disc">{verification.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
            </div>
          ) : null}
          {partialStopped ? (
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-emerald-200/80">
              <XIcon className="h-3 w-3" aria-hidden="true" />
              <span>اكتمل جزئيًا — أوقفت الرد قبل انتهائه.</span>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="relative border-t border-emerald-400/15 p-2 bg-emerald-950/40 backdrop-blur-sm">
          <div className="flex items-end gap-1.5">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
              rows={1}
              placeholder={props.context?.title ? `اسأل أثر عن «${props.context.title}»…` : "اسأل أثر…"}
              className="form-field-readable max-h-28 flex-1 resize-none rounded-xl border border-emerald-400/20 bg-white/5 px-3 py-2 text-sm text-emerald-50 placeholder:text-emerald-200/40 focus:outline-none focus:border-emerald-400/60"
            />
            {isBusy ? (
              <button type="button" onClick={stop} aria-label="إيقاف"
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/80">
                <XIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button type="button" onClick={() => void send(input)} disabled={!input.trim()} aria-label="إرسال"
                className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-emerald-950 shadow-md shadow-emerald-500/30 disabled:opacity-40 active:scale-95 transition">
                <Send className="h-4 w-4 -scale-x-100" aria-hidden="true" />
              </button>
            )}
          </div>
          <p className="mt-1.5 text-center text-[10px] text-emerald-200/50">
            للدردشة الكاملة: <Link to="/companion" onClick={props.onClose} className="font-semibold text-emerald-200 underline-offset-2 hover:underline">/companion</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function ModalCalloutBlock({ kind, children }: { kind: keyof typeof CALLOUT_STYLES; children: React.ReactNode }) {
  const s = CALLOUT_STYLES[kind];
  return (
    <div className={["my-1.5 overflow-hidden rounded-xl border", s.border, s.bg].join(" ")}>
      <div className={["flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider", s.accent].join(" ")}>
        <span>{s.icon}</span><span>{s.label}</span>
      </div>
      <div className="arabic-text px-2.5 pb-2.5 pt-0.5 text-[14px] leading-7 whitespace-pre-wrap">{children}</div>
    </div>
  );
}

function ModalActionButton({ route, children, onNavigate }: { route: string; children: React.ReactNode; onNavigate: (route: string) => void }) {
  const label = ROUTE_LABELS[route] ?? route;
  return (
    <button type="button" onClick={() => onNavigate(route)}
      className="group my-1.5 flex w-full items-center justify-between gap-2 rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 px-3 py-2 text-start text-[12.5px] font-semibold text-emerald-50 transition hover:from-emerald-500/30 hover:to-teal-500/20 active:scale-[0.99]">
      <span className="flex items-center gap-2">
        <Sparkles className="h-3 w-3 text-emerald-200" aria-hidden="true" />
        <span>{children}</span>
      </span>
      <span className="text-[10px] uppercase tracking-wider text-emerald-200/70">{label} ←</span>
    </button>
  );
}

/** Resolves a parsed reminder chip back to its live store entry. Prefers the
 *  real store id (round-tripped via injectReminderStoreIds) so two reminders
 *  sharing a title can never resolve to the wrong one; falls back to a
 *  title match only for conversations saved before that round-trip existed. */
function resolveActualReminder(r: ParsedReminder | undefined) {
  if (!r) return undefined;
  const store = useNoorStore.getState();
  if (r.storeId) {
    const byId = store.customReminders.find((x) => x.id === r.storeId);
    if (byId) return byId;
  }
  return store.customReminders.find((x) => x.title === r.title);
}

function ModalBubbleContent({ text, streaming, onNavigate }: { text: string; streaming?: boolean; onNavigate: (route: string) => void }) {
  const segs = React.useMemo(() => splitIntoSegments(text), [text]);
  const reminders = React.useMemo(() => (streaming ? [] : parseReminderToolCalls(text)), [text, streaming]);
  return (
    <>
      {segs.map((s, i) => {
        if (s.kind === "callout") return <ModalCalloutBlock key={i} kind={s.calloutKind}>{s.text}</ModalCalloutBlock>;
        if (s.kind === "action") return <ModalActionButton key={i} route={s.route} onNavigate={onNavigate}>{s.label}</ModalActionButton>;
        return (
          <div key={i} className="prose-invert-arabic text-[14px] leading-7 text-emerald-50/95">
            <span style={{ whiteSpace: "pre-wrap" }}>{s.text}</span>
          </div>
        );
      })}
      {!streaming && reminders.length > 0 ? (
        <ReminderChips
          reminders={reminders}
          onCancel={(parsedId) => {
            const actual = resolveActualReminder(reminders.find((x) => x.id === parsedId));
            if (actual) deleteCustomReminderAction(actual.id);
          }}
          onOpen={(parsedId) => {
            const actual = resolveActualReminder(reminders.find((x) => x.id === parsedId));
            if (actual?.deeplink) onNavigate(actual.deeplink.route);
            else onNavigate("/reminders");
          }}
        />
      ) : null}
      {streaming ? <span className="ms-0.5 inline-block h-3.5 w-[2px] align-middle rounded-full bg-emerald-300 animate-pulse" /> : null}
    </>
  );
}

function ReminderChips({
  reminders,
  onCancel,
  onOpen,
}: {
  reminders: ParsedReminder[];
  onCancel: (parsedId: string) => void;
  onOpen: (parsedId: string) => void;
}) {
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {reminders.map((r) => {
        const when = r.atTimeOfDay ?? "—";
        return (
          <button
            key={r.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(r.id);
            }}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-start text-[12px] text-emerald-50 transition hover:bg-emerald-500/20"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span aria-hidden="true">✓</span>
              <span className="font-semibold">{`أُضيفت التذكير: ${r.title} — ${when}`}</span>
              {r.deeplink ? <span className="shrink-0 text-[10px] text-emerald-200/60">↗</span> : null}
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCancel(r.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onCancel(r.id);
                }
              }}
              className="shrink-0 rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-emerald-200/80 hover:bg-red-500/20 hover:text-red-200"
            >
              إلغاء
            </span>
          </button>
        );
      })}
      <a
        href="/reminders"
        onClick={(e) => {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("athar-companion-navigate", { detail: { route: "/reminders" } }));
        }}
        className="ms-auto text-[10.5px] text-emerald-200/70 underline-offset-2 hover:underline"
      >
        افتح صفحة التذكيرات ↗
      </a>
    </div>
  );
}

function ModalBubble(props: { role: "user" | "assistant"; text: string; streaming?: boolean; onNavigate: (route: string) => void }) {
  const isUser = props.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className={[
        "max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
        isUser
          ? "bg-emerald-500/15 border border-emerald-400/30 text-emerald-50"
          : "bg-white/[0.04] border border-white/10 text-emerald-50/95 backdrop-blur-sm",
      ].join(" ")}>
        {isUser
          ? <span style={{ whiteSpace: "pre-wrap" }}>{props.text}</span>
          : <ModalBubbleContent text={props.text} streaming={props.streaming} onNavigate={props.onNavigate} />}
      </div>
    </div>
  );
}