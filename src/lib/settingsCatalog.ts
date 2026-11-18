/**
 * Settings, as the person finds it: ten groups on the first page, each with
 * its own page, and every option listed here with the words people type, so
 * search lands on the option itself («الأذان», «قفل», «اهتزاز», «القارئ»…)
 * rather than on a whole section.
 */

export type SettingsGroupId =
  | "prayer"
  | "reminders"
  | "quran"
  | "tasbeeh"
  | "appearance"
  | "home"
  | "privacy"
  | "data"
  | "about";

export type SettingsGroup = {
  id: SettingsGroupId;
  title: string;
  /** Under the title on the first page when there is no live summary. */
  description: string;
};

export const SETTINGS_GROUPS: readonly SettingsGroup[] = [
  { id: "prayer", title: "الصلاة", description: "المواقيت والأذان والتنبيهات" },
  { id: "reminders", title: "التذكيرات", description: "الأذكار والورد والختمة" },
  { id: "quran", title: "القرآن", description: "القارئ والخط والترجمة" },
  { id: "tasbeeh", title: "التسبيح", description: "الاهتزاز والهدف اليومي" },
  { id: "appearance", title: "المظهر", description: "التصميم والسمة والنص" },
  { id: "home", title: "الصفحة الرئيسية", description: "البطاقات وترتيبها" },
  { id: "privacy", title: "الخصوصية والأمان", description: "قفل التطبيق والذكاء الاصطناعي" },
  { id: "data", title: "البيانات", description: "النسخ الاحتياطي والمسح" },
  { id: "about", title: "عن أثر", description: "الإصدار والتقييم والتواصل" },
];

export type SettingsItem = {
  /** Anchor on the group's page: id="setting-<id>". */
  id: string;
  group: SettingsGroupId;
  title: string;
  keywords: string[];
};

