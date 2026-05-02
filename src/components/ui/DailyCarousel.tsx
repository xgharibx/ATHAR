import React from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DAILY_VERSES } from "@/data/dailyVerses";
import { HADITHS } from "@/data/hadiths";
import { getTodayWisdom } from "@/data/dailyWisdom";
import { Button } from "@/components/ui/Button";

function dateIndex(dateKey: string, length: number, offset = 0): number {
  if (length === 0) return -1;
  let hash = offset;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

const SLIDE_LABELS = ["آية اليوم", "حديث اليوم", "تدبر اليوم"] as const;

export function DailyCarousel({ dateKey }: { dateKey: string }) {
  const navigate = useNavigate();
  const [activeIdx, setActiveIdx] = React.useState(0);
  const pauseUntilRef = React.useRef<number>(0);
  const touchStartX = React.useRef<number>(0);

  const verse = React.useMemo(() => {
    if (!DAILY_VERSES.length) return null;
    return DAILY_VERSES[dateIndex(dateKey, DAILY_VERSES.length, 77)] ?? null;
  }, [dateKey]);

  const hadith = React.useMemo(() => {
    if (!HADITHS.length) return null;
    return HADITHS[dateIndex(dateKey, HADITHS.length)] ?? null;
  }, [dateKey]);

  const wisdom = React.useMemo(() => getTodayWisdom(dateKey), [dateKey]);

  const goTo = React.useCallback((idx: number) => {
    setActiveIdx(idx);
  }, []);

  // Auto-advance every 4 seconds
  React.useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() < pauseUntilRef.current) return;
      setActiveIdx((prev) => (prev + 1) % 3);
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
        if (delta > 0) return Math.min(prev + 1, 2); // swipe left → next
        return Math.max(prev - 1, 0); // swipe right → prev
      });
    }
  }, []);

  return (
    <Card className="p-0 overflow-hidden">
      {/* Header label */}
      <div className="flex items-center justify-between px-4 pt-3 pb-0">
        <span className="text-sm font-semibold">{SLIDE_LABELS[activeIdx]}</span>
        <span className="text-xs opacity-40">يتجدد يومياً</span>
      </div>

      {/* Slides — transform-based so each slide is always 100% of the card */}
      <div
        style={{ overflow: "hidden", width: "100%" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            transform: `translateX(${activeIdx * -100}%)`,
            transition: "transform 0.35s ease",
          }}
        >
          {/* Slide 1: آية اليوم */}
          <div style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>
            {verse ? (
              <>
                <div
                  className="text-base leading-10 text-right arabic-text font-medium"
                  style={{ color: "var(--fg)" }}
                >
                  {verse.arabic}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                  <Button
                    className="press-effect text-xs h-7 px-3"
                    variant="secondary"
                    onClick={() => navigate(`/mushaf?surah=${verse.surahId}&ayah=${verse.ayahIndex}`)}
                  >
                    <BookOpen size={12} />
                    اقرأ في سياقها
                  </Button>
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
              </>
            ) : (
              <div className="text-sm opacity-50 py-4 text-center">لا توجد آية</div>
            )}
          </div>

          {/* Slide 2: حديث اليوم */}
          <div style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>
            {hadith ? (
              <>
                <div
                  className="text-base leading-9 text-right mb-2 font-medium arabic-text"
                  style={{ color: "var(--fg)" }}
                >
                  {hadith.arabic}
                </div>
                <div className="flex items-center gap-2 justify-end flex-wrap">
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
              </>
            ) : (
              <div className="text-sm opacity-50 py-4 text-center">لا يوجد حديث</div>
            )}
          </div>

          {/* Slide 3: تدبر اليوم */}
          <div style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>
            <div
              className="text-base leading-9 text-right font-medium arabic-text"
              style={{ color: "var(--fg)" }}
            >
              {wisdom.text}
            </div>
            <div className="mt-2 flex justify-end">
              <span className="text-xs opacity-55 arabic-text">{wisdom.source}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 pb-3">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            type="button"
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
  );
}
