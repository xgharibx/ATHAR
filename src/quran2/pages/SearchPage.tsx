import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQ2Meta, useQ2Morph, useQ2Text } from "../hooks";
import { buildSearchIndex, hitsFromWords, perSurah, searchText, type AyahHit } from "../data/search";
import { arCount, arDigits, plainKey } from "../data/arabic";
import { spacedRoot, splitKey } from "../data/morphology";
import { AyahHits } from "../components/AyahHits";
import { Q2Loading, Q2Strip } from "../components/ui";

type Mode = "text" | "root" | "lemma";
const MODES: Array<{ id: Mode; label: string; hint: string }> = [
  { id: "text", label: "الكلمة", hint: "كما تكتبها: «الصلاة»، «ذلك الكتاب»" },
  { id: "root", label: "الجذر", hint: "ثلاثة أحرف أو أربعة: «رحم»، «ك ت ب»" },
  { id: "lemma", label: "اللفظ", hint: "الكلمة بكل تصاريفها: «رحمة»، «كتاب»" },
];

export default function Q2Search() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const text = useQ2Text();
  const meta = useQ2Meta();
  const lemmaParam = params.get("lemma");
  const [mode, setMode] = React.useState<Mode>(lemmaParam ? "lemma" : (params.get("mode") as Mode) || "text");
  const [q, setQ] = React.useState(lemmaParam ?? params.get("q") ?? "");
  const [submitted, setSubmitted] = React.useState(lemmaParam ?? params.get("q") ?? "");
  const morph = useQ2Morph(mode !== "text");
  const index = React.useMemo(() => (text.data ? buildSearchIndex(text.data) : null), [text.data]);

  const result = React.useMemo((): { hits: AyahHit[]; words: number; label?: React.ReactNode } | null => {
    const query = submitted.trim();
    if (!query) return null;
    if (mode === "text") {
      if (!index) return null;
      const hits = searchText(index, query);
      return { hits, words: hits.reduce((n, h) => n + h.words.length, 0) };
    }
    const m = morph.data;
    if (!m) return null;
    if (mode === "root") {
      const want = plainKey(query.replace(/\s+/g, ""));
      const root = [...m.roots.keys()].find((r) => plainKey(r) === want);
      if (!root) return { hits: [], words: 0 };
      const refs = m.roots.get(root)!.map((k) => {
        const [s, a, w] = splitKey(k);
        return { s, a, w };
      });
      return {
        hits: hitsFromWords(refs),
        words: refs.length,
        label: (
          <button type="button" className="q2-link" onClick={() => navigate(`/q2/roots/${encodeURIComponent(root)}`)}>
            افتح الجذر «{spacedRoot(root)}» في المعجم
          </button>
        ),
      };
    }
    const exact = m.lemmas.has(query) ? query : [...m.lemmas.keys()].find((l) => plainKey(l) === plainKey(query));
    if (!exact) return { hits: [], words: 0 };
    const refs = m.lemmas.get(exact)!.map((k) => {
      const [s, a, w] = splitKey(k);
      return { s, a, w };
    });
    return { hits: hitsFromWords(refs), words: refs.length };
  }, [submitted, mode, index, morph.data, navigate]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitted(q);
    setParams(q ? { q, mode } : {}, { replace: true });
  };

  return (
    <main className="q2-main">
      <h1 className="q2-h1">البحث</h1>
      <div className="q2-chips" style={{ marginTop: 12 }} role="tablist">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            className={`q2-chip${mode === m.id ? " is-on" : ""}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <form onSubmit={submit} style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <input
          className="q2-input"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={MODES.find((m) => m.id === mode)!.hint}
          aria-label="ما تبحث عنه"
          enterKeyHint="search"
        />
        <button type="submit" className="q2-btn q2-press">ابحث</button>
      </form>

      {mode !== "text" && morph.isLoading ? <Q2Loading label="يُحمَّل معجم كلمات القرآن لأول مرة، ثم يبقى على جهازك" /> : null}
      {!text.data || !meta.data ? <Q2Loading /> : null}

      {result && text.data && meta.data ? (
        <section className="q2-section" style={{ marginTop: 18 }}>
          {result.hits.length ? (
            <>
              <div className="q2-head">
                <b>
                  {arCount(result.hits.length, "آية واحدة", "آيتان", "آيات", "آية")}
                  {result.words !== result.hits.length ? `، ${arCount(result.words, "موضع", "موضعان", "مواضع", "موضعًا")}` : ""}
                </b>
                <span className="q2-small">في {arCount(perSurah(result.hits).filter(Boolean).length, "سورة", "سورتين", "سور", "سورة")}</span>
              </div>
              {result.label}
              <div style={{ margin: "10px 0 14px" }}>
                <Q2Strip
                  counts={perSurah(result.hits)}
                  label="توزّع النتائج على السور"
                  startLabel="الفاتحة"
                  endLabel="الناس"
                  onPick={(i) => {
                    const first = result.hits.find((h) => h.s === i + 1);
                    if (first) navigate(`/q2/read/${first.s}?a=${first.a}`);
                  }}
                />
              </div>
              <AyahHits hits={result.hits} text={text.data} meta={meta.data} />
            </>
          ) : (
            <div className="q2-empty">لا نتائج. جرّب كتابة الكلمة دون «ال»، أو ابحث بجذرها.</div>
          )}
        </section>
      ) : null}

      {!submitted ? (
        <div className="q2-card" style={{ padding: 16, marginTop: 18 }}>
          <p style={{ lineHeight: 2, fontSize: 15 }}>
            البحث يفهم الرسم العثماني: تكتب «الصلاة» فيجد «ٱلصَّلَوٰةَ»، وتكتب «العالمين» فيجد «ٱلْعَـٰلَمِينَ». والبحث بالجذر يجمع كل ما اشتُق منه، وبالّلفظ يجمع تصاريف الكلمة الواحدة.
          </p>
          <div className="q2-chips" style={{ marginTop: 10, flexWrap: "wrap" }}>
            {[
              { m: "text" as Mode, q: "الصبر" },
              { m: "text" as Mode, q: "رب العالمين" },
              { m: "root" as Mode, q: "نور" },
              { m: "root" as Mode, q: "شكر" },
            ].map((ex) => (
              <button
                key={ex.m + ex.q}
                type="button"
                className="q2-chip q2-press"
                onClick={() => {
                  setMode(ex.m);
                  setQ(ex.q);
                  setSubmitted(ex.q);
                }}
              >
                {ex.m === "root" ? `جذر «${ex.q}»` : `«${ex.q}»`}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {text.data ? (
        <p className="q2-credit">
          {arDigits(text.data.surahs.reduce((n, s) => n + s.ayahs.reduce((m, a) => m + a.words.length, 0), 0))} كلمة، يُبحث فيها كلها على جهازك.
        </p>
      ) : null}
    </main>
  );
}
