/**
 * «القرآن ٢» — the seven tafsirs of one ayah, side by side: in columns on a
 * wide screen, one under another on a phone. Each is shortened to its opening
 * and can be read in full; move to the ayah before or after without leaving.
 */
import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { useQ2Meta, useQ2Tafsir, useQ2Text } from "../hooks";
import { Q2_TAFSIRS, type Q2Tafsir } from "../data/tafsir";
import { ayahIndex, refFromIndex } from "../data/meta";
import { ayahText } from "../data/text";
import { arDigits } from "../data/arabic";
import { Q2Error, Q2Loading } from "../components/ui";

function TafsirCard({ t, s, a }: { t: Q2Tafsir; s: number; a: number }) {
  const q = useQ2Tafsir(t.id, s, a);
  const [full, setFull] = React.useState(false);
  const paragraphs = q.data ?? [];
  const shown = full ? paragraphs : paragraphs.slice(0, 3);
  return (
    <article className="q2-card" style={{ padding: "14px 16px", alignSelf: "start" }} aria-label={t.name}>
      <header style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <b style={{ fontFamily: "var(--q2-serif)", fontSize: 19 }}>{t.short}</b>
        <span className="q2-small">{t.name}، {t.author}</span>
      </header>
      {q.isLoading ? <Q2Loading /> : null}
      {q.isError ? <Q2Error label="تعذّر تحميله. تحقق من الاتصال." onRetry={() => void q.refetch()} /> : null}
      {shown.map((p, i) => (
        <p key={i} style={{ fontSize: 15.5, lineHeight: 2, marginTop: i ? 10 : 0 }}>{p}</p>
      ))}
      {paragraphs.length > 3 ? (
        <button type="button" className="q2-link" onClick={() => setFull((v) => !v)}>
          {full ? "أقل" : `أكمل القراءة (${arDigits(paragraphs.length)} فقرة)`}
        </button>
      ) : null}
      {q.data && !paragraphs.length ? <p className="q2-small">لا نص لهذه الآية هنا؛ قد يكون تفسيرها مع آية قبلها.</p> : null}
    </article>
  );
}

export default function Q2TafsirCompare() {
  const navigate = useNavigate();
  const params = useParams();
  const text = useQ2Text();
  const meta = useQ2Meta();
  const [hidden, setHidden] = React.useState<Set<number>>(() => new Set());

  if (text.isError || meta.isError) return <Q2Error label="تعذّر تحميل المصحف." />;
  if (!text.data || !meta.data) return <Q2Loading />;
  const m = meta.data;
  const s = Math.min(114, Math.max(1, Number(params.surah) || 1));
  const a = Math.min(m.surahs[s - 1]!.ayahs, Math.max(1, Number(params.ayah) || 1));
  const ayah = text.data.surahs[s - 1]!.ayahs[a - 1]!;
  const index = ayahIndex(m, s, a);
  const go = (i: number) => {
    const [ns, na] = refFromIndex(m, i);
    navigate(`/q2/tafsir/${ns}/${na}`, { replace: true });
  };
  const shown = Q2_TAFSIRS.filter((t) => !hidden.has(t.id));

  return (
    <main className="q2-main" style={{ maxWidth: 1240 }}>
      <div className="q2-eyebrow">سورة {m.surahs[s - 1]!.name}، الآية {arDigits(a)}</div>
      <h1 className="q2-h1" style={{ marginTop: 2 }}>التفاسير السبعة</h1>
      <p style={{ fontFamily: "var(--q2-quran)", fontSize: 24, lineHeight: 2.1, marginTop: 10 }}>{ayahText(ayah)}</p>

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button type="button" className="q2-chip q2-press" disabled={index <= 0} onClick={() => go(index - 1)}>
          <ChevronRight size={15} aria-hidden="true" /> الآية السابقة
        </button>
        <button type="button" className="q2-chip q2-press" disabled={index >= 6235} onClick={() => go(index + 1)}>
          الآية التالية <ChevronLeft size={15} aria-hidden="true" />
        </button>
        <button type="button" className="q2-chip q2-press" onClick={() => navigate(`/q2/read/${s}?a=${a}`)}>
          <BookOpen size={15} aria-hidden="true" /> في المصحف
        </button>
      </div>

      <div className="q2-chips" style={{ marginTop: 14, flexWrap: "wrap" }} role="group" aria-label="التفاسير المعروضة">
        {Q2_TAFSIRS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`q2-chip q2-press${hidden.has(t.id) ? "" : " is-on"}`}
            aria-pressed={!hidden.has(t.id)}
            onClick={() =>
              setHidden((h) => {
                const next = new Set(h);
                if (next.has(t.id)) next.delete(t.id);
                else if (Q2_TAFSIRS.length - next.size > 1) next.add(t.id);
                return next;
              })
            }
          >
            {t.short}
          </button>
        ))}
      </div>

      <div className="q2-compare" style={{ marginTop: 14 }}>
        {shown.map((t) => (
          <TafsirCard key={`${t.id}:${s}:${a}`} t={t} s={s} a={a} />
        ))}
      </div>
      <p className="q2-credit">التفاسير عبر واجهة Quran.com، كلٌّ بنصه كما نشره.</p>
    </main>
  );
}
