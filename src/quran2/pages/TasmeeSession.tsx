/**
 * «القرآن الكريم» — a recitation from memory. The passage is shown as chosen (hidden,
 * the first word of each ayah, or in full); the speech recogniser follows the
 * recitation word by word (hifz/recite.ts): the word you are on glows like the
 * lamp, words said turn green, words skipped are marked. Touch any word to hear
 * the reciter say it. At the end: what you said, what you missed with each one
 * playable, and, on the website, your own recitation to listen back.
 *
 * With the tajweed engine on the device (tajweed/engine.ts), the recitation
 * is also heard by the tajweed model when it ends: every word gets its
 * remarks (madd, ghunnah, qalqalah, ikhfa, iqlab, idgham, clear mistakes),
 * with your own voice and the reciter's for the same word. On phones the
 * engine is the listener (the phone's recogniser cannot share the microphone).
 */
import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Cpu, Headphones, Mic, RotateCcw, Square, Volume2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { Capacitor } from "@capacitor/core";
import { useQ2Meta, useQ2Text } from "../hooks";
import { useQ2Store } from "../store";
import { pageRange, refFromIndex } from "../data/meta";
import { arDigits } from "../data/arabic";
import { createReciteTracker, type ReciteTracker } from "../hifz/recite";
import { speechAvailable, startSpeechStream } from "@/lib/voiceTasbeeh";
import { useReciterWord } from "../tasmee/useReciterWord";
import { readMode } from "../tasmee/types";
import { Q2Error, Q2Loading, Q2Sheet } from "../components/ui";
import { QuranPrint } from "../components/QuranPrint";
import { startCapture, type Capture } from "../tajweed/capture";
import { judgeRecitation } from "../tajweed/engine";
import { ourWord } from "../tajweed/pieces";
import { playPcm, stopPcm } from "../tajweed/playback";
import type { AyahVerdict, JudgedWord } from "../tajweed/analyse";
import { TajweedEngineCard } from "../tasmee/TajweedEngineCard";
import { useEngineInstalled } from "../tasmee/useEngineInstalled";

type Ayah = { s: number; a: number; words: Array<{ n: number; text: string; after?: string }>; before?: string };
type Phase = "ready" | "listening" | "judging" | "done";

/** What a remark is about, for the summary. */
function noteGroup(rule: string): "madd" | "ghunnah" | "qalqalah" | "shadda" | "jali" {
  if (rule.includes("Madd") || rule === "madd_added") return "madd";
  if (["ghunnah", "idgham_ghunnah", "ikhfa", "iqlab", "idgham"].includes(rule)) return "ghunnah";
  if (rule === "qalqalah") return "qalqalah";
  if (rule === "shadda") return "shadda";
  return "jali";
}
const GROUP_NAMES = { madd: "المدود", ghunnah: "الغنن والنون الساكنة", qalqalah: "القلقلة", shadda: "الشدة", jali: "أخطاء النطق" } as const;

/** A word's verdicts (a word recited twice, after a stop, has two), merged. */
type WordVerdict = { notes: JudgedWord["notes"]; madd: JudgedWord["madd"]; at: [number, number] | null; skipped: boolean };
function byWord(verdicts: AyahVerdict[]): Map<string, WordVerdict> {
  const out = new Map<string, WordVerdict>();
  for (const v of verdicts) {
    for (const w of v.words) {
      const key = `${v.s}:${v.a}:${ourWord(v.s, v.a, w.index)}`;
      const old = out.get(key);
      const skipped = w.notes.some((n) => n.rule === "word");
      if (!old) {
        out.set(key, { notes: [...w.notes], madd: [...w.madd], at: w.at, skipped });
        continue;
      }
      // Said again after a stop: the second time counts when the first was skipped; notes are kept once each.
      for (const n of w.notes) if (!old.notes.some((x) => x.msg === n.msg)) old.notes.push(n);
      if (old.skipped && !skipped) {
        old.notes = old.notes.filter((n) => n.rule !== "word");
        old.skipped = false;
        old.at = w.at;
      }
      old.madd.push(...w.madd.filter((m) => !old.madd.some((x) => x.rule === m.rule && x.heard === m.heard)));
    }
  }
  return out;
}

