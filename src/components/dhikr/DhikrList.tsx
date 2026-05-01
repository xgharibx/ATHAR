import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { RotateCcw, ArrowDownToLine, Lock, Copy, List, ChevronsDown, ArrowUp, Focus, ChevronRight, ChevronLeft, CheckCheck, Plus, X, ArrowUpDown, MoveUp, MoveDown, Timer, Play, Pause, Square } from "lucide-react";
import toast from "react-hot-toast";

const getConfetti = () => import("canvas-confetti").then((m) => m.default ?? m);

import { DhikrCard } from "@/components/dhikr/DhikrCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { coerceCount, type DhikrItem } from "@/data/types";
import { useNoorStore } from "@/store/noorStore";
import { pct } from "@/lib/utils";
import { downloadJson } from "@/lib/download";
import { isDailySection } from "@/lib/dailySections";
import { getSectionIdentity } from "@/lib/sectionIdentity";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { MY_ADHKAR_SECTION_ID, addCustomDhikrItem } from "@/data/packs";
import { Input } from "@/components/ui/Input";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { getNextIbadahBoundary, getNextLocalMidnight } from "@/lib/dayBoundaries";

export function DhikrList(props: Readonly<{
  sectionId: string;
  title: string;
  items: DhikrItem[];
  focusIndex?: number | null;
}>) {
  const resetSection = useNoorStore((s) => s.resetSection);
  const increment = useNoorStore((s) => s.increment);
  const progressMap = useNoorStore((s) => s.progress);
  const savedItemOrder = useNoorStore((s) => s.sectionItemOrder[props.sectionId]);
  const moveSectionItem = useNoorStore((s) => s.moveSectionItem);
  const resetSectionItemOrder = useNoorStore((s) => s.resetSectionItemOrder);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: adhkarData } = useAdhkarDB();
  const prayerTimes = usePrayerTimes();
  const fajrTime = prayerTimes.data?.data?.timings?.Fajr ?? null;
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [confirmDone, setConfirmDone] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [customText, setCustomText] = React.useState("");
  const [customCount, setCustomCount] = React.useState("1");
  const [customBenefit, setCustomBenefit] = React.useState("");
  const isDailySectionLocked = isDailySection(props.sectionId);
  const isMyAdhkarSection = props.sectionId === MY_ADHKAR_SECTION_ID;
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
  const virtuosoRef = React.useRef<VirtuosoHandle>(null);

  // D2: category completion confetti
  const prevPercentRef = React.useRef<number>(stats.percent);
  React.useEffect(() => {
    if (stats.percent >= 100 && prevPercentRef.current < 100 && props.items.length > 0) {
      getConfetti().then((c) => {
        c({ particleCount: 120, spread: 80, startVelocity: 30, scalar: 1.0, origin: { y: 0.6 } });
        setTimeout(() => c({ particleCount: 60, spread: 100, startVelocity: 20, scalar: 0.9, origin: { x: 0.2, y: 0.8 } }), 300);
        setTimeout(() => c({ particleCount: 60, spread: 100, startVelocity: 20, scalar: 0.9, origin: { x: 0.8, y: 0.8 } }), 500);
      });
    }
    prevPercentRef.current = stats.percent;
  }, [stats.percent, props.items.length]);

  // D12: auto-read mode
  const [autoReadActive, setAutoReadActive] = React.useState(false);
  const [autoReadSpeed, setAutoReadSpeed] = React.useState(5); // seconds per card
  const [autoReadIdx, setAutoReadIdx] = React.useState(0);
  const [autoReadCountdown, setAutoReadCountdown] = React.useState(0);
  const autoReadIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const stopAutoRead = React.useCallback(() => {
    setAutoReadActive(false);
    if (autoReadIntervalRef.current) { clearInterval(autoReadIntervalRef.current); autoReadIntervalRef.current = null; }
  }, []);
  const startAutoRead = React.useCallback(() => {
    setAutoReadIdx(0);
    setAutoReadCountdown(autoReadSpeed);
    setAutoReadActive(true);
  }, [autoReadSpeed]);
  React.useEffect(() => {
    if (!autoReadActive) return;
    let remaining = autoReadSpeed;
    let currentIdx = autoReadIdx;
    setAutoReadCountdown(remaining);
    virtuosoRef.current?.scrollToIndex({ index: currentIdx, align: "start", behavior: "smooth" });
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
        remaining = autoReadSpeed;
        setAutoReadCountdown(remaining);
        setAutoReadIdx(currentIdx);
        virtuosoRef.current?.scrollToIndex({ index: currentIdx, align: "start", behavior: "smooth" });
      }
    }, 1000);
    autoReadIntervalRef.current = id;
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoReadActive, autoReadSpeed, orderedEntries.length]);
  React.useEffect(() => () => { if (autoReadIntervalRef.current) clearInterval(autoReadIntervalRef.current); }, []);

  // Apply / remove focus-mode class on body
  React.useEffect(() => {
    if (focusMode) {
      document.body.classList.add("focus-mode");
    } else {
      document.body.classList.remove("focus-mode");
    }
    return () => {
      document.body.classList.remove("focus-mode");
    };
  }, [focusMode]);

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

  const exportSection = () => {
    const safeTitle = (props.title || "")
      .replaceAll(/[\\/:*?"<>|]+/g, " ")
      .replaceAll(/\s+/g, " ")
      .trim();

    const blob = {
      id: props.sectionId,
      title: props.title,
      exportedAt: new Date().toISOString(),
      items: orderedEntries.map((entry) => entry.item)
    };
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(`ATHAR-${safeTitle || "قسم"}-${date}.athar`, blob);
    toast.success("تم تصدير القسم كملف");
  };

  const addMyDhikr = () => {
    const text = customText.trim();
    const count = Math.max(1, Number.parseInt(customCount, 10) || 1);

    if (!text) {
      toast.error("اكتب الذكر أولاً");
      return;
    }

    addCustomDhikrItem({ text, count, benefit: customBenefit, sectionId: props.sectionId, sectionTitle: props.title });
    setCustomText("");
    setCustomBenefit("");
    setCustomCount("1");
    setAddOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["adhkar-db"] });
    toast.success("تمت إضافة الذكر");
  };

  return (
    <div className="relative isolate">
      <div className="dhikr-page-stars absolute inset-0 pointer-events-none" />

      <div className="relative z-[1] space-y-4">
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
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" onClick={() => setAddOpen(true)}>
                <Plus size={16} />
                إضافة
              </Button>
              {confirmReset ? (
                <>
                  <Button
                    variant="outline"
                    className="border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[var(--danger)]/10"
                    onClick={() => {
                      resetSection(props.sectionId);
                      setConfirmReset(false);
                    }}
                  >
                    <RotateCcw size={16} />
                    تأكيد التصفير
                  </Button>
                  <Button variant="outline" onClick={() => setConfirmReset(false)}>
                    إلغاء
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setConfirmReset(true)}
                  disabled={isDailySectionLocked || !hasItems}
                  title={isDailySectionLocked ? "يتجدد هذا القسم تلقائيًا عند منتصف الليل" : "تصفير القسم"}
                >
                  <RotateCcw size={16} />
                  تصفير القسم
                </Button>
              )}
              {confirmDone ? (
                <>
                  <Button
                    variant="outline"
                    className="border-[var(--ok)]/40 text-[var(--ok)] hover:bg-[var(--ok)]/10"
                    onClick={markAllDone}
                  >
                    <CheckCheck size={16} />
                    تأكيد الإكمال
                  </Button>
                  <Button variant="outline" onClick={() => setConfirmDone(false)}>
                    إلغاء
                  </Button>
                </>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => setConfirmDone(true)}
                  disabled={isDailySectionLocked || !hasItems || stats.percent >= 100}
                  title="تحديد جميع الأذكار كمكتملة"
                  aria-label="تحديد جميع الأذكار كمكتملة"
                >
                  <CheckCheck size={16} />
                </Button>
              )}
              <Button variant="secondary" onClick={exportSection} disabled={!hasItems}>
                <ArrowDownToLine size={16} />
                تصدير
              </Button>
              <Button variant="secondary" onClick={copyAllText} disabled={!hasItems}>
                <Copy size={16} />
                {copiedAll ? "تم ✓" : "نسخ الكل"}
              </Button>
              <Button
                variant={compact ? "primary" : "secondary"}
                onClick={() => setCompact((prev) => !prev)}
                title={compact ? "عرض موسّع" : "عرض مضغوط"}
                aria-label={compact ? "عرض موسّع" : "عرض مضغوط"}
              >
                <List size={16} />
              </Button>
              <Button
                variant={reorderMode ? "primary" : "secondary"}
                onClick={() => setReorderMode((prev) => !prev)}
                disabled={!hasItems}
                title="ترتيب الأذكار"
                aria-label="ترتيب الأذكار"
              >
                <ArrowUpDown size={16} />
                ترتيب
              </Button>
              {reorderMode && savedItemOrder?.length ? (
                <Button variant="ghost" onClick={() => resetSectionItemOrder(props.sectionId)} title="إعادة الترتيب" aria-label="إعادة الترتيب">
                  <RotateCcw size={16} />
                </Button>
              ) : null}
              <Button
                variant={focusMode ? "primary" : "secondary"}
                onClick={() => setFocusMode((prev) => !prev)}
                title={focusMode ? "إنهاء وضع التركيز" : "وضع التركيز — إخفاء شريط التنقل"}
                aria-label={focusMode ? "إنهاء وضع التركيز" : "وضع التركيز"}
              >
                <Focus size={16} />
              </Button>
              {/* D12: auto-read mode */}
              {!autoReadActive ? (
                <>
                  <select
                    value={autoReadSpeed}
                    onChange={(e) => setAutoReadSpeed(Number(e.target.value))}
                    className="h-9 rounded-xl border border-white/10 bg-white/6 px-2 text-xs outline-none"
                    aria-label="سرعة القراءة التلقائية"
                    title="ثواني لكل بطاقة"
                  >
                    <option value={3}>٣ ثانية</option>
                    <option value={5}>٥ ثواني</option>
                    <option value={10}>١٠ ثواني</option>
                  </select>
                  <Button variant="secondary" onClick={startAutoRead} disabled={!hasItems} title="بدء القراءة التلقائية" aria-label="بدء القراءة التلقائية">
                    <Timer size={14} />
                    تلقائي
                  </Button>
                </>
              ) : (
                <Button variant="primary" onClick={stopAutoRead} title="إيقاف القراءة التلقائية" aria-label="إيقاف">
                  <Square size={14} />
                  إيقاف · {autoReadCountdown}ث
                </Button>
              )}
              {firstIncompleteIdx > 0 && stats.percent < 100 && (
                <Button
                  variant="secondary"
                  onClick={() => virtuosoRef.current?.scrollToIndex({ index: firstIncompleteIdx, align: "start", behavior: "smooth" })}
                  title="انتقل إلى أول ذكر غير مكتمل"
                  aria-label="انتقل إلى أول ذكر غير مكتمل"
                >
                  <ChevronsDown size={16} />
                </Button>
              )}
            </div>
          </div>

          {isDailySectionLocked && midnightLabel && (
            <div className="mt-3 flex items-center gap-1.5 text-[11px] opacity-55">
              <Lock size={11} />
              <span>يتجدد مع الفجر · متبقّي {midnightLabel}</span>
            </div>
          )}

          <div className="mt-4 h-2.5 rounded-full bg-white/8 overflow-hidden border border-white/10">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${stats.percent}%`, background: identity.accent }}
            />
          </div>
        </div>
      </Card>

      <div style={{ height: "calc(100dvh - 240px)", minHeight: "440px" }} className={compact ? "dhikr-compact" : ""}>
        {stats.percent >= 100 && (
          <div className="mb-3 space-y-2">
            <div className="rounded-3xl border border-[var(--ok)]/30 bg-[var(--ok)]/10 px-5 py-4 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--ok)" }}>اكتمل القسم</div>
                <div className="text-xs opacity-65 mt-0.5">
                  {isDailySectionLocked
                    ? "أحسنت — يتجدد تلقائيًا عند منتصف الليل"
                    : "قرأت جميع الأذكار في هذا القسم"}
                </div>
              </div>
            </div>
            {relatedSections.length > 0 && (
              <div>
                <div className="text-[11px] opacity-45 font-semibold px-1 mb-1.5">استمر مع قسم آخر</div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
                  {relatedSections.map(({ s, id: sid, pct: p }) => (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/c/${s.id}`)}
                      className="flex-none flex items-center gap-2 px-3 py-2 rounded-2xl glass border border-white/10 text-right press-effect min-h-[44px] min-w-max"
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
          <div className="h-full rounded-3xl border border-white/10 bg-white/5 grid place-items-center p-6 text-center">
            <div>
              <div className="text-3xl mb-3">✦</div>
              <div className="font-semibold">أذكاري</div>
              <Button className="mt-4" onClick={() => setAddOpen(true)}>
                <Plus size={16} />
                إضافة ذكر
              </Button>
            </div>
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            style={{ height: "100%" }}
            data={orderedEntries}
            atTopStateChange={(atTop) => setShowBackToTop(!atTop)}
            itemContent={(displayIndex, entry) => (
              <div className="pb-4">
                {reorderMode ? (
                  <div className="mb-2 flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-xs tabular-nums opacity-65">{displayIndex + 1}</div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => moveSectionItem(props.sectionId, displayIndex, displayIndex - 1, props.items.length)}
                        disabled={displayIndex === 0}
                        className="h-9 w-9 rounded-xl border border-white/10 bg-white/6 grid place-items-center disabled:opacity-30"
                        aria-label="رفع الذكر"
                        title="رفع"
                      >
                        <MoveUp size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSectionItem(props.sectionId, displayIndex, displayIndex + 1, props.items.length)}
                        disabled={displayIndex >= orderedEntries.length - 1}
                        className="h-9 w-9 rounded-xl border border-white/10 bg-white/6 grid place-items-center disabled:opacity-30"
                        aria-label="خفض الذكر"
                        title="خفض"
                      >
                        <MoveDown size={15} />
                      </button>
                    </div>
                  </div>
                ) : null}
                <DhikrCard
                  sectionId={props.sectionId}
                  index={entry.originalIndex}
                  item={entry.item}
                  autoFocus={props.focusIndex === entry.originalIndex}
                  totalItems={props.items.length}
                  onComplete={() => {
                    const nextIdx = displayIndex + 1;
                    if (nextIdx < orderedEntries.length) {
                      virtuosoRef.current?.scrollToIndex({ index: nextIdx, align: "start", behavior: "smooth" });
                    }
                  }}
                />
              </div>
            )}
          />
        )}
        {!addOpen ? (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            aria-label="إضافة ذكر"
            className="fixed right-4 z-[9991] h-14 w-14 rounded-2xl bg-[var(--accent)] text-black shadow-2xl grid place-items-center active:scale-95 transition"
            style={{ bottom: "calc(var(--mobile-nav-height) + (var(--mobile-nav-gap) * 2) + var(--mobile-fab-size) + var(--mobile-fab-gap) + var(--sab))" }}
          >
            <Plus size={22} />
          </button>
        ) : null}
        {addOpen ? (
          <div className="fixed inset-0 z-[10000] bg-black/55 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
            <button type="button" className="absolute inset-0" aria-label="إغلاق" onClick={() => setAddOpen(false)} />
            <div className="relative z-10 glass-strong w-full max-w-lg rounded-3xl border border-white/15 p-5 pb-32 md:pb-5 shadow-2xl" dir="rtl">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">إضافة ذكر</div>
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="h-10 w-10 rounded-2xl bg-white/8 border border-white/10 grid place-items-center"
                  aria-label="إغلاق"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_120px] gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-[var(--fg)]">
                  {props.title}
                </div>
                <Input
                  type="number"
                  min={1}
                  value={customCount}
                  onChange={(event) => setCustomCount(event.target.value)}
                  placeholder="العدد"
                />
              </div>
              <textarea
                value={customText}
                onChange={(event) => setCustomText(event.target.value)}
                placeholder="اكتب الذكر"
                className="form-field-readable mt-3 min-h-36 w-full rounded-3xl border border-white/10 px-4 py-3 text-sm leading-7 outline-none focus:border-[var(--accent)]/40"
              />
              <Input
                className="mt-3"
                value={customBenefit}
                onChange={(event) => setCustomBenefit(event.target.value)}
                placeholder="المصدر أو الفضل"
              />
              <Button className="mt-4 w-full" onClick={addMyDhikr}>
                <Plus size={16} />
                حفظ الذكر
              </Button>
            </div>
          </div>
        ) : null}
        {showBackToTop && (
          <button
            onClick={() => virtuosoRef.current?.scrollToIndex({ index: 0, behavior: "smooth" })}
            aria-label="العودة إلى أعلى"
            title="العودة إلى أعلى"
            className={[
              "fixed bottom-[calc(80px+env(safe-area-inset-bottom,0px))] left-4 z-40",
              "w-11 h-11 rounded-2xl glass-strong border border-white/15 shadow-xl",
              "flex items-center justify-center transition-all duration-200",
              "hover:scale-105 active:scale-95",
            ].join(" ")}
          >
            <ArrowUp size={18} aria-hidden="true" />
          </button>
        )}
        {focusMode && (
          <button
            onClick={() => setFocusMode(false)}
            aria-label="إنهاء وضع التركيز"
            className={[
              "fixed bottom-[calc(16px+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-50",
              "px-5 py-2.5 rounded-2xl glass-strong border border-white/20 shadow-2xl",
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
        <div className="flex items-center justify-between gap-2 mt-2 px-1">
          {nextSection ? (
            <button
              onClick={() => navigate(`/c/${nextSection.id}`)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-2xl glass border border-white/10 press-effect text-sm min-h-[44px] flex-1 justify-start"
              title={`التالي: ${nextSection.title}`}
            >
              <ChevronRight size={16} className="opacity-60 shrink-0" />
              <span className="text-xs opacity-65 truncate">{nextSection.title}</span>
            </button>
          ) : <div className="flex-1" />}
          {prevSection ? (
            <button
              onClick={() => navigate(`/c/${prevSection.id}`)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-2xl glass border border-white/10 press-effect text-sm min-h-[44px] flex-1 justify-end"
              title={`السابق: ${prevSection.title}`}
            >
              <span className="text-xs opacity-65 truncate">{prevSection.title}</span>
              <ChevronLeft size={16} className="opacity-60 shrink-0" />
            </button>
          ) : <div className="flex-1" />}
        </div>
      )}
      </div>
    </div>
  );
}
