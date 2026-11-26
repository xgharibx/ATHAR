/**
 * «القرآن الكريم» — a recitation from memory. The passage is shown as chosen (hidden,
 * the first word of each ayah, or in full); the speech recogniser follows the
 * recitation word by word (hifz/recite.ts): the word you are on glows like the
 * lamp, words said turn green, words skipped are marked. Touch any word to hear
 * the reciter say it. At the end: what you said, what you missed with each one
 * playable, and, on the website, your own recitation to listen back.
 */
import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Headphones, Mic, RotateCcw, Square, Volume2 } from "lucide-react";
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
import { Q2Error, Q2Loading } from "../components/ui";
import { QuranPrint } from "../components/QuranPrint";

type Ayah = { s: number; a: number; words: Array<{ n: number; text: string; after?: string }>; before?: string };
type Phase = "ready" | "listening" | "done";

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

  React.useEffect(() => {
    void speechAvailable().then(setCanListen, () => setCanListen(false));
  }, []);
  React.useEffect(() => () => {
    stopRef.current?.();
    recorder.current?.state === "recording" && recorder.current.stop();
  }, []);
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
    const t = tracker.current;
    if (!t || !passage) return;
    const final = flat.map((_, i) => t.marks[i] ?? "missed");
    setMarks(final);
    setPhase("done");
    const missed = flat.filter((_, i) => final[i] === "missed").map((w) => w.key);
    const said = final.filter((x) => x === "ok").length;
    logTasmee({ at: Date.now(), label: passage.label, target: `/quran/tasmee/session?${params.toString()}`, said, total: flat.length, missed });
  }, [flat, passage, logTasmee, params]);

  const start = async () => {
    if (!passage) return;
    voice.stop();
    const t = createReciteTracker(flat.map((w) => w.text), () => {
      setMarks([...t.marks]);
      setPosition(t.position);
      if (t.position >= flat.length) finish();
    });
    tracker.current = t;
    setMarks([]);
    setPosition(0);
    setHinted(new Set());
    if (recording) URL.revokeObjectURL(recording);
    setRecording(null);
    try {
      stopRef.current = await startSpeechStream({
        hints: [...new Set(flat.slice(0, 80).map((w) => w.text))],
        onTranscript: (e) => t.hear(e.segment, e.text, Boolean(e.final)),
        onState: (state) => {
          if (state === "denied") toast.error("اسمح باستخدام الميكروفون لتسمّع");
          if (state === "denied" || state === "error" || state === "unavailable") setPhase((p) => (p === "listening" ? "ready" : p));
        },
      });
      setPhase("listening");
    } catch {
      toast.error("لا يمكن الاستماع على هذا الجهاز");
      return;
    }
    // On the website, your own recitation is kept to listen back (the phone's
    // recogniser holds the microphone in the app).
    if (!Capacitor.isNativePlatform() && typeof MediaRecorder !== "undefined") {
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
                  const cls = [
                    "q2-tw",
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
        <div className="q2-player-row" style={{ justifyContent: "center", gap: 14 }}>
          {phase === "listening" ? (
            <>
              <span className="q2-small" style={{ flex: 1 }} aria-live="polite">
                أصغي… الكلمة {arDigits(Math.min(position + 1, flat.length))} من {arDigits(flat.length)}
              </span>
              <button type="button" className="q2-listen is-on q2-press" style={{ width: 64, height: 64 }} onClick={finish} aria-label="أنهِ التسميع">
                <Square size={22} aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <span className="q2-small" style={{ flex: 1 }}>
                {canListen === false
                  ? "التسميع بالصوت يحتاج تطبيق أثر أو متصفح Chrome."
                  : phase === "done"
                    ? "أعد التسميع، أو المس أي كلمة لتسمعها."
                    : "اضغط الميكروفون وابدأ التلاوة من حفظك."}
              </span>
              <button type="button" className="q2-listen q2-press" style={{ width: 64, height: 64 }} disabled={canListen === false} onClick={() => void start()} aria-label={phase === "done" ? "أعد التسميع" : "ابدأ التسميع"}>
                {phase === "done" ? <RotateCcw size={22} aria-hidden="true" /> : <Mic size={24} aria-hidden="true" />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
