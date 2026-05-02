import * as React from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ChevronRight, Flame, RotateCcw, CheckCircle2, Target, Calendar, TrendingUp } from "lucide-react";
import { useNoorStore } from "@/store/noorStore";
import { useQuranDB } from "@/data/useQuranDB";
import { toArabicNumeral, TOTAL_QURAN_AYAHS } from "@/lib/quranMeta";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseISO(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date): number {
  const ms = 24 * 60 * 60 * 1000;
  return Math.floor((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
                     Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / ms);
}

function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDate(iso: string): string {
  const d = parseISO(iso);
  if (!d) return iso;
  return d.toLocaleDateString("ar-SA", { day: "numeric", month: "long" });
}

// ── Plan presets ──────────────────────────────────────────────────────────────

interface PlanPreset {
  id: string;
  name: string;
  subtitle: string;
  days: number;
  emoji: string;
}

const PLAN_PRESETS: PlanPreset[] = [
  { id: "30",  name: "ختمة في شهر",    subtitle: "جزء كامل يومياً",     days: 30,  emoji: "⚡" },
  { id: "60",  name: "ختمة في شهرين",  subtitle: "نصف جزء يومياً",      days: 60,  emoji: "🌟" },
  { id: "90",  name: "ختمة في ثلاثة أشهر", subtitle: "ثلث جزء يومياً", days: 90,  emoji: "🌙" },
  { id: "180", name: "ختمة في ستة أشهر", subtitle: "سدس جزء يومياً",   days: 180, emoji: "🌿" },
  { id: "365", name: "ختمة في سنة",    subtitle: "آيتان فأكثر يومياً",  days: 365, emoji: "📅" },
];

// ── Mini calendar strip (last 7 days) ─────────────────────────────────────────

function WeekStrip({ doneMap }: { doneMap: Record<string, boolean> }) {
  const today = new Date();
  const days: Array<{ iso: string; label: string; idx: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const labels = ["أحد", "إثن", "ثلث", "أرب", "خمس", "جمع", "سبت"];
    days.push({ iso, label: labels[d.getDay()] ?? "", idx: i });
  }

  return (
    <div className="flex justify-between gap-1 mt-3">
      {days.map(({ iso, label }) => {
        const done = !!doneMap[iso];
        const isToday = iso === todayISO();
        return (
          <div key={iso} className="flex flex-col items-center gap-1 flex-1">
            <div className={`text-[9px] opacity-50 ${isToday ? "opacity-90 font-bold" : ""}`}>{label}</div>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all
              ${done ? "bg-[var(--accent)] text-[var(--bg)]" : isToday ? "border-2 border-[var(--accent)] text-[var(--accent)]" : "bg-white/8 opacity-40"}`}>
              {done ? "✓" : toArabicNumeral(new Date(iso + "T00:00:00").getDate())}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Progress ring ──────────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 72 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.max(0, Math.min(1, pct / 100));
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        className="rotate-90" style={{ transformOrigin: `${size / 2}px ${size / 2}px`, fontSize: 13, fontWeight: 700, fill: "var(--fg)" }}>
        {pct}٪
      </text>
    </svg>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function QuranPlansPage() {
  const navigate = useNavigate();
  const { data: quranData } = useQuranDB();

  const khatmaStartISO = useNoorStore((s) => s.khatmaStartISO);
  const khatmaDays = useNoorStore((s) => s.khatmaDays);
  const khatmaDone = useNoorStore((s) => s.khatmaDone);
  const setKhatmaPlan = useNoorStore((s) => s.setKhatmaPlan);
  const setKhatmaDone = useNoorStore((s) => s.setKhatmaDone);
  const resetKhatma = useNoorStore((s) => s.resetKhatma);
  const quranStreak = useNoorStore((s) => s.quranStreak);
  const quranDailyAyahs = useNoorStore((s) => s.quranDailyAyahs);

  const today = todayISO();
  const [showPresets, setShowPresets] = React.useState(false);
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [customDays, setCustomDays] = React.useState("120");

  // ── Active plan computation ──────────────────────────────────────────────────
  const activePlan = React.useMemo(() => {
    if (!khatmaStartISO || !khatmaDays) return null;
    const start = parseISO(khatmaStartISO);
    const todayDate = parseISO(today);
    if (!start || !todayDate) return null;

    const days = Math.max(1, khatmaDays);
    const endISO = addDays(khatmaStartISO, days);
    const elapsed = Math.max(0, daysBetween(start, todayDate));
    const isFinished = elapsed >= days;
    const dayIndex = Math.min(elapsed, days - 1);
    const dailyAyahs = Math.ceil(TOTAL_QURAN_AYAHS / days);
    const targetTotal = Math.min(TOTAL_QURAN_AYAHS, (dayIndex + 1) * dailyAyahs);
    const doneCount = Object.keys(khatmaDone ?? {}).filter((k) => khatmaDone[k]).length;
    const doneToday = !!khatmaDone?.[today];
    const pct = Math.round((doneCount / days) * 100);
    const todayAyahs = quranDailyAyahs?.[today] ?? 0;

    // Preset name lookup
    const preset = PLAN_PRESETS.find((p) => p.days === days);
    const name = preset?.name ?? `ختمة في ${toArabicNumeral(days)} يوماً`;

    return {
      name, days, dailyAyahs, endISO, elapsed, isFinished,
      dayIndex, targetTotal, doneCount, doneToday, pct,
      todayAyahs,
    };
  }, [khatmaStartISO, khatmaDays, khatmaDone, today, quranDailyAyahs]);

  // ── Today's reading progress (% of daily target) ──────────────────────────
  const todayReadPct = React.useMemo(() => {
    if (!activePlan) return 0;
    return Math.min(100, Math.round((activePlan.todayAyahs / activePlan.dailyAyahs) * 100));
  }, [activePlan]);

  // ── Start a plan ─────────────────────────────────────────────────────────────
  function startPlan(days: number) {
    setKhatmaPlan({ startISO: today, days });
    setShowPresets(false);
    toast.success("بدأت خطة جديدة 🌟");
  }

  function handleCustomStart() {
    const d = Number(customDays);
    if (!Number.isInteger(d) || d < 7 || d > 730) {
      toast.error("أدخل عدداً بين ٧ و٧٣٠ يوماً");
      return;
    }
    startPlan(d);
  }

  return (
    <div dir="rtl" className="space-y-4 pb-24 page-enter px-1">
      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/12 flex items-center justify-center transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold">خطط التلاوة</h1>
          <p className="text-xs opacity-50">تتبع ورد القرآن اليومي</p>
        </div>
      </div>

      {/* ── Active plan card ── */}
      {activePlan ? (
        <Card className="p-5 space-y-4">
          {/* Plan name + finish date */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold opacity-90">{activePlan.name}</div>
              <div className="text-xs opacity-50 mt-0.5">
                {activePlan.isFinished
                  ? "أنهيت الخطة 🎉"
                  : `تنتهي ${fmtDate(activePlan.endISO)}`}
              </div>
            </div>
            <ProgressRing pct={activePlan.pct} />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/5 p-2">
              <div className="text-base font-bold text-[var(--accent)]">{toArabicNumeral(activePlan.doneCount)}</div>
              <div className="text-[10px] opacity-50">يوم مكتمل</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-2">
              <div className="text-base font-bold">{toArabicNumeral(Math.max(0, activePlan.days - activePlan.elapsed))}</div>
              <div className="text-[10px] opacity-50">يوم متبقٍ</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-2">
              <div className="text-base font-bold">{toArabicNumeral(activePlan.dailyAyahs)}</div>
              <div className="text-[10px] opacity-50">آية يومياً</div>
            </div>
          </div>

          {/* Today's reading */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold opacity-80">ورد اليوم</span>
              <span className="text-xs opacity-50">
                {toArabicNumeral(activePlan.todayAyahs)} / {toArabicNumeral(activePlan.dailyAyahs)} آية
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                style={{ width: `${todayReadPct}%` }} />
            </div>
          </div>

          {/* Mark today done / CTA */}
          <div className="flex gap-2">
            <Button
              className={`flex-1 text-sm ${activePlan.doneToday ? "opacity-50" : ""}`}
              onClick={() => {
                setKhatmaDone(today, !activePlan.doneToday);
                if (!activePlan.doneToday) toast.success("أحسنت! سجلنا يومك ✓");
              }}
            >
              <CheckCircle2 className="w-4 h-4 ml-1.5" />
              {activePlan.doneToday ? "تم تسجيل اليوم" : "سجّل ورد اليوم"}
            </Button>
            <Button
              variant="ghost"
              className="text-sm px-4"
              onClick={() => navigate("/mushaf")}
            >
              <BookOpen className="w-4 h-4" />
            </Button>
          </div>

          {/* 7-day strip */}
          <WeekStrip doneMap={khatmaDone ?? {}} />
        </Card>
      ) : (
        /* ── No active plan ── */
        <Card className="p-6 text-center space-y-3">
          <div className="text-3xl">📖</div>
          <div className="font-semibold">لا توجد خطة نشطة</div>
          <div className="text-xs opacity-50">ابدأ خطة تلاوة وتابع وردك اليومي</div>
          <Button onClick={() => setShowPresets(true)} className="w-full mt-2">
            ابدأ خطة جديدة
          </Button>
        </Card>
      )}

      {/* ── Streak + overall stats ── */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/15 flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <div className="text-xl font-bold">{toArabicNumeral(quranStreak)}</div>
            <div className="text-[10px] opacity-50">يوم متتالي</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--accent)]/15 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <div className="text-xl font-bold">
              {toArabicNumeral(quranDailyAyahs?.[today] ?? 0)}
            </div>
            <div className="text-[10px] opacity-50">آية اليوم</div>
          </div>
        </Card>
      </div>

      {/* ── Plan presets (toggle) ── */}
      {(showPresets || !activePlan) && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold flex items-center gap-2">
              <Target className="w-4 h-4 opacity-60" />
              اختر خطة
            </div>
            {activePlan && (
              <button onClick={() => setShowPresets(false)}
                className="text-xs opacity-50 hover:opacity-80 transition-opacity">
                إلغاء
              </button>
            )}
          </div>

          <div className="space-y-2">
            {PLAN_PRESETS.map((preset) => {
              const daily = Math.ceil(TOTAL_QURAN_AYAHS / preset.days);
              const isActive = activePlan && khatmaDays === preset.days;
              return (
                <button
                  key={preset.id}
                  onClick={() => startPlan(preset.days)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-right
                    ${isActive
                      ? "bg-[var(--accent)]/15 border border-[var(--accent)]/40"
                      : "bg-white/5 hover:bg-white/10 border border-transparent"}`}
                >
                  <span className="text-xl w-8 text-center">{preset.emoji}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{preset.name}</div>
                    <div className="text-[10px] opacity-50">{preset.subtitle} · {toArabicNumeral(daily)} آية</div>
                  </div>
                  {isActive && (
                    <span className="text-[10px] bg-[var(--accent)] text-[var(--bg)] rounded-full px-2 py-0.5 font-bold shrink-0">
                      نشطة
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom */}
          <div className="border-t border-white/8 pt-3">
            <div className="text-xs opacity-50 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              خطة مخصصة
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={customDays}
                min={7}
                max={730}
                onChange={(e) => setCustomDays(e.target.value)}
                className="flex-1 bg-white/8 border border-white/10 rounded-2xl px-3 py-2 text-sm text-right focus:outline-none focus:border-[var(--accent)]/60"
                placeholder="عدد الأيام"
              />
              <Button onClick={handleCustomStart} className="shrink-0 text-sm px-4">
                ابدأ
              </Button>
            </div>
            <div className="text-[10px] opacity-40 mt-1 text-right">
              {Number(customDays) > 0
                ? `${toArabicNumeral(Math.ceil(TOTAL_QURAN_AYAHS / Math.max(1, Number(customDays))))} آية يومياً`
                : "أدخل عدداً بين ٧ و٧٣٠"}
            </div>
          </div>
        </Card>
      )}

      {/* Change / Reset plan (only if active and not showing presets) */}
      {activePlan && !showPresets && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowPresets(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white/6 hover:bg-white/10 text-sm transition-colors border border-white/8">
            <Target className="w-4 h-4 opacity-60" />
            تغيير الخطة
          </button>
          <button
            onClick={() => setConfirmReset(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm transition-colors border border-red-500/20">
            <RotateCcw className="w-4 h-4" />
            إعادة
          </button>
        </div>
      )}

      {/* Confirm reset dialog */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" onClick={() => setConfirmReset(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <Card className="relative w-full max-w-sm p-5 space-y-4 mb-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-bold">إعادة تعيين الخطة؟</div>
            <div className="text-sm opacity-60">سيتم حذف جميع بيانات التقدم الحالية.</div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setConfirmReset(false)}>
                إلغاء
              </Button>
              <Button
                className="flex-1 bg-red-500/80 hover:bg-red-500 border-none"
                onClick={() => { resetKhatma(); setConfirmReset(false); toast.success("تم إعادة تعيين الخطة"); }}
              >
                إعادة تعيين
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
