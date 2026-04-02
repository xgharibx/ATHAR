import * as React from "react";
import { Virtuoso } from "react-virtuoso";
import { RotateCcw, ArrowDownToLine, Lock } from "lucide-react";
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

export function DhikrList(props: {
  sectionId: string;
  title: string;
  items: DhikrItem[];
  focusIndex?: number | null;
}) {
  const resetSection = useNoorStore((s) => s.resetSection);
  const progressMap = useNoorStore((s) => s.progress);
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

      <div style={{ height: "calc(100dvh - 240px)", minHeight: "440px" }}>
        {stats.percent >= 100 && (
          <div className="mb-3 rounded-3xl border border-[var(--ok)]/30 bg-[var(--ok)]/10 px-5 py-4 flex items-center gap-3">
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
        )}
        <Virtuoso
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
