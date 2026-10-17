/**
 * The muhasaba ladders.
 *
 * Every deed is an ordered list of rungs, lowest first. A person records the
 * highest rung they reached that day; each rung includes the ones beneath it, so
 * "first row" implies "in congregation". Nothing here is a ruling — these are the
 * well-attested ranks of each act, offered as things to climb toward.
 */
export type Audience = "male" | "female" | "both";

export type SectionId = "fard" | "rawatib" | "quran" | "adhkar" | "qiyam" | "siyam" | "akhlaq";

export type Deed = {
  id: string;
  section: SectionId;
  title: string;
  audience: Audience;
  /** Rungs, lowest first. The first is the least that counts as having done it. */
  levels: string[];
  /** The same deed's rungs for women, where they differ (prayer is not in congregation at the mosque). */
  levelsFemale?: string[];
  /** Days it applies (0 = Sunday). Omitted = every day. */
  weekdays?: number[];
  /** The prayer in the app's own log this deed pre-fills from, if any. */
  prayer?: "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";
};

export const SECTIONS: Array<{ id: SectionId; title: string; blurb: string }> = [
  { id: "fard", title: "الفرائض", blurb: "الصلوات الخمس ومراتب أدائها" },
  { id: "rawatib", title: "السنن الرواتب", blurb: "ما يُصلّى قبل الفرائض وبعدها" },
  { id: "quran", title: "القرآن", blurb: "وردك مع كتاب الله" },
  { id: "adhkar", title: "الأذكار", blurb: "حصن يومك" },
  { id: "qiyam", title: "القيام والضحى", blurb: "صلاة الليل والنهار" },
  { id: "siyam", title: "الصيام", blurb: "صيام التطوع" },
  { id: "akhlaq", title: "القلب والخُلق", blurb: "ما يُصلح الباطن" },
];

const IN_TIME = "أدّيتُها في وقتها";
const CONGREGATION = "في جماعة المسجد";
const BEFORE_IQAMA = "دخلتُ المسجد قبل الإقامة";
const ROWS = "في الصفوف الأولى";
const FIRST_ROW = "في الصف الأول";

