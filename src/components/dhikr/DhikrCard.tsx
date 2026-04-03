import * as React from "react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Heart, MoreVertical, RotateCcw, Share2, Copy, CheckCircle2, Minus } from "lucide-react";
import { motion } from "framer-motion";

import { cn, clamp } from "@/lib/utils";
import { formatLeadingIstiadhahBasmalah, normalizeText, stripDiacritics } from "@/lib/arabic";
import { renderDhikrPosterBlob } from "@/lib/sharePoster";
import { useNoorStore } from "@/store/noorStore";
import { coerceCount, type DhikrItem } from "@/data/types";
import { IconButton } from "@/components/ui/IconButton";
import { isDailySection } from "@/lib/dailySections";

// Lazy-load heavy libraries — only imported when actually needed
const getGsap = () => import("gsap").then((m) => m.default ?? m);
const getConfetti = () => import("canvas-confetti").then((m) => m.default ?? m);
const getToPng = () => import("html-to-image").then((m) => m.toPng);
import toast from "react-hot-toast";

const audioCtxRef = new (class {
  ctx: AudioContext | null = null;
  get() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) this.ctx = new Ctx();
    }
    return this.ctx;
  }
})();

function playTick(count: number) {
  try {
    const ctx = audioCtxRef.get();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    
    o.type = "sine";
    const baseFreq = [800, 850, 900, 950, 1000]; // Pentatonic-ish steps
    o.frequency.value = baseFreq[count % 5] || 800;

    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    o.connect(g);
    g.connect(ctx.destination);
    
    o.start();
    o.stop(ctx.currentTime + 0.12);
  } catch {
    // ignore
  }
}

