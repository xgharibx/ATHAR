import * as React from "react";
import { useNoorStore } from "@/store/noorStore";
import { cn } from "@/lib/utils";

const TASBEEHAT = [
  { key: "subhanallah" as const, label: "سُبْحَانَ الله", short: "سبحان الله" },
  { key: "alhamdulillah" as const, label: "الحمد لله", short: "الحمد لله" },
  { key: "la_ilaha_illallah" as const, label: "لا إله إلا الله", short: "لا إله إلا الله" },
  { key: "allahu_akbar" as const, label: "الله أكبر", short: "الله أكبر" },
] as const;

type TasbeehKey = typeof TASBEEHAT[number]["key"];

export function QuickTasbeehFab() {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<TasbeehKey>("subhanallah");
  const quickTasbeeh = useNoorStore((s) => s.quickTasbeeh);
  const incQuickTasbeeh = useNoorStore((s) => s.incQuickTasbeeh);
  const prefs = useNoorStore((s) => s.prefs);
  const [pulse, setPulse] = React.useState(false);

  const count = quickTasbeeh[selected] ?? 0;
  const target = 100;
  const pct = Math.min(count / target, 1);
  const current = TASBEEHAT.find((t) => t.key === selected)!;

  const onCount = () => {
    incQuickTasbeeh(selected, target);
    if (prefs.enableHaptics && navigator.vibrate) navigator.vibrate(10);
    setPulse(true);
    setTimeout(() => setPulse(false), 200);
  };

  if (!open) {
    return (
      <button
        className="fab xl:hidden"
        style={{
          bottom: `calc(84px + var(--sab))`,
          right: "16px",
        }}
        onClick={() => setOpen(true)}
        aria-label="تسبيح سريع"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </button>
    );
  }

  return (
    <div
      className="fixed z-[9990] xl:hidden"
      style={{
        bottom: `calc(84px + var(--sab))`,
        right: "16px",
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
        {/* Close */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">تسبيح سريع</div>
          <button
            onClick={() => setOpen(false)}
            className="w-11 h-11 rounded-full bg-white/6 border border-white/10 grid place-items-center text-xs"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Selector */}
        <div className="grid grid-cols-2 gap-1.5 mb-4">
          {TASBEEHAT.map((t) => (
            <button
              key={t.key}
              onClick={() => setSelected(t.key)}
              className={cn(
                "rounded-2xl px-2.5 py-3 text-sm border transition press-effect min-h-[44px]",
                selected === t.key
                  ? "bg-[var(--accent)] text-black border-transparent font-semibold"
                  : "bg-white/6 border-white/10 hover:bg-white/10"
              )}
            >
              {t.short}
            </button>
          ))}
        </div>

        {/* Counter display */}
        <div className="text-center mb-3">
          <div className="text-sm opacity-70 mb-1">{current.label}</div>
          <div className={cn("text-4xl font-bold tabular-nums", pulse && "count-pulse")}>
            {count}
          </div>
          <div className="text-xs opacity-50 mt-1">من {target}</div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-white/8 overflow-hidden border border-white/10 mb-4">
          <div
            className={cn("h-full transition-[width] duration-200", count >= target ? "progress-ok" : "progress-accent")}
            style={{ width: `${pct * 100}%` }}
          />
        </div>

        {/* Count button */}
        <button
          onClick={onCount}
          className={cn(
            "w-full rounded-2xl py-4 text-base font-semibold border transition btn-count press-effect",
            count >= target
              ? "bg-[var(--ok)] text-black border-transparent"
              : "bg-[var(--accent)] text-black border-transparent"
          )}
        >
          {count >= target ? "تم ١٠٠ — سبحان الله" : "اضغط للعدّ"}
        </button>
      </div>
    </div>
  );
}
