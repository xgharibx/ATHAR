import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Shuffle, RotateCcw, CheckCircle2, BookOpen, Share2, Copy, Star } from "lucide-react";
import { QURAN_VOCAB, type VocabWord } from "@/data/quranVocab";
import { Card } from "@/components/ui/Card";
import toast from "react-hot-toast";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
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
  const [deck, setDeck] = React.useState<VocabWord[]>(() => [...QURAN_VOCAB]);
  const [cardIndex, setCardIndex] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [seen, setSeen] = React.useState<Set<number>>(new Set());
  const [learned, setLearned] = React.useState<Set<number>>(() => loadLearned());

  const dailyWordId = React.useMemo(() => getDailyWordId(), []);

  // Rebuild deck when review mode changes
  React.useEffect(() => {
    const base = reviewMode
      ? QURAN_VOCAB.filter((w) => learned.has(w.id))
      : [...QURAN_VOCAB];
    setDeck(base);
    setCardIndex(0);
    setFlipped(false);
    setSeen(new Set());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewMode]);

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

  function handleLearn(id: number) {
    const next = new Set(learned);
    if (next.has(id)) { next.delete(id); } else { next.add(id); toast.success("تمت الإضافة إلى المحفوظات"); }
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
          <BookOpen size={48} style={{ color: "var(--accent)", opacity: 0.5 }} />
          <p className="text-base font-semibold" style={{ color: "var(--fg)" }}>
            لا توجد مفردات محفوظة بعد
          </p>
          <p className="text-sm opacity-60" style={{ color: "var(--fg)" }}>
            اضغط على ✓ في وضع الاستعراض العادي لإضافة الكلمات
          </p>
          <button type="button"
            onClick={() => setReviewMode(false)}
            className="px-5 py-2.5 rounded-2xl text-sm font-medium"
            style={{ background: "var(--accent)", color: "#fff" }}
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
    <div dir="rtl" className="min-h-screen-safe pb-32">
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
                style={{ background: "rgba(255,255,255,0.08)", color: "var(--fg)" }}
              >
                <ArrowRight size={18} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">📖</span>
                  <div className="text-xs opacity-60">مفردات</div>
                </div>
                <h1 className="text-xl font-semibold" style={{ color: "#0ea5e9" }}>مفردات القرآن</h1>
                <div className="text-sm opacity-70 mt-1 tabular-nums">
                  {reviewMode ? "مراجعة • " : ""}{(cardIndex + 1).toLocaleString("ar-EG")} / {deck.length.toLocaleString("ar-EG")} • {learned.size.toLocaleString("ar-EG")} محفوظة
                </div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.1)" }}>
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
                style={{ background: "rgba(255,255,255,0.08)", color: "#0ea5e9" }}
                aria-label="خلط البطاقات"
              >
                <Shuffle size={16} />
              </button>
              <button type="button"
                onClick={handleReset}
                className="p-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.08)", color: "var(--fg)" }}
                aria-label="إعادة تعيين"
              >
                <RotateCcw size={16} />
              </button>
              <button type="button"
                onClick={() => setReviewMode((v) => !v)}
                className="p-2 rounded-xl transition-colors"
                style={{
                  background: reviewMode ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.08)",
                  color: reviewMode ? "#10b981" : "var(--fg)",
                  border: reviewMode ? "1px solid rgba(16,185,129,0.35)" : "1px solid transparent",
                }}
                aria-label="مراجعة المحفوظات"
                title="مراجعة المحفوظات فقط"
              >
                <BookOpen size={16} />
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Flashcard */}
      <div className="px-4 pt-8 flex flex-col items-center gap-6">
        {/* Word of the day badge */}
        {card.id === dailyWordId && (
          <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}>
            <Star size={11} />
            كلمة اليوم
          </div>
        )}
        <button type="button"
          onClick={() => setFlipped((f) => !f)}
          className="w-full max-w-sm rounded-3xl min-h-56 flex flex-col items-center justify-center p-8 transition-all duration-300 active:scale-95 cursor-pointer"
          style={{
            background: flipped ? "var(--accent)" : "var(--card)",
            border: "1px solid var(--stroke)",
            color: flipped ? "#fff" : "var(--fg)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          }}
        >
          {!flipped ? (
            <div className="text-center">
              <div
                className="text-5xl font-bold mb-4"
                style={{ fontFamily: "var(--font-arabic, inherit)" }}
              >
                {card.arabic}
              </div>
              <p className="text-xs opacity-50">اضغط للكشف عن المعنى</p>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div
                className="text-3xl font-bold"
                style={{ fontFamily: "var(--font-arabic, inherit)" }}
              >
                {card.arabic}
              </div>
              <div className="h-px opacity-30" style={{ background: "#fff" }} />
              <p className="text-lg leading-relaxed font-medium">{card.meaning}</p>
              {card.frequency > 0 && (
                <p className="text-xs opacity-70">
                  تكرّر في القرآن ~{card.frequency} مرة
                </p>
              )}
            </div>
          )}
        </button>

        {/* Navigation */}
        <div className="flex items-center gap-4">
          <button type="button"
            onClick={handleNext}
            disabled={cardIndex >= deck.length - 1}
            className="px-6 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-30"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            التالي ←
          </button>
          <button type="button"
            onClick={handlePrev}
            disabled={cardIndex === 0}
            className="px-6 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-30"
            style={{ background: "var(--card)", color: "var(--fg)", border: "1px solid var(--stroke)" }}
          >
            → السابق
          </button>
        </div>

        {/* Action row: Mark learned + Share + Copy */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <button
            type="button"
            onClick={() => handleLearn(card.id)}
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
            <Copy size={14} />
          </button>
        </div>

        {/* Stats mini-card */}
        <div
          className="w-full max-w-sm rounded-2xl p-4 grid grid-cols-3 gap-3 text-center"
          style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}
        >
          <div>
            <p className="text-lg font-bold" style={{ color: "var(--accent)" }}>{seen.size}</p>
            <p className="text-[11px] opacity-55" style={{ color: "var(--fg)" }}>شاهدت</p>
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: "var(--ok, #3ddc97)" }}>{learned.size}</p>
            <p className="text-[11px] opacity-55" style={{ color: "var(--fg)" }}>محفوظة</p>
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: "var(--fg)" }}>{QURAN_VOCAB.length}</p>
            <p className="text-[11px] opacity-55" style={{ color: "var(--fg)" }}>الإجمالي</p>
          </div>
        </div>
      </div>
    </div>
  );
}
