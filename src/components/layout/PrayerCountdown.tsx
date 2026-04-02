import * as React from "react";
import { Clock, Bell } from "lucide-react";

const PRAYER_NAMES_AR: Record<string, string> = {
  Fajr: "الفجر",
  Sunrise: "الشروق",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء",
};

const PRAYER_ORDER = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

function parseTime(str: string): { h: number; m: number } {
  // "HH:MM" or "HH:MM (BST)" etc.
  const clean = str.split(" ")[0] ?? str;
  const [h, m] = clean.split(":").map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

function getNextPrayer(timings: Record<string, string>) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  for (const key of PRAYER_ORDER) {
    const raw = timings[key];
    if (!raw) continue;
    const { h, m } = parseTime(raw);
    const prayerMin = h * 60 + m;
    if (prayerMin > nowMin) {
      const diffSec = Math.round((prayerMin - nowMin) * 60);
      return { key, nameAr: PRAYER_NAMES_AR[key] ?? key, diffSec };
    }
  }
  // Past Isha — next is tomorrow's Fajr
  const fajrRaw = timings["Fajr"];
  if (fajrRaw) {
    const { h, m } = parseTime(fajrRaw);
    const fajrMin = h * 60 + m + 24 * 60; // tomorrow
    const diffSec = Math.round((fajrMin - nowMin) * 60);
    return { key: "Fajr", nameAr: PRAYER_NAMES_AR["Fajr"] ?? "الفجر", diffSec };
  }
  return null;
}

function formatCountdown(sec: number) {
  if (sec <= 0) return "الآن";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PrayerCountdown({ timings }: { timings: Record<string, string> }) {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const next = React.useMemo(() => {
    const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

    for (const key of PRAYER_ORDER) {
      const raw = timings[key];
      if (!raw) continue;
      const { h, m } = parseTime(raw);
      const prayerMin = h * 60 + m;
      if (prayerMin > nowMin) {
        const diffSec = Math.max(0, Math.round((prayerMin - nowMin) * 60) - 1);
        return { key, nameAr: PRAYER_NAMES_AR[key] ?? key, diffSec };
      }
    }
    // Past Isha
    const fajrRaw = timings["Fajr"];
    if (fajrRaw) {
      const { h, m } = parseTime(fajrRaw);
      const fajrMin = h * 60 + m + 24 * 60;
      const diffSec = Math.max(0, Math.round((fajrMin - nowMin) * 60) - 1);
      return { key: "Fajr", nameAr: "الفجر", diffSec };
    }
    return null;
  }, [now, timings]);

  if (!next) return null;

  const isUrgent = next.diffSec < 600; // < 10 min
  const isImminent = next.diffSec < 120; // < 2 min

  return (
    <div
      className={[
        "glass rounded-2xl p-3 border transition-all duration-500",
        isImminent
          ? "border-[var(--accent)] bg-[var(--accent)]/8 prayer-pulse"
          : isUrgent
          ? "border-[var(--accent)]/30 bg-[var(--accent)]/4"
          : "border-white/10",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="countdown-live-dot" aria-hidden="true" />
          <Bell
            size={14}
            className={isImminent ? "text-[var(--accent)] animate-bounce" : "opacity-60"}
          />
          <span className="text-xs opacity-65">الصلاة القادمة</span>
        </div>
        <span
          className={[
            "text-xs font-semibold",
            isImminent ? "text-[var(--accent)]" : "opacity-70",
          ].join(" ")}
        >
          {next.nameAr}
        </span>
      </div>
      <div
        className={[
          "mt-1 text-2xl font-bold tabular-nums tracking-widest",
          isImminent ? "text-[var(--accent)]" : "",
        ].join(" ")}
        style={{ fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum"' }}
      >
        {formatCountdown(next.diffSec)}
      </div>
    </div>
  );
}
