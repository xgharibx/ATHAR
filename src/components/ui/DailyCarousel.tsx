import React from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Share2, Shuffle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DAILY_VERSES } from "@/data/dailyVerses";
import { HADITHS } from "@/data/hadiths";
import { DAILY_WISDOMS } from "@/data/dailyWisdom";
import { QURAN_VOCAB } from "@/data/quranVocab";
import { Button } from "@/components/ui/Button";
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
const ARRAY_LENGTHS = [DAILY_VERSES.length, HADITHS.length, DAILY_WISDOMS.length, QURAN_VOCAB.length] as const;

export function DailyCarousel({ dateKey }: { dateKey: string }) {
  const navigate = useNavigate();
  const [activeIdx, setActiveIdx] = React.useState(1);
  const pauseUntilRef = React.useRef<number>(0);
  const touchStartX = React.useRef<number>(0);
  // null = show daily item; number = user-shuffled index (resets on new dateKey)
  const [shuffleIdx, setShuffleIdx] = React.useState<[number | null, number | null, number | null, number | null]>([null, null, null, null]);
  const [spinSlide, setSpinSlide] = React.useState<number | null>(null);

  // Reset shuffles when day changes
  const prevDateKey = React.useRef(dateKey);
  if (prevDateKey.current !== dateKey) {
    prevDateKey.current = dateKey;
    setShuffleIdx([null, null, null, null]);
  }

  // Daily indices (deterministic per date)
  const dailyIdxs = React.useMemo<[number, number, number, number]>(() => {
    const v = dateIndex(dateKey, DAILY_VERSES.length, 77);
    const h = dateIndex(dateKey, HADITHS.length);
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
  const hadith    = HADITHS[activeIdxs[1]] ?? null;
  const wisdom    = DAILY_WISDOMS[activeIdxs[2]] ?? null;
  const vocabWord = QURAN_VOCAB[activeIdxs[3]] ?? null;

  const handleShuffle = React.useCallback((slideIdx: 0 | 1 | 2 | 3) => {
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
  }, [shuffleIdx, dailyIdxs]);

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

  // Auto-advance every 4 seconds
  React.useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() < pauseUntilRef.current) return;
      setActiveIdx((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    pauseUntilRef.current = Date.now() + 99999;
  }, []);

  const handleTouchEnd = React.useCallback((e: React.TouchEvent) => {
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    pauseUntilRef.current = Date.now() + 8000;
    if (Math.abs(delta) > 40) {
      setActiveIdx((prev) => {
        if (delta > 0) return Math.min(prev + 1, 3); // swipe left → next
        return Math.max(prev - 1, 0); // swipe right → prev
      });
    }
  }, []);

  return (
    <>
    <style>{`@keyframes spin-once { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    <Card className="p-0 overflow-hidden" role="region" aria-label="محتوى يومي" aria-roledescription="عرض دوار" tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); pauseUntilRef.current = Date.now() + 8000; setActiveIdx((p) => (p + 1) % 4); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); pauseUntilRef.current = Date.now() + 8000; setActiveIdx((p) => (p - 1 + 4) % 4); }
      }}>
      {/* Header label */}
      <div className="flex items-center justify-between px-4 pt-3 pb-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{SLIDE_LABELS[activeIdx]}</span>
          {shuffleIdx[activeIdx] !== null && (
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)" }}
            >
              عشوائي
            </span>
          )}
        </div>
        <span className="text-xs opacity-40">{shuffleIdx[activeIdx] !== null ? "اضغط ← للتجديد" : "يتجدد يومياً"}</span>
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
            width: "100%",
            transform: `translateX(${activeIdx * 100}%)`,
            transition: "transform 0.35s ease",
          }}
        >
          {/* Slide 1: آية اليوم */}
          <div id="carousel-slide-0" role="group" aria-roledescription="شريحة" aria-label="آية اليوم" style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>
            {verse ? (
              <>
                <div
                  className="text-base leading-10 text-right arabic-text font-medium"
                  style={{ color: "var(--fg)" }}
                >
                  {verse.arabic}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Button
                      className="press-effect text-xs h-7 px-3"
                      variant="secondary"
                      onClick={() => navigate(`/mushaf?surah=${verse.surahId}&ayah=${verse.ayahIndex}`)}
                    >
                      <BookOpen size={12} aria-hidden="true" />
                      اقرأ في سياقها
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

          {/* Slide 2: حديث اليوم */}
          <div id="carousel-slide-1" role="group" aria-roledescription="شريحة" aria-label="حديث اليوم" style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>
            {hadith ? (
              <>
                <div
                  className="text-base leading-9 text-right mb-2 font-medium arabic-text"
                  style={{ color: "var(--fg)" }}
                >
                  {hadith.arabic}
                </div>
                <div className="flex items-center gap-2 justify-between flex-wrap">
                  <button type="button"
                    onClick={() => handleShuffle(1)}
                    className="p-1.5 rounded-lg transition press-effect"
                    aria-label="حديث عشوائي"
                    title="حديث جديد"
                    style={{ color: shuffleIdx[1] !== null ? "var(--accent)" : undefined, opacity: shuffleIdx[1] !== null ? 1 : 0.55 }}
                  >
                    <Shuffle size={14} aria-hidden="true" style={spinSlide === 1 ? { animation: "spin-once 0.4s ease" } : undefined} />
                  </button>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button type="button"
                      onClick={() => copyShare(`${hadith.arabic}\n— ${hadith.narrator} • ${hadith.source}`)}
                      className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition"
                      aria-label="مشاركة الحديث"
                    >
                      <Share2 size={14} />
                    </button>
                    <span className="text-xs opacity-60">{hadith.narrator}</span>
                    <span className="h-1 w-1 rounded-full opacity-30" style={{ background: "var(--fg)" }} />
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                        color: "var(--accent)",
                      }}
                    >
                      {hadith.source}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm opacity-50 py-4 text-center">لا يوجد حديث</div>
            )}
          </div>

          {/* Slide 3: تدبر اليوم */}
          <div id="carousel-slide-2" role="group" aria-roledescription="شريحة" aria-label="تدبر اليوم" style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>
            <div
              className="text-base leading-9 text-right font-medium arabic-text"
              style={{ color: "var(--fg)" }}
            >
              {wisdom.text}
            </div>
            <div className="mt-2 flex items-center justify-between">
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

          {/* Slide 4: كلمة اليوم */}
          <div id="carousel-slide-3" role="group" aria-roledescription="شريحة" aria-label="كلمة اليوم" style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>
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
                <div className="mt-2 flex justify-start">
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
