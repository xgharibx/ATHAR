import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Copy, ChevronDown, ChevronUp, Shield, Share2 } from "lucide-react";
import { RUQYAH_SECTIONS, type RuqyahSection, type RuqyahItem } from "@/data/ruqyah";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { shareOrCopy } from "@/lib/shareTargets";
import { writeClipboard } from "@/lib/nativeUI";
import { arNum, westernToArabicDigits } from "@/lib/formatNumber";
import { vibrate } from "@/lib/haptics";
import { useKeepScreenAwake } from "@/hooks/useKeepScreenAwake";
import { useNoorStore } from "@/store/noorStore";

function RuqyahItemCard({ item, idx }: { item: RuqyahItem; idx: number }) {
  const [count, setCount] = React.useState(0);
  const done = count >= item.count;
  const haptics = useNoorStore((s) => s.prefs.enableHaptics !== false);
  // A tap for each repetition, and a fuller one when the dhikr is complete.
  const countTo = (next: number) => {
    const value = Math.max(0, Math.min(next, item.count));
    if (haptics && value > count) vibrate(value >= item.count ? [15, 60, 30] : 10);
    setCount(value);
  };

  const doShare = React.useCallback(async () => {
    const text = item.arabic;
    try {
      await shareOrCopy(text);
    } catch {
      try { const systemConfirmed = await writeClipboard(text); if (!systemConfirmed) toast.success("تم النسخ"); } catch { toast.error("تعذّر النسخ"); }
    }
  }, [item.arabic]);

  const doCopy = async () => {
    try {
      const systemConfirmed = await writeClipboard(item.arabic);
      if (!systemConfirmed) toast.success("تم النسخ");
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  return (
    <div
      role="listitem"
      className={cn(
        "rounded-3xl border p-4 transition-all",
        done
          ? "border-ok-30 bg-ok-5"
          : "border-(--stroke) glass"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-2.5 py-1 rounded-full bg-accent-12 border border-accent-20 font-semibold text-(--accent)">
            {arNum(idx + 1)}
          </span>
          <span className="text-xs opacity-55">{westernToArabicDigits(item.source)}</span>
          {item.count > 1 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-(--card) border border-(--stroke) opacity-70">
              × {arNum(item.count)}
              {item.countNote ? ` — ${item.countNote}` : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <IconButton aria-label="مشاركة" onClick={doShare}>
            <Share2 size={14} className="opacity-70" />
          </IconButton>
          <IconButton aria-label="نسخ" onClick={doCopy}>
            <Copy size={15} aria-hidden="true" className="opacity-70" />
          </IconButton>
        </div>
      </div>

      <div
        className="arabic-text text-lg leading-10 mb-3 select-text cursor-pointer"
        dir="rtl"
        role="button"
        tabIndex={done ? -1 : 0}
        aria-label="اضغط لزيادة العداد"
        onClick={() => {
          if (!done) countTo(count + 1);
        }}
        onKeyDown={(e) => {
          if (!done && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            countTo(count + 1);
          }
        }}
      >
        {item.arabic}
      </div>

      {item.notes && (
        <div className="text-xs opacity-55 leading-5 border-t border-(--stroke) pt-2 mb-3">
          {item.notes}
        </div>
      )}

      {/* Progress counter */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {Array.from({ length: item.count }).map((_, i) => (
            <button type="button"
              key={i}
              aria-label={i < count ? `تم — المرة ${arNum(i + 1)}` : `المرة ${arNum(i + 1)}`}
              aria-pressed={i < count}
              onClick={() => countTo(i < count ? i : i + 1)}
              className={cn(
                "w-9 h-9 rounded-full border transition-all text-xs font-bold",
                i < count
                  ? "bg-ok-20 border-ok-40 text-(--ok)"
                  : "bg-(--card) border-(--stroke) opacity-50"
              )}
            >
              {i < count ? "✓" : arNum(i + 1)}
            </button>
          ))}
        </div>
        {done && (
          <span className="text-xs font-semibold text-(--ok)">✓ مكتمل</span>
        )}
        {!done && count > 0 && (
          <button type="button"
            onClick={() => setCount(0)}
            className="text-[11px] opacity-50 hover:opacity-80 transition px-3 min-h-[36px] rounded-lg shrink-0"
          >
            إعادة
          </button>
        )}
      </div>
    </div>
  );
}

function RuqyahSectionCard({ section }: { section: RuqyahSection }) {
  const [expanded, setExpanded] = React.useState(true);

  return (
    <Card className="p-0 overflow-hidden">
      <button type="button"
        aria-expanded={expanded}
        aria-controls={`ruqyah-panel-${section.id}`}
        className="w-full flex items-center justify-between gap-3 p-4 text-right"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Shield size={16} aria-hidden="true" className="text-(--accent) shrink-0 opacity-70" />
          <div className="min-w-0">
            <div className="font-semibold text-sm arabic-text">{section.title}</div>
            {section.description && (
              <div className="text-xs opacity-55 mt-0.5 leading-5 arabic-text line-clamp-1">
                {section.description}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] opacity-40 tabular-nums">{arNum(section.items.length)}</span>
          {expanded ? <ChevronUp size={15} aria-hidden="true" className="opacity-50" /> : <ChevronDown size={15} aria-hidden="true" className="opacity-50" />}
        </div>
      </button>

      <div id={`ruqyah-panel-${section.id}`} hidden={!expanded} className="px-4 pb-4 stack-y-3 border-t border-(--stroke) pt-3" role="list">
        {section.items.map((item, idx) => (
          <RuqyahItemCard key={item.id} item={item} idx={idx} />
        ))}
      </div>
    </Card>
  );
}

export function RuqyahPage() {
  const navigate = useNavigate();
  useScrollRestoration();
  // Ruqyah is read slowly, often with the phone set down: keep the screen on.
  useKeepScreenAwake(true);

  return (
    <div className="stack-y-4 page-enter" dir="rtl">
      {/* Header */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <IconButton aria-label="رجوع" onClick={() => navigate(-1)}>
            <ArrowRight size={18} aria-hidden="true" />
          </IconButton>
          <div className="flex items-center gap-2">
            <Shield size={20} aria-hidden="true" className="text-(--accent)" />
            <h1 className="font-bold text-lg arabic-text">أذكار الرقية الشرعية</h1>
          </div>
        </div>
        <div className="text-sm opacity-70 leading-7 arabic-text p-3 rounded-2xl bg-(--card) border border-(--stroke)">
          الرقية الشرعية هي القراءة من القرآن الكريم والأدعية النبوية الثابتة للاستشفاء والحماية بإذن الله.
          اقرأ كل ذكر بتركيز وحضور قلب، ويُستحب النفث على موضع الألم.
        </div>
        <div className="mt-3 text-xs opacity-45 leading-5 arabic-text">
          اضغط على نص الذكر لتسجيل التكرار ✓
        </div>
      </Card>

      {/* Ruqyah sections */}
      {RUQYAH_SECTIONS.map((section) => (
        <RuqyahSectionCard key={section.id} section={section} />
      ))}

      {/* Footer note */}
      <Card className="p-4">
        <div className="text-xs opacity-50 leading-6 arabic-text text-center">
          ملاحظة: الرقية الشرعية من القرآن والسنة الصحيحة مباحة بإذن الله.
          للحالات الشديدة يُنصح بمراجعة الراقي المعتمد والطبيب المختص.
        </div>
      </Card>
    </div>
  );
}
