import * as React from "react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Heart, MoreVertical, RotateCcw, Share2, Copy, CheckCircle2, Minus } from "lucide-react";
import { motion } from "framer-motion";
import gsap from "gsap";
import confetti from "canvas-confetti";
import { toPng } from "html-to-image";

import { cn, clamp } from "@/lib/utils";
import { formatLeadingIstiadhahBasmalah, normalizeText, stripDiacritics } from "@/lib/arabic";
import { renderDhikrPosterBlob } from "@/lib/sharePoster";
import { useNoorStore } from "@/store/noorStore";
import type { DhikrItem } from "@/data/types";
import { IconButton } from "@/components/ui/IconButton";
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
}) {
  const { sectionId, index, item } = props;

  const key = `${sectionId}:${index}`;
  const prefs = useNoorStore((s) => s.prefs);
  const progress = useNoorStore((s) => s.progress[key] ?? 0);
  const increment = useNoorStore((s) => s.increment);
  const decrement = useNoorStore((s) => s.decrement);
  const resetItem = useNoorStore((s) => s.resetItem);
  const toggleFavorite = useNoorStore((s) => s.toggleFavorite);
  const fav = useNoorStore((s) => !!s.favorites[key]);
  const lastCelebrationAt = useNoorStore((s) => s.lastCelebrationAt);
  const setLastCelebrationAt = useNoorStore((s) => s.setLastCelebrationAt);

  const target = Math.max(1, item.count ?? 1);
  const current = clamp(progress, 0, target);
  const remaining = Math.max(0, target - current);
  const done = current >= target;

  const cardRef = React.useRef<HTMLDivElement>(null);
  const ringRef = React.useRef<SVGCircleElement>(null);

  // Animate ring on every count
  React.useEffect(() => {
    if (!ringRef.current) return;
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const pct = target ? current / target : 0;
    const offset = circumference - pct * circumference;

    gsap.to(ringRef.current, { strokeDashoffset: offset, duration: 0.25, ease: "power2.out" });
  }, [current, target]);

  // Celebrate on completion (throttled)
  React.useEffect(() => {
    if (!done) return;
    const now = Date.now();
    if (now - lastCelebrationAt < 2500) return;
    setLastCelebrationAt(now);

    confetti({
      particleCount: 70,
      spread: 70,
      startVelocity: 24,
      scalar: 0.9,
      origin: { y: 0.9 }
    });
  }, [done]);

  // Auto-scroll / highlight when focused from search
  React.useEffect(() => {
    if (!props.autoFocus || !cardRef.current) return;
    cardRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    gsap.fromTo(
      cardRef.current,
      { boxShadow: "0 0 0 0 rgba(255,215,128,0.0)" },
      { boxShadow: "0 0 0 6px rgba(255,215,128,0.18)", duration: 0.6, yoyo: true, repeat: 1 }
    );
  }, [props.autoFocus]);

  const displayText = React.useMemo(() => {
    const t = normalizeText(item.text);
    const base = prefs.stripDiacritics ? stripDiacritics(t) : t;
    return formatLeadingIstiadhahBasmalah(base);
  }, [item.text, prefs.stripDiacritics]);

  const onCount = (isAuto = false) => {
    const next = increment({ sectionId, index, target: Number(item.count) });
    
    // Improved Feedbacks
    if (prefs.enableHaptics && navigator.vibrate) {
      navigator.vibrate(isAuto ? 5 : 12);
    }
    
    if (prefs.enableSounds) {
      playTick(next);
    }

    // micro ripple
    if (cardRef.current && !isAuto) {
      gsap.fromTo(cardRef.current, { scale: 1 }, { scale: 0.995, duration: 0.08, yoyo: true, repeat: 1 });
    }
    
    // Theme-Specific Particles (Roses / Bees)
    if (prefs.theme === "roses") {
      confetti({
        particleCount: 8,
        spread: 40,
        startVelocity: 15,
        scalar: 0.7,
        colors: ['#fb7185', '#f43f5e', '#ffe4e6'],
        origin: { y: 0.8 },
        ticks: 80,
        gravity: 0.5,
      });
    } else if (prefs.theme === "bees") {
      confetti({
        particleCount: 5,
        spread: 60,
        startVelocity: 20,
        scalar: 0.6,
        colors: ['#fbbf24', '#f59e0b', '#000000'],
        shapes: ['circle'],
        origin: { y: 0.8 },
        gravity: 0.8
      });
    }

    // Completion confetti
    if (next >= Number(item.count)) {
      // toast.success("اكتملت ✨");
      // Optional: don't toast for every item, maybe just sound or glow?
    }
  };

  // Press & hold auto-count
  const holdRef = React.useRef<number | null>(null);
  const didHold = React.useRef(false);
  const holdStart = React.useRef<number>(0);

  const onPointerDown = () => {
    if (done) return;
    didHold.current = false;
    holdStart.current = Date.now();

    window.clearInterval(holdRef.current ?? undefined);
    holdRef.current = window.setInterval(() => {
      const elapsed = Date.now() - holdStart.current;
      if (elapsed < 280) return; // grace period before auto-repeat
      didHold.current = true;
      onCount(true);
    }, 150);
  };

  const clearHold = () => {
    window.clearInterval(holdRef.current ?? undefined);
    holdRef.current = null;
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
        "glass-strong rounded-3xl border border-white/10 overflow-hidden",
        done && "border-[rgba(61,220,151,.25)]"
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
              className={cn(fav && "bg-[rgba(255,215,128,.14)] border-[rgba(255,215,128,.24)]")}
            >
              <Heart size={18} className={cn(fav ? "text-[var(--accent)]" : "opacity-80")} />
            </IconButton>

            <IconButton
              aria-label="إعادة العد"
              onClick={() => resetItem(sectionId, index)}
              title="إعادة العد"
            >
              <RotateCcw size={16} className="opacity-70" />
            </IconButton>

            <Dropdown.Root modal={false}>
              <Dropdown.Trigger asChild>
                <button
                  aria-label="خيارات"
                  className="inline-flex items-center justify-center rounded-2xl p-2.5 bg-white/6 hover:bg-white/10 border border-white/10 transition active:scale-[.99]"
                >
                  <MoreVertical size={18} />
                </button>
              </Dropdown.Trigger>
              <Dropdown.Portal>
                <Dropdown.Content
                  style={{ zIndex: 100000 }}
                  className="bg-[#1e1e24] shadow-2xl rounded-2xl p-2 min-w-[200px] border border-white/20 animate-in fade-in zoom-in-95 duration-200"
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
                    onSelect={() => resetItem(sectionId, index)}
                    icon={<RotateCcw size={16} />}
                    danger
                  >
                    تصفير العداد
                  </MenuItem>
                </Dropdown.Content>
              </Dropdown.Portal>
            </Dropdown.Root>
          </div>
        </div>

        {/* Text */}
        <div
          className="mt-4 arabic-text whitespace-pre-wrap"
          style={{ fontSize: `${prefs.fontScale}rem`, lineHeight: prefs.lineHeight }}
        >
          {displayText}
        </div>

        {/* Counter (under text) */}
        <div className="mt-4 glass rounded-2xl p-3 border border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 relative grid place-items-center shrink-0">
                <svg width="48" height="48" viewBox="0 0 48 48">
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
                    stroke={done ? "rgba(61,220,151,.9)" : "rgba(255,215,128,.92)"}
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={initialOffset}
                    transform="rotate(-90 24 24)"
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
                onClick={() => decrement({ sectionId, index })}
                className={cn(current <= 0 && "opacity-40 pointer-events-none")}
              >
                <Minus size={18} className="opacity-80" />
              </IconButton>

              <IconButton
                aria-label="إعادة العد"
                onClick={() => resetItem(sectionId, index)}
                title="إعادة العد"
              >
                <RotateCcw size={16} className="opacity-70" />
              </IconButton>
            </div>
          </div>

          <div className="mt-3 h-2 rounded-full bg-white/6 overflow-hidden border border-white/10">
            <div
              className={cn("h-full transition-[width] duration-300", done ? "bg-[var(--ok)]/70" : "bg-[var(--accent)]/70")}
              style={{ width: `${Math.round((target ? current / target : 0) * 100)}%` }}
            />
          </div>
        </div>

        {/* Benefit */}
        {prefs.showBenefits && item.benefit && item.benefit.trim().length > 0 ? (
          <div className="mt-4 rounded-2xl bg-white/6 border border-white/10 p-3 text-sm opacity-85 leading-7">
            <div className="text-xs opacity-70 mb-1">الفضل / المصدر</div>
            <div>{item.benefit}</div>
          </div>
        ) : null}

        {/* Counter Button */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            className={cn(
              "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold border transition active:scale-[.99]",
              done
                ? "bg-[var(--ok)] text-black border-transparent"
                : "bg-[var(--accent)] text-black border-transparent hover:brightness-[1.02]"
            )}
            onClick={() => {
              if (didHold.current) {
                didHold.current = false;
                return;
              }
              onCount();
            }}
            onPointerDown={onPointerDown}
            onPointerUp={clearHold}
            onPointerCancel={clearHold}
          >
            {done ? "اكتملت" : "اضغط — أو اضغط مطوّلًا للتسبيح السريع"}
          </button>
        </div>
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
        "outline-none cursor-pointer select-none rounded-xl px-3 py-2 text-sm flex items-center gap-2",
        "data-[highlighted]:bg-white/10",
        props.danger && "text-[var(--danger)]"
      )}
    >
      <span className="opacity-80">{props.icon}</span>
      <span>{props.children}</span>
    </Dropdown.Item>
  );
}