export const SETTINGS_ITEMS: readonly SettingsItem[] = [
  // الصلاة
  { id: "calc-method", group: "prayer", title: "طريقة الحساب", keywords: ["حساب المواقيت", "أم القرى", "الهيئة المصرية", "method", "calculation"] },
  { id: "asr", group: "prayer", title: "وقت العصر", keywords: ["المذهب", "حنفي", "شافعي", "asr", "madhab"] },
  { id: "location", group: "prayer", title: "الموقع", keywords: ["المدينة", "GPS", "موقعي", "location", "city"] },
  { id: "travel", group: "prayer", title: "تحديث الموقع عند السفر", keywords: ["سفر", "مدينة جديدة", "travel"] },
  { id: "adjust", group: "prayer", title: "تعديل المواقيت بالدقائق", keywords: ["تقديم", "تأخير", "دقيقة", "ضبط المواقيت", "adjust", "minutes"] },
  { id: "hijri", group: "prayer", title: "تعديل التاريخ الهجري", keywords: ["الهجري", "رؤية الهلال", "يوم", "hijri", "date"] },
  { id: "prayer-alerts", group: "prayer", title: "تنبيهات الصلوات", keywords: ["الأذان", "إشعار الصلاة", "تنبيه", "adhan", "azan", "notification"] },
  { id: "adhan-sound", group: "prayer", title: "صوت الأذان", keywords: ["المؤذن", "الأذان", "صوت", "adhan sound"] },
  { id: "adhan-alarm", group: "prayer", title: "الأذان كمنبّه", keywords: ["منبه", "الوضع الصامت", "alarm"] },
  { id: "prayer-silence", group: "prayer", title: "صامت أثناء الصلاة", keywords: ["عدم الإزعاج", "صامت", "المسجد", "silence", "dnd"] },
  { id: "countdown", group: "prayer", title: "عدّاد الصلاة القادمة", keywords: ["عد تنازلي", "شاشة القفل", "الجزيرة التفاعلية", "رمضان", "الإفطار", "السحور", "countdown"] },

  // التذكيرات
  { id: "notifications-permission", group: "reminders", title: "إذن الإشعارات", keywords: ["الإشعارات", "السماح", "إعدادات الهاتف", "permission", "notifications"] },
  { id: "daily-reminders", group: "reminders", title: "التذكيرات اليومية", keywords: ["تذكير", "تذكيرات", "reminders"] },
  { id: "morning", group: "reminders", title: "أذكار الصباح", keywords: ["الصباح", "morning"] },
  { id: "evening", group: "reminders", title: "أذكار المساء", keywords: ["المساء", "evening"] },
  { id: "wird", group: "reminders", title: "الورد اليومي", keywords: ["ورد", "القرآن", "wird"] },
  { id: "khatma", group: "reminders", title: "خطة الختمة", keywords: ["ختمة", "ختم", "khatma"] },
  { id: "tasbeeh-reminder", group: "reminders", title: "تسبيح واستغفار", keywords: ["استغفار", "تسبيح"] },
  { id: "hadith", group: "reminders", title: "حديث الفجر اليومي", keywords: ["حديث", "الفجر", "hadith"] },
  { id: "reminder-sound", group: "reminders", title: "صوت التذكير", keywords: ["نغمة", "صوت", "الطيور", "sound"] },
  { id: "custom-reminders", group: "reminders", title: "تذكيراتي المخصّصة", keywords: ["تذكير مخصص", "الذكاء الاصطناعي", "custom"] },

  // القرآن
  { id: "reciter", group: "quran", title: "القارئ", keywords: ["الشيخ", "التلاوة", "صوت القارئ", "reciter"] },
  { id: "downloads", group: "quran", title: "التلاوات المحفوظة", keywords: ["تنزيل", "تحميل", "بدون إنترنت", "مساحة", "download", "offline"] },
  { id: "quran-font", group: "quran", title: "حجم خط المصحف", keywords: ["خط القرآن", "حجم", "font"] },
  { id: "quran-line", group: "quran", title: "تباعد سطور المصحف", keywords: ["تباعد", "السطور"] },
  { id: "translation", group: "quran", title: "ترجمة القرآن", keywords: ["ترجمة", "إنجليزي", "أردو", "translation", "english", "urdu"] },

  // التسبيح
  { id: "haptics", group: "tasbeeh", title: "الاهتزاز", keywords: ["اهتزاز", "قوة الاهتزاز", "haptic", "vibration"] },
  { id: "auto-advance", group: "tasbeeh", title: "الانتقال التلقائي", keywords: ["الذكر التالي", "تلقائي"] },
  { id: "sebha-goal", group: "tasbeeh", title: "هدف السبحة اليومي", keywords: ["هدف", "السبحة", "goal"] },
  { id: "health", group: "tasbeeh", title: "دقائق ذهنية في تطبيق الصحة", keywords: ["الصحة", "Apple Health", "health", "mindful"] },

  // المظهر
  { id: "design", group: "appearance", title: "تصميم التطبيق", keywords: ["تصميم", "التصميم الجديد", "أفق", "الكلاسيكي", "القديم", "شكل التطبيق", "design", "new design", "classic"] },
  { id: "ufuq-palette", group: "appearance", title: "ألوان أُفُق", keywords: ["نهار", "ليل", "داكن", "فاتح", "ليلي", "أفق"] },
  { id: "theme", group: "appearance", title: "السمة", keywords: ["ثيم", "لون", "داكن", "فاتح", "ليلي", "theme", "dark", "light"] },
  { id: "accent", group: "appearance", title: "لون مخصّص", keywords: ["لون", "accent", "color"] },
  { id: "app-icon", group: "appearance", title: "أيقونة التطبيق", keywords: ["أيقونة", "icon"] },
  { id: "text-size", group: "appearance", title: "حجم النص", keywords: ["خط", "حجم الخط", "تكبير", "font size"] },
  { id: "line-height", group: "appearance", title: "تباعد السطور", keywords: ["تباعد", "السطور"] },
  { id: "effects", group: "appearance", title: "المؤثرات", keywords: ["ثلاثية الأبعاد", "الشفاف", "الحركة", "تباين", "3d", "motion"] },
  { id: "benefits", group: "appearance", title: "فضل الذكر", keywords: ["الفضل", "الفوائد", "الدليل"] },
  { id: "keep-awake", group: "appearance", title: "إبقاء الشاشة مضاءة", keywords: ["الشاشة", "إطفاء", "awake", "screen"] },

  // الصفحة الرئيسية
  { id: "home-cards", group: "home", title: "بطاقات الصفحة الرئيسية", keywords: ["الرئيسية", "بطاقات", "ترتيب", "home", "widgets"] },

  // الخصوصية والأمان
  { id: "app-lock", group: "privacy", title: "قفل التطبيق", keywords: ["قفل", "بصمة", "بصمة الوجه", "Face ID", "lock", "biometric"] },
  { id: "ai", group: "privacy", title: "الذكاء الاصطناعي", keywords: ["أثر", "الرفيق", "خصوصية", "AI"] },
  { id: "privacy-policy", group: "privacy", title: "سياسة الخصوصية", keywords: ["الخصوصية", "privacy"] },

  // البيانات
  { id: "backup", group: "data", title: "النسخ الاحتياطي", keywords: ["نسخة", "حفظ", "استعادة", "استيراد", "تصدير", "backup", "restore"] },
  { id: "clear", group: "data", title: "مسح البيانات", keywords: ["مسح", "حذف", "إعادة تعيين", "reset", "delete", "clear"] },

  // عن أثر
  { id: "version", group: "about", title: "الإصدار", keywords: ["نسخة التطبيق", "version"] },
  { id: "rate", group: "about", title: "قيّم أثر", keywords: ["تقييم", "المتجر", "rate"] },
  { id: "share-app", group: "about", title: "شارك أثر", keywords: ["مشاركة التطبيق", "دعوة", "share"] },
  { id: "contact", group: "about", title: "تواصل معنا", keywords: ["اقتراح", "مشكلة", "ملاحظات", "feedback", "contact"] },
  { id: "terms", group: "about", title: "شروط الاستخدام", keywords: ["الشروط", "terms"] },
];

