import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { useQ2Meta, useQ2Similar, useQ2Text } from "../hooks";
import { useQ2Store } from "../store";
import { buildDrill, type DrillQuestion } from "../hifz/similarDrill";
import { arDigits } from "../data/arabic";
import { pageRange, refFromIndex, type Q2Meta } from "../data/meta";
import { Q2Loading } from "../components/ui";

type Scope = "mine" | "amma" | "all";
const ROUND = 10;

function ayahsOfPages(meta: Q2Meta, pages: number[]): Array<{ s: number; a: number }> {
  const out: Array<{ s: number; a: number }> = [];
  for (const p of pages) {
    const [first, last] = pageRange(meta, p);
    for (let i = first; i <= last; i++) {
      const [s, a] = refFromIndex(meta, i);
      out.push({ s, a });
    }
  }
  return out;
}

/** Drills on the ayahs that are easy to mix up. */
export default function Q2SimilarDrill() {
  const navigate = useNavigate();
  const text = useQ2Text();
  const meta = useQ2Meta();
  const index = useQ2Similar();
  const hifz = useQ2Store((s) => s.hifz);
  const memorised = Object.keys(hifz).map(Number);
  const [scope, setScope] = React.useState<Scope>(memorised.length >= 3 ? "mine" : "amma");
  const [round, setRound] = React.useState(0);
  const [step, setStep] = React.useState(0);
  const [picked, setPicked] = React.useState<number | null>(null);
  const [score, setScore] = React.useState(0);

  const questions = React.useMemo((): DrillQuestion[] => {
    if (!text.data || !meta.data || !index.data) return [];
    const pages = scope === "mine" ? memorised : scope === "amma" ? Array.from({ length: 23 }, (_, i) => 582 + i) : null;
    const ayahs = pages
      ? ayahsOfPages(meta.data, pages)
      : text.data.surahs.flatMap((su) => su.ayahs.map((ay) => ({ s: ay.s, a: ay.a })));
    return buildDrill({ text: text.data, index: index.data, ayahs, count: ROUND });
    // A new round draws new questions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text.data, meta.data, index.data, scope, round]);

  if (!text.data || !meta.data || !index.data) return <Q2Loading />;
  const m = meta.data;
  const q = questions[step];
  const reset = (next: Scope = scope) => {
    setScope(next);
    setRound((r) => r + 1);
    setStep(0);
    setPicked(null);
    setScore(0);
  };

  return (
    <main className="q2-main">
      <button type="button" className="q2-link" onClick={() => navigate("/q2/hifz")}>
        <ArrowRight size={15} aria-hidden="true" /> الحفظ
      </button>
      <h1 className="q2-h1">المتشابهات</h1>
      <p className="q2-soft" style={{ marginTop: 4, lineHeight: 1.9 }}>
        آيات تبدأ بكلمات واحدة ثم تفترق. تُعرض الكلمات المشتركة واسم السورة، فاختر التتمة الصحيحة لهذا الموضع.
      </p>
      <div className="q2-chips" style={{ marginTop: 12 }}>
        {memorised.length >= 3 ? (
          <button type="button" className={`q2-chip${scope === "mine" ? " is-on" : ""}`} onClick={() => reset("mine")}>من حفظي</button>
        ) : null}
        <button type="button" className={`q2-chip${scope === "amma" ? " is-on" : ""}`} onClick={() => reset("amma")}>جزء عمّ</button>
        <button type="button" className={`q2-chip${scope === "all" ? " is-on" : ""}`} onClick={() => reset("all")}>القرآن كله</button>
      </div>

      {!questions.length ? (
        <div className="q2-empty">لا متشابهات في هذا النطاق بعد. جرّب نطاقًا أوسع.</div>
      ) : q ? (
        <section className="q2-card" style={{ padding: 16, marginTop: 16 }}>
          <div className="q2-head" style={{ margin: 0 }}>
            <span className="q2-eyebrow">سورة {m.surahs[q.s - 1]!.name}، الآية {arDigits(q.a)}</span>
            <span className="q2-small">{arDigits(step + 1)} من {arDigits(questions.length)}</span>
          </div>
          <p style={{ fontFamily: "var(--q2-quran)", fontSize: 24, lineHeight: 2.1, marginTop: 10 }}>
            {q.lead} <span style={{ color: "var(--q2-gold)" }}>…</span>
          </p>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {q.options.map((option, i) => {
              const state = picked == null ? "" : i === q.answer ? "right" : i === picked ? "wrong" : "";
              return (
                <button
                  key={i}
                  type="button"
                  className="q2-press"
                  disabled={picked != null}
                  onClick={() => {
                    setPicked(i);
                    if (i === q.answer) setScore((n) => n + 1);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minHeight: 54,
                    padding: "6px 14px",
                    borderRadius: 16,
                    textAlign: "start",
                    fontFamily: "var(--q2-quran)",
                    fontSize: 21,
                    border: `1px solid ${state === "right" ? "var(--q2-green)" : state === "wrong" ? "var(--q2-danger)" : "var(--q2-line)"}`,
                    background: state === "right" ? "var(--q2-green-soft)" : state === "wrong" ? "color-mix(in srgb, var(--q2-danger) 10%, transparent)" : "transparent",
                    color: "var(--q2-ink)",
                  }}
                >
                  <span style={{ flex: 1 }}>{option}</span>
                  {state === "right" ? <Check size={18} aria-hidden="true" color="var(--q2-green)" /> : null}
                  {state === "wrong" ? <X size={18} aria-hidden="true" color="var(--q2-danger)" /> : null}
                </button>
              );
            })}
          </div>
          {picked != null ? (
            <div style={{ marginTop: 14 }}>
              <p className="q2-small" style={{ lineHeight: 1.9 }}>
                الآية كاملة:
                <span style={{ display: "block", fontFamily: "var(--q2-quran)", fontSize: 19, color: "var(--q2-ink)" }}>
                  {text.data.surahs[q.s - 1]!.ayahs[q.a - 1]!.words.map((w) => w.text).join(" ")}
                </span>
                تشبهها: {q.others.map((o) => `${m.surahs[o.s - 1]!.name} ${arDigits(o.a)}`).join("، ")}
              </p>
              <button
                type="button"
                className="q2-btn q2-press"
                style={{ width: "100%", marginTop: 12 }}
                onClick={() => {
                  setStep((n) => n + 1);
                  setPicked(null);
                }}
              >
                {step + 1 < questions.length ? "التالي" : "النتيجة"}
              </button>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="q2-card" style={{ padding: 20, marginTop: 16, textAlign: "center" }}>
          <div style={{ fontSize: 36, color: "var(--q2-gold)" }}>✦</div>
          <h2 className="q2-h2" style={{ marginTop: 6 }}>{arDigits(score)} من {arDigits(questions.length)}</h2>
          <p className="q2-soft" style={{ marginTop: 6 }}>{score === questions.length ? "أحسنت، فرّقت بينها كلها." : "راجع ما أخطأت فيه، فهو موضع الخلط عندك."}</p>
          <button type="button" className="q2-btn q2-press" style={{ marginTop: 14 }} onClick={() => reset()}>
            <RotateCcw size={16} aria-hidden="true" /> جولة أخرى
          </button>
        </section>
      )}
    </main>
  );
}
