import * as React from "react";
import { useNavigate } from "react-router-dom";
import type { Q2Text } from "../data/text";
import type { Q2Meta } from "../data/meta";
import type { AyahHit } from "../data/search";
import { arDigits } from "../data/arabic";

const PAGE = 40;

/** Ayahs found, each with its matching words marked; opens the reader at the ayah. */
export function AyahHits({ hits, text, meta }: { hits: AyahHit[]; text: Q2Text; meta: Q2Meta }) {
  const navigate = useNavigate();
  const [shown, setShown] = React.useState(PAGE);
  return (
    <div>
      <div className="q2-card">
        {hits.slice(0, shown).map((hit) => {
          const ayah = text.surahs[hit.s - 1]?.ayahs[hit.a - 1];
          if (!ayah) return null;
          const marked = new Set(hit.words);
          return (
            <button
              key={`${hit.s}:${hit.a}`}
              type="button"
              className="q2-row q2-press"
              style={{ display: "block" }}
              onClick={() => navigate(`/q2/read/${hit.s}?a=${hit.a}`)}
            >
              <span className="q2-eyebrow">
                {meta.surahs[hit.s - 1]!.name}، {arDigits(hit.a)}
              </span>
              <span style={{ display: "block", fontFamily: "var(--q2-quran)", fontSize: 19, lineHeight: 2.05, marginTop: 2 }}>
                {ayah.words.map((w) => (
                  <React.Fragment key={w.n}>
                    <span style={marked.has(w.n) ? { color: "var(--q2-green)", background: "var(--q2-green-soft)", borderRadius: 6 } : undefined}>{w.text}</span>{" "}
                  </React.Fragment>
                ))}
              </span>
            </button>
          );
        })}
      </div>
      {hits.length > shown ? (
        <button type="button" className="q2-btn is-ghost q2-press" style={{ width: "100%", marginTop: 10 }} onClick={() => setShown((n) => n + PAGE * 2)}>
          اعرض المزيد ({arDigits(hits.length - shown)})
        </button>
      ) : null}
    </div>
  );
}
