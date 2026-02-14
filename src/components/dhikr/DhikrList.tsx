import * as React from "react";
import { Virtuoso } from "react-virtuoso";
import { RotateCcw, ArrowDownToLine } from "lucide-react";
import toast from "react-hot-toast";

import { DhikrCard } from "@/components/dhikr/DhikrCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { coerceCount, type DhikrItem } from "@/data/types";
import { useNoorStore } from "@/store/noorStore";
import { pct } from "@/lib/utils";
import { downloadJson } from "@/lib/download";
import { isDailySection } from "@/lib/dailySections";

export function DhikrList(props: {
  sectionId: string;
  title: string;
  items: DhikrItem[];
  focusIndex?: number | null;
}) {
  const resetSection = useNoorStore((s) => s.resetSection);
  const progressMap = useNoorStore((s) => s.progress);
  const isDailySectionLocked = isDailySection(props.sectionId);

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
      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs opacity-60">القسم</div>
            <h1 className="text-xl md:text-2xl font-semibold mt-1">{props.title}</h1>
            <div className="text-sm opacity-70 mt-2 tabular-nums">
              التقدّم: {stats.done}/{stats.total} • {stats.percent}%
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("هل تريد تصفير التقدّم لهذا القسم بالكامل؟")) resetSection(props.sectionId);
              }}
              disabled={isDailySectionLocked}
              title={isDailySectionLocked ? "يتجدد هذا القسم تلقائيًا عند منتصف الليل" : "تصفير القسم"}
            >
              <RotateCcw size={16} />
              تصفير القسم
            </Button>
            <Button variant="secondary" onClick={exportSection}>
              <ArrowDownToLine size={16} />
              تصدير
            </Button>
          </div>
        </div>

        <div className="mt-4 h-2 rounded-full bg-white/8 overflow-hidden border border-white/10">
          <div
            className="h-full bg-[var(--accent)]"
            style={{ width: `${stats.percent}%`, transition: "width .3s ease" }}
          />
        </div>
      </Card>

      <div className="h-[calc(100vh-240px)] min-h-[440px]">
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
              />
            </div>
          )}
        />
      </div>
    </div>
  );
}
