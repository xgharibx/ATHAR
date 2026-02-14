export type DailyChecklistItem = {
  id: string;
  title: string;
  subtitle: string;
  category: "salah" | "quran" | "dhikr" | "akhlaq" | "family" | "sadaqah";
};

export const DAILY_CHECKLIST_ITEMS: DailyChecklistItem[] = [
  { id: "fajr_on_time", title: "صلاة الفجر في وقتها", subtitle: "ابدأ يومك ببركة الصلاة", category: "salah" },
  { id: "five_prayers", title: "المحافظة على الصلوات الخمس", subtitle: "على الأقل في الوقت", category: "salah" },
  { id: "quran_reading", title: "قراءة ورد القرآن", subtitle: "حتى لو كانت صفحات قليلة", category: "quran" },
  { id: "morning_evening", title: "أذكار الصباح والمساء", subtitle: "حصن يومي ثابت", category: "dhikr" },
  { id: "istighfar_100", title: "استغفار 100 مرة", subtitle: "بهدوء وحضور قلب", category: "dhikr" },
  { id: "dua_for_others", title: "دعاء لشخص آخر", subtitle: "بظهر الغيب", category: "akhlaq" },
  { id: "parents_kindness", title: "برّ الوالدين أو صلة الرحم", subtitle: "رسالة أو مكالمة أو خدمة", category: "family" },
  { id: "daily_sadaqah", title: "صدقة يومية", subtitle: "مال أو خدمة أو كلمة طيبة", category: "sadaqah" }
];

export const BETTER_MUSLIM_DAILY_STEPS: string[] = [
  "اليوم: صلِّ ركعتين سنة قبل الفجر مع تدبّر النية.",
  "اليوم: اقرأ صفحة قرآن بعد كل صلاة مفروضة.",
  "اليوم: اجعل أول دقيقة بعد الأذان للاستعداد للصلاة لا للهاتف.",
  "اليوم: أرسل رسالة صلة رحم لشخص لم تتواصل معه منذ مدة.",
  "اليوم: احفظ آية جديدة وكررها في صلاتك.",
  "اليوم: اجعل 10 دقائق محاسبة قبل النوم (ماذا أصلحت؟).",
  "اليوم: تصدّق بشيء تحبه أنت، لا الفائض فقط.",
  "اليوم: اختم يومك بالاستغفار والدعاء للوالدين.",
  "اليوم: امشِ إلى الصلاة أو اذهب مبكراً قدر المستطاع.",
  "اليوم: أخفِ عملاً صالحاً لا يعلمه أحد إلا الله.",
  "اليوم: امتنع عن جدال واحد لله تعالى.",
  "اليوم: اجعل لسانك مشغولاً بالصلاة على النبي ﷺ طوال الطريق.",
  "اليوم: اقرأ تفسير آية واحدة فقط وطبّق معناها عملياً.",
  "اليوم: اغتنم وقت الانتظار بذكر قصير متكرر.",
  "اليوم: سامح شخصاً آذاك واحتسب الأجر عند الله.",
  "اليوم: صلِّ الوتر مهما كان يومك مزدحماً.",
  "اليوم: اجعل نيتك في العمل أو الدراسة عبادة وإتقاناً.",
  "اليوم: أكرم شخصاً في بيتك بكلمة طيبة أو خدمة صامتة.",
  "اليوم: اجعل لك صدقة سرّ إلكترونية ولو قليلة.",
  "اليوم: راجع هدفك الإيماني للشهر واكتب خطوة عملية له."
];

export const RAMADAN_FEATURE_BLOCKS = [
  {
    id: "siyam",
    title: "الصيام الذكي",
    points: ["تذكير نية الصيام", "أذكار قبل الإفطار", "تقييم يوم الصوم"]
  },
  {
    id: "qiyam",
    title: "قيام الليل",
    points: ["هدف ركعات يومي", "تتبع الاستمرارية", "دعاء ختام اليوم"]
  },
  {
    id: "quran",
    title: "خطة ختمة رمضان",
    points: ["تقسيم يومي", "تعويض الفائت", "لوحة إنجاز أسبوعية"]
  }
];

export const LAST_TEN_NIGHTS_GOALS: Array<{ id: string; title: string }> = [
  { id: "qiyam", title: "قيام الليل" },
  { id: "witr", title: "صلاة الوتر" },
  { id: "istighfar", title: "استغفار 100+" },
  { id: "dua", title: "دعاء طويل بخشوع" },
  { id: "quran", title: "ورد قرآن ليلي" },
  { id: "sadaqah", title: "صدقة سر" }
];
