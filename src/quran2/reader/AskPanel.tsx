/**
 * «القرآن ٢» — «اسأل عن الآية»: a question about this ayah, answered by «أثر»
 * from the ayah's seven tafsirs only (the server fetches them and binds the
 * answer to them; supabase/functions/companion/ayah.ts). Asks for the same
 * consent as the companion before the first question leaves the device.
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Columns3, Send, Square } from "lucide-react";
import { askAboutAyah, type CompanionStage } from "@/lib/companionAI";
import { grantCompanionAiConsent, needsCompanionAiConsent } from "@/lib/companionConsent";
import { CompanionAiConsentDialog } from "@/components/companion/CompanionAiConsentDialog";
import { ReplyContent } from "@/components/companion/ReplyContent";

const SUGGESTIONS = ["ما المعنى الإجمالي لهذه الآية؟", "ما سبب نزولها؟", "ماذا تعلّمني هذه الآية؟", "هل اختلف المفسرون فيها؟"];

const STAGE_LABEL: Partial<Record<CompanionStage, string>> = {
  gathering: "تُجمع التفاسير السبعة لهذه الآية…",
  writing: "يُكتب الجواب منها…",
  verifying: "يُراجع الجواب…",
};

export function AskPanel({ s, a }: { s: number; a: number }) {
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
    await askAboutAyah(
      { surah: s, ayah: a },
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
    <div>
      <p className="q2-small" style={{ lineHeight: 1.9 }}>
        اسأل «أثر» عن هذه الآية، فيجيبك من التفاسير السبعة لها وحدها، منسوبًا كل قول إلى صاحبه. وإن لم تتناول سؤالك قال ذلك.
      </p>
      <div className="q2-chips" style={{ marginTop: 8, flexWrap: "wrap" }}>
        {SUGGESTIONS.map((sg) => (
          <button key={sg} type="button" className="q2-chip q2-press" disabled={busy} onClick={() => void send(sg)}>
            {sg}
          </button>
        ))}
      </div>
      <form
        style={{ display: "flex", gap: 8, marginTop: 10 }}
        onSubmit={(e) => {
          e.preventDefault();
          void send(question);
        }}
      >
        <input
          className="q2-input"
          value={question}
          maxLength={600}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="سؤالك عن الآية"
          aria-label="سؤالك عن الآية"
          enterKeyHint="send"
        />
        {busy ? (
          <button type="button" className="q2-icon-btn q2-press" aria-label="أوقف" onClick={() => abort.current?.abort()} style={{ flex: "none", width: 48, height: 48 }}>
            <Square size={17} aria-hidden="true" />
          </button>
        ) : (
          <button type="submit" className="q2-btn q2-press" disabled={!question.trim()} aria-label="أرسل">
            <Send size={16} aria-hidden="true" />
          </button>
        )}
      </form>

      {asked ? (
        <div className="q2-card" style={{ marginTop: 12, padding: "14px 16px" }} aria-live="polite">
          <div className="q2-eyebrow" style={{ marginBottom: 6 }}>{asked}</div>
          {stage && !answer ? <p className="q2-small">{STAGE_LABEL[stage] ?? "لحظات…"}</p> : null}
          {answer ? <ReplyContent text={answer} size="compact" onNavigate={(route) => navigate(route)} /> : null}
          {error ? <p className="q2-small" style={{ color: "var(--q2-danger)" }}>{error}</p> : null}
        </div>
      ) : null}

      <button type="button" className="q2-link" style={{ marginTop: 8 }} onClick={() => navigate(`/q2/tafsir/${s}/${a}`)}>
        <Columns3 size={14} aria-hidden="true" /> اقرأ التفاسير السبعة بنفسك
      </button>
      <p className="q2-credit">الجواب يلخّص ما في التفاسير وقد يخطئ؛ النصوص نفسها في صفحة التفاسير السبعة.</p>

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
