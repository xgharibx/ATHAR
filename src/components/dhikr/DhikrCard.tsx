import * as React from "react";
import { BookOpen, CheckCircle2, Copy, ExternalLink, Heart, ImageDown, Minus, RotateCcw, Share2, ZoomIn, ZoomOut } from "lucide-react";
import { motion } from "framer-motion";

import { cn, clamp } from "@/lib/utils";
import { formatLeadingIstiadhahBasmalah, normalizeText, stripDiacritics } from "@/lib/arabic";
import { renderDhikrPosterBlob } from "@/lib/sharePoster";
import { useNoorStore } from "@/store/noorStore";
import { coerceCount, type DhikrItem } from "@/data/types";
import { IconButton } from "@/components/ui/IconButton";
import { isDailySection } from "@/lib/dailySections";

// Lazy-load heavy libraries — only imported when actually needed
// Note: GSAP removed from hot path — ring + ripple now use CSS transitions
const getConfetti = () => import("canvas-confetti").then((m) => m.default ?? m);
const getToPng = () => import("html-to-image").then((m) => m.toPng);
import toast from "react-hot-toast";

// D8: parse hadith grade from benefit text
function parseHadithGrade(benefit: string): { grade: string; color: string } | null {
  if (!benefit) return null;
  if (benefit.includes('متفق عليه')) return { grade: 'متفق عليه', color: 'var(--ok)' };
  if (benefit.includes('صحيح')) return { grade: 'صحيح', color: 'var(--ok)' };
  if (benefit.includes('حسن')) return { grade: 'حسن', color: '#f59e0b' };
  if (benefit.includes('ضعيف')) return { grade: 'ضعيف', color: '#ef4444' };
  return null;
}

