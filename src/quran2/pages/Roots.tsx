import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQ2Morph } from "../hooks";
import { arCount, arDigits, plainKey } from "../data/arabic";
import { MORPHOLOGY_CREDIT, spacedRoot, splitKey } from "../data/morphology";
import { Q2Error, Q2Loading } from "../components/ui";

const LETTERS = "ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي".split(" ");
const STEP = 80;

/** Every root of the Quran: how often it occurs, in how many surahs, and its words. */
export default function Q2Roots() {
  const navigate = useNavigate();
  const morph = useQ2Morph();
  const [q, setQ] = React.useState("");
  const [letter, setLetter] = React.useState<string | null>(null);
  const [shown, setShown] = React.useState(STEP);

  const roots = React.useMemo(() => {
    const m = morph.data;
    if (!m) return [];
    const lemmaCount = new Map<string, number>();
    for (const r of m.lemmaRoot.values()) lemmaCount.set(r, (lemmaCount.get(r) ?? 0) + 1);
    return [...m.roots.entries()]
      .map(([root, keys]) => ({
        root,
        key: plainKey(root),
        count: keys.length,
        surahs: new Set(keys.map((k) => splitKey(k)[0])).size,
        lemmas: lemmaCount.get(root) ?? 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [morph.data]);

  if (morph.isError) return <Q2Error label="تعذّر تحميل معجم الكلمات. تحقق من الاتصال." onRetry={() => void morph.refetch()} />;
  if (morph.isLoading) return <Q2Loading label="يُحمَّل معجم كلمات القرآن لأول مرة (نحو ١ ميغابايت)، ثم يبقى على جهازك" />;

  const query = plainKey(q.replace(/\s+/g, ""));
  const list = roots.filter((r) => (!query || r.key.includes(query)) && (!letter || r.key.startsWith(letter)));

  return (
    <main className="q2-main">
      <h1 className="q2-h1">معجم الجذور</h1>
      <p className="q2-soft" style={{ marginTop: 4, lineHeight: 1.9 }}>
        {arDigits(roots.length)} جذرًا تتفرّع منها كلمات القرآن. المس جذرًا لترى ألفاظه وأين يرد.
      </p>
      <input
        className="q2-input"
        style={{ marginTop: 12 }}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setShown(STEP);
        }}
        placeholder="اكتب الجذر: رحم، ك ت ب …"
        aria-label="ابحث عن جذر"
      />
      <div className="q2-chips" style={{ marginTop: 10 }}>
        <button type="button" className={`q2-chip${!letter ? " is-on" : ""}`} onClick={() => setLetter(null)}>الكل</button>
        {LETTERS.map((l) => (
          <button key={l} type="button" className={`q2-chip${letter === l ? " is-on" : ""}`} style={{ minWidth: 40, justifyContent: "center", padding: 0 }} onClick={() => { setLetter(l); setShown(STEP); }}>
            {l}
          </button>
        ))}
      </div>
      <div className="q2-card" style={{ marginTop: 12 }}>
        {list.slice(0, shown).map((r, i) => (
          <button key={r.root} type="button" className="q2-row q2-press" onClick={() => navigate(`/q2/roots/${encodeURIComponent(r.root)}`)}>
            <span className="q2-small" style={{ minWidth: 30, textAlign: "center" }}>{arDigits(i + 1)}</span>
            <span style={{ fontFamily: "var(--q2-serif)", fontSize: 24, fontWeight: 700, color: "var(--q2-gold)", minWidth: 86 }}>{spacedRoot(r.root)}</span>
            <span style={{ flex: 1, minWidth: 0 }} className="q2-small">
              {arCount(r.count, "مرة واحدة", "مرتان", "مرات", "مرة")}، {arCount(r.surahs, "سورة", "سورتان", "سور", "سورة")}
              {r.lemmas > 1 ? `، ${arDigits(r.lemmas)} ألفاظ` : ""}
            </span>
          </button>
        ))}
        {!list.length ? <div className="q2-empty">لا جذر بهذه الحروف.</div> : null}
      </div>
      {list.length > shown ? (
        <button type="button" className="q2-btn is-ghost q2-press" style={{ width: "100%", marginTop: 10 }} onClick={() => setShown((n) => n + STEP * 2)}>
          اعرض المزيد ({arDigits(list.length - shown)})
        </button>
      ) : null}
      <p className="q2-credit">
        الجذور من <a href={MORPHOLOGY_CREDIT.url} target="_blank" rel="noreferrer">{MORPHOLOGY_CREDIT.name}</a>، برخصة <bdi dir="ltr">{MORPHOLOGY_CREDIT.licence}</bdi>.
      </p>
    </main>
  );
}