export function DhikrCard(props: {
  sectionId: string;
  index: number;
  item: DhikrItem;
  autoFocus?: boolean;
  totalItems?: number;
  onComplete?: () => void;
}) {
  const { sectionId, index, item } = props;

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
  const [swipeHint, setSwipeHint] = React.useState(false);
  const [isLongPressing, setIsLongPressing] = React.useState(false);
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmItemReset, setConfirmItemReset] = React.useState(false);
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
    if (Math.abs(dx) > 55 && Math.abs(dy) < 45) {
      onCount();
      // Flash swipe feedback
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
      setTimeout(() => setSwipeHint(true), 1200);
      setTimeout(() => { setSwipeHint(false); localStorage.setItem(key, "1"); }, 4000);
    }
  }, []);

  // Animate ring on every count
  React.useEffect(() => {
    if (!ringRef.current) return;
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const pct = target ? current / target : 0;
    const offset = circumference - pct * circumference;

    const el = ringRef.current;
    getGsap().then((g) => g.to(el, { strokeDashoffset: offset, duration: 0.25, ease: "power2.out" }));
  }, [current, target]);

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

  const onCount = () => {
    const next = increment({ sectionId, index, target });
    
    // Improved Feedbacks
    if (prefs.enableHaptics && navigator.vibrate) {
      navigator.vibrate(12);
    }
    
    if (prefs.enableSounds) {
      playTick(next);
    }

    // micro ripple
    if (cardRef.current) {
      const el = cardRef.current;
      getGsap().then((g) => g.fromTo(el, { scale: 1 }, { scale: 0.995, duration: 0.08, yoyo: true, repeat: 1 }));
    }
    
    // Theme-Specific Particles (Roses / Bees)
    if (prefs.theme === "roses") {
      getConfetti().then((c) => c({
        particleCount: 8,
        spread: 40,
        startVelocity: 15,
        scalar: 0.7,
        colors: ['#fb7185', '#f43f5e', '#ffe4e6'],
        origin: { y: 0.8 },
        ticks: 80,
        gravity: 0.5,
      }));
    } else if (prefs.theme === "bees") {
      getConfetti().then((c) => c({
        particleCount: 5,
        spread: 60,
        startVelocity: 20,
        scalar: 0.6,
        colors: ['#fbbf24', '#f59e0b', '#000000'],
        shapes: ['circle'],
        origin: { y: 0.8 },
        gravity: 0.8
      }));
    }

    // Completion confetti
    if (next === target) {
      // Haptic + auto-advance signal after a short delay
      if (prefs.enableHaptics && navigator.vibrate) navigator.vibrate([15, 8, 15]);
      if (prefs.autoAdvanceDhikr && props.onComplete) {
        setTimeout(() => props.onComplete?.(), 480);
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
  const initialOffset = circumference - (current / target) * circumference;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "glass-strong rounded-3xl border border-white/10 overflow-hidden cv-auto glass-hover",
        done && "border-[color-mix(in_srgb,var(--ok)_25%,transparent)]"
      )}
    >
      <div className="p-4 md:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconButton aria-label="نسخ" onClick={doCopy} title="نسخ النص">
              <Copy size={18} className="opacity-80" />
            </IconButton>

            <IconButton
              aria-label="مفضلة"
              onClick={() => toggleFavorite(sectionId, index)}
              className={cn(fav && "bg-[var(--accent)]/14 border-[var(--accent)]/24")}
            >
              <Heart size={18} className={cn(fav ? "text-[var(--accent)]" : "opacity-80")} />
            </IconButton>

            <Dropdown.Root modal={false}>
              <Dropdown.Trigger asChild>
                <button
                  aria-label="خيارات"
                  className="inline-flex items-center justify-center rounded-2xl p-2.5 bg-white/6 hover:bg-white/10 border border-white/10 transition active:scale-[.99] min-h-[44px] min-w-[44px]"
                >
                  <MoreVertical size={18} />
                </button>
              </Dropdown.Trigger>
              <Dropdown.Portal>
                <Dropdown.Content
                  style={{ zIndex: 100000 }}
                  className="glass-strong shadow-2xl rounded-2xl p-2 min-w-[200px] border border-white/20 animate-in fade-in zoom-in-95 duration-200"
                >
                  <MenuItem onSelect={doCopy} icon={<Copy size={16} />}>
                    نسخ النص
                  </MenuItem>
                  <MenuItem onSelect={doShareText} icon={<Share2 size={16} />}>
                    مشاركة كنص
                  </MenuItem>
                  <MenuItem onSelect={doShareImage} icon={<Share2 size={16} />}>
                    مشاركة كصورة
                  </MenuItem>
                  <Dropdown.Separator className="h-px bg-white/10 my-1" />
                  <MenuItem
                    onSelect={() => {
                      if (isDailyLockedItem) return;
                      resetItem(sectionId, index, target);
                    }}
                    icon={<RotateCcw size={16} />}
                    danger
                  >
                    تصفير العداد
                  </MenuItem>
                </Dropdown.Content>
              </Dropdown.Portal>
            </Dropdown.Root>
          </div>
          {props.totalItems != null && (
            <div className="text-xs tabular-nums opacity-35 leading-tight text-end self-center shrink-0">
              {index + 1}/{props.totalItems}
            </div>
          )}
        </div>

        {/* Text + swipe zone */}
        <div
          className={cn("mt-4 arabic-text whitespace-pre-wrap select-none relative", isLongPressing && "long-press-active")}
          style={{ fontSize: `${prefs.fontScale}rem`, lineHeight: prefs.lineHeight }}
          onTouchStart={onSwipeTouchStart}
          onTouchEnd={onSwipeTouchEnd}
        >
          {displayText}
          {swipeHint && !done && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-4 py-2 text-sm text-white/95 flex items-center gap-2 swipe-hint-anim">
                <span className="text-lg">←</span>
                <span>اسحب للعدّ</span>
                <span className="text-lg">→</span>
              </div>
            </div>
          )}
        </div>

        {/* Counter (under text) */}
        <div className={cn("mt-4 glass rounded-2xl p-3 border border-white/10 relative overflow-hidden", done && "done-shimmer")}>
          <div className="flex items-center justify-between gap-3 relative">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 relative grid place-items-center shrink-0">
                <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
                  <circle
                    cx="24"
                    cy="24"
                    r={radius}
                    stroke="rgba(255,255,255,.12)"
                    strokeWidth="3"
                    fill="none"
                  />
                  <circle
                    ref={ringRef}
                    cx="24"
                    cy="24"
                    r={radius}
                    style={{ stroke: done ? "var(--ok)" : "var(--accent)" }}
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={initialOffset}
                    className="progress-ring-circle"
                  />
                </svg>
                <div className="absolute inset-0 grid place-items-center">
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
                title="تراجع خطوة"
                onClick={() => {
                  if (isDailyLockedItem) return;
                  decrement({ sectionId, index, target });
                }}
                className={cn((current <= 0 || isDailyLockedItem) && "opacity-40 pointer-events-none")}
              >
                <Minus size={18} className="opacity-80" />
              </IconButton>

              {confirmItemReset ? (
                <>
                  <button
                    className="text-[11px] px-2.5 rounded-xl bg-[var(--danger)]/15 border border-[var(--danger)]/30 text-[var(--danger)] min-h-[44px] transition active:scale-[.97]"
                    onClick={() => { resetItem(sectionId, index, target); setConfirmItemReset(false); }}
                  >
                    تأكيد
                  </button>
                  <button
                    className="text-[11px] px-2.5 rounded-xl bg-white/6 border border-white/10 min-h-[44px] transition active:scale-[.97]"
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
                  title="إعادة العد"
                  className={cn(isDailyLockedItem && "opacity-40 pointer-events-none")}
                >
                  <RotateCcw size={16} className="opacity-70" />
                </IconButton>
              )}
            </div>
          </div>

          <div className="mt-3 h-2 rounded-full bg-white/6 overflow-hidden border border-white/10">
            <div
              className={cn("h-full transition-[width] duration-300", done ? "progress-ok" : "progress-accent")}
              style={{ width: `${Math.round((target ? current / target : 0) * 100)}%` }}
            />
          </div>
        </div>

        {/* Counter Button — placed before benefit so it's visible without scrolling */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            className={cn(
              "flex-1 rounded-3xl px-4 py-5 text-base font-bold border transition select-none btn-count press-effect active:scale-[.96]",
              done
                ? "bg-[var(--ok)] text-black border-transparent shadow-[0_0_18px_color-mix(in_srgb,var(--ok)_30%,transparent)]"
                : "bg-[var(--accent)] text-black border-transparent hover:brightness-[1.04] shadow-[0_4px_20px_color-mix(in_srgb,var(--accent)_25%,transparent)]",
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

        {/* Benefit */}
        {prefs.showBenefits && item.benefit && item.benefit.trim().length > 0 ? (
          <div className="mt-4 rounded-2xl bg-[var(--accent)]/8 border border-[var(--accent)]/15 p-3 text-sm leading-7">
            <div className="text-xs font-semibold opacity-55 mb-1.5 flex items-center gap-1.5">
              <span className="text-[var(--accent)] opacity-80">✦</span>
              <span>الفضل / المصدر</span>
            </div>
            <div className="opacity-85">{item.benefit}</div>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

function MenuItem(props: {
  children: React.ReactNode;
  onSelect: () => void;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Dropdown.Item
      onSelect={(e) => {
        e.preventDefault();
        props.onSelect();
      }}
      className={cn(
        "outline-none cursor-pointer select-none rounded-xl px-3 py-2.5 text-sm flex items-center gap-2 min-h-[44px]",
        "data-[highlighted]:bg-white/10",
        props.danger && "text-[var(--danger)]"
      )}
    >
      <span className="opacity-80">{props.icon}</span>
      <span>{props.children}</span>
    </Dropdown.Item>
  );
}
