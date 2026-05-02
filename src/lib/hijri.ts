/**
 * Lightweight Hijri calendar helpers.
 * Algorithm based on the algorithmic implementation by Dr. Irvin Bromberg.
 * Accurate within ±1 day for dates after 1900 CE.
 */

export interface HijriDate {
  year: number;
  month: number; // 1-12
  day: number;
}

/** Convert a Gregorian Date to approximate Hijri date (arithmetic method). */
export function gregorianToHijri(date: Date): HijriDate {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();

  // Julian Day Number
  const jd =
    Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4) +
    Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4) +
    d -
    32075;

  // Convert JDN to Hijri
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const ll = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - ll) / 5316) * Math.floor((50 * ll) / 17719) +
    Math.floor(ll / 5670) * Math.floor((43 * ll) / 15238);
  const ll2 = ll - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * ll2) / 709);
  const day = ll2 - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;

  return { year, month, day };
}

export const HIJRI_MONTH_NAMES = [
  "محرم", "صفر", "ربيع الأول", "ربيع الآخر",
  "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
  "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
];

export function hijriMonthName(month: number): string {
  return HIJRI_MONTH_NAMES[(month - 1) % 12] ?? "";
}

export function formatHijri(h: HijriDate): string {
  return `${h.day} ${hijriMonthName(h.month)} ${h.year}هـ`;
}

export type IslamicSeason =
  | "ramadan"           // Ramadan (month 9)
  | "dhul_hijjah_10"    // First 10 days of Dhul-Hijjah
  | "arafat"            // Day of Arafat (9 Dhul-Hijjah)
  | "eid_adha"          // Eid Al-Adha (10 Dhul-Hijjah)
  | "eid_fitr"          // Eid Al-Fitr (1 Shawwal)
  | "shaban"            // Shaban (month 8)
  | "muharram"          // Muharram (month 1)
  | "ashura"            // 10th of Muharram
  | "rajab"             // Rajab (month 7)
  | null;

export interface SeasonInfo {
  season: IslamicSeason;
  label: string;
  description: string;
  icon: string;
  color: string;
}

/** Returns the current Islamic season for the given Hijri date, or null. */
export function getIslamicSeason(h: HijriDate): SeasonInfo | null {
  const { month, day } = h;

  if (month === 9) {
    return {
      season: "ramadan",
      label: "رمضان المبارك",
      description: `اليوم ${day} من رمضان — شهر القرآن والرحمة والمغفرة`,
      icon: "🌙",
      color: "#818cf8",
    };
  }
  if (month === 12 && day === 9) {
    return {
      season: "arafat",
      label: "يوم عرفة",
      description: "أفضل يوم في السنة — يوم المغفرة والعتق من النار",
      icon: "🤲",
      color: "#10b981",
    };
  }
  if (month === 12 && day === 10) {
    return {
      season: "eid_adha",
      label: "عيد الأضحى المبارك",
      description: "أيام ذبح وتكبير وتحميد — تقبّل الله منّا ومنكم",
      icon: "🐑",
      color: "#f59e0b",
    };
  }
  if (month === 12 && day >= 1 && day <= 10) {
    return {
      season: "dhul_hijjah_10",
      label: `أيام ذي الحجة — اليوم ${day}`,
      description: "أفضل أيام الدنيا — أكثر فيها من التكبير والتهليل والتحميد",
      icon: "✨",
      color: "#f59e0b",
    };
  }
  if (month === 1 && day === 10) {
    return {
      season: "ashura",
      label: "يوم عاشوراء",
      description: "صيام يوم عاشوراء يكفّر السنة الماضية",
      icon: "🌿",
      color: "#6366f1",
    };
  }
  if (month === 1) {
    return {
      season: "muharram",
      label: `المحرم — اليوم ${day}`,
      description: "أول الأشهر الحرم — ويُستحب الإكثار من صيام التطوع فيه",
      icon: "🌿",
      color: "#6366f1",
    };
  }
  if (month === 10 && day === 1) {
    return {
      season: "eid_fitr",
      label: "عيد الفطر المبارك",
      description: "تقبّل الله صيامك وقيامك — عيد مبارك",
      icon: "🎉",
      color: "#f59e0b",
    };
  }
  if (month === 8) {
    return {
      season: "shaban",
      label: `شعبان — اليوم ${day}`,
      description: "شهر بين رجب ورمضان — يُرفع فيه الأعمال إلى الله",
      icon: "⭐",
      color: "#8b5cf6",
    };
  }
  if (month === 7) {
    return {
      season: "rajab",
      label: `رجب — اليوم ${day}`,
      description: "من الأشهر الحرم — يستحب فيه الاستغفار والذكر",
      icon: "🌸",
      color: "#ec4899",
    };
  }
  return null;
}

/** Get current Hijri date and season info for today. */
export function getTodayIslamicInfo(): { hijri: HijriDate; season: SeasonInfo | null } {
  const hijri = gregorianToHijri(new Date());
  const season = getIslamicSeason(hijri);
  return { hijri, season };
}
