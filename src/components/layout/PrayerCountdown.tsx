import * as React from "react";
import { Bell, Clock3 } from "lucide-react";
import type { PrayerTimings } from "@/lib/prayerSchedule";
import { buildPrayerSchedule, formatCountdown, formatRemainingText } from "@/lib/prayerSchedule";

export function PrayerCountdown(props: Readonly<{
  timings: PrayerTimings;
  compact?: boolean;
}>) {
  const { timings, compact = false } = props;
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const id = globalThis.setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const schedule = React.useMemo(() => {
    const built = buildPrayerSchedule(timings, now);
    if (!built) return null;
    return {
      ...built,
      diffSec: Math.max(0, built.diffSec - 1),
    };
  }, [now, timings]);

  if (!schedule) return null;

  const ringSize = compact ? 124 : 152;
  const radius = compact ? 47 : 58;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference * (1 - schedule.progress);
  const isUrgent = schedule.diffSec < 900;
  const isImminent = schedule.diffSec < 180;
  const ringStroke = isImminent
    ? "var(--accent)"
    : isUrgent
      ? "rgba(255, 214, 102, 0.92)"
      : "rgba(190, 235, 255, 0.92)";
  const showRangeLabel = compact === false;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs opacity-65">
          <div className="countdown-live-dot" aria-hidden="true" />
          <Bell size={14} className={isImminent ? "text-[var(--accent)] animate-bounce" : "opacity-60"} />
          <span>الآن: {schedule.current.label}</span>
        </div>
        <div className={[compact ? "mt-2 text-3xl" : "mt-3 text-4xl", "font-bold tabular-nums leading-none"].join(" ")}>
          {schedule.current.timeLabel}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs opacity-60">
          <Clock3 size={12} />
          <span>التالي {schedule.next.label}</span>
        </div>
        <div className="mt-1 text-sm font-medium leading-6">
          يبقى {formatRemainingText(schedule.diffSec)}
        </div>
        {showRangeLabel ? (
          <div className="mt-2 text-xs opacity-55 leading-6">
            من {schedule.current.label} إلى {schedule.next.label}
          </div>
        ) : null}
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
            <div className="mt-1 text-[11px] opacity-55">حتى {schedule.next.label}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
