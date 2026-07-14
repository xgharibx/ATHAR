/**
 * TranslationPicker — master toggle + 3 selectable translation sources.
 *
 * Visual matches the user's design:
 *   - Green master switch on top
 *   - Three selectable options below in a horizontal row of pills
 *   - Active option has accent background + ring
 *   - Each option shows Arabic label first then English (RTL)
 *   - Each option shows its approximate on-disk size below
 *
 * The currently-selected translation comes from prefs (persisted to
 * localStorage via the store). Toggling a pill updates the pref live.
 */
import * as React from "react";
import { Check, Globe2, Loader2 } from "lucide-react";
import {
  TRANSLATION_SOURCES,
  getTranslationSize,
  type TranslationId,
  type TranslationSizeInfo,
} from "@/lib/quranTranslations";

export function TranslationPicker(props: {
  enabled: boolean;
  value: TranslationId;
  /** Bumped to force a status re-poll after a fetch error. */
  reloadKey?: number;
  onEnabledChange: (v: boolean) => void;
  onChange: (id: TranslationId) => void;
  /** Optional: live fetch-status map so we can show a spinner / error pill. */
  status?: Partial<Record<TranslationId, "loading" | "ready" | "error">>;
}) {
  const { enabled, value, onEnabledChange, onChange, status } = props;
  const [sizes, setSizes] = React.useState<Partial<Record<TranslationId, TranslationSizeInfo>>>({});

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next: Partial<Record<TranslationId, TranslationSizeInfo>> = {};
      for (const src of TRANSLATION_SOURCES) {
        try {
          next[src.id] = await getTranslationSize(src.id);
        } catch {
          /* keep silent — fall back to label */
        }
      }
      if (!cancelled) setSizes(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatSize = (s: TranslationSizeInfo): string => {
    const mb = s.sizeKB / 1024;
    if (mb >= 1) return `${mb.toFixed(1)} م.ب`;
    return `${s.sizeKB.toLocaleString("ar-EG")} ك.ب`;
  };

  const formatCached = (s: TranslationSizeInfo): string | null => {
    if (s.source.bundled) return "مدمجة · لا تحتاج اتصالاً";
    if (!s.cachedAt) return "يتطلب تحميلًا";
    const ageMs = Date.now() - s.cachedAt;
    const hours = Math.max(1, Math.round(ageMs / (60 * 60 * 1000)));
    if (hours < 1) return "آخر تحميل قبل أقل من ساعة";
    if (hours < 24) return `آخر تحميل قبل ${hours.toLocaleString("ar-EG")} ساعة`;
    const days = Math.round(hours / 24);
    return `آخر تحميل قبل ${days.toLocaleString("ar-EG")} يوم`;
  };

  return (
    <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--card)]/85 backdrop-blur-md p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Globe2 size={14} className="text-[var(--accent)]" aria-hidden="true" />
          <span className="text-[12.5px] font-semibold">الترجمة أسفل الآية</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="إظهار الترجمة"
          onClick={() => onEnabledChange(!enabled)}
          className={[
            "relative h-6 w-12 rounded-full transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40",
            enabled ? "bg-emerald-500" : "bg-[var(--stroke)]/60",
          ].join(" ")}
        >
          <span
            aria-hidden="true"
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
            style={{ transform: enabled ? "translateX(calc(100% + 4px))" : "translateX(2px)" }}
          />
        </button>
      </div>
      {enabled ? (
        <div role="radiogroup" aria-label="مصدر الترجمة" className="flex flex-wrap gap-1.5">
          {TRANSLATION_SOURCES.map((src) => {
            const active = value === src.id;
            const s = status?.[src.id];
            const size = sizes[src.id];
            return (
              <button
                key={src.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(src.id)}
                className={[
                  "relative flex flex-col items-stretch gap-0.5 rounded-xl border px-3 py-1.5 text-[11.5px] font-semibold transition",
                  active
                    ? "bg-accent-15 border-accent-35 text-[var(--accent)] ring-1 ring-accent-35"
                    : "bg-[var(--bg)] border-[var(--stroke)] text-[var(--muted)] hover:bg-[var(--card-2)]",
                ].join(" ")}
              >
                <span className="flex items-center gap-1.5">
                  <span dir="rtl" className="font-extrabold">{src.ar}</span>
                  <span className="opacity-60">—</span>
                  <span dir="ltr" className="font-semibold">{src.en}</span>
                  {active ? <Check size={11} className="ms-0.5 text-[var(--accent)]" aria-hidden="true" /> : null}
                  {s === "loading" ? <Loader2 size={10} className="ms-0.5 animate-spin opacity-60" aria-hidden="true" /> : null}
                  {s === "error" ? <span className="ms-0.5 text-[10px] text-[var(--danger)]" title="فشل التحميل">!</span> : null}
                </span>
                {size ? (
                  <span className="text-[9.5px] font-normal opacity-65 leading-tight">
                    {formatSize(size)}
                    {(() => {
                      const c = formatCached(size);
                      return c ? <span className="ms-1">· {c}</span> : null;
                    })()}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
