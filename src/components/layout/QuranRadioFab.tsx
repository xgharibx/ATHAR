import * as React from "react";
import { Radio, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getRadioState,
  subscribeRadio,
  toggleRadio,
  playRadio,
  stopRadio,
  QURAN_RADIO_STATIONS,
} from "@/lib/radioPlayer";
import { useLocation } from "react-router-dom";

function useRadioState() {
  const [state, setState] = React.useState(getRadioState);
  React.useEffect(() => subscribeRadio(() => setState(getRadioState())), []);
  return state;
}

export function QuranRadioFab({ drawerOpen }: { drawerOpen?: boolean }) {
  // All hooks must be declared before any early return
  const [open, setOpen] = React.useState(false);
  const radio = useRadioState();
  const location = useLocation();

  // Close expansion when the hamburger drawer opens
  React.useEffect(() => { if (drawerOpen) setOpen(false); }, [drawerOpen]);

  // Hide when drawer is open — all hooks already called above
  if (drawerOpen) return null;

  const isMushaf = location.pathname.startsWith("/mushaf") || location.pathname.startsWith("/quran");

  // Only render if we're on mushaf/quran page OR if radio is currently playing
  if (!isMushaf && !radio.playing) return null;

  if (!open) {
    return (
      <button type="button"
        className={cn(
          "fab xl:hidden",
          radio.playing && "ring-2 ring-ok-60",
        )}
        style={{
          bottom: "calc(var(--mobile-nav-height) + (var(--mobile-nav-gap) * 2) + var(--sab))",
          left: "16px",
        }}
        onClick={() => setOpen(true)}
        aria-label="راديو القرآن"
      >
        {radio.loading ? (
          <Loader2 size={22} className="animate-spin" />
        ) : (
          <Radio size={22} style={radio.playing ? { color: "var(--ok)" } : undefined} />
        )}
      </button>
    );
  }

  return (
    <div
      className="fixed z-[9990] xl:hidden"
      style={{
        bottom: "calc(var(--mobile-nav-height) + (var(--mobile-nav-gap) * 2) + var(--sab))",
        left: "16px",
      }}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[-1]"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div
        className="w-[280px] glass-strong rounded-3xl p-4 border border-[var(--stroke)] page-enter"
        style={{ boxShadow: "0 12px 48px rgba(0,0,0,0.5)" }}
        role="dialog"
        aria-modal="true"
        aria-label="راديو القرآن"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio size={16} style={{ color: "var(--accent)" }} />
            <div className="text-sm font-semibold">راديو القرآن</div>
            {radio.playing && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--ok)20", color: "var(--ok)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)] animate-pulse inline-block" />
                بث مباشر
              </span>
            )}
          </div>
          <button type="button"
            onClick={() => setOpen(false)}
            className="w-9 h-9 rounded-full bg-[var(--card)] border border-[var(--stroke)] grid place-items-center text-xs"
            aria-label="إغلاق"
          >
            <X size={14} />
          </button>
        </div>

        {/* Stations */}
        <div className="space-y-1.5 mb-3">
          {QURAN_RADIO_STATIONS.map((station, i) => (
            <button type="button"
              key={i}
              onClick={() => playRadio(i)}
              aria-pressed={radio.playing && radio.stationIdx === i}
              aria-label={`تشغيل محطة ${station.label}`}
              className={cn(
                "w-full text-right rounded-2xl px-3 py-2.5 text-sm border transition press-effect",
                radio.playing && radio.stationIdx === i
                  ? "bg-accent-15 border-accent-50 text-[var(--fg)] font-semibold"
                  : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="arabic-text">{station.label}</span>
                {radio.playing && radio.stationIdx === i && (
                  radio.loading ? (
                    <Loader2 size={12} className="animate-spin shrink-0 opacity-70" />
                  ) : (
                    <span className="flex gap-[2px] items-end shrink-0">
                      {[4, 7, 5, 9, 6].map((h, idx) => (
                        <span
                          key={idx}
                          className="w-[3px] rounded-full animate-bounce"
                          style={{
                            height: `${h}px`,
                            background: "var(--accent)",
                            animationDelay: `${idx * 80}ms`,
                            animationDuration: "600ms",
                          }}
                        />
                      ))}
                    </span>
                  )
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Play / Stop */}
        <button type="button"
          onClick={() => { toggleRadio(); if (radio.playing) setOpen(false); }}
          aria-label={radio.playing ? "إيقاف بث راديو القرآن" : "تشغيل راديو القرآن"}
          className={cn(
            "w-full rounded-2xl py-3 text-sm font-semibold transition press-effect",
            radio.playing
              ? "bg-danger-20 text-[var(--danger)] border border-danger-30 hover:bg-danger-30"
              : "bg-[var(--accent)] text-[var(--on-accent)] hover:opacity-90"
          )}
        >
          {radio.playing ? "إيقاف البث" : "تشغيل"}
        </button>
      </div>
    </div>
  );
}
