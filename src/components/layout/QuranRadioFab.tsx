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

export function QuranRadioFab() {
  const [open, setOpen] = React.useState(false);
  const radio = useRadioState();
  const location = useLocation();

  const isMushaf = location.pathname.startsWith("/mushaf") || location.pathname.startsWith("/quran");

  // Only render if we're on mushaf/quran page OR if radio is currently playing
  if (!isMushaf && !radio.playing) return null;

  if (!open) {
    return (
      <button
        className={cn(
          "fab xl:hidden",
          radio.playing && "ring-2 ring-[var(--ok)]/60",
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
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[-1]"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div
        className="w-[280px] glass-strong rounded-3xl p-4 border border-white/10 page-enter"
        style={{ boxShadow: "0 12px 48px rgba(0,0,0,0.5)" }}
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
          <button
            onClick={() => setOpen(false)}
            className="w-9 h-9 rounded-full bg-white/6 border border-white/10 grid place-items-center text-xs"
            aria-label="إغلاق"
          >
            <X size={14} />
          </button>
        </div>

        {/* Stations */}
        <div className="space-y-1.5 mb-3">
          {QURAN_RADIO_STATIONS.map((station, i) => (
            <button
              key={i}
              type="button"
              onClick={() => playRadio(i)}
              className={cn(
                "w-full text-right rounded-2xl px-3 py-2.5 text-sm border transition press-effect",
                radio.playing && radio.stationIdx === i
                  ? "bg-[var(--accent)]/15 border-[var(--accent)]/50 text-[var(--fg)] font-semibold"
                  : "bg-white/5 border-white/8 hover:bg-white/10"
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
        <button
          type="button"
          onClick={() => { toggleRadio(); if (radio.playing) setOpen(false); }}
          className={cn(
            "w-full rounded-2xl py-3 text-sm font-semibold transition press-effect",
            radio.playing
              ? "bg-[var(--danger)]/20 text-[var(--danger)] border border-[var(--danger)]/30 hover:bg-[var(--danger)]/30"
              : "bg-[var(--accent)] text-black hover:opacity-90"
          )}
        >
          {radio.playing ? "إيقاف البث" : "تشغيل"}
        </button>
      </div>
    </div>
  );
}