export default function Q2TasmeeSession() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const text = useQ2Text();
  const meta = useQ2Meta();
  const reciter = useQ2Store((s) => s.prefs.reciter);
  const logTasmee = useQ2Store((s) => s.logTasmee);
  const mode = readMode(params.get("mode"));
  const voice = useReciterWord(reciter);

  // The passage: a page, or ayahs from…to of a surah.
  const passage = React.useMemo((): { ayahs: Ayah[]; label: string } | null => {
    if (!text.data || !meta.data) return null;
    const m = meta.data;
    const page = Number(params.get("page"));
    if (page >= 1 && page <= 604) {
      const [first, last] = pageRange(m, page);
      const ayahs: Ayah[] = [];
      for (let i = first; i <= last; i++) {
        const [s, a] = refFromIndex(m, i);
        const ay = text.data.surahs[s - 1]!.ayahs[a - 1]!;
        ayahs.push({ s, a, words: ay.words, before: ay.before });
      }
      return { ayahs, label: `الصفحة ${arDigits(page)}` };
    }
    const s = Math.min(114, Math.max(1, Number(params.get("s")) || 1));
    const count = m.surahs[s - 1]!.ayahs;
    const from = Math.min(count, Math.max(1, Number(params.get("from")) || 1));
    const to = Math.min(count, Math.max(from, Number(params.get("to")) || from));
    const ayahs = text.data.surahs[s - 1]!.ayahs.slice(from - 1, to).map((ay) => ({ s, a: ay.a, words: ay.words, before: ay.before }));
    return { ayahs, label: `${m.surahs[s - 1]!.name} ${arDigits(from)}${to > from ? `–${arDigits(to)}` : ""}` };
  }, [text.data, meta.data, params]);

  const flat = React.useMemo(() => passage?.ayahs.flatMap((ay) => ay.words.map((w) => ({ key: `${ay.s}:${ay.a}:${w.n}`, text: w.text }))) ?? [], [passage]);
  // Where each ayah's words start in the flat list.
  const offsets = React.useMemo(() => {
    const out: number[] = [];
    let n = 0;
    for (const ay of passage?.ayahs ?? []) {
      out.push(n);
      n += ay.words.length;
    }
    return out;
  }, [passage]);
  const [phase, setPhase] = React.useState<Phase>("ready");
  const [marks, setMarks] = React.useState<Array<"ok" | "missed" | undefined>>([]);
  const [position, setPosition] = React.useState(0);
  const [hinted, setHinted] = React.useState<Set<number>>(() => new Set());
  const [canListen, setCanListen] = React.useState<boolean | null>(null);
  const [recording, setRecording] = React.useState<string | null>(null);
  const tracker = React.useRef<ReciteTracker | null>(null);
  const stopRef = React.useRef<(() => void) | null>(null);
  const recorder = React.useRef<MediaRecorder | null>(null);
  const chunks = React.useRef<Blob[]>([]);
  // The tajweed engine: the recitation as samples, then the verdicts.
  const [engineReady, refreshEngine] = useEngineInstalled();
  const tajweedCheck = useQ2Store((s) => s.prefs.tajweedCheck);
  const setPrefs = useQ2Store((s) => s.setPrefs);
  const withTajweed = Boolean(engineReady && tajweedCheck);
  const capture = React.useRef<Capture | null>(null);
  const samples = React.useRef<Float32Array | null>(null);
  const [verdicts, setVerdicts] = React.useState<Map<string, WordVerdict> | null>(null);
  const [judged, setJudged] = React.useState(0);
  const [meter, setMeter] = React.useState<{ level: number; seconds: number }>({ level: 0, seconds: 0 });
  const [opened, setOpened] = React.useState<{ s: number; a: number; n: number; text: string } | null>(null);
  const [following, setFollowing] = React.useState(false);
  const [hasSamples, setHasSamples] = React.useState(false);

  React.useEffect(() => {
    void speechAvailable().then(setCanListen, () => setCanListen(false));
  }, []);
  React.useEffect(() => () => {
    stopRef.current?.();
    recorder.current?.state === "recording" && recorder.current.stop();
    void capture.current?.stop();
    stopPcm();
  }, []);
  // The level of the voice while the engine listens.
  React.useEffect(() => {
    if (phase !== "listening" || !withTajweed) return;
    const id = window.setInterval(() => {
      const c = capture.current;
      if (c) setMeter({ level: c.level(), seconds: c.seconds() });
    }, 200);
    return () => window.clearInterval(id);
  }, [phase, withTajweed]);
  React.useEffect(() => () => {
    if (recording) URL.revokeObjectURL(recording);
  }, [recording]);

  // Keep the word you are on in view.
  React.useEffect(() => {
    if (phase !== "listening") return;
    document.getElementById(`q2-tw-${position}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [position, phase]);

  const finish = React.useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    if (recorder.current?.state === "recording") recorder.current.stop();
    if (!passage) return;
    const t = tracker.current;
    const record = (final: Array<"ok" | "missed">) => {
      setMarks(final);
      const missed = flat.filter((_, i) => final[i] === "missed").map((w) => w.key);
      const said = final.filter((x) => x === "ok").length;
      logTasmee({ at: Date.now(), label: passage.label, target: `/quran/tasmee/session?${params.toString()}`, said, total: flat.length, missed });
    };
    const c = capture.current;
    capture.current = null;
    if (!c) {
      if (!t) return;
      record(flat.map((_, i) => t.marks[i] ?? "missed"));
      setPhase("done");
      return;
    }
    // The tajweed engine hears the whole recitation, on the device.
    setPhase("judging");
    setJudged(0);
    void (async () => {
      try {
        const audio = await c.stop();
        samples.current = audio;
        setHasSamples(true);
        const ayahs = passage.ayahs.map((ay) => ({ s: ay.s, a: ay.a }));
        const v = byWord(await judgeRecitation(audio.slice(), ayahs, (done, total) => setJudged(done / total)));
        setVerdicts(v);
        // Without the phone's recogniser, the engine tells which words were said.
        record(
          flat.map((w, i) => {
            if (t?.marks[i] === "ok") return "ok";
            const vw = v.get(w.key);
            return vw && !vw.skipped ? "ok" : "missed";
          }),
        );
      } catch {
        toast.error("تعذّر فحص التجويد هذه المرة");
        if (t) record(flat.map((_, i) => t.marks[i] ?? "missed"));
      }
      setPhase("done");
    })();
  }, [flat, passage, logTasmee, params]);

  const start = async () => {
    if (!passage) return;
    voice.stop();
    stopPcm();
    setVerdicts(null);
    samples.current = null;
    setHasSamples(false);
    setMarks([]);
    setPosition(0);
    setHinted(new Set());
    if (recording) URL.revokeObjectURL(recording);
    setRecording(null);
    const native = Capacitor.isNativePlatform();
    if (withTajweed) {
      try {
        capture.current = await startCapture();
      } catch {
        toast.error("اسمح باستخدام الميكروفون لتسمّع");
        return;
      }
    }
    // The recogniser follows the words live; on phones it cannot share the
    // microphone with the engine, which then listens alone.
    if (!(withTajweed && native)) {
      const t = createReciteTracker(flat.map((w) => w.text), () => {
        setMarks([...t.marks]);
        setPosition(t.position);
        if (t.position >= flat.length) finish();
      });
      tracker.current = t;
      setFollowing(true);
      try {
        stopRef.current = await startSpeechStream({
          hints: [...new Set(flat.slice(0, 80).map((w) => w.text))],
          onTranscript: (e) => t.hear(e.segment, e.text, Boolean(e.final)),
          onState: (state) => {
            if (state === "denied") toast.error("اسمح باستخدام الميكروفون لتسمّع");
            if ((state === "denied" || state === "error" || state === "unavailable") && !capture.current) setPhase((p) => (p === "listening" ? "ready" : p));
          },
        });
      } catch {
        if (!capture.current) {
          toast.error("لا يمكن الاستماع على هذا الجهاز");
          return;
        }
        tracker.current = null;
        setFollowing(false);
      }
    } else {
      tracker.current = null;
      setFollowing(false);
    }
    setPhase("listening");
    // On the website without the engine, your own recitation is kept to listen back.
    if (!native && !withTajweed && typeof MediaRecorder !== "undefined") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const rec = new MediaRecorder(stream);
        chunks.current = [];
        rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
        rec.onstop = () => {
          stream.getTracks().forEach((tr) => tr.stop());
          if (chunks.current.length) setRecording(URL.createObjectURL(new Blob(chunks.current, { type: rec.mimeType })));
        };
        rec.start();
        recorder.current = rec;
      } catch {
        // Listening still works; there is just nothing to play back.
      }
    }
  };

  if (text.isError || meta.isError) return <Q2Error label="تعذّر تحميل المصحف." />;
  if (!passage || !meta.data) return <Q2Loading />;

  const said = marks.filter((x) => x === "ok").length;
  const groups = { madd: 0, ghunnah: 0, qalqalah: 0, shadda: 0, jali: 0 };
  let clean = 0;
  if (verdicts) {
    for (const w of flat) {
      const v = verdicts.get(w.key);
      if (!v || v.skipped) continue;
      if (!v.notes.length) clean++;
      for (const n of v.notes) groups[noteGroup(n.rule)]++;
    }
  }
  const openedVerdict = opened ? verdicts?.get(`${opened.s}:${opened.a}:${opened.n}`) : undefined;
  const missedIdx = marks.map((x, i) => (x === "missed" ? i : -1)).filter((i) => i >= 0);
  const pct = flat.length ? Math.round((said / flat.length) * 100) : 0;

  return (
    <div>
      <header className="q2-top">
        <button type="button" className="q2-icon-btn q2-press" onClick={() => navigate("/quran/tasmee")} aria-label="رجوع">
          <ArrowRight size={20} aria-hidden="true" />
        </button>
        <div className="q2-top-title"><QuranPrint />التسميع، {passage.label}</div>
        <span className="q2-icon-btn" aria-hidden="true" />
      </header>

      <main className="q2-main" style={{ paddingBottom: "calc(var(--q2-bottom) + 190px)" }}>
        <p className="q2-text" style={{ textAlign: "justify" }}>
          {passage.ayahs.map((ay, ai) => {
            const head = ay.a === 1 ? (
              <span key={`h${ay.s}`} style={{ display: "block", textAlign: "center", margin: "8px 0" }}>
                <span className="q2-surah-name" style={{ fontSize: 22 }}>سورة {meta.data!.surahs[ay.s - 1]!.name}</span>
                {text.data!.surahs[ay.s - 1]!.basmala ? <span className="q2-basmala" style={{ display: "block" }}>{text.data!.surahs[ay.s - 1]!.basmala}</span> : null}
              </span>
            ) : null;
            return (
              <React.Fragment key={`${ay.s}:${ay.a}`}>
                {head}
                {ay.before ? <span className="q2-mark">{ay.before} </span> : null}
                {ay.words.map((w, wi) => {
                  const i = offsets[ai]! + wi;
                  const mark = marks[i];
                  const visible = mode === "shown" || mark !== undefined || hinted.has(i) || phase === "done" || (mode === "cue" && wi === 0);
                  const verdict = phase === "done" ? verdicts?.get(`${ay.s}:${ay.a}:${w.n}`) : undefined;
                  const tj = verdict ? (verdict.skipped ? "" : verdict.notes.some((n) => n.severity === "jali") ? " q2-tj-jali" : verdict.notes.length ? " q2-tj-khafi" : " q2-tj-ok") : "";
                  const cls = [
                    "q2-tw" + tj,
                    mark === "ok" ? "q2-said" : mark === "missed" ? "q2-missed" : !visible ? "q2-hide" : mode === "cue" && wi === 0 && !mark ? "q2-cue" : "",
                    phase === "listening" && i === position ? "is-lit" : "",
                    voice.playing === `${ay.s}:${ay.a}:${w.n}` ? "is-playing" : "",
                  ].join(" ");
                  return (
                    <React.Fragment key={w.n}>
                      <span
                        id={`q2-tw-${i}`}
                        className={cls}
                        role="button"
                        tabIndex={0}
                        aria-label={visible ? `استمع إلى «${w.text}»` : "كلمة مخفية: المسها لتظهر"}
                        onClick={() => {
                          if (!visible) {
                            setHinted((h) => new Set(h).add(i));
                            return;
                          }
                          if (verdict) {
                            setOpened({ s: ay.s, a: ay.a, n: w.n, text: w.text });
                            return;
                          }
                          void voice.playWord(ay.s, ay.a, w.n).then((ok) => ok || toast("لا توقيت لهذه الكلمة عند هذا القارئ"));
                        }}
                      >
                        {w.text}
                      </span>
                      {w.after && visible ? <span className="q2-mark"> {w.after}</span> : null}{" "}
                    </React.Fragment>
                  );
                })}
                <span className="q2-end" role="button" tabIndex={0} aria-label={`استمع إلى الآية ${ay.a}`} onClick={() => void voice.playAyah(ay.s, ay.a)}>
                  ۝{arDigits(ay.a)}
                </span>{" "}
              </React.Fragment>
            );
          })}
        </p>

        {phase === "done" ? (
          <section className="q2-card q2-rise" style={{ padding: 16, marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <b style={{ fontFamily: "var(--q2-display)", fontSize: 40, color: pct >= 90 ? "var(--q2-green)" : "var(--q2-gold)" }}>{arDigits(pct)}٪</b>
              <span className="q2-soft" style={{ lineHeight: 1.8 }}>
                تلوتَ {arDigits(said)} كلمة من {arDigits(flat.length)}
                {missedIdx.length ? `، وفاتك ${arDigits(missedIdx.length)}` : "، دون أن يفوتك شيء"}
                {hinted.size ? `، واستعنتَ بـ${arDigits(hinted.size)}` : ""}.
              </span>
            </div>
            {missedIdx.length ? (
              <>
                <div className="q2-small" style={{ marginTop: 12 }}>ما فاتك: المس الكلمة لتسمعها من القارئ</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {missedIdx.slice(0, 40).map((i) => {
                    const [s, a, n] = flat[i]!.key.split(":").map(Number) as [number, number, number];
                    return (
                      <button key={i} type="button" className="q2-chip q2-press" style={{ fontFamily: "var(--q2-quran)", fontSize: 18 }} onClick={() => void voice.playWord(s, a, n)}>
                        <Volume2 size={14} aria-hidden="true" /> {flat[i]!.text}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
            {verdicts ? (
              <div style={{ marginTop: 16, borderTop: "1px solid var(--q2-line)", paddingTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Cpu size={16} aria-hidden="true" style={{ color: "var(--q2-gold)" }} />
                  <b>التجويد</b>
                  <span className="q2-small">{arDigits(clean)} كلمة بلا ملاحظة من {arDigits(said)}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                  {(Object.keys(groups) as Array<keyof typeof groups>).map((g) => (
                    <span key={g} className={`q2-chip${groups[g] ? " is-on" : ""}`} style={{ cursor: "default" }}>
                      {GROUP_NAMES[g]}: {groups[g] ? arDigits(groups[g]) : "سليمة"}
                    </span>
                  ))}
                </div>
                <p className="q2-small" style={{ marginTop: 10, lineHeight: 1.9 }}>
                  المس أي كلمة ملوّنة لترى ملاحظتها، وتسمع نطقك ونطق القارئ لها. الأحمر خطأ في النطق، والذهبي حكم من أحكام التجويد.
                </p>
              </div>
            ) : null}
            {recording ? (
              <div style={{ marginTop: 14 }}>
                <div className="q2-small" style={{ marginBottom: 6 }}><Headphones size={13} aria-hidden="true" /> تلاوتك</div>
                <audio controls src={recording} style={{ width: "100%" }} />
              </div>
            ) : null}
          </section>
        ) : null}
      </main>

      <div className="q2-player">
        {phase === "ready" || phase === "done" ? (
          <div style={{ marginBottom: 8 }}>
            {engineReady ? (
              <button
                type="button"
                className={`q2-chip q2-press${tajweedCheck ? " is-on" : ""}`}
                aria-pressed={tajweedCheck}
                onClick={() => setPrefs({ tajweedCheck: !tajweedCheck })}
              >
                <Cpu size={14} aria-hidden="true" /> افحص التجويد أيضًا (على جهازك)
              </button>
            ) : engineReady === false ? (
              <TajweedEngineCard compact onChange={() => refreshEngine()} />
            ) : null}
          </div>
        ) : null}
        <div className="q2-player-row" style={{ justifyContent: "center", gap: 14 }}>
          {phase === "judging" ? (
            <span className="q2-small" style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }} role="status" aria-live="polite">
              <Cpu size={18} aria-hidden="true" style={{ color: "var(--q2-gold)" }} />
              <span style={{ flex: 1 }}>
                يُصغي محرك التجويد إلى تلاوتك على جهازك…
                <span className="q2-bar" style={{ marginTop: 6 }}><span style={{ width: `${Math.max(6, judged * 100)}%` }} /></span>
              </span>
            </span>
          ) : phase === "listening" ? (
            <>
              <span className="q2-small" style={{ flex: 1 }} aria-live="polite">
                {following ? (
                  <>أصغي… الكلمة {arDigits(Math.min(position + 1, flat.length))} من {arDigits(flat.length)}</>
                ) : (
                  <>
                    أصغي… {arDigits(Math.floor(meter.seconds / 60))}:{arDigits(String(Math.floor(meter.seconds % 60)).padStart(2, "0"))}
                    <span className="q2-meter" aria-hidden="true"><span style={{ transform: `scaleX(${Math.max(0.04, meter.level)})` }} /></span>
                  </>
                )}
              </span>
              <button type="button" className="q2-listen is-on q2-press" style={{ width: 64, height: 64 }} onClick={finish} aria-label="أنهِ التسميع">
                <Square size={22} aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <span className="q2-small" style={{ flex: 1 }}>
                {canListen === false && !withTajweed
                  ? "التسميع بالصوت يحتاج تطبيق أثر أو متصفح Chrome، أو محرك التجويد."
                  : phase === "done"
                    ? "أعد التسميع، أو المس أي كلمة لتسمعها."
                    : "اضغط الميكروفون وابدأ التلاوة من حفظك."}
              </span>
              <button type="button" className="q2-listen q2-press" style={{ width: 64, height: 64 }} disabled={canListen === false && !withTajweed} onClick={() => void start()} aria-label={phase === "done" ? "أعد التسميع" : "ابدأ التسميع"}>
                {phase === "done" ? <RotateCcw size={22} aria-hidden="true" /> : <Mic size={24} aria-hidden="true" />}
              </button>
            </>
          )}
        </div>
      </div>

      <Q2Sheet open={Boolean(opened)} onClose={() => { stopPcm(); setOpened(null); }} label="تجويد الكلمة">
        {opened ? (
          <div>
            <p style={{ fontFamily: "var(--q2-quran)", fontSize: 34, textAlign: "center", lineHeight: 1.9 }}>{opened.text}</p>
            {openedVerdict?.skipped ? (
              <p className="q2-soft" style={{ textAlign: "center" }}>لم يسمعها المحرك في تلاوتك.</p>
            ) : openedVerdict?.notes.length ? (
              <ul style={{ display: "grid", gap: 8, marginTop: 6 }}>
                {openedVerdict.notes.map((n, k) => (
                  <li key={k} className={`q2-note is-${n.severity}`}>{n.msg}</li>
                ))}
              </ul>
            ) : (
              <p className="q2-soft" style={{ textAlign: "center" }}>أحسنت: لا ملاحظة على هذه الكلمة.</p>
            )}
            {openedVerdict?.madd.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 10 }}>
                {openedVerdict.madd.map((m, k) => (
                  <span key={k} className="q2-chip" style={{ cursor: "default" }}>
                    {m.name}: {m.heard === 2 ? "حركتان" : `${arDigits(m.heard)} حركات`}
                  </span>
                ))}
              </div>
            ) : null}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
              <button
                type="button"
                className="q2-btn is-ghost q2-press"
                disabled={!openedVerdict?.at || !hasSamples}
                onClick={() => openedVerdict?.at && samples.current && playPcm(samples.current, openedVerdict.at[0], openedVerdict.at[1])}
              >
                <Mic size={16} aria-hidden="true" /> نطقك
              </button>
              <button
                type="button"
                className="q2-btn q2-press"
                onClick={() => void voice.playWord(opened.s, opened.a, opened.n).then((ok) => ok || toast("لا توقيت لهذه الكلمة عند هذا القارئ"))}
              >
                <Volume2 size={16} aria-hidden="true" /> نطق القارئ
              </button>
            </div>
          </div>
        ) : null}
      </Q2Sheet>
    </div>
  );
}
