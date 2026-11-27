/**
 * «اسأل عن الحديث»: a question about this hadith, answered by «أثر» from the
 * hadith itself, its scholars' rulings and its explanation only (the server
 * reads them; supabase/functions/companion/hadithAsk.ts). Asks for the same
 * consent as the companion before the first question leaves the device.
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Send, Sparkles, Square } from "lucide-react";
import { askAboutHadith, type CompanionStage } from "@/lib/companionAI";
import { grantCompanionAiConsent, needsCompanionAiConsent } from "@/lib/companionConsent";
import { CompanionAiConsentDialog } from "@/components/companion/CompanionAiConsentDialog";
import { ReplyContent } from "@/components/companion/ReplyContent";

const HADITH_ASK_SUGGESTIONS = ["ما المعنى الإجمالي لهذا الحديث؟", "ما فوائده؟", "ما معنى كلماته الغريبة؟", "ما حكمه عند العلماء؟"];

const STAGE_LABEL: Partial<Record<CompanionStage, string>> = {
  gathering: "يُجمع نص الحديث وشرحه وأحكام العلماء عليه…",
  writing: "يُكتب الجواب منها…",
  verifying: "يُراجع الجواب…",
};

export function HadithAskPanel({ bookKey, n }: { bookKey: string; n: number }) {
  const navigate = useNavigate();
  const [question, setQuestion] = React.useState("");
  const [asked, setAsked] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [stage, setStage] = React.useState<CompanionStage | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [consentFor, setConsentFor] = React.useState<string | null>(null);
  const abort = React.useRef<AbortController | null>(null);

  React.useEffect(() => () => abort.current?.abort(), []);

  const send = async (text: string, approved = false) => {
    const q = text.trim();
    if (!q || busy) return;
    if (!approved && needsCompanionAiConsent()) {
      setConsentFor(q);
      return;
    }
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setAsked(q);
    setAnswer("");
    setError(null);
    setStage("gathering");
    await askAboutHadith(
      { book: bookKey, n },
      q,
      {
        onText: (chunk) => {
          setStage(null);
          setAnswer((prev) => prev + chunk);
        },
        onStage: setStage,
        onError: (err) => setError(err.message),
      },
      controller.signal,
    );
    setBusy(false);
    setStage(null);
    setQuestion("");
  };

  return (
    <div dir="rtl" className="stack-y-3">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <Sparkles size={18} aria-hidden="true" className="text-(--accent)" /> اسأل عن الحديث
      </h2>
      <p className="text-xs leading-6 text-(--muted)">
        يجيبك «أثر» من نص هذا الحديث وشرحه وأحكام العلماء عليه وحدها، منسوبًا كل قول إلى مصدره. وإن لم تتناول سؤالك قال ذلك.
      </p>
      <div className="flex flex-wrap gap-2">
        {HADITH_ASK_SUGGESTIONS.map((sg) => (
          <button key={sg} type="button" disabled={busy} onClick={() => void send(sg)}
            className="rounded-full border border-(--stroke) bg-(--card) px-3 py-1.5 text-xs press-effect disabled:opacity-50">
            {sg}
          </button>
        ))}
      </div>
      <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); void send(question); }}>
        <input value={question} maxLength={600} onChange={(e) => setQuestion(e.target.value)}
          placeholder="سؤالك عن الحديث" aria-label="سؤالك عن الحديث" enterKeyHint="send"
          className="min-w-0 flex-1 rounded-2xl border border-(--stroke) bg-(--card) px-3 py-2.5 text-sm outline-none focus:border-(--accent)" />
        {busy ? (
          <button type="button" aria-label="أوقف" onClick={() => abort.current?.abort()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-(--stroke) press-effect">
            <Square size={16} aria-hidden="true" />
          </button>
        ) : (
          <button type="submit" aria-label="أرسل" disabled={!question.trim()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-(--accent) text-(--on-accent) press-effect disabled:opacity-40">
            <Send size={16} aria-hidden="true" />
          </button>
        )}
      </form>

      {asked ? (
        <div className="rounded-2xl border border-(--stroke) bg-(--card) p-4" aria-live="polite">
          <p className="mb-1.5 text-xs font-bold text-(--accent)">{asked}</p>
          {stage && !answer ? <p className="text-xs text-(--muted)">{STAGE_LABEL[stage] ?? "لحظات…"}</p> : null}
          {answer ? <ReplyContent text={answer} size="compact" onNavigate={(route) => navigate(route)} /> : null}
          {error ? <p className="text-xs text-red-500">{error}</p> : null}
        </div>
      ) : null}
      <p className="text-[11px] leading-5 text-(--muted)">الجواب يلخّص ما في الشرح وقد يخطئ؛ النص والشرح نفسهما في صفحة الحديث.</p>

      <CompanionAiConsentDialog
        open={consentFor != null}
        onCancel={() => setConsentFor(null)}
        onApprove={() => {
          const q = consentFor;
          grantCompanionAiConsent();
          setConsentFor(null);
          if (q) void send(q, true);
        }}
      />
    </div>
  );
}
