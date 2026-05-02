import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Copy, ChevronDown, ChevronUp, Shield } from "lucide-react";
import { RUQYAH_SECTIONS, type RuqyahSection, type RuqyahItem } from "@/data/ruqyah";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

function RuqyahItemCard({ item, idx }: { item: RuqyahItem; idx: number }) {
  const [count, setCount] = React.useState(0);
  const done = count >= item.count;

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(item.arabic);
      toast.success("تم النسخ");
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  return (
    <div
      className={cn(
        "rounded-3xl border p-4 transition-all",
        done
          ? "border-[color-mix(in_srgb,var(--ok)_30%,transparent)] bg-[var(--ok)]/5"
          : "border-white/10 glass"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--accent)]/12 border border-[var(--accent)]/20 font-semibold text-[var(--accent)]">
            {idx + 1}
          </span>
          <span className="text-xs opacity-55">{item.source}</span>
          {item.count > 1 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/6 border border-white/10 opacity-70">
              × {item.count}
              {item.countNote ? ` — ${item.countNote}` : ""}
            </span>
          )}
        </div>
        <IconButton aria-label="نسخ" onClick={doCopy} title="نسخ">
          <Copy size={15} className="opacity-70" />
        </IconButton>
      </div>

      <div
        className="arabic-text text-lg leading-10 mb-3 select-text cursor-pointer"
        dir="rtl"
        onClick={() => {
          if (!done) setCount((c) => Math.min(c + 1, item.count));
        }}
      >
        {item.arabic}
      </div>

      {item.notes && (
        <div className="text-xs opacity-55 leading-5 border-t border-white/8 pt-2 mb-3">
          {item.notes}
        </div>
      )}

      {/* Progress counter */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {Array.from({ length: item.count }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCount(i < count ? i : i + 1)}
              className={cn(
                "w-7 h-7 rounded-full border transition-all text-xs font-bold",
                i < count
                  ? "bg-[var(--ok)]/20 border-[var(--ok)]/40 text-[var(--ok)]"
                  : "bg-white/5 border-white/15 opacity-50"
              )}
            >
              {i < count ? "✓" : i + 1}
            </button>
          ))}
        </div>
        {done && (
          <span className="text-xs font-semibold text-[var(--ok)]">✓ مكتمل</span>
        )}
        {!done && count > 0 && (
          <button
            onClick={() => setCount(0)}
            className="text-[11px] opacity-40 hover:opacity-70 transition px-2 py-1 rounded-lg"
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
      <button
        className="w-full flex items-center justify-between gap-3 p-4 text-right"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Shield size={16} className="text-[var(--accent)] shrink-0 opacity-70" />
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
          <span className="text-[11px] opacity-40 tabular-nums">{section.items.length}</span>
          {expanded ? <ChevronUp size={15} className="opacity-50" /> : <ChevronDown size={15} className="opacity-50" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/8 pt-3">
          {section.items.map((item, idx) => (
            <RuqyahItemCard key={item.id} item={item} idx={idx} />
          ))}
        </div>
      )}
    </Card>
  );
}

export function RuqyahPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 page-enter" dir="rtl">
      {/* Header */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <IconButton aria-label="رجوع" onClick={() => navigate(-1)}>
            <ArrowRight size={18} />
          </IconButton>
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-[var(--accent)]" />
            <h1 className="font-bold text-lg arabic-text">أذكار الرقية الشرعية</h1>
          </div>
        </div>
        <div className="text-sm opacity-70 leading-7 arabic-text p-3 rounded-2xl bg-white/4 border border-white/8">
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
