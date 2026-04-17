import * as React from "react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Lottie from "lottie-react";
import {
  Sparkles,
  Shuffle,
  RotateCw,
  Copy,
  CheckCircle2,
  ChevronDown,
  MoreVertical,
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
import { pct, cn } from "@/lib/utils";
import { getSectionIdentity } from "@/lib/sectionIdentity";
import { trackUxEvent } from "@/lib/uxMetrics";
import { useQuranDB } from "@/data/useQuranDB";
import { coerceCount } from "@/data/types";
import { useTodayKey } from "@/hooks/useTodayKey";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { DAILY_CHECKLIST_ITEMS, BETTER_MUSLIM_DAILY_STEPS, type DailyChecklistItem } from "@/data/dailyGrowth";
import { DailyWisdomCard } from "@/components/ui/DailyWisdomCard";

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

const CHECKLIST_CATEGORY_ICON: Record<DailyChecklistItem["category"], string> = {
  salah:   "🕌",
  quran:   "📖",
  dhikr:   "📿",
  akhlaq:  "💛",
  family:  "🤝",
  sadaqah: "🌸",
};

function timeGreeting(hour: number): string {
  if (hour < 5)  return "ليلة طيبة";
  if (hour < 12) return "صباح الخير";
  if (hour < 17) return "نهارك طيب";
  if (hour < 20) return "مساء الخير";
  return "ليلة سعيدة";
}

function routeForChecklistCategory(category: DailyChecklistItem["category"]) {
  if (category === "quran") return "/quran";
  if (category === "dhikr") return "/c/morning";
  if (category === "salah") return "/insights";
  if (category === "sadaqah") return "/insights";
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

  const dailyBetterStepDone = useNoorStore((s) => s.dailyBetterStepDone);
  const setDailyBetterStepDone = useNoorStore((s) => s.setDailyBetterStepDone);
  const quranLastRead = useNoorStore((s) => s.quranLastRead);
  const quranReadingHistory = useNoorStore((s) => s.quranReadingHistory);
  const quranStreak = useNoorStore((s) => s.quranStreak);

  const sections = data?.db.sections ?? [];
  const [checklistExpanded, setChecklistExpanded] = React.useState<boolean | null>(null);

  const quranLastReadSurahName = React.useMemo(() => {
    if (!quranLastRead || !quran.data) return null;
    return quran.data.find((s) => s.id === quranLastRead.surahId)?.name ?? null;
  }, [quran.data, quranLastRead]);

  const quranReadingPct = React.useMemo(() => {
    if (!quran.data) return 0;
    const totalAyahs = quran.data.reduce((sum, s) => sum + s.ayahs.length, 0);
    if (!totalAyahs) return 0;
    const readAyahs = quran.data.reduce((sum, s) => {
      const reached = Math.min(s.ayahs.length, Math.max(0, Number(quranReadingHistory[String(s.id)] ?? 0)));
      return sum + reached;
    }, 0);
    return Math.round((readAyahs / totalAyahs) * 100);
  }, [quran.data, quranReadingHistory]);
  const [confirmTasbeehReset, setConfirmTasbeehReset] = React.useState(false);
  const todayKey = useTodayKey();
  const dailyChecklistToday = useNoorStore((s) => s.dailyChecklist[todayKey] ?? {});
  const yesterdayKey = React.useMemo(() => shiftISO(todayKey, -1), [todayKey]);
  const dailyChecklistYesterday = useNoorStore((s) => s.dailyChecklist[yesterdayKey] ?? {});
  const toggleDailyChecklist = useNoorStore((s) => s.toggleDailyChecklist);
  const prayerTimes = usePrayerTimes();

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

  const wirdStreak = React.useMemo(() => {
    let streak = isDailyWirdDone ? 1 : 0;
    const today = new Date();
    const startOffset = isDailyWirdDone ? 1 : 0;
    for (let i = startOffset; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      if (dailyWirdDone[k]) streak++;
      else break;
    }
    return streak;
  }, [dailyWirdDone, isDailyWirdDone, todayKey]);

  const copyDailyWird = async () => {
    if (!dailyWird) return;
    try {
      await navigator.clipboard.writeText(dailyWird.copyText);
      toast.success("تم النسخ");
    } catch {
      toast.error("تعذر النسخ");
    }
  };

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

  const quickTotal = React.useMemo(() => {
    const target = 100;
    const done = QUICK_TASBEEH.reduce((acc, it) => acc + Math.min(target, quickTasbeeh[it.key] ?? 0), 0);
    const total = QUICK_TASBEEH.length * target;
    const percent = pct(done, total);
    return { done, total, percent };
  }, [quickTasbeeh]);

  const streak = React.useMemo(() => {
    const set = new Set(Object.keys(activity).filter((k) => (activity[k] ?? 0) > 0));
    let s = 0;
    const today = new Date();
    for (let i = 0; i < 3650; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (set.has(k)) s++;
      else break;
    }
    return s;
  }, [activity]);

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

  if (isLoading) {
    return (
      <div className="space-y-4 page-enter">
        <div className="glass-strong rounded-3xl p-5 space-y-4">
          <div className="skeleton h-8 w-3/4 rounded-xl" />
          <div className="skeleton h-4 w-1/2 rounded-lg" />
          <div className="flex gap-2">
            <div className="skeleton h-10 w-28 rounded-2xl" />
            <div className="skeleton h-10 w-20 rounded-2xl" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-3xl p-4 border border-white/10"><div className="skeleton h-3 w-12 rounded-lg" /><div className="skeleton h-6 w-8 rounded-xl mt-2" /></div>
          <div className="glass rounded-3xl p-4 border border-white/10"><div className="skeleton h-3 w-12 rounded-lg" /><div className="skeleton h-6 w-8 rounded-xl mt-2" /></div>
          <div className="glass rounded-3xl p-4 border border-white/10"><div className="skeleton h-3 w-12 rounded-lg" /><div className="skeleton h-6 w-8 rounded-xl mt-2" /></div>
        </div>
      </div>
    );
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

  return (
    <div className="space-y-3 page-enter">
      <Card className="p-5 overflow-hidden relative">
        <div className="absolute -top-10 -left-8 opacity-80">
          <div className="w-32 h-32">
            <Lottie animationData={pulse} loop />
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          <div>
            <div>
              <div className="mb-2 flex items-center gap-2 flex-wrap">
                <Sparkles size={14} className="text-[var(--accent)]" />
                <span className="text-xs font-medium opacity-65">{timeGreeting(new Date().getHours())}</span>
                {streak > 0 && (
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full glass border border-white/15 streak-fire ${streak >= 30 ? "text-orange-400" : streak >= 7 ? "text-yellow-400" : "text-[var(--accent)]"}`}>
                    {streak >= 30 ? "🔥" : streak >= 7 ? "⚡" : "✨"} {streak} يوم متواصل
                  </span>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-semibold leading-tight">
                أثر — اترك <span className="text-[var(--accent)]">أثراً</span> طيباً
              </h1>
              <div className="mt-2 text-sm opacity-70 leading-6 max-w-2xl">
                {"{وَقُلْ رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا}"}
              </div>

              <div className="mt-4 flex flex-wrap gap-2 max-w-xl">
                <Button className="press-effect" onClick={() => onQuick("morning")}>ابدأ بأذكار الصباح</Button>
                {quranLastRead ? (
                  <Button className="press-effect" variant="secondary" onClick={() => { trackUxEvent("home_cta:continue_quran"); navigate(`/quran/${quranLastRead.surahId}?a=${quranLastRead.ayahIndex}`); }}>
                    📖 {quranLastReadSurahName ? `تابع ${quranLastReadSurahName}` : "تابع القرآن"}
                  </Button>
                ) : (
                  <Button className="press-effect" variant="secondary" onClick={() => { trackUxEvent("home_cta:quran"); navigate("/quran"); }}>المصحف</Button>
                )}
                {lastVisitedSection ? (
                  <Button className="press-effect" variant="secondary" onClick={() => { trackUxEvent("home_cta:last_section"); navigate(`/c/${lastVisitedSection.id}`); }}>
                    تابع آخر قسم
                  </Button>
                ) : null}
                <button
                  type="button"
                  onClick={onRandom}
                  aria-label="ذكر عشوائي"
                  title="ذكر عشوائي"
                  className="press-effect inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/12 active:scale-[.97] transition shrink-0"
                >
                  <Shuffle size={16} />
                </button>
              </div>

              {/* Quran reading progress micro-bar */}
              {quranReadingPct > 0 && (
                <button
                  onClick={() => navigate(quranLastRead ? `/quran/${quranLastRead.surahId}?a=${quranLastRead.ayahIndex}` : "/quran")}
                  className="mt-3 flex items-center gap-2.5 group"
                  aria-label={`القرآن: ${quranReadingPct}% مقروء`}
                >
                  <span className="text-xs opacity-60">📖</span>
                  <div className="w-28 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${quranReadingPct}%`, background: "var(--accent)" }}
                    />
                  </div>
                  <span className="text-xs opacity-55 tabular-nums group-hover:opacity-80 transition-opacity">
                    {quranReadingPct}%
                  </span>
                  {quranStreak > 0 && (
                    <span className="flex items-center gap-0.5 text-[11px] tabular-nums" style={{ color: "#fb923c" }}>
                      🔥 {quranStreak}
                    </span>
                  )}
                  {quranLastRead && quranLastReadSurahName && (
                    <span className="text-[10px] opacity-40 arabic-text truncate max-w-[70px]">{quranLastReadSurahName}</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </Card>

      {/* ── Sections quick-access strip ── */}
      {sections.length > 0 && (
        <div className="overflow-x-auto no-scrollbar -mx-0.5 px-0.5">
          <div className="flex gap-2 pb-0.5" style={{ width: "max-content" }}>
            {sections.map((section, idx) => {
              const identity = getSectionIdentity(section.id);
              let done = 0;
              const total = section.content.length;
              section.content.forEach((item, i) => {
                const need = coerceCount(item.count);
                const have = Math.min(need, Math.max(0, Number(progressMap[`${section.id}:${i}`]) || 0));
                if (have >= need) done++;
              });
              const isComplete = total > 0 && done === total;
              const pctDone = total > 0 ? Math.round((done / total) * 100) : 0;

              return (
                <button
                  key={section.id}
                  onClick={() => { trackUxEvent(`home_strip:${section.id}`); navigate(`/c/${section.id}`); }}
                  className="press-effect flex-none flex flex-col items-center gap-1 px-3.5 py-2.5 rounded-2xl glass border min-w-[60px] select-none active:scale-[.91] transition-all"
                  style={{
                    borderColor: isComplete
                      ? "color-mix(in srgb, var(--ok) 30%, transparent)"
                      : pctDone > 0
                        ? `${identity.accent}40`
                        : "rgba(255,255,255,0.08)",
                  }}
                >
                  <span className="text-[22px] leading-none">{identity.icon}</span>
                  <span className="text-[10px] font-medium opacity-60 leading-none mt-0.5">{identity.badge}</span>
                  <div className="w-full h-[3px] rounded-full bg-white/10 overflow-hidden mt-1">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${pctDone}%`,
                        background: isComplete ? "var(--ok)" : identity.accent,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <PrayerWidget />
      <DailyWisdomCard />

      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold opacity-55">الآن ماذا أفعل؟</span>
              <Badge>{smartNow.periodLabel}</Badge>
              {adaptiveMission.urgency === "high" && <Badge>{adaptiveMission.urgencyLabel}</Badge>}
              {adaptiveMission.urgency !== "high" && adaptiveMission.debtToday.length > 0 && (
                <Badge>{adaptiveMission.debtToday.length} متبقية</Badge>
              )}
            </div>
            <div className="mt-2 text-[15px] font-bold leading-snug">
              {smartNow.suggestedAction}
            </div>
          </div>
          <Dropdown.Root modal={false}>
            <Dropdown.Trigger asChild>
              <button
                type="button"
                className="shrink-0 w-11 h-11 rounded-xl bg-white/6 border border-white/10 grid place-items-center transition active:scale-90 mt-0.5"
                aria-label="خيارات إضافية"
                title="خيارات إضافية"
              >
                <MoreVertical size={16} />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Portal>
              <Dropdown.Content
                align="start"
                sideOffset={8}
                style={{ zIndex: 100000 }}
                className="glass-strong rounded-3xl min-w-[240px] border border-white/15 p-2 shadow-2xl"
              >
                <Dropdown.Label className="px-3 pt-2 text-[11px] font-semibold opacity-45">ملخص سريع</Dropdown.Label>
                <div className="px-3 pb-2 pt-1 text-[11px] opacity-60 leading-5">
                  أنجزت {DAILY_CHECKLIST_ITEMS.length - adaptiveMission.debtToday.length} من {DAILY_CHECKLIST_ITEMS.length} اليوم
                  {smartNow.missedYesterday > 0 ? ` • فاتك ${smartNow.missedYesterday} أمس` : ""}
                </div>
                <Dropdown.Separator className="my-1 h-px bg-white/10" />
                {adaptiveMission.recoveryItem ? (
                  <HomeQuickMenuAction
                    label="استدرك المهمة الأقرب"
                    hint={adaptiveMission.recoveryItem.title}
                    onSelect={recoverOneTask}
                  />
                ) : null}
                <HomeQuickMenuAction
                  label="راجع التقدم اليومي"
                  hint="الإحصاءات وقائمة اليوم"
                  onSelect={() => navigate("/insights")}
                />
                <HomeQuickMenuAction
                  label="خطة الختمة"
                  hint="أصبحت داخل صفحة المصحف"
                  onSelect={() => navigate("/quran")}
                />
              </Dropdown.Content>
            </Dropdown.Portal>
          </Dropdown.Root>
        </div>

        <Button className="mt-3 w-full press-effect" onClick={() => navigate(smartNow.actionRoute)}>
          {smartNow.actionLabel}
        </Button>
      </Card>

      {/* Bottom: Daily Checklist */}
      <Card className="p-5">
        {(() => {
          const allChecklistDone = DAILY_CHECKLIST_ITEMS.every((item) => !!dailyChecklistToday[item.id]);
          const showItems = checklistExpanded !== null ? checklistExpanded : !allChecklistDone;
          return (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">قائمة المهام اليومية</div>
                  <div className="text-xs opacity-65 mt-1">تتبّع عاداتك اليومية</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{`${DAILY_CHECKLIST_ITEMS.length - adaptiveMission.debtToday.length}/${DAILY_CHECKLIST_ITEMS.length}`}</Badge>
                  <button
                    type="button"
                    onClick={() => setChecklistExpanded((v) => (v === null ? (allChecklistDone ? true : false) : !v))}
                    className="w-8 h-8 rounded-xl bg-white/6 border border-white/10 grid place-items-center transition active:scale-90"
                    aria-label={showItems ? "طي" : "عرض"}
                  >
                    <ChevronDown size={14} className={cn("transition-transform duration-200", showItems && "rotate-180")} />
                  </button>
                </div>
              </div>
              {/* Progress bar */}
              {DAILY_CHECKLIST_ITEMS.length > 0 && (
                <div className="mt-2.5 h-1 rounded-full bg-white/8 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${Math.round(((DAILY_CHECKLIST_ITEMS.length - adaptiveMission.debtToday.length) / DAILY_CHECKLIST_ITEMS.length) * 100)}%`,
                      background: adaptiveMission.debtToday.length === 0 ? "var(--ok)" : "var(--accent)",
                    }}
                  />
                </div>
              )}
              {allChecklistDone && (
                <div className="mt-3 rounded-2xl bg-[var(--ok)]/10 border border-[var(--ok)]/20 px-4 py-3 text-sm font-semibold text-center" style={{ color: "var(--ok)" }}>
                  أحسنت — اكتملت قائمة اليوم ✅
                </div>
              )}
              {showItems && (
                <div className="mt-3 space-y-2">
                  {DAILY_CHECKLIST_ITEMS.map((item) => {
                    const isDone = !!dailyChecklistToday[item.id];
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleDailyChecklist(todayKey, item.id, !isDone)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-2xl px-3.5 py-3.5 min-h-[48px] border transition-all active:scale-[.97]",
                          isDone
                            ? "bg-white/8 border-white/12 opacity-70"
                            : "bg-white/4 border-white/8 hover:bg-white/6"
                        )}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-full border-2 grid place-items-center transition-all shrink-0 text-[13px]",
                          isDone
                            ? "border-[var(--ok)] bg-[var(--ok)]/20"
                            : "border-white/20"
                        )}>
                          {isDone ? <CheckCircle2 size={15} className="text-[var(--ok)]" /> : CHECKLIST_CATEGORY_ICON[item.category]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn("text-sm", isDone && "line-through opacity-60")}>{item.title}</div>
                          {!isDone && <div className="text-[11px] opacity-45 mt-0.5 leading-4">{item.subtitle}</div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
      </Card>

      {/* ── خطوة اليوم ── */}
      {(() => {
        const dayIndex = Math.floor(Date.now() / 86400000);
        const step = BETTER_MUSLIM_DAILY_STEPS[dayIndex % BETTER_MUSLIM_DAILY_STEPS.length] ?? "";
        const isStepDone = !!dailyBetterStepDone[todayKey];
        return (
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">خطوة اليوم</div>
                <div className="text-xs opacity-55 mt-1">عادة يومية للنمو الإيماني</div>
              </div>
              <Button
                variant={isStepDone ? "primary" : "secondary"}
                onClick={() => {
                  setDailyBetterStepDone(todayKey, !isStepDone);
                  if (!isStepDone) toast.success("أحسنت — تم تسجيل الخطوة");
                }}
              >
                <CheckCircle2 size={16} />
                {isStepDone ? "تم" : "أتممتها"}
              </Button>
            </div>
            <div className={cn(
              "mt-3 rounded-2xl px-4 py-3.5 border text-sm leading-7",
              isStepDone
                ? "bg-[var(--ok)]/8 border-[var(--ok)]/20 opacity-70 line-through"
                : "bg-[var(--accent)]/8 border-[var(--accent)]/20"
            )}>
              {step}
            </div>
          </Card>
        );
      })()}

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">مختارات اليوم</div>
          <div className="flex items-center gap-2">
            <Badge>{`${quickTotal.done}/${quickTotal.total}`}</Badge>
            {confirmTasbeehReset ? (
              <>
                <Button size="sm" variant="danger" onClick={() => { resetAllQuickTasbeeh(); toast.success("تم تصفير التسابيح"); setConfirmTasbeehReset(false); }}>تأكيد</Button>
                <Button size="sm" variant="secondary" onClick={() => setConfirmTasbeehReset(false)}>إلغاء</Button>
              </>
            ) : (
              <IconButton
                aria-label="تصفير التسابيح"
                onClick={() => setConfirmTasbeehReset(true)}
              >
                <RotateCw size={16} />
              </IconButton>
            )}
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-white/6 overflow-hidden border border-white/10">
          <div className="h-full progress-accent" style={{ width: `${quickTotal.percent}%` }} />
        </div>

        {quickTotal.percent >= 100 && (
          <div className="mt-3 rounded-2xl border border-[var(--ok)]/30 bg-[var(--ok)]/10 px-4 py-3 flex items-center gap-2">
            <span>✅</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold" style={{ color: "var(--ok)" }}>تمت التسابيح</div>
              <div className="text-[11px] opacity-60 mt-0.5">400/400 — بارك الله فيك</div>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
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
                className="glass rounded-3xl p-4 text-right transition border border-white/10 select-none press-effect glass-hover"
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
                          className="progress-ring-circle"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="text-xs opacity-70">انقر للعدّ</div>
                  <Badge>{done ? "تم" : `${100 - v} متبقّي`}</Badge>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className={`p-5 transition-colors ${isDailyWirdDone ? "border border-[var(--ok)]/25" : ""}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold">ورد اليوم</div>
              {wirdStreak > 1 && (
                <span className="text-[10px] tabular-nums font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(251,146,60,0.15)", color: "#fb923c" }}>
                  🔥 {wirdStreak}
                </span>
              )}
            </div>
            <div className="text-xs opacity-65 mt-1">
              {dailyWird ? `آيات ${dailyWird.meta.from}–${dailyWird.meta.to} من ${dailyWird.meta.total}` : "مختارات يومية من القرآن"}
            </div>
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
                className="glass rounded-3xl p-4 text-right transition border border-white/10 press-effect glass-hover"
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

    </div>
  );
}

function HomeQuickMenuAction(props: { label: string; hint?: string; onSelect: () => void }) {
  return (
    <Dropdown.Item
      onSelect={() => props.onSelect()}
      className="rounded-2xl px-3 py-2.5 outline-none transition cursor-pointer data-[highlighted]:bg-white/10"
    >
      <div className="text-sm font-medium">{props.label}</div>
      {props.hint ? <div className="mt-0.5 text-[11px] opacity-55 leading-5">{props.hint}</div> : null}
    </Dropdown.Item>
  );
}

