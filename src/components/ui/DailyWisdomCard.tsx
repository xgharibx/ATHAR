import * as React from "react";
import { BookOpen, Share2, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { getTodayWisdom } from "@/data/dailyWisdom";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";

export function DailyWisdomCard() {
  const wisdom = React.useMemo(() => getTodayWisdom(), []);

  const copyWisdom = async () => {
    try {
      await navigator.clipboard.writeText(`${wisdom.text}\n\n— ${wisdom.source}`);
      toast.success("تم نسخ النصيحة");
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  const shareWisdom = async () => {
    const shareText = `${wisdom.text}\n\n— ${wisdom.source}\n\n• ATHAR أثر`;
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        // fall through to copy
      }
    }
    await copyWisdom();
  };

  return (
    <Card className="p-5 relative overflow-hidden">
      {/* Subtle radial glow background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, var(--accent), transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-[var(--accent)]" aria-hidden="true" />
            <div className="text-xs font-semibold opacity-60">تدبّر اليوم</div>
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              aria-label="نسخ"
              title="نسخ النصيحة"
              onClick={copyWisdom}
              className="w-8 h-8 min-w-0"
            >
              <Copy size={14} />
            </IconButton>
            <IconButton
              aria-label="مشاركة"
              title="مشاركة النصيحة"
              onClick={shareWisdom}
              className="w-8 h-8 min-w-0"
            >
              <Share2 size={14} />
            </IconButton>
          </div>
        </div>

        {/* Arabic wisdom text */}
        <blockquote
          className="arabic-text text-center leading-9 text-base"
          style={{ fontSize: "1.05rem" }}
          dir="rtl"
          lang="ar"
        >
          {wisdom.text}
        </blockquote>

        {/* Source */}
        <div className="mt-3 text-center text-[11px] opacity-55 font-medium" dir="rtl">
          ‹ {wisdom.source} ›
        </div>

        {wisdom.notes && (
          <div className="mt-1.5 text-center text-[10px] opacity-40" dir="rtl">
            {wisdom.notes}
          </div>
        )}
      </div>
    </Card>
  );
}
