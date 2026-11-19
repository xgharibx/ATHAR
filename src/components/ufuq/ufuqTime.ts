/** Time words and the sky of the «اليوم» screen (src/components/ufuq/UfuqHome.tsx). */
import { arNum } from "@/lib/formatNumber";

export type SkyPhase = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export const PRAYER_KEYS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

/** Greeting by the hour, the way people greet each other. */
export function ufuqGreeting(hour: number): string {
  if (hour < 4) return "ليلةٌ طيبة";
  if (hour < 12) return "صباح الخير";
  if (hour < 15) return "طاب نهارك";
  if (hour < 19) return "مساء الخير";
  return "ليلةٌ طيبة";
}

/** The sky follows the prayer whose time we are in (and the sunrise). */
export function skyPhaseFor(minutesNow: number, timings: Partial<Record<string, string>> | undefined): SkyPhase {
  const at = (key: string) => {
    const raw = String(timings?.[key] ?? "").trim().split(" ")[0] ?? "";
    const [h, m] = raw.split(":").map((v) => Number.parseInt(v, 10));
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
  };
  const fajr = at("Fajr");
  const sunrise = at("Sunrise");
  const asr = at("Asr");
  const maghrib = at("Maghrib");
  const isha = at("Isha");
  if (fajr == null || asr == null || maghrib == null || isha == null) {
    const hour = Math.floor(minutesNow / 60);
    if (hour < 5) return "isha";
    if (hour < 7) return "fajr";
    if (hour < 15) return "dhuhr";
    if (hour < 18) return "asr";
    if (hour < 20) return "maghrib";
    return "isha";
  }
  if (minutesNow < fajr) return "isha";
  if (minutesNow < (sunrise ?? fajr + 80)) return "fajr";
  if (minutesNow < asr) return "dhuhr";
  if (minutesNow < maghrib) return "asr";
  if (minutesNow < isha) return "maghrib";
  return "isha";
}

/** «بعد ساعتين و١٤ دقيقة» — the countdown in words, not a ticking clock. */
export function untilLabel(diffSec: number): string {
  const total = Math.max(0, Math.round(diffSec / 60));
  if (total <= 0) return "حان الآن";
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const h = hours === 0 ? "" : hours === 1 ? "ساعة" : hours === 2 ? "ساعتين" : `${arNum(hours)} ساعات`;
  const m = minutes === 0 ? "" : minutes === 1 ? "دقيقة" : minutes === 2 ? "دقيقتين" : minutes <= 10 ? `${arNum(minutes)} دقائق` : `${arNum(minutes)} دقيقة`;
  return `بعد ${[h, m].filter(Boolean).join(" و")}`;
}

/** «ساعة و٥ دقائق» without «بعد», for «… حتى التهجد». */
export function durationLabel(diffSec: number): string {
  return untilLabel(diffSec).replace(/^بعد /, "");
}

/**
 * What the day's next moment is called after «حتى»: the next prayer, or a
 * moment between prayers (الشروق، الضحى، وقت الاستواء، التهجد…).
 */
const PHASE_TARGET: Record<string, string> = {
  fajr: "الفجر",
  "forbidden-sunrise": "الشروق",
  duha: "الضحى",
  "forbidden-zenith": "وقت الاستواء",
  dhuhr: "الظهر",
  asr: "العصر",
  "forbidden-sunset": "وقت الغروب",
  maghrib: "المغرب",
  isha: "العشاء",
  "wait-tahajjud": "انتظار التهجد",
  tahajjud: "التهجد",
};

export function phaseTargetLabel(id: string, fallback: string): string {
  return PHASE_TARGET[id] ?? fallback;
}

/** «٢:٥٨» and «م» apart, in Arabic digits, so the order never flips. */
export function ufuqClock(raw: string): { time: string; period: string } {
  const clean = String(raw ?? "").trim().split(" ")[0] ?? "";
  const [h, m] = clean.split(":").map((v) => Number.parseInt(v, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return { time: clean, period: "" };
  const hour = h % 12 || 12;
  const digits = (value: string) => value.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]!);
  return { time: digits(`${hour}:${String(m).padStart(2, "0")}`), period: h < 12 ? "ص" : "م" };
}
