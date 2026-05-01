import * as React from "react";
import { CheckCircle2, RotateCw, Sparkles, Target } from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { useNoorStore } from "@/store/noorStore";
import { cn, pct } from "@/lib/utils";

const TASBEEHAT = [
  {
    key: "subhanallah",
    label: "سُبْحَانَ الله",
    short: "سبحان الله",
    hint: "تنزيه لله وتعظيم له",
  },
  {
    key: "alhamdulillah",
    label: "الْحَمْدُ لِلَّه",
    short: "الحمد لله",
    hint: "شكر وثناء في كل حال",
  },
  {
    key: "la_ilaha_illallah",
    label: "لا إِلَهَ إِلَّا الله",
    short: "لا إله إلا الله",
    hint: "كلمة التوحيد وأصل الذكر",
  },
  {
    key: "allahu_akbar",
    label: "اللهُ أَكْبَر",
    short: "الله أكبر",
    hint: "تكبير يرفع القلب عن الشواغل",
  },
] as const;

type TasbeehKey = typeof TASBEEHAT[number]["key"];

const TARGETS = [33, 100, 1000] as const;

export function SebhaPage() {
  const [selected, setSelected] = React.useState<TasbeehKey>("subhanallah");
  const [target, setTarget] = React.useState<(typeof TARGETS)[number]>(100);
  const [confirmReset, setConfirmReset] = React.useState(false);
  const quickTasbeeh = useNoorStore((s) => s.quickTasbeeh);
  const incQuickTasbeeh = useNoorStore((s) => s.incQuickTasbeeh);
  const resetQuickTasbeeh = useNoorStore((s) => s.resetQuickTasbeeh);
  const resetAllQuickTasbeeh = useNoorStore((s) => s.resetAllQuickTasbeeh);
  const prefs = useNoorStore((s) => s.prefs);

  const current = TASBEEHAT.find((item) => item.key === selected) ?? TASBEEHAT[0];
  const count = Number(quickTasbeeh[selected] ?? 0);
  const percent = pct(Math.min(count, target), target);
  const remaining = Math.max(0, target - count);
  const completed = count >= target;

  const increment = React.useCallback(() => {
    const next = incQuickTasbeeh(selected, target);
    if (prefs.enableHaptics && navigator.vibrate) navigator.vibrate(next >= target ? 24 : 10);
    if (next === target) toast.success("اكتمل هدف التسبيح");
  }, [incQuickTasbeeh, prefs.enableHaptics, selected, target]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        increment();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [increment]);

  const totalDone = TASBEEHAT.reduce((sum, item) => sum + Math.min(Number(quickTasbeeh[item.key] ?? 0), target), 0);
  const totalTarget = TASBEEHAT.length * target;
  const allPercent = pct(totalDone, totalTarget);

  return (
    <div className="space-y-3 page-enter">
      <Card className="p-5 overflow-hidden relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles size={15} className="text-[var(--accent)]" />
              <span className="text-xs font-semibold opacity-60">سبحة ذكية</span>
              <Badge>{totalDone}/{totalTarget}</Badge>
            </div>
            <h1 className="mt-2 text-xl md:text-2xl font-bold leading-tight">السبحة اليومية</h1>
            <div className="mt-1 text-sm opacity-65 leading-6">عداد هادئ للتسبيح والصلاة على النبي، محفوظ ضمن يومك الإيماني.</div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {confirmReset ? (
              <>
                <Button size="sm" variant="danger" onClick={() => { resetAllQuickTasbeeh(); setConfirmReset(false); toast.success("تم تصفير السبحة"); }}>تأكيد</Button>
                <Button size="sm" variant="secondary" onClick={() => setConfirmReset(false)}>إلغاء</Button>
              </>
            ) : (
              <IconButton aria-label="تصفير كل التسابيح" onClick={() => setConfirmReset(true)} title="تصفير كل التسابيح">
                <RotateCw size={17} />
              </IconButton>
            )}
          </div>
        </div>

        <div className="mt-4 h-2 rounded-full bg-white/8 border border-white/10 overflow-hidden">
          <div className="h-full progress-accent transition-[width] duration-300" style={{ width: `${allPercent}%` }} />
        </div>
      </Card>

      <Card className="p-5 text-center">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1">
            {TARGETS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTarget(value)}
                className={cn(
                  "min-w-12 rounded-xl px-3 py-2 text-xs font-semibold transition",
                  target === value ? "bg-[var(--accent)] text-black" : "text-white/65 hover:bg-white/8"
                )}
              >
                {value}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => { resetQuickTasbeeh(selected); toast.success("تم تصفير الذكر الحالي"); }}>
            <RotateCw size={16} />
            تصفير الحالي
          </Button>
        </div>

        <button
          type="button"
          onClick={increment}
          className={cn(
            "mt-6 mx-auto grid place-items-center rounded-full border transition active:scale-[.98] select-none",
            "w-56 h-56 max-w-[74vw] max-h-[74vw]",
            completed
              ? "bg-[var(--ok)]/12 border-[var(--ok)]/30"
              : "bg-[var(--accent)]/12 border-[var(--accent)]/25 hover:bg-[var(--accent)]/16"
          )}
          aria-label="اضغط للعد"
        >
          <div>
            <div className="text-xs opacity-55 mb-2">{current.short}</div>
            <div className="text-6xl font-black tabular-nums leading-none">{count}</div>
            <div className="mt-2 text-xs opacity-60">من {target}</div>
          </div>
        </button>

        <div className="mt-5 h-2 rounded-full bg-white/8 border border-white/10 overflow-hidden">
          <div className={cn("h-full transition-[width] duration-300", completed ? "progress-ok" : "progress-accent")} style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 text-sm opacity-75">
          {completed ? <CheckCircle2 size={17} className="text-[var(--ok)]" /> : <Target size={17} className="text-[var(--accent)]" />}
          {completed ? "تم الهدف" : `${remaining} متبقي`}
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {TASBEEHAT.map((item) => {
          const itemCount = Number(quickTasbeeh[item.key] ?? 0);
          const itemPercent = pct(Math.min(itemCount, target), target);
          const active = item.key === selected;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setSelected(item.key)}
              className={cn(
                "glass rounded-3xl p-4 text-right border transition active:scale-[.98]",
                active ? "border-[var(--accent)]/35 bg-[var(--accent)]/8" : "border-white/10 hover:bg-white/6"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="arabic-text text-base font-bold leading-7">{item.label}</div>
                  <div className="mt-1 text-xs opacity-55 leading-5">{item.hint}</div>
                </div>
                <Badge>{itemCount}/{target}</Badge>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-white/8 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${itemPercent}%`, background: itemPercent >= 100 ? "var(--ok)" : "var(--accent)" }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}