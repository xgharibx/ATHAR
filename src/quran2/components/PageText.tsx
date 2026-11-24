import * as React from "react";
import type { Q2Meta } from "../data/meta";
import type { Q2Text } from "../data/text";
import { arDigits } from "../data/arabic";
import { pageAyahs } from "../data/pages";

/**
 * A page's text. In test mode each ayah shows only its first word until it is
 * tapped; revealed ayahs are given.
 */
export function PageText({ text, meta, page, test = false, revealed, onReveal }: {
  text: Q2Text;
  meta: Q2Meta;
  page: number;
  test?: boolean;
  revealed?: Set<string>;
  onReveal?: (key: string) => void;
}) {
  const ayahs = React.useMemo(() => pageAyahs(text, meta, page), [text, meta, page]);
  const blocks: React.ReactNode[] = [];
  let run: React.ReactNode[] = [];
  const flush = (key: string) => {
    if (run.length) blocks.push(<p className="q2-text" key={key}>{run}</p>);
    run = [];
  };
  for (const { ayah, surahStart } of ayahs) {
    const key = `${ayah.s}:${ayah.a}`;
    const hidden = test && !revealed?.has(key);
    if (surahStart) {
      flush(`run-${key}`);
      const surah = text.surahs[ayah.s - 1]!;
      blocks.push(
        <div className="q2-surah-head" style={{ marginTop: 10, padding: "10px 12px" }} key={`head-${key}`}>
          <div className="q2-surah-name" style={{ fontSize: 22 }}>سورة {meta.surahs[ayah.s - 1]!.name}</div>
        </div>,
      );
      if (surah.basmala) blocks.push(<div className="q2-basmala" key={`b-${key}`}>{surah.basmala}</div>);
    }
    run.push(
      <span
        key={key}
        className="q2-ayah"
        style={{ cursor: hidden ? "pointer" : undefined }}
        onClick={hidden ? () => onReveal?.(key) : undefined}
        role={hidden ? "button" : undefined}
        aria-label={hidden ? `اكشف الآية ${ayah.a}` : undefined}
      >
        {ayah.before ? <span className="q2-mark">{ayah.before} </span> : null}
        {ayah.words.map((w, i) => (
          <React.Fragment key={w.n}>
            <span className={hidden ? (i === 0 ? "q2-cue" : "q2-hide") : undefined}>{w.text}</span>
            {w.after && !hidden ? <span className="q2-mark"> {w.after}</span> : null}{" "}
          </React.Fragment>
        ))}
        <span className="q2-end">۝{arDigits(ayah.a)}</span>{" "}
      </span>,
    );
  }
  flush("run-end");
  return <div>{blocks}</div>;
}
