/**
 * التسميع — test your Quran memorization.
 *
 * Everywhere: hide-and-reveal tasmee' — ayahs are hidden, reveal them word
 * by word as you recite from memory, then grade yourself; a session summary
 * shows mastery at the end.
 *
 * Where the platform supports speech recognition (Chrome / Android browser),
 * a live voice mode (تجريبي) follows your recitation and reveals each word
 * as you say it — tashkeel-insensitive matching, fully on-device via the
 * browser's own engine. No audio ever touches our servers.
 */
import * as React from "react";
import { Check, Eye, Mic, MicOff, RotateCcw, X } from "lucide-react";
import { toast } from "react-hot-toast";

import { loadQuranDB } from "@/data/quranLoad";
import type { QuranDB } from "@/data/quranTypes";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

/** Strip tashkeel + normalize letters so voice matching ignores vocalisation. */
function normalizeArabic(s: string): string {
  return s
    .replace(/[ً-ْٰـۖ-ۭ﻿]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^ء-ي ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((ev: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getSpeechRecognition(): (new () => SR) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type AyahResult = "perfect" | "hinted" | "missed";

export function TasmeePage() {
  useScrollRestoration();

  const [db, setDb] = React.useState<QuranDB | null>(null);
  const [surahId, setSurahId] = React.useState(1);
  const [started, setStarted] = React.useState(false);
  const [ayahIdx, setAyahIdx] = React.useState(0);
  const [revealed, setRevealed] = React.useState(0);
  const [usedHint, setUsedHint] = React.useState(false);
  const [results, setResults] = React.useState<AyahResult[]>([]);
  const [finished, setFinished] = React.useState(false);

  const [voiceOn, setVoiceOn] = React.useState(false);
  const recRef = React.useRef<SR | null>(null);
  const voiceSupported = React.useMemo(() => getSpeechRecognition() !== null, []);

  React.useEffect(() => {
    void loadQuranDB().then(setDb).catch(() => toast.error("تعذّر تحميل المصحف"));
  }, []);

  const surah = db?.find((s) => s.id === surahId) ?? null;
  const ayah = surah?.ayahs[ayahIdx] ?? "";
  const words = React.useMemo(() => ayah.split(/\s+/).filter(Boolean), [ayah]);

  const stopVoice = React.useCallback(() => {
    try { recRef.current?.stop(); } catch { /* already stopped */ }
    recRef.current = null;
    setVoiceOn(false);
  }, []);

  React.useEffect(() => () => stopVoice(), [stopVoice]);

  const gradeAndNext = React.useCallback((res: AyahResult) => {
    setResults((prev) => [...prev, res]);
    if (!surah || ayahIdx + 1 >= surah.ayahs.length) {
      setFinished(true);
      stopVoice();
      return;
    }
    setAyahIdx((i) => i + 1);
    setRevealed(0);
    setUsedHint(false);
  }, [surah, ayahIdx, stopVoice]);

  // ── Live voice following (تجريبي) ────────────────────────────────────────
  const revealedRef = React.useRef(0);
  revealedRef.current = revealed;
  const wordsRef = React.useRef<string[]>([]);
  wordsRef.current = words;

  const startVoice = React.useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "ar-SA";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      let spoken = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        spoken += " " + ev.results[i][0].transcript;
      }
      const spokenWords = normalizeArabic(spoken).split(" ").filter(Boolean);
      // Greedy alignment with a 2-word lookahead from the reveal pointer.
      let pointer = revealedRef.current;
      const target = wordsRef.current.map(normalizeArabic);
      for (const sw of spokenWords) {
        if (pointer >= target.length) break;
        const window = target.slice(pointer, pointer + 3);
        const hit = window.findIndex((t) => t === sw || (t.length > 3 && (t.includes(sw) || sw.includes(t))));
        if (hit >= 0) pointer += hit + 1;
      }
      if (pointer > revealedRef.current) setRevealed(pointer);
    };
    rec.onerror = () => stopVoice();
    rec.onend = () => setVoiceOn(false);
    try {
      rec.start();
      recRef.current = rec;
      setVoiceOn(true);
    } catch {
      toast.error("تعذّر تشغيل الميكروفون");
    }
  }, [stopVoice]);

  const startSession = () => {
    setStarted(true);
    setAyahIdx(0);
    setRevealed(0);
    setUsedHint(false);
    setResults([]);
    setFinished(false);
  };

  const perfect = results.filter((r) => r === "perfect").length;
  const hinted = results.filter((r) => r === "hinted").length;
  const missed = results.filter((r) => r === "missed").length;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4" dir="rtl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-15 border border-accent-35 text-xl" aria-hidden="true">🎙️</span>
        <div>
          <h1 className="text-lg font-bold">التسميع</h1>
          <p className="text-xs text-[var(--muted-2)]">أخفِ الآيات وسمِّع من حفظك — ثم قيّم نفسك بصدق</p>
        </div>
      </div>

      {/* Setup */}
      {!started ? (
        <div className="mt-5 space-y-3 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-4">
          <label className="block text-sm font-semibold" htmlFor="tasmee-surah">اختر السورة</label>
          <select
            id="tasmee-surah"
            value={surahId}
            onChange={(e) => setSurahId(Number(e.target.value))}
            className="form-field-readable w-full rounded-xl border border-[var(--stroke)] px-3 py-2.5 text-sm"
          >
            {(db ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}. {s.name} — {s.ayahs.length.toLocaleString("ar-EG")} آية
              </option>
            ))}
          </select>
          <button type="button" onClick={startSession} disabled={!db}
            className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-black/80 transition active:scale-[0.99] disabled:opacity-50">
            {db ? "ابدأ التسميع" : "جارٍ تحميل المصحف…"}
          </button>
          <p className="text-[11px] leading-6 text-[var(--muted-2)]">
            {voiceSupported
              ? "🎙️ جهازك يدعم المتابعة الصوتية الحية (تجريبي): فعِّل الميكروفون أثناء الجلسة وستنكشف الكلمات كلما تلوتَها — المطابقة تتجاهل التشكيل، والصوت لا يغادر محرك جهازك."
              : "المتابعة الصوتية غير متاحة على هذا الجهاز — وضع الكشف اليدوي يعمل بشكل كامل."}
          </p>
        </div>
      ) : null}

      {/* Session */}
      {started && !finished && surah ? (
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span>سورة {surah.name}</span>
            <span>الآية {(ayahIdx + 1).toLocaleString("ar-EG")} من {surah.ayahs.length.toLocaleString("ar-EG")}</span>
          </div>

          {/* The hidden ayah */}
          <div className="min-h-36 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-5">
            <p className="arabic-text text-lg leading-10" aria-label="الآية المخفية">
              {words.map((w, i) => (
                <span key={i}
                  className={i < revealed
                    ? "text-[var(--fg)] transition-colors"
                    : "select-none rounded-md bg-[var(--card-2)] text-transparent"}
                  style={i < revealed ? undefined : { textShadow: "none" }}
                >
                  {i < revealed ? w : " " + "•".repeat(Math.max(2, Math.min(w.length, 6))) + " "}
                  {" "}
                </span>
              ))}
            </p>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button"
              onClick={() => { setRevealed((r) => Math.min(words.length, r + 1)); setUsedHint(true); }}
              className="flex items-center justify-center gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--card)] px-3 py-3 text-sm font-semibold transition hover:bg-[var(--card-2)]">
              <Eye className="h-4 w-4" aria-hidden="true" /> أظهر كلمة
            </button>
            <button type="button"
              onClick={() => { setRevealed(words.length); setUsedHint(true); }}
              className="flex items-center justify-center gap-2 rounded-xl border border-[var(--stroke)] bg-[var(--card)] px-3 py-3 text-sm font-semibold transition hover:bg-[var(--card-2)]">
              الآية كاملة
            </button>
            <button type="button"
              onClick={() => gradeAndNext(usedHint ? "hinted" : "perfect")}
              className="flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition active:scale-[0.99]"
              style={{ background: "color-mix(in srgb, var(--ok) 18%, transparent)", color: "var(--ok)", border: "1px solid color-mix(in srgb, var(--ok) 40%, transparent)" }}>
              <Check className="h-4 w-4" aria-hidden="true" /> {usedHint ? "أتممتها بمساعدة" : "أتقنتها"}
            </button>
            <button type="button"
              onClick={() => { setRevealed(words.length); window.setTimeout(() => gradeAndNext("missed"), 900); }}
              className="flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition active:scale-[0.99]"
              style={{ background: "color-mix(in srgb, var(--danger) 14%, transparent)", color: "var(--danger)", border: "1px solid color-mix(in srgb, var(--danger) 35%, transparent)" }}>
              <X className="h-4 w-4" aria-hidden="true" /> أخطأت — أرِني
            </button>
          </div>

          {/* Voice mode */}
          {voiceSupported ? (
            <button type="button"
              onClick={() => (voiceOn ? stopVoice() : startVoice())}
              aria-pressed={voiceOn}
              className={[
                "flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold transition",
                voiceOn
                  ? "border-accent-35 bg-accent-15 text-[var(--accent)]"
                  : "border-[var(--stroke)] bg-[var(--card)] hover:bg-[var(--card-2)]",
              ].join(" ")}
            >
              {voiceOn ? <Mic className="h-4 w-4 animate-pulse" aria-hidden="true" /> : <MicOff className="h-4 w-4" aria-hidden="true" />}
              {voiceOn ? "يستمع… اتلُ وستنكشف الكلمات" : "متابعة صوتية حيّة (تجريبي)"}
            </button>
          ) : null}

          <div className="flex justify-between text-[11px] text-[var(--muted-2)]">
            <span>✓ {perfect.toLocaleString("ar-EG")} إتقان</span>
            <span>👁 {hinted.toLocaleString("ar-EG")} بمساعدة</span>
            <span>✗ {missed.toLocaleString("ar-EG")} تحتاج مراجعة</span>
          </div>
        </div>
      ) : null}

      {/* Summary */}
      {finished ? (
        <div className="mt-5 space-y-4 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-5 text-center">
          <div className="text-3xl" aria-hidden="true">🏅</div>
          <h2 className="text-lg font-bold">أتممت تسميع سورة {surah?.name}</h2>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-xl bg-[var(--card-2)] px-2 py-3">
              <div className="text-xl font-bold" style={{ color: "var(--ok)" }}>{perfect.toLocaleString("ar-EG")}</div>
              <div className="text-[11px] text-[var(--muted)]">إتقان</div>
            </div>
            <div className="rounded-xl bg-[var(--card-2)] px-2 py-3">
              <div className="text-xl font-bold text-[var(--accent)]">{hinted.toLocaleString("ar-EG")}</div>
              <div className="text-[11px] text-[var(--muted)]">بمساعدة</div>
            </div>
            <div className="rounded-xl bg-[var(--card-2)] px-2 py-3">
              <div className="text-xl font-bold" style={{ color: "var(--danger)" }}>{missed.toLocaleString("ar-EG")}</div>
              <div className="text-[11px] text-[var(--muted)]">للمراجعة</div>
            </div>
          </div>
          <button type="button" onClick={startSession}
            className="mx-auto flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-black/80 transition active:scale-95">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> أعد التسميع
          </button>
        </div>
      ) : null}
    </div>
  );
}
