import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQ2Meta, useQ2Morph, useQ2Text } from "../hooks";
import { arCount, arDigits } from "../data/arabic";
import { MORPHOLOGY_CREDIT, spacedRoot, splitKey } from "../data/morphology";
import { hitsFromWords, perSurah } from "../data/search";
import { AyahHits } from "../components/AyahHits";
import { Q2Error, Q2Loading, Q2Strip } from "../components/ui";

/** One root: its family of words, where it lives across the surahs, and every place it occurs. */
export default function Q2RootPage() {
  const navigate = useNavigate();
  const { root: raw } = useParams();
  const root = decodeURIComponent(raw ?? "");
  const morph = useQ2Morph();
  const text = useQ2Text();
  const meta = useQ2Meta();
  const [lemma, setLemma] = React.useState<string | null>(null);

  const data = React.useMemo(() => {
    const m = morph.data;
    const keys = m?.roots.get(root);
    if (!m || !keys) return null;
    const lemmaCounts = new Map<string, number>();
    for (const k of keys) {
      const l = m.lemmaOf.get(k);
      if (l) lemmaCounts.set(l, (lemmaCounts.get(l) ?? 0) + 1);
    }
    const lemmas = [...lemmaCounts.entries()].sort((a, b) => b[1] - a[1]);
    const chosen = lemma ? keys.filter((k) => m.lemmaOf.get(k) === lemma) : keys;
    const refs = chosen.map((k) => {
      const [s, a, w] = splitKey(k);
      return { s, a, w };
    });
    const hits = hitsFromWords(refs);
    const meccan = meta.data ? refs.filter((r) => meta.data!.surahs[r.s - 1]!.type === "meccan").length : 0;
    return { total: keys.length, lemmas, hits, refs, meccan };
  }, [morph.data, root, lemma, meta.data]);

  if (morph.isError) return <Q2Error label="تعذّر تحميل معجم الكلمات." onRetry={() => void morph.refetch()} />;
  if (morph.isLoading || !text.data || !meta.data) return <Q2Loading />;
  if (!data) return <Q2Error label="لا يوجد هذا الجذر في القرآن." />;
  const surahs = perSurah(data.hits).filter(Boolean).length;

  return (
    <main className="q2-main">
      <div className="q2-eyebrow">جذر</div>
      <h1 style={{ fontFamily: "var(--q2-serif)", fontSize: 54, fontWeight: 700, color: "var(--q2-gold)", letterSpacing: "0.1em", lineHeight: 1.4 }}>{spacedRoot(root)}</h1>
      <div style={{ display: "flex", gap: 22, marginTop: 6 }}>
        {[
          { n: data.refs.length, t: lemma ? "مرة بهذا اللفظ" : "مرة في القرآن" },
          { n: surahs, t: "سورة" },
          { n: data.lemmas.length, t: "لفظًا" },
        ].map((x) => (
          <span key={x.t}>
            <b style={{ fontSize: 26 }}>{arDigits(x.n)}</b>
            <span className="q2-small" style={{ display: "block" }}>{x.t}</span>
          </span>
        ))}
      </div>
      <p className="q2-small" style={{ marginTop: 8 }}>
        {data.refs.length ? `${arDigits(Math.round((data.meccan / data.refs.length) * 100))}٪ منها في السور المكية` : ""}
      </p>

      <section className="q2-section" style={{ marginTop: 18 }}>
        <div className="q2-head"><h2 className="q2-h2">أين يرد</h2><span className="q2-small">من الفاتحة إلى الناس</span></div>
        <Q2Strip
          counts={perSurah(data.hits, true)}
          label={`توزّع الجذر ${root} على السور`}
          startLabel="الفاتحة"
          endLabel="الناس"
          onPick={(i) => {
            const first = data.hits.find((h) => h.s === i + 1);
            if (first) navigate(`/quran/read/${first.s}?a=${first.a}`);
          }}
        />
      </section>

      <section className="q2-section">
        <div className="q2-head"><h2 className="q2-h2">ألفاظه</h2><span className="q2-small">المس لفظًا لترى مواضعه</span></div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" className={`q2-chip${!lemma ? " is-on" : ""}`} onClick={() => setLemma(null)}>الكل <span className="q2-small">({arDigits(data.total)})</span></button>
          {data.lemmas.map(([l, n]) => (
            <button key={l} type="button" className={`q2-chip${lemma === l ? " is-on" : ""}`} onClick={() => setLemma(lemma === l ? null : l)}>
              <span style={{ fontFamily: "var(--q2-quran)", fontSize: 18 }}>{l}</span> <span className="q2-small">({arDigits(n)})</span>
            </button>
          ))}
        </div>
      </section>

      <section className="q2-section">
        <div className="q2-head">
          <h2 className="q2-h2">المواضع</h2>
          <span className="q2-small">{arCount(data.hits.length, "آية", "آيتان", "آيات", "آية")}</span>
        </div>
        <AyahHits key={lemma ?? "all"} hits={data.hits} text={text.data} meta={meta.data} />
      </section>
      <p className="q2-credit">
        من <a href={MORPHOLOGY_CREDIT.url} target="_blank" rel="noreferrer">{MORPHOLOGY_CREDIT.name}</a>، برخصة <bdi dir="ltr">{MORPHOLOGY_CREDIT.licence}</bdi>.
      </p>
    </main>
  );
}
