/**
 * «حفظ الحديث»: flip cards with spaced repetition. Cards come from any book
 * (added from the reader) or from the two forties here; each rating shows
 * when the card will come back.
 * Route: /hadith/memo
 */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BrainCircuit, Check, CheckCircle, ChevronLeft, ChevronRight, Copy, Plus, Share2 } from "lucide-react";
import { useHadithPack, loadHadithPack } from "@/data/useHadithBook";
import { HADITH_BOOKS_STATIC, MEMO_MASTERED_DAYS, hadithRef, nextMemoCard, type HadithItem, type HadithPack } from "@/data/hadithTypes";
import { CARD, DAY, countAr, type CountForms } from "@/lib/arabicCount";
import { cleanHadithText, splitHadithText } from "@/lib/hadithText";
import { hadithNumberLabel } from "@/data/hadithNumbers";
import { useShallow } from "zustand/react/shallow";
import { useNoorStore } from "@/store/noorStore";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import toast from "react-hot-toast";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { arNum } from "@/lib/formatNumber";
import { shareOrCopy } from "@/lib/shareTargets";
import { writeClipboard } from "@/lib/nativeUI";


/* ------------------------------------------------------------------ */
/* Helpers                                                               */
/* ------------------------------------------------------------------ */

const RATING_LABELS: { rating: 0 | 1 | 2 | 3; label: string; color: string; bg: string }[] = [
  { rating: 0, label: "نسيته", color: "#ef4444", bg: "#ef444422" },
  { rating: 1, label: "صعب",   color: "#f59e0b", bg: "#f59e0b22" },
  { rating: 2, label: "جيد",   color: "#3b82f6", bg: "#3b82f622" },
  { rating: 3, label: "سهل",   color: "#10b981", bg: "#10b98122" },
];


const TIMES: CountForms = { one: "مرة واحدة", two: "مرتين", few: "مرات", many: "مرة" };

/** «اليوم»، «غدًا»، «بعد يومين»، «بعد ٥ أيام». */
function inDays(days: number): string {
  if (days <= 0) return "اليوم";
  if (days === 1) return "غدًا";
  if (days === 2) return "بعد يومين";
  return `بعد ${countAr(days, DAY)}`;
}

