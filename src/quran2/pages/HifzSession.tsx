import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, GraduationCap, Headphones, Mic, MicOff, Pause, Repeat, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { useQ2Meta, useQ2Text } from "../hooks";
import { useQ2Store } from "../store";
import { useHifzToday } from "../hifz/useHifzToday";
import { preview, type Grade } from "../hifz/fsrs";
import { learnPage, revisePage } from "../hifz/actions";
import { usePageAudio } from "../hifz/usePageAudio";
import { createReciteTracker, type ReciteTracker } from "../hifz/recite";
import { speechAvailable, startSpeechStream } from "@/lib/voiceTasbeeh";
import { arCount, arDigits } from "../data/arabic";
import { PageText } from "../components/PageText";
import { pageAyahs, pageLabel } from "../data/pages";
import { Q2Loading } from "../components/ui";

type Item = { page: number; kind: "new" | "near" | "far" };

const KIND: Record<Item["kind"], string> = { new: "حفظ جديد", near: "مراجعة القريب", far: "مراجعة البعيد" };
const GRADES: Array<{ g: Grade; label: string }> = [
  { g: 1, label: "نسيتها" },
  { g: 2, label: "بصعوبة" },
  { g: 3, label: "جيد" },
  { g: 4, label: "متقنة" },
];

function inDays(days: number): string {
  if (days <= 1) return "غدًا";
  return `بعد ${arCount(days, "يوم", "يومين", "أيام", "يومًا")}`;
}

