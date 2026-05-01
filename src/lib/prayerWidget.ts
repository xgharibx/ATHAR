/**
 * N3: Prayer Widget support
 *
 * Writes next-prayer data to a well-known key so native Android/iOS widget
 * code can read it and display the next prayer time on the home screen.
 *
 * On Android the widget reads from SharedPreferences via a BroadcastReceiver.
 * On iOS the widget reads from App Groups UserDefaults.
 * On web/PWA the data is stored in localStorage for debugging.
 *
 * Native setup required:
 *  Android — WidgetProvider reads key "noor_widget_prayer_v2" from SharedPreferences
 *  iOS     — WidgetExtension reads key "noor_widget_prayer_v2" from UserDefaults(suiteName: "group.app.athar")
 *  Both    — Capacitor Preferences plugin bridges the data bridge below.
 */

import { Capacitor } from "@capacitor/core";

const WIDGET_KEY = "noor_widget_prayer_v2";

export type PrayerWidgetPayload = {
  /** ISO timestamp when this payload was written */
  updatedAt: string;
  /** The prayer coming up next (or the last of the day if all passed) */
  nextPrayer: {
    name: string;
    nameAr: string;
    time: string; // HH:MM (24h)
  } | null;
  /** All five prayers for the day */
  prayers: Array<{
    name: string;
    nameAr: string;
    time: string; // HH:MM (24h)
    passed: boolean;
  }>;
  /** Whether today is Ramadan */
  isRamadan: boolean;
  /** Suhoor & Iftar times (during Ramadan only) */
  suhoor: string | null; // HH:MM or null
  iftar: string | null;  // HH:MM or null
};

const PRAYER_NAMES_AR: Record<string, string> = {
  Fajr:    "الفجر",
  Sunrise: "الشروق",
  Dhuhr:   "الظهر",
  Asr:     "العصر",
  Maghrib: "المغرب",
  Isha:    "العشاء",
};

const ORDERED_PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** Returns true when the current Gregorian date falls in Ramadan (Hijri month 9). */
function detectRamadan(): boolean {
  try {
    const fmt = new Intl.DateTimeFormat("en-u-ca-islamic", { month: "numeric" });
    const parts = fmt.formatToParts(new Date());
    const monthPart = parts.find((p) => p.type === "month");
    return monthPart?.value === "9";
  } catch {
    return false;
  }
}

/** Build the widget payload from the raw timings object returned by the prayer-times API. */
export function buildWidgetPayload(
  timings: Record<string, string>,
): PrayerWidgetPayload {
  const nowMin = nowMinutes();
  const ramadan = detectRamadan();

  const prayers = ORDERED_PRAYERS.map((name) => {
    const time = (timings[name] ?? "").split(" ")[0] ?? "";
    return {
      name,
      nameAr: PRAYER_NAMES_AR[name] ?? name,
      time,
      passed: !!time && hhmmToMinutes(time) <= nowMin,
    };
  });

  const nextPrayer = prayers.find((p) => !p.passed) ?? null;

  // Suhoor = Fajr - 30 min; Iftar = Maghrib
  let suhoor: string | null = null;
  let iftar: string | null = null;
  if (ramadan) {
    const fajrTime = (timings["Fajr"] ?? "").split(" ")[0];
    if (fajrTime) {
      const mins = hhmmToMinutes(fajrTime) - 30;
      const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60);
      const m = ((mins % 1440) + 1440) % 1440 % 60;
      suhoor = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    iftar = (timings["Maghrib"] ?? "").split(" ")[0] ?? null;
  }

  return {
    updatedAt: new Date().toISOString(),
    nextPrayer: nextPrayer ? { name: nextPrayer.name, nameAr: nextPrayer.nameAr, time: nextPrayer.time } : null,
    prayers,
    isRamadan: ramadan,
    suhoor,
    iftar,
  };
}

/**
 * Write the current prayer data so that a native home-screen widget can display it.
 * - On native Capacitor: uses @capacitor/preferences (bridges to SharedPreferences / UserDefaults)
 * - Everywhere: also writes to localStorage for PWA / debug access
 */
export async function syncPrayerWidget(timings: Record<string, string>): Promise<void> {
  const payload = buildWidgetPayload(timings);
  const value = JSON.stringify(payload);

  // Always write to localStorage (PWA / web fallback)
  try {
    localStorage.setItem(WIDGET_KEY, value);
  } catch {
    // ignore storage errors
  }

  // On native, also persist via Capacitor Preferences so native widget code can read it.
  // The module name is built at runtime to avoid Rollup static analysis bundling it.
  if (Capacitor.isNativePlatform()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = await (Function("m", "return import(m)")(["@capacitor", "preferences"].join("/")) as Promise<any>);
      if (mod?.Preferences?.set) {
        await mod.Preferences.set({ key: WIDGET_KEY, value });
        if (Capacitor.getPlatform() === "android") {
          await mod.Preferences.set({
            key: "noor_widget_last_update",
            value: new Date().toISOString(),
          });
        }
      }
    } catch {
      // Plugin not available — widget sync degrades to localStorage only
    }
  }
}

/** Read the last written widget payload (useful for debugging). */
export function readWidgetPayload(): PrayerWidgetPayload | null {
  try {
    const raw = localStorage.getItem(WIDGET_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PrayerWidgetPayload;
  } catch {
    return null;
  }
}
