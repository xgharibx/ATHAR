import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Volume2 } from "lucide-react";
import { useQ2Morph } from "../hooks";
import { describeSegment } from "../data/grammar";
import { spacedRoot, splitKey, wordKey } from "../data/morphology";
import { arCount, arDigits } from "../data/arabic";
import { Q2Error, Q2Loading } from "../components/ui";
import type { Q2WordLang } from "../data/wordMeanings";

/**
 * Everything about one word: what it is made of, its grammar, its root and
 * lemma, how often they occur, and the reciter saying it.
 */
export function WordLens({ s, a, w, text, surahName, meaning, canHear, onHear }: {
  s: number;
  a: number;
  w: number;
  text: string;
  surahName: string;
  /** Its meaning, word by word, in the chosen language. */
  meaning?: { text: string; lang: Q2WordLang };
  canHear: boolean;
  onHear: () => void;
}) {
  const navigate = useNavigate();
  const morph = useQ2Morph();
  const key = wordKey(s, a, w);

  const facts = React.useMemo(() => {
    const m = morph.data;
    if (!m) return null;
    const segments = m.segments.get(key) ?? [];
    const root = m.rootOf.get(key);
    const lemma = m.lemmaOf.get(key);
    const rootWords = root ? m.roots.get(root) ?? [] : [];
    const rootSurahs = new Set(rootWords.map((k) => splitKey(k)[0])).size;
    const lemmaWords = lemma ? m.lemmas.get(lemma) ?? [] : [];
    const lemmasOfRoot = root ? [...m.lemmaRoot.entries()].filter(([, r]) => r === root).length : 0;
    return { segments, root, lemma, rootCount: rootWords.length, rootSurahs, lemmaCount: lemmaWords.length, lemmasOfRoot };
  }, [morph.data, key]);

  return (
    <div>
      <div className="q2-lens-word">{text}</div>
      <div className="q2-lens-where">
        {surahName}، الآية {arDigits(a)}، الكلمة {arDigits(w)}
      </div>
      {meaning ? (
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <span className="q2-small">معناها ({meaning.lang.label}): </span>
          <b dir={meaning.lang.dir} lang={meaning.lang.code} style={{ fontSize: 16 }}>{meaning.text}</b>
        </div>
      ) : null}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
        <button type="button" className="q2-btn is-ghost q2-press" onClick={onHear} disabled={!canHear}>
          <Volume2 size={17} aria-hidden="true" /> اسمعها بصوت القارئ
        </button>
      </div>

      {morph.isLoading ? <Q2Loading label="يُحمَّل معجم كلمات القرآن لأول مرة (نحو ١ ميغابايت)، ثم يبقى على جهازك" /> : null}
      {morph.isError ? <Q2Error label="تعذّر تحميل معجم الكلمات. تحقق من الاتصال." onRetry={() => void morph.refetch()} /> : null}

      {facts ? (
        <>
          <div className="q2-section" style={{ marginTop: 18 }}>
            <div className="q2-eyebrow" style={{ marginBottom: 4 }}>بناء الكلمة وإعرابها</div>
            {facts.segments.map((seg, i) => {
              const info = describeSegment(seg.pos, seg.tags);
              return (
                <div className="q2-seg" key={i}>
                  <span className="q2-seg-form">{seg.form}</span>
                  <span>
                    <span className="q2-seg-kind">{info.kind}</span>
                    {info.role !== "الكلمة" ? <span className="q2-small">، {info.role}</span> : null}
                    {info.details.length ? <div className="q2-seg-details">{info.details.join("، ")}</div> : null}
                  </span>
                </div>
              );
            })}
          </div>

          {facts.root ? (
            <button type="button" className="q2-root q2-press" onClick={() => navigate(`/quran/roots/${encodeURIComponent(facts.root!)}`)}>
              <span className="q2-root-letters">{spacedRoot(facts.root)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: "block", fontSize: 14 }}>الجذر</b>
                <span className="q2-small">
                  ورد {arCount(facts.rootCount, "مرة واحدة", "مرتين", "مرات", "مرة")} في {arCount(facts.rootSurahs, "سورة واحدة", "سورتين", "سور", "سورة")}
                  {facts.lemmasOfRoot > 1 ? `، ${arDigits(facts.lemmasOfRoot)} ألفاظ مشتقة` : ""}
                </span>
              </span>
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
          ) : (
            <p className="q2-small" style={{ marginTop: 12 }}>كلمة بلا جذر (حرف أو أداة أو اسم جامد).</p>
          )}

          {facts.lemma ? (
            <div className="q2-card" style={{ marginTop: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: "var(--q2-quran)", fontSize: 24 }}>{facts.lemma}</span>
              <span className="q2-small" style={{ flex: 1 }}>
                اللفظ (المدخل المعجمي): ورد {arCount(facts.lemmaCount, "مرة واحدة", "مرتين", "مرات", "مرة")}
              </span>
              <button type="button" className="q2-link" onClick={() => navigate(`/quran/search?lemma=${encodeURIComponent(facts.lemma!)}`)}>
                مواضعه
              </button>
            </div>
          ) : null}
        </>
      ) : null}

    </div>
  );
}
