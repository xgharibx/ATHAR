/**
 * TranslationPicker — master toggle + 3 selectable translation sources.
 *
 * Visual:
 *   - Big emerald master switch on top
 *   - Three selectable options below as a single horizontal segmented row
 *   - Active option has solid accent background with white-on-accent text
 *   - Each option shows Arabic label + Latin name stacked vertically
 *   - All options visible always — toggle just dims them
 *   - Disabled state shows reason under the row
 *
 * The currently-selected translation comes from prefs (persisted to
 * localStorage via the store). Toggling a pill updates the pref live.
 */
import * as React from "react";
import { Check, Globe2, Loader2, WifiOff } from "lucide-react";
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
  }, [props.reloadKey]);

  const formatSize = (s: TranslationSizeInfo): string => {
    const mb = s.sizeKB / 1024;
    if (mb >= 1) return `${mb.toFixed(1)} م.ب`;
    return `${s.sizeKB.toLocaleString("ar-EG")} ك.ب`;
  };

  const formatCached = (s: TranslationSizeInfo): string | null => {
    if (s.source.bundled) return "مدمجة · بلا اتصال";
    if (!s.cachedAt) return "تحميل أول مرة";
    const ageMs = Date.now() - s.cachedAt;
    const hours = Math.max(1, Math.round(ageMs / (60 * 60 * 1000)));
    if (hours < 1) return "منذ أقل من ساعة";
    if (hours < 24) return `منذ ${hours.toLocaleString("ar-EG")} ساعة`;
    const days = Math.round(hours / 24);
    return `منذ ${days.toLocaleString("ar-EG")} يوم`;
  };

  return (
    <section
      className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-[var(--card)] to-[var(--card)] p-3.5 space-y-3"
      aria-labelledby="tr-picker-heading"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300">
            <Globe2 size={14} aria-hidden="true" />
          </span>
          <div>
            <div id="tr-picker-heading" className="text-[13px] font-extrabold leading-tight">الترجمة أسفل الآية</div>
            <div className="text-[10px] opacity-50">اختر مصدرًا للترجمة · يُحفظ تلقائيًا</div>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="إظهار الترجمة"
          onClick={() => onEnabledChange(!enabled)}
          className={[
            "relative h-7 w-14 rounded-full transition focus:outline-none focus:ring-2 focus:ring-emerald-300/50 shrink-0",
            enabled ? "bg-emerald-500 shadow-[0_0_18px_-2px_rgba(16,185,129,0.55)]" : "bg-[var(--stroke)]/70",
          ].join(" ")}
        >
          <span
            aria-hidden="true"
            className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all"
            style={{ right: enabled ? "calc(100% - 24px)" : "4px" }}
          />
        </button>
      </div>

      {/* Segmented row — always three pills, dimmed when off */}
      <div
        role="radiogroup"
        aria-label="مصدر الترجمة"
        className={[
          "grid grid-cols-3 gap-1 rounded-2xl border p-1 transition",
          enabled
            ? "bg-[var(--bg)] border-[var(--stroke)]"
            : "bg-transparent border-[var(--stroke)]/40 opacity-55",
        ].join(" ")}
      >
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
              disabled={!enabled}
              onClick={() => enabled && onChange(src.id)}
              className={[
                "group relative flex flex-col items-stretch gap-0.5 rounded-xl px-2 py-2 text-[11.5px] font-semibold transition",
                active
                  ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-emerald-950 shadow-[0_4px_16px_-4px_rgba(16,185,129,0.55)]"
                  : "text-[var(--muted)] hover:bg-[var(--card-2)]",
              ].join(" ")}
            >
              <span className="flex items-center justify-between gap-1">
                <span dir="rtl" className="text-[12.5px] font-extrabold truncate">{src.ar}</span>
                {active ? <Check size={11} className="text-emerald-950" aria-hidden="true" /> : null}
              </span>
              <span
                dir="ltr"
                className={[
                  "text-[9.5px] font-semibold truncate text-start",
                  active ? "text-emerald-950/85" : "opacity-55",
                ].join(" ")}
              >
                {src.en}
              </span>
              {size ? (
                <span
                  className={[
                    "mt-0.5 text-[9px] font-normal truncate text-start",
                    active ? "text-emerald-950/65" : "opacity-50",
                  ].join(" ")}
                  title={formatCached(size) ?? ""}
                >
                  {formatSize(size)}{" "}
                  {s === "loading" ? (
                    <Loader2 size={9} className="ms-0.5 animate-spin inline-block align-middle" aria-hidden="true" />
                  ) : s === "error" ? (
                    <WifiOff size={9} className="ms-0.5 inline-block align-middle" aria-hidden="true" />
                  ) : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {!enabled ? (
        <p className="text-[11px] opacity-55">الترجمة مخفية · فعّل المفتاح لاختيار المصدر وظهور الترجمة أسفل كل آية.</p>
      ) : (
        <p className="text-[11px] opacity-55">المصدر المختار يُحفظ تلقائيًا ويُستخدم في المصحف وقائمة السور.</p>
      )}
    </section>
  );
}
