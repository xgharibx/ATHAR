/**
 * HadithMemo — Phase 7D
 * Flip-card memorization with SM-2 spaced repetition for Nawawi 40.
 * Route: /hadith/memo
 */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BrainCircuit, CheckCircle, ChevronLeft, ChevronRight, Copy, Share2 } from "lucide-react";
import { useHadithPack, loadHadithPack } from "@/data/useHadithBook";
import { HADITH_BOOKS_STATIC, type HadithItem, type HadithPack } from "@/data/hadithTypes";
import { splitHadithText } from "@/lib/hadithText";
import { useNoorStore } from "@/store/noorStore";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import toast from "react-hot-toast";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { arNum } from "@/lib/formatNumber";


/* ------------------------------------------------------------------ */
/* Helpers                                                               */
/* ------------------------------------------------------------------ */

const RATING_LABELS: { rating: 0 | 1 | 2 | 3; label: string; color: string; bg: string }[] = [
  { rating: 0, label: "مجدداً", color: "#ef4444", bg: "#ef444422" },
  { rating: 1, label: "صعب",   color: "#f59e0b", bg: "#f59e0b22" },
  { rating: 2, label: "جيد",   color: "#3b82f6", bg: "#3b82f622" },
  { rating: 3, label: "سهل",   color: "#10b981", bg: "#10b98122" },
];


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
}: {
  front: React.ReactNode;
  back: React.ReactNode;
  isFlipped: boolean;
  onFlip: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={isFlipped ? "اضغط لإخفاء الإجابة" : "اضغط لعرض الإجابة"}
      className="relative w-full cursor-pointer select-none"
      style={{ perspective: "1200px", minHeight: 260 }}
      onClick={onFlip}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFlip(); } }}
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

/** A card in the deck carries which book it came from — memo cards are added
 *  from the reader for ANY of the 9 books, not just Nawawi. */
type DeckCard = { bookKey: string; item: HadithItem };

