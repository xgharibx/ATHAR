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

  // SVG coordinate system stays fixed; container scales responsively with viewport
  const ringSize = compact ? 124 : 152;
  const radius = compact ? 47 : 58;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference * (1 - schedule.progress);
  const isUrgent = schedule.diffSec < 900;
  const isImminent = schedule.diffSec < 180;
  const ringStroke = resolveRingStroke(schedule.currentPhase.type, isImminent, isUrgent);
  // Responsive container: shrinks on narrow screens / large OS font but never below 88px
  const containerSize = compact
    ? "clamp(88px, 22vw, 124px)"
    : "clamp(108px, 26vw, 152px)";
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center">
      <div className="min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 text-xs opacity-65">
          <div className="countdown-live-dot" aria-hidden="true" />
          <Bell size={14} aria-hidden="true" className={isImminent ? "text-[var(--accent)] animate-bounce" : "opacity-60"} />
          <span>الحالة الآن</span>
        </div>
        <div className={[compact ? "mt-2 text-2xl" : "mt-3 text-4xl", "font-bold leading-tight break-words"].join(" ")} aria-live="polite" aria-atomic="true">
          {schedule.currentPhase.label}
        </div>
        <div dir="ltr" className={[compact ? "mt-2 text-sm" : "mt-3 text-lg", "font-medium tabular-nums leading-snug break-words"].join(" ")}>
          {schedule.currentPhase.value}
        </div>
      </div>

      <div className="relative shrink-0" style={{ width: containerSize, height: containerSize }}>
        {/* SVG uses viewBox for coordinate system; fills container 100% so it scales */}
        <svg width="100%" height="100%" viewBox={`0 0 ${ringSize} ${ringSize}`} className="-rotate-90" aria-hidden="true">
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke="var(--stroke)"
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
        <div className="absolute inset-0 grid place-items-center text-center px-2 overflow-hidden">
          <div className="w-full">
            <div className="text-[10px] opacity-55 leading-tight">الوقت المتبقي</div>
            <div className={[compact ? "mt-0.5 text-[10px]" : "mt-1 text-[12px]", "font-bold tabular-nums leading-tight"].join(" ")}>
              {formatCountdown(schedule.diffSec)}
            </div>
            <div className="mt-0.5 text-[10px] opacity-55 leading-tight overflow-hidden text-ellipsis whitespace-nowrap">حتى {schedule.nextPhase.label}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
