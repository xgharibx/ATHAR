/**
 * «القرآن ٢» — «التفسير»: open the seven tafsirs of any ayah, read a whole surah
 * with the tafsir you choose, or ask about an ayah; and what each tafsir is.
 */
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Columns3, MessageCircleQuestion, ScrollText } from "lucide-react";
import { useQ2Meta, useQ2Text } from "../hooks";
import { useQ2Store } from "../store";
import { Q2_TAFSIRS, Q2_TAFSIR_NOTES } from "../data/tafsir";
import { arDigits, plainKey } from "../data/arabic";
import { ayahText } from "../data/text";
import { Q2Error, Q2Loading } from "../components/ui";
import { Niche, Star } from "../components/Mishkat";

export default function Q2TafsirHome() {
  const navigate = useNavigate();
  const text = useQ2Text();
  const meta = useQ2Meta();
  const lastRead = useQ2Store((s) => s.lastRead);
  const [surah, setSurah] = React.useState(lastRead?.s ?? 1);
  const [ayah, setAyah] = React.useState(lastRead?.a ?? 1);
  const [tafsir, setTafsir] = React.useState(Q2_TAFSIRS[1]!.id);
  const [filter, setFilter] = React.useState("");

  if (text.isError || meta.isError) return <Q2Error label="تعذّر تحميل المصحف." />;
  if (!text.data || !meta.data) return <Q2Loading />;
  const m = meta.data;
  const maxAyah = m.surahs[surah - 1]!.ayahs;
  const a = Math.min(Math.max(1, ayah), maxAyah);
  const chosen = text.data.surahs[surah - 1]!.ayahs[a - 1]!;
  const q = plainKey(filter);
  const surahs = m.surahs.map((x, i) => ({ id: i + 1, name: x.name, ayahs: x.ayahs })).filter((x) => !q || plainKey(x.name).includes(q) || String(x.id) === filter.trim());

  return (
    <main className="q2-main">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="q2-tile-medal" style={{ width: 52, height: 52 }}><ScrollText size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="q2-h1">التفسير</h1>
          <p className="q2-small">سبعة تفاسير معتمدة، آيةً آية، وسؤال يُجاب منها وحدها</p>
        </div>
      </div>

      <Niche lamp={false} className="q2-rise" style={{ marginTop: 18, padding: "64px 18px 18px" }}>
        <div className="q2-eyebrow" style={{ textAlign: "center" }}>افتح آية</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 96px", gap: 8, marginTop: 10 }}>
          <select className="q2-input" value={surah} onChange={(e) => { setSurah(Number(e.target.value)); setAyah(1); }} aria-label="السورة">
            {m.surahs.map((x, i) => (
              <option key={i} value={i + 1}>{arDigits(i + 1)}. {x.name}</option>
            ))}
          </select>
          <input
            className="q2-input"
            type="number"
            inputMode="numeric"
            min={1}
            max={maxAyah}
            value={a}
            onChange={(e) => setAyah(Number(e.target.value) || 1)}
            aria-label={`رقم الآية، من ١ إلى ${arDigits(maxAyah)}`}
          />
        </div>
        <p style={{ fontFamily: "var(--q2-quran)", fontSize: 21, lineHeight: 2.05, textAlign: "center", marginTop: 12, maxHeight: 150, overflow: "hidden" }}>
          {ayahText(chosen)}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
          <button type="button" className="q2-btn q2-press" onClick={() => navigate(`/q2/tafsir/${surah}/${a}`)}>
            <Columns3 size={16} aria-hidden="true" /> التفاسير السبعة
          </button>
          <button type="button" className="q2-btn is-ghost q2-press" onClick={() => navigate(`/q2/read/${surah}?a=${a}&ask=1`)}>
            <MessageCircleQuestion size={16} aria-hidden="true" /> اسأل عنها
          </button>
        </div>
      </Niche>

      <section className="q2-section">
        <div className="q2-section-title"><Star size={14} /> اقرأ سورة بتفسيرها</div>
        <p className="q2-small" style={{ marginTop: 4 }}>اختر التفسير، ثم السورة: كل آية وتحتها تفسيرها.</p>
        <div className="q2-chips" style={{ marginTop: 10 }}>
          {Q2_TAFSIRS.map((t) => (
            <button key={t.id} type="button" className={`q2-chip q2-press${tafsir === t.id ? " is-on" : ""}`} aria-pressed={tafsir === t.id} onClick={() => setTafsir(t.id)}>
              {t.short}
            </button>
          ))}
        </div>
        <input className="q2-input" style={{ marginTop: 10 }} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="ابحث عن سورة" aria-label="ابحث عن سورة" />
        <div className="q2-card" style={{ marginTop: 10, maxHeight: 360, overflowY: "auto" }}>
          {surahs.map((x) => (
            <button key={x.id} type="button" className="q2-row q2-press" onClick={() => navigate(`/q2/tafsir/read/${x.id}?t=${tafsir}`)}>
              <span className="q2-num">{arDigits(x.id)}</span>
              <span style={{ flex: 1 }}>
                <b style={{ fontFamily: "var(--q2-serif)", fontSize: 18 }}>سورة {x.name}</b>
                <span className="q2-small" style={{ display: "block" }}>{arDigits(x.ayahs)} آية</span>
              </span>
              <ArrowLeft size={16} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      <section className="q2-section">
        <div className="q2-section-title"><Star size={14} /> التفاسير السبعة</div>
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {Q2_TAFSIRS.map((t) => (
            <div key={t.id} className="q2-card" style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <b style={{ fontFamily: "var(--q2-serif)", fontSize: 18 }}>{t.name}</b>
                <span className="q2-small">{t.author}، {Q2_TAFSIR_NOTES[t.id]?.era}</span>
              </div>
              <p className="q2-small" style={{ marginTop: 4, color: "var(--q2-ink)" }}>{Q2_TAFSIR_NOTES[t.id]?.note}</p>
            </div>
          ))}
        </div>
        <p className="q2-credit">التفاسير عبر واجهة Quran.com، كلٌّ بنصه كما نشره.</p>
      </section>
    </main>
  );
}
