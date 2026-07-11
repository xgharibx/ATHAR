import React from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, BookOpenText, ChevronDown, Share2, Shuffle, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DAILY_VERSES } from "@/data/dailyVerses";
import { DAILY_WISDOMS } from "@/data/dailyWisdom";
import { QURAN_VOCAB } from "@/data/quranVocab";
import { Button } from "@/components/ui/Button";
import { fetchDailyHadith, fetchRandomHadith, type SharhHadith } from "@/lib/hadithSharhAPI";
import { syncSunnahWidget } from "@/lib/widgetDataBridge";
import toast from "react-hot-toast";

function dateIndex(dateKey: string, length: number, offset = 0): number {
  if (length === 0) return -1;
  let hash = offset;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

/** Pick a random index that differs from `current` */
function randomOtherIdx(current: number, length: number): number {
  if (length <= 1) return 0;
  let next: number;
  do { next = Math.floor(Math.random() * length); } while (next === current);
  return next;
}

const SLIDE_LABELS = ["آية اليوم", "حديث اليوم", "تدبر اليوم", "كلمة اليوم"] as const;
const ARRAY_LENGTHS = [DAILY_VERSES.length, 1, DAILY_WISDOMS.length, QURAN_VOCAB.length] as const;

export function DailyCarousel({ dateKey }: { dateKey: string }) {
  const navigate = useNavigate();

  const [activeIdx, setActiveIdx] = React.useState(1);
  const pauseUntilRef = React.useRef<number>(0);
  const touchStartX = React.useRef<number>(0);
  // null = show daily item; number = user-shuffled index (resets on new dateKey)
  const [shuffleIdx, setShuffleIdx] = React.useState<[number | null, number | null, number | null, number | null]>([null, null, null, null]);
  const [spinSlide, setSpinSlide] = React.useState<number | null>(null);

  // حديث اليوم — a real hadeethenc.com record (text + grade + attribution +
  // explanation all from one source), picked deterministically per day. No
  // AI generation and no cross-referencing to a second corpus involved.
  const [dailyHadith, setDailyHadith] = React.useState<SharhHadith | null>(null);
  const [hadithOverride, setHadithOverride] = React.useState<SharhHadith | null>(null);
  const [hadithLoading, setHadithLoading] = React.useState(true);
  const [showHadithExplanation, setShowHadithExplanation] = React.useState(false);
  const hadith = hadithOverride ?? dailyHadith;

  React.useEffect(() => {
    let alive = true;
    setHadithLoading(true);
    fetchDailyHadith(dateKey)
      .then((h) => {
        if (!alive) return;
        setDailyHadith(h);
        // Mirror the exact same record to the home-screen widget — same
        // text, attribution, grade, nothing re-derived.
        if (h) void syncSunnahWidget({ id: h.id, hadeeth: h.hadeeth, attribution: h.attribution, grade: h.grade });
      })
      .finally(() => { if (alive) setHadithLoading(false); });
    return () => { alive = false; };
  }, [dateKey]);

  // Reset shuffles when day changes
  const prevDateKey = React.useRef(dateKey);
  if (prevDateKey.current !== dateKey) {
    prevDateKey.current = dateKey;
    setShuffleIdx([null, null, null, null]);
    setHadithOverride(null);
    setShowHadithExplanation(false);
  }

  // Daily indices (deterministic per date)
  const dailyIdxs = React.useMemo<[number, number, number, number]>(() => {
    const v = dateIndex(dateKey, DAILY_VERSES.length, 77);
    const h = 0;
    let wHash = 0;
    for (let i = 0; i < dateKey.length; i++) wHash = (wHash * 31 + dateKey.charCodeAt(i)) >>> 0;
    const w = DAILY_WISDOMS.length ? wHash % DAILY_WISDOMS.length : 0;
    let kHash = 0;
    for (let i = 0; i < dateKey.length; i++) kHash = (kHash * 31 + dateKey.charCodeAt(i)) >>> 0;
    const k = QURAN_VOCAB.length ? kHash % QURAN_VOCAB.length : 0;
    return [v, h, w, k];
  }, [dateKey]);

  // Active indices: shuffled override OR daily
  const activeIdxs = shuffleIdx.map((s, i) => s ?? dailyIdxs[i]) as [number, number, number, number];

  const verse     = DAILY_VERSES[activeIdxs[0]] ?? null;
  const wisdom    = DAILY_WISDOMS[activeIdxs[2]] ?? null;
  const vocabWord = QURAN_VOCAB[activeIdxs[3]] ?? null;

  const handleShuffle = React.useCallback((slideIdx: 0 | 1 | 2 | 3) => {
    if (slideIdx === 1) {
      setSpinSlide(slideIdx);
      setTimeout(() => setSpinSlide(null), 400);
      pauseUntilRef.current = Date.now() + 15000;
      setShowHadithExplanation(false);
      setHadithLoading(true);
      void fetchRandomHadith(hadith?.id).then((h) => { setHadithOverride(h); setHadithLoading(false); });
      return;
    }

    const current = shuffleIdx[slideIdx] ?? dailyIdxs[slideIdx];
    const next = randomOtherIdx(current, ARRAY_LENGTHS[slideIdx]);
    setShuffleIdx((prev) => {
      const copy = [...prev] as typeof shuffleIdx;
      copy[slideIdx] = next;
      return copy;
    });
    setSpinSlide(slideIdx);
    setTimeout(() => setSpinSlide(null), 400);
    // Pause auto-advance for 15 s after shuffle
    pauseUntilRef.current = Date.now() + 15000;
  }, [shuffleIdx, dailyIdxs, hadith]);

  const copyShare = React.useCallback(async (text: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ text: text + "\n\n• ATHAR أثر" });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("تم النسخ");
      }
    } catch {
      try { await navigator.clipboard.writeText(text); toast.success("تم النسخ"); } catch { toast.error("تعذّر النسخ"); }
    }
  }, []);

  const goTo = React.useCallback((idx: number) => {
    setActiveIdx(idx);
  }, []);

  const goNext = React.useCallback(() => {
    setActiveIdx((prev) => (prev + 1) % 4);
  }, []);

  const goPrev = React.useCallback(() => {
    setActiveIdx((prev) => (prev - 1 + 4) % 4);
  }, []);

  // Auto-advance every 4 seconds
  React.useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() < pauseUntilRef.current) return;
      goNext();
    }, 4000);
    return () => clearInterval(timer);
  }, [goNext]);

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    pauseUntilRef.current = Date.now() + 99999;
  }, []);

  const handleTouchEnd = React.useCallback((e: React.TouchEvent) => {
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    pauseUntilRef.current = Date.now() + 8000;
    if (Math.abs(delta) > 40) {
      if (delta > 0) goNext(); // swipe left → next
      else goPrev(); // swipe right → prev
    }
  }, [goNext, goPrev]);

  return (
    <>
    <style>{`@keyframes spin-once { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    <Card className="p-0 overflow-hidden" role="region" aria-label="محتوى يومي" aria-roledescription="عرض دوار" tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); pauseUntilRef.current = Date.now() + 8000; goNext(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); pauseUntilRef.current = Date.now() + 8000; goPrev(); }
      }}>
      {/* Header label */}
      <div className="flex items-center justify-between px-4 pt-3 pb-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{SLIDE_LABELS[activeIdx]}</span>
          {(activeIdx === 1 ? hadithOverride !== null : shuffleIdx[activeIdx] !== null) && (
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)" }}
            >
              عشوائي
            </span>
          )}
        </div>
        <span className="text-xs opacity-40">{(activeIdx === 1 ? hadithOverride !== null : shuffleIdx[activeIdx] !== null) ? "اضغط ← للتجديد" : "يتجدد يومياً"}</span>
      </div>

      {/* Slides — transform-based so each slide is always 100% of the card */}
      <div
        style={{ overflow: "hidden", width: "100%" }}
        aria-live="polite"
        aria-atomic="true"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            display: "flex",
            direction: "ltr",
            width: "100%",
            transform: `translateX(-${activeIdx * 100}%)`,
            transition: "transform 0.35s ease",
          }}
        >
          {/* Slide 1: آية اليوم */}
          <div id="carousel-slide-0" role="group" aria-roledescription="شريحة" aria-label="آية اليوم" style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>
            {verse ? (
              <>
                <div
                  className="text-base leading-10 text-right arabic-text font-medium max-h-44 overflow-y-auto pr-1"
                  style={{ color: "var(--fg)" }}
                >
                  {verse.arabic}
                </div>
                <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Button
                      className="press-effect text-xs h-7 px-3"
                      variant="secondary"
                      onClick={() => navigate(`/mushaf?surah=${verse.surahId}&ayah=${verse.ayahIndex}`)}
                    >
                      <BookOpen size={12} aria-hidden="true" />
                      اقرأ في سياقها
                    </Button>
                    <Button
                      className="press-effect text-xs h-7 px-3"
                      variant="secondary"
                      onClick={() => navigate(`/companion?ask=${encodeURIComponent(
                        `تدبّر معي هذه الآية: اشرحها شرحًا ميسرًا مع سبب النزول إن صحّ، وثلاث فوائد عملية ليومي:\n﴿${verse.arabic.slice(0, 500)}﴾ — ${verse.surahName} (${verse.ayahIndex})`
                      )}`)}
                    >
                      <Sparkles size={12} aria-hidden="true" />
                      تدبّر بالذكاء
                    </Button>
                    <button type="button"
                      onClick={() => handleShuffle(0)}
                      className="p-1.5 rounded-lg transition press-effect"
                      aria-label="آية عشوائية"
                      title="آية جديدة"
                      style={{ color: shuffleIdx[0] !== null ? "var(--accent)" : undefined, opacity: shuffleIdx[0] !== null ? 1 : 0.55 }}
                    >
                      <Shuffle size={14} aria-hidden="true" style={spinSlide === 0 ? { animation: "spin-once 0.4s ease" } : undefined} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button type="button"
                      onClick={() => copyShare(`${verse.arabic}\n— ${verse.surahName} ﴿${verse.ayahIndex}﴾`)}
                      className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition"
                      aria-label="مشاركة الآية"
                    >
                      <Share2 size={14} />
                    </button>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                        color: "var(--accent)",
                      }}
                    >
                      {verse.surahName} ﴿{verse.ayahIndex}﴾
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm opacity-50 py-4 text-center">لا توجد آية</div>
            )}
          </div>

          {/* Slide 2: حديث اليوم — text, grade, attribution, and explanation
              all come from the same hadeethenc.com record; no AI involved. */}
          <div id="carousel-slide-1" role="group" aria-roledescription="شريحة" aria-label="حديث اليوم" style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>
            {hadith ? (
              <>
                <div
                  className="text-base leading-9 text-right mb-2 font-medium arabic-text max-h-44 overflow-y-auto pr-1"
                  style={{ color: "var(--fg)" }}
                >
                  {hadith.hadeeth}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}
                  >
                    {hadith.attribution}
                  </span>
                  {hadith.grade ? (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "color-mix(in srgb, var(--ok) 16%, transparent)", color: "var(--ok)" }}>
                      {hadith.grade}
                    </span>
                  ) : null}
                </div>

                {hadith.explanation ? (
                  <button type="button"
                    onClick={() => setShowHadithExplanation((v) => !v)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 mb-2 text-start transition press-effect"
                    style={{ background: "var(--card-2)" }}
                  >
                    <span className="flex items-center gap-1.5 text-xs font-semibold">
                      <BookOpenText size={13} aria-hidden="true" />
                      الشرح
                    </span>
                    <ChevronDown size={14} aria-hidden="true" style={{ transform: showHadithExplanation ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
                  </button>
                ) : null}
                {showHadithExplanation && hadith.explanation ? (
                  <div className="text-sm leading-7 mb-2 max-h-40 overflow-y-auto rounded-xl p-2.5" style={{ color: "var(--muted)", background: "var(--card-2)" }}>
                    {hadith.explanation}
                  </div>
                ) : null}

                <div className="flex items-center gap-2 justify-between flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button type="button"
                      onClick={() => handleShuffle(1)}
                      className="p-1.5 rounded-lg transition press-effect"
                      aria-label="حديث عشوائي"
                      title="حديث جديد"
                      style={{ color: hadithOverride !== null ? "var(--accent)" : undefined, opacity: hadithOverride !== null ? 1 : 0.55 }}
                    >
                      <Shuffle size={14} aria-hidden="true" style={spinSlide === 1 ? { animation: "spin-once 0.4s ease" } : undefined} />
                    </button>
                    <Button
                      className="press-effect text-xs h-7 px-3"
                      variant="secondary"
                      onClick={() => navigate(`/library/sharh?h=${hadith.id}`)}
                    >
                      <BookOpenText size={12} aria-hidden="true" />
                      المصدر الكامل
                    </Button>
                  </div>
                  <button type="button"
                    onClick={() => copyShare(`${hadith.hadeeth}\n— ${hadith.attribution} • ${hadith.grade}`)}
                    className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition"
                    aria-label="مشاركة الحديث"
                  >
                    <Share2 size={14} />
                  </button>
                </div>
              </>
            ) : (
              <div className="text-sm opacity-50 py-4 text-center">{hadithLoading ? "جارٍ تحميل الحديث…" : "تعذّر تحميل الحديث"}</div>
            )}
          </div>

          {/* Slide 3: تدبر اليوم */}
          <div id="carousel-slide-2" role="group" aria-roledescription="شريحة" aria-label="تدبر اليوم" style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>
            <div
              className="text-base leading-9 text-right font-medium arabic-text max-h-44 overflow-y-auto pr-1"
              style={{ color: "var(--fg)" }}
            >
              {wisdom.text}
            </div>
            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button type="button"
                  onClick={() => copyShare(`${wisdom.text}\n— ${wisdom.source}`)}
                  className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition"
                  aria-label="مشاركة التدبر"
                >
                  <Share2 size={14} />
                </button>
                <button type="button"
                  onClick={() => handleShuffle(2)}
                  className="p-1.5 rounded-lg transition press-effect"
                  aria-label="تدبر عشوائي"
                  title="تدبر جديد"
                  style={{ color: shuffleIdx[2] !== null ? "var(--accent)" : undefined, opacity: shuffleIdx[2] !== null ? 1 : 0.55 }}
                >
                  <Shuffle size={14} aria-hidden="true" style={spinSlide === 2 ? { animation: "spin-once 0.4s ease" } : undefined} />
                </button>
              </div>
              <span className="text-xs opacity-55 arabic-text">{wisdom?.source}</span>
            </div>
          </div>

          {/* Slide 4: كلمة اليوم — content is naturally shorter than the other
              slides (a single word + meaning), but the carousel track sizes
              every slide to the tallest one, so center it instead of leaving
              it top-aligned with a large dead gap underneath. */}
          <div id="carousel-slide-3" role="group" aria-roledescription="شريحة" aria-label="كلمة اليوم" className="flex flex-col justify-center" style={{ flex: "0 0 100%", width: "100%", minHeight: "100%", padding: "0.75rem 1rem 1rem" }}>
            {vocabWord ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/quran-vocab")}
                  className="w-full text-right"
                  aria-label="انتقل إلى مفردات القرآن"
                >
                  <div
                    className="text-3xl font-bold mb-1.5 leading-tight arabic-text"
                    style={{ color: "var(--accent)" }}
                    lang="ar"
                  >
                    {vocabWord.arabic}
                  </div>
                  <div className="text-sm font-medium opacity-75 mb-2">{vocabWord.meaning}</div>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}
                    >
                      صف {vocabWord.id} • تردد {vocabWord.frequency.toLocaleString("ar-EG")}×
                    </span>
                    <span className="text-[10px] opacity-40">اضغط للتعلم ❬</span>
                  </div>
                </button>
                <div className="pt-2 flex justify-start">
                  <button type="button"
                    onClick={() => handleShuffle(3)}
                    className="p-1.5 rounded-lg transition press-effect"
                    aria-label="كلمة عشوائية"
                    title="كلمة جديدة"
                    style={{ color: shuffleIdx[3] !== null ? "var(--accent)" : undefined, opacity: shuffleIdx[3] !== null ? 1 : 0.55 }}
                  >
                    <Shuffle size={14} aria-hidden="true" style={spinSlide === 3 ? { animation: "spin-once 0.4s ease" } : undefined} />
                  </button>
                </div>
              </>
            ) : (
              <div className="text-sm opacity-50 py-4 text-center">لا توجد كلمة</div>
            )}
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 pb-3" role="tablist" aria-orientation="horizontal" aria-label="تنقل بين الشرائح">
        {[0, 1, 2, 3].map((i) => (
          <button type="button"
            key={i}
            role="tab"
            aria-controls={`carousel-slide-${i}`}
            aria-selected={activeIdx === i}
            aria-label={SLIDE_LABELS[i]}
            onClick={() => goTo(i)}
            className="rounded-full transition-all"
            style={{
              width: activeIdx === i ? "20px" : "6px",
              height: "6px",
              background: "var(--accent)",
              opacity: activeIdx === i ? 1 : 0.3,
            }}
          />
        ))}
      </div>
    </Card>
    </>
  );
}
