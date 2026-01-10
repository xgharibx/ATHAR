import * as React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Lottie from "lottie-react";
import { Sparkles, Shuffle, RotateCw } from "lucide-react";

import pulse from "@/assets/noor-pulse.json";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import { useNoorStore } from "@/store/noorStore";
import toast from "react-hot-toast";
import { PrayerWidget } from "@/components/layout/PrayerWidget";
import { formatLeadingIstiadhahBasmalah } from "@/lib/arabic";

type QuickTasbeehKey = "subhanallah" | "alhamdulillah" | "la_ilaha_illallah" | "allahu_akbar";
const QUICK_TASBEEH: Array<{ key: QuickTasbeehKey; label: string }> = [
  { key: "subhanallah", label: "سُبْحَانَ الله" },
  { key: "alhamdulillah", label: "الْحَمْدُ لِلَّه" },
  { key: "la_ilaha_illallah", label: "لا إِلَهَ إِلَّا الله" },
  { key: "allahu_akbar", label: "اللهُ أَكْبَر" }
];

function isoDay(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function textClassByLength(text: string) {
  const len = (text ?? "").trim().length;
  if (len > 900) return "text-xs leading-6";
  if (len > 520) return "text-sm leading-7";
  return "text-base leading-8";
}

export function HomePage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useAdhkarDB();
  const exportState = useNoorStore((s) => s.exportState);
  const activity = useNoorStore((s) => s.activity);
  const progressMap = useNoorStore((s) => s.progress);
  const lastVisitedSectionId = useNoorStore((s) => s.lastVisitedSectionId);
  const prefs = useNoorStore((s) => s.prefs);

  const quickTasbeeh = useNoorStore((s) => s.quickTasbeeh);
  const incQuickTasbeeh = useNoorStore((s) => s.incQuickTasbeeh);
  const resetAllQuickTasbeeh = useNoorStore((s) => s.resetAllQuickTasbeeh);

  const sections = data?.db.sections ?? [];
  const flat = data?.flat ?? [];

  const todayKey = React.useMemo(() => isoDay(new Date()), []);
  const rng = React.useMemo(() => mulberry32(seedFromString(todayKey)), [todayKey]);

  const [analyticsRange, setAnalyticsRange] = React.useState<
    "today" | "week" | "month" | "year" | "total"
  >("week");

  const onRandom = () => {
    if (!data?.flat?.length) return;
    const r = data.flat[Math.floor(Math.random() * data.flat.length)];
    navigate(`/c/${r.sectionId}?focus=${r.index}`);
  };

  const onQuick = (id: string) => {
    navigate(`/c/${id}`);
  };

  const featured = React.useMemo(() => {
    const featuredIds = ["morning", "evening", "post_prayer", "sleep", "adhan"];
    return featuredIds
      .map((id) => sections.find((s) => s.id === id))
      .filter(Boolean) as any[];
  }, [sections]);

  const lastVisitedSection = React.useMemo(() => {
    if (!lastVisitedSectionId) return null;
    return sections.find((s) => s.id === lastVisitedSectionId) ?? null;
  }, [lastVisitedSectionId, sections]);

  const analytics = React.useMemo(() => {
    const today = new Date();
    const keys = Object.keys(activity);

    const sumLastNDays = (n: number) => {
      let total = 0;
      for (let i = 0; i < n; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        total += activity[isoDay(d)] ?? 0;
      }
      return total;
    };

    const totalAll = keys.reduce((acc, k) => acc + (activity[k] ?? 0), 0);

    // Completion snapshot (current device state)
    let completedItems = 0;
    let totalItems = 0;
    let completedCounts = 0;
    let totalCounts = 0;

    const perSection = sections.map((s) => {
      let secCompleted = 0;
      let secTotal = 0;

      s.content.forEach((it, idx) => {
        const target = Math.max(1, Number(it.count ?? 1));
        const key = `${s.id}:${idx}`;
        const current = Math.min(progressMap[key] ?? 0, target);

        totalCounts += target;
        completedCounts += current;

        secTotal += 1;
        totalItems += 1;
        if (current >= target) {
          secCompleted += 1;
          completedItems += 1;
        }
      });

      const percent = secTotal ? Math.round((secCompleted / secTotal) * 100) : 0;
      return { id: s.id, title: s.title, secCompleted, secTotal, percent };
    });

    const topSections = [...perSection].sort((a, b) => b.percent - a.percent).slice(0, 5);

    const completionPercent = totalCounts ? Math.round((completedCounts / totalCounts) * 100) : 0;

    return {
      today: activity[todayKey] ?? 0,
      week: sumLastNDays(7),
      month: sumLastNDays(30),
      year: sumLastNDays(365),
      totalAll,
      completedItems,
      totalItems,
      completedCounts,
      totalCounts,
      completionPercent,
      topSections
    };
  }, [activity, progressMap, sections, todayKey]);

  const quickTotal = React.useMemo(() => {
    const target = 100;
    const done = QUICK_TASBEEH.reduce((acc, it) => acc + Math.min(target, quickTasbeeh[it.key] ?? 0), 0);
    const total = QUICK_TASBEEH.length * target;
    const percent = total ? Math.round((done / total) * 100) : 0;
    return { done, total, percent };
  }, [quickTasbeeh]);

  const holdRef = React.useRef<Record<string, number | null>>({});

  const onQuickDown = (key: QuickTasbeehKey) => {
    window.clearInterval(holdRef.current[key] ?? undefined);
    holdRef.current[key] = window.setInterval(() => {
      incQuickTasbeeh(key, 100);
      if (prefs.enableHaptics && navigator.vibrate) navigator.vibrate(5);
    }, 120);
  };
  const onQuickUp = (key: QuickTasbeehKey) => {
    window.clearInterval(holdRef.current[key] ?? undefined);
    holdRef.current[key] = null;
  };

  if (isLoading) {
    return <div className="p-6 opacity-80">... تحميل قاعدة الأذكار</div>;
  }
  if (error || !data) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <div className="text-lg font-semibold">حدث خطأ</div>
          <div className="opacity-70 mt-2 text-sm leading-6">
            لم نستطع تحميل قاعدة الأذكار. تأكد من وجود الملف{" "}
            <code className="px-2 py-1 rounded-lg bg-white/6 border border-white/10">
              public/data/adhkar
            </code>
          </div>
        </Card>
      </div>
    );
  }

  const rangeValue =
    analyticsRange === "today"
      ? analytics.today
      : analyticsRange === "week"
        ? analytics.week
        : analyticsRange === "month"
          ? analytics.month
          : analyticsRange === "year"
            ? analytics.year
            : analytics.totalAll;

  const rangeLabel =
    analyticsRange === "today"
      ? "اليوم"
      : analyticsRange === "week"
        ? "أسبوع"
        : analyticsRange === "month"
          ? "شهر"
          : analyticsRange === "year"
            ? "سنة"
            : "الإجمالي";

  return (
    <div className="space-y-4">
      <Card className="p-6 overflow-hidden relative">
        <div className="absolute -top-10 -left-8 opacity-80">
          <div className="w-40 h-40">
            <Lottie animationData={pulse} loop />
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3">
                <Sparkles size={14} className="text-[var(--accent)]" />
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold leading-tight">
                أثر — اترك <span className="text-[var(--accent)]">أثراً</span> طيباً
              </h1>
              <div className="mt-3 text-sm opacity-70 leading-7 max-w-2xl">
                {"{وَقُلْ رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا}"}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={() => onQuick("morning")}>ابدأ بأذكار الصباح</Button>
                {lastVisitedSection ? (
                  <Button variant="secondary" onClick={() => navigate(`/c/${lastVisitedSection.id}`)}>
                    تابع آخر قسم
                  </Button>
                ) : null}
                <Button variant="secondary" onClick={() => navigate("/quran")}>المصحف</Button>
                <Button variant="secondary" onClick={onRandom}>
                  <Shuffle size={16} />
                  ذكر عشوائي
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const blob = exportState();
                    const raw = JSON.stringify(blob, null, 2);
                    navigator.clipboard
                      .writeText(raw)
                      .then(() => toast.success("تم نسخ النسخة الاحتياطية"))
                      .catch(() => toast.error("تعذر النسخ"));
                  }}
                >
                  نسخ نسخة احتياطية
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </Card>

      <PrayerWidget />

      <h2 className="text-lg font-semibold px-1">الأقسام المميزة</h2>

      {featured.length ? (
        <Card className="p-5">
          <div className="text-sm font-semibold mb-3">مختارات سريعة</div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {featured.map((s) => (
              <button
                key={s.id}
                onClick={() => onQuick(s.id)}
                className="glass rounded-3xl p-4 text-right hover:bg-white/10 transition border border-white/10"
              >
                <div className="text-sm font-semibold">{s.title}</div>
                <div className="mt-1 text-xs opacity-60">{s.content.length} ذكر</div>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">مختارات اليوم</div>
          <div className="flex items-center gap-2">
            <Badge>{`${quickTotal.done}/${quickTotal.total}`}</Badge>
            <IconButton
              aria-label="تصفير التسابيح"
              onClick={() => {
                resetAllQuickTasbeeh();
                toast.success("تم تصفير التسابيح");
              }}
            >
              <RotateCw size={16} />
            </IconButton>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-white/6 overflow-hidden border border-white/10">
          <div className="h-full bg-[var(--accent)]/70" style={{ width: `${quickTotal.percent}%` }} />
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_TASBEEH.map((it) => {
            const target = 100;
            const v = Math.min(target, quickTasbeeh[it.key] ?? 0);
            const pct = target ? v / target : 0;
            const r = 22;
            const C = 2 * Math.PI * r;
            const dash = C;
            const offset = C - pct * C;
            const done = v >= target;

            return (
              <button
                key={it.key}
                onClick={() => {
                  incQuickTasbeeh(it.key, 100);
                  if (prefs.enableHaptics && navigator.vibrate) navigator.vibrate(12);
                }}
                onPointerDown={() => onQuickDown(it.key)}
                onPointerUp={() => onQuickUp(it.key)}
                onPointerCancel={() => onQuickUp(it.key)}
                onPointerLeave={() => onQuickUp(it.key)}
                className="glass rounded-3xl p-4 text-right hover:bg-white/10 transition border border-white/10 select-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold arabic-text truncate">{it.label}</div>
                    <div className="mt-1 text-xs opacity-65 tabular-nums">{v}/100</div>
                  </div>

                  <div className="shrink-0">
                    <div className="w-12 h-12 rounded-full bg-white/6 border border-white/10 flex items-center justify-center">
                      <svg width="44" height="44" viewBox="0 0 60 60">
                        <circle
                          cx="30"
                          cy="30"
                          r={r}
                          fill="transparent"
                          stroke="rgba(255,255,255,0.12)"
                          strokeWidth="6"
                        />
                        <circle
                          cx="30"
                          cy="30"
                          r={r}
                          fill="transparent"
                          stroke={done ? "var(--ok)" : "var(--accent)"}
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={dash}
                          strokeDashoffset={offset}
                          transform="rotate(-90 30 30)"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="text-[11px] opacity-60">اضغط مطوّلًا للتسريع</div>
                  <Badge>{done ? "تم" : `${100 - v} متبقّي`}</Badge>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Bottom: analytics overview */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">التقدّم والتحليلات</div>
            <div className="text-xs opacity-65 mt-1">نشاط + إتمام + أفضل الأقسام</div>
          </div>
          <Button variant="outline" onClick={() => navigate("/insights")}>
            عرض التفاصيل
          </Button>
        </div>

        <div className="mt-4 glass rounded-3xl p-4 border border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs opacity-65">نشاط الذكر</div>
            <Badge>{rangeLabel}</Badge>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={analyticsRange === "today" ? "secondary" : "ghost"}
              onClick={() => setAnalyticsRange("today")}
            >
              اليوم
            </Button>
            <Button
              size="sm"
              variant={analyticsRange === "week" ? "secondary" : "ghost"}
              onClick={() => setAnalyticsRange("week")}
            >
              أسبوع
            </Button>
            <Button
              size="sm"
              variant={analyticsRange === "month" ? "secondary" : "ghost"}
              onClick={() => setAnalyticsRange("month")}
            >
              شهر
            </Button>
            <Button
              size="sm"
              variant={analyticsRange === "year" ? "secondary" : "ghost"}
              onClick={() => setAnalyticsRange("year")}
            >
              سنة
            </Button>
            <Button
              size="sm"
              variant={analyticsRange === "total" ? "secondary" : "ghost"}
              onClick={() => setAnalyticsRange("total")}
            >
              الإجمالي
            </Button>
          </div>

          <div className="mt-4 text-4xl font-semibold tabular-nums">{rangeValue}</div>
          <div className="mt-1 text-xs opacity-60">عدد الضغطات المسجّلة في الفترة</div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <MiniStat label="نسبة الإتمام" value={`${analytics.completionPercent}%`} />
          <MiniStat label="أذكار مكتملة" value={`${analytics.completedItems}/${analytics.totalItems}`} />
          <MiniStat label="مجموع العدّ" value={`${analytics.completedCounts}/${analytics.totalCounts}`} />
        </div>

        <div className="mt-3 glass rounded-3xl p-4 border border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs opacity-65">الإتمام الإجمالي</div>
            <div className="text-xs opacity-65 tabular-nums">{analytics.completionPercent}%</div>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white/6 overflow-hidden border border-white/10">
            <div className="h-full bg-[var(--accent)]/70" style={{ width: `${analytics.completionPercent}%` }} />
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs opacity-65 mb-2">أفضل الأقسام</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {analytics.topSections.slice(0, 3).map((s) => (
              <div key={s.id} className="glass rounded-3xl p-4 border border-white/10">
                <div className="text-xs opacity-65 truncate">{s.title}</div>
                <div className="mt-2 h-2 rounded-full bg-white/6 overflow-hidden border border-white/10">
                  <div className="h-full bg-[var(--accent)]/60" style={{ width: `${s.percent}%` }} />
                </div>
                <div className="mt-2 text-xs opacity-65 tabular-nums">{s.percent}%</div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function MiniStat(props: { label: string; value: string | number }) {
  return (
    <div className="glass rounded-3xl p-4 border border-white/10">
      <div className="text-xs opacity-60">{props.label}</div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{props.value}</div>
    </div>
  );
}