/** Letters reduced to one form, no diacritics or tatweel, and no leading «ال». */
export function normalizeSettingsText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ی/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

function words(text: string): string[] {
  return normalizeSettingsText(text)
    .split(" ")
    .filter(Boolean)
    .map((word) => (word.length > 3 && word.startsWith("ال") ? word.slice(2) : word));
}

/** A typed word matches a word that holds it, or that it extends («احتياطية» → «احتياطي»). */
function matches(word: string, typed: string): boolean {
  return word.includes(typed) || (word.length >= 4 && typed.startsWith(word));
}

export type SettingsSearchResult = { item: SettingsItem; group: SettingsGroup };

/** Options whose title or keywords hold every word typed, best matches first. */
export function searchSettings(query: string): SettingsSearchResult[] {
  const wanted = words(query);
  if (wanted.length === 0) return [];
  const scored: Array<SettingsSearchResult & { score: number }> = [];
  for (const item of SETTINGS_ITEMS) {
    const group = SETTINGS_GROUPS.find((g) => g.id === item.group)!;
    const titleWords = words(item.title);
    const haystack = [...titleWords, ...item.keywords.flatMap(words), ...words(group.title)];
    const hits = wanted.every((w) => haystack.some((h) => matches(h, w)));
    if (!hits) continue;
    const inTitle = wanted.every((w) => titleWords.some((h) => matches(h, w)));
    scored.push({ item, group, score: inTitle ? 0 : 1 });
  }
  return scored.sort((a, b) => a.score - b.score).map(({ item, group }) => ({ item, group }));
}
