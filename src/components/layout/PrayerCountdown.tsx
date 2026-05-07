import * as React from "react";
import { Bell } from "lucide-react";
import type { PrayerTimings } from "@/lib/prayerSchedule";
import { buildPrayerSchedule, formatCountdown } from "@/lib/prayerSchedule";
import { clamp } from "@/lib/utils";

function resolveRingStroke(phaseType: "prayer" | "moment" | "forbidden" | "wait", isImminent: boolean, isUrgent: boolean) {
  if (phaseType === "forbidden") return "rgba(255, 177, 177, 0.96)";
  if (phaseType === "wait") return "rgba(202, 188, 255, 0.94)";
  if (phaseType === "moment") return "rgba(144, 216, 255, 0.94)";
  if (isImminent) return "var(--accent)";
  if (isUrgent) return "rgba(255, 214, 102, 0.92)";
  return "rgba(190, 235, 255, 0.92)";
}

export function PrayerCountdown(props: Readonly<{
  timings: PrayerTimings;
  compact?: boolean;
}>) {
  const { timings, compact = false } = props;

  // Build the full schedule (expensive) every 60 s or when timings/date change.
  // Using minute-granularity Date so memo only invalidates once per minute.
  const [minuteTs, setMinuteTs] = React.useState(() => Math.floor(Date.now() / 60_000));
  React.useEffect(() => {
    const id = globalThis.setInterval(() => setMinuteTs(Math.floor(Date.now() / 60_000)), 60_000);
    return () => globalThis.clearInterval(id);
  }, []);

  const baseSchedule = React.useMemo(() => {
    return buildPrayerSchedule(timings, new Date(minuteTs * 60_000));
  }, [timings, minuteTs]);

  // Live countdown ticks every second — just recompute diffSec/progress cheaply.
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = globalThis.setInterval(() => setNowMs(Date.now()), 1000);
    return () => globalThis.clearInterval(id);
  }, []);

  const schedule = React.useMemo(() => {
    if (!baseSchedule) return null;
    const endMs = baseSchedule.currentPhase.endAt.getTime();
    const startMs = baseSchedule.currentPhase.startAt.getTime();
    const diffSec = Math.max(0, Math.round((endMs - nowMs) / 1000));
    const progress = clamp((nowMs - startMs) / Math.max(1, endMs - startMs), 0, 1);
    return { ...baseSchedule, diffSec, progress };
  }, [baseSchedule, nowMs]);

  if (!schedule) return null;

  const ringSize = compact ? 124 : 152;
  const radius = compact ? 47 : 58;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference * (1 - schedule.progress);
  const isUrgent = schedule.diffSec < 900;
  const isImminent = schedule.diffSec < 180;
  const ringStroke = resolveRingStroke(schedule.currentPhase.type, isImminent, isUrgent);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs opacity-65">
          <div className="countdown-live-dot" aria-hidden="true" />
          <Bell size={14} className={isImminent ? "text-[var(--accent)] animate-bounce" : "opacity-60"} />
          <span>الحالة الآن</span>
        </div>
        <div className={[compact ? "mt-2 text-2xl" : "mt-3 text-4xl", "font-bold leading-tight"].join(" ")}>
          {schedule.currentPhase.label}
        </div>
        <div dir="ltr" className={[compact ? "mt-2 text-sm" : "mt-3 text-lg", "font-medium tabular-nums leading-6"].join(" ")}>
          {schedule.currentPhase.value}
        </div>
      </div>

      <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
        <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} className="-rotate-90">
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={compact ? 6 : 7}
          />
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke={ringStroke}
            strokeWidth={compact ? 6 : 7}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center px-3">
          <div>
            <div className="text-[11px] opacity-55">الوقت المتبقي</div>
            <div className={[compact ? "mt-1 text-sm" : "mt-1 text-base", "font-bold tabular-nums"].join(" ")}>
              {formatCountdown(schedule.diffSec)}
            </div>
            <div className="mt-1 text-[11px] opacity-55">حتى {schedule.nextPhase.label}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
