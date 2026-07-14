/**
 * TranslationPicker — master toggle + 3 selectable translation sources.
 *
 * Visual matches the user's design:
 *   - Green master switch on top
 *   - Three selectable options below in a horizontal row of pills
 *   - Active option has accent background + ring
 *   - Each option shows Arabic label first then English (RTL)
 *
 * The currently-selected translation comes from prefs (persisted to
 * localStorage via the store). Toggling a pill updates the pref live.
 */
import * as React from "react";
import { Check, Globe2, Loader2 } from "lucide-react";
import {
  TRANSLATION_SOURCES,
  type TranslationId,
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
            return (
              <button
                key={src.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(src.id)}
                className={[
                  "relative flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11.5px] font-semibold transition",
                  active
                    ? "bg-accent-15 border-accent-35 text-[var(--accent)] ring-1 ring-accent-35"
                    : "bg-[var(--bg)] border-[var(--stroke)] text-[var(--muted)] hover:bg-[var(--card-2)]",
                ].join(" ")}
              >
                <span dir="rtl" className="font-extrabold">{src.ar}</span>
                <span className="opacity-60">—</span>
                <span dir="ltr" className="font-semibold">{src.en}</span>
                {active ? <Check size={11} className="ms-0.5 text-[var(--accent)]" aria-hidden="true" /> : null}
                {s === "loading" ? <Loader2 size={10} className="ms-0.5 animate-spin opacity-60" aria-hidden="true" /> : null}
                {s === "error" ? <span className="ms-0.5 text-[10px] text-[var(--danger)]" title="فشل التحميل">!</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
