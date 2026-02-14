import * as React from "react";
import { MoonStar } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { useTodayKey } from "@/hooks/useTodayKey";
import { trackUxEvent } from "@/lib/uxMetrics";
import { useNoorStore } from "@/store/noorStore";

type QadaaCounts = {
  prayer: number;
  adhkar: number;
  quran: number;
  total: number;
};

function pickBestAction(stage: string, qadaa: QadaaCounts) {
  if (qadaa.total === 0) {
    return { title: "حافظ على الثبات الليلة", route: "/quran" };
  }

  if (stage === "5") {
    return { title: "ثبّت الصلاة القادمة الآن", route: "/missed" };
  }

  if (stage === "10") {
    if (qadaa.quran >= qadaa.adhkar) return { title: "صفحة قرآن قصيرة الآن", route: "/quran" };
    return { title: "أذكار تعويضية مركزة", route: "/c/morning" };
  }

  if (qadaa.prayer >= qadaa.quran && qadaa.prayer >= qadaa.adhkar) {
    return { title: "ابدأ بقضاء الصلاة", route: "/missed" };
  }
  if (qadaa.quran >= qadaa.adhkar) {
    return { title: "ابدأ بتعويض القرآن", route: "/quran" };
  }

  return { title: "ابدأ بتعويض الأذكار", route: "/c/morning" };
}

function stageLabelFromMins(minsToFajr: number | null) {
  if (minsToFajr == null) return "وضع متدرج";
  if (minsToFajr <= 5) return "وضع 5 دقائق";
  if (minsToFajr <= 10) return "وضع 10 دقائق";
  if (minsToFajr <= 15) return "وضع 15 دقيقة";
  return "وضع متدرج";
}

export function NightlyPlanStrip({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const todayKey = useTodayKey();
  const prayerTimes = usePrayerTimes();
  const dailyChecklist = useNoorStore((s) => s.dailyChecklist);
  const missedRecoveryDone = useNoorStore((s) => s.missedRecoveryDone);
  const missedTrackingStartISO = useNoorStore((s) => s.missedTrackingStartISO);
  const [nightCount, setNightCount] = React.useState(0);

  React.useEffect(() => {
    const key = `noor_ramadan_nightly_impact:${todayKey}`;
    try {
      const raw = sessionStorage.getItem(key);
      const parsed = raw ? Number.parseInt(raw, 10) : 0;
      setNightCount(Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
    } catch {
      setNightCount(0);
    }
  }, [todayKey]);

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

  const minsToFajr = React.useMemo(() => {
    const fajrRaw = prayerTimes.data?.data?.timings?.Fajr;
    if (!fajrRaw) return null;

    const now = new Date();
    const clean = String(fajrRaw).trim().split(" ")[0] ?? "";
    const [hh, mm] = clean.split(":").map((x) => Number.parseInt(x, 10));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;

    const fajr = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
    if (fajr.getTime() <= now.getTime()) fajr.setDate(fajr.getDate() + 1);
    return Math.max(0, Math.floor((fajr.getTime() - now.getTime()) / 60000));
  }, [prayerTimes.data?.data?.timings?.Fajr]);

  const stageLabel = stageLabelFromMins(minsToFajr);
  const stage =
    minsToFajr == null ? "normal" : minsToFajr <= 5 ? "5" : minsToFajr <= 10 ? "10" : minsToFajr <= 15 ? "15" : "normal";
  const best = pickBestAction(stage, qadaaSnapshot);
  const isClearNight = qadaaSnapshot.total === 0;

  return (
    <div className={`glass rounded-3xl p-3 border border-white/10 ${className}`.trim()}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs opacity-75">
          <MoonStar size={14} />
          <span>الخطة الليلية الموحّدة</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{isClearNight ? "لا يوجد عليك قضاء الآن" : "قضاء نشط"}</Badge>
          <Badge>{stageLabel}</Badge>
        </div>
      </div>

      <div className="mt-2 text-sm font-semibold">
        {isClearNight ? "ما شاء الله — لا يوجد عليك قضاء الآن" : best.title}
      </div>
      <div className="mt-1 text-xs opacity-70">
        {isClearNight
          ? `تقدّم الليلة: ${nightCount} خطوة • حافظ على الثبات قبل النوم.`
          : `تقدّم الليلة: ${nightCount} خطوة • المتبقي: ${qadaaSnapshot.total}`}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="micro-lift"
          onClick={() => {
            trackUxEvent("night_strip:open_ramadan");
            navigate("/ramadan");
          }}
        >
          أكمل في رمضان
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="micro-lift"
          onClick={() => {
            trackUxEvent(`night_strip:next_${best.route}`);
            navigate(best.route);
          }}
        >
          {isClearNight ? "افتح وِردًا قصيرًا" : "نفّذ التالي"}
        </Button>
      </div>
    </div>
  );
}
