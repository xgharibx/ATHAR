/**
 * HadithMemo — Phase 7D
 * Flip-card memorization with SM-2 spaced repetition for Nawawi 40.
 * Route: /hadith/memo
 */
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BrainCircuit, CheckCircle, ChevronLeft, ChevronRight, Copy, Share2 } from "lucide-react";
import { useHadithPack } from "@/data/useHadithBook";
import { useNoorStore } from "@/store/noorStore";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import toast from "react-hot-toast";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

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
          className="absolute inset-0 flex flex-col justify-center overflow-hidden rounded-3xl p-5 glass-strong"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            borderColor: "color-mix(in srgb, var(--accent) 32%, transparent)",
          }}
        >
          <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
          {front}
        </div>
        {/* Back */}
        <div
          className="absolute inset-0 flex flex-col justify-center overflow-hidden rounded-3xl p-5 glass-strong"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "color-mix(in srgb, var(--accent) 14%, transparent)",
            borderColor: "color-mix(in srgb, var(--accent) 36%, transparent)",
          }}
        >
          <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
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
  useScrollRestoration();
  const { data: nawawi } = useHadithPack("nawawi");
  const accentColor = "var(--accent)";

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
    <div dir="rtl" className="relative min-h-screen-safe overflow-hidden pb-24">
      <div className="pointer-events-none absolute inset-0 dhikr-page-stars opacity-25" aria-hidden />
      {/* Header Card */}
      <div className="relative z-10 px-4 pt-4">
        <Card className="relative overflow-hidden p-5">
          <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
          <div className="flex items-center gap-3">
            <IconButton aria-label="رجوع" onClick={() => navigate(-1)}><ArrowRight size={18} /></IconButton>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <BrainCircuit size={19} style={{ color: accentColor }} />
                <h1 className="text-lg font-bold">بطاقات الحفظ</h1>
              </div>
              <div className="text-xs opacity-55 mt-1">الأربعون النووية</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats row */}
      <div className="relative z-10 mx-4 mt-4 mb-4 grid grid-cols-3 gap-3">
        {[
          { val: allCards.length, label: "مضافة" },
          { val: dueCards.length, label: "للمراجعة" },
          { val: doneCount, label: "محفوظة" },
        ].map(({ val, label }) => (
          <div
            key={label}
            className="relative overflow-hidden rounded-3xl py-3 text-center glass"
          >
            <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
            <p className="text-xl font-bold font-arabic" style={{ color: accentColor }}>{val}</p>
            <p className="text-[10px] text-[var(--muted)]">{label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div
        className="relative z-10 mx-4 mb-5 flex overflow-hidden rounded-2xl glass"
      >
        {(["due", "add"] as const).map((t) => (
          <button type="button"
            key={t}
            onClick={() => { setViewMode(t); setCardIndex(0); setIsFlipped(false); }}
            className="flex-1 py-2.5 text-sm font-arabic transition-colors"
            style={viewMode === t
              ? { background: accentColor, color: "#06110d", fontWeight: 700 }
              : { color: "var(--muted)" }
            }
          >
            {t === "due" ? `مراجعة اليوم (${dueCards.length})` : "إضافة بطاقات"}
          </button>
        ))}
      </div>

      {/* All reviewed today */}
      {viewMode === "due" && dueCards.length === 0 && (
        <div className="relative z-10 flex flex-col items-center gap-4 py-16">
          <CheckCircle size={48} style={{ color: accentColor }} />
          <p className="text-base font-bold font-arabic text-[var(--fg)]">أحسنت! أنهيت مراجعة اليوم</p>
          <p className="text-sm text-[var(--muted)] font-arabic">ارجع غداً لمراجعة جديدة</p>
          <button type="button"
            onClick={() => { setViewMode("add"); setCardIndex(0); setIsFlipped(false); }}
            className="mt-2 rounded-2xl px-6 py-2.5 text-sm font-arabic font-bold press-effect"
            style={{ background: accentColor, color: "#06110d" }}
          >
            إضافة المزيد
          </button>
        </div>
      )}

      {/* Flip card area */}
      {currentHadith && (
        <div className="relative z-10 space-y-4 px-4">
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
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
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
                  حديث {currentHadith.a.toLocaleString("ar-EG")} — اضغط للكشف
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
            <button type="button"
              onClick={() => cardKey && addHadithMemoCard(cardKey)}
              className="w-full rounded-2xl py-2.5 text-sm font-arabic transition glass-hover press-effect"
              style={isAdded
                ? { background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: accentColor, border: "1px solid color-mix(in srgb, var(--accent) 36%, transparent)" }
                : { background: "rgba(255,255,255,0.055)", border: "1px solid var(--stroke)", color: "var(--fg)" }
              }
            >
              {isAdded ? "✓ مضافة للبطاقات" : "+ إضافة للحفظ"}
            </button>
          )}

          {/* Rating buttons (shown after flip) */}
          {isFlipped && (
            <div className="grid grid-cols-4 gap-2">
              {RATING_LABELS.map(({ rating, label, color, bg }) => (
                <button type="button"
                  key={rating}
                  onClick={() => handleRate(rating)}
                  className="rounded-2xl border py-2.5 text-sm font-bold font-arabic transition press-effect"
                  style={{ background: bg, color, borderColor: color + "44" }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex items-center justify-between pt-1">
            <button type="button"
              onClick={() => { setCardIndex((i) => Math.max(0, i - 1)); setIsFlipped(false); }}
              disabled={cardIndex === 0}
              className="rounded-full border border-white/10 bg-white/6 p-2 transition hover:bg-white/10 disabled:opacity-30 press-effect"
              aria-label="البطاقة السابقة"
            >
              <ChevronRight size={20} className="text-[var(--muted)]" />
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--muted)] font-arabic">
                {currentHadith.a.toLocaleString("ar-EG")}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(currentHadith.t);
                    toast.success("تم النسخ");
                  } catch {
                    toast.error("تعذر النسخ");
                  }
                }}
                className="rounded-lg border border-white/10 bg-white/6 p-1.5 opacity-60 transition hover:opacity-100 press-effect"
                style={{ color: "var(--fg)" }}
                aria-label="نسخ الحديث"
              >
                <Copy size={14} />
              </button>
              <button
                type="button"
                onClick={async () => {
                  const text = `${currentHadith.t}\n\n• ATHAR أثر — الأربعون النووية`;
                  try {
                    if (navigator.share) { await navigator.share({ text }); }
                    else { await navigator.clipboard.writeText(text); toast.success("تم النسخ"); }
                  } catch {
                    try { await navigator.clipboard.writeText(text); toast.success("تم النسخ"); } catch { /* ignore */ }
                  }
                }}
                className="rounded-lg border border-white/10 bg-white/6 p-1.5 opacity-60 transition hover:opacity-100 press-effect"
                style={{ color: "var(--fg)" }}
                aria-label="مشاركة الحديث"
              >
                <Share2 size={14} />
              </button>
            </div>
            <button type="button"
              onClick={() => { setCardIndex((i) => Math.min(currentCards.length - 1, i + 1)); setIsFlipped(false); }}
              disabled={cardIndex === currentCards.length - 1}
              className="rounded-full border border-white/10 bg-white/6 p-2 transition hover:bg-white/10 disabled:opacity-30 press-effect"
              aria-label="البطاقة التالية"
            >
              <ChevronLeft size={20} className="text-[var(--muted)]" />
            </button>
          </div>
        </div>
      )}

      {/* No pack loaded yet */}
      {!nawawi && viewMode === "add" && (
        <div className="relative z-10 flex flex-col items-center gap-3 py-16 text-[var(--muted)]">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-arabic">جارٍ التحميل…</p>
        </div>
      )}
    </div>
  );
}

export default HadithMemoPage;
