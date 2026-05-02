/**
 * HadithMemo — Phase 7D
 * Flip-card memorization with SM-2 spaced repetition for Nawawi 40.
 * Route: /hadith/memo
 */
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BrainCircuit, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useHadithPack } from "@/data/useHadithBook";
import { HADITH_BOOKS_STATIC } from "@/data/hadithTypes";
import { useNoorStore } from "@/store/noorStore";

/* ------------------------------------------------------------------ */
/* Helpers                                                               */
/* ------------------------------------------------------------------ */

const RATING_LABELS: { rating: 0 | 1 | 2 | 3; label: string; color: string; bg: string }[] = [
  { rating: 0, label: "مجدداً", color: "#ef4444", bg: "#ef444422" },
  { rating: 1, label: "صعب",   color: "#f59e0b", bg: "#f59e0b22" },
  { rating: 2, label: "جيد",   color: "#3b82f6", bg: "#3b82f622" },
  { rating: 3, label: "سهل",   color: "#10b981", bg: "#10b98122" },
];

function splitHadithText(text: string): { isnad: string; matn: string } {
  const markers = [
    " قَالَ:", " قَالَ :", "قال:",
    "أَنَّ رَسُولَ", "أن رسول الله",
    "عَنِ النَّبِيِّ", "عَنِ النَّبِيِّ صَلَّى",
  ];
  let earliest = -1;
  for (const m of markers) {
    const idx = text.indexOf(m);
    if (idx !== -1 && (earliest === -1 || idx < earliest)) earliest = idx;
  }
  if (earliest <= 0) return { isnad: "", matn: text };
  return { isnad: text.slice(0, earliest).trim(), matn: text.slice(earliest).trim() };
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Flip card                                                             */
/* ------------------------------------------------------------------ */

function FlipCard({
  front,
  back,
  isFlipped,
  onFlip,
  accentColor,
}: {
  front: React.ReactNode;
  back: React.ReactNode;
  isFlipped: boolean;
  onFlip: () => void;
  accentColor: string;
}) {
  return (
    <div
      className="relative w-full cursor-pointer select-none"
      style={{ perspective: "1200px", minHeight: 260 }}
      onClick={onFlip}
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          minHeight: 260,
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-2xl p-5 flex flex-col justify-center"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            background: "var(--card-bg)",
            border: `1px solid ${accentColor}44`,
          }}
        >
          {front}
        </div>
        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl p-5 flex flex-col justify-center"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}44)`,
            border: `1px solid ${accentColor}55`,
          }}
        >
          {back}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                             */
/* ------------------------------------------------------------------ */

