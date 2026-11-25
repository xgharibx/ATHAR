/**
 * «القرآن ٢» — the printed page: the Madani mushaf's 604 pages, 15 lines each, in
 * two styles: «مصحف المدينة» (the King Fahd Complex's own page fonts, an
 * ornamented frame: reader/MadinaPageView) and «النص المتحقق» (this section's
 * verified Tanzil text placed on the same lines). Two pages side by side on a
 * wide screen held sideways, as in an open mushaf.
 *
 * Turn the page with the arrows, the keyboard or a swipe (towards the right for
 * the next page, as a mushaf opens). Touch an ayah to open it; listen, and the
 * ayah being recited is lit.
 */
import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, Type, Landmark } from "lucide-react";
import { loadMadinaPage, madinaFont } from "../data/madina";
import { MadinaPageView } from "../reader/MadinaPageView";
import { pageAyahs, type PageAyah } from "../data/pages";
import { usePageAudio } from "../hifz/usePageAudio";
import { Q2Sheet } from "../components/ui";
import { AyahSheet } from "../reader/AyahSheet";
import { learnPage } from "../hifz/actions";
import { ayahText } from "../data/text";
import { dayKey, useQ2Meta, useQ2Text } from "../hooks";
import { useQ2Store } from "../store";
import { juzOf, pageOf, pageRange, refFromIndex, type Q2Meta } from "../data/meta";
import type { Q2Text } from "../data/text";
import { loadSurahLines, layPage, type PageLine, type Q2SurahLines } from "../data/lines";
import { arDigits } from "../data/arabic";
import { Q2Error, Q2Loading } from "../components/ui";

const forever = { staleTime: Infinity, gcTime: Infinity, retry: 1 } as const;

function surahsOn(meta: Q2Meta, pages: number[]): number[] {
  const out = new Set<number>();
  for (const p of pages) {
    const [first, last] = pageRange(meta, p);
    out.add(refFromIndex(meta, first)[0]);
    out.add(refFromIndex(meta, last)[0]);
    for (let s = refFromIndex(meta, first)[0]; s <= refFromIndex(meta, last)[0]; s++) out.add(s);
  }
  return [...out].sort((a, b) => a - b);
}

function pageAyahList(text: Q2Text, meta: Q2Meta, page: number) {
  const [first, last] = pageRange(meta, page);
  const out = [];
  for (let i = first; i <= last; i++) {
    const [s, a] = refFromIndex(meta, i);
    const ayah = text.surahs[s - 1]!.ayahs[a - 1]!;
    out.push({ s, a, index: i, words: ayah.words, before: ayah.before });
  }
  return out;
}

/** The surah that begins on the page after `page`, and the line its text starts on. */
function nextSurahStart(meta: Q2Meta, page: number, lineMap: Map<number, Q2SurahLines>): { s: number; line: number } | null {
  if (page >= 604) return null;
  const [s, a] = refFromIndex(meta, pageRange(meta, page + 1)[0]);
  if (a !== 1) return null;
  const line = lineMap.get(s)?.[0]?.[0];
  return line ? { s, line } : null;
}

/** Shrink any line wider than the page so every line stays whole, as printed. */
function useFitLines(ref: React.RefObject<HTMLElement | null>, key: string) {
  React.useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const fit = () => {
      root.querySelectorAll<HTMLElement>(".q2-line.is-words").forEach((line) => {
        line.style.fontSize = "";
        const room = line.clientWidth;
        let natural = 0;
        for (const child of Array.from(line.children) as HTMLElement[]) natural += child.offsetWidth;
        const need = natural + (line.children.length - 1) * 2;
        if (need > room && room > 0) line.style.fontSize = `${(parseFloat(getComputedStyle(line).fontSize) * room) / need}px`;
      });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(root);
    void document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [ref, key]);
}