export default function Q2HifzSession() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const text = useQ2Text();
  const meta = useQ2Meta();
  const reciter = useQ2Store((s) => s.prefs.reciter);
  const talqeenTimes = useQ2Store((s) => s.prefs.talqeenTimes);
  const setPrefs = useQ2Store((s) => s.setPrefs);
  const hifz = useQ2Store((s) => s.hifz);
  const today = useHifzToday();

  // The queue is fixed when the session starts, so grading a page does not reshuffle it.
  const [queue] = React.useState<Item[]>(() => {
    const asked = params.get("pages");
    if (asked) {
      return asked.split(",").map(Number).filter((p) => p >= 1 && p <= 604).map((page) => ({ page, kind: hifz[page] ? "far" : "new" }));
    }
    const { newPages, near, far } = today.plan;
    return [
      ...newPages.map((page) => ({ page, kind: "new" as const })),
      ...near.map((page) => ({ page, kind: "near" as const })),
      ...far.map((page) => ({ page, kind: "far" as const })),
    ];
  });
  const [index, setIndex] = React.useState(0);
  const [revealed, setRevealed] = React.useState<Set<string>>(new Set());
  const [done, setDone] = React.useState<Array<{ page: number; grade: Grade | "learned" }>>([]);
  const item = queue[index];
  const ayahs = React.useMemo(() => (text.data && meta.data && item ? pageAyahs(text.data, meta.data, item.page) : []), [text.data, meta.data, item]);
  const audio = usePageAudio(ayahs, reciter, talqeenTimes);

  // Reciting from memory: the speech recogniser follows the page word by word.
  const [canListen, setCanListen] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [marks, setMarks] = React.useState<Map<string, "ok" | "missed">>(new Map());
  const [suggested, setSuggested] = React.useState<{ grade: Grade; said: number; total: number } | null>(null);
  const tracker = React.useRef<ReciteTracker | null>(null);
  const stopListening = React.useRef<(() => void) | null>(null);
  const wordKeys = React.useMemo(() => ayahs.flatMap(({ ayah }) => ayah.words.map((w) => `${ayah.s}:${ayah.a}:${w.n}`)), [ayahs]);
  React.useEffect(() => {
    void speechAvailable().then(setCanListen, () => setCanListen(false));
  }, []);
  React.useEffect(() => () => stopListening.current?.(), []);

  const finishListening = React.useCallback(() => {
    stopListening.current?.();
    stopListening.current = null;
    setListening(false);
    const t = tracker.current;
    if (t) {
      const sum = t.summary();
      setSuggested({ grade: sum.grade, said: sum.said, total: sum.total });
      // What was not reached is shown too, so the page can be checked.
      setMarks(new Map(wordKeys.map((k, i) => [k, t.marks[i] ?? "missed"] as const)));
    }
  }, [wordKeys]);

  const startListening = async () => {
    if (audio.playing) audio.toggle();
    const expected = ayahs.flatMap(({ ayah }) => ayah.words.map((w) => w.text));
    const t = createReciteTracker(expected, () => {
      setMarks(new Map(wordKeys.flatMap((k, i) => (t.marks[i] ? [[k, t.marks[i]!] as const] : []))));
      if (t.position >= expected.length) finishListening();
    });
    tracker.current = t;
    setMarks(new Map());
    setSuggested(null);
    try {
      stopListening.current = await startSpeechStream({
        hints: [...new Set(expected.slice(0, 60))],
        onTranscript: (e) => t.hear(e.segment, e.text, Boolean(e.final)),
        onState: (state) => {
          if (state === "denied") toast.error("اسمح للتطبيق باستخدام الميكروفون لتسميع حفظك");
          if (state === "denied" || state === "error" || state === "unavailable") setListening(false);
        },
      });
      setListening(true);
    } catch {
      setListening(false);
      toast.error("لا يمكن الاستماع على هذا الجهاز");
    }
  };
  const allRevealed = ayahs.every(({ ayah }) => revealed.has(`${ayah.s}:${ayah.a}`));
  const intervals = React.useMemo(() => (item ? preview(hifz[item.page] ?? null, today.now) : null), [item, hifz, today.now]);

  const next = (result: Grade | "learned") => {
    if (!item) return;
    if (result === "learned") learnPage(item.page);
    else revisePage(item.page, result);
    setDone((d) => [...d, { page: item.page, grade: result }]);
    setRevealed(new Set());
    stopListening.current?.();
    stopListening.current = null;
    setListening(false);
    setMarks(new Map());
    setSuggested(null);
    if (audio.playing) audio.toggle();
    setIndex((i) => i + 1);
    window.scrollTo({ top: 0 });
  };

  if (!text.data || !meta.data) return <Q2Loading />;

  if (!item) {
    const forgot = done.filter((d) => d.grade === 1).length;
    return (
      <main className="q2-main" style={{ textAlign: "center", paddingTop: "calc(var(--q2-top) + 60px)" }}>
        <div style={{ fontSize: 42, color: "var(--q2-gold)" }}>✦</div>
        <h1 className="q2-h1" style={{ marginTop: 8 }}>{done.length ? "أتممت جلسة اليوم" : "لا شيء في الجلسة"}</h1>
        {done.length ? (
          <p className="q2-soft" style={{ marginTop: 10, lineHeight: 2 }}>
            {arCount(done.length, "صفحة واحدة", "صفحتان", "صفحات", "صفحة")}
            {forgot ? `، منها ${arCount(forgot, "صفحة", "صفحتان", "صفحات", "صفحة")} ستعود إليك غدًا` : ""}. زادك الله حفظًا وفهمًا.
          </p>
        ) : null}
        <button type="button" className="q2-btn q2-press" style={{ marginTop: 22 }} onClick={() => navigate("/q2/hifz", { replace: true })}>
          إلى خريطة حفظك
        </button>
      </main>
    );
  }

  const isNew = item.kind === "new";
  return (
    <div>
      <header className="q2-top">
        <button type="button" className="q2-icon-btn q2-press" onClick={() => navigate("/q2/hifz")} aria-label="إنهاء الجلسة">
          <X size={20} aria-hidden="true" />
        </button>
        <div className="q2-top-title" style={{ fontSize: 16 }}>
          {KIND[item.kind]}، {arDigits(index + 1)} من {arDigits(queue.length)}
        </div>
        <span style={{ width: 42 }} />
      </header>
      <div className="q2-bar" style={{ borderRadius: 0 }}><span style={{ width: `${(index / queue.length) * 100}%` }} /></div>

      <main className="q2-main" style={{ paddingBottom: "calc(var(--q2-bottom) + 190px)" }}>
        <div className="q2-eyebrow">الصفحة {arDigits(item.page)}</div>
        <h1 className="q2-h2" style={{ marginTop: 2 }}>{pageLabel(text.data, meta.data, item.page)}</h1>
        <p className="q2-small" style={{ marginTop: 6, lineHeight: 1.8 }}>
          {isNew
            ? "اقرأ الصفحة واستمع إليها مكرّرًا حتى تحفظها، ثم سجّلها."
            : "اقرأ من حفظك: تظهر أول كلمة من كل آية. المس الآية لتتحقق منها، ثم قيّم حفظك بصدق."}
        </p>

        <div className="q2-chips" style={{ marginTop: 12 }}>
          <button type="button" className={`q2-chip q2-press${audio.playing ? " is-on" : ""}`} onClick={audio.toggle} disabled={!audio.ready}>
            {audio.playing ? <Pause size={15} aria-hidden="true" /> : <Headphones size={15} aria-hidden="true" />}
            {audio.failed ? "تعذّر تحميل التلاوة" : audio.ready ? (audio.playing ? "إيقاف" : audio.talqeen ? "ابدأ التلقين" : "استمع للصفحة") : "تجهيز التلاوة…"}
          </button>
          <button
            type="button"
            className={`q2-chip q2-press${audio.talqeen ? " is-on" : ""}`}
            onClick={() => audio.setTalqeen(!audio.talqeen)}
            aria-pressed={audio.talqeen}
            title="يتلو القارئ الآية ثم يسكت لتردّدها"
          >
            <GraduationCap size={15} aria-hidden="true" /> تلقين
          </button>
          {audio.talqeen ? (
            <button
              type="button"
              className="q2-chip q2-press"
              onClick={() => setPrefs({ talqeenTimes: talqeenTimes >= 5 ? 1 : talqeenTimes + 1 })}
              aria-label="كم مرة تُكرّر كل آية"
            >
              كل آية × {arDigits(talqeenTimes)}
            </button>
          ) : null}
          {!isNew && canListen ? (
            <button type="button" className={`q2-chip q2-press${listening ? " is-on" : ""}`} onClick={() => (listening ? finishListening() : void startListening())}>
              {listening ? <MicOff size={15} aria-hidden="true" /> : <Mic size={15} aria-hidden="true" />}
              {listening ? "أنهيت" : "سمّع بصوتك"}
            </button>
          ) : null}
          <button type="button" className={`q2-chip q2-press${audio.loop ? " is-on" : ""}`} onClick={() => audio.setLoop(!audio.loop)} aria-pressed={audio.loop}>
            <Repeat size={15} aria-hidden="true" /> كرّر الصفحة
          </button>
          {!isNew && !allRevealed ? (
            <button
              type="button"
              className="q2-chip q2-press"
              onClick={() => setRevealed(new Set(ayahs.map(({ ayah }) => `${ayah.s}:${ayah.a}`)))}
            >
              <Eye size={15} aria-hidden="true" /> اكشف الصفحة
            </button>
          ) : null}
        </div>

        {audio.phase === "your-turn" ? <div className="q2-turn" style={{ marginTop: 12 }} role="status">دورك: ردّد الآية</div> : null}
        {listening ? <div className="q2-turn" style={{ marginTop: 12, color: "var(--q2-green)" }} role="status">أستمع… اقرأ الصفحة من حفظك</div> : null}
        {suggested ? (
          <div className="q2-card" style={{ marginTop: 12, padding: "12px 14px" }} role="status">
            <b>قرأت {arDigits(suggested.said)} من {arDigits(suggested.total)} كلمة</b>
            <span className="q2-small" style={{ display: "block", marginTop: 2 }}>
              الأحمر ما فاتك. التقييم المقترح: «{GRADES.find((x) => x.g === suggested.grade)!.label}»، ولك أن تختار غيره.
            </span>
          </div>
        ) : null}

        <div style={{ marginTop: 14 }}>
          <PageText
            current={audio.current}
            marks={marks}
            text={text.data}
            meta={meta.data}
            page={item.page}
            test={!isNew}
            revealed={revealed}
            onReveal={(key) => setRevealed((r) => new Set(r).add(key))}
          />
        </div>
      </main>

      <div className="q2-player">
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {isNew ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="q2-btn q2-press" style={{ flex: 1 }} onClick={() => next("learned")}>حفظتها</button>
              <button type="button" className="q2-btn is-ghost q2-press" onClick={() => setIndex((i) => i + 1)}>لاحقًا</button>
            </div>
          ) : (
            <>
              <div className="q2-small" style={{ textAlign: "center", marginBottom: 8 }}>كيف كان حفظك لهذه الصفحة؟</div>
              <div className="q2-grade">
                {GRADES.map(({ g, label }) => (
                  <button
                    key={g}
                    type="button"
                    className="q2-press"
                    onClick={() => next(g)}
                    style={suggested?.grade === g ? { borderColor: "var(--q2-green)", background: "var(--q2-green-soft)" } : undefined}
                  >
                    {label}
                    <small>{intervals ? inDays(intervals[g]) : ""}</small>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
