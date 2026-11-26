/**
 * «القرآن الكريم» — a surah read with one tafsir: each ayah, and under it its tafsir
 * (shortened, to read in full on a tap). Switch the tafsir at the top; open the
 * seven side by side, or ask about an ayah, from each one.
 */
import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, Columns3, MessageCircleQuestion } from "lucide-react";
import { useQ2Meta, useQ2SurahTafsir, useQ2Text } from "../hooks";
import { Q2_TAFSIRS } from "../data/tafsir";
import { arDigits } from "../data/arabic";
import { ayahText } from "../data/text";
import { Q2Error, Q2Loading } from "../components/ui";

function AyahTafsir({ paragraphs }: { paragraphs: string[] }) {
  const [full, setFull] = React.useState(false);
  if (!paragraphs.length) return <p className="q2-small">تفسيرها مع ما قبلها.</p>;
  const shown = full ? paragraphs : paragraphs.slice(0, 2);
  return (
    <div>
      {shown.map((p, i) => (
        <p key={i} style={{ fontSize: 16, lineHeight: 2, marginTop: i ? 8 : 0 }}>{p}</p>
      ))}
      {paragraphs.length > 2 ? (
        <button type="button" className="q2-link" onClick={() => setFull((v) => !v)}>
          {full ? "أقل" : `أكمل (${arDigits(paragraphs.length)} فقرة)`}
        </button>
      ) : null}
    </div>
  );
}

export default function Q2TafsirRead() {
  const navigate = useNavigate();
  const params = useParams();
  const [search, setSearch] = useSearchParams();
  const s = Math.min(114, Math.max(1, Number(params.surah) || 1));
  const id = Q2_TAFSIRS.some((t) => t.id === Number(search.get("t"))) ? Number(search.get("t")) : Q2_TAFSIRS[1]!.id;
  const text = useQ2Text();
  const meta = useQ2Meta();
  const info = meta.data?.surahs[s - 1];
  const tafsir = useQ2SurahTafsir(id, s, info?.ayahs);
  const edition = Q2_TAFSIRS.find((t) => t.id === id)!;

  if (text.isError || meta.isError) return <Q2Error label="تعذّر تحميل المصحف." />;
  if (!text.data || !info) return <Q2Loading />;
  const surah = text.data.surahs[s - 1]!;

  return (
    <main className="q2-main">
      <button type="button" className="q2-link" onClick={() => navigate("/quran/tafsir")}>
        <ArrowRight size={15} aria-hidden="true" /> التفسير
      </button>
      <div className="q2-surah-head" style={{ marginTop: 8 }}>
        <div className="q2-surah-name">سورة {info.name}</div>
        <div className="q2-surah-meta">{edition.name}، {edition.author}</div>
      </div>
      <div className="q2-chips" style={{ position: "sticky", top: "calc(var(--q2-top) + 60px)", zIndex: 5, padding: "6px 0", background: "color-mix(in srgb, var(--q2-bg) 88%, transparent)" }}>
        {Q2_TAFSIRS.map((t) => (
          <button key={t.id} type="button" className={`q2-chip q2-press${t.id === id ? " is-on" : ""}`} aria-pressed={t.id === id} onClick={() => setSearch({ t: String(t.id) }, { replace: true })}>
            {t.short}
          </button>
        ))}
      </div>
      {tafsir.isError ? <Q2Error label="تعذّر تحميل التفسير. تحقق من الاتصال." onRetry={() => void tafsir.refetch()} /> : null}
      {tafsir.isLoading ? <Q2Loading label="يُحمَّل تفسير السورة…" /> : null}
      {surah.basmala ? <div className="q2-basmala" style={{ marginTop: 10 }}>{surah.basmala}</div> : null}
      <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
        {surah.ayahs.map((ayah) => (
          <article key={ayah.a} className="q2-card" style={{ padding: "14px 16px" }} id={`q2-ta${ayah.a}`}>
            <p style={{ fontFamily: "var(--q2-quran)", fontSize: 23, lineHeight: 2.1 }}>
              {ayahText(ayah)} <span className="q2-end">۝{arDigits(ayah.a)}</span>
            </p>
            <div style={{ borderTop: "1px solid var(--q2-line)", marginTop: 8, paddingTop: 10 }}>
              {tafsir.data ? <AyahTafsir paragraphs={tafsir.data[ayah.a - 1] ?? []} /> : null}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button type="button" className="q2-chip q2-press" onClick={() => navigate(`/quran/tafsir/${s}/${ayah.a}`)}>
                <Columns3 size={14} aria-hidden="true" /> السبعة معًا
              </button>
              <button type="button" className="q2-chip q2-press" onClick={() => navigate(`/quran/read/${s}?a=${ayah.a}&ask=1`)}>
                <MessageCircleQuestion size={14} aria-hidden="true" /> اسأل عنها
              </button>
            </div>
          </article>
        ))}
      </div>
      <p className="q2-credit">{edition.name} عبر واجهة Quran.com.</p>
    </main>
  );
}
