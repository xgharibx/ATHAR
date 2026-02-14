import * as React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Lottie from "lottie-react";
import {
  Sparkles,
  Shuffle,
  RotateCw,
  Copy,
  CheckCircle2,
  MoonStar,
  Trophy,
  Heart,
  LineChart,
  ListChecks
} from "lucide-react";

import pulse from "@/assets/noor-pulse.json";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import { useNoorStore } from "@/store/noorStore";
import toast from "react-hot-toast";
import { PrayerWidget } from "@/components/layout/PrayerWidget";
import { NightlyPlanStrip } from "@/components/layout/NightlyPlanStrip";
import { formatLeadingIstiadhahBasmalah } from "@/lib/arabic";
import { clamp, pct } from "@/lib/utils";
import { getOrCreateUxVariant, trackUxEvent } from "@/lib/uxMetrics";
import { useQuranDB } from "@/data/useQuranDB";
import { coerceCount } from "@/data/types";
import { useTodayKey } from "@/hooks/useTodayKey";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { DAILY_CHECKLIST_ITEMS, type DailyChecklistItem } from "@/data/dailyGrowth";

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

function parseISODate(dateISO: string) {
  const m = (dateISO ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const yyyy = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  if (!yyyy || !mm || !dd) return null;
  const d = new Date(yyyy, mm - 1, dd);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function daysBetween(a: Date, b: Date) {
  const ms = 24 * 60 * 60 * 1000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcB - utcA) / ms);
}

function shiftISO(dateISO: string, deltaDays: number) {
  const d = parseISODate(dateISO);
  if (!d) return dateISO;
  d.setDate(d.getDate() + deltaDays);
  return isoDay(d);
}

function textClassByLength(text: string) {
  const len = (text ?? "").trim().length;
  if (len > 900) return "text-xs leading-6";
  if (len > 520) return "text-sm leading-7";
  return "text-base leading-8";
}

function routeForChecklistCategory(category: DailyChecklistItem["category"]) {
  if (category === "quran") return "/quran";
  if (category === "dhikr") return "/c/morning";
  if (category === "salah") return "/ramadan";
  if (category === "sadaqah") return "/ramadan";
  return "/insights";
}

type PrayerContext = {
  nextPrayer: { label: string; at: Date } | null;
  nextPrayerMinutes: number | null;
};

type MissionStep = {
  item: DailyChecklistItem;
  title: string;
  tip: string;
  route: string;
  priority: number;
};

function rescueTipByCategory(category: DailyChecklistItem["category"]) {
  if (category === "quran") return "اقرأ صفحة واحدة فقط";
  if (category === "dhikr") return "ابدأ بذكر قصير 30 ثانية";
  if (category === "salah") return "تحقق من الصلاة القادمة واستعد لها";
  if (category === "sadaqah") return "نفّذ صدقة بسيطة الآن";
  if (category === "family") return "رسالة صلة رحم سريعة";
  return "دعاء صادق لشخص آخر";
}

const MOBILE_NAV_USAGE_KEY = "noor_home_mobile_nav_usage_v1";

