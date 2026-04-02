import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { RotateCcw, ArrowDownToLine, Lock, Copy, List, ChevronsDown } from "lucide-react";
import toast from "react-hot-toast";

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

export function DhikrList(props: {
  sectionId: string;
  title: string;
  items: DhikrItem[];
  focusIndex?: number | null;
}) {
  const resetSection = useNoorStore((s) => s.resetSection);
  const progressMap = useNoorStore((s) => s.progress);
  const navigate = useNavigate();
  const { data: adhkarData } = useAdhkarDB();
  const [confirmReset, setConfirmReset] = React.useState(false);
  const isDailySectionLocked = isDailySection(props.sectionId);
  const identity = React.useMemo(() => getSectionIdentity(props.sectionId), [props.sectionId]);

  const [midnightLabel, setMidnightLabel] = React.useState<string>("");
  React.useEffect(() => {
    if (!isDailySectionLocked) return;
    function calc() {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diffMs = midnight.getTime() - now.getTime();
      const diffMins = Math.ceil(diffMs / 60000);
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      setMidnightLabel(h > 0 ? `${h}س ${m}د` : `${m} د`);
    }
    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, [isDailySectionLocked]);

  const stats = React.useMemo(() => {
    let done = 0;
    let total = 0;
    props.items.forEach((it, idx) => {
      const key = `${props.sectionId}:${idx}`;
      const t = coerceCount(it.count);
      const c = Math.min(Math.max(0, Number(progressMap[key]) || 0), t);
      total += t;
      done += c;
    });
    return { done, total, percent: pct(done, total) };
  }, [progressMap, props.items, props.sectionId]);

  // First item that still needs taps
  const firstIncompleteIdx = React.useMemo(() => {
    return props.items.findIndex((item, idx) => {
      const key = `${props.sectionId}:${idx}`;
      const target = coerceCount(item.count);
      const current = Math.min(target, Math.max(0, Number(progressMap[key]) || 0));
      return current < target;
    });
  }, [progressMap, props.items, props.sectionId]);

  const [copiedAll, setCopiedAll] = React.useState(false);
  const [compact, setCompact] = React.useState(false);
  const virtuosoRef = React.useRef<VirtuosoHandle>(null);

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

  const copyAllText = async () => {
    const lines: string[] = [`【 ${props.title} 】`, ""];
    props.items.forEach((item, idx) => {
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
      .replace(/[\\/:*?"<>|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const blob = {
      id: props.sectionId,
      title: props.title,
      exportedAt: new Date().toISOString(),
      items: props.items
    };
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(`ATHAR-${safeTitle || "قسم"}-${date}.athar`, blob);
    toast.success("تم تصدير القسم كملف");
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 overflow-hidden relative">
        {/* Color identity gradient overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-bl ${identity.grad} pointer-events-none`}
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
                التقدّم: {stats.done}/{stats.total} • {stats.percent}%
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
                  disabled={isDailySectionLocked}
                  title={isDailySectionLocked ? "يتجدد هذا القسم تلقائيًا عند منتصف الليل" : "تصفير القسم"}
                >
                  <RotateCcw size={16} />
                  تصفير القسم
                </Button>
              )}
              <Button variant="secondary" onClick={exportSection}>
                <ArrowDownToLine size={16} />
                تصدير
              </Button>
              <Button variant="secondary" onClick={copyAllText}>
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
              <span>يتجدد عند منتصف الليل · متبقّي {midnightLabel}</span>
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
        <Virtuoso
          ref={virtuosoRef}
          style={{ height: "100%" }}
          data={props.items}
          itemContent={(index, item) => (
            <div className="pb-4">
              <DhikrCard
                sectionId={props.sectionId}
                index={index}
                item={item}
                autoFocus={props.focusIndex === index}
                totalItems={props.items.length}
              />
            </div>
          )}
        />
      </div>
    </div>
  );
}
