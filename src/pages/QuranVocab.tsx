import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Shuffle, RotateCcw, CheckCircle2, BookOpen, Share2, Copy, Star, List, CreditCard, Search, X as XIcon, HelpCircle, ChevronLeft } from "lucide-react";
import { QURAN_VOCAB, type VocabWord } from "@/data/quranVocab";
import { Card } from "@/components/ui/Card";
import toast from "react-hot-toast";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { arNum } from "@/lib/formatNumber";


const LEARNED_KEY = "noor_vocab_learned";
function loadLearned(): Set<number> {
  try {
    const v = localStorage.getItem(LEARNED_KEY);
    return v ? new Set(JSON.parse(v) as number[]) : new Set();
  } catch { return new Set(); }
}

function saveLearned(s: Set<number>) {
  localStorage.setItem(LEARNED_KEY, JSON.stringify([...s]));
}

const STREAK_KEY = "noor_vocab_review_dates";

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadReviewDates(): Set<string> {
  try {
    const v = localStorage.getItem(STREAK_KEY);
    return v ? new Set(JSON.parse(v) as string[]) : new Set();
  } catch { return new Set(); }
}

function recordTodayReview() {
  const dates = loadReviewDates();
  dates.add(getTodayKey());
  localStorage.setItem(STREAK_KEY, JSON.stringify([...dates]));
}

function computeVocabStreak(): number {
  const dates = loadReviewDates();
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 366; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (dates.has(key)) { streak++; } else { break; }
  }
  return streak;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// Words sorted by frequency descending for rank computation
const SORTED_IDS_BY_FREQ = [...QURAN_VOCAB]
  .sort((a, b) => b.frequency - a.frequency)
  .map((w) => w.id);

function getFreqRankPct(id: number): number {
  const rank = SORTED_IDS_BY_FREQ.indexOf(id);
  if (rank < 0) return 0;
  return Math.round(((rank + 1) / QURAN_VOCAB.length) * 100);
}

function getDailyWordId(): number {
  const now = new Date();
  const dayNum = Math.floor(now.getTime() / 86400000);
  return (dayNum % QURAN_VOCAB.length) + 1;
}

