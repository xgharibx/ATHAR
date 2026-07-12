/**
 * الشرح — the scholarly explanation, shown INLINE inside the hadith reader
 * (غريب الألفاظ · الشرح · الفوائد · المراجع) rather than behind a "read it
 * elsewhere" link. Data comes verbatim from hadeethenc.com's reviewed
 * encyclopedia, cached for offline revisits. When no confident match exists
 * for this hadith, it says so honestly instead of hiding the fact.
 */
import * as React from "react";
import { BookOpenText, Loader2, Sparkles, WifiOff, ExternalLink, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { fetchSharhHadith, type SharhHadith } from "@/lib/hadithSharhAPI";

export function SharhSection({
  sharhId,
  matn,
  accentColor = "var(--accent)",
}: {
  sharhId: string | null;
  matn?: string;
  accentColor?: string;
}) {
  const navigate = useNavigate();
  const [data, setData] = React.useState<SharhHadith | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [errored, setErrored] = React.useState(false);
  const [expanded, setExpanded] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    setData(null);
    setErrored(false);
    if (!sharhId) return;
    setLoading(true);
    fetchSharhHadith(sharhId)
      .then((h) => { if (alive) setData(h); })
      .catch(() => { if (alive) setErrored(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [sharhId]);

  // No confident sharh match for this hadith — be honest, don't hide it.
  if (!sharhId) {
    return (
      <Card className="relative overflow-hidden p-4">
        <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
        <div className="absolute inset-y-0 right-0 w-1 opacity-70" style={{ background: accentColor }} />
        <div className="relative pr-2">
          <p className="mb-2 text-[11px] font-semibold opacity-55 font-arabic flex items-center gap-1.5">
            <BookOpenText size={13} aria-hidden="true" />
            الشرح
          </p>
          <p className="text-[12px] opacity-55 leading-6">
            لا يتوفّر شرح مفصّل لهذا الحديث بعد في الموسوعة الميسّرة. الحكم والتخريج أعلاه متاحان.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 dhikr-card-stars" aria-hidden />
      <div className="absolute inset-y-0 right-0 w-1 opacity-70" style={{ background: accentColor }} />
      <div className="relative pr-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="w-full flex items-center justify-between gap-2"
        >
          <span className="text-[11px] font-semibold opacity-55 font-arabic flex items-center gap-1.5">
            <BookOpenText size={13} aria-hidden="true" />
            الشرح الميسّر
          </span>
          <ChevronDown size={16} aria-hidden="true" className="opacity-50" style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </button>

        {loading && (
          <div className="flex items-center gap-2 py-3 text-xs opacity-55">
            <Loader2 size={14} aria-hidden="true" className="animate-spin" />
            جارٍ تحميل الشرح من الموسوعة الحديثية…
          </div>
        )}

        {errored && !loading && (
          <div className="flex items-center gap-2 py-3 text-xs opacity-55">
            <WifiOff size={14} aria-hidden="true" />
            تعذّر تحميل الشرح الآن — أعد المحاولة عند توفّر الاتصال.
          </div>
        )}

        {data && expanded && (
          <div className="mt-3 space-y-4">
            {/* غريب الألفاظ */}
            {data.words_meanings && data.words_meanings.length > 0 && (
              <div>
                <h3 className="mb-1.5 text-xs font-bold" style={{ color: accentColor }}>غريب الألفاظ</h3>
                <dl className="space-y-1 text-[13px] leading-7">
                  {data.words_meanings.map((w, i) => (
                    <div key={i} className="flex gap-2">
                      <dt className="shrink-0 font-bold">{w.word}:</dt>
                      <dd className="m-0 opacity-70">{w.meaning}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* الشرح */}
            {data.explanation && (
              <div>
                <h3 className="mb-1.5 text-xs font-bold" style={{ color: accentColor }}>الشرح</h3>
                <p className="whitespace-pre-wrap text-[14px] leading-8 opacity-90">{data.explanation}</p>
              </div>
            )}

            {/* الفوائد */}
            {data.hints && data.hints.length > 0 && (
              <div>
                <h3 className="mb-1.5 text-xs font-bold" style={{ color: accentColor }}>من فوائد الحديث</h3>
                <ul className="list-inside list-disc space-y-1 text-[13px] leading-8 opacity-85">
                  {data.hints.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </div>
            )}

            {/* المراجع */}
            {data.reference && (
              <div>
                <h3 className="mb-1 text-[11px] font-bold opacity-60">المراجع</h3>
                <p className="whitespace-pre-wrap text-[11px] leading-6 opacity-55">{data.reference}</p>
              </div>
            )}

            {/* Actions: tadabbur with companion + open full encyclopedia entry */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-[var(--stroke)]">
              <button
                type="button"
                onClick={() => navigate(`/companion?ask=${encodeURIComponent(
                  `قرأت هذا الحديث وشرحه، ساعدني أن أعيشه عمليًا هذا الأسبوع بخطوات محددة تناسب حالي:\n«${(matn ?? data.hadeeth).slice(0, 500)}»`,
                )}`)}
                className="flex items-center gap-1.5 text-xs font-semibold transition hover:opacity-80"
                style={{ color: accentColor }}
              >
                <Sparkles size={13} aria-hidden="true" />
                تدبّر بالذكاء
              </button>
              <button
                type="button"
                onClick={() => navigate(`/library/sharh?h=${sharhId}`)}
                className="flex items-center gap-1.5 text-[11px] opacity-55 transition hover:opacity-90"
              >
                افتح في الموسوعة
                <ExternalLink size={11} aria-hidden="true" />
              </button>
            </div>

            <p className="text-[10px] opacity-40">المصدر: الموسوعة الحديثية الميسّرة — hadeethenc.com</p>
          </div>
        )}
      </div>
    </Card>
  );
}
