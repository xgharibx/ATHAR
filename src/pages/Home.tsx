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

type DailyHadith = { text: string; ref: string; url: string };
const DAILY_HADITH: DailyHadith[] = [
  {
    text: "إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى.",
    ref: "صحيح البخاري وصحيح مسلم",
    url: "https://sunnah.com/bukhari:1"
  },
  {
    text: "من كان يؤمن بالله واليوم الآخر فليقل خيرًا أو ليصمت.",
    ref: "صحيح البخاري وصحيح مسلم",
    url: "https://sunnah.com/bukhari:6018"
  },
  {
    text: "الدين النصيحة.",
    ref: "صحيح مسلم",
    url: "https://sunnah.com/muslim:55"
  },
  {
    text: "أحب الأعمال إلى الله أدومها وإن قل.",
    ref: "صحيح البخاري وصحيح مسلم",
    url: "https://sunnah.com/bukhari:6465"
  },
  {
    text: "يسروا ولا تعسروا.",
    ref: "صحيح البخاري",
    url: "https://sunnah.com/bukhari:6125"
  }
];

type DailyAyah = { text: string; surah?: string; numberInSurah?: number };
const FALLBACK_AYAT: DailyAyah[] = [
  { text: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", surah: "الرعد", numberInSurah: 28 },
  { text: "فَاذْكُرُونِي أَذْكُرْكُمْ", surah: "البقرة", numberInSurah: 152 },
  { text: "وَقُل رَّبِّ زِدْنِي عِلْمًا", surah: "طه", numberInSurah: 114 },
  { text: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", surah: "الشرح", numberInSurah: 6 }
];

export function HomePage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useAdhkarDB();
  const exportState = useNoorStore((s) => s.exportState);
  const activity = useNoorStore((s) => s.activity);
  const progressMap = useNoorStore((s) => s.progress);

  const sections = data?.db.sections ?? [];
  const flat = data?.flat ?? [];

  const todayKey = React.useMemo(() => isoDay(new Date()), []);
  const rng = React.useMemo(() => mulberry32(seedFromString(todayKey)), [todayKey]);

  const [dailyAyah, setDailyAyah] = React.useState<DailyAyah | null>(null);
  const [dailyHadith, setDailyHadith] = React.useState<DailyHadith | null>(null);
  const [analyticsRange, setAnalyticsRange] = React.useState<
    "today" | "week" | "month" | "year" | "total"
  >("week");

  React.useEffect(() => {
    const cacheKey = `athar_daily_ayah_${todayKey}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setDailyAyah(JSON.parse(cached));
        return;
      }
    } catch {
      // ignore
    }

    const fallback = () => {
      const pick = FALLBACK_AYAT[Math.floor(rng() * FALLBACK_AYAT.length)] ?? FALLBACK_AYAT[0];
      setDailyAyah(pick);
    };

    const ayahNumber = 1 + Math.floor(rng() * 6236);
    fetch(`https://api.alquran.cloud/v1/ayah/${ayahNumber}/quran-uthmani`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => {
        const d = json?.data;
        const next: DailyAyah = {
          text: d?.text,
          surah: d?.surah?.name,
          numberInSurah: d?.numberInSurah
        };
        if (!next.text) throw new Error("no text");
        setDailyAyah(next);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(next));
        } catch {
          // ignore
        }
      })
      .catch(fallback);
  }, [rng, todayKey]);

  React.useEffect(() => {
    const cacheKey = `athar_daily_hadith_${todayKey}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setDailyHadith(JSON.parse(cached));
        return;
      }
    } catch {
      // ignore
    }

    const pick = DAILY_HADITH[Math.floor(rng() * DAILY_HADITH.length)] ?? DAILY_HADITH[0];
    setDailyHadith(pick);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(pick));
    } catch {
      // ignore
    }
  }, [rng, todayKey]);

  const onRefreshHadith = () => {
    const cacheKey = `athar_daily_hadith_${todayKey}`;
    const currentIdx = dailyHadith
      ? DAILY_HADITH.findIndex((h) => h.url === dailyHadith.url)
      : -1;
    const nextIdx = DAILY_HADITH.length
      ? (Math.max(0, currentIdx) + 1) % DAILY_HADITH.length
      : 0;
    const pick = DAILY_HADITH[nextIdx] ?? DAILY_HADITH[0];
    setDailyHadith(pick);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(pick));
    } catch {
      // ignore
    }
    toast.success("تم تحديث الحديث");
  };

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

  const dailyDhikr = React.useMemo(() => {
    if (!flat.length) return null;
    return flat[Math.floor(rng() * flat.length)];
  }, [flat, rng]);

  const dailyDua = React.useMemo(() => {
    const candidates = flat.filter((x) => x.text?.includes("اللهم") || x.text?.trim().startsWith("رب"));
    const arr = candidates.length ? candidates : flat;
    if (!arr.length) return null;
    return arr[Math.floor(rng() * arr.length)];
  }, [flat, rng]);

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
          <Badge>تتغير يوميًا</Badge>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="glass rounded-3xl p-4 border border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs opacity-65">ذكر اليوم</div>
              <Badge>اليوم</Badge>
            </div>
            <div
              className={`mt-3 arabic-text whitespace-pre-wrap ${textClassByLength(dailyDhikr?.text ?? "")}`}
              style={{ overflowWrap: "anywhere" }}
            >
              {dailyDhikr?.text ?? ""}
            </div>
            {dailyDhikr ? (
              <div className="mt-3">
                <Button variant="secondary" onClick={() => navigate(`/c/${dailyDhikr.sectionId}?focus=${dailyDhikr.index}`)}>
                  فتح
                </Button>
              </div>
            ) : null}
          </div>

          <div className="glass rounded-3xl p-4 border border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs opacity-65">دعاء اليوم</div>
              <Badge>اليوم</Badge>
            </div>
            <div
              className={`mt-3 arabic-text whitespace-pre-wrap ${textClassByLength(dailyDua?.text ?? "")}`}
              style={{ overflowWrap: "anywhere" }}
            >
              {dailyDua?.text ?? ""}
            </div>
            {dailyDua ? (
              <div className="mt-3">
                <Button variant="secondary" onClick={() => navigate(`/c/${dailyDua.sectionId}?focus=${dailyDua.index}`)}>
                  فتح
                </Button>
              </div>
            ) : null}
          </div>

          <div className="glass rounded-3xl p-4 border border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs opacity-65">حديث اليوم</div>
              <div className="flex items-center gap-2">
                <Badge>اليوم</Badge>
                <IconButton aria-label="تحديث الحديث" onClick={onRefreshHadith}>
                  <RotateCw size={16} />
                </IconButton>
              </div>
            </div>
            <div
              className={`mt-3 arabic-text whitespace-pre-wrap ${textClassByLength(dailyHadith?.text ?? "")}`}
              style={{ overflowWrap: "anywhere" }}
            >
              {dailyHadith?.text ?? ""}
            </div>
            <div className="mt-2 text-xs opacity-60">{dailyHadith?.ref ?? ""}</div>
            {dailyHadith?.url ? (
              <a
                href={dailyHadith.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-xs opacity-70 hover:opacity-95 underline underline-offset-4"
              >
                المصدر: sunnah.com
              </a>
            ) : null}
          </div>

          <div className="glass rounded-3xl p-4 border border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs opacity-65">آية اليوم</div>
              <Badge>اليوم</Badge>
            </div>
            <div
              className={`mt-3 arabic-text whitespace-pre-wrap ${textClassByLength(dailyAyah?.text ?? "")}`}
              style={{ overflowWrap: "anywhere" }}
            >
              {dailyAyah?.text ?? ""}
            </div>
            {dailyAyah?.surah ? (
              <div className="mt-2 text-xs opacity-60">
                {dailyAyah.surah}
                {dailyAyah.numberInSurah ? ` • ${dailyAyah.numberInSurah}` : ""}
              </div>
            ) : null}
          </div>
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
