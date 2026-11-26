/**
 * One page of «مصحف المدينة», laid out like the printed page: the juz' named
 * in words at the top right and the surah at the top left, above the frame;
 * the frame of green rules around a band of vine, leaves and flowers; the
 * fifteen lines in the King Fahd Complex's page font (plain, or with the
 * tajweed colours); the surah titles in their cartouche; the hizb marks in the
 * margin; and the page number under the frame. Every glyph is touchable (it
 * opens its ayah); the ayah being recited is lit; a chosen ayah is marked.
 */
import * as React from "react";
import { hizbQuarterOf, juzOf, pageRange, refFromIndex, type Q2Meta } from "../data/meta";
import { arDigits } from "../data/arabic";
import { juzName, quarterLabel } from "../data/divisions";
import { madinaLines, type MadinaPage } from "../data/madina";

/** Shrink a line wider than the page, so every line stays whole. */
function useFit(ref: React.RefObject<HTMLElement | null>, key: string) {
  React.useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const fit = () => {
      root.querySelectorAll<HTMLElement>(".q2-mline.is-glyphs").forEach((line) => {
        line.style.fontSize = "";
        const room = line.clientWidth;
        let natural = 0;
        for (const child of Array.from(line.children) as HTMLElement[]) natural += child.offsetWidth;
        if (natural > room && room > 0) line.style.fontSize = `${(parseFloat(getComputedStyle(line).fontSize) * room) / natural}px`;
      });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(root);
    void document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [ref, key]);
}

export function MadinaPageView({ page, meta, data, family, next, current, selected, onAyah, side }: {
  page: number;
  meta: Q2Meta;
  data: MadinaPage;
  family: string;
  next: { s: number; line: number } | null;
  /** The ayah being recited ("s:a"). */
  current: string | null;
  /** The ayah opened ("s:a"). */
  selected: string | null;
  onAyah: (s: number, a: number) => void;
  /** The page's outer edge, where its margin marks go (right for odd pages, as the mushaf opens). */
  side?: "right" | "left";
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  useFit(ref, `${page}:${family}`);
  const lines = React.useMemo(() => madinaLines(data, next), [data, next]);
  const [first, last] = pageRange(meta, page);
  const [s0, a0] = refFromIndex(meta, first);
  const [s1, a1] = refFromIndex(meta, last);
  const opening = page <= 2;
  const shown = opening ? lines.slice(0, 8) : lines;
  const outer = side ?? (page % 2 ? "right" : "left");

  // The hizb quarters that begin on this page, at the line of their first word.
  const marks = React.useMemo(() => {
    const out: Array<{ line: number; label: string }> = [];
    const qFirst = hizbQuarterOf(meta, s0, a0);
    const qLast = hizbQuarterOf(meta, s1, a1);
    for (let q = qFirst; q <= qLast; q++) {
      const [qs, qa] = meta.hizbQuarters[q - 1]!;
      const glyph = data.glyphs.find((g) => g.s === qs && g.a === qa && g.n <= 1);
      if (!glyph) continue;
      out.push({ line: glyph.line, label: quarterLabel(q) });
    }
    return out;
  }, [meta, data.glyphs, s0, a0, s1, a1]);

  const headSurah = meta.surahs[s0 - 1]!.name;

  return (
    <article className={`q2-madina${opening ? " is-opening" : ""} is-${outer}`} aria-label={`الصفحة ${page} من مصحف المدينة`} ref={ref}>
      <header className="q2-madina-head">
        <span>{juzName(juzOf(meta, s0, a0))}</span>
        <span>سورة {headSurah}</span>
      </header>
      <div className="q2-mframe">
        <div className="q2-madina-lines" style={{ fontFamily: `"${family}"` }}>
          {shown.map((line, i) => {
            if (line.kind === "surah") {
              return (
                <div key={i} className="q2-mline is-surah">
                  <span className="q2-cartouche">
                    <i aria-hidden="true" />
                    <b>سورة {meta.surahs[line.s - 1]!.name}</b>
                    <i aria-hidden="true" />
                  </span>
                </div>
              );
            }
            if (line.kind === "basmala") return <div key={i} className="q2-mline is-basmala">بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ</div>;
            if (line.kind === "blank") return <div key={i} className="q2-mline" aria-hidden="true" />;
            return (
              <div key={i} className="q2-mline is-glyphs">
                {line.glyphs.map((g, j) => {
                  const key = `${g.s}:${g.a}`;
                  const cls = ["q2-glyph", g.n === 0 ? "is-end" : "", current === key ? "is-now" : "", selected === key ? "is-sel" : ""].join(" ");
                  return (
                    <span key={j} className={cls} data-ayah={key} onClick={() => onAyah(g.s, g.a)}>
                      {g.code}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
        {!opening
          ? marks.map((m) => (
              <span key={m.label} className="q2-hizb" style={{ top: `${((m.line - 0.5) / 15) * 100}%` }} title={m.label}>
                <span>{m.label}</span>
              </span>
            ))
          : null}
      </div>
      <footer className="q2-madina-foot">
        <span className="q2-madina-num">{arDigits(page)}</span>
      </footer>
    </article>
  );
}