export function QuranVocabPage() {
  const navigate = useNavigate();
  useScrollRestoration();
  const [reviewMode, setReviewMode] = React.useState(false);
  const [tierFilter, setTierFilter] = React.useState<"all" | "top" | "mid" | "rare" | "misunderstood">("all");
  const [browseMode, setBrowseMode] = React.useState(false);
  const [browseQuery, setBrowseQuery] = React.useState("");
  const [quizMode, setQuizMode] = React.useState(false);
  const [quizQueue, setQuizQueue] = React.useState<number[]>([]);
  const [quizIdx, setQuizIdx] = React.useState(0);
  const [quizSelected, setQuizSelected] = React.useState<number | null>(null);
  const [quizCorrect, setQuizCorrect] = React.useState(0);
  const [quizTotal, setQuizTotal] = React.useState(0);
  const [quizDone, setQuizDone] = React.useState(false);
  const [deck, setDeck] = React.useState<VocabWord[]>(() => [...QURAN_VOCAB]);
  const [cardIndex, setCardIndex] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [seen, setSeen] = React.useState<Set<number>>(new Set());
  const [learned, setLearned] = React.useState<Set<number>>(() => loadLearned());
  const [vocabStreak, setVocabStreak] = React.useState<number>(() => computeVocabStreak());

  const dailyWordId = React.useMemo(() => getDailyWordId(), []);

  const browseList = React.useMemo(() => {
    if (!browseQuery.trim()) return QURAN_VOCAB;
    const q = browseQuery.trim().toLowerCase();
    return QURAN_VOCAB.filter(
      (w) => w.arabic.includes(browseQuery.trim()) || w.meaning.toLowerCase().includes(q)
    );
  }, [browseQuery]);

  // ── Quiz helpers ──────────────────────────────────────────────────────────
  function startQuiz(wordIds: number[]) {
    const q = shuffle(wordIds);
    setQuizQueue(q);
    setQuizIdx(0);
    setQuizSelected(null);
    setQuizCorrect(0);
    setQuizTotal(0);
    setQuizDone(false);
    setQuizMode(true);
    setBrowseMode(false);
  }

  const quizCard = React.useMemo(() => {
    if (!quizMode || quizDone || quizIdx >= quizQueue.length) return null;
    const wordId = quizQueue[quizIdx];
    if (wordId === undefined) return null;
    const word = QURAN_VOCAB.find((w) => w.id === wordId);
    if (!word) return null;
    const distractors = shuffle(QURAN_VOCAB.filter((w) => w.id !== wordId)).slice(0, 3);
    const options = shuffle([word, ...distractors]);
    return { word, options };
  }, [quizMode, quizDone, quizIdx, quizQueue]);

  function handleQuizSelect(optionId: number) {
    if (quizSelected !== null || !quizCard) return;
    const isCorrect = optionId === quizCard.word.id;
    setQuizSelected(optionId);
    setQuizTotal((t) => t + 1);
    if (isCorrect) setQuizCorrect((c) => c + 1);
  }

  function handleQuizNext() {
    const nextIdx = quizIdx + 1;
    if (nextIdx >= quizQueue.length) {
      setQuizDone(true);
    } else {
      setQuizIdx(nextIdx);
      setQuizSelected(null);
    }
  }

  const dailyWordIdx = React.useMemo(() => deck.findIndex((w) => w.id === dailyWordId), [deck, dailyWordId]);

  // Rebuild deck when review mode or tier filter changes
  React.useEffect(() => {
    let base = reviewMode
      ? QURAN_VOCAB.filter((w) => learned.has(w.id))
      : [...QURAN_VOCAB];
    if (tierFilter === "top") base = base.filter((w) => w.id <= 50);
    else if (tierFilter === "mid") base = base.filter((w) => w.id >= 51 && w.id <= 150);
    else if (tierFilter === "rare") base = base.filter((w) => w.id >= 151);
    else if (tierFilter === "misunderstood") base = base.filter((w) => !!w.wrongMeaning);
    setDeck(base.length > 0 ? base : [...QURAN_VOCAB]);
    setCardIndex(0);
    setFlipped(false);
    setSeen(new Set());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewMode, tierFilter]);

  const card = deck[cardIndex];

  function handleNext() {
    const nextIndex = cardIndex + 1;
    if (nextIndex < deck.length) {
      setCardIndex(nextIndex);
      setFlipped(false);
      if (card) setSeen((s) => new Set([...s, card.id]));
    }
  }

  function handlePrev() {
    if (cardIndex > 0) {
      setCardIndex(cardIndex - 1);
      setFlipped(false);
    }
  }

  function handleShuffle() {
    setDeck(shuffle(QURAN_VOCAB));
    setCardIndex(0);
    setFlipped(false);
    setSeen(new Set());
  }

  function handleReset() {
    setDeck([...QURAN_VOCAB]);
    setCardIndex(0);
    setFlipped(false);
    setSeen(new Set());
  }

  // Keyboard navigation: Space/Enter = flip, ArrowLeft = next, ArrowRight = prev
  React.useEffect(() => {
    const deckLen = deck.length;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => { if (!f) { recordTodayReview(); setVocabStreak(computeVocabStreak()); } return !f; });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCardIndex((prev) => {
          if (prev + 1 < deckLen) { setFlipped(false); return prev + 1; }
          return prev;
        });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCardIndex((prev) => {
          if (prev > 0) { setFlipped(false); return prev - 1; }
          return prev;
        });
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setCardIndex((prev) => {
          const w = deck[prev];
          if (w) {
            const next = new Set(learned);
            if (next.has(w.id)) next.delete(w.id); else { next.add(w.id); }
            setLearned(next);
            saveLearned(next);
          }
          return prev;
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.length]);

  function handleLearn(id: number) {
    const next = new Set(learned);
    if (next.has(id)) { next.delete(id); } else { next.add(id); toast.success("تمت الإضافة إلى المحفوظات"); recordTodayReview(); setVocabStreak(computeVocabStreak()); }
    setLearned(next);
    saveLearned(next);
  }

  async function shareWord(word: VocabWord) {
    const text = `${word.arabic}\n${word.meaning}${word.frequency ? `\n(تكرّر في القرآن ~${word.frequency} مرة)` : ""}\n\n• ATHAR أثر — مفردات القرآن`;
    try {
      if (navigator.share) { await navigator.share({ text }); }
      else { await navigator.clipboard.writeText(text); toast.success("تم النسخ"); }
    } catch {
      try { await navigator.clipboard.writeText(text); toast.success("تم النسخ"); } catch { /* ignore */ }
    }
  }

  async function copyWord(word: VocabWord) {
    const text = `${word.arabic} — ${word.meaning}`;
    try { await navigator.clipboard.writeText(text); toast.success("تم النسخ"); } catch { /* ignore */ }
  }

  if (!card) {
    if (reviewMode) {
      return (
        <div dir="rtl" className="min-h-screen-safe flex flex-col items-center justify-center gap-4 px-8 text-center">
          <BookOpen size={48} aria-hidden="true" style={{ color: "var(--accent)", opacity: 0.5 }} />
          <p className="text-base font-semibold" style={{ color: "var(--fg)" }}>
            لا توجد مفردات محفوظة بعد
          </p>
          <p className="text-sm opacity-60" style={{ color: "var(--fg)" }}>
            اضغط على ✓ في وضع الاستعراض العادي لإضافة الكلمات
          </p>
          <button type="button"
            onClick={() => setReviewMode(false)}
            className="px-5 py-2.5 rounded-2xl text-sm font-medium"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            العودة للاستعراض
          </button>
        </div>
      );
    }
    return null;
  }

  const progress = ((cardIndex + 1) / deck.length) * 100;

  return (
    <div dir="rtl" className="min-h-screen-safe pb-32 page-enter">
      {/* Header Card */}
      <div className="px-4 pt-4">
        <Card className="p-5 overflow-hidden relative">
          <div className="dhikr-card-stars absolute inset-0 pointer-events-none" />
          <div
            className="absolute inset-0 bg-gradient-to-bl from-sky-500/15 to-cyan-400/10 pointer-events-none opacity-55"
            style={{ borderRadius: "inherit" }}
          />
          <div className="relative">
            <div className="flex items-start gap-3 mb-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="رجوع"
                className="mt-1 p-2 rounded-xl flex-shrink-0"
                style={{ background: "var(--card)", color: "var(--fg)" }}
              >
                <ArrowRight size={18} aria-hidden="true" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg" aria-hidden="true">📖</span>
                  <div className="text-xs opacity-60">مفردات</div>
                </div>
                <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: "#0ea5e9" }}>
                  مفردات القرآن
                  {vocabStreak > 0 && (
                    <span className="text-base font-bold tabular-nums" style={{ color: "var(--accent)" }} title="سلسلة المراجعة اليومية">
                        🔥{arNum(vocabStreak)}
                    </span>
                  )}
                </h1>
                <div className="text-sm opacity-70 mt-1 tabular-nums" aria-live="polite" aria-atomic="true">
                  {reviewMode ? "مراجعة • " : ""}{arNum((cardIndex + 1))} / {arNum(deck.length)} • {arNum(learned.size)}/{QURAN_VOCAB.length} محفوظة ({Math.round((learned.size / QURAN_VOCAB.length) * 100)}٪)
                </div>
              </div>
            </div>
            {/* Progress bar */}
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={deck.length}
              aria-valuenow={cardIndex + 1}
              aria-label="تقدم استعراض المفردات"
              className="h-1.5 rounded-full overflow-hidden mb-3"
              style={{ background: "var(--card-2)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: "#0ea5e9" }}
              />
            </div>
            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button type="button"
                onClick={handleShuffle}
                className="p-2 rounded-xl"
                style={{ background: "var(--card)", color: "#0ea5e9" }}
                aria-label="خلط البطاقات"
              >
                <Shuffle size={16} aria-hidden="true" />
              </button>
              <button type="button"
                onClick={handleReset}
                className="p-2 rounded-xl"
                style={{ background: "var(--card)", color: "var(--fg)" }}
                aria-label="إعادة تعيين"
              >
                <RotateCcw size={16} aria-hidden="true" />
              </button>
              <button type="button"
                onClick={() => setReviewMode((v) => !v)}
                className="p-2 rounded-xl transition-colors"
                style={{
                  background: reviewMode ? "rgba(16,185,129,0.18)" : "var(--card)",
                  color: reviewMode ? "#10b981" : "var(--fg)",
                  border: reviewMode ? "1px solid rgba(16,185,129,0.35)" : "1px solid transparent",
                }}
                aria-label="مراجعة المحفوظات"
                aria-pressed={reviewMode}
                title="مراجعة المحفوظات فقط"
              >
                <BookOpen size={16} aria-hidden="true" />
              </button>
              {dailyWordIdx >= 0 && cardIndex !== dailyWordIdx && (
                <button type="button"
                  onClick={() => { setCardIndex(dailyWordIdx); setFlipped(false); }}
                  className="p-2 rounded-xl transition-colors ml-auto"
                  style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}
                  aria-label="الانتقال لكلمة اليوم"
                  title="كلمة اليوم"
                >
                  <Star size={15} aria-hidden="true" />
                </button>
              )}
              <button type="button"
                onClick={() => setBrowseMode((v) => !v)}
                className="p-2 rounded-xl transition-colors mr-auto"
                style={{
                  background: browseMode ? "color-mix(in srgb, #0ea5e9 15%, transparent)" : "var(--card)",
                  color: browseMode ? "#0ea5e9" : "var(--fg)",
                  border: browseMode ? "1px solid rgba(14,165,233,0.35)" : "1px solid transparent",
                }}
                aria-label="تصفح القائمة"
                aria-pressed={browseMode}
                title="عرض جميع الكلمات"
              >
                {browseMode ? <CreditCard size={16} aria-hidden="true" /> : <List size={16} aria-hidden="true" />}
              </button>
                <button
                  type="button"
                  onClick={() => startQuiz(QURAN_VOCAB.map((w) => w.id))}
                  className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-95"
                  style={{
                    background: quizMode ? "color-mix(in srgb, #a78bfa 15%, transparent)" : "var(--card)",
                    color: quizMode ? "#a78bfa" : "var(--fg)",
                    border: quizMode ? "1px solid rgba(167,139,250,0.35)" : "1px solid transparent",
                  }}
                  aria-pressed={quizMode}
                  aria-label="اختبار المفردات"
                  title="اختبار المفردات"
                >
                  <HelpCircle size={16} aria-hidden="true" />
                </button>
                {learned.size < QURAN_VOCAB.length && (
                  <button
                    type="button"
                    onClick={() => startQuiz(QURAN_VOCAB.filter((w) => !learned.has(w.id)).map((w) => w.id))}
                    className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-95 text-[10px] font-bold"
                    style={{
                      background: "var(--card)",
                      color: "#a78bfa",
                      border: "1px solid rgba(167,139,250,0.35)",
                    }}
                    aria-label="اختبار غير المحفوظ"
                    title="اختبار الكلمات غير المحفوظة فقط"
                  >
                    ★
                  </button>
                )}
            </div>
            {/* Frequency tier filter */}
            <div className="flex gap-1.5 mt-2 flex-wrap" role="group" aria-label="فلتر التكرار">
              {([
                { key: "all", label: "الكل" },
                { key: "top", label: "⭐ عليا (50)" },
                { key: "mid", label: "⚪ وسطى (100)" },
                { key: "rare", label: "⚫ نادرة (70)" },
                { key: "misunderstood", label: "⚠️ قد تُفهم خطأً" },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTierFilter(key)}
                  aria-pressed={tierFilter === key}
                  className="text-[10px] px-2.5 py-1 rounded-full transition-all"
                  style={tierFilter === key
                    ? { background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)", fontWeight: 600 }
                    : { background: "var(--card)", color: "var(--fg)", border: "1px solid var(--stroke)", opacity: 0.65 }}
                >{label}</button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Quiz mode */}
      {quizMode && (
        <div className="px-4 pt-4 pb-32">
          {/* Quiz header */}
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={() => setQuizMode(false)} className="text-xs opacity-50 hover:opacity-80 flex items-center gap-1" aria-label="إغلاق الاختبار">
              <XIcon size={13} /> إغلاق
            </button>
            <div className="text-xs font-semibold" style={{ color: "#a78bfa" }}>
              {!quizDone ? `${arNum((quizIdx + 1))} / ${arNum(quizQueue.length)}` : "انتهيت!"}
            </div>
            <div className="text-xs opacity-50 tabular-nums">
              {arNum(quizCorrect)}/{arNum(quizTotal)} صحيح
            </div>
          </div>

          {/* Progress bar */}
          {!quizDone && (
            <div className="h-1 rounded-full mb-5 overflow-hidden" style={{ background: "var(--card)" }}>
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.round((quizIdx / quizQueue.length) * 100)}%`, background: "#a78bfa" }} />
            </div>
          )}

          {/* Quiz done screen */}
          {quizDone && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="text-5xl">{quizCorrect / quizTotal >= 0.8 ? "🏆" : quizCorrect / quizTotal >= 0.5 ? "⭐" : "💪"}</div>
              <div className="text-lg font-bold">أتممت الاختبار</div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: "#a78bfa" }}>
                {arNum(quizCorrect)} / {arNum(quizTotal)}
              </div>
              <div className="text-sm opacity-60">
                {quizCorrect / quizTotal >= 0.8
                  ? "ممتاز! حفظتّ كثيراً من مفردات القرآن"
                  : quizCorrect / quizTotal >= 0.5
                  ? "جيد! استمرّ في التعلم"
                  : "استمرّ في التدريب ستتحسّن"}
              </div>
              <div className="flex gap-2 mt-2 flex-wrap justify-center">
                <button type="button" onClick={() => startQuiz(QURAN_VOCAB.map((w) => w.id))} className="px-4 py-2 rounded-2xl text-sm font-semibold transition-all active:scale-95" style={{ background: "#a78bfa", color: "#fff" }}>
                  إعادة الاختبار
                </button>
                {learned.size < QURAN_VOCAB.length && (
                  <button type="button" onClick={() => startQuiz(QURAN_VOCAB.filter((w) => !learned.has(w.id)).map((w) => w.id))} className="px-4 py-2 rounded-2xl text-sm font-semibold transition-all active:scale-95" style={{ background: "color-mix(in srgb, #a78bfa 20%, var(--card))", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.35)" }}>
                    غير المحفوظة ({arNum((QURAN_VOCAB.length - learned.size))})
                  </button>
                )}
                <button type="button" onClick={() => setQuizMode(false)} className="px-4 py-2 rounded-2xl text-sm transition-all active:scale-95" style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}>
                  إغلاق
                </button>
              </div>
            </div>
          )}

          {/* Question card */}
          {!quizDone && quizCard && (
            <div className="space-y-4">
              <div className="rounded-3xl p-6 text-center" style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}>
                <div className="text-4xl font-bold mb-2" style={{ fontFamily: "var(--font-arabic, inherit)", color: "var(--fg)" }}>
                  {quizCard.word.arabic}
                </div>
                <div className="text-xs opacity-40">ما معنى هذه الكلمة؟</div>
              </div>

              <div className="space-y-2">
                {quizCard.options.map((opt) => {
                  const isSelected = quizSelected === opt.id;
                  const isCorrect = opt.id === quizCard.word.id;
                  const revealed = quizSelected !== null;
                  let bg = "var(--card)";
                  let border = "1px solid var(--stroke)";
                  if (revealed && isCorrect) { bg = "color-mix(in srgb, var(--ok) 18%, transparent)"; border = "1px solid color-mix(in srgb, var(--ok) 40%, transparent)"; }
                  else if (revealed && isSelected && !isCorrect) { bg = "color-mix(in srgb, #f87171 15%, transparent)"; border = "1px solid rgba(248,113,113,0.4)"; }
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleQuizSelect(opt.id)}
                      disabled={revealed}
                      className="w-full text-right px-4 py-3 rounded-2xl text-sm transition-all active:scale-[0.99]"
                      style={{ background: bg, border }}
                    >
                      <span style={{ color: revealed && isCorrect ? "var(--ok)" : revealed && isSelected ? "#f87171" : "var(--fg)" }}>
                        {opt.meaning.split("—").slice(-1)[0]?.trim() ?? opt.meaning}
                      </span>
                    </button>
                  );
                })}
              </div>

              {quizSelected !== null && (
                <button type="button" onClick={handleQuizNext} className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.99]" style={{ background: "#a78bfa", color: "#fff" }}>
                  {quizIdx + 1 < quizQueue.length ? <>السؤال التالي <ChevronLeft size={16} aria-hidden="true" /></> : "عرض النتيجة"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Browse list mode */}
      {browseMode && (
        <div className="px-4 pt-4 pb-32">
          {/* Search input */}
          <div className="relative mb-3">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
            <input
              type="search"
              value={browseQuery}
              onChange={(e) => setBrowseQuery(e.target.value)}
              placeholder="ابحث عن كلمة…"
              dir="rtl"
              className="w-full rounded-2xl px-4 py-2.5 pr-9 text-sm"
              style={{ background: "var(--card)", border: "1px solid var(--stroke)", color: "var(--fg)", outline: "none" }}
              aria-label="ابحث في المفردات"
            />
            {browseQuery && (
              <button type="button" onClick={() => setBrowseQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80" aria-label="مسح البحث">
                <XIcon size={12} />
              </button>
            )}
          </div>
          {browseList.length === 0 && (
            <div className="text-center py-8 text-sm opacity-50">لا توجد نتائج</div>
          )}
          <div className="space-y-2">
          {browseList.map((word) => (
            <button
              key={word.id}
              type="button"
              onClick={() => {
                const idx = deck.findIndex((w) => w.id === word.id);
                if (idx >= 0) {
                  setCardIndex(idx);
                  setFlipped(false);
                  setReviewMode(false);
                }
                setBrowseMode(false);
              }}
              className="w-full flex items-center gap-3 rounded-2xl p-3.5 text-right transition-all active:scale-[0.99]"
              style={{ background: "var(--card)", border: `1px solid ${learned.has(word.id) ? "color-mix(in srgb, var(--ok) 30%, transparent)" : "var(--stroke)"}` }}
              aria-label={`الانتقال إلى كلمة ${word.arabic}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-base font-bold" style={{ fontFamily: "var(--font-arabic, inherit)", color: word.id === dailyWordId ? "var(--accent)" : "var(--fg)" }}>{word.arabic}</span>
                  {word.id === dailyWordId && <Star size={10} style={{ color: "var(--accent)", flexShrink: 0 }} />}
                  {learned.has(word.id) && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--ok) 18%, transparent)", color: "var(--ok)" }}>✓</span>}
                  {word.wrongMeaning && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, #f97316 12%, transparent)", color: "#f97316" }}>⚠️</span>}
                </div>
                <p className="text-xs opacity-60 line-clamp-1 text-right">{word.meaning.split('—').slice(-1)[0]?.trim() ?? word.meaning}</p>
              </div>
              <span className="text-[10px] opacity-35 tabular-nums shrink-0">{arNum(word.frequency)}×</span>
            </button>
          ))}
          </div>
        </div>
      )}
      {/* Flashcard */}
      {!browseMode && !quizMode && (
      <div className="px-4 pt-8 flex flex-col items-center gap-6">
        {/* Word of the day badge */}
        {card.id === dailyWordId && (
          <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}>
            <Star size={11} aria-hidden="true" />
            كلمة اليوم
          </div>
        )}
        <div className="w-full max-w-sm" style={{ perspective: "900px" }}>
          <button
            type="button"
            onClick={() => setFlipped((f) => { if (!f) { recordTodayReview(); setVocabStreak(computeVocabStreak()); } return !f; })}
            aria-label={flipped ? `إخفاء معنى كلمة ${card.arabic}` : `كشف معنى كلمة ${card.arabic}`}
            className={`vocab-flip-card w-full${flipped ? " is-flipped" : ""}`}
            style={{ minHeight: card.wrongMeaning ? "17rem" : "14rem" }}
          >
            {/* Front face — Arabic word */}
            <div className="vocab-card-face vocab-card-front" aria-hidden={flipped ? true : undefined}>
              <div className="text-center">
                {card.wrongMeaning && (
                  <div className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full mb-3"
                    style={{ background: "color-mix(in srgb, #f97316 12%, transparent)", color: "#f97316", border: "1px solid rgba(249,115,22,0.3)" }}>
                    ⚠️ قد تُفهم خطأً
                  </div>
                )}
                <div className="text-5xl font-bold mb-4" style={{ fontFamily: "var(--font-arabic, inherit)" }}>
                  {card.arabic}
                </div>
                <p className="text-xs opacity-50 flex items-center justify-center gap-1">
                  <RotateCcw size={12} aria-hidden="true" />
                  اضغط للكشف عن المعنى
                </p>
              </div>
            </div>
            {/* Back face — meaning */}
            <div className="vocab-card-face vocab-card-back" aria-hidden={!flipped ? true : undefined}
              style={card.wrongMeaning ? {
                background: "color-mix(in srgb, #dc2626 13%, var(--card))",
                border: "1px solid rgba(220,38,38,0.35)",
                boxShadow: "inset 0 0 40px rgba(220,38,38,0.08)",
              } : undefined}>
              <div className="text-center space-y-3">
                <div className="text-3xl font-bold" style={{ fontFamily: "var(--font-arabic, inherit)" }}>
                  {card.arabic}
                </div>
                <div className="h-px opacity-30" style={{ background: "color-mix(in srgb, var(--on-accent) 25%, transparent)" }} />
                <p className="text-lg leading-relaxed font-medium">{card.meaning}</p>
                {card.frequency > 0 && (() => {
                  const rankPct = getFreqRankPct(card.id);
                  const label = rankPct <= 10 ? "الأكثر تكراراً" : rankPct <= 30 ? "شائع جداً" : rankPct <= 60 ? "شائع" : "أقل شيوعاً";
                  const color = rankPct <= 10 ? "#22c55e" : rankPct <= 30 ? "#ffd780" : undefined;
                  return (
                    <div className="flex items-center justify-center gap-1.5 text-xs">
                      <span className="opacity-50">تكرّر: {arNum(card.frequency)} مرة</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: color ? `color-mix(in srgb, ${color} 18%, transparent)` : "rgba(255,255,255,0.08)", color: color ?? "rgba(255,255,255,0.55)" }}>{label}</span>
                    </div>
                  );
                })()}
                {card.wrongMeaning && (
                  <div className="w-full">
                    <div className="h-px mb-2.5 opacity-20" style={{ background: "var(--on-accent)" }} />
                    <p className="text-[10px] font-semibold mb-1 opacity-50">⚠️ يُظن خطأً أنها تعني</p>
                    <p className="text-base font-bold" style={{ color: "#fca5a5" }}>
                      {card.wrongMeaning}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* Deep meaning panel — visible below the card when flipped */}
        {flipped && card.deepMeaning && (
          <div className="w-full max-w-sm rounded-2xl p-4" dir="rtl"
            style={{ background: "color-mix(in srgb, #06b6d4 8%, var(--card))", border: "1px solid rgba(6,182,212,0.25)" }}>
            <div className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "#06b6d4" }}>
              💡 الفهم الصحيح والعميق
            </div>
            <p className="text-sm leading-relaxed text-right" style={{ color: "var(--fg)", opacity: 0.9 }}>{card.deepMeaning}</p>
            {card.example && (
              <p className="text-xs mt-2.5 opacity-55 font-medium text-right" style={{ color: "var(--fg)", fontFamily: "var(--font-arabic, inherit)" }}>{card.example}</p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-4">
          <button type="button"
            onClick={handleNext}
            disabled={cardIndex >= deck.length - 1}
            aria-label="الكلمة التالية"
            className="px-6 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-30"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            التالي ←
          </button>
          <button type="button"
            onClick={handlePrev}
            disabled={cardIndex === 0}
            aria-label="الكلمة السابقة"
            className="px-6 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-30"
            style={{ background: "var(--card)", color: "var(--fg)", border: "1px solid var(--stroke)" }}
          >
            → السابق
          </button>
        </div>

        {/* Keyboard hints — desktop only */}
        <div className="hidden md:flex items-center gap-3 text-[10px] opacity-30 mt-1" aria-hidden="true">
          {[["Space", "قلب"], ["←→", "تنقل"], ["M", "حفظ"]].map(([key, label]) => (
            <span key={key} className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-current font-mono text-[9px]">{key}</kbd>
              <span>{label}</span>
            </span>
          ))}
        </div>

        {/* Deck completion banner */}
        {cardIndex >= deck.length - 1 && deck.length > 0 && (
          <div
            className="w-full max-w-sm rounded-2xl p-4 text-center"
            style={{
              background: "color-mix(in srgb, var(--ok, #3ddc97) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--ok, #3ddc97) 30%, transparent)",
            }}
            role="status"
            aria-live="polite"
          >
            <div className="text-xl mb-1" aria-hidden="true">🎉</div>
            <p className="text-sm font-semibold" style={{ color: "var(--ok, #3ddc97)" }}>
              {reviewMode ? "أتممت مراجعة المحفوظات!" : "أتممت الاستعراض!"}
            </p>
            <p className="text-[11px] opacity-60 mt-0.5">
              {learned.size > 0 ? `حفظت ${arNum(learned.size)} كلمة` : "اضغط ✓ لإضافة كلمات لمحفوظاتك"}
            </p>
            <button
              type="button"
              onClick={handleShuffle}
              className="mt-3 text-xs font-medium px-4 py-2 rounded-xl transition-all"
              style={{ background: "color-mix(in srgb, var(--ok, #3ddc97) 20%, transparent)", color: "var(--ok, #3ddc97)" }}
            >
              خلط وإعادة
            </button>
          </div>
        )}

        {/* Action row: Mark learned + Share + Copy */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <button
            type="button"
            onClick={() => handleLearn(card.id)}
            aria-label={learned.has(card.id) ? "إلغاء حفظ الكلمة" : "حفظ الكلمة"}
            aria-pressed={learned.has(card.id)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all"
            style={learned.has(card.id)
              ? { background: "color-mix(in srgb, var(--ok, #3ddc97) 18%, transparent)", color: "var(--ok, #3ddc97)", border: "1px solid color-mix(in srgb, var(--ok, #3ddc97) 35%, transparent)" }
              : { background: "var(--card)", color: "var(--fg)", border: "1px solid var(--stroke)" }}
          >
            <CheckCircle2 size={15} />
            {learned.has(card.id) ? "محفوظة ✓" : "أضف للمحفوظات"}
          </button>
          <button
            type="button"
            onClick={() => shareWord(card)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all active:scale-95"
            style={{ background: "var(--card)", color: "var(--fg)", border: "1px solid var(--stroke)" }}
            aria-label="مشاركة الكلمة"
          >
            <Share2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => copyWord(card)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all active:scale-95"
            style={{ background: "var(--card)", color: "var(--fg)", border: "1px solid var(--stroke)" }}
            aria-label="نسخ الكلمة"
          >
            <Copy size={14} aria-hidden="true" />
          </button>
        </div>

        {/* Phase 62: Weekly featured word from mid/rare tier */}
        {(() => {
          const MID_RARE = QURAN_VOCAB.filter((w) => w.id >= 51);
          const weekNum = Math.floor(Date.now() / (7 * 86400000));
          const featured = MID_RARE[weekNum % MID_RARE.length];
          if (!featured) return null;
          const isLearned = learned.has(featured.id);
          return (
            <div
              className="w-full max-w-sm rounded-2xl p-3 flex items-center gap-3"
              style={{ background: "color-mix(in srgb, #a78bfa 9%, var(--card))", border: "1px solid rgba(167,139,250,0.25)" }}
            >
              <div className="shrink-0 text-xs font-bold px-2 py-1 rounded-xl" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>
                كلمة
              </div>
              <div className="flex-1 min-w-0 text-right">
                <div className="font-bold arabic-text text-sm">{featured.arabic}</div>
                <div className="text-[11px] opacity-60 truncate">{featured.meaning}</div>
              </div>
              <button
                type="button"
                className="shrink-0 p-1.5 rounded-xl transition-all active:scale-90"
                style={isLearned
                  ? { background: "color-mix(in srgb, var(--ok) 15%, transparent)", color: "var(--ok)" }
                  : { background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}
                onClick={() => handleLearn(featured.id)}
                aria-label={isLearned ? "إلغاء حفظ الكلمة المختارة" : "حفظ الكلمة المختارة"}
              >
                <CheckCircle2 size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })()}

        {/* Stats mini-card */}
        <div
          className="w-full max-w-sm rounded-2xl p-4 text-center"
          style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}
        >
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <p className="text-lg font-bold" style={{ color: "var(--accent)" }}>{arNum(seen.size)}</p>
              <p className="text-[11px] opacity-55" style={{ color: "var(--fg)" }}>شاهدت</p>
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: "var(--ok, #3ddc97)" }}>{arNum(learned.size)}</p>
              <p className="text-[11px] opacity-55" style={{ color: "var(--fg)" }}>محفوظة</p>
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: "var(--fg)" }}>{arNum(QURAN_VOCAB.length)}</p>
              <p className="text-[11px] opacity-55" style={{ color: "var(--fg)" }}>الإجمالي</p>
            </div>
          </div>
          {learned.size > 0 && (
            <div>
              <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: "var(--card-2, rgba(255,255,255,0.06))" }}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={QURAN_VOCAB.length}
                aria-valuenow={learned.size}
                aria-label={`حفظت ${learned.size} من ${QURAN_VOCAB.length} كلمة`}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round((learned.size / QURAN_VOCAB.length) * 100))}%`,
                    background: "var(--ok, #3ddc97)",
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] opacity-50">
                  {Math.round((learned.size / QURAN_VOCAB.length) * 100)}٪ محفوظ
                </p>
                {vocabStreak > 0 && (
                  <span className="text-[10px] flex items-center gap-0.5 tabular-nums" style={{ color: "#fb923c" }}>
                    🔥 {arNum(vocabStreak)} يوم
                  </span>
                )}
              </div>
            </div>
          )}
          {/* Phase 57: Tier breakdown */}
          {learned.size > 0 && (() => {
            const TOP_TOTAL = QURAN_VOCAB.filter((w) => w.id <= 50).length;
            const MID_TOTAL = QURAN_VOCAB.filter((w) => w.id >= 51 && w.id <= 150).length;
            const RARE_TOTAL = QURAN_VOCAB.filter((w) => w.id >= 151).length;
            const topLearned = QURAN_VOCAB.filter((w) => w.id <= 50 && learned.has(w.id)).length;
            const midLearned = QURAN_VOCAB.filter((w) => w.id >= 51 && w.id <= 150 && learned.has(w.id)).length;
            const rareLearned = QURAN_VOCAB.filter((w) => w.id >= 151 && learned.has(w.id)).length;
            return (
              <div className="mt-2 space-y-1.5 mb-1">
                {([
                  { label: "شائع", total: TOP_TOTAL, done: topLearned, color: "#ffd780" },
                  { label: "متوسط", total: MID_TOTAL, done: midLearned, color: "#a78bfa" },
                  { label: "نادر", total: RARE_TOTAL, done: rareLearned, color: "#60a5fa" },
                ] as const).map(({ label, total, done, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-[9px] w-8 shrink-0 opacity-55 text-right">{label}</span>
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${total > 0 ? Math.round((done / total) * 100) : 0}%`, background: color }} />
                    </div>
                    <span className="text-[9px] tabular-nums opacity-45 w-8 text-left shrink-0">{done}/{total}</span>
                  </div>
                ))}
              </div>
            );
          })()}
          {learned.size > 0 && (
            <button
              type="button"
              className="mt-3 w-full flex items-center justify-center gap-1.5 text-[11px] py-2 rounded-xl transition opacity-60 hover:opacity-90 active:scale-95"
              style={{ background: "var(--card-2, rgba(255,255,255,0.06))", border: "1px solid var(--stroke)" }}
              onClick={async () => {
                const sorted = QURAN_VOCAB.filter((w) => learned.has(w.id))
                  .sort((a, b) => a.id - b.id);
                const lines = sorted.map((w, i) => `${arNum((i + 1))}. ${w.arabic} — ${w.meaning}`);
                const text = `مفرداتي المحفوظة من القرآن الكريم (${arNum(learned.size)}/${QURAN_VOCAB.length}):\n${lines.join("\n")}`;
                if (navigator.share) {
                  await navigator.share({ text }).catch(() => {});
                } else {
                  try { await navigator.clipboard.writeText(text); toast.success("تم نسخ قائمة المحفوظات"); } catch { toast.error("تعذّر النسخ"); }
                }
              }}
              aria-label="نسخ قائمة المحفوظات"
            >
              <Copy size={11} aria-hidden="true" />
              نسخ قائمة المحفوظات ({arNum(learned.size)} كلمة)
            </button>
          )}
        </div>
      </div>
    )}
    </div>
  );
}
