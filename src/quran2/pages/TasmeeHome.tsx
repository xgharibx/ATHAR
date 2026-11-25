/**
 * «القرآن ٢» — «التسميع»: recite from memory and be followed word by word. Choose
 * what to recite (a passage of a surah, a page, or today's memorisation) and how
 * the text is shown (hidden, the first word of each ayah, or in full to practise
 * the reading itself); then see your past recitations.
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, RotateCcw } from "lucide-react";
import { useQ2Meta } from "../hooks";
import { useQ2Store } from "../store";
import { pageOf } from "../data/meta";
import { arDigits } from "../data/arabic";
import { useHifzToday } from "../hifz/useHifzToday";
import { Q2Error, Q2Loading } from "../components/ui";
import { Niche, Star } from "../components/Mishkat";
import type { TasmeeMode } from "../tasmee/types";

type What = "surah" | "page" | "hifz";

const MODES: Array<{ id: TasmeeMode; label: string; hint: string }> = [
  { id: "hidden", label: "مخفية", hint: "لا يظهر شيء حتى تتلوه" },
  { id: "cue", label: "أوائل الآيات", hint: "الكلمة الأولى من كل آية" },
  { id: "shown", label: "ظاهرة", hint: "للتدرّب على التلاوة نفسها" },
];

export default function Q2TasmeeHome() {
  const navigate = useNavigate();
  const meta = useQ2Meta();
  const lastRead = useQ2Store((s) => s.lastRead);
  const log = useQ2Store((s) => s.tasmeeLog);
  const today = useHifzToday();
  const [what, setWhat] = React.useState<What>("surah");
  const [mode, setMode] = React.useState<TasmeeMode>("hidden");
  const [surah, setSurah] = React.useState(lastRead?.s ?? 1);
  const [from, setFrom] = React.useState(1);
  const [to, setTo] = React.useState(7);
  const [page, setPage] = React.useState<number | null>(null);

  if (meta.isError) return <Q2Error label="تعذّر تحميل المصحف." />;
  if (!meta.data) return <Q2Loading />;
  const m = meta.data;
  const count = m.surahs[surah - 1]!.ayahs;
  const f = Math.min(Math.max(1, from), count);
  const t = Math.min(Math.max(f, to), count);
  const p = page ?? (lastRead ? pageOf(m, lastRead.s, lastRead.a) : 1);
  const duePages = [...today.plan.near, ...today.plan.far];

  const start = () => {
    if (what === "surah") navigate(`/q2/tasmee/session?s=${surah}&from=${f}&to=${t}&mode=${mode}`);
    else if (what === "page") navigate(`/q2/tasmee/session?page=${p}&mode=${mode}`);
  };

  return (
    <main className="q2-main">
      <Niche className="q2-rise is-hero" style={{ aspectRatio: "1.15", maxWidth: 430, margin: "4px auto 0" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", textAlign: "center", padding: "0 22px 22px" }}>
          <h1 className="q2-h1" style={{ fontSize: 32 }}>التسميع</h1>
          <p className="q2-soft" style={{ fontSize: 14, lineHeight: 1.9, marginTop: 4 }}>
            اتلُ من حفظك، فيتتبعك «أثر» كلمةً كلمة، ويريك ما فاتك، وتسمع نطق القارئ لكل كلمة.
          </p>
        </div>
      </Niche>

      <section className="q2-section">
        <div className="q2-section-title"><Star size={14} /> ماذا تسمّع؟</div>
        <div className="q2-chips" style={{ marginTop: 10 }} role="tablist">
          {([["surah", "مقطع من سورة"], ["page", "صفحة"], ["hifz", "من حفظك"]] as Array<[What, string]>).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={what === id} className={`q2-chip q2-press${what === id ? " is-on" : ""}`} onClick={() => setWhat(id)}>
              {label}
            </button>
          ))}
        </div>

        {what === "surah" ? (
          <div className="q2-card" style={{ padding: 14, marginTop: 10, display: "grid", gap: 10 }}>
            <select className="q2-input" value={surah} onChange={(e) => { const s = Number(e.target.value); setSurah(s); setFrom(1); setTo(Math.min(7, m.surahs[s - 1]!.ayahs)); }} aria-label="السورة">
              {m.surahs.map((x, i) => (
                <option key={i} value={i + 1}>{arDigits(i + 1)}. {x.name} ({arDigits(x.ayahs)} آية)</option>
              ))}
            </select>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label className="q2-small">من الآية
                <input className="q2-input" type="number" inputMode="numeric" min={1} max={count} value={f} onChange={(e) => setFrom(Number(e.target.value) || 1)} />
              </label>
              <label className="q2-small">إلى الآية
                <input className="q2-input" type="number" inputMode="numeric" min={f} max={count} value={t} onChange={(e) => setTo(Number(e.target.value) || f)} />
              </label>
            </div>
            <button type="button" className="q2-link" onClick={() => { setFrom(1); setTo(count); }}>السورة كاملة ({arDigits(count)} آية)</button>
          </div>
        ) : null}

        {what === "page" ? (
          <div className="q2-card" style={{ padding: 14, marginTop: 10 }}>
            <label className="q2-small">رقم الصفحة (١–٦٠٤)
              <input className="q2-input" type="number" inputMode="numeric" min={1} max={604} value={p} onChange={(e) => setPage(Math.min(604, Math.max(1, Number(e.target.value) || 1)))} />
            </label>
          </div>
        ) : null}

        {what === "hifz" ? (
          <div className="q2-card" style={{ marginTop: 10 }}>
            {duePages.length ? (
              duePages.slice(0, 12).map((pg) => (
                <button key={pg} type="button" className="q2-row q2-press" onClick={() => navigate(`/q2/tasmee/session?page=${pg}&mode=${mode}`)}>
                  <span className="q2-num">{arDigits(pg)}</span>
                  <span style={{ flex: 1 }}>الصفحة {arDigits(pg)}، {today.plan.near.includes(pg) ? "مراجعة القريب" : "مراجعة البعيد"}</span>
                  <ArrowLeft size={16} aria-hidden="true" />
                </button>
              ))
            ) : (
              <p className="q2-empty">لا مراجعة مستحقة اليوم. اختر سورة أو صفحة، أو ابدأ الحفظ من «الحفظ».</p>
            )}
          </div>
        ) : null}
      </section>

      <section className="q2-section">
        <div className="q2-section-title"><Star size={14} /> كيف يظهر النص؟</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 10 }}>
          {MODES.map((x) => (
            <button key={x.id} type="button" aria-pressed={mode === x.id} className={`q2-card q2-press${mode === x.id ? " is-on" : ""}`} style={{ padding: "12px 8px", textAlign: "center", borderColor: mode === x.id ? "var(--q2-green)" : undefined }} onClick={() => setMode(x.id)}>
              <b style={{ display: "block", fontFamily: "var(--q2-display)", fontWeight: 600, color: mode === x.id ? "var(--q2-green)" : undefined }}>{x.label}</b>
              <span className="q2-small">{x.hint}</span>
            </button>
          ))}
        </div>
      </section>

      {what !== "hifz" ? (
        <button type="button" className="q2-btn q2-press" style={{ width: "100%", marginTop: 20, minHeight: 54, fontSize: 16 }} onClick={start}>
          <Mic size={19} aria-hidden="true" /> ابدأ التسميع
        </button>
      ) : null}

      {log.length ? (
        <section className="q2-section">
          <div className="q2-section-title"><Star size={14} /> تسميعك الأخير</div>
          <div className="q2-card" style={{ marginTop: 10 }}>
            {log.slice(0, 8).map((e) => {
              const pct = e.total ? Math.round((e.said / e.total) * 100) : 0;
              return (
                <button key={e.at} type="button" className="q2-row q2-press" onClick={() => navigate(e.target)}>
                  <span style={{ flex: 1 }}>
                    <b style={{ display: "block" }}>{e.label}</b>
                    <span className="q2-small">
                      {new Date(e.at).toLocaleDateString("ar-u-nu-arab", { day: "numeric", month: "long" })}، {e.missed.length ? `فاتك ${arDigits(e.missed.length)}` : "دون خطأ"}
                    </span>
                  </span>
                  <b style={{ fontFamily: "var(--q2-display)", color: pct >= 90 ? "var(--q2-green)" : "var(--q2-gold)" }}>{arDigits(pct)}٪</b>
                  <RotateCcw size={15} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
    </main>
  );
}