export function HadithMemoPage() {
  const navigate = useNavigate();
  const { data: nawawi } = useHadithPack("nawawi");
  const meta = nawawi ?? HADITH_BOOKS_STATIC.find((b) => b.key === "nawawi");
  const accentColor = meta?.color ?? "#84cc16";

  const { hadithMemoCards, addHadithMemoCard, reviewHadithMemo } = useNoorStore((s) => ({
    hadithMemoCards: s.hadithMemoCards,
    addHadithMemoCard: s.addHadithMemoCard,
    reviewHadithMemo: s.reviewHadithMemo,
  }));

  const today = todayISO();

  // Compute cards due today
  const dueCards = useMemo(() => {
    if (!nawawi) return [];
    return nawawi.hadiths.filter((h) => {
      const cardKey = `nawawi:${h.n}`;
      const card = hadithMemoCards[cardKey];
      if (!card) return false;
      return card.due <= today;
    });
  }, [nawawi, hadithMemoCards, today]);

  // All cards added
  const allCards = useMemo(() => {
    if (!nawawi) return [];
    return nawawi.hadiths.filter((h) => !!hadithMemoCards[`nawawi:${h.n}`]);
  }, [nawawi, hadithMemoCards]);

  const [viewMode, setViewMode] = useState<"due" | "add">("due");
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCards = viewMode === "due" ? dueCards : nawawi?.hadiths ?? [];
  const currentHadith = currentCards[cardIndex];
  const cardKey = currentHadith ? `nawawi:${currentHadith.n}` : null;
  const cardState = cardKey ? hadithMemoCards[cardKey] : null;
  const isAdded = cardKey ? !!hadithMemoCards[cardKey] : false;

  const { isnad, matn } = currentHadith
    ? splitHadithText(currentHadith.t)
    : { isnad: "", matn: "" };

  const handleRate = (rating: 0 | 1 | 2 | 3) => {
    if (!cardKey) return;
    if (!cardState) addHadithMemoCard(cardKey);
    reviewHadithMemo(cardKey, rating);
    setIsFlipped(false);
    setCardIndex((i) => Math.min(i + 1, currentCards.length - 1));
  };

  const doneCount = allCards.filter((h) => {
    const ck = `nawawi:${h.n}`;
    const c = hadithMemoCards[ck];
    return c && c.due > today;
  }).length;

  return (
    <div dir="rtl" className="min-h-screen pb-24" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 backdrop-blur-sm"
        style={{ background: "var(--bg)cc", borderBottom: "1px solid var(--card-border)" }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-[var(--card-bg)] transition"
          aria-label="رجوع"
        >
          <ArrowRight size={20} className="text-[var(--fg)]" />
        </button>
        <div className="flex-1">
          <p className="font-bold text-base text-[var(--fg)] font-arabic leading-tight">بطاقات الحفظ</p>
          <p className="text-xs text-[var(--muted)]">الأربعون النووية</p>
        </div>
        <BrainCircuit size={20} style={{ color: accentColor }} />
      </div>

      {/* Stats row */}
      <div className="mx-4 mt-4 mb-4 grid grid-cols-3 gap-3">
        {[
          { val: allCards.length, label: "مضافة" },
          { val: dueCards.length, label: "للمراجعة" },
          { val: doneCount, label: "محفوظة" },
        ].map(({ val, label }) => (
          <div
            key={label}
            className="rounded-2xl py-3 text-center"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            <p className="text-xl font-bold font-arabic" style={{ color: accentColor }}>{val}</p>
            <p className="text-[10px] text-[var(--muted)]">{label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div
        className="mx-4 mb-5 flex rounded-2xl overflow-hidden"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
      >
        {(["due", "add"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setViewMode(t); setCardIndex(0); setIsFlipped(false); }}
            className="flex-1 py-2.5 text-sm font-arabic transition-colors"
            style={viewMode === t
              ? { background: accentColor, color: "#fff", fontWeight: 700 }
              : { color: "var(--muted)" }
            }
          >
            {t === "due" ? `مراجعة اليوم (${dueCards.length})` : "إضافة بطاقات"}
          </button>
        ))}
      </div>

      {/* All reviewed today */}
      {viewMode === "due" && dueCards.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-4">
          <CheckCircle size={48} style={{ color: accentColor }} />
          <p className="text-base font-bold font-arabic text-[var(--fg)]">أحسنت! أنهيت مراجعة اليوم</p>
          <p className="text-sm text-[var(--muted)] font-arabic">ارجع غداً لمراجعة جديدة</p>
          <button
            onClick={() => { setViewMode("add"); setCardIndex(0); setIsFlipped(false); }}
            className="mt-2 px-6 py-2.5 rounded-2xl text-sm font-arabic font-bold"
            style={{ background: accentColor, color: "#fff" }}
          >
            إضافة المزيد
          </button>
        </div>
      )}

      {/* Flip card area */}
      {currentHadith && (
        <div className="px-4 space-y-4">
          {/* Progress bar */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--muted)] font-arabic">
              {cardIndex + 1} / {currentCards.length}
            </span>
            {cardState && (
              <span className="text-[10px] text-[var(--muted)]">
                تكرار {cardState.reviews} • التالي: {cardState.due}
              </span>
            )}
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--card-border)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${((cardIndex) / Math.max(currentCards.length, 1)) * 100}%`, background: accentColor }}
            />
          </div>

          {/* Card */}
          <FlipCard
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped((f) => !f)}
            accentColor={accentColor}
            front={
              <div dir="rtl">
                <p className="text-[10px] text-[var(--muted)] mb-2 font-arabic">
                  حديث {currentHadith.a} — {isFlipped ? "اقلب للمتن" : "اضغط للكشف"}
                </p>
                {isnad ? (
                  <p className="text-sm font-arabic text-[var(--fg)] opacity-60 leading-loose">{isnad}</p>
                ) : (
                  <p className="text-base font-arabic text-[var(--fg)] leading-loose line-clamp-6">
                    {matn.slice(0, 200)}…
                  </p>
                )}
                <p className="mt-3 text-[10px] text-center text-[var(--muted)] opacity-50">↺ اضغط للكشف</p>
              </div>
            }
            back={
              <div dir="rtl">
                <p className="text-[10px] mb-2 font-arabic" style={{ color: accentColor }}>المتن</p>
                <p className="text-base font-arabic text-[var(--fg)] leading-loose">
                  {matn}
                </p>
              </div>
            }
          />

          {/* Add/Remove from deck (when in add mode) */}
          {viewMode === "add" && (
            <button
              onClick={() => cardKey && addHadithMemoCard(cardKey)}
              className="w-full py-2.5 rounded-xl text-sm font-arabic transition"
              style={isAdded
                ? { background: accentColor + "22", color: accentColor, border: `1px solid ${accentColor}44` }
                : { background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--fg)" }
              }
            >
              {isAdded ? "✓ مضافة للبطاقات" : "+ إضافة للحفظ"}
            </button>
          )}

          {/* Rating buttons (shown after flip) */}
          {isFlipped && (
            <div className="grid grid-cols-4 gap-2">
              {RATING_LABELS.map(({ rating, label, color, bg }) => (
                <button
                  key={rating}
                  onClick={() => handleRate(rating)}
                  className="py-2.5 rounded-xl text-sm font-bold font-arabic transition active:scale-95"
                  style={{ background: bg, color }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => { setCardIndex((i) => Math.max(0, i - 1)); setIsFlipped(false); }}
              disabled={cardIndex === 0}
              className="p-2 rounded-full hover:bg-[var(--card-bg)] transition disabled:opacity-30"
            >
              <ChevronRight size={20} className="text-[var(--muted)]" />
            </button>
            <span className="text-xs text-[var(--muted)] font-arabic">
              {currentHadith.a}
            </span>
            <button
              onClick={() => { setCardIndex((i) => Math.min(currentCards.length - 1, i + 1)); setIsFlipped(false); }}
              disabled={cardIndex === currentCards.length - 1}
              className="p-2 rounded-full hover:bg-[var(--card-bg)] transition disabled:opacity-30"
            >
              <ChevronLeft size={20} className="text-[var(--muted)]" />
            </button>
          </div>
        </div>
      )}

      {/* No pack loaded yet */}
      {!nawawi && viewMode === "add" && (
        <div className="flex flex-col items-center py-16 gap-3 text-[var(--muted)]">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-arabic">جارٍ التحميل…</p>
        </div>
      )}
    </div>
  );
}

export default HadithMemoPage;
