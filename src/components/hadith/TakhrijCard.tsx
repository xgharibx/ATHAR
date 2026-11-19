/**
 * The one takhrij (dorar.net grading) card design — used everywhere a
 * hadith is shown (full book reader, curated Library cards) so every entry
 * point has the exact same structure, not a per-page reinvention.
 */
import * as React from "react";
import { ScrollText, Loader2, Info, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { verdictColor, type DorarTakhrij } from "@/lib/dorarTakhrij";
import { GradeChip } from "@/components/hadith/GradeChip";
import { arNum, westernToArabicDigits as arDigits } from "@/lib/formatNumber";


export function TakhrijCard({
  takhrij,
  loading,
  grades,
  sharhId,
  onOpenSharh,
  accentColor = "var(--accent)",
}: {
  takhrij: DorarTakhrij | null;
  loading: boolean;
  /** The book's own bundled grade tags (صحيح/حسن/…), shown as quick badges. */
  grades?: string[];
  sharhId?: string | null;
  onOpenSharh?: (sharhId: string) => void;
  accentColor?: string;
}) {
  const [showOtherOpinions, setShowOtherOpinions] = React.useState(false);
  const uniqueGrades = grades ? [...new Set(grades)] : [];

  return (
    <Card className="relative overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
      <div className="absolute inset-y-0 right-0 w-1 opacity-70" style={{ background: accentColor }} />
      <div className="relative pr-2">
        <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[11px] font-semibold opacity-55 font-arabic flex items-center gap-1.5">
            <ScrollText size={13} aria-hidden="true" />
            التخريج والحكم
          </p>
          {uniqueGrades.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {uniqueGrades.map((g) => <GradeChip key={g} grade={g} size="sm" />)}
            </div>
          )}
        </div>

        {loading && !takhrij && (
          <div className="flex items-center gap-2 py-3 text-xs opacity-55">
            <Loader2 size={14} aria-hidden="true" className="animate-spin" />
            نبحث عن تخريجه في الدرر السنية…
          </div>
        )}

        {!loading && (!takhrij || (!takhrij.exact && takhrij.others.length === 0)) && (
          <p className="text-xs opacity-55 py-2">
            لم يُعثر على تخريج مطابق بثقة في الدرر السنية لهذا النص بعينه.
          </p>
        )}

        {takhrij?.exact && (
          <div className="rounded-2xl p-3.5 mb-2" style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span
                className="text-sm font-bold px-3 py-1 rounded-full"
                style={{ background: verdictColor(takhrij.exact.verdict) + "22", color: verdictColor(takhrij.exact.verdict) }}
              >
                {takhrij.exact.verdict || "—"}
              </span>
              <span className="text-xs opacity-60">قاله {takhrij.exact.muhaddith || "المحدث"}</span>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs leading-6">
              <dt className="opacity-55">الراوي</dt>
              <dd className="m-0 font-semibold opacity-85">{takhrij.exact.narrator}</dd>
              <dt className="opacity-55">المصدر</dt>
              <dd className="m-0 opacity-85">{takhrij.exact.source}{takhrij.exact.pageOrNumber ? `، ${arDigits(takhrij.exact.pageOrNumber)}` : ""}</dd>
            </dl>
          </div>
        )}

        {!takhrij?.exact && takhrij && takhrij.others.length > 0 && (
          <p className="text-xs opacity-60 py-1 mb-1">
            لم نجد هذا الرقم بعينه في المصدر الأصلي، لكن وُجدت أحكام علماء على نص قريب جدًا منه:
          </p>
        )}

        {takhrij && takhrij.others.length > 0 && (
          <div>
            <button type="button"
              onClick={() => setShowOtherOpinions((v) => !v)}
              aria-expanded={showOtherOpinions}
              className="w-full flex items-center justify-between gap-2 text-xs font-semibold py-2 opacity-75 hover:opacity-100 transition"
              style={{ color: accentColor }}
            >
              <span>أحكام علماء آخرين عليه ({arNum(takhrij.others.length)})</span>
              <ChevronDown size={15} aria-hidden="true" style={{ transform: showOtherOpinions ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
            </button>
            {showOtherOpinions && (
              <div className="stack-y-2 mt-1">
                {takhrij.others.map((o, i) => (
                  <div key={i} className="rounded-2xl p-3 text-xs" style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}>
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-bold px-2 py-0.5 rounded-full text-[11px]" style={{ background: verdictColor(o.verdict) + "22", color: verdictColor(o.verdict) }}>
                        {o.verdict || "—"}
                      </span>
                      <span className="opacity-60">قاله {o.muhaddith || "المحدث"}</span>
                    </div>
                    <div className="opacity-65 leading-6">
                      الراوي: {o.narrator}، {o.source}{o.pageOrNumber ? `، ${arDigits(o.pageOrNumber)}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(sharhId !== undefined) && (
          <div className="mt-3 pt-3 border-t border-(--stroke) flex items-center justify-between gap-2 flex-wrap">
            {sharhId ? (
              <button type="button"
                onClick={() => onOpenSharh?.(sharhId)}
                className="flex items-center gap-1.5 text-xs font-semibold transition hover:opacity-80"
                style={{ color: accentColor }}
              >
                <Info size={13} aria-hidden="true" />
                له شرح كامل، اقرأه
              </button>
            ) : (
              <p className="text-[11px] opacity-50 leading-5">
                لا يوجد لهذا الحديث شرح مفصّل بعد، وحكمه أعلاه.
              </p>
            )}
          </div>
        )}
        <p className="text-[10.5px] opacity-50 mt-2">التخريج من الموسوعة الحديثية في الدرر السنية.</p>
      </div>
    </Card>
  );
}
