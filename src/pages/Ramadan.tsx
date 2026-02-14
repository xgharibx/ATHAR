import * as React from "react";
import { MoonStar, CheckCircle2, Sparkles, Plus, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { NightlyPlanStrip } from "@/components/layout/NightlyPlanStrip";
import { useNoorStore } from "@/store/noorStore";
import { useTodayKey } from "@/hooks/useTodayKey";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { DAILY_CHECKLIST_ITEMS, BETTER_MUSLIM_DAILY_STEPS, LAST_TEN_NIGHTS_GOALS, RAMADAN_FEATURE_BLOCKS } from "@/data/dailyGrowth";
import { clamp } from "@/lib/utils";

const RAMADAN_START = "2026-02-18";

function parseISO(dateISO: string) {
  const m = dateISO.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysDiff(a: Date, b: Date) {
  const ms = 24 * 60 * 60 * 1000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcB - utcA) / ms);
}

type QadaaCounts = {
  prayer: number;
  adhkar: number;
  quran: number;
  total: number;
};

type BestAction = {
  title: string;
  reason: string;
  cta: string;
  route: string;
};

function pickBestAction(stage: string, qadaa: QadaaCounts): BestAction {
  if (qadaa.total === 0) {
    return {
      title: "حافظ على الثبات الليلة",
      reason: "لا يوجد عليك قضاء الآن، ركّز على الاستمرارية.",
      cta: "اذهب إلى القرآن",
      route: "/quran"
    };
  }

  if (stage === "5") {
    return {
      title: "أولوية اللحظة: تثبيت الصلاة القادمة",
      reason: "الوقت ضيق جدًا قبل الفجر؛ ابدأ بالأعلى أثرًا الآن.",
      cta: "فتح مركز القضاء",
      route: "/missed"
    };
  }

  if (stage === "10") {
    if (qadaa.quran >= qadaa.adhkar) {
      return {
        title: "أفضل إجراء الآن: صفحة قرآن قصيرة",
        reason: "وضع 10 دقائق مناسب لتعويض ورد مختصر سريع.",
        cta: "الذهاب إلى القرآن",
        route: "/quran"
      };
    }
    return {
      title: "أفضل إجراء الآن: أذكار تعويضية",
      reason: "وضع 10 دقائق مناسب لأذكار مركزة مع استغفار.",
      cta: "الذهاب إلى الأذكار",
      route: "/c/morning"
    };
  }

  if (stage === "15") {
    if (qadaa.prayer > 0) {
      return {
        title: "أفضل إجراء الآن: تجهيز الصلاة التالية",
        reason: "وضع 15 دقيقة يفضّل البدء بقضاء الصلاة ثم القرآن.",
        cta: "فتح مركز القضاء",
        route: "/missed"
      };
    }
    return {
      title: "أفضل إجراء الآن: قرآن ثم أذكار",
      reason: "الوقت كافٍ لتعويض متوازن قبل الفجر.",
      cta: "الذهاب إلى القرآن",
      route: "/quran"
    };
  }

  if (qadaa.prayer >= qadaa.quran && qadaa.prayer >= qadaa.adhkar) {
    return {
      title: "أفضل إجراء الآن: معالجة قضاء الصلاة",
      reason: "قضاء الصلاة هو الأعلى في المتبقي الحالي.",
      cta: "فتح مركز القضاء",
      route: "/missed"
    };
  }

  if (qadaa.quran >= qadaa.adhkar) {
    return {
      title: "أفضل إجراء الآن: تعويض القرآن",
      reason: "قضاء القرآن هو الأعلى الآن؛ ابدأ بصفحة واحدة.",
      cta: "الذهاب إلى القرآن",
      route: "/quran"
    };
  }

  return {
    title: "أفضل إجراء الآن: تعويض الأذكار",
    reason: "قضاء الأذكار هو الأعلى الآن؛ نفّذ جلسة مركزة قصيرة.",
    cta: "الذهاب إلى الأذكار",
    route: "/c/morning"
  };
}

