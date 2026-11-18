/** Prayer-time calculation methods (AlAdhan's numbering), for Settings and the Prayer Times page. */
export const PRAYER_CALC_METHODS = [
  { value: 1, label: "جامعة العلوم الإسلامية - كراتشي", short: "كراتشي" },
  { value: 2, label: "الجمعية الإسلامية لأمريكا الشمالية", short: "أمريكا الشمالية" },
  { value: 3, label: "رابطة العالم الإسلامي", short: "رابطة العالم الإسلامي" },
  { value: 4, label: "جامعة أم القرى - مكة المكرمة", short: "أم القرى" },
  { value: 5, label: "الهيئة المصرية العامة للمساحة", short: "الهيئة المصرية" },
  { value: 7, label: "معهد الجيوفيزياء - إيران", short: "طهران" },
  { value: 8, label: "دول الخليج", short: "الخليج" },
  { value: 9, label: "الكويت", short: "الكويت" },
  { value: 10, label: "قطر", short: "قطر" },
  { value: 11, label: "سنغافورة", short: "سنغافورة" },
  { value: 12, label: "فرنسا", short: "فرنسا" },
  { value: 13, label: "ديانت - تركيا", short: "تركيا" },
  { value: 14, label: "روسيا", short: "روسيا" },
  { value: 15, label: "لجنة رؤية الهلال العالمية", short: "رؤية الهلال" },
  { value: 17, label: "ماليزيا - JAKIM", short: "ماليزيا" },
  { value: 18, label: "تونس", short: "تونس" },
  { value: 19, label: "الجزائر", short: "الجزائر" },
  { value: 20, label: "إندونيسيا - KEMENAG", short: "إندونيسيا" },
  { value: 21, label: "المغرب", short: "المغرب" },
  { value: 23, label: "الأردن - وزارة الأوقاف", short: "الأردن" },
] as const;

export function calcMethodLabel(value: number, short = false): string {
  const found = PRAYER_CALC_METHODS.find((method) => method.value === value);
  return found ? (short ? found.short : found.label) : "";
}
