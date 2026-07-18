import * as React from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Lock, Copy, List, ChevronsDown, ArrowUp, Focus, ChevronRight, ChevronLeft, CheckCheck, Plus, X, ArrowUpDown, MoveUp, MoveDown, Timer, Square, MoreHorizontal, Trash2, Share2, Pencil } from "lucide-react";
import toast from "react-hot-toast";

const getConfetti = () => import("canvas-confetti").then((m) => m.default ?? m);

import { DhikrCard } from "@/components/dhikr/DhikrCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { coerceCount, type DhikrItem } from "@/data/types";
import { useNoorStore } from "@/store/noorStore";
import { pct } from "@/lib/utils";

import { isDailySection } from "@/lib/dailySections";
import { getSectionIdentity } from "@/lib/sectionIdentity";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { MY_ADHKAR_SECTION_ID, addCustomDhikrItem, loadPacks, removeCustomDhikrItem, updateCustomDhikrItem } from "@/data/packs";
import { Input } from "@/components/ui/Input";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { getNextIbadahBoundary, getNextLocalMidnight } from "@/lib/dayBoundaries";
import { FloatingAthar } from "@/components/companion/FloatingAthar";

export function DhikrList(props: Readonly<{
  sectionId: string;
  title: string;
  items: DhikrItem[];
  focusIndex?: number | null;
  isCustomSection?: boolean;
  onDeleteCategory?: () => void;
}>) {
  const resetSection = useNoorStore((s) => s.resetSection);
  const increment = useNoorStore((s) => s.increment);
  const progressMap = useNoorStore((s) => s.progress);
  const sectionCompletions = useNoorStore((s) => s.sectionCompletions);
  const recordSectionCompletion = useNoorStore((s) => s.recordSectionCompletion);
  const savedItemOrder = useNoorStore((s) => s.sectionItemOrder[props.sectionId]);
  const moveSectionItem = useNoorStore((s) => s.moveSectionItem);
  const resetSectionItemOrder = useNoorStore((s) => s.resetSectionItemOrder);
  const removeCustomPackItem = useNoorStore((s) => s.removeCustomPackItem);
  const updateCustomPackItem = useNoorStore((s) => s.updateCustomPackItem);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: adhkarData } = useAdhkarDB();
  const prayerTimes = usePrayerTimes();
  const fajrTime = prayerTimes.data?.data?.timings?.Fajr ?? null;
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [confirmDone, setConfirmDone] = React.useState(false);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = React.useState(false);
  const [deletingItemIdx, setDeletingItemIdx] = React.useState<number | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [editingItemIdx, setEditingItemIdx] = React.useState<number | null>(null);
  const [customText, setCustomText] = React.useState("");
  const [customCount, setCustomCount] = React.useState("1");
  const [customBenefit, setCustomBenefit] = React.useState("");
  const editSheetRef = React.useRef<HTMLDivElement | null>(null);
  const isDailySectionLocked = isDailySection(props.sectionId);
  const isMyAdhkarSection = props.sectionId === MY_ADHKAR_SECTION_ID;
  const customSectionItemCount = React.useMemo(() => {
    if (props.isCustomSection || isMyAdhkarSection) return props.items.length;
    const packs = loadPacks();
    const section = packs.flatMap((pack) => pack.sections).find((candidate) => candidate.id === props.sectionId);
    return section?.content.length ?? 0;
  }, [isMyAdhkarSection, props.isCustomSection, props.items.length, props.sectionId]);
  const firstCustomItemIndex = React.useMemo(
    () => Math.max(0, props.items.length - customSectionItemCount),
    [customSectionItemCount, props.items.length],
  );

  React.useEffect(() => {
    if (props.title) {
      document.title = `${props.title} — أثر`;
      return () => { document.title = "أثر"; };
    }
  }, [props.title]);
  const hasItems = props.items.length > 0;
  const identity = React.useMemo(() => getSectionIdentity(props.sectionId), [props.sectionId]);

  const orderedEntries = React.useMemo(() => {
    const seen = new Set<number>();
    const order: number[] = [];

    for (const value of savedItemOrder ?? []) {
      if (!Number.isInteger(value) || value < 0 || value >= props.items.length || seen.has(value)) continue;
      seen.add(value);
      order.push(value);
    }

    for (let index = 0; index < props.items.length; index += 1) {
      if (!seen.has(index)) order.push(index);
    }

    return order
      .map((originalIndex) => ({ originalIndex, item: props.items[originalIndex] }))
      .filter((entry): entry is { originalIndex: number; item: DhikrItem } => !!entry.item);
  }, [props.items, savedItemOrder]);

  const [midnightLabel, setMidnightLabel] = React.useState<string>("");
  React.useEffect(() => {
    if (!isDailySectionLocked) return;
    function calc() {
      const now = new Date();
      const boundary = getNextIbadahBoundary(now, fajrTime) ?? getNextLocalMidnight(now);
      const diffMs = boundary.getTime() - now.getTime();
      const diffMins = Math.ceil(diffMs / 60000);
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      setMidnightLabel(h > 0 ? `${h}س ${m}د` : `${m} د`);
    }
    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, [fajrTime, isDailySectionLocked]);

  const stats = React.useMemo(() => {
    let done = 0;
    let total = 0;
    orderedEntries.forEach(({ item: it, originalIndex }) => {
      const key = `${props.sectionId}:${originalIndex}`;
      const t = coerceCount(it.count);
      const c = Math.min(Math.max(0, Number(progressMap[key]) || 0), t);
      total += t;
      done += c;
    });
    return { done, total, percent: pct(done, total) };
  }, [orderedEntries, progressMap, props.sectionId]);

  // First item that still needs taps
  const firstIncompleteIdx = React.useMemo(() => {
    return orderedEntries.findIndex(({ item, originalIndex }) => {
      const key = `${props.sectionId}:${originalIndex}`;
      const target = coerceCount(item.count);
      const current = Math.min(target, Math.max(0, Number(progressMap[key]) || 0));
      return current < target;
    });
  }, [orderedEntries, progressMap, props.sectionId]);

  const [copiedAll, setCopiedAll] = React.useState(false);
  const [compact, setCompact] = React.useState(false);
  const [reorderMode, setReorderMode] = React.useState(false);
  const [showBackToTop, setShowBackToTop] = React.useState(false);
  const [focusMode, setFocusMode] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [headerVisible, setHeaderVisible] = React.useState(true);
  // Premium compact bar: hidden while actively scrolling, slides back in when scrolling stops
  const [isScrolling, setIsScrolling] = React.useState(false);
  const headerCardRef = React.useRef<HTMLDivElement>(null);
  // Plain-list scroll controller. This used to be react-virtuoso's
  // VirtuosoHandle. Its window-scroll mode renders zero items whenever the
  // measurement tick can't run (hidden/occluded WebView — rAF and observers
  // suspended); on a normal visible device it worked. Sections top out
  // around ~50 cards, so virtualization bought nothing here anyway — a
  // plain render is simpler, immune to that failure mode, and this
  // controller keeps every existing scrollToIndex call site working.
  const itemElsRef = React.useRef<(HTMLDivElement | null)[]>([]);
  const virtuosoRef = React.useRef({
    scrollToIndex(opts: { index: number; align?: "start" | "center" | "end"; behavior?: ScrollBehavior; slowMs?: number }) {
      // Computed window scroll instead of el.scrollIntoView: a layout
      // wrapper with overflow-x hidden silently becomes scrollIntoView's
      // scroll target (per spec overflow-y computes to auto there), so
      // scrollIntoView scrolls that non-scrolling box and the page never
      // moves. Window math has no ancestor to get confused by. The smooth
      // animation is driven by rAF ourselves because native
      // scrollTo({behavior:"smooth"}) is a silent no-op on some engines.
      let top = 0;
      if (opts.index > 0 || opts.align !== undefined) {
        const el = itemElsRef.current[opts.index];
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const topbarH = parseFloat(document.documentElement.style.getPropertyValue("--topbar-h") || "80");
        if (opts.align === "start") top = window.scrollY + rect.top - topbarH - 8;
        else if (opts.align === "end") top = window.scrollY + rect.bottom - window.innerHeight + 8;
        else top = window.scrollY + rect.top - Math.max(topbarH, (window.innerHeight - rect.height) / 2);
        top = Math.max(0, top);
      }
      // Instant when smooth isn't wanted — or CAN'T run: rAF is suspended in
      // hidden/occluded tabs, and reduced-motion users shouldn't be animated.
      const reduceMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (opts.behavior !== "smooth" || document.hidden || reduceMotion) {
        window.scrollTo(0, top);
        return;
      }
      const start = window.scrollY;
      const delta = top - start;
      if (Math.abs(delta) < 2) return;
      // Auto-advance callers pass `slowMs` to opt into a noticeably slower
      // glide (1100ms+) so the eye can follow the sweep. Default fast
      // callers keep the snappy 250-650ms ramp — same behavior as before.
      const duration = opts.slowMs
        ?? Math.min(650, Math.max(250, Math.abs(delta) * 0.35));
      const t0 = performance.now();
      // Cubic ease-in-out for the slow ramp; ease-out-cubic stays for fast.
      const ease = opts.slowMs
        ? (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
        : (t: number) => 1 - Math.pow(1 - t, 3);
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        window.scrollTo(0, start + delta * ease(p));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
  });

  // Unified scroll handler: track header visibility + active-scroll state
  React.useEffect(() => {
    let idleTimer: number | null = null;

    const checkState = () => {
      const el = headerCardRef.current;
      const y = window.scrollY;

      // Header visible = its bottom edge is still below the sticky topbar
      if (el) {
        const topbarH = parseFloat(
          document.documentElement.style.getPropertyValue("--topbar-h") || "80"
        );
        setHeaderVisible(el.getBoundingClientRect().bottom > topbarH);
      }

      // Back-to-top affordance (was Virtuoso's atTopStateChange)
      setShowBackToTop(y > 400);

      // Mark as actively scrolling, then clear shortly after the last scroll event
      if (y > 4) {
        setIsScrolling(true);
        if (idleTimer !== null) clearTimeout(idleTimer);
        idleTimer = window.setTimeout(() => setIsScrolling(false), 380);
      } else {
        // At the very top — never treat as scrolling
        setIsScrolling(false);
      }
    };

    checkState();
    window.addEventListener("scroll", checkState, { passive: true });
    return () => {
      window.removeEventListener("scroll", checkState);
      if (idleTimer !== null) clearTimeout(idleTimer);
    };
  }, []);

  // D2: category completion confetti + 3E record completion
  const prevPercentRef = React.useRef<number>(stats.percent);
  React.useEffect(() => {
    if (stats.percent >= 100 && prevPercentRef.current < 100 && props.items.length > 0) {
      recordSectionCompletion(props.sectionId);
      // Reduced particle counts for smooth 60fps on mobile
      getConfetti().then((c) => {
        c({ particleCount: 55, spread: 75, startVelocity: 28, scalar: 0.9, origin: { y: 0.6 } });
        setTimeout(() => c({ particleCount: 30, spread: 90, startVelocity: 18, scalar: 0.85, origin: { x: 0.2, y: 0.75 } }), 350);
      });
    }
    prevPercentRef.current = stats.percent;
  }, [stats.percent, props.items.length, props.sectionId, recordSectionCompletion]);

  // 3E: Weekly stats (last 7 days)
  const weeklyStats = React.useMemo(() => {
    const completions = sectionCompletions[props.sectionId] ?? [];
    const now = Date.now();
    const bars = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now - (6 - i) * 86_400_000);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return completions.includes(iso) ? 1 : 0;
    });
    const weeklyCount = bars.filter(Boolean).length;
    return { weeklyCount, bars };
  }, [sectionCompletions, props.sectionId]);

  // D12: auto-read mode
  const [autoReadActive, setAutoReadActive] = React.useState(false);
  const [autoReadSpeed, setAutoReadSpeed] = React.useState(5); // seconds per card
  const [autoReadIdx, setAutoReadIdx] = React.useState(0);
  const [autoReadCountdown, setAutoReadCountdown] = React.useState(0);
  const autoReadIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  // Keep speed in a ref so the interval can read the latest value without restarting
  const autoReadSpeedRef = React.useRef(autoReadSpeed);
  React.useEffect(() => { autoReadSpeedRef.current = autoReadSpeed; }, [autoReadSpeed]);
  const stopAutoRead = React.useCallback(() => {
    setAutoReadActive(false);
    if (autoReadIntervalRef.current) { clearInterval(autoReadIntervalRef.current); autoReadIntervalRef.current = null; }
  }, []);
  const startAutoRead = React.useCallback(() => {
    setAutoReadIdx(0);
    setAutoReadCountdown(autoReadSpeedRef.current);
    setAutoReadActive(true);
  }, []);
  React.useEffect(() => {
    if (!autoReadActive) return;
    let remaining = autoReadSpeedRef.current;
    let currentIdx = autoReadIdx;
    setAutoReadCountdown(remaining);
    virtuosoRef.current?.scrollToIndex({ index: currentIdx, align: "center", behavior: "smooth" });
    const id = setInterval(() => {
      remaining -= 1;
      setAutoReadCountdown(remaining);
      if (remaining <= 0) {
        currentIdx += 1;
        if (currentIdx >= orderedEntries.length) {
          stopAutoRead();
          toast.success("تمت القراءة التلقائية ✓");
          return;
        }
        // Re-read speed from ref so live speed changes take effect immediately
        remaining = autoReadSpeedRef.current;
        setAutoReadCountdown(remaining);
        setAutoReadIdx(currentIdx);
        virtuosoRef.current?.scrollToIndex({ index: currentIdx, align: "center", behavior: "smooth" });
      }
    }, 1000);
    autoReadIntervalRef.current = id;
    return () => clearInterval(id);
  }, [autoReadActive, autoReadIdx, orderedEntries.length, stopAutoRead]);
  React.useEffect(() => () => { if (autoReadIntervalRef.current) clearInterval(autoReadIntervalRef.current); }, []);

  // Apply / remove focus-mode class on body + compute --focus-offset for CSS
  React.useEffect(() => {
    if (focusMode) {
      document.body.classList.add("focus-mode");
      const topbarH = parseFloat(
        document.documentElement.style.getPropertyValue("--topbar-h") || "80"
      );
      document.documentElement.style.setProperty("--focus-offset", `-${topbarH}px`);
    } else {
      document.body.classList.remove("focus-mode");
      document.documentElement.style.removeProperty("--focus-offset");
    }
    return () => {
      document.body.classList.remove("focus-mode");
      document.documentElement.style.removeProperty("--focus-offset");
    };
  }, [focusMode]);

  // Once the header card scrolls under the topbar, keep the app topbar hidden.
  const scrolledPastHeader = !headerVisible;
  // The premium progress bar slides in only when scrolling has stopped.
  const compactBarVisible = scrolledPastHeader && !isScrolling;
  React.useEffect(() => {
    document.body.classList.toggle("dhikr-scrolled", scrolledPastHeader);
    return () => { document.body.classList.remove("dhikr-scrolled"); };
  }, [scrolledPastHeader]);

  // Prev / next sections for quick navigation
  const { prevSection, nextSection } = React.useMemo(() => {
    if (!adhkarData) return { prevSection: null, nextSection: null };
    const secs = adhkarData.db.sections;
    const idx = secs.findIndex((s) => s.id === props.sectionId);
    return {
      prevSection: idx > 0 ? secs[idx - 1] : null,
      nextSection: idx !== -1 && idx < secs.length - 1 ? secs[idx + 1] : null,
    };
  }, [adhkarData, props.sectionId]);

  // Related sections shown after completion
  const relatedSections = React.useMemo(() => {
    if (!adhkarData) return [];
    return adhkarData.db.sections
      .filter((s) => s.id !== props.sectionId)
      .map((s) => {
        const id = getSectionIdentity(s.id);
        const total = s.content.length;
        let done = 0;
        s.content.forEach((item, i) => {
          const need = coerceCount(item.count);
          const have = Math.min(need, Math.max(0, Number(progressMap[`${s.id}:${i}`]) || 0));
          if (have >= need) done++;
        });
        return { s, id, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
      })
      .filter((r) => r.pct < 100)
      .slice(0, 5);
  }, [adhkarData, progressMap, props.sectionId]);

  const markAllDone = () => {
    orderedEntries.forEach(({ item, originalIndex }) => {
      const target = coerceCount(item.count);
      const key = `${props.sectionId}:${originalIndex}`;
      const current = Math.min(target, Math.max(0, Number(progressMap[key]) || 0));
      const remaining = target - current;
      for (let i = 0; i < remaining; i++) {
        increment({ sectionId: props.sectionId, index: originalIndex, target });
      }
    });
    setConfirmDone(false);
    toast.success("تم إكمال جميع الأذكار ✓");
  };

  const copyAllText = async () => {
    const lines: string[] = [`【 ${props.title} 】`, ""];
    orderedEntries.forEach(({ item }, idx) => {
      const count = coerceCount(item.count);
      const repeatLabel = count > 1 ? ` (${count} مرات)` : "";
      lines.push(`${idx + 1}. ${item.text}${repeatLabel}`);
      if (item.benefit) lines.push(`   ﴾ ${item.benefit} ﴿`);
      lines.push("");
    });
    try {
      await navigator.clipboard.writeText(lines.join("\n").trim());
      setCopiedAll(true);
      toast.success("تم نسخ جميع الأذكار");
      setTimeout(() => setCopiedAll(false), 2500);
    } catch {
      toast.error("تعذر النسخ");
    }
  };



  const addMyDhikr = () => {
    const text = customText.trim();
    const count = Math.max(1, Number.parseInt(customCount, 10) || 1);

    if (!text) {
      toast.error("اكتب الذكر أولاً");
      return;
    }

    if (editingItemIdx !== null) {
      // Edit mode
      if (isMyAdhkarSection || !props.isCustomSection) {
        const mapped = toCustomItemIndex(editingItemIdx);
        if (mapped === null) {
          toast.error("لا يمكن تعديل هذا الذكر");
          return;
        }
        updateCustomDhikrItem(props.sectionId, mapped, { text, count, benefit: customBenefit });
        void queryClient.invalidateQueries({ queryKey: ["adhkar-db"] });
      } else if (props.isCustomSection) {
        updateCustomPackItem(props.sectionId, editingItemIdx, { text, count });
      }
      toast.success("تم تعديل الذكر");
    } else {
      addCustomDhikrItem({ text, count, benefit: customBenefit, sectionId: props.sectionId, sectionTitle: props.title });
      void queryClient.invalidateQueries({ queryKey: ["adhkar-db"] });
      toast.success("تمتت إضافة الذكر");
    }

    setCustomText("");
    setCustomBenefit("");
    setCustomCount("1");
    setEditingItemIdx(null);
    setAddOpen(false);
  };

  function openEditItem(originalIndex: number) {
    const item = props.items[originalIndex];
    if (!item) return;
    setCustomText(item.text);
    setCustomCount(String(coerceCount(item.count)));
    setCustomBenefit(item.benefit ?? "");
    setEditingItemIdx(originalIndex);
    setAddOpen(true);
    window.setTimeout(() => {
      editSheetRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  }

  const handleDeleteItem = (originalIndex: number) => {
    if (isMyAdhkarSection || !props.isCustomSection) {
      const mapped = toCustomItemIndex(originalIndex);
      if (mapped === null) {
        toast.error("لا يمكن حذف هذا الذكر");
        return;
      }
      removeCustomDhikrItem(props.sectionId, mapped);
      void queryClient.invalidateQueries({ queryKey: ["adhkar-db"] });
    } else if (props.isCustomSection) {
      removeCustomPackItem(props.sectionId, originalIndex);
    }
    toast.success("تم الحذف");
  };

  const toCustomItemIndex = React.useCallback((originalIndex: number): number | null => {
    if (props.isCustomSection || isMyAdhkarSection) return originalIndex;
    const mapped = originalIndex - firstCustomItemIndex;
    if (mapped < 0) return null;
    return mapped;
  }, [firstCustomItemIndex, isMyAdhkarSection, props.isCustomSection]);

  return (
    <div className="relative isolate">
      <div className="dhikr-page-stars absolute inset-0 pointer-events-none" />

      {/* Premium floating progress bar — portalled to body to escape framer-motion's containing block.
          Hidden while scrolling, slides in with a live animated fill when scrolling stops. */}
      {createPortal(
        <div
          className={[
            "fixed left-3 right-3 z-[100] flex items-center gap-3",
            "rounded-2xl px-4 py-2.5",
            "dhikr-progress-pill",
            "transition-all duration-300 ease-out",
            compactBarVisible
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 -translate-y-3 scale-[0.97] pointer-events-none",
          ].join(" ")}
          style={{
            top: "calc(var(--sat, 0px) + 8px)",
            // @ts-expect-error custom property for accent-driven styling
            "--pill-accent": identity.accent,
          }}
          aria-hidden={compactBarVisible ? undefined : "true"}
        >
          <span className="text-lg leading-none shrink-0" aria-hidden="true">{identity.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[13px] font-semibold truncate" style={{ color: identity.accent }}>{props.title}</div>
              <div className="text-[12px] font-bold tabular-nums shrink-0" style={{ color: identity.accent }}>
                {stats.percent}%
              </div>
            </div>
            <div className="mt-1.5 dhikr-progress-track">
              <div
                className="dhikr-progress-glow"
                style={{ width: `${stats.percent}%` }}
              >
                <span className="dhikr-progress-shimmer" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="relative z-[1] space-y-4">
      <div ref={headerCardRef}>
      <Card className="p-5 overflow-hidden relative">
        <div className="dhikr-card-stars absolute inset-0 pointer-events-none" />
        {/* Color identity gradient overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-bl ${identity.grad} pointer-events-none opacity-55`}
          style={{ borderRadius: "inherit" }}
        />
        <div className="relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{identity.icon}</span>
                <div className="text-xs opacity-60">القسم</div>
              </div>
              <h1 className="text-xl md:text-2xl font-semibold" style={{ color: identity.accent }}>{props.title}</h1>
              <div className="text-sm opacity-70 mt-2 tabular-nums">
                {hasItems
                  ? `التقدّم: ${stats.done}/${stats.total} • ${stats.percent}% • ~${Math.max(1, Math.round(props.items.length / 2))} دق`
                  : "0 ذكر"}
              </div>
              {weeklyStats.weeklyCount > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] opacity-60">أتممتها {weeklyStats.weeklyCount} مرات هذا الأسبوع</span>
                  <div className="flex items-end gap-[2px]">
                    {weeklyStats.bars.map((v, i) => (
                      <div
                        key={i}
                        className="w-[5px] rounded-sm transition-all"
                        style={{
                          height: v ? "12px" : "5px",
                          background: v ? identity.accent : "var(--card-2)",
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" onClick={() => setAddOpen(true)}>
                <Plus size={16} aria-hidden="true" />
                إضافة
              </Button>
              <Button
                variant={focusMode ? "primary" : "secondary"}
                onClick={() => setFocusMode((prev) => !prev)}
                aria-label={focusMode ? "إنهاء وضع التركيز" : "وضع التركيز"}
              >
                <Focus size={16} aria-hidden="true" />
              </Button>
              {autoReadActive && (
                <Button variant="primary" onClick={stopAutoRead} aria-label="إيقاف">
                  <Square size={14} aria-hidden="true" />
                  إيقاف · {autoReadCountdown}ث
                </Button>
              )}
              <Button
                variant={(moreOpen || confirmReset || confirmDone || confirmDeleteCategory) ? "primary" : "secondary"}
                onClick={() => setMoreOpen((prev) => !prev)}
                aria-label="خيارات إضافية"
                aria-expanded={(moreOpen || confirmReset || confirmDone || confirmDeleteCategory)}
                aria-controls="dhikr-more-panel"
              >
                <MoreHorizontal size={16} aria-hidden="true" />
              </Button>
            </div>
            {(moreOpen || confirmReset || confirmDone || confirmDeleteCategory) && (
              <div id="dhikr-more-panel" role="toolbar" aria-label="خيارات إضافية" className="mt-2 flex flex-wrap items-center gap-2 pb-1">
                {confirmReset ? (
                  <>
                    <Button
                      variant="outline"
                      className="border-danger-40 text-[var(--danger)] hover:bg-danger-10 shrink-0"
                      onClick={() => { resetSection(props.sectionId); setConfirmReset(false); }}
                    >
                      <RotateCcw size={16} aria-hidden="true" />
                      تأكيد التصفير
                    </Button>
                    <Button variant="outline" className="shrink-0" onClick={() => setConfirmReset(false)}>
                      إلغاء
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setConfirmReset(true)}
                    disabled={!hasItems}
                  >
                    <RotateCcw size={16} aria-hidden="true" />
                    تصفير
                  </Button>
                )}
                {confirmDone ? (
                  <>
                    <Button
                      variant="outline"
                      className="border-ok-40 text-[var(--ok)] hover:bg-ok-10 shrink-0"
                      onClick={markAllDone}
                    >
                      <CheckCheck size={16} aria-hidden="true" />
                      تأكيد الإكمال
                    </Button>
                    <Button variant="outline" className="shrink-0" onClick={() => setConfirmDone(false)}>
                      إلغاء
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    className="shrink-0"
                    onClick={() => setConfirmDone(true)}
                    disabled={isDailySectionLocked || !hasItems || stats.percent >= 100}
                    aria-label="تحديد جميع الأذكار كمكتملة"
                  >
                    <CheckCheck size={16} aria-hidden="true" />
                    إكمال
                  </Button>
                )}
                <Button variant="secondary" className="shrink-0" onClick={copyAllText} disabled={!hasItems}>
                  <Copy size={16} aria-hidden="true" />
                  {copiedAll ? "تم ✓" : "نسخ الكل"}
                </Button>
                <Button
                  variant="secondary"
                  className="shrink-0"
                  disabled={!hasItems}
                  aria-label="مشاركة الأذكار"
                  onClick={async () => {
                    const lines: string[] = [`【 ${props.title} 】`, ""];
                    orderedEntries.forEach(({ item }, idx) => {
                      const count = coerceCount(item.count);
                      const repeatLabel = count > 1 ? ` (${count} مرات)` : "";
                      lines.push(`${idx + 1}. ${item.text}${repeatLabel}`);
                      if (item.benefit) lines.push(`   ﴾ ${item.benefit} ﴿`);
                      lines.push("");
                    });
                    const text = lines.join("\n").trim() + "\n\n• أثر";
                    if (navigator.share) { await navigator.share({ text }).catch(() => {}); }
                    else { try { await navigator.clipboard.writeText(text); toast.success("تم النسخ"); } catch { toast.error("تعذّر النسخ"); } }
                  }}
                >
                  <Share2 size={16} />
                </Button>
                <Button
                  variant={compact ? "primary" : "secondary"}
                  className="shrink-0"
                  onClick={() => setCompact((prev) => !prev)}
                  aria-label={compact ? "عرض موسّع" : "عرض مضغوط"}
                >
                  <List size={16} aria-hidden="true" />
                </Button>
                <Button
                  variant={reorderMode ? "primary" : "secondary"}
                  className="shrink-0"
                  onClick={() => setReorderMode((prev) => !prev)}
                  disabled={!hasItems}
                  aria-label="ترتيب الأذكار"
                >
                  <ArrowUpDown size={16} aria-hidden="true" />
                  ترتيب
                </Button>
                {reorderMode && savedItemOrder?.length ? (
                  <Button variant="ghost" className="shrink-0" onClick={() => resetSectionItemOrder(props.sectionId)} aria-label="إعادة الترتيب">
                    <RotateCcw size={16} aria-hidden="true" />
                  </Button>
                ) : null}
                {/* D12: auto-read mode */}
                {!autoReadActive && (
                  <>
                    <select
                      value={autoReadSpeed}
                      onChange={(e) => setAutoReadSpeed(Number(e.target.value))}
                      className="shrink-0 h-9 rounded-xl border border-[var(--stroke)] bg-[var(--card)] px-2 text-xs outline-none"
                      aria-label="سرعة القراءة التلقائية"
                    >
                      <option value={3}>٣ ثانية</option>
                      <option value={5}>٥ ثواني</option>
                      <option value={10}>١٠ ثواني</option>
                    </select>
                    <Button variant="secondary" className="shrink-0" onClick={startAutoRead} disabled={!hasItems} aria-label="بدء القراءة التلقائية">
                      <Timer size={14} aria-hidden="true" />
                      تلقائي
                    </Button>
                  </>
                )}
                {firstIncompleteIdx > 0 && stats.percent < 100 && (
                  <Button
                    variant="secondary"
                    className="shrink-0"
                    onClick={() => virtuosoRef.current?.scrollToIndex({ index: firstIncompleteIdx, align: "start", behavior: "smooth" })}
                    aria-label="انتقل إلى أول ذكر غير مكتمل"
                  >
                    <ChevronsDown size={16} aria-hidden="true" />
                  </Button>
                )}
                {props.onDeleteCategory && (
                  confirmDeleteCategory ? (
                    <>
                      <Button
                        variant="outline"
                        className="border-danger-40 text-[var(--danger)] hover:bg-danger-10 shrink-0"
                        onClick={() => { props.onDeleteCategory!(); }}
                      >
                        <Trash2 size={14} />
                        تأكيد حذف الفئة
                      </Button>
                      <Button variant="outline" className="shrink-0" onClick={() => setConfirmDeleteCategory(false)}>
                        إلغاء
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      className="border-danger-40 text-[var(--danger)] hover:bg-danger-10 shrink-0"
                      onClick={() => setConfirmDeleteCategory(true)}
                    >
                      <Trash2 size={14} />
                      حذف الفئة
                    </Button>
                  )
                )}
              </div>
            )}
          </div>

          {isDailySectionLocked && midnightLabel && (
            <div className="mt-3 flex items-center gap-1.5 text-[11px] opacity-55">
              <Lock size={11} aria-hidden="true" />
              <span>يتجدد مع الفجر · متبقّي {midnightLabel}</span>
            </div>
          )}
        </div>
      </Card>
      </div>

      <div className={["dhikr-scroll-area", compact ? "dhikr-compact" : ""].join(" ")}>
        {stats.percent >= 100 && (
          <div className="mb-3 space-y-2">
            <div className="rounded-3xl border border-ok-30 bg-ok-10 px-5 py-4 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--ok)" }}>اكتمل القسم</div>
                <div className="text-xs opacity-65 mt-0.5">
                  {isDailySectionLocked
                    ? "أحسنت — يتجدد تلقائيًا مع أذان الفجر"
                    : "قرأت جميع الأذكار في هذا القسم"}
                </div>
              </div>
            </div>
            {relatedSections.length > 0 && (
              <div>
                <div className="text-[11px] opacity-45 font-semibold px-1 mb-1.5">استمر مع قسم آخر</div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
                  {relatedSections.map(({ s, id: sid, pct: p }) => (
                    <button type="button"
                      key={s.id}
                      onClick={() => navigate(`/c/${s.id}`)}
                      className="flex-none flex items-center gap-2 px-3 py-2 rounded-2xl glass border border-[var(--stroke)] text-right press-effect min-h-[44px] min-w-max"
                    >
                      <span className="text-lg leading-none">{sid.icon}</span>
                      <div>
                        <div className="text-xs font-medium">{s.title}</div>
                        {p > 0 && <div className="text-[10px] opacity-50 tabular-nums">{p}%</div>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {props.items.length === 0 && isMyAdhkarSection ? (
          <div className="min-h-[40dvh] rounded-3xl border border-[var(--stroke)] bg-[var(--card)] grid place-items-center p-6 text-center">
            <div>
              <div className="text-3xl mb-3">✦</div>
              <div className="font-semibold">أذكاري</div>
              <Button className="mt-4" onClick={() => setAddOpen(true)}>
                <Plus size={16} aria-hidden="true" />
                إضافة ذكر
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {orderedEntries.map((entry, displayIndex) => (
              <div
                key={entry.originalIndex}
                ref={(el) => { itemElsRef.current[displayIndex] = el; }}
                className="pb-4"
              >
                {reorderMode ? (
                  <div className="mb-2 flex items-center justify-between gap-2 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-3 py-2">
                    <div className="text-xs tabular-nums opacity-65">{displayIndex + 1}</div>
                    <div className="flex items-center gap-1.5">
                      <button type="button"
                        onClick={() => moveSectionItem(props.sectionId, displayIndex, displayIndex - 1, props.items.length)}
                        disabled={displayIndex === 0}
                        className="h-9 w-9 rounded-xl border border-[var(--stroke)] bg-[var(--card)] grid place-items-center disabled:opacity-30"
                        aria-label="رفع الذكر"
                
                      >
                        <MoveUp size={15} aria-hidden="true" />
                      </button>
                      <button type="button"
                        onClick={() => moveSectionItem(props.sectionId, displayIndex, displayIndex + 1, props.items.length)}
                        disabled={displayIndex >= orderedEntries.length - 1}
                        className="h-9 w-9 rounded-xl border border-[var(--stroke)] bg-[var(--card)] grid place-items-center disabled:opacity-30"
                        aria-label="خفض الذكر"
                
                      >
                        <MoveDown size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ) : null}
                {(props.isCustomSection || isMyAdhkarSection || entry.originalIndex >= firstCustomItemIndex) && !reorderMode && (
                  <div className="flex justify-end mb-1.5 px-1 gap-1.5">
                    {deletingItemIdx === entry.originalIndex ? (
                      <>
                        <button type="button"
                          onClick={() => setDeletingItemIdx(null)}
                          className="h-9 px-3 rounded-xl text-xs bg-[var(--card)] border border-[var(--stroke)] opacity-70 hover:opacity-100 active:opacity-100 transition"
                        >
                          إلغاء
                        </button>
                        <button type="button"
                          onClick={() => { handleDeleteItem(entry.originalIndex); setDeletingItemIdx(null); }}
                          className="h-9 px-3 rounded-xl text-xs bg-danger-15 text-[var(--danger)] border border-danger-30 hover:bg-danger-20 active:bg-danger-20 transition font-medium"
                        >
                          تأكيد الحذف
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button"
                          onClick={() => openEditItem(entry.originalIndex)}
                          className="h-9 px-3 rounded-xl text-xs flex items-center gap-1.5 border transition font-semibold"
                          style={{
                            background: "var(--accent)",
                            color: "var(--on-accent)",
                            borderColor: "color-mix(in srgb, var(--accent) 62%, transparent)",
                          }}
                          aria-label="تعديل الذكر"
                        >
                          <Pencil size={12} />
                          تعديل
                        </button>
                        <button type="button"
                          onClick={() => setDeletingItemIdx(entry.originalIndex)}
                          className="h-9 px-3 rounded-xl text-xs flex items-center gap-1.5 bg-danger-8 text-[var(--danger)] border border-danger-20 hover:bg-danger-15 active:bg-danger-15 transition"
                          aria-label="حذف الذكر"
                        >
                          <Trash2 size={12} />
                          حذف
                        </button>
                      </>
                    )}
                  </div>
                )}
                <DhikrCard
                  sectionId={props.sectionId}
                  sectionTitle={props.title}
                  index={entry.originalIndex}
                  item={entry.item}
                  autoFocus={props.focusIndex === entry.originalIndex}
                  totalItems={props.items.length}
                  focusMode={focusMode}
                  onComplete={() => {
                    const nextIdx = displayIndex + 1;
                    if (nextIdx < orderedEntries.length) {
                      // slowMs opts into a noticeably slower glide for the
                      // auto-advance transition (default scrollToIndex stays
                      // fast so taps-to-jump feel snappy).
                      virtuosoRef.current?.scrollToIndex({ index: nextIdx, align: "center", behavior: "smooth", slowMs: 1100 });
                    }
                  }}
                />
              </div>
            ))}
            <div style={{ height: 120 }} aria-hidden="true" />
          </div>
        )}
        {!addOpen ? (
          (
            <button type="button"
              onClick={() => { setEditingItemIdx(null); setCustomText(""); setCustomCount("1"); setCustomBenefit(""); setAddOpen(true); }}
              aria-label="إضافة ذكر"
              className="fixed right-4 z-[9991] h-14 w-14 rounded-2xl bg-[var(--accent)] text-[var(--on-accent)] shadow-2xl grid place-items-center active:scale-95 transition"
              style={{ bottom: "calc(var(--mobile-nav-height) + (var(--mobile-nav-gap) * 2) + var(--mobile-fab-size) + var(--mobile-fab-gap) + var(--sab))" }}
            >
              <Plus size={22} aria-hidden="true" />
            </button>
          )
        ) : null}
        {addOpen ? (
          <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <button type="button" className="absolute inset-0" aria-label="إغلاق" onClick={() => { setAddOpen(false); setEditingItemIdx(null); }} />
            <div ref={editSheetRef} className="relative z-10 glass-strong w-full max-w-lg max-h-[86dvh] rounded-3xl border border-[var(--stroke)] overflow-auto shadow-2xl" dir="rtl" role="dialog" aria-modal="true" aria-label={editingItemIdx !== null ? "تعديل ذكر" : "إضافة ذكر"}>
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-[var(--stroke)]" /></div>
              <div className="px-5 pb-5 pb-safe">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden="true">{editingItemIdx !== null ? "✏️" : "✨"}</span>
                    <div>
                      <div className="font-semibold text-sm">{editingItemIdx !== null ? "تعديل ذكر" : "إضافة ذكر جديد"}</div>
                      <div className="text-xs opacity-50 truncate max-w-[160px]">{props.title}</div>
                    </div>
                  </div>
                  <button type="button"
                    onClick={() => { setAddOpen(false); setEditingItemIdx(null); }}
                    className="h-9 w-9 rounded-2xl bg-[var(--card)] border border-[var(--stroke)] grid place-items-center hover:bg-[var(--card-2)] transition"
                    aria-label="إغلاق"
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                </div>

                {/* Count row */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 text-xs opacity-55">عدد التكرار</div>
                  <div className="flex items-center gap-2">
                    <button type="button"
                      onClick={() => setCustomCount((v) => String(Math.max(1, parseInt(v, 10) - 1 || 1)))}
                      className="h-8 w-8 rounded-xl bg-[var(--card)] border border-[var(--stroke)] grid place-items-center hover:bg-[var(--card-2)] transition text-sm"
                      aria-label="تقليل العدد"
                    >−</button>
                    <input
                      type="number"
                      min={1}
                      max={9999}
                      value={customCount}
                      onChange={(e) => setCustomCount(e.target.value)}
                      inputMode="numeric"
                      className="w-16 h-8 px-2 rounded-xl bg-[var(--card)] border border-[var(--stroke)] text-center text-sm outline-none focus:border-[var(--accent)]"
                      aria-label="عدد التكرار"
                    />
                    <button type="button"
                      onClick={() => setCustomCount((v) => String(Math.min(9999, parseInt(v, 10) + 1 || 1)))}
                      className="h-8 w-8 rounded-xl bg-[var(--card)] border border-[var(--stroke)] grid place-items-center hover:bg-[var(--card-2)] transition text-sm"
                      aria-label="زيادة العدد"
                    >+</button>
                  </div>
                </div>

                {/* Text area */}
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="اكتب الذكر هنا…"
                  aria-label="نص الذكر الجديد"
                  autoFocus
                  dir="rtl"
                  spellCheck={false}
                  rows={4}
                  className="form-field-readable w-full rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-4 py-3 text-sm leading-7 outline-none focus:border-[var(--accent)] resize-none transition"
                />
                <div className="flex justify-end mt-0.5 mb-3">
                  <span className="text-[10px] opacity-35 tabular-nums">{customText.length} حرف</span>
                </div>

                {/* Benefit/source */}
                <Input
                  value={customBenefit}
                  onChange={(e) => setCustomBenefit(e.target.value)}
                  placeholder="المصدر أو فضل الذكر (اختياري)"
                  aria-label="المصدر أو الفضل"
                />

                {/* Action buttons */}
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" className="flex-none" onClick={() => { setAddOpen(false); setEditingItemIdx(null); }}>إلغاء</Button>
                  <Button className="flex-1" onClick={addMyDhikr} disabled={!customText.trim()}>
                    {editingItemIdx !== null ? (
                      <><Pencil size={15} aria-hidden="true" /> حفظ التعديل</>
                    ) : (
                      <><Plus size={15} aria-hidden="true" /> إضافة الذكر</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {showBackToTop && (
          <button type="button"
            onClick={() => virtuosoRef.current?.scrollToIndex({ index: 0, behavior: "smooth" })}
            aria-label="العودة إلى أعلى"
            style={{ bottom: "calc(var(--dhikr-fixed-bottom, 26px) + 48px + 8px)" }}
            className={[
              "fixed left-4 z-40",
              "w-11 h-11 rounded-2xl glass-strong border border-[var(--stroke)] shadow-xl",
              "flex items-center justify-center transition-all duration-200",
              "hover:scale-105 active:scale-95",
            ].join(" ")}
          >
            <ArrowUp size={18} aria-hidden="true" />
          </button>
        )}
        {focusMode && (
          <button type="button"
            onClick={() => setFocusMode(false)}
            aria-label="إنهاء وضع التركيز"
            style={{ bottom: "var(--dhikr-fixed-bottom, 26px)" }}
            className={[
              "fixed left-1/2 -translate-x-1/2 z-50",
              "px-5 py-2.5 rounded-2xl glass-strong border border-[var(--stroke)] shadow-2xl",
              "flex items-center gap-2 text-sm font-medium transition-all duration-200",
              "hover:scale-105 active:scale-95 focus-mode-exit",
            ].join(" ")}
          >
            <Focus size={15} aria-hidden="true" />
            إنهاء وضع التركيز
          </button>
        )}
      </div>

      {/* Prev / Next Section navigation */}
      {(prevSection || nextSection) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-2 px-1">
          {nextSection ? (
            <button type="button"
              onClick={() => navigate(`/c/${nextSection.id}`)}
              className="flex items-start gap-2 px-3 py-2.5 rounded-2xl glass border border-[var(--stroke)] press-effect text-sm min-h-[44px] flex-1 justify-start text-right"
            >
              <ChevronRight size={16} aria-hidden="true" className="opacity-60 shrink-0" />
              <span className="min-w-0 text-xs opacity-65 leading-snug whitespace-normal break-words">{nextSection.title}</span>
            </button>
          ) : <div className="flex-1" />}
          {prevSection ? (
            <button type="button"
              onClick={() => navigate(`/c/${prevSection.id}`)}
              className="flex items-start gap-2 px-3 py-2.5 rounded-2xl glass border border-[var(--stroke)] press-effect text-sm min-h-[44px] flex-1 justify-end text-right"
            >
              <span className="min-w-0 text-xs opacity-65 leading-snug whitespace-normal break-words">{prevSection.title}</span>
              <ChevronLeft size={16} aria-hidden="true" className="opacity-60 shrink-0" />
            </button>
          ) : <div className="flex-1" />}
        </div>
          )}
      </div>

      <FloatingAthar modalMode prefill={`علِّمني لماذا «${props.title}» مهم في حياة المسلم، وكيف أعيشه عمليًا اليوم؟`} />
    </div>
  );
}