function daysUntil(iso: string, todayIso: string): number {
  return Math.round((Date.parse(`${iso}T00:00:00`) - Date.parse(`${todayIso}T00:00:00`)) / 86400000);
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
  const [deckBook, setDeckBook] = useState<"nawawi" | "qudsi">("nawawi");
  const { data: nawawi } = useHadithPack(deckBook); // the "add" tab browses one of the two forties
  const accentColor = "var(--accent)";

  const { hadithMemoCards, addHadithMemoCard, reviewHadithMemo } = useNoorStore(useShallow((s) => ({
    hadithMemoCards: s.hadithMemoCards,
    addHadithMemoCard: s.addHadithMemoCard,
    reviewHadithMemo: s.reviewHadithMemo,
  })));

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
    () => (nawawi?.hadiths ?? []).filter((item) => item.t.trim()).map((item) => ({ bookKey: deckBook, item })),
    [nawawi, deckBook],
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

  const masteredCount = allCards.filter(({ bookKey, item }) => {
    const c = hadithMemoCards[`${bookKey}:${item.n}`];
    return c && c.interval >= MEMO_MASTERED_DAYS;
  }).length;
  const nextDue = useMemo(() => {
    const upcoming = Object.values(hadithMemoCards).map((c) => c.due).filter((d) => d > today).sort();
    return upcoming[0] ? daysUntil(upcoming[0], today) : null;
  }, [hadithMemoCards, today]);

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
                <h1 className="text-lg font-bold">حفظ الحديث</h1>
              </div>
              <div className="text-xs opacity-60 mt-1 leading-5">تعود البطاقة إليك قبل أن تنساها، فيثبت الحديث بأقل تكرار.</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats row */}
      {Object.keys(hadithMemoCards).length > 0 && (
      <div className="relative z-10 mx-4 mt-4 mb-4 grid grid-cols-3 gap-3">
        {[
          { val: allCards.length, label: "في بطاقاتك" },
          { val: dueCards.length, label: "للمراجعة اليوم" },
          { val: masteredCount, label: "أتقنتها" },
        ].map(({ val, label }) => (
          <div
            key={label}
            className="relative overflow-hidden rounded-3xl py-3 text-center glass"
          >
            <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
            <p className="text-xl font-bold font-arabic" style={{ color: accentColor }}>{arNum(val)}</p>
            <p className="text-[10px] text-(--muted)">{label}</p>
          </div>
        ))}
      </div>
      )}

      {/* Tab bar */}
      <div
        role="tablist" aria-orientation="horizontal"
        aria-label="وضع البطاقات"
        className="relative z-10 mx-4 mt-4 mb-5 flex overflow-hidden rounded-2xl glass"
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
            {t === "due" ? `مراجعة اليوم${dueCards.length ? ` (${arNum(dueCards.length)})` : ""}` : "أضف من الأربعين"}
          </button>
        ))}
      </div>

      <div id="hadith-memo-content">
      {/* All reviewed today */}
      {viewMode === "due" && dueCards.length === 0 && (
        <div className="relative z-10 flex flex-col items-center gap-3 px-8 py-14 text-center">
          {allCards.length === 0 && Object.keys(hadithMemoCards).length === 0 ? (
            <>
              <BrainCircuit size={44} aria-hidden="true" style={{ color: accentColor }} />
              <p className="text-base font-bold font-arabic text-(--fg)">لم تضف بطاقات بعد</p>
              <p className="text-sm text-(--muted) font-arabic leading-7">ابدأ بأحاديث من الأربعين النووية أو القدسية، أو أضف أي حديث من زر البطاقة في صفحته.</p>
            </>
          ) : (
            <>
              <CheckCircle size={44} aria-hidden="true" style={{ color: accentColor }} />
              <p className="text-base font-bold font-arabic text-(--fg)">أحسنت، أنهيت مراجعة اليوم</p>
              <p className="text-sm text-(--muted) font-arabic">
                {nextDue != null ? `المراجعة القادمة ${inDays(nextDue)}` : "لا مراجعة قادمة"}
              </p>
            </>
          )}
          <button type="button"
            onClick={() => { setViewMode("add"); setCardIndex(0); setIsFlipped(false); }}
            className="mt-2 rounded-2xl px-6 py-2.5 text-sm font-arabic font-bold press-effect"
            style={{ background: accentColor, color: "var(--on-accent)" }}
          >
            {allCards.length ? "أضف المزيد" : "اختر من الأربعين"}
          </button>
        </div>
      )}

      {viewMode === "add" && (
        <div className="relative z-10 mx-4 mb-4 flex gap-2" role="radiogroup" aria-label="الكتاب">
          {([["nawawi", "الأربعون النووية"], ["qudsi", "الأربعون القدسية"]] as const).map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={deckBook === k}
              onClick={() => { setDeckBook(k); setCardIndex(0); setIsFlipped(false); }}
              className="flex-1 rounded-2xl border px-3 py-2 text-[13px]"
              style={deckBook === k ? { background: "color-mix(in srgb, var(--accent) 16%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)", color: accentColor, fontWeight: 700 } : { background: "var(--card)", borderColor: "var(--stroke)" }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Flip card area */}
      {current && (
        <div className="relative z-10 stack-y-4 px-4">
          {/* Progress bar */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-(--muted) font-arabic" aria-live="polite" aria-atomic="true">
              {arNum(cardIndex + 1)} من {countAr(currentCards.length, CARD)}
            </span>
            {cardState && cardState.reviews > 0 && (
              <span className="text-[11px] text-(--muted)">
                راجعتها {countAr(cardState.reviews, TIMES)}، وموعدها {inDays(daysUntil(cardState.due, today))}
              </span>
            )}
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={currentCards.length}
            aria-valuenow={cardIndex}
            aria-label="تقدم مراجعة البطاقات"
            className="h-1.5 w-full overflow-hidden rounded-full bg-(--card)"
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
                <p className="text-[10px] text-(--muted) mb-2 font-arabic">
                  {hadithRef(bookTitle(current.bookKey), current.item)}
                </p>
                {isnad ? (
                  <p className="text-sm font-arabic text-(--fg) opacity-60 leading-loose">{isnad}</p>
                ) : (
                  <p className="text-base font-arabic text-(--fg) leading-loose line-clamp-6">
                    {matn.slice(0, 200)}…
                  </p>
                )}
                <p className="mt-3 text-[11px] text-center text-(--muted) opacity-70">{isnad ? "تذكّر المتن، ثم اضغط لتراه" : "تذكّر تتمّته، ثم اضغط لتراه"}</p>
              </div>
            }
            back={
              <div dir="rtl">
                <p className="text-[10px] mb-2 font-arabic" style={{ color: accentColor }}>المتن</p>
                <p className="text-base font-arabic text-(--fg) leading-loose">
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
              <span className="inline-flex items-center gap-1.5">
                {isAdded ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
                {isAdded ? "في بطاقاتك" : "أضفه إلى بطاقاتك"}
              </span>
            </button>
          )}

          {/* Rating buttons (shown after flip) */}
          {isFlipped && (
            <div className="grid grid-cols-4 gap-2">
              {RATING_LABELS.map(({ rating, label, color, bg }) => {
                const after = nextMemoCard(cardState ?? { interval: 1, ease: 2.5, due: today, reviews: 0 }, rating).interval;
                return (
                  <button type="button"
                    key={rating}
                    onClick={() => handleRate(rating)}
                    className="rounded-2xl border py-2 text-sm font-bold font-arabic transition press-effect"
                    style={{ background: bg, color, borderColor: color + "44" }}
                  >
                    <span className="block">{label}</span>
                    <span className="block text-[10.5px] font-normal opacity-80">{inDays(after)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex items-center justify-between pt-1">
            <button type="button"
              onClick={() => { setCardIndex((i) => Math.max(0, i - 1)); setIsFlipped(false); }}
              disabled={cardIndex === 0}
              className="rounded-full border border-(--stroke) bg-(--card) p-2 transition hover:bg-(--card-2) disabled:opacity-30 press-effect"
              aria-label="البطاقة السابقة"
            >
              <ChevronRight size={20} aria-hidden="true" className="text-(--muted)" />
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-(--muted) font-arabic">
                {hadithNumberLabel(current.item)}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const systemConfirmed = await writeClipboard(cleanHadithText(current.item.t));
                    if (!systemConfirmed) toast.success("تم النسخ");
                  } catch {
                    toast.error("تعذر النسخ");
                  }
                }}
                className="rounded-lg border border-(--stroke) bg-(--card) p-1.5 opacity-60 transition hover:opacity-100 press-effect"
                style={{ color: "var(--fg)" }}
                aria-label="نسخ الحديث"
              >
                <Copy size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  const text = `${cleanHadithText(current.item.t)}\n\n${hadithRef(bookTitle(current.bookKey), current.item)}`;
                  try {
                    await shareOrCopy(text);
                  } catch {
                    try { const systemConfirmed = await writeClipboard(text); if (!systemConfirmed) toast.success("تم النسخ"); } catch { toast.error("تعذّر النسخ"); }
                  }
                }}
                className="rounded-lg border border-(--stroke) bg-(--card) p-1.5 opacity-60 transition hover:opacity-100 press-effect"
                style={{ color: "var(--fg)" }}
                aria-label="مشاركة الحديث"
              >
                <Share2 size={14} />
              </button>
            </div>
            <button type="button"
              onClick={() => { setCardIndex((i) => Math.min(currentCards.length - 1, i + 1)); setIsFlipped(false); }}
              disabled={cardIndex === currentCards.length - 1}
              className="rounded-full border border-(--stroke) bg-(--card) p-2 transition hover:bg-(--card-2) disabled:opacity-30 press-effect"
              aria-label="البطاقة التالية"
            >
              <ChevronLeft size={20} aria-hidden="true" className="text-(--muted)" />
            </button>
          </div>
        </div>
      )}

      {/* No pack loaded yet */}
      {!nawawi && viewMode === "add" && (
        <div className="relative z-10 flex flex-col items-center gap-3 py-16 text-(--muted)">
          <div className="w-6 h-6 border-2 border-(--accent) border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          <p className="text-sm font-arabic">جارٍ التحميل…</p>
        </div>
      )}
      </div>
    </div>
  );
}

export default HadithMemoPage;
