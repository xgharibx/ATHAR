/**
 * CompanionModal — an in-page overlay version of the Companion chat.
 *
 * Shares the same AI and memory as the /companion route (since both go
 * through companionAI.ts). Lets long-context pages (Mushaf, DhikrList, Hadith
 * detail) host an inline "اسأل أثر" without forcing a full navigation.
 *
 * Keeps the same UI primitives — header, thinking indicator, message bubble,
 * composer — but compressed; the full voice + history search features live on
 * the dedicated /companion page.
 */
import * as React from "react";
import {
  Sparkles, Send, X as XIcon, AlertCircle, Loader2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { Link } from "react-router-dom";

import {
  isCompanionReady,
  ROUTE_LABELS,
  streamCompanionReply,
  type CompanionMessage,
  type VerificationReport,
} from "@/lib/companionAI";
import { splitIntoSegments } from "@/lib/companionBlocks";

function navigateRoute(route: string) {
  try { window.dispatchEvent(new CustomEvent("athar-companion-navigate", { detail: { route } })); } catch { /* ignore */ }
}

export function CompanionModal(props: {
  open: boolean;
  onClose: () => void;
  prefill?: string;
}) {
  const [messages, setMessages] = React.useState<CompanionMessage[]>([]);
  const [input, setInput] = React.useState(props.prefill ?? "");
  const [streamingText, setStreamingText] = React.useState<string | null>(null);
  const [verification, setVerification] = React.useState<VerificationReport | null>(null);
  const busyRef = React.useRef(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (props.open) setInput(props.prefill ?? "");
  }, [props.open, props.prefill]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamingText]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busyRef.current) return;
    if (!isCompanionReady()) return;
    busyRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    const history: CompanionMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(history);
    setInput("");
    setStreamingText("");
    setVerification(null);

    let acc = "";
    let done = false;
    try {
      await streamCompanionReply(history, {
        onText: (chunk) => { acc += chunk; setStreamingText(acc); },
        onDone: (fullText, ver) => {
          done = true;
          setMessages((m) => [...m, { role: "assistant", content: fullText }]);
          setVerification(ver);
          setStreamingText(null);
        },
        onError: () => { setStreamingText(null); },
      }, controller.signal);
    } finally {
      busyRef.current = false;
      abortRef.current = null;
      if (!done) setStreamingText(null);
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    busyRef.current = false;
    setStreamingText(null);
  };

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4" dir="rtl">
      <div className="relative flex h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[var(--stroke)] bg-[var(--bg)] shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--stroke)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
            <h2 className="text-sm font-bold">أثر</h2>
          </div>
          <button type="button" onClick={props.onClose} aria-label="إغلاق" className="rounded-lg p-1.5 hover:bg-[var(--card-2)]">
            <XIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" aria-live="polite">
          {messages.length === 0 && !streamingText ? (
            <div className="rounded-2xl border border-accent-35 bg-accent-8 p-4 text-center">
              <p className="text-sm text-[var(--muted)]">اسأل «أثر» عن هذه الصفحة — جاوبك هنا دون أن تغادرها.</p>
            </div>
          ) : null}
          {messages.map((m, i) => (
            <ModalBubble key={i} role={m.role} text={m.content} />
          ))}
          {streamingText !== null ? (
            streamingText
              ? <ModalBubble role="assistant" text={streamingText} streaming />
              : (
                <div className="flex items-center gap-2 rounded-2xl border border-accent-35 bg-accent-8 px-4 py-2.5 text-xs text-[var(--fg)]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent)]" aria-hidden="true" />
                  أثر يفكّر…
                </div>
              )
          ) : null}
          {verification?.flagged && streamingText === null ? (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <ul className="list-inside list-disc">{verification.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
        <div className="border-t border-[var(--stroke)] p-2">
          <div className="flex items-end gap-1.5">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
              rows={1}
              placeholder="اسأل أثر…"
              className="form-field-readable max-h-28 flex-1 resize-none rounded-xl border border-[var(--stroke)] bg-[var(--card)] px-3 py-2 text-sm focus:outline-none focus:border-accent-35"
            />
            {streamingText !== null ? (
              <button type="button" onClick={stop} aria-label="إيقاف" className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--stroke)] bg-[var(--card)]">
                <XIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button type="button" onClick={() => void send(input)} disabled={!input.trim()} aria-label="إرسال"
                className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent)] text-black/80 disabled:opacity-40 active:scale-95 transition">
                <Send className="h-4 w-4 -scale-x-100" aria-hidden="true" />
              </button>
            )}
          </div>
          <p className="mt-1 text-center text-[10px] text-[var(--muted-2)]">
            فتح المحادثة الكاملة: <Link to="/companion" className="text-[var(--accent)] underline-offset-2 hover:underline">/companion</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const modalComponents: Components = {
  a: ({ href, children }) => {
    const to = href ?? "";
    if (to.startsWith("/")) {
      return (
        <Link to={to} className="mx-0.5 inline-block rounded-lg bg-accent-15 px-2 py-0.5 text-xs font-semibold text-[var(--accent)] underline-offset-2 hover:underline">
          {children}
        </Link>
      );
    }
    return <a href={to} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline">{children}</a>;
  },
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-7">{children}</p>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic text-[var(--accent)]">{children}</em>,
  ul: ({ children }) => <ul className="mb-2 me-4 list-disc marker:text-[var(--accent)]">{children}</ul>,
  blockquote: ({ children }) => <blockquote className="my-2 border-s-4 border-accent-35 bg-accent-8 ps-3 py-1 text-[var(--muted)]">{children}</blockquote>,
};

