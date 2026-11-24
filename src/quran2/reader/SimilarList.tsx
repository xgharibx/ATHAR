import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQ2Meta, useQ2Similar, useQ2Text } from "../hooks";
import { similarTo } from "../data/similar";
import { arDigits } from "../data/arabic";
import { Q2Loading } from "../components/ui";

/**
 * The ayahs that share wording with this one: the shared words in green, and
 * the word where each one parts from it in gold (where memorisers slip).
 */
export function SimilarList({ s, a, onOpen }: { s: number; a: number; onOpen?: () => void }) {
  const navigate = useNavigate();
  const text = useQ2Text();
  const meta = useQ2Meta();
  const index = useQ2Similar();
  const matches = React.useMemo(() => (index.data ? similarTo(index.data, s, a) : []), [index.data, s, a]);

  if (!index.data || !text.data || !meta.data) return <Q2Loading />;
  if (!matches.length) return <p className="q2-small" style={{ padding: "12px 0" }}>لا آية تشاركها ثلاث كلمات متتالية أو أكثر.</p>;

  return (
    <div>
      <p className="q2-small" style={{ lineHeight: 1.8 }}>
        الأخضر ما تشترك فيه مع هذه الآية، والذهبي حيث تفترق عنها: هناك يقع الخلط عند الحفظ.
      </p>
      <div className="q2-card" style={{ marginTop: 8 }}>
        {matches.map((m) => {
          const ayah = text.data!.surahs[m.s - 1]?.ayahs[m.a - 1];
          if (!ayah) return null;
          const end = m.start + m.length - 1;
          return (
            <button
              key={`${m.s}:${m.a}`}
              type="button"
              className="q2-row q2-press"
              style={{ display: "block" }}
              onClick={() => {
                onOpen?.();
                navigate(`/q2/read/${m.s}?a=${m.a}`);
              }}
            >
              <span className="q2-eyebrow">
                {meta.data!.surahs[m.s - 1]!.name}، {arDigits(m.a)}
                {m.identical ? <span className="q2-small"> (مطابقة لها حرفًا حرفًا)</span> : null}
              </span>
              <span style={{ display: "block", fontFamily: "var(--q2-quran)", fontSize: 19, lineHeight: 2.05, marginTop: 2 }}>
                {ayah.words.map((w) => {
                  const shared = w.n >= m.start && w.n <= end;
                  const parts = !m.identical && (w.n === end + 1 || (m.start > 1 && w.n === m.start - 1));
                  const style = shared
                    ? { color: "var(--q2-green)", background: "var(--q2-green-soft)", borderRadius: 6 }
                    : parts
                      ? { color: "var(--q2-gold)", background: "var(--q2-gold-soft)", borderRadius: 6 }
                      : undefined;
                  return (
                    <React.Fragment key={w.n}>
                      <span style={style}>{w.text}</span>{" "}
                    </React.Fragment>
                  );
                })}
              </span>
            </button>
          );
        })}
      </div>
      <p className="q2-credit">مستخرجة على جهازك من نص المصحف: كل آيتين تشتركان في ثلاث كلمات متتالية فأكثر.</p>
    </div>
  );
}
