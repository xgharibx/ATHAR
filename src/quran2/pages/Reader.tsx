import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Loader2, Minus, Pause, Play, Plus, Repeat, Settings2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useQ2Meta, useQ2Text, useQ2Timing } from "../hooks";
import { useQ2Store } from "../store";
import { pageOf, surahPages } from "../data/meta";
import { arDigits } from "../data/arabic";
import { ayahText, type Q2Surah } from "../data/text";
import { Q2_RECITERS } from "../data/timings";
import { Q2Error, Q2Loading, Q2Sheet } from "../components/ui";
import { useQ2Player, type RepeatMode } from "../reader/usePlayer";
import { WordLens } from "../reader/WordLens";
import { AyahSheet } from "../reader/AyahSheet";
import { learnPage } from "../hifz/actions";

const RATES = [0.75, 1, 1.25, 1.5];
const REPEATS: Array<{ mode: RepeatMode; label: string }> = [
  { mode: 0, label: "دون تكرار" },
  { mode: 3, label: "كرّر الآية ٣ مرات" },
  { mode: -1, label: "كرّر الآية" },
];

/** The surah's text as one flow, cut by the mushaf's pages. Memoised: it never re-renders while playing. */
const SurahText = React.memo(function SurahText({ surah, pages, onWord, onAyah }: {
  surah: Q2Surah;
  pages: number[];
  onWord: (a: number, w: number) => void;
  onAyah: (a: number) => void;
}) {
  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-w],[data-end]");
    if (!el) return;
    const a = Number(el.dataset.a);
    if (el.dataset.end) onAyah(a);
    else onWord(a, Number(el.dataset.w));
  };
  const blocks: React.ReactNode[] = [];
  let current: React.ReactNode[] = [];
  let page = pages[0];
  const flush = (key: string) => {
    if (current.length) blocks.push(<p className="q2-text" key={key}>{current}</p>);
    current = [];
  };
  surah.ayahs.forEach((ayah, i) => {
    const p = pages[i];
    if (i > 0 && p !== page) {
      flush(`t${i}`);
      blocks.push(<div className="q2-page-mark" key={`p${p}`}>الصفحة {arDigits(p!)}</div>);
      page = p;
    }
    current.push(
      <span className="q2-ayah" id={`q2-a${ayah.a}`} data-ayah={ayah.a} key={ayah.a}>
        {ayah.before ? <span className="q2-mark">{ayah.before} </span> : null}
        {ayah.words.map((w) => (
          <React.Fragment key={w.n}>
            <span className="q2-w" data-a={ayah.a} data-w={w.n} id={`q2-w${ayah.a}-${w.n}`}>{w.text}</span>
            {w.after ? <span className="q2-mark"> {w.after}</span> : null}{" "}
          </React.Fragment>
        ))}
        <span className="q2-end" data-a={ayah.a} data-end="1" role="button" tabIndex={0} aria-label={`الآية ${ayah.a}`}>
          ۝{arDigits(ayah.a)}
        </span>{" "}
      </span>,
    );
  });
  flush("t-end");
  return <div onClick={onClick}>{blocks}</div>;
});