export function HadithMemoPage() {
  const navigate = useNavigate();
  useScrollRestoration();
  const { data: nawawi } = useHadithPack("nawawi"); // the "add" tab browses Nawawi 40
  const accentColor = "var(--accent)";

  const { hadithMemoCards, addHadithMemoCard, reviewHadithMemo } = useNoorStore((s) => ({
    hadithMemoCards: s.hadithMemoCards,
    addHadithMemoCard: s.addHadithMemoCard,
    reviewHadithMemo: s.reviewHadithMemo,
  }));

  const today = todayISO();

  // Which books have memo cards (keys are "bookKey:n"). Cards can be added
  // from any book's reader, so we resolve each card's text by loading the
  // packs those cards actually belong to — not just Nawawi.
  const neededBooks = useMemo(() => {
    const set = new Set<string>();
    for (const key of Object.keys(hadithMemoCards)) {
      const book = key.split(":")[0];
      if (book) set.add(book);
    }
    return [...set];
  }, [hadithMemoCards]);

  const [packs, setPacks] = useState<Record<string, HadithPack>>({});
  useEffect(() => {
    let alive = true;
    const missing = neededBooks.filter((b) => !packs[b]);
    if (missing.length === 0) return;
    Promise.all(missing.map((b) => loadHadithPack(b).then((p) => [b, p] as const))).then((pairs) => {
      if (!alive) return;
      setPacks((prev) => {
        const next = { ...prev };
        for (const [b, p] of pairs) if (p) next[b] = p;
        return next;
      });
    });
    return () => { alive = false; };
  }, [neededBooks, packs]);

  const bookTitle = (key: string) =>
    packs[key]?.title ?? HADITH_BOOKS_STATIC.find((b) => b.key === key)?.title ?? key;

  // Every added card across every book, resolved to its hadith text.
  const allCards = useMemo<DeckCard[]>(() => {
    const out: DeckCard[] = [];
    for (const key of Object.keys(hadithMemoCards)) {
      const [book, nStr] = key.split(":");
      const pack = packs[book];
      if (!pack) continue;
      const item = pack.hadiths.find((h) => h.n === Number(nStr));
      if (item) out.push({ bookKey: book, item });
    }
    return out;
  }, [hadithMemoCards, packs]);

  // Cards due for review today (across all books).
  const dueCards = useMemo<DeckCard[]>(
    () => allCards.filter(({ bookKey, item }) => {
      const card = hadithMemoCards[`${bookKey}:${item.n}`];
      return card && card.due <= today;
    }),
    [allCards, hadithMemoCards, today],
  );

  const [viewMode, setViewMode] = useState<"due" | "add">("due");
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const addDeck = useMemo<DeckCard[]>(
    () => (nawawi?.hadiths ?? []).map((item) => ({ bookKey: "nawawi", item })),
    [nawawi],
  );

  const currentCards = viewMode === "due" ? dueCards : addDeck;
  const current = currentCards[cardIndex];
  const cardKey = current ? `${current.bookKey}:${current.item.n}` : null;
  const cardState = cardKey ? hadithMemoCards[cardKey] : null;
  const isAdded = cardKey ? !!hadithMemoCards[cardKey] : false;

  const { isnad, matn } = current
    ? splitHadithText(current.item.t)
    : { isnad: "", matn: "" };

  const handleRate = (rating: 0 | 1 | 2 | 3) => {
    if (!cardKey) return;
    if (!cardState) addHadithMemoCard(cardKey);
    reviewHadithMemo(cardKey, rating);
    setIsFlipped(false);
    setCardIndex((i) => Math.min(i + 1, currentCards.length - 1));
  };

  const doneCount = allCards.filter(({ bookKey, item }) => {
    const c = hadithMemoCards[`${bookKey}:${item.n}`];
    return c && c.due > today;
  }).length;

  return (
    <div dir="rtl" className="relative min-h-screen-safe overflow-hidden pb-24 page-enter">
      <div className="pointer-events-none absolute inset-0 dhikr-page-stars opacity-25" aria-hidden />
      {/* Header Card */}
      <div className="relative z-10 px-4 pt-4">
        <Card className="relative overflow-hidden p-5">
          <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
          <div className="flex items-center gap-3">
            <IconButton aria-label="رجوع" onClick={() => navigate(-1)}><ArrowRight size={18} /></IconButton>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <BrainCircuit size={19} aria-hidden="true" style={{ color: accentColor }} />
                <h1 className="text-lg font-bold">بطاقات الحفظ</h1>
              </div>
              <div className="text-xs opacity-55 mt-1">احفظ بالتكرار المتباعد — من أي كتاب</div>
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
        role="tablist" aria-orientation="horizontal"
        aria-label="وضع البطاقات"
        className="relative z-10 mx-4 mb-5 flex overflow-hidden rounded-2xl glass"
          onKeyDown={(e) => {
            const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
            const idx = tabs.findIndex(t => t === document.activeElement);
            if (idx === -1) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); const n=(idx-1+tabs.length)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); const n=(idx+1)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'Home') { e.preventDefault(); tabs[0].focus(); tabs[0].click(); }
            else if (e.key === 'End') { e.preventDefault(); tabs[tabs.length-1].focus(); tabs[tabs.length-1].click(); }
          }}
      >
        {(["due", "add"] as const).map((t) => (
          <button type="button"
            role="tab"
            key={t}
            aria-controls="hadith-memo-content"
            onClick={() => { setViewMode(t); setCardIndex(0); setIsFlipped(false); }}
            aria-selected={viewMode === t}
            className="flex-1 py-2.5 text-sm font-arabic transition-colors"
            style={viewMode === t
              ? { background: accentColor, color: "var(--on-accent)", fontWeight: 700 }
              : { color: "var(--muted)" }
            }
          >
            {t === "due" ? `مراجعة اليوم (${dueCards.length})` : "إضافة بطاقات"}
          </button>
        ))}
      </div>

      <div id="hadith-memo-content">
      {/* All reviewed today */}
      {viewMode === "due" && dueCards.length === 0 && (
        <div className="relative z-10 flex flex-col items-center gap-4 py-16">
          <CheckCircle size={48} aria-hidden="true" style={{ color: accentColor }} />
          <p className="text-base font-bold font-arabic text-[var(--fg)]">أحسنت! أنهيت مراجعة اليوم</p>
          <p className="text-sm text-[var(--muted)] font-arabic">ارجع غداً لمراجعة جديدة</p>
          <button type="button"
            onClick={() => { setViewMode("add"); setCardIndex(0); setIsFlipped(false); }}
            className="mt-2 rounded-2xl px-6 py-2.5 text-sm font-arabic font-bold press-effect"
            style={{ background: accentColor, color: "var(--on-accent)" }}
          >
            إضافة المزيد
          </button>
        </div>
      )}

      {/* Flip card area */}
      {current && (
        <div className="relative z-10 space-y-4 px-4">
          {/* Progress bar */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--muted)] font-arabic" aria-live="polite" aria-atomic="true">
              {cardIndex + 1} / {currentCards.length}
            </span>
            {cardState && (
              <span className="text-[10px] text-[var(--muted)]">
                تكرار {cardState.reviews} • التالي: {cardState.due}
              </span>
            )}
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={currentCards.length}
            aria-valuenow={cardIndex}
            aria-label="تقدم مراجعة البطاقات"
            className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--card)]"
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${((cardIndex) / Math.max(currentCards.length, 1)) * 100}%`, background: accentColor }}
            />
          </div>

          {/* Card */}
          <FlipCard
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped((f) => !f)}
            front={
              <div dir="rtl">
                <p className="text-[10px] text-[var(--muted)] mb-2 font-arabic">
                  {bookTitle(current.bookKey)} · حديث {arNum(current.item.a)} — اضغط للكشف
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
              aria-pressed={isAdded}
              aria-label={isAdded ? "إلغاء إضافة الحديث للحفظ" : "إضافة الحديث للحفظ"}
              className="w-full rounded-2xl py-2.5 text-sm font-arabic transition glass-hover press-effect"
              style={isAdded
                ? { background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: accentColor, border: "1px solid color-mix(in srgb, var(--accent) 36%, transparent)" }
                : { background: "var(--card)", border: "1px solid var(--stroke)", color: "var(--fg)" }
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
              className="rounded-full border border-[var(--stroke)] bg-[var(--card)] p-2 transition hover:bg-[var(--card-2)] disabled:opacity-30 press-effect"
              aria-label="البطاقة السابقة"
            >
              <ChevronRight size={20} aria-hidden="true" className="text-[var(--muted)]" />
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--muted)] font-arabic">
                {arNum(current.item.a)}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(current.item.t);
                    toast.success("تم النسخ");
                  } catch {
                    toast.error("تعذر النسخ");
                  }
                }}
                className="rounded-lg border border-[var(--stroke)] bg-[var(--card)] p-1.5 opacity-60 transition hover:opacity-100 press-effect"
                style={{ color: "var(--fg)" }}
                aria-label="نسخ الحديث"
              >
                <Copy size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  const text = `${current.item.t}\n\n• ATHAR أثر — ${bookTitle(current.bookKey)}`;
                  try {
                    if (navigator.share) { await navigator.share({ text }); }
                    else { await navigator.clipboard.writeText(text); toast.success("تم النسخ"); }
                  } catch {
                    try { await navigator.clipboard.writeText(text); toast.success("تم النسخ"); } catch { toast.error("تعذّر النسخ"); }
                  }
                }}
                className="rounded-lg border border-[var(--stroke)] bg-[var(--card)] p-1.5 opacity-60 transition hover:opacity-100 press-effect"
                style={{ color: "var(--fg)" }}
                aria-label="مشاركة الحديث"
              >
                <Share2 size={14} />
              </button>
            </div>
            <button type="button"
              onClick={() => { setCardIndex((i) => Math.min(currentCards.length - 1, i + 1)); setIsFlipped(false); }}
              disabled={cardIndex === currentCards.length - 1}
              className="rounded-full border border-[var(--stroke)] bg-[var(--card)] p-2 transition hover:bg-[var(--card-2)] disabled:opacity-30 press-effect"
              aria-label="البطاقة التالية"
            >
              <ChevronLeft size={20} aria-hidden="true" className="text-[var(--muted)]" />
            </button>
          </div>
        </div>
      )}

      {/* No pack loaded yet */}
      {!nawawi && viewMode === "add" && (
        <div className="relative z-10 flex flex-col items-center gap-3 py-16 text-[var(--muted)]">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          <p className="text-sm font-arabic">جارٍ التحميل…</p>
        </div>
      )}
      </div>
    </div>
  );
}

export default HadithMemoPage;
