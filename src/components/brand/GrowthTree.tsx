/**
 * شجرة الأثر — a living plant that grows with your week.
 *
 * Stage = number of active days in the last 7 (from the real activity log):
 *   0 → seed · 1-2 → sprout · 3-4 → sapling · 5-6 → blossoming · 7 → full bloom
 * Miss your days and next week it starts humbler — a gentle, wordless mirror
 * of consistency. Rendered wherever the companion lives.
 */
import * as React from "react";
import { useNoorStore } from "@/store/noorStore";

function activeDaysLast7(activity: Record<string, number>): number {
  let n = 0;
  const d = new Date();
  for (let i = 0; i < 7; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if ((activity[key] ?? 0) > 0) n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

const STAGE_LABELS = [
  "بذرة تنتظر سقياك",
  "برعم صغير نبت",
  "برعم يشتد عوده",
  "شتلة خضراء تكبر",
  "شجيرة تورق",
  "أزهار أولى تتفتح",
  "شجرة مزهرة",
  "شجرة مكتملة الإزهار 🌸",
];

export function GrowthTree() {
  const activity = useNoorStore((s) => (s as unknown as { activity?: Record<string, number> }).activity ?? {});
  const days = React.useMemo(() => activeDaysLast7(activity), [activity]);

  const stem = Math.min(1, days / 7);
  const leaves = days >= 2;
  const leaves2 = days >= 4;
  const buds = days >= 5;
  const bloom = days >= 7;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[var(--stroke)] bg-[var(--card)] px-4 py-3">
      <svg width="72" height="88" viewBox="0 0 72 88" aria-hidden="true" className="shrink-0">
        {/* soil mound */}
        <ellipse cx="36" cy="80" rx="24" ry="6" fill="var(--accent-2)" opacity="0.25" />
        {/* stem grows with the week */}
        <path
          d={`M36 80 C 36 ${80 - 44 * stem}, 34 ${78 - 50 * stem}, 36 ${78 - 54 * stem}`}
          stroke="var(--accent-2)"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* first leaves */}
        {leaves ? (
          <>
            <path d="M36 62 C 26 58, 22 50, 25 46 C 33 48, 37 54, 36 62Z" fill="var(--accent-2)" opacity="0.8" />
            <path d="M36 66 C 46 62, 50 55, 47 51 C 39 53, 35 58, 36 66Z" fill="var(--accent-2)" opacity="0.65" />
          </>
        ) : null}
        {/* second pair */}
        {leaves2 ? (
          <>
            <path d="M36 48 C 27 45, 24 38, 27 35 C 34 37, 37 42, 36 48Z" fill="var(--accent-2)" opacity="0.85" />
            <path d="M36 52 C 45 48, 48 42, 45 39 C 38 41, 35 46, 36 52Z" fill="var(--accent-2)" opacity="0.7" />
          </>
        ) : null}
        {/* buds */}
        {buds ? (
          <>
            <circle cx="30" cy="32" r="3.4" fill="var(--accent)" opacity="0.85" />
            <circle cx="43" cy="36" r="2.8" fill="var(--accent)" opacity="0.7" />
          </>
        ) : null}
        {/* the crowning bloom */}
        {bloom ? (
          <g>
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <ellipse key={deg} cx="36" cy="18" rx="4" ry="7" fill="var(--accent)" opacity="0.85"
                transform={`rotate(${deg} 36 24)`} />
            ))}
            <circle cx="36" cy="24" r="4" fill="var(--accent-2)" />
          </g>
        ) : days >= 1 ? (
          <circle cx="36" cy={78 - 54 * stem} r="3" fill="var(--accent)" opacity="0.8" />
        ) : (
          <circle cx="36" cy="76" r="4" fill="var(--accent)" opacity="0.6" />
        )}
      </svg>
      <div className="min-w-0">
        <div className="text-sm font-semibold">شجرة أثرك</div>
        <div className="mt-0.5 text-xs text-[var(--muted)]">{STAGE_LABELS[days] ?? STAGE_LABELS[0]}</div>
        <div className="mt-1 text-[11px] text-[var(--muted-2)]">
          {days.toLocaleString("ar-EG")} من ٧ أيام نشطة هذا الأسبوع — كل ذكرٍ يسقيها 🌱
        </div>
      </div>
    </div>
  );
}