export function HomePage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useAdhkarDB();
  const quran = useQuranDB();
  const activity = useNoorStore((s) => s.activity);
  const progressMap = useNoorStore((s) => s.progress);
  const lastVisitedSectionId = useNoorStore((s) => s.lastVisitedSectionId);
  const prefs = useNoorStore((s) => s.prefs);

  const quickTasbeeh = useNoorStore((s) => s.quickTasbeeh);
  const incQuickTasbeeh = useNoorStore((s) => s.incQuickTasbeeh);
  const resetAllQuickTasbeeh = useNoorStore((s) => s.resetAllQuickTasbeeh);

  const dailyWirdDone = useNoorStore((s) => s.dailyWirdDone);
  const setDailyWirdDone = useNoorStore((s) => s.setDailyWirdDone);
  const dailyWirdStartISO = useNoorStore((s) => s.dailyWirdStartISO);
  const setDailyWirdStartISO = useNoorStore((s) => s.setDailyWirdStartISO);

  const khatmaStartISO = useNoorStore((s) => s.khatmaStartISO);
  const khatmaDays = useNoorStore((s) => s.khatmaDays);
  const khatmaDone = useNoorStore((s) => s.khatmaDone);
  const setKhatmaPlan = useNoorStore((s) => s.setKhatmaPlan);
  const setKhatmaDone = useNoorStore((s) => s.setKhatmaDone);
  const resetKhatma = useNoorStore((s) => s.resetKhatma);

  const sections = data?.db.sections ?? [];

  const todayKey = useTodayKey();
  const dailyChecklistToday = useNoorStore((s) => s.dailyChecklist[todayKey] ?? {});
  const yesterdayKey = React.useMemo(() => shiftISO(todayKey, -1), [todayKey]);
  const dailyChecklistYesterday = useNoorStore((s) => s.dailyChecklist[yesterdayKey] ?? {});
  const toggleDailyChecklist = useNoorStore((s) => s.toggleDailyChecklist);
  const prayerTimes = usePrayerTimes();
  const [mobileNavUsage, setMobileNavUsage] = React.useState<Record<string, number>>({});
  const [mobileUxVariant, setMobileUxVariant] = React.useState<"A" | "B">("A");

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(MOBILE_NAV_USAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      if (parsed && typeof parsed === "object") {
        setMobileNavUsage(parsed as Record<string, number>);
      }
    } catch {
      setMobileNavUsage({});
    }
  }, []);

  React.useEffect(() => {
    setMobileUxVariant(getOrCreateUxVariant());
  }, []);

  const mobileSmartNavItems = React.useMemo(() => {
    const base = [
      { label: "رمضان", route: "/ramadan", icon: MoonStar, rank: 1 },
      { label: "قضاء", route: "/missed", icon: ListChecks, rank: 2 },
      { label: "الإحصاءات", route: "/insights", icon: LineChart, rank: 3 },
      { label: "المفضلة", route: "/favorites", icon: Heart, rank: 4 },
      { label: "المتصدرون", route: "/leaderboard", icon: Trophy, rank: 5 }
    ];

    return [...base].sort((a, b) => {
      const aUsage = mobileNavUsage[a.route] ?? 0;
      const bUsage = mobileNavUsage[b.route] ?? 0;
      if (aUsage !== bUsage) return bUsage - aUsage;
      return a.rank - b.rank;
    });
  }, [mobileNavUsage]);

  const onMobileSmartNavClick = React.useCallback(
    (route: string) => {
      setMobileNavUsage((prev) => {
        const next = { ...prev, [route]: (prev[route] ?? 0) + 1 };
        try {
          localStorage.setItem(MOBILE_NAV_USAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
        return next;
      });
      trackUxEvent(`mobile_nav:${route}`);
      navigate(route);
    },
    [navigate]
  );

  React.useEffect(() => {
    if (!dailyWirdStartISO) {
      setDailyWirdStartISO(todayKey);
    }
  }, [dailyWirdStartISO, setDailyWirdStartISO, todayKey]);

  const dailyWird = React.useMemo(() => {
    if (!quran.data) return null;
    if (!dailyWirdStartISO) return null;

    const start = parseISODate(dailyWirdStartISO);
    if (!start) return null;

    // Sequential wird: move forward only when previous chunk is marked done.
    const CHUNK = 7;

    const startKey = dailyWirdStartISO;

    const completedChunks = Object.entries(dailyWirdDone ?? {}).reduce((acc, [date, done]) => {
      if (!done) return acc;
      return date >= startKey ? acc + 1 : acc;
    }, 0);

    const chunkIndex = Math.max(0, completedChunks);

    // Flatten all ayahs into a single mushaf sequence.
    const flat: Array<{ surahId: number; surahName: string; ayahIndex: number; text: string }> = [];
    for (const s of quran.data) {
      for (let i = 0; i < s.ayahs.length; i++) {
        const text = (s.ayahs[i] ?? "").trim();
        if (!text) continue;
        flat.push({ surahId: s.id, surahName: s.name, ayahIndex: i + 1, text });
      }
    }
    if (flat.length === 0) return null;

    const startAt = (chunkIndex * CHUNK) % flat.length;
    const items: Array<{ surahId: number; surahName: string; ayahIndex: number; text: string }> = [];
    for (let i = 0; i < CHUNK; i++) {
      const idx = (startAt + i) % flat.length;
      items.push(flat[idx]);
    }

    const copyText = items
      .map((p) => `${p.text}\n— ${p.surahName} (${p.surahId}) • (${p.ayahIndex})`)
      .join("\n\n");

    return {
      items,
      copyText,
      meta: {
        from: startAt + 1,
        to: startAt + CHUNK > flat.length ? flat.length : startAt + CHUNK,
        total: flat.length,
        chunkIndex,
        chunk: CHUNK
      }
    };
  }, [dailyWirdDone, dailyWirdStartISO, quran.data]);

  const isDailyWirdDone = !!dailyWirdDone[todayKey];

  const khatma = React.useMemo(() => {
    if (!quran.data) return null;
    if (!khatmaStartISO || !khatmaDays) return null;

    const start = parseISODate(khatmaStartISO);
    const today = parseISODate(todayKey);
    if (!start || !today) return null;

    const days = Math.max(1, Math.min(365, Math.floor(khatmaDays)));

    const flat: Array<{ surahId: number; surahName: string; ayahIndex: number; text: string }> = [];
    for (const s of quran.data) {
      for (let i = 0; i < s.ayahs.length; i++) {
        const text = (s.ayahs[i] ?? "").trim();
        if (!text) continue;
        flat.push({ surahId: s.id, surahName: s.name, ayahIndex: i + 1, text });
      }
    }
    if (flat.length === 0) return null;

    const chunk = Math.ceil(flat.length / days);
    const dayIndexRaw = Math.max(0, daysBetween(start, today));
    const isFinished = dayIndexRaw >= days;
    const dayIndex = Math.min(dayIndexRaw, days - 1);

    const startAt = dayIndex * chunk;
    const endAt = Math.min(flat.length, startAt + chunk) - 1;

    const first = flat[startAt];
    const last = flat[endAt];

    const doneCount = Object.keys(khatmaDone ?? {}).filter((k) => khatmaDone[k]).length;
    const doneToday = !!khatmaDone?.[todayKey];
    const percent = days ? Math.round((doneCount / days) * 100) : 0;

    return {
      days,
      chunk,
      dayIndex,
      isFinished,
      today: { first, last },
      meta: { doneCount, doneToday, percent }
    };
  }, [khatmaDays, khatmaDone, khatmaStartISO, quran.data, todayKey]);

  const copyDailyWird = async () => {
    if (!dailyWird) return;
    try {
      await navigator.clipboard.writeText(dailyWird.copyText);
      toast.success("تم النسخ");
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  const [analyticsRange, setAnalyticsRange] = React.useState<
    "today" | "week" | "month" | "year" | "total"
  >("week");

  const onRandom = () => {
    if (!data?.flat?.length) return;
    const r = data.flat[Math.floor(Math.random() * data.flat.length)];
    trackUxEvent("home_cta:random_dhikr");
    navigate(`/c/${r.sectionId}?focus=${r.index}`);
  };

  const onQuick = (id: string) => {
    trackUxEvent(`home_cta:quick_${id}`);
    navigate(`/c/${id}`);
  };

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
        const target = coerceCount(it.count);
        const key = `${s.id}:${idx}`;
        const current = Math.min(Math.max(0, Number(progressMap[key]) || 0), target);

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
    const percent = pct(done, total);
    return { done, total, percent };
  }, [quickTasbeeh]);

  const prayerContext = React.useMemo<PrayerContext>(() => {
    const timings = prayerTimes.data?.data?.timings;
    if (!timings) return { nextPrayer: null, nextPrayerMinutes: null };

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const prayerList = [
      { label: "الفجر", value: timings.Fajr },
      { label: "الظهر", value: timings.Dhuhr },
      { label: "العصر", value: timings.Asr },
      { label: "المغرب", value: timings.Maghrib },
      { label: "العشاء", value: timings.Isha }
    ]
      .map((p) => {
        const clean = String(p.value ?? "").trim().split(" ")[0] ?? "";
        const [hh, mm] = clean.split(":").map((x) => Number.parseInt(x, 10));
        if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
        const at = new Date(dayStart);
        at.setHours(hh, mm, 0, 0);
        return { label: p.label, at };
      })
      .filter((p): p is { label: string; at: Date } => !!p);

    const nextPrayer = prayerList.find((p) => p.at.getTime() > now.getTime()) ?? prayerList[0] ?? null;
    const nextPrayerMinutes = nextPrayer ? Math.max(0, Math.floor((nextPrayer.at.getTime() - now.getTime()) / 60000)) : null;

    return { nextPrayer, nextPrayerMinutes };
  }, [prayerTimes.data?.data?.timings]);

  const smartNow = React.useMemo(() => {
    const hour = new Date().getHours();
    const periodLabel =
      hour < 5 ? "قبل الفجر" : hour < 12 ? "الصباح" : hour < 17 ? "بعد الظهر" : hour < 20 ? "المساء" : "الليل";

    const nextChecklist = DAILY_CHECKLIST_ITEMS.find((item) => !dailyChecklistToday[item.id]);
    let suggestedAction =
      nextChecklist?.title ??
      (isDailyWirdDone ? "حافظ على الاستمرارية وراجع نية الغد" : "أنهِ ورد اليوم قبل النوم");

    if (nextChecklist?.id === "fajr_on_time") {
      suggestedAction = prayerContext.nextPrayer?.label === "الفجر"
        ? "استعد لصلاة الفجر القادمة"
        : "ثبّت الصلوات القادمة في وقتها";
    }

    if (nextChecklist?.id === "five_prayers" && prayerContext.nextPrayer) {
      suggestedAction = `حافظ على ${prayerContext.nextPrayer.label} في وقتها`;
    }

    const actionRoute = !isDailyWirdDone
      ? "/quran"
      : nextChecklist
        ? routeForChecklistCategory(nextChecklist.category)
        : "/insights";

    const actionLabel = !isDailyWirdDone
      ? "اذهب إلى ورد القرآن"
      : nextChecklist
        ? "نفّذ المهمة التالية الآن"
        : "راجع تقدمك اليوم";

    const missedYesterday = DAILY_CHECKLIST_ITEMS.filter((item) => !dailyChecklistYesterday[item.id]).length;
    const todayActivity = Number(activity[todayKey] ?? 0);
    const streakRisk = hour >= 20 && todayActivity === 0;

    return { periodLabel, suggestedAction, missedYesterday, streakRisk, actionRoute, actionLabel };
  }, [activity, dailyChecklistToday, dailyChecklistYesterday, isDailyWirdDone, prayerContext.nextPrayer, todayKey]);

  const adaptiveMission = React.useMemo(() => {
    const nextPrayer = prayerContext.nextPrayer;
    const nextPrayerMinutes = prayerContext.nextPrayerMinutes;

    const debtToday = DAILY_CHECKLIST_ITEMS.filter((item) => !dailyChecklistToday[item.id]);
    const missedYesterdayItems = DAILY_CHECKLIST_ITEMS.filter((item) => !dailyChecklistYesterday[item.id]);

    const toMissionStep = (item: DailyChecklistItem): MissionStep | null => {
      const route = routeForChecklistCategory(item.category);
      const nearPrayerWindow = nextPrayerMinutes != null && nextPrayerMinutes <= 45;
      const basePriorityMap: Record<DailyChecklistItem["category"], number> = {
        salah: 1,
        quran: 2,
        dhikr: 3,
        sadaqah: 4,
        family: 5,
        akhlaq: 6
      };

      if (item.id === "fajr_on_time") {
        if (nextPrayer?.label !== "الفجر") return null;
        return {
          item,
          title: "استعد لصلاة الفجر القادمة",
          tip: "نوم مبكر + منبه + نية",
          route,
          priority: 0
        };
      }

      if (item.id === "five_prayers") {
        if (!nextPrayer) return null;
        return {
          item,
          title: `حافظ على ${nextPrayer.label} في وقتها`,
          tip: "تهيأ للصلاة قبل الأذان بدقائق",
          route,
          priority: nearPrayerWindow ? 0 : 1
        };
      }

      let title = item.title;
      let tip = rescueTipByCategory(item.category);
      let priority = basePriorityMap[item.category] ?? 10;

      if (nearPrayerWindow && item.category === "quran") {
        title = "ورد قرآن قصير قبل الصلاة القادمة";
        tip = "صفحة واحدة بتدبر تكفي";
        priority = 1;
      }

      if (smartNow.streakRisk && item.category === "dhikr") {
        title = "ذكر سريع لإنقاذ السلسلة";
        tip = "ابدأ بـ 30 ثانية الآن";
        priority = Math.min(priority, 2);
      }

      return { item, title, tip, route, priority };
    };

    const allMissionSteps = debtToday
      .map(toMissionStep)
      .filter((step): step is MissionStep => !!step)
      .sort((a, b) => a.priority - b.priority);

    const recoveryItem = allMissionSteps[0]?.item ?? null;
    const priorityCategories: DailyChecklistItem["category"][] = ["salah", "quran", "dhikr", "sadaqah", "family", "akhlaq"];
    const recoveryPlan = [...allMissionSteps]
      .sort((a, b) => {
        const catDiff = priorityCategories.indexOf(a.item.category) - priorityCategories.indexOf(b.item.category);
        if (catDiff !== 0) return catDiff;
        return a.priority - b.priority;
      })
      .slice(0, 3);

    const urgency =
      smartNow.streakRisk || debtToday.length >= 4
        ? "high"
        : debtToday.length >= 2 || (nextPrayerMinutes != null && nextPrayerMinutes <= 30)
          ? "medium"
          : "low";

    const urgencyLabel =
      urgency === "high"
        ? "أولوية عالية"
        : urgency === "medium"
          ? "أولوية متوسطة"
          : "أولوية هادئة";

    return {
      debtToday,
      missedYesterdayItems,
      recoveryItem,
      allMissionSteps,
      recoveryPlan,
      nextPrayer,
      nextPrayerMinutes,
      urgency,
      urgencyLabel
    };
  }, [dailyChecklistToday, dailyChecklistYesterday, prayerContext.nextPrayer, prayerContext.nextPrayerMinutes, smartNow.streakRisk]);

  const recoverOneTask = React.useCallback(() => {
    const item = adaptiveMission.recoveryItem;
    if (!item) {
      toast.success("لا توجد مهام متأخرة الآن");
      return;
    }
    toggleDailyChecklist(todayKey, item.id, true);
    toast.success(`تم إنجاز: ${item.title}`);
  }, [adaptiveMission.recoveryItem, todayKey, toggleDailyChecklist]);

  const openRecoveryTask = React.useCallback(
    (step: MissionStep) => {
      navigate(step.route);
    },
    [navigate]
  );

  const streakRescuePlan = React.useMemo(() => {
    if (!smartNow.streakRisk && adaptiveMission.urgency !== "high") return [] as MissionStep[];
    if (adaptiveMission.recoveryPlan.length > 0) return adaptiveMission.recoveryPlan.slice(0, 3);
    return adaptiveMission.allMissionSteps.slice(0, 3);
  }, [adaptiveMission.allMissionSteps, adaptiveMission.recoveryPlan, adaptiveMission.urgency, smartNow.streakRisk]);

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
          <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_.8fr] gap-4 items-start">
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

              <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap max-w-xl">
                <Button className="col-span-2 sm:col-span-1 micro-lift" onClick={() => onQuick("morning")}>ابدأ بأذكار الصباح</Button>
                <Button className="col-span-1 micro-lift" variant="secondary" onClick={() => { trackUxEvent("home_cta:quran"); navigate("/quran"); }}>المصحف</Button>
                {lastVisitedSection ? (
                  <Button className="col-span-1 micro-lift" variant="secondary" onClick={() => { trackUxEvent("home_cta:last_section"); navigate(`/c/${lastVisitedSection.id}`); }}>
                    تابع آخر قسم
                  </Button>
                ) : null}
                <Button className="col-span-2 sm:col-span-1 micro-lift" variant="secondary" onClick={onRandom}>
                  <Shuffle size={16} />
                  ذكر عشوائي
                </Button>
              </div>

              <div className="mt-4 md:hidden glass rounded-3xl p-3 border border-white/10 max-w-xl">
                <div className="flex items-center justify-between gap-2 mb-2 px-1">
                  <div className="text-xs opacity-70">تنقل ذكي</div>
                  <div className="text-[11px] opacity-55">
                    {mobileUxVariant === "A" ? "الأكثر استخدامًا أولاً" : "مختصر وسريع لك"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {mobileSmartNavItems.map((item) => (
                    <button
                      key={item.route}
                      onClick={() => onMobileSmartNavClick(item.route)}
                      className="micro-lift rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-white/10 active:bg-white/10 transition"
                    >
                      <span>{item.label}</span>
                      <item.icon size={14} className="opacity-85" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass rounded-3xl p-4 border border-white/10">
              <div className="text-xs opacity-60">لوحة ذكية اليوم</div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2">
                  <div className="text-[11px] opacity-60">نسبة الإتمام</div>
                  <div className="text-lg font-semibold tabular-nums">{analytics.completionPercent}%</div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2">
                  <div className="text-[11px] opacity-60">نشاط اليوم</div>
                  <div className="text-lg font-semibold tabular-nums">{analytics.today}</div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 col-span-2 md:col-span-1">
                  <div className="text-[11px] opacity-60">ورد اليوم</div>
                  <div className="text-lg font-semibold">{isDailyWirdDone ? "منجز" : "بانتظارك"}</div>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/6 overflow-hidden border border-white/10">
                <div className="h-full bg-[var(--accent)]/70" style={{ width: `${clamp(analytics.completionPercent, 0, 100)}%` }} />
              </div>
            </div>
          </div>
        </motion.div>
      </Card>

      <NightlyPlanStrip className="md:hidden" />

      <PrayerWidget />

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">الآن ماذا أفعل؟</div>
            <div className="text-xs opacity-65 mt-1">توجيه ذكي حسب وقت اليوم وتقدمك</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{smartNow.periodLabel}</Badge>
            <Badge>{adaptiveMission.urgencyLabel}</Badge>
          </div>
        </div>
        <div className="mt-3 glass rounded-3xl p-4 border border-white/10">
          <div className="text-sm font-semibold">{smartNow.suggestedAction}</div>
          <div className="mt-2 text-xs opacity-65">الهدف: خطوة واحدة عالية الأثر الآن بدل تعدد المهام.</div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-xs">
              <div className="opacity-60">دين اليوم</div>
              <div className="font-semibold mt-1">{adaptiveMission.debtToday.length} مهام</div>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-xs">
              <div className="opacity-60">استدراك أمس</div>
              <div className="font-semibold mt-1">{adaptiveMission.missedYesterdayItems.length} مهام</div>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-xs">
              <div className="opacity-60">الصلاة القادمة</div>
              <div className="font-semibold mt-1">
                {adaptiveMission.nextPrayer
                  ? `${adaptiveMission.nextPrayer.label}${
                      adaptiveMission.nextPrayerMinutes != null ? ` بعد ${adaptiveMission.nextPrayerMinutes} د` : ""
                    }`
                  : "—"}
              </div>
            </div>
          </div>
          {smartNow.missedYesterday > 0 ? (
            <div className="mt-2 text-xs opacity-75">
              لديك {smartNow.missedYesterday} مهمة لم تكتمل أمس — عوّض واحدة الآن لبناء الاستمرارية.
            </div>
          ) : null}
          {smartNow.streakRisk ? (
            <div className="mt-2 text-xs text-[var(--accent)]">
              تنبيه: لم تسجل أي نشاط اليوم حتى الآن، نفّذ ذكراً واحداً الآن للحفاظ على السلسلة.
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => navigate(smartNow.actionRoute)}>
              {smartNow.actionLabel}
            </Button>
            {adaptiveMission.recoveryItem ? (
              <Button size="sm" onClick={recoverOneTask}>
                استدرك الآن: {adaptiveMission.recoveryItem.title}
              </Button>
            ) : null}
          </div>
          {adaptiveMission.recoveryPlan.length > 0 ? (
            <div className="mt-3 rounded-2xl bg-white/5 border border-white/10 p-3">
              <div className="text-xs opacity-65 mb-2">خطة تعافٍ سريعة (3 خطوات)</div>
              <div className="flex flex-wrap gap-2">
                {adaptiveMission.recoveryPlan.map((step) => (
                  <Button
                    key={step.item.id}
                    size="sm"
                    variant="ghost"
                    onClick={() => openRecoveryTask(step)}
                  >
                    {step.title}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          {streakRescuePlan.length > 0 ? (
            <div className="mt-3 rounded-2xl bg-white/5 border border-white/10 p-3">
              <div className="text-xs opacity-65 mb-2">خطة إنقاذ السلسلة (دقيقتان)</div>
              <div className="space-y-2">
                {streakRescuePlan.map((step, idx) => (
                  <div key={`rescue-${step.item.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-2">
                    <div className="text-xs">
                      <span className="opacity-60 ml-1">{idx + 1}.</span>
                      <span className="font-semibold">{step.title}</span>
                      <span className="opacity-60 mr-2">{step.tip}</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => openRecoveryTask(step)}>
                      نفّذ
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="p-5">
        <div className="text-sm font-semibold">مراكز ذكية جديدة</div>
        <div className="text-xs opacity-65 mt-1">حوّل التطبيق من قائمة أذكار إلى نظام حياة يومي</div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/ramadan")}
            className="glass rounded-3xl p-4 border border-white/10 text-right hover:bg-white/10 transition"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">مركز قيادة رمضان</div>
              <MoonStar size={16} className="text-[var(--accent)]" />
            </div>
            <div className="mt-2 text-xs opacity-65">قائمة يومية + خطوة إيمانية + تحضير رمضان</div>
          </button>

          <button
            onClick={() => navigate("/leaderboard")}
            className="glass rounded-3xl p-4 border border-white/10 text-right hover:bg-white/10 transition"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">لوحة المتصدرين</div>
              <Trophy size={16} className="text-[var(--accent)]" />
            </div>
            <div className="mt-2 text-xs opacity-65">ترتيب مجهول + مزامنة سحابية اختيارية</div>
          </button>
        </div>
      </Card>

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

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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
                className="glass rounded-3xl p-4 text-right hover:bg-white/10 transition border border-white/10 select-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold arabic-text leading-7 break-words whitespace-normal">{it.label}</div>
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
                  <div className="text-[11px] opacity-60">انقر للعدّ</div>
                  <Badge>{done ? "تم" : `${100 - v} متبقّي`}</Badge>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">ورد اليوم</div>
            <div className="text-xs opacity-65 mt-1">مختارات يومية من القرآن</div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={copyDailyWird}
              disabled={!dailyWird}
              title="نسخ ورد اليوم"
            >
              <Copy size={16} />
              نسخ
            </Button>

            <Button
              variant={isDailyWirdDone ? "primary" : "secondary"}
              onClick={() => {
                if (isDailyWirdDone) return;
                setDailyWirdDone(todayKey, true);
                toast.success("تم حفظ الإتمام");
              }}
              title="تحديد كمنجز"
              disabled={isDailyWirdDone}
            >
              <CheckCircle2 size={16} />
              {isDailyWirdDone ? "منجز" : "تم"}
            </Button>
          </div>
        </div>

        {quran.isLoading ? (
          <div className="mt-4 text-sm opacity-65">... تحميل الورد</div>
        ) : quran.error || !dailyWird ? (
          <div className="mt-4 text-sm opacity-65 leading-7">
            تعذر تحميل ورد اليوم.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {dailyWird.items.map((p) => (
              <button
                key={`${p.surahId}:${p.ayahIndex}`}
                className="glass rounded-3xl p-4 text-right hover:bg-white/10 transition border border-white/10"
                onClick={() => navigate(`/quran/${p.surahId}?a=${p.ayahIndex}`)}
              >
                <div className="text-xs opacity-65 mb-2">
                  {p.surahName} • ({p.surahId}) • ﴿{p.ayahIndex}﴾
                </div>
                <div className={"arabic-text opacity-90 " + textClassByLength(p.text)}>
                  {p.text}
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">خطة الختمة</div>
            <div className="text-xs opacity-65 mt-1">قسّم القرآن تلقائياً حسب المدة</div>
          </div>

          {khatmaStartISO && khatmaDays ? (
            <Button
              variant="secondary"
              onClick={() => {
                resetKhatma();
                toast.success("تمت إعادة ضبط الخطة");
              }}
              title="إعادة ضبط الخطة"
            >
              إعادة ضبط
            </Button>
          ) : null}
        </div>

        {!khatmaStartISO || !khatmaDays ? (
          <div className="mt-4">
            <div className="text-sm opacity-80">اختر مدة الختمة:</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[7, 15, 30, 60].map((d) => (
                <Button
                  key={d}
                  variant="secondary"
                  onClick={() => {
                    setKhatmaPlan({ startISO: todayKey, days: d });
                    toast.success("تم بدء الخطة");
                  }}
                >
                  {d} يوم
                </Button>
              ))}
            </div>
            <div className="mt-3 text-xs opacity-65 leading-6">
              تُحسب حصة اليوم تلقائيًا من بداية المصحف حتى النهاية.
            </div>
          </div>
        ) : quran.isLoading ? (
          <div className="mt-4 text-sm opacity-65">... تحميل الخطة</div>
        ) : quran.error || !khatma ? (
          <div className="mt-4 text-sm opacity-65 leading-7">تعذر تحميل خطة الختمة.</div>
        ) : (
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>
                {khatma.isFinished ? "تمت الختمة" : `اليوم ${khatma.dayIndex + 1} من ${khatma.days}`}
              </Badge>
              <Badge>{`إنجاز: ${khatma.meta.doneCount}/${khatma.days} (${khatma.meta.percent}%)`}</Badge>
            </div>

            {!khatma.isFinished ? (
              <div className="mt-3 glass rounded-3xl p-4 border border-white/10">
                <div className="text-xs opacity-65">حصة اليوم</div>
                <div className="mt-2 text-sm leading-7">
                  من <span className="font-semibold">{khatma.today.first.surahName}</span> ﴿{khatma.today.first.ayahIndex}﴾
                  إلى <span className="font-semibold">{khatma.today.last.surahName}</span> ﴿{khatma.today.last.ayahIndex}﴾
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      navigate(`/quran/${khatma.today.first.surahId}?a=${khatma.today.first.ayahIndex}`)
                    }
                  >
                    ابدأ القراءة
                  </Button>
                  <Button
                    variant={khatma.meta.doneToday ? "primary" : "secondary"}
                    onClick={() => {
                      setKhatmaDone(todayKey, !khatma.meta.doneToday);
                      toast.success(khatma.meta.doneToday ? "تم إلغاء الإتمام" : "تم حفظ الإتمام");
                    }}
                  >
                    <CheckCircle2 size={16} />
                    {khatma.meta.doneToday ? "منجز اليوم" : "تمت قراءة اليوم"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 glass rounded-3xl p-4 border border-white/10">
                <div className="text-sm font-semibold">ما شاء الله — تمت الختمة</div>
                <div className="mt-2 text-xs opacity-65 leading-6">يمكنك بدء خطة جديدة من اليوم.</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[7, 15, 30, 60].map((d) => (
                    <Button
                      key={d}
                      variant="secondary"
                      onClick={() => {
                        setKhatmaPlan({ startISO: todayKey, days: d });
                        toast.success("تم بدء خطة جديدة");
                      }}
                    >
                      خطة {d} يوم
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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
            <div className="h-full bg-[var(--accent)]/70" style={{ width: `${clamp(analytics.completionPercent, 0, 100)}%` }} />
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs opacity-65 mb-2">أفضل الأقسام</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {analytics.topSections.slice(0, 3).map((s) => (
              <div key={s.id} className="glass rounded-3xl p-4 border border-white/10">
                <div className="text-xs opacity-65 truncate">{s.title}</div>
                <div className="mt-2 h-2 rounded-full bg-white/6 overflow-hidden border border-white/10">
                  <div className="h-full bg-[var(--accent)]/60" style={{ width: `${clamp(s.percent, 0, 100)}%` }} />
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
