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

export function QuickTasbeehFab({ drawerOpen }: { drawerOpen?: boolean }) {
  // All hooks must be declared before any early return
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<TasbeehKey>("subhanallah");
  const storedTarget = useNoorStore((s) => s.sebhaTarget);
  const [target, setTarget] = React.useState<33 | 100 | 1000>(100);
  const quickTasbeeh = useNoorStore((s) => s.quickTasbeeh);
  const incQuickTasbeeh = useNoorStore((s) => s.incQuickTasbeeh);
  const prefs = useNoorStore((s) => s.prefs);
  const [pulse, setPulse] = React.useState(false);

  // Ref for the FAB trigger button (for focus return on dialog close)
  const fabRef = React.useRef<HTMLButtonElement>(null);

  // Focus trap: cycle Tab/Shift+Tab within the open dialog
  const panelRef = React.useRef<HTMLDivElement>(null);
  const trapFocus = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const el = panelRef.current;
    if (!el) return;
    const focusable = Array.from(el.querySelectorAll<HTMLElement>(
      'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    ));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, []);
  // Return focus to FAB trigger when dialog closes
  React.useEffect(() => {
    if (!open && !drawerOpen) { fabRef.current?.focus(); }
  }, [open, drawerOpen]);
  // Close expansion when the hamburger drawer opens
  React.useEffect(() => { if (drawerOpen) setOpen(false); }, [drawerOpen]);
  // Sync FAB target with Sebha stored target on open to prevent lock
  React.useEffect(() => {
    if (open && (storedTarget === 33 || storedTarget === 100 || storedTarget === 1000)) {
      setTarget(storedTarget as 33 | 100 | 1000);
    }
  }, [open, storedTarget]);

  // Hide when drawer is open — all hooks already called above
  if (drawerOpen) return null;

  const count = quickTasbeeh[selected] ?? 0;
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
      <button type="button"
        ref={fabRef}
        className="fab xl:hidden"
        style={{
          bottom: "calc(var(--mobile-nav-height) + (var(--mobile-nav-gap) * 2) + var(--sab))",
          right: "calc(16px + var(--sar))",
        }}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="تسبيح سريع"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
        bottom: "calc(var(--mobile-nav-height) + (var(--mobile-nav-gap) * 2) + var(--sab))",
        right: "calc(16px + var(--sar))",
      }}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } }}
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
        ref={panelRef}
        onKeyDown={trapFocus}
        role="dialog"
        aria-modal="true"
        aria-label="تسبيح سريع"
      >
        {/* Close */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">تسبيح سريع</div>
          <button type="button"
            autoFocus
            onClick={() => setOpen(false)}
            className="w-11 h-11 rounded-full bg-[var(--card)] border border-[var(--stroke)] grid place-items-center text-xs"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Selector */}
        <div className="grid grid-cols-2 gap-1.5 mb-4">
          {TASBEEHAT.map((t) => (
            <button type="button"
              key={t.key}
              onClick={() => setSelected(t.key)}
              className={cn(
                "rounded-2xl px-2.5 py-3 text-sm border transition press-effect min-h-[44px]",
                selected === t.key
                  ? "bg-[var(--accent)] text-[var(--on-accent)] border-transparent font-semibold"
                  : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"
              )}
            >
              {t.short}
            </button>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-1">
          {[33, 100, 1000].map((value) => (
            <button type="button"
              key={value}
              onClick={() => setTarget(value as 33 | 100 | 1000)}
              className={cn(
                "rounded-xl px-3 py-2 text-xs font-semibold transition",
                target === value
                  ? "bg-[var(--accent)] text-[var(--on-accent)]"
                  : "text-[var(--muted)] hover:bg-[var(--card-2)]"
              )}
            >
              {value}
            </button>
          ))}
        </div>

        {/* Counter display */}
        <div className="text-center mb-3">
          <div className="text-sm opacity-70 mb-1">{current.label}</div>
          <div className={cn("text-4xl font-bold tabular-nums", pulse && "count-pulse")} aria-live="polite" aria-atomic="true">
            {count}
          </div>
          <div className="text-xs opacity-50 mt-1">من {target}</div>
        </div>

        {/* Progress bar */}
        <div
          className="h-2 rounded-full bg-[var(--card)] overflow-hidden border border-[var(--stroke)] mb-4"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={target}
          aria-valuenow={count}
          aria-label={`التقدم: ${count} من ${target}`}
        >
          <div
            className={cn("h-full transition-[width] duration-200", count >= target ? "progress-ok" : "progress-accent")}
            style={{ width: `${pct * 100}%` }}
          />
        </div>

        {/* Count button */}
        <button type="button"
          onClick={onCount}
          className={cn(
            "w-full rounded-2xl py-4 text-base font-semibold border transition btn-count press-effect",
            count >= target
              ? "bg-[var(--ok)] text-[var(--on-accent)] border-transparent"
              : "bg-[var(--accent)] text-[var(--on-accent)] border-transparent"
          )}
        >
          {count >= target ? `تم ${target} — ${current.short}` : "اضغط للعدّ"}
        </button>
      </div>
    </div>
  );
}