export function RamadanPage() {
  const navigate = useNavigate();
  const prayerTimes = usePrayerTimes();
  const todayKey = useTodayKey();
  const checklist = useNoorStore((s) => s.dailyChecklist[todayKey] ?? {});
  const dailyChecklist = useNoorStore((s) => s.dailyChecklist);
  const toggleChecklist = useNoorStore((s) => s.toggleDailyChecklist);
  const missedRecoveryDone = useNoorStore((s) => s.missedRecoveryDone);
  const missedTrackingStartISO = useNoorStore((s) => s.missedTrackingStartISO);
  const setMissedRecoveryDone = useNoorStore((s) => s.setMissedRecoveryDone);
  const betterDone = useNoorStore((s) => !!s.dailyBetterStepDone[todayKey]);
  const setBetterDone = useNoorStore((s) => s.setDailyBetterStepDone);
  const routine = useNoorStore(
    (s) =>
      s.ramadanRoutineByDay[todayKey] ?? {
        suhoor: false,
        niyyah: false,
        fastCompleted: false,
        iftarDua: false,
        qiyam: false,
        taraweehUnits: 0
      }
  );
  const setRamadanRoutine = useNoorStore((s) => s.setRamadanRoutine);
  const nightGoals = useNoorStore((s) => s.lastTenNightGoals[todayKey] ?? {});
  const toggleLastTenNightGoal = useNoorStore((s) => s.toggleLastTenNightGoal);
  const [stageReminderDismissed, setStageReminderDismissed] = React.useState(false);
  const [lastExecutionSummary, setLastExecutionSummary] = React.useState<{
    title: string;
    remaining: number;
    at: string;
    previousPriority: string;
    nextPriority: string;
    nextRoute: string;
  } | null>(null);
  const [nightlyExecutionCount, setNightlyExecutionCount] = React.useState(0);

  const start = parseISO(RAMADAN_START);
  const today = parseISO(todayKey);

  const daysToRamadan = React.useMemo(() => {
    if (!start || !today) return 0;
    return daysDiff(today, start);
  }, [start, today]);

  const doneCount = DAILY_CHECKLIST_ITEMS.reduce((acc, item) => acc + (checklist[item.id] ? 1 : 0), 0);
  const total = DAILY_CHECKLIST_ITEMS.length;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;

  const daySeed = React.useMemo(() => {
    if (!today) return 0;
    const ref = new Date(2026, 0, 1);
    return Math.max(0, daysDiff(ref, today));
  }, [today]);

  const dailyStep = BETTER_MUSLIM_DAILY_STEPS[daySeed % BETTER_MUSLIM_DAILY_STEPS.length] ?? BETTER_MUSLIM_DAILY_STEPS[0];
  const ramadanDay = start && today ? daysDiff(start, today) + 1 : 0;
  const inLastTenNights = ramadanDay >= 20 && ramadanDay <= 30;

  const routineDoneCount = [
    routine.suhoor,
    routine.niyyah,
    routine.fastCompleted,
    routine.iftarDua,
    routine.qiyam
  ].filter(Boolean).length;

  const qadaaSnapshot = React.useMemo(() => {
    const startISO = missedTrackingStartISO ?? todayKey;
    const targetIds = ["fajr_on_time", "five_prayers", "morning_evening", "quran_reading"] as const;

    let prayer = 0;
    let adhkar = 0;
    let quran = 0;

    const now = new Date();
    for (let i = 1; i <= 30; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const day = `${yyyy}-${mm}-${dd}`;
      if (day < startISO) continue;

      const row = dailyChecklist[day] ?? {};
      for (const itemId of targetIds) {
        if (row[itemId] || missedRecoveryDone[`${day}:${itemId}`]) continue;
        if (itemId === "quran_reading") quran += 1;
        else if (itemId === "morning_evening") adhkar += 1;
        else prayer += 1;
      }
    }

    return { prayer, adhkar, quran, total: prayer + adhkar + quran };
  }, [dailyChecklist, missedRecoveryDone, missedTrackingStartISO, todayKey]);

  const preFajrPlan = React.useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const isNightWindow = hour >= 20 || hour < 5;

    const fajrRaw = prayerTimes.data?.data?.timings?.Fajr;
    let minsToFajr: number | null = null;

    if (fajrRaw) {
      const clean = String(fajrRaw).trim().split(" ")[0] ?? "";
      const [hh, mm] = clean.split(":").map((x) => Number.parseInt(x, 10));
      if (Number.isFinite(hh) && Number.isFinite(mm)) {
        const fajr = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
        if (fajr.getTime() <= now.getTime()) {
          fajr.setDate(fajr.getDate() + 1);
        }
        minsToFajr = Math.max(0, Math.floor((fajr.getTime() - now.getTime()) / 60000));
      }
    }

    const steps: string[] = [];
    if (qadaaSnapshot.prayer > 0) steps.push("نقطة صلاة: ثبّت الصلاة القادمة في وقتها مع نية قضاء ما فات.");
    if (qadaaSnapshot.quran > 0) steps.push("نقطة قرآن: صفحة واحدة الآن بنية قضاء الورد.");
    if (qadaaSnapshot.adhkar > 0) steps.push("نقطة أذكار: أذكار تعويضية مختصرة + استغفار.");

    const stage =
      minsToFajr == null
        ? "normal"
        : minsToFajr <= 5
          ? "5"
          : minsToFajr <= 10
            ? "10"
            : minsToFajr <= 15
              ? "15"
              : "normal";

    const stageLabel =
      stage === "5"
        ? "وضع 5 دقائق"
        : stage === "10"
          ? "وضع 10 دقائق"
          : stage === "15"
            ? "وضع 15 دقيقة"
            : "وضع متدرج";

    const stagePlan =
      stage === "5"
        ? [
            "نية فورية + استغفار مركز.",
            "أذكار قصيرة أساسية الآن.",
            "التهيؤ الفوري للفجر."
          ]
        : stage === "10"
          ? [
              "قضاء ذكر قصير (50-100 استغفار).",
              "قراءة مقطع قرآن مختصر.",
              "الاستعداد العملي للفجر."
            ]
          : stage === "15"
            ? [
                "مهمة صلاة/نية أولًا.",
                "صفحة قرآن أو ما تيسر.",
                "أذكار ختام قبل الفجر."
              ]
            : [
                "ابدأ بالأعلى أثرًا من عناصر القضاء.",
                "نفّذ عنصرين على الأقل قبل النوم.",
                "احجز وقتًا واضحًا لما قبل الفجر."
              ];

    return {
      isNightWindow,
      minsToFajr,
      steps: steps.slice(0, 3),
      stage,
      stageLabel,
      stagePlan
    };
  }, [prayerTimes.data?.data?.timings?.Fajr, qadaaSnapshot.adhkar, qadaaSnapshot.prayer, qadaaSnapshot.quran]);

  const stageReminderKey = React.useMemo(
    () => `noor_ramadan_stage_reminder:${todayKey}:${preFajrPlan.stage}`,
    [todayKey, preFajrPlan.stage]
  );
  const nightlyImpactKey = React.useMemo(() => `noor_ramadan_nightly_impact:${todayKey}`, [todayKey]);

  const lastStageRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    try {
      const seen = sessionStorage.getItem(stageReminderKey) === "1";
      setStageReminderDismissed(seen);
    } catch {
      setStageReminderDismissed(false);
    }
  }, [stageReminderKey]);

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(nightlyImpactKey);
      const parsed = raw ? Number.parseInt(raw, 10) : 0;
      setNightlyExecutionCount(Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
    } catch {
      setNightlyExecutionCount(0);
    }
  }, [nightlyImpactKey]);

  React.useEffect(() => {
    const currentStage = preFajrPlan.stage;
    const previousStage = lastStageRef.current;
    lastStageRef.current = currentStage;

    if (!preFajrPlan.isNightWindow) return;
    if (stageReminderDismissed) return;
    if (currentStage !== "15" && currentStage !== "10" && currentStage !== "5") return;
    if (!previousStage || previousStage === currentStage) return;

    toast(`تم الانتقال إلى ${preFajrPlan.stageLabel} — نفّذ خطوة الآن`, {
      icon: "⏳",
      duration: 3500
    });
  }, [preFajrPlan.isNightWindow, preFajrPlan.stage, preFajrPlan.stageLabel, stageReminderDismissed]);

  const pendingQadaaItems = React.useMemo(() => {
    const startISO = missedTrackingStartISO ?? todayKey;
    const targetItems = [
      { id: "five_prayers", kind: "prayer" as const, title: "قضاء الصلاة" },
      { id: "morning_evening", kind: "adhkar" as const, title: "قضاء الأذكار" },
      { id: "quran_reading", kind: "quran" as const, title: "قضاء القرآن" },
      { id: "fajr_on_time", kind: "prayer" as const, title: "تثبيت الفجر القادم" }
    ];

    const out: Array<{ key: string; kind: "prayer" | "adhkar" | "quran"; title: string }> = [];
    const now = new Date();
    for (let i = 1; i <= 30; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const day = `${yyyy}-${mm}-${dd}`;
      if (day < startISO) continue;

      const row = dailyChecklist[day] ?? {};
      for (const item of targetItems) {
        const key = `${day}:${item.id}`;
        if (!row[item.id] && !missedRecoveryDone[key]) {
          out.push({ key, kind: item.kind, title: item.title });
        }
      }
    }
    return out;
  }, [dailyChecklist, missedRecoveryDone, missedTrackingStartISO, todayKey]);

  const bestActionNow = React.useMemo(
    () => pickBestAction(preFajrPlan.stage, qadaaSnapshot),
    [preFajrPlan.stage, qadaaSnapshot]
  );

  const executePreFajrStep = React.useCallback(() => {
    const priorityByStage: Record<string, Array<"prayer" | "quran" | "adhkar">> = {
      "5": ["prayer", "adhkar", "quran"],
      "10": ["quran", "adhkar", "prayer"],
      "15": ["prayer", "quran", "adhkar"],
      normal: ["prayer", "quran", "adhkar"]
    };

    const order = priorityByStage[preFajrPlan.stage] ?? priorityByStage.normal;

    const next =
      order
        .map((kind) => pendingQadaaItems.find((item) => item.kind === kind))
        .find(Boolean) ?? null;

    if (!next) {
      toast.success("لا يوجد قضاء معلّق لهذه المرحلة");
      return;
    }

    setMissedRecoveryDone(next.key, true);

    if (next.kind === "prayer") {
      setRamadanRoutine(todayKey, { niyyah: true });
    }

    try {
      sessionStorage.setItem(stageReminderKey, "1");
    } catch {
      // ignore session storage errors
    }
    setStageReminderDismissed(true);

    const nextNightCount = nightlyExecutionCount + 1;
    setNightlyExecutionCount(nextNightCount);
    try {
      sessionStorage.setItem(nightlyImpactKey, String(nextNightCount));
    } catch {
      // ignore session storage errors
    }

    const before = qadaaSnapshot;
    const after: QadaaCounts = {
      prayer: Math.max(0, before.prayer - (next.kind === "prayer" ? 1 : 0)),
      adhkar: Math.max(0, before.adhkar - (next.kind === "adhkar" ? 1 : 0)),
      quran: Math.max(0, before.quran - (next.kind === "quran" ? 1 : 0)),
      total: Math.max(0, before.total - 1)
    };
    const beforePriority = pickBestAction(preFajrPlan.stage, before).title;
    const afterDecision = pickBestAction(preFajrPlan.stage, after);
    const afterPriority = afterDecision.title;

    setLastExecutionSummary({
      title: next.title,
      remaining: after.total,
      at: new Date().toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }),
      previousPriority: beforePriority,
      nextPriority: afterPriority,
      nextRoute: afterDecision.route
    });

    toast.success(`تم تسجيل خطوة: ${next.title}`);
  }, [nightlyExecutionCount, nightlyImpactKey, pendingQadaaItems, preFajrPlan.stage, qadaaSnapshot, setMissedRecoveryDone, setRamadanRoutine, stageReminderKey, todayKey]);

  const executeNightSequence = React.useCallback(() => {
    const priorityByStage: Record<string, Array<"prayer" | "quran" | "adhkar">> = {
      "5": ["prayer", "adhkar", "quran"],
      "10": ["quran", "adhkar", "prayer"],
      "15": ["prayer", "quran", "adhkar"],
      normal: ["prayer", "quran", "adhkar"]
    };

    const order = priorityByStage[preFajrPlan.stage] ?? priorityByStage.normal;
    const selected: Array<{ key: string; kind: "prayer" | "adhkar" | "quran"; title: string }> = [];
    const seenKeys = new Set<string>();

    for (const kind of order) {
      const found = pendingQadaaItems.find((item) => item.kind === kind && !seenKeys.has(item.key));
      if (!found) continue;
      selected.push(found);
      seenKeys.add(found.key);
      if (selected.length >= 3) break;
    }

    if (selected.length < 3) {
      for (const item of pendingQadaaItems) {
        if (seenKeys.has(item.key)) continue;
        selected.push(item);
        seenKeys.add(item.key);
        if (selected.length >= 3) break;
      }
    }

    if (selected.length === 0) {
      toast.success("لا يوجد قضاء معلّق للتنفيذ المتسلسل");
      return;
    }

    for (const item of selected) {
      setMissedRecoveryDone(item.key, true);
    }

    if (selected.some((item) => item.kind === "prayer")) {
      setRamadanRoutine(todayKey, { niyyah: true });
    }

    try {
      sessionStorage.setItem(stageReminderKey, "1");
    } catch {
      // ignore session storage errors
    }
    setStageReminderDismissed(true);

    const nextNightCount = nightlyExecutionCount + selected.length;
    setNightlyExecutionCount(nextNightCount);
    try {
      sessionStorage.setItem(nightlyImpactKey, String(nextNightCount));
    } catch {
      // ignore session storage errors
    }

    const before = qadaaSnapshot;
    const reduced = selected.reduce(
      (acc, item) => {
        if (item.kind === "prayer") acc.prayer = Math.max(0, acc.prayer - 1);
        if (item.kind === "adhkar") acc.adhkar = Math.max(0, acc.adhkar - 1);
        if (item.kind === "quran") acc.quran = Math.max(0, acc.quran - 1);
        acc.total = Math.max(0, acc.total - 1);
        return acc;
      },
      { ...before }
    );

    const beforePriority = pickBestAction(preFajrPlan.stage, before).title;
    const afterDecision = pickBestAction(preFajrPlan.stage, reduced);
    const afterPriority = afterDecision.title;

    setLastExecutionSummary({
      title: `تنفيذ متسلسل (${selected.length} خطوات)`,
      remaining: reduced.total,
      at: new Date().toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }),
      previousPriority: beforePriority,
      nextPriority: afterPriority,
      nextRoute: afterDecision.route
    });

    toast.success(`تم تنفيذ ${selected.length} خطوات ذكية`);
  }, [nightlyExecutionCount, nightlyImpactKey, pendingQadaaItems, preFajrPlan.stage, qadaaSnapshot, setMissedRecoveryDone, setRamadanRoutine, stageReminderKey, todayKey]);

  const nightlyImpactLabel = React.useMemo(() => {
    if (nightlyExecutionCount >= 4) return "ثبات قوي";
    if (nightlyExecutionCount >= 2) return "ثبات متقدم";
    if (nightlyExecutionCount >= 1) return "بداية ثابتة";
    return "ابدأ خطوة الليلة";
  }, [nightlyExecutionCount]);

  const nightlyNextGuidance = React.useMemo(() => {
    if (qadaaSnapshot.total === 0) {
      return "الليلة ممتازة: لا يوجد قضاء متبقٍ، ثبّت الإنجاز بورد قصير قبل النوم.";
    }

    const nextStepNumber = nightlyExecutionCount + 1;
    if (nightlyExecutionCount === 0) {
      return `خطوة 1 الليلة: ${bestActionNow.title}`;
    }

    if (nightlyExecutionCount <= 2) {
      return `خطوة ${nextStepNumber} الليلة: كرّر أعلى أولوية الآن — ${bestActionNow.title}`;
    }

    return `خطوة ${nextStepNumber} الليلة: نفّذ أقصر عنصر متبقٍ ثم اختم بأذكار قصيرة.`;
  }, [bestActionNow.title, nightlyExecutionCount, qadaaSnapshot.total]);

  const sequenceCountLabel = React.useMemo(() => {
    const count = Math.min(3, qadaaSnapshot.total);
    if (count <= 0) return "لا يوجد تنفيذ متسلسل";
    return `نفّذ ${count} خطوات ذكية`;
  }, [qadaaSnapshot.total]);

  const singleStepLabel = React.useMemo(() => {
    if (qadaaSnapshot.total <= 0) return "لا توجد خطوة مطلوبة الآن";
    return "نفّذ خطوة المرحلة الآن";
  }, [qadaaSnapshot.total]);

  return (
    <div className="space-y-4">
      <NightlyPlanStrip />

      <Card className="p-5 quran-surface">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs opacity-65">مركز قيادة رمضان</div>
            <h1 className="text-xl font-semibold mt-1 quran-title">استعداد رمضان</h1>
          </div>
          <MoonStar size={20} className="text-[var(--accent)]" />
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="glass rounded-3xl p-4 border border-white/10">
            <div className="text-xs opacity-65">المتبقي على رمضان</div>
            <div className="text-2xl font-semibold tabular-nums mt-1">
              {daysToRamadan > 0 ? `${daysToRamadan} يوم` : daysToRamadan === 0 ? "اليوم" : "بدأ"}
            </div>
          </div>
          <div className="glass rounded-3xl p-4 border border-white/10">
            <div className="text-xs opacity-65">إنجاز مهام اليوم</div>
            <div className="text-2xl font-semibold tabular-nums mt-1">{doneCount}/{total}</div>
          </div>
          <div className="glass rounded-3xl p-4 border border-white/10">
            <div className="text-xs opacity-65">نسبة الالتزام</div>
            <div className="text-2xl font-semibold tabular-nums mt-1">{percent}%</div>
          </div>
        </div>

        <div className="mt-3 h-2 rounded-full bg-white/8 overflow-hidden border border-white/10">
          <div className="h-full bg-[var(--accent)]/70" style={{ width: `${clamp(percent, 0, 100)}%` }} />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">مسار يوم رمضان</div>
            <div className="text-xs opacity-65 mt-1">السحور → النية → الصيام → دعاء الإفطار → القيام</div>
          </div>
          <Badge>{routineDoneCount}/5</Badge>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            { key: "suhoor", label: "تسحّرت" },
            { key: "niyyah", label: "جدّدت النية" },
            { key: "fastCompleted", label: "أكملت الصوم" },
            { key: "iftarDua", label: "دعاء الإفطار" },
            { key: "qiyam", label: "قيام الليل" }
          ].map((item) => {
            const done = !!routine[item.key as keyof typeof routine];
            return (
              <button
                key={item.key}
                onClick={() =>
                  setRamadanRoutine(todayKey, {
                    [item.key]: !done
                  } as Partial<typeof routine>)
                }
                className="glass rounded-3xl p-4 border border-white/10 text-right hover:bg-white/10 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{item.label}</div>
                  <CheckCircle2 size={18} className={done ? "text-[var(--ok)]" : "opacity-35"} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-3 glass rounded-3xl p-4 border border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">تتبع التراويح</div>
              <div className="text-xs opacity-65 mt-1">عدد الركعات المنجزة اليوم</div>
            </div>
            <Badge>{routine.taraweehUnits} ركعة</Badge>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setRamadanRoutine(todayKey, { taraweehUnits: Math.max(0, routine.taraweehUnits - 2) })}
            >
              <Minus size={16} />
              -2
            </Button>
            <Button
              variant="secondary"
              onClick={() => setRamadanRoutine(todayKey, { taraweehUnits: routine.taraweehUnits + 2 })}
            >
              <Plus size={16} />
              +2
            </Button>
          </div>
        </div>
      </Card>

      {inLastTenNights ? (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">خطة العشر الأواخر</div>
              <div className="text-xs opacity-65 mt-1">ليلة {ramadanDay - 19} من العشر الأواخر</div>
            </div>
            <Badge>
              {LAST_TEN_NIGHTS_GOALS.filter((g) => nightGoals[g.id]).length}/{LAST_TEN_NIGHTS_GOALS.length}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
            {LAST_TEN_NIGHTS_GOALS.map((goal) => {
              const done = !!nightGoals[goal.id];
              return (
                <button
                  key={goal.id}
                  onClick={() => toggleLastTenNightGoal(todayKey, goal.id, !done)}
                  className="glass rounded-3xl p-4 border border-white/10 text-right hover:bg-white/10 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">{goal.title}</div>
                    <CheckCircle2 size={18} className={done ? "text-[var(--ok)]" : "opacity-35"} />
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      ) : null}

      {preFajrPlan.isNightWindow && qadaaSnapshot.total > 0 && !stageReminderDismissed ? (
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">تذكير مرحلي قبل الفجر</div>
              <div className="text-xs opacity-65 mt-1">الآن {preFajrPlan.stageLabel} — نفّذ خطوة واحدة على الأقل</div>
            </div>
            <Badge>أولوية الآن</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={executePreFajrStep}>نفّذ خطوة المرحلة الآن</Button>
            <Button size="sm" variant="ghost" onClick={() => setStageReminderDismissed(true)}>إخفاء التذكير</Button>
          </div>
        </Card>
      ) : null}

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">أولوية القضاء الليلي</div>
            <div className="text-xs opacity-65 mt-1">
              {qadaaSnapshot.total === 0
                ? "لا يوجد عليك قضاء الآن — ركّز على الثبات قبل النوم"
                : "خطة ذكية قبل الفجر حسب المتبقي الحقيقي"}
            </div>
          </div>
          <Badge>
            {qadaaSnapshot.total === 0 ? (
              <>
                <span className="sm:hidden">لا قضاء</span>
                <span className="hidden sm:inline">لا يوجد عليك قضاء الآن</span>
              </>
            ) : (
              `${qadaaSnapshot.total} متبقٍ`
            )}
          </Badge>
        </div>

        <div className="mt-3 rounded-2xl bg-white/5 border border-white/10 p-3">
          <div className="text-sm font-semibold">{bestActionNow.title}</div>
          <div className="text-xs opacity-70 mt-1">{bestActionNow.reason}</div>
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={() => navigate(bestActionNow.route)}>
              {bestActionNow.cta}
            </Button>
          </div>
        </div>

        {lastExecutionSummary ? (
          <div className="mt-3 rounded-2xl bg-white/5 border border-white/10 p-3">
            <div className="text-xs opacity-65">ملخص نجاح فوري</div>
            <div className="text-sm font-semibold mt-1">تم تنفيذ: {lastExecutionSummary.title}</div>
            <div className="text-xs opacity-70 mt-1">
              المتبقي الآن: {lastExecutionSummary.remaining} • وقت التنفيذ: {lastExecutionSummary.at}
            </div>
            <div className="text-xs opacity-70 mt-2">
              الأولوية قبل التنفيذ: {lastExecutionSummary.previousPriority}
            </div>
            <div className="text-xs opacity-70 mt-1">
              الأولوية بعد التنفيذ: {lastExecutionSummary.nextPriority}
            </div>
            <div className="mt-2">
              <Button size="sm" variant="ghost" onClick={() => navigate(lastExecutionSummary.nextRoute)}>
                نفّذ التالي الآن
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-3 rounded-2xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs opacity-65">تأثير الليلة</div>
            <Badge>{nightlyImpactLabel}</Badge>
          </div>
          <div className="text-sm font-semibold mt-1">عدد خطوات التنفيذ الليلة: {nightlyExecutionCount}</div>
          <div className="text-xs opacity-70 mt-1">{nightlyNextGuidance}</div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2">
            <div className="text-[11px] opacity-60">قضاء الصلاة</div>
            <div className="text-lg font-semibold tabular-nums">{qadaaSnapshot.prayer}</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2">
            <div className="text-[11px] opacity-60">قضاء الأذكار</div>
            <div className="text-lg font-semibold tabular-nums">{qadaaSnapshot.adhkar}</div>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2">
            <div className="text-[11px] opacity-60">قضاء القرآن</div>
            <div className="text-lg font-semibold tabular-nums">{qadaaSnapshot.quran}</div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl bg-white/5 border border-white/10 p-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{preFajrPlan.stageLabel}</Badge>
            <div className="opacity-70">
              {preFajrPlan.minsToFajr != null
                ? `المتبقي على الفجر: ${preFajrPlan.minsToFajr} دقيقة`
                : "المتبقي على الفجر: غير متاح"}
            </div>
          </div>
          <div className="mt-2 opacity-70">
            {preFajrPlan.isNightWindow ? "الوضع الحالي: نافذة ليلية مناسبة لتعويض سريع." : "الوضع الحالي: ركّز على القضاء المتدرج خلال اليوم."}
          </div>
          <ul className="mt-2 space-y-1 opacity-85">
            {preFajrPlan.stagePlan.map((step) => (
              <li key={step}>• {step}</li>
            ))}
          </ul>
          {preFajrPlan.steps.length > 0 ? (
            <ul className="mt-2 space-y-1 opacity-85">
              {preFajrPlan.steps.map((step) => (
                <li key={step}>• {step}</li>
              ))}
            </ul>
          ) : (
            <div className="mt-2 opacity-85">ما شاء الله، لا توجد عناصر قضاء متبقية في النطاق الحالي.</div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate("/missed")}>فتح مركز القضاء</Button>
          <Button size="sm" variant="secondary" onClick={() => navigate("/quran")}>قضاء القرآن</Button>
          <Button size="sm" variant="secondary" onClick={() => navigate("/c/morning")}>قضاء الأذكار</Button>
          <Button size="sm" variant="secondary" onClick={() => navigate("/missed")}>قضاء الصلاة</Button>
          <Button size="sm" onClick={executePreFajrStep} disabled={qadaaSnapshot.total === 0}>
            {singleStepLabel}
          </Button>
          <Button size="sm" variant="secondary" onClick={executeNightSequence} disabled={qadaaSnapshot.total === 0}>
            {sequenceCountLabel}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">قائمة المسلم اليومية</div>
            <div className="text-xs opacity-65 mt-1">ثبّت عبادتك بعناصر يومية صغيرة</div>
          </div>
          <Badge>{doneCount}/{total}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          {DAILY_CHECKLIST_ITEMS.map((item) => {
            const done = !!checklist[item.id];
            return (
              <button
                key={item.id}
                onClick={() => toggleChecklist(todayKey, item.id, !done)}
                className="glass rounded-3xl p-4 border border-white/10 text-right hover:bg-white/10 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{item.title}</div>
                    <div className="text-xs opacity-65 mt-1">{item.subtitle}</div>
                  </div>
                  <CheckCircle2 size={18} className={done ? "text-[var(--ok)]" : "opacity-35"} />
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">خطوة اليوم لتكون أفضل</div>
            <div className="text-xs opacity-65 mt-1">محرك خطوة المسلم الأفضل</div>
          </div>
          <Sparkles size={16} className="text-[var(--accent)]" />
        </div>

        <div className="mt-3 glass rounded-3xl p-4 border border-white/10">
          <div className="arabic-text text-sm leading-8">{dailyStep}</div>
          <div className="mt-3">
            <Button
              variant={betterDone ? "primary" : "secondary"}
              disabled={betterDone}
              onClick={() => setBetterDone(todayKey, true)}
            >
              {betterDone ? "تم تنفيذ خطوة اليوم" : "أنجزت خطوة اليوم"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="text-sm font-semibold">ماذا نضيف في رمضان؟</div>
        <div className="text-xs opacity-65 mt-1">ميزات جاهزة للتنفيذ المرحلي</div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {RAMADAN_FEATURE_BLOCKS.map((block) => (
            <div key={block.id} className="glass rounded-3xl p-4 border border-white/10">
              <div className="font-semibold">{block.title}</div>
              <ul className="mt-2 text-xs opacity-70 leading-7">
                {block.points.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