export function DhikrCard(props: {
  sectionId: string;
  index: number;
  item: DhikrItem;
  autoFocus?: boolean;
  totalItems?: number;
  onComplete?: () => void;
  focusMode?: boolean;
}) {
  const { sectionId, index, item, focusMode } = props;

  const key = `${sectionId}:${index}`;
  const prefs = useNoorStore((s) => s.prefs);
  const progress = useNoorStore((s) => Math.max(0, Number(s.progress[key]) || 0));
  const increment = useNoorStore((s) => s.increment);
  const decrement = useNoorStore((s) => s.decrement);
  const resetItem = useNoorStore((s) => s.resetItem);
  const toggleFavorite = useNoorStore((s) => s.toggleFavorite);
  const fav = useNoorStore((s) => !!s.favorites[key]);
  const lastCelebrationAt = useNoorStore((s) => s.lastCelebrationAt);
  const setLastCelebrationAt = useNoorStore((s) => s.setLastCelebrationAt);

  const target = coerceCount(item.count);
  const current = clamp(progress, 0, target);
  const remaining = Math.max(0, target - current);
  const done = current >= target;
  const isDailyLockedItem = isDailySection(sectionId) && done;

  const cardRef = React.useRef<HTMLDivElement>(null);
  const ringRef = React.useRef<SVGCircleElement>(null);
  const swipeRef = React.useRef({ x: 0, y: 0, active: false });
  // Throttle per-tap theme confetti (only every Nth tap on mobile)
  const tapCountRef = React.useRef(0);
  const [swipeHint, setSwipeHint] = React.useState(false);
  const [isLongPressing, setIsLongPressing] = React.useState(false);
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = React.useRef(true);
  React.useEffect(() => () => {
    mountedRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  }, []);
  const [confirmItemReset, setConfirmItemReset] = React.useState(false);
  // D5: per-card local font scale
  const [localFontScale, setLocalFontScale] = React.useState(1.0);
  const milestonesHit = React.useRef<Set<number>>(new Set([
    ...(current >= target * 0.25 ? [0.25] : []),
    ...(current >= target * 0.5 ? [0.5] : []),
    ...(current >= target * 0.75 ? [0.75] : []),
  ]));

  // Milestone celebrations at 25%, 50%, 75%
  React.useEffect(() => {
    if (!target || done) return;
    const pct = current / target;
    const milestones: Array<[number, string, string]> = [
      [0.25, "ربع الطريق 🌟", "⭐"],
      [0.5,  "نصف الطريق ✨", "✨"],
      [0.75, "ثلاثة أرباع الطريق 🔥", "🔥"],
    ];
    for (const [m, label, icon] of milestones) {
      if (pct >= m && !milestonesHit.current.has(m)) {
        milestonesHit.current.add(m);
        toast(label, { icon, duration: 2000 });
        if (prefs.enableHaptics && navigator.vibrate) navigator.vibrate([15, 8, 15]);
      }
    }
  }, [current, target, done, prefs.enableHaptics]);

  // Swipe-to-count gesture handler
  const onSwipeTouchStart = (e: React.TouchEvent) => {
    if (done || isDailyLockedItem) return;
    swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, active: true };
    // Start long-press timer for copy
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    setIsLongPressing(true);
    longPressTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setIsLongPressing(false);
      void doCopy();
      if (navigator.vibrate) navigator.vibrate([20, 10, 20]);
    }, 600);
  };
  const onSwipeTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsLongPressing(false);
    if (!swipeRef.current.active || done || isDailyLockedItem) return;
    swipeRef.current.active = false;
    const dx = e.changedTouches[0].clientX - swipeRef.current.x;
    const dy = e.changedTouches[0].clientY - swipeRef.current.y;
    if (Math.abs(dx) > 80 && Math.abs(dy) < 50) {
      if (dx > 0) {
        // De7: Right swipe → complete all remaining
        const toAdd = target - current;
        if (toAdd > 0) {
          for (let i = 0; i < toAdd; i++) increment({ sectionId, index, target });
        }
        if (navigator.vibrate) navigator.vibrate([15, 10, 15]);
        toast.success("✓ تم إتمام الذكر", { duration: 1500 });
        if (cardRef.current) {
          const el = cardRef.current;
          el.style.transition = "transform 0.12s";
          el.style.transform = "translateX(10px)";
          setTimeout(() => { el.style.transform = ""; el.style.transition = ""; }, 180);
        }
      } else {
        // De7: Left swipe → toggle favorite
        toggleFavorite(sectionId, index);
        if (navigator.vibrate) navigator.vibrate(10);
        toast(fav ? "💔 أُزيل من المفضلة" : "❤️ أُضيف إلى المفضلة", { duration: 1500 });
        if (cardRef.current) {
          const el = cardRef.current;
          el.style.transition = "transform 0.12s";
          el.style.transform = "translateX(-10px)";
          setTimeout(() => { el.style.transform = ""; el.style.transition = ""; }, 180);
        }
      }
    } else if (Math.abs(dx) > 55 && Math.abs(dy) < 45) {
      // Shorter swipe → regular count
      onCount();
      if (cardRef.current) {
        const el = cardRef.current;
        el.style.transition = "transform 0.12s";
        el.style.transform = dx > 0 ? "translateX(6px)" : "translateX(-6px)";
        setTimeout(() => { el.style.transform = ""; el.style.transition = ""; }, 160);
      }
    }
  };

  // Show swipe hint once
  React.useEffect(() => {
    if (done) return;
    const key = "noor_swipe_hint_shown";
    if (!localStorage.getItem(key)) {
      const t1 = setTimeout(() => setSwipeHint(true), 1200);
      const t2 = setTimeout(() => { setSwipeHint(false); localStorage.setItem(key, "1"); }, 4000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, []);

  // Pre-warm confetti module during idle so first celebration is instant
  React.useEffect(() => {
    const tid = window.setTimeout(() => { void getConfetti(); }, 2000);
    return () => clearTimeout(tid);
  }, []);

  // Celebrate on completion (throttled)
  React.useEffect(() => {
    if (!done) return;
    const now = Date.now();
    if (now - lastCelebrationAt < 2500) return;
    setLastCelebrationAt(now);

    getConfetti().then((c) => c({
      particleCount: 70,
      spread: 70,
      startVelocity: 24,
      scalar: 0.9,
      origin: { y: 0.9 }
    }));
  }, [done]);

  // Auto-scroll / highlight when focused from search
  React.useEffect(() => {
    if (!props.autoFocus || !cardRef.current) return;
    cardRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    const el = cardRef.current;
    el.classList.add("card-search-focus");
    el.addEventListener("animationend", () => el.classList.remove("card-search-focus"), { once: true });
  }, [props.autoFocus]);

  const displayText = React.useMemo(() => {
    const t = normalizeText(item.text);
    const base = prefs.stripDiacritics ? stripDiacritics(t) : t;
    return formatLeadingIstiadhahBasmalah(base);
  }, [item.text, prefs.stripDiacritics]);
  const sourceUrl = typeof item.source_url === "string" && item.source_url.trim().length > 0 ? item.source_url.trim() : "";
  const sourceLabel = (item.source_label || item.source || (sourceUrl ? "فتح المصدر" : "")).trim();

  const onCount = () => {
    const next = increment({ sectionId, index, target });
    tapCountRef.current++;
    
    // Haptic feedback
    if (prefs.enableHaptics && navigator.vibrate) {
      navigator.vibrate(12);
    }
    
    // Micro ripple — pure CSS, zero JS overhead
    if (cardRef.current) {
      const el = cardRef.current;
      el.classList.remove('dhikr-tap-pulse');
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      void el.offsetWidth; // force reflow to restart animation
      el.classList.add('dhikr-tap-pulse');
    }
    
    // Theme-Specific Particles — throttled to every 6th tap to stay smooth on mobile
    if (tapCountRef.current % 6 === 0) {
      if (prefs.theme === "roses") {
        getConfetti().then((c) => c({
          particleCount: 6,
          spread: 40,
          startVelocity: 14,
          scalar: 0.7,
          colors: ['#fb7185', '#f43f5e', '#ffe4e6'],
          origin: { y: 0.8 },
          ticks: 70,
          gravity: 0.5,
        }));
      } else if (prefs.theme === "bees") {
        getConfetti().then((c) => c({
          particleCount: 4,
          spread: 55,
          startVelocity: 18,
          scalar: 0.6,
          colors: ['#fbbf24', '#f59e0b', '#000000'],
          shapes: ['circle'],
          origin: { y: 0.8 },
          gravity: 0.8
        }));
      }
    }

    // Completion confetti
    if (next === target) {
      // Haptic + auto-advance signal after a short delay
      if (prefs.enableHaptics && navigator.vibrate) navigator.vibrate([15, 8, 15]);
      if (prefs.autoAdvanceDhikr && props.onComplete) {
        setTimeout(() => { if (mountedRef.current) props.onComplete?.(); }, 480);
      }
    }
  };

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayText);
      toast.success("تم النسخ");
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  const doShareText = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: displayText });
      } else {
        await doCopy();
        toast("المشاركة غير مدعومة — تم النسخ بدلًا من ذلك.");
      }
    } catch {
      // ignore
    }
  };

  const doShareImage = async () => {
    try {
      const poster = await renderDhikrPosterBlob({
        text: displayText,
        subtitle: `العدد: ${target}`,
        footerAppName: "ATHAR • أثر",
        footerUrl: "xgharibx.github.io/ATHAR"
      });
      const file = new File([poster], "athar-dhikr.png", { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "ATHAR" });
        return;
      }

      const url = URL.createObjectURL(poster);
      const a = document.createElement("a");
      a.href = url;
      a.download = "athar-dhikr.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      // Fallback: screenshot the card
      try {
        if (!cardRef.current) return;
        const toPng = await getToPng();
        const png = await toPng(cardRef.current, { pixelRatio: 2 });
        const a = document.createElement("a");
        a.href = png;
        a.download = "athar-dhikr.png";
        a.click();
      } catch {
        toast.error("تعذر مشاركة الصورة");
      }
    }
  };

  const radius = 22;
  const circumference = 2 * Math.PI * radius;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "glass-strong rounded-3xl border border-[var(--stroke)] overflow-hidden cv-auto glass-hover",
        done && "border-[color-mix(in_srgb,var(--ok)_25%,transparent)]"
      )}
    >
      <div className="dhikr-card-stars absolute inset-0 pointer-events-none" />
      <div className="p-4 md:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          {!focusMode && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <IconButton aria-label="نسخ الذكر" onClick={doCopy}>
              <Copy size={16} aria-hidden="true" className="opacity-80" />
            </IconButton>

            <IconButton aria-label="مشاركة النص" onClick={doShareText}>
              <Share2 size={16} aria-hidden="true" className="opacity-80" />
            </IconButton>

            <IconButton aria-label="مشاركة كصورة" onClick={doShareImage}>
              <ImageDown size={16} aria-hidden="true" className="opacity-80" />
            </IconButton>

            {/* D5: per-card font scale */}
            <IconButton
              aria-label="تصغير الخط"
              onClick={() => setLocalFontScale((s) => Math.max(0.65, +(s - 0.15).toFixed(2)))}
              className={cn(localFontScale <= 0.65 && "opacity-30 pointer-events-none")}
            >
              <ZoomOut size={14} aria-hidden="true" className="opacity-80" />
            </IconButton>
            <IconButton
              aria-label="تكبير الخط"
              onClick={() => setLocalFontScale((s) => Math.min(2.1, +(s + 0.15).toFixed(2)))}
              className={cn(localFontScale >= 2.1 && "opacity-30 pointer-events-none")}
            >
              <ZoomIn size={14} aria-hidden="true" className="opacity-80" />
            </IconButton>

            <IconButton
              aria-label="مفضلة"
              aria-pressed={fav}
              onClick={() => toggleFavorite(sectionId, index)}
              className={cn(fav && "bg-accent-14 border-accent-24")}
            >
              <Heart size={16} aria-hidden="true" className={cn(fav ? "text-[var(--accent)]" : "opacity-80")} />
            </IconButton>
            {sourceUrl ? (
              <IconButton aria-label="فتح المصدر" onClick={() => window.open(sourceUrl, "_blank", "noopener,noreferrer")}>
                <ExternalLink size={16} aria-hidden="true" className="opacity-80" />
              </IconButton>
            ) : null}
          </div>
          )}
          <div className="flex flex-col items-end gap-1.5 self-center shrink-0">
            {item.minimal ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-ok-25 bg-ok-10 px-2 py-1 text-[10px] font-semibold text-[var(--ok)]">
                <BookOpen size={11} aria-hidden="true" />
                أقل القليل
              </span>
            ) : null}
            {props.totalItems != null && (
              <div className="text-xs tabular-nums opacity-35 leading-tight text-end">
                {index + 1}/{props.totalItems}
              </div>
            )}
          </div>
        </div>

        {sourceLabel && !sourceUrl ? (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--stroke)] bg-[var(--card)] px-3 py-1.5 text-[11px] opacity-65">
            <BookOpen size={12} aria-hidden="true" />
            <span>{sourceLabel}</span>
          </div>
        ) : null}
        {sourceLabel && sourceUrl ? (
          <button type="button"
            onClick={() => window.open(sourceUrl, "_blank", "noopener,noreferrer")}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent-20 bg-accent-10 px-3 py-1.5 text-[11px] font-semibold text-[var(--accent)] transition hover:bg-accent-14"
          >
            <ExternalLink size={12} aria-hidden="true" />
            <span>{sourceLabel}</span>
          </button>
        ) : null}

        {/* Text + swipe zone */}
        <div
          className={cn("mt-4 arabic-text dhikr-flow select-none relative", isLongPressing && "long-press-active")}
          style={{ fontSize: `${prefs.fontScale * localFontScale}rem`, lineHeight: prefs.lineHeight }}
          onTouchStart={onSwipeTouchStart}
          onTouchEnd={onSwipeTouchEnd}
        >
          {displayText}
          {swipeHint && !done && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-[var(--card-2)] backdrop-blur-sm rounded-2xl px-4 py-2 text-sm text-[var(--fg)] flex items-center gap-2 swipe-hint-anim">
                <span className="text-lg">←</span>
                <span>اسحب للعدّ</span>
                <span className="text-lg">→</span>
              </div>
            </div>
          )}
        </div>

        {/* Counter (under text) */}
        <div className={cn("mt-4 glass rounded-2xl p-3 border border-[var(--stroke)] relative overflow-hidden", done && "done-shimmer")}>
          <div className="flex items-center justify-between gap-3 relative">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 relative grid place-items-center shrink-0">
                <svg width="100%" height="100%" viewBox="0 0 48 48" aria-hidden="true">
                  <circle
                    cx="24"
                    cy="24"
                    r={radius}
                    stroke="var(--stroke)"
                    strokeWidth="3"
                    fill="none"
                  />
                  <circle
                    ref={ringRef}
                    cx="24"
                    cy="24"
                    r={radius}
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    style={{
                      strokeDasharray: circumference,
                      strokeDashoffset: circumference - (current / target) * circumference,
                      stroke: done ? "var(--ok)" : "var(--accent)",
                      transition: "stroke-dashoffset 0.22s cubic-bezier(0.2,0,0,1), stroke 0.3s ease",
                    }}
                    className="progress-ring-circle"
                  />
                </svg>
                <div className="absolute inset-0 grid place-items-center" aria-live="polite" aria-atomic="true">
                  {done ? (
                    <CheckCircle2 size={18} className="text-[var(--ok)]" />
                  ) : (
                    <span className="text-sm font-semibold tabular-nums">{remaining}</span>
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <div className="text-xs opacity-65">
                  {done ? "مكتمل" : "المتبقي"}
                </div>
                <div className="text-sm font-semibold tabular-nums">
                  {current}/{target}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <IconButton
                aria-label="تراجع خطوة"
                onClick={() => {
                  if (isDailyLockedItem) return;
                  decrement({ sectionId, index, target });
                }}
                className={cn((current <= 0 || isDailyLockedItem) && "opacity-40 pointer-events-none")}
              >
                <Minus size={18} aria-hidden="true" className="opacity-80" />
              </IconButton>

              {confirmItemReset ? (
                <>
                  <button type="button"
                    className="text-[11px] px-2.5 rounded-xl bg-danger-15 border border-danger-30 text-[var(--danger)] min-h-[44px] transition active:scale-[.97]"
                    onClick={() => { resetItem(sectionId, index, target); setConfirmItemReset(false); }}
                  >
                    تأكيد
                  </button>
                  <button type="button"
                    className="text-[11px] px-2.5 rounded-xl bg-[var(--card)] border border-[var(--stroke)] min-h-[44px] transition active:scale-[.97]"
                    onClick={() => setConfirmItemReset(false)}
                  >
                    إلغاء
                  </button>
                </>
              ) : (
                <IconButton
                  aria-label="إعادة العد"
                  onClick={() => {
                    if (isDailyLockedItem) return;
                    setConfirmItemReset(true);
                  }}
                  className={cn(isDailyLockedItem && "opacity-40 pointer-events-none")}
                >
                  <RotateCcw size={16} aria-hidden="true" className="opacity-70" />
                </IconButton>
              )}
            </div>
          </div>

          <div
            className="mt-3 h-2 rounded-full bg-[var(--card)] overflow-hidden border border-[var(--stroke)]"
            role="progressbar"
            aria-valuenow={current}
            aria-valuemin={0}
            aria-valuemax={target || 1}
            aria-label={`التقدم: ${current} من ${target}`}
          >
            <div
              className={cn("h-full transition-[width] duration-300", done ? "progress-ok" : "progress-accent")}
              style={{ width: `${Math.round((target ? current / target : 0) * 100)}%` }}
            />
          </div>
        </div>

        {/* Counter Button — placed before benefit so it's visible without scrolling */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button"
            className={cn(
              "flex-1 rounded-3xl px-4 py-5 text-base font-bold border transition select-none btn-count press-effect active:scale-[.96]",
              done
                ? "bg-[var(--ok)] text-[var(--on-accent)] border-transparent shadow-[0_0_18px_color-mix(in_srgb,var(--ok)_30%,transparent)]"
                : "bg-[var(--accent)] text-[var(--on-accent)] border-transparent hover:brightness-[1.04] shadow-[0_4px_20px_color-mix(in_srgb,var(--accent)_25%,transparent)]",
              isDailyLockedItem && "opacity-60 pointer-events-none"
            )}
            onClick={() => {
              if (isDailyLockedItem) return;
              onCount();
            }}
            aria-label={done ? "اكتمل الذكر" : `اضغط للعدّ — متبقي ${remaining}`}
          >
            {done
              ? "اكتملت ✨"
              : remaining === 1
                ? "الأخيرة · اضغط"
                : remaining > 0
                  ? `اضغط للعدّ · ${remaining}`
                  : "اضغط للعدّ"}
          </button>
        </div>

        {/* Benefit — D8: grade badge */}
        {!focusMode && prefs.showBenefits && item.benefit && item.benefit.trim().length > 0 ? (
          <div className="mt-4 rounded-2xl bg-accent-8 border border-accent-15 p-3 text-sm leading-7">
            <div className="text-xs font-semibold opacity-55 mb-1.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-[var(--accent)] opacity-80">✦</span>
              <span>الفضل / المصدر</span>
              {(() => { const g = parseHadithGrade(item.benefit ?? ''); return g ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border" style={{ color: g.color, borderColor: `${g.color}44`, background: `${g.color}18` }}>{g.grade}</span>
              ) : null; })()}
            </div>
            <div className="opacity-85">{item.benefit}</div>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