const MODAL_CALLOUT: Record<string, { border: string; bg: string; label: string; icon: string; accent: string }> = {
  verse: { border: "border-sky-400/50", bg: "bg-sky-500/10", label: "آية", icon: "📖", accent: "text-sky-200" },
  hadith: { border: "border-emerald-400/50", bg: "bg-emerald-500/10", label: "حديث", icon: "📜", accent: "text-emerald-200" },
  dua: { border: "border-rose-400/50", bg: "bg-rose-500/10", label: "دعاء", icon: "🤲", accent: "text-rose-200" },
  tip: { border: "border-amber-400/50", bg: "bg-amber-500/10", label: "نصيحة", icon: "💡", accent: "text-amber-200" },
  warn: { border: "border-red-400/50", bg: "bg-red-500/10", label: "تنبيه", icon: "⚠️", accent: "text-red-200" },
  info: { border: "border-violet-400/50", bg: "bg-violet-500/10", label: "معلومة", icon: "ℹ️", accent: "text-violet-200" },
};

function ModalCalloutBlock({ kind, children }: { kind: keyof typeof MODAL_CALLOUT; children: React.ReactNode }) {
  const s = MODAL_CALLOUT[kind];
  return (
    <div className={["my-1.5 overflow-hidden rounded-xl border", s.border, s.bg].join(" ")}>
      <div className={["flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider", s.accent].join(" ")}>
        <span>{s.icon}</span><span>{s.label}</span>
      </div>
      <div className="arabic-text px-2.5 pb-2.5 pt-0.5 text-[14px] leading-7 whitespace-pre-wrap">{children}</div>
    </div>
  );
}

function ModalActionButton({ route, children }: { route: string; children: React.ReactNode }) {
  const label = ROUTE_LABELS[route] ?? route;
  return (
    <button type="button" onClick={() => navigateRoute(route)}
      className="group my-1.5 flex w-full items-center justify-between gap-2 rounded-xl border border-accent-35 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 px-3 py-2 text-start text-[12.5px] font-semibold text-emerald-100 transition active:scale-[0.99]">
      <span className="flex items-center gap-2">
        <Sparkles className="h-3 w-3 text-emerald-200" aria-hidden="true" />
        <span>{children}</span>
      </span>
      <span className="text-[10px] uppercase tracking-wider text-emerald-300/80">{label} ←</span>
    </button>
  );
}

function ModalBubbleContent({ text, streaming }: { text: string; streaming?: boolean }) {
  const segs = React.useMemo(() => splitIntoSegments(text), [text]);
  return (
    <>
      {segs.map((s, i) => {
        if (s.kind === "callout") return <ModalCalloutBlock key={i} kind={s.calloutKind}>{s.text}</ModalCalloutBlock>;
        if (s.kind === "action") return <ModalActionButton key={i} route={s.route}>{s.label}</ModalActionButton>;
        return (
          <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={modalComponents}>{s.text}</ReactMarkdown>
        );
      })}
      {streaming ? <span className="inline-block animate-pulse"> ▍</span> : null}
    </>
  );
}

function ModalBubble(props: { role: "user" | "assistant"; text: string; streaming?: boolean }) {
  const isUser = props.role === "user";
  return (
    <div className={isUser ? "flex justify-start" : "flex justify-end"}>
      <div className={[
        "max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
        isUser ? "bg-accent-15 border border-accent-35 text-[var(--fg)]" : "bg-[var(--card)] border border-[var(--stroke)]",
      ].join(" ")}>
        {isUser ? props.text : <ModalBubbleContent text={props.text} streaming={props.streaming} />}
      </div>
    </div>
  );
}
