/**
 * «القرآن ٢» — one page of «مصحف المدينة»: the King Fahd Complex's page font, the
 * fifteen lines as printed, an ornamented frame, the surah title in a cartouche,
 * the basmala, and the page number in a medallion. Every glyph is touchable (it
 * opens its ayah); the ayah being recited is lit; a chosen ayah is marked.
 */
import * as React from "react";
import { juzOf, pageRange, refFromIndex, type Q2Meta } from "../data/meta";
import { arDigits } from "../data/arabic";
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

export function MadinaPageView({ page, meta, data, family, next, current, selected, onAyah }: {
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
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  useFit(ref, `${page}:${family}`);
  const lines = React.useMemo(() => madinaLines(data, next), [data, next]);
  const [first] = pageRange(meta, page);
  const [s0, a0] = refFromIndex(meta, first);
  const opening = page <= 2;
  const shown = opening ? lines.slice(0, 8) : lines;

  return (
    <article className={`q2-madina${opening ? " is-opening" : ""}`} aria-label={`الصفحة ${page} من مصحف المدينة`} ref={ref}>
      <header className="q2-madina-head">
        <span>سورة {meta.surahs[s0 - 1]!.name}</span>
        <span>الجزء {arDigits(juzOf(meta, s0, a0))}</span>
      </header>
      <div className="q2-madina-lines" style={{ fontFamily: `"${family}"` }}>
        {shown.map((line, i) => {
          if (line.kind === "surah") {
            return (
              <div key={i} className="q2-mline is-surah">
                <span className="q2-cartouche">سورة {meta.surahs[line.s - 1]!.name}</span>
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
      <footer className="q2-madina-foot">
        <span className="q2-madina-num">{arDigits(page)}</span>
      </footer>
    </article>
  );
}