export const DEEDS: Deed[] = [
  // ── Fard, men ────────────────────────────────────────────────────────────
  {
    id: "fajr", section: "fard", title: "الفجر", audience: "both", prayer: "Fajr",
    levels: [IN_TIME, "في الجامع مع الجماعة", BEFORE_IQAMA, ROWS, FIRST_ROW, "مع سنة الفجر", "وقيام الليل قبلها"],
    levelsFemale: [IN_TIME, "في أول وقتها", "في مكان هادئ مخصّص للصلاة", "مع سنة الفجر", "وقيام الليل قبلها", "بخشوع وتدبّر"],
  },
  {
    id: "dhuhr", section: "fard", title: "الظهر", audience: "both", prayer: "Dhuhr",
    levels: [IN_TIME, CONGREGATION, BEFORE_IQAMA, ROWS, FIRST_ROW, "مع سنتها القبلية والبعدية"],
    levelsFemale: [IN_TIME, "في أول وقتها", "في مكان هادئ مخصّص للصلاة", "مع سنتها القبلية والبعدية", "بخشوع وتدبّر"],
  },
  {
    id: "asr", section: "fard", title: "العصر", audience: "both", prayer: "Asr",
    levels: [IN_TIME, CONGREGATION, BEFORE_IQAMA, ROWS, FIRST_ROW, "مع الأربع قبلها"],
    levelsFemale: [IN_TIME, "في أول وقتها", "في مكان هادئ مخصّص للصلاة", "مع الأربع قبلها", "بخشوع وتدبّر"],
  },
  {
    id: "maghrib", section: "fard", title: "المغرب", audience: "both", prayer: "Maghrib",
    levels: [IN_TIME, CONGREGATION, BEFORE_IQAMA, ROWS, FIRST_ROW, "مع سنتها بعدها"],
    levelsFemale: [IN_TIME, "في أول وقتها", "في مكان هادئ مخصّص للصلاة", "مع سنتها بعدها", "بخشوع وتدبّر"],
  },
  {
    id: "isha", section: "fard", title: "العشاء", audience: "both", prayer: "Isha",
    levels: [IN_TIME, CONGREGATION, BEFORE_IQAMA, ROWS, FIRST_ROW, "مع سنتها بعدها", "وختمتُها بالوتر"],
    levelsFemale: [IN_TIME, "في أول وقتها", "في مكان هادئ مخصّص للصلاة", "مع سنتها بعدها", "وختمتُها بالوتر", "بخشوع وتدبّر"],
  },
  // ── Rawatib and nawafil ─────────────────────────────────────────────────
  { id: "rawatib", section: "rawatib", title: "السنن الرواتب (١٢ ركعة)", audience: "both",
    levels: ["سنة الفجر", "ركعتان إلى أربع", "ست إلى ثمان", "كلها اثنتا عشرة ركعة"] },
  { id: "tahiyya", section: "rawatib", title: "تحية المسجد", audience: "male",
    levels: ["صلّيتُها مرة", "كلما دخلتُ المسجد"] },
  { id: "after-adhkar", section: "rawatib", title: "أذكار بعد الصلاة", audience: "both",
    levels: ["بعد صلاة واحدة", "بعد بعض الصلوات", "بعد كل صلاة"] },

  // ── Quran ────────────────────────────────────────────────────────────────
  { id: "quran-read", section: "quran", title: "قراءة القرآن", audience: "both",
    levels: ["قرأتُ آيات", "قرأتُ وجهًا", "أتممتُ وردي", "أتممتُ وردي بتدبّر", "زدتُ على وردي"] },
  { id: "quran-memo", section: "quran", title: "حفظ ومراجعة", audience: "both",
    levels: ["راجعتُ", "حفظتُ جديدًا", "حفظتُ وراجعتُ"] },
  { id: "kahf", section: "quran", title: "سورة الكهف", audience: "both", weekdays: [5],
    levels: ["بعضها", "أتممتُها يوم الجمعة"] },

  // ── Adhkar ───────────────────────────────────────────────────────────────
  { id: "morning", section: "adhkar", title: "أذكار الصباح", audience: "both",
    levels: ["قرأتُها", "قبل طلوع الشمس", "كاملة بتدبّر"] },
  { id: "evening", section: "adhkar", title: "أذكار المساء", audience: "both",
    levels: ["قرأتُها", "قبل غروب الشمس", "كاملة بتدبّر"] },
  { id: "sleep", section: "adhkar", title: "أذكار النوم", audience: "both",
    levels: ["قرأتُ بعضها", "أتممتُها على طهارة"] },
  { id: "istighfar", section: "adhkar", title: "الاستغفار", audience: "both",
    levels: ["مرات قليلة", "مئة مرة", "مئة مرة أو أكثر مع حضور القلب"] },
  { id: "salawat", section: "adhkar", title: "الصلاة على النبي ﷺ", audience: "both",
    levels: ["مرات قليلة", "عشر مرات", "مئة مرة"] },

  // ── Qiyam and duha ───────────────────────────────────────────────────────
  { id: "witr", section: "qiyam", title: "الوتر", audience: "both",
    levels: ["ركعة", "ثلاث ركعات", "خمس فأكثر"] },
  { id: "qiyam", section: "qiyam", title: "قيام الليل", audience: "both",
    levels: ["ركعتان", "أربع ركعات", "ثمانٍ", "أكثر مع طول القيام"] },
  { id: "duha", section: "qiyam", title: "صلاة الضحى", audience: "both",
    levels: ["ركعتان", "أربع", "ثمانٍ"] },

  // ── Siyam ────────────────────────────────────────────────────────────────
  { id: "fast-mon-thu", section: "siyam", title: "صيام الاثنين والخميس", audience: "both", weekdays: [1, 4],
    levels: ["نويتُ من الليل", "صمتُ اليوم"] },

  // ── Heart and character ──────────────────────────────────────────────────
  { id: "tongue", section: "akhlaq", title: "حفظ اللسان", audience: "both",
    levels: ["حاولتُ", "سلمتُ من الغيبة", "سلمتُ من الغيبة وكثر ذكري"] },
  { id: "gaze", section: "akhlaq", title: "غضّ البصر", audience: "both",
    levels: ["حاولتُ", "حفظتُ بصري اليوم"] },
  { id: "parents", section: "akhlaq", title: "برّ الوالدين وصلة الرحم", audience: "both",
    levels: ["سلّمتُ أو اتصلتُ", "خدمتُ أو أهديتُ", "صبرتُ وأحسنتُ رغم الصعوبة"] },
  { id: "charity", section: "akhlaq", title: "الصدقة", audience: "both",
    levels: ["كلمة طيبة أو ابتسامة", "تصدّقتُ بمال", "تصدّقتُ سرًّا"] },
  { id: "dua", section: "akhlaq", title: "الدعاء", audience: "both",
    levels: ["دعوتُ", "دعوتُ لغيري", "دعوتُ في وقت إجابة (سجود/آخر الليل/بين الأذان والإقامة)"] },
];


export type Gender = "male" | "female";

/** The deeds that apply to someone, with the rungs that fit them. */
export function deedsFor(gender: Gender | null | undefined): Deed[] {
  const g = gender ?? "male";
  return DEEDS.filter((d) => d.audience === "both" || d.audience === g).map((d) =>
    g === "female" && d.levelsFemale ? { ...d, levels: d.levelsFemale } : d,
  );
}