function PageView({ page, lines, meta, onAyah, current }: { page: number; lines: PageLine[] | null; meta: Q2Meta; onAyah: (s: number, a: number) => void; current: string | null }) {
  const ref = React.useRef<HTMLDivElement>(null);
  useFitLines(ref, `${page}:${lines ? "y" : "n"}`);
  const [first] = pageRange(meta, page);
  const [s0, a0] = refFromIndex(meta, first);
  const opening = page <= 2;
  const shown = lines && opening ? lines.filter((l, i) => l.kind !== "blank" || i < 8) : lines;
  return (
    <article className={`q2-page${opening ? " is-opening" : ""}`} aria-label={`الصفحة ${page}`} ref={ref}>
      <header className="q2-page-head">
        <span>سورة {meta.surahs[s0 - 1]!.name}</span>
        <span>الجزء {arDigits(juzOf(meta, s0, a0))}</span>
      </header>
      {shown ? (
        <div className="q2-page-lines">
          {shown.map((line, i) => {
            if (line.kind === "surah") return <div key={i} className="q2-line is-surah"><span>سورة {meta.surahs[line.s - 1]!.name}</span></div>;
            if (line.kind === "basmala") return <div key={i} className="q2-line is-basmala">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</div>;
            if (line.kind === "blank") return <div key={i} className="q2-line" aria-hidden="true" />;
            return (
              <div key={i} className="q2-line is-words">
                {line.words.map((w) => (
                  <span key={`${w.s}:${w.a}:${w.n}`} className={`q2-pw${current === `${w.s}:${w.a}` ? " is-now" : ""}`} data-ayah={`${w.s}:${w.a}`} onClick={() => onAyah(w.s, w.a)}>
                    {w.before ? <span className="q2-mark">{w.before} </span> : null}
                    {w.text}
                    {w.after ? <span className="q2-mark"> {w.after}</span> : null}
                    {w.end ? <span className="q2-end"> ۝{arDigits(w.a)}</span> : null}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="q2-small" style={{ textAlign: "center", padding: 24 }}>لم تكتمل بيانات أسطر هذه الصفحة؛ افتحها في المصحف المرتّل.</p>
      )}
      <footer className="q2-page-foot">{arDigits(page)}</footer>
    </article>
  );
}

export default function Q2MushafPage() {
  const navigate = useNavigate();
  const params = useParams();
  const text = useQ2Text();
  const meta = useQ2Meta();
  const setLastRead = useQ2Store((s) => s.setLastRead);
  const markRead = useQ2Store((s) => s.markRead);
  const lastRead = useQ2Store((s) => s.lastRead);
  const pageStyle = useQ2Store((s) => s.prefs.pageStyle);
  const reciter = useQ2Store((s) => s.prefs.reciter);
  const hifz = useQ2Store((s) => s.hifz);
  const setPrefs = useQ2Store((s) => s.setPrefs);
  const [picked, setPicked] = React.useState<{ s: number; a: number } | null>(null);
  // Without a page number: the page where you stopped.
  const fallback = lastRead && meta.data ? pageOf(meta.data, lastRead.s, lastRead.a) : 1;
  const page = Math.min(604, Math.max(1, Number(params.page) || fallback));
  const [wide, setWide] = React.useState(() => typeof matchMedia !== "undefined" && matchMedia("(min-width: 900px) and (orientation: landscape)").matches);
  React.useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const mq = matchMedia("(min-width: 900px) and (orientation: landscape)");
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  // An open mushaf: the odd page on the right, the even page on the left.
  const right = wide ? (page % 2 ? page : page - 1) : page;
  const second = wide ? Math.min(604, right + 1) : right;
  const shown = React.useMemo(() => (second !== right ? [right, second] : [right]), [right, second]);
  const step = wide ? 2 : 1;

  // The next page too: a surah beginning there may put its title at the foot of this one.
  const surahs = React.useMemo(
    () => (meta.data ? surahsOn(meta.data, shown[shown.length - 1]! < 604 ? [...shown, shown[shown.length - 1]! + 1] : shown) : []),
    [meta.data, shown],
  );
  const lineQueries = useQueries({
    queries: surahs.map((s) => ({
      queryKey: ["q2", "lines", s],
      queryFn: () => loadSurahLines(s, text.data!.surahs[s - 1]!.ayahs.map((a) => a.words.length)),
      enabled: Boolean(text.data),
      ...forever,
    })),
  });
  const lineMap = new Map<number, Q2SurahLines>();
  lineQueries.forEach((q, i) => q.data && lineMap.set(surahs[i]!, q.data));
  // «مصحف المدينة»: each page's glyphs and its own font.
  const madina = pageStyle === "madina";
  const wordCount = React.useCallback((s: number, a: number) => text.data?.surahs[s - 1]?.ayahs[a - 1]?.words.length, [text.data]);
  const madinaQueries = useQueries({
    queries: shown.map((p) => ({ queryKey: ["q2", "madina", p], queryFn: () => loadMadinaPage(p, wordCount), enabled: madina && Boolean(text.data), ...forever })),
  });
  const fontQueries = useQueries({
    queries: shown.map((p) => ({ queryKey: ["q2", "madina-font", p], queryFn: () => madinaFont(p), enabled: madina, ...forever })),
  });
  const loading = lineQueries.some((q) => q.isLoading) || (madina && (madinaQueries.some((q) => q.isLoading) || fontQueries.some((q) => q.isLoading)));
  const failed = lineQueries.some((q) => q.isError) || (madina && (madinaQueries.some((q) => q.isError) || fontQueries.some((q) => q.isError)));

  // Listening to the page(s): the ayah being recited is lit.
  const ayahsShown = React.useMemo<PageAyah[]>(() => (text.data && meta.data ? shown.flatMap((p) => pageAyahs(text.data!, meta.data!, p)) : []), [text.data, meta.data, shown]);
  const audio = usePageAudio(ayahsShown, reciter, 3, true);

  const go = React.useCallback((p: number) => navigate(`/q2/page/${Math.min(604, Math.max(1, p))}`, { replace: true }), [navigate]);

  // Keyboard: the left arrow turns to the next page, as the mushaf opens.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(right + step);
      if (e.key === "ArrowRight") go(right - step);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, right, step]);

  // Where you stopped, and the khatma: a page counts once it stayed open for
  // about the time it takes to read (a quarter second a word, 10 to 90 seconds).
  React.useEffect(() => {
    if (!meta.data || !text.data) return;
    const m = meta.data;
    const [first] = pageRange(m, shown[0]!);
    const [fs, fa] = refFromIndex(m, first);
    setLastRead(fs, fa);
    const indexes: number[] = [];
    let words = 0;
    for (const p of shown) {
      const [a, b] = pageRange(m, p);
      for (let i = a; i <= b; i++) {
        indexes.push(i);
        const [s, ay] = refFromIndex(m, i);
        words += text.data.surahs[s - 1]!.ayahs[ay - 1]!.words.length;
      }
    }
    const need = Math.min(90_000, Math.max(10_000, words * 250));
    let seen = 0;
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      seen += 1000;
      if (seen >= need) {
        markRead(indexes, dayKey());
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [meta.data, text.data, shown, setLastRead, markRead]);

  const touch = React.useRef<{ x: number; y: number } | null>(null);

  if (text.isError || meta.isError) return <Q2Error label="تعذّر تحميل المصحف." />;
  if (!text.data || !meta.data) return <Q2Loading />;
  const m = meta.data;
  const t = text.data;

  return (
    <div
      className="q2-mushaf"
      onTouchStart={(e) => (touch.current = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY })}
      onTouchEnd={(e) => {
        const start = touch.current;
        touch.current = null;
        if (!start) return;
        const dx = e.changedTouches[0]!.clientX - start.x;
        const dy = e.changedTouches[0]!.clientY - start.y;
        if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
        go(dx > 0 ? right + step : right - step);
      }}
    >
      <header className="q2-top">
        <button type="button" className="q2-icon-btn q2-press" onClick={() => navigate(-1)} aria-label="رجوع">
          <ArrowRight size={20} aria-hidden="true" />
        </button>
        <button type="button" className="q2-icon-btn q2-press" disabled={right <= 1} onClick={() => go(right - step)} aria-label="الصفحة السابقة">
          <ChevronRight size={20} aria-hidden="true" />
        </button>
        <div className="q2-top-title">
          {wide && shown.length > 1 ? `الصفحتان ${arDigits(shown[0]!)} و${arDigits(shown[1]!)}` : `الصفحة ${arDigits(page)}`}
        </div>
        <button type="button" className="q2-icon-btn q2-press" disabled={right + step > 604} onClick={() => go(right + step)} aria-label="الصفحة التالية">
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <button type="button" className="q2-icon-btn q2-press" disabled={!audio.ready} onClick={audio.toggle} aria-label={audio.playing ? "أوقف التلاوة" : "استمع إلى الصفحة"}>
          {audio.playing ? <Pause size={19} aria-hidden="true" /> : <Play size={19} aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="q2-icon-btn q2-press"
          onClick={() => setPrefs({ pageStyle: madina ? "tanzil" : "madina" })}
          aria-label={madina ? "اعرض النص المتحقق" : "اعرض مصحف المدينة"}
          title={madina ? "النص المتحقق" : "مصحف المدينة"}
        >
          {madina ? <Type size={19} aria-hidden="true" /> : <Landmark size={19} aria-hidden="true" />}
        </button>
      </header>

      {failed ? <Q2Error label="تعذّر تحميل أسطر الصفحة. تحقق من الاتصال." onRetry={() => lineQueries.forEach((q) => void q.refetch())} /> : null}
      {loading ? <Q2Loading label="تُرتَّب الصفحة كما في المصحف المطبوع…" /> : null}
      {!loading && !failed ? (
        <div className={`q2-spread${shown.length > 1 ? " is-two" : ""}`}>
          {shown.map((p, i) =>
            madina && madinaQueries[i]?.data && fontQueries[i]?.data ? (
              <MadinaPageView
                key={p}
                page={p}
                meta={m}
                data={madinaQueries[i]!.data!}
                family={fontQueries[i]!.data!}
                next={nextSurahStart(m, p, lineMap)}
                current={audio.current}
                selected={picked ? `${picked.s}:${picked.a}` : null}
                onAyah={(s, a) => setPicked({ s, a })}
              />
            ) : (
              <PageView
                key={p}
                page={p}
                meta={m}
                current={audio.current}
                lines={layPage(pageAyahList(t, m, p), (s, a) => lineMap.get(s)?.[a - 1] ?? null, nextSurahStart(m, p, lineMap))}
                onAyah={(s, a) => setPicked({ s, a })}
              />
            ),
          )}
        </div>
      ) : null}
      <p className="q2-credit" style={{ paddingBottom: "calc(var(--q2-bottom) + 16px)" }}>
        {madina
          ? "خط مصحف المدينة: خطوط مجمع الملك فهد لطباعة المصحف الشريف لكل صفحة، عبر Quran.com؛ كل كلمة مرتبطة بكلمتها من النص المتحقق. المس آية لتفتحها."
          : "نص مشروع تنزيل دون تعديل، مرتّبًا على أسطر مصحف المدينة عبر Quran.com. المس آية لتفتحها."}
      </p>
      <Q2Sheet open={Boolean(picked)} onClose={() => setPicked(null)} label="الآية">
        {picked ? (
          <AyahSheet
            s={picked.s}
            a={picked.a}
            text={ayahText(t.surahs[picked.s - 1]!.ayahs[picked.a - 1]!)}
            surahName={`سورة ${m.surahs[picked.s - 1]!.name}`}
            page={pageOf(m, picked.s, picked.a)}
            inHifz={Boolean(hifz[pageOf(m, picked.s, picked.a)])}
            canPlay
            onPlay={() => navigate(`/q2/read/${picked.s}?a=${picked.a}`)}
            onLastRead={() => setLastRead(picked.s, picked.a)}
            onHifz={() => learnPage(pageOf(m, picked.s, picked.a))}
          />
        ) : null}
      </Q2Sheet>
    </div>
  );
}