export default function Q2Reader() {
  const navigate = useNavigate();
  const params = useParams();
  const [search] = useSearchParams();
  const s = Math.min(114, Math.max(1, Number(params.surah) || 1));
  const target = Number(search.get("a")) || null;
  const text = useQ2Text();
  const meta = useQ2Meta();
  const prefs = useQ2Store((st) => st.prefs);
  const setPrefs = useQ2Store((st) => st.setPrefs);
  const setLastRead = useQ2Store((st) => st.setLastRead);
  const hifz = useQ2Store((st) => st.hifz);
  const timing = useQ2Timing(prefs.reciter, s);
  const reciter = Q2_RECITERS.find((r) => r.id === prefs.reciter) ?? Q2_RECITERS[0]!;
  const [picked, setPicked] = React.useState<{ a: number; w: number } | null>(null);
  const [ayahOpen, setAyahOpen] = React.useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const surah = text.data?.surahs[s - 1];
  const info = meta.data?.surahs[s - 1];
  const pages = React.useMemo(() => (meta.data && surah ? surah.ayahs.map((ay) => pageOf(meta.data!, s, ay.a)) : []), [meta.data, surah, s]);
  const followRef = React.useRef(prefs.follow);
  React.useLayoutEffect(() => {
    followRef.current = prefs.follow;
  }, [prefs.follow]);

  const highlight = React.useRef<{ ayah: HTMLElement | null; word: HTMLElement | null }>({ ayah: null, word: null });
  const onWord = React.useCallback((a: number | null, w: number | null) => {
    const h = highlight.current;
    const ayahEl = a != null ? document.getElementById(`q2-a${a}`) : null;
    if (h.ayah !== ayahEl) {
      h.ayah?.classList.remove("is-now");
      ayahEl?.classList.add("is-now");
      h.ayah = ayahEl;
    }
    const wordEl = a != null && w != null ? document.getElementById(`q2-w${a}-${w}`) : null;
    if (h.word !== wordEl) {
      h.word?.classList.remove("is-now");
      wordEl?.classList.add("is-now");
      h.word = wordEl;
      if (wordEl && followRef.current) {
        const r = wordEl.getBoundingClientRect();
        if (r.top < 90 || r.bottom > window.innerHeight - 150) wordEl.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  }, []);

  const player = useQ2Player({
    timing: timing.data,
    title: info ? `سورة ${info.name}` : "القرآن",
    artist: reciter.name,
    onWord,
  });

  // Open at the ayah asked for, and mark it.
  React.useEffect(() => {
    if (!surah || !target) return;
    const el = document.getElementById(`q2-a${target}`);
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.classList.add("is-target");
    const id = window.setTimeout(() => el.classList.remove("is-target"), 2600);
    return () => window.clearTimeout(id);
  }, [surah, target]);

  // Remember where you stopped: the first ayah at the top of the screen.
  React.useEffect(() => {
    if (!surah) return;
    let raf = 0;
    const record = () => {
      const els = document.querySelectorAll<HTMLElement>(".q2-ayah");
      for (const el of els) {
        if (el.getBoundingClientRect().bottom > 80) {
          setLastRead(s, Number(el.dataset.ayah));
          break;
        }
      }
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(record);
    };
    record();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [surah, s, setLastRead]);

  // The picked word stays marked while its lens is open.
  React.useEffect(() => {
    if (!picked) return;
    const el = document.getElementById(`q2-w${picked.a}-${picked.w}`);
    el?.classList.add("is-picked");
    return () => el?.classList.remove("is-picked");
  }, [picked]);

  const onPickWord = React.useCallback((a: number, w: number) => setPicked({ a, w }), []);
  const onPickAyah = React.useCallback((a: number) => setAyahOpen(a), []);

  if (text.isError || meta.isError) return <Q2Error label="تعذّر تحميل نص القرآن." onRetry={() => { void text.refetch(); void meta.refetch(); }} />;
  if (!surah || !info || !meta.data) return <Q2Loading />;

  const [firstPage, lastPage] = surahPages(meta.data, s);
  const pickedWord = picked ? surah.ayahs[picked.a - 1]?.words[picked.w - 1] : undefined;
  const openAyah = ayahOpen ? surah.ayahs[ayahOpen - 1] : undefined;
  const canPlay = Boolean(timing.data);
  const repeat = REPEATS.find((r) => r.mode === player.view.repeat)!;

  return (
    <div style={{ "--q2-scale": prefs.scale } as React.CSSProperties}>
      <header className="q2-top">
        <button type="button" className="q2-icon-btn q2-press" onClick={() => navigate(-1)} aria-label="رجوع">
          <ArrowRight size={20} aria-hidden="true" />
        </button>
        <button type="button" className="q2-icon-btn q2-press" disabled={s >= 114} onClick={() => navigate(`/q2/read/${s + 1}`, { replace: true })} aria-label="السورة التالية">
          <ChevronRight size={20} aria-hidden="true" />
        </button>
        <div className="q2-top-title">سورة {info.name}</div>
        <button type="button" className="q2-icon-btn q2-press" disabled={s <= 1} onClick={() => navigate(`/q2/read/${s - 1}`, { replace: true })} aria-label="السورة السابقة">
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <button type="button" className="q2-icon-btn q2-press" onClick={() => setSettingsOpen(true)} aria-label="إعدادات القراءة">
          <Settings2 size={19} aria-hidden="true" />
        </button>
      </header>

      <main className="q2-main" style={{ paddingBottom: "calc(var(--q2-bottom) + 130px)" }}>
        <div className="q2-surah-head">
          <div className="q2-surah-name">سورة {info.name}</div>
          <div className="q2-surah-meta">
            {info.type === "meccan" ? "مكية" : "مدنية"} · {arDigits(info.ayahs)} آية · ترتيبها في النزول {arDigits(info.order)} · الصفحات {arDigits(firstPage)}–{arDigits(lastPage)}
          </div>
        </div>
        {surah.basmala ? <div className="q2-basmala">{surah.basmala}</div> : null}
        <SurahText surah={surah} pages={pages} onWord={onPickWord} onAyah={onPickAyah} />
        <p className="q2-credit">
          نص المصحف: <a href="https://tanzil.net" target="_blank" rel="noreferrer">مشروع تنزيل</a> (الرسم العثماني، الإصدار ١٫١)، دون أي تعديل.
        </p>
      </main>

      <div className="q2-player">
        <div className="q2-progress" aria-hidden="true"><span style={{ width: `${Math.round(player.progress * 1000) / 10}%` }} /></div>
        <div className="q2-player-row">
          <button type="button" className="q2-play q2-press" onClick={player.toggle} disabled={!canPlay} aria-label={player.view.playing ? "إيقاف مؤقت" : "تشغيل"}>
            {player.view.waiting || (timing.isLoading && !canPlay) ? (
              <Loader2 size={22} className="animate-spin" aria-hidden="true" />
            ) : player.view.playing ? (
              <Pause size={22} aria-hidden="true" />
            ) : (
              <Play size={22} aria-hidden="true" />
            )}
          </button>
          <button type="button" className="q2-player-who" onClick={() => setSettingsOpen(true)}>
            <b>{reciter.name}</b>
            <span>
              {timing.isError || player.view.error
                ? "تعذّر تشغيل التلاوة — تحقق من الاتصال"
                : player.view.ayah
                  ? `الآية ${arDigits(player.view.ayah)} · ${reciter.style}`
                  : `${reciter.style} · تتبّع الكلمات`}
            </span>
          </button>
          <button type="button" className="q2-icon-btn q2-press" onClick={() => player.step(-1)} disabled={!canPlay} aria-label="الآية السابقة">
            <ChevronRight size={20} aria-hidden="true" />
          </button>
          <button type="button" className="q2-icon-btn q2-press" onClick={() => player.step(1)} disabled={!canPlay} aria-label="الآية التالية">
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="q2-icon-btn q2-press"
            onClick={() => player.setRepeat(REPEATS[(REPEATS.indexOf(repeat) + 1) % REPEATS.length]!.mode)}
            aria-label={repeat.label}
            title={repeat.label}
            style={player.view.repeat ? { color: "var(--q2-green)", background: "var(--q2-green-soft)" } : undefined}
          >
            <Repeat size={18} aria-hidden="true" />
            {player.view.repeat === 3 ? <span style={{ position: "absolute", fontSize: 9, fontWeight: 800, marginTop: 22 }}>٣</span> : null}
          </button>
          <button
            type="button"
            className="q2-chip q2-press"
            style={{ minHeight: 34, padding: "0 10px" }}
            onClick={() => player.setRate(RATES[(RATES.indexOf(player.view.rate) + 1) % RATES.length]!)}
            aria-label="سرعة التلاوة"
          >
            {arDigits(player.view.rate)}×
          </button>
        </div>
      </div>

      <Q2Sheet open={Boolean(picked && pickedWord)} onClose={() => setPicked(null)} label="الكلمة">
        {picked && pickedWord ? (
          <WordLens
            s={s}
            a={picked.a}
            w={picked.w}
            text={pickedWord.text}
            surahName={`سورة ${info.name}`}
            canHear={canPlay}
            onHear={() => {
              if (!player.playWord(picked.a, picked.w)) toast("لا توقيت لهذه الكلمة عند هذا القارئ");
            }}
          />
        ) : null}
      </Q2Sheet>

      <Q2Sheet open={Boolean(openAyah)} onClose={() => setAyahOpen(null)} label="الآية">
        {openAyah ? (
          <AyahSheet
            s={s}
            a={openAyah.a}
            text={ayahText(openAyah)}
            surahName={`سورة ${info.name}`}
            page={pages[openAyah.a - 1]!}
            inHifz={Boolean(hifz[pages[openAyah.a - 1]!])}
            canPlay={canPlay}
            onPlay={() => {
              player.playFrom(openAyah.a);
              setAyahOpen(null);
            }}
            onLastRead={() => {
              setLastRead(s, openAyah.a);
              toast.success(`حُفظ موضعك: الآية ${arDigits(openAyah.a)}`);
            }}
            onHifz={() => {
              const page = pages[openAyah.a - 1]!;
              if (hifz[page]) {
                navigate(`/q2/hifz?page=${page}`);
                return;
              }
              learnPage(page);
              toast.success(`أُضيفت الصفحة ${arDigits(page)} إلى حفظك`);
            }}
          />
        ) : null}
      </Q2Sheet>

      <Q2Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} label="إعدادات القراءة">
        <h3 className="q2-h2">القراءة</h3>
        <div className="q2-head" style={{ marginTop: 14 }}>
          <span>حجم الخط</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button type="button" className="q2-icon-btn q2-press" aria-label="أصغر" onClick={() => setPrefs({ scale: Math.max(0.8, Math.round((prefs.scale - 0.1) * 10) / 10) })}>
              <Minus size={18} aria-hidden="true" />
            </button>
            <b style={{ minWidth: 44, textAlign: "center" }}>{arDigits(Math.round(prefs.scale * 100))}٪</b>
            <button type="button" className="q2-icon-btn q2-press" aria-label="أكبر" onClick={() => setPrefs({ scale: Math.min(1.6, Math.round((prefs.scale + 0.1) * 10) / 10) })}>
              <Plus size={18} aria-hidden="true" />
            </button>
          </span>
        </div>
        <div className="q2-chips" style={{ marginTop: 6 }}>
          <button type="button" className={`q2-chip${prefs.follow ? " is-on" : ""}`} onClick={() => setPrefs({ follow: !prefs.follow })} aria-pressed={prefs.follow}>
            تتبّع القارئ على الشاشة
          </button>
          <button type="button" className="q2-chip" onClick={() => setPrefs({ palette: prefs.palette === "night" ? "paper" : "night" })}>
            {prefs.palette === "night" ? "لون الورق" : "لون الليل"}
          </button>
        </div>
        <h3 className="q2-h2" style={{ marginTop: 22 }}>القارئ</h3>
        <p className="q2-small">تلاوات مضبوطة كلمةً كلمة: يتلوّن ما يُتلى الآن.</p>
        <div className="q2-card" style={{ marginTop: 10 }}>
          {Q2_RECITERS.map((r) => (
            <button
              key={r.id}
              type="button"
              className="q2-row"
              aria-pressed={r.id === prefs.reciter}
              onClick={() => {
                player.pause();
                setPrefs({ reciter: r.id });
              }}
            >
              <span style={{ flex: 1 }}>
                <b style={{ display: "block", fontSize: 14.5 }}>{r.name}</b>
                <span className="q2-small">{r.style}</span>
              </span>
              {r.id === prefs.reciter ? <span className="q2-eyebrow">المختار</span> : null}
            </button>
          ))}
        </div>
      </Q2Sheet>
    </div>
  );
}
