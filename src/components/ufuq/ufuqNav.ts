/**
 * Where everything lives in «أفق».
 *
 * Five tabs carry what people open every day (اليوم، القرآن، الصلاة، السبحة)
 * plus «اكتشف», an index of everything else grouped the way people look for
 * it. The classic design keeps its own bar and menus; nothing here touches it.
 */
import type { LucideIcon } from "lucide-react";
import {
  BarChart3, BookMarked, Brain, Headphones, BookOpen, BookOpenText, Bookmark, Clapperboard, Compass, Droplets, Feather, GraduationCap,
  HandHeart, Heart, History, Landmark, Library, ListChecks, MapPin, MessageCircle, Mic, MoonStar, NotebookPen,
  ScrollText, Settings2, Shield, Sparkles, Star, Sun, TimerReset, Trophy, Users, Zap, Atom, BellRing, Scale, Gem,
} from "lucide-react";

export type UfuqTabId = "today" | "quran" | "prayer" | "tasbeeh" | "explore";

export const UFUQ_TABS: ReadonlyArray<{ id: UfuqTabId; path: string; label: string }> = [
  { id: "today", path: "/", label: "اليوم" },
  { id: "quran", path: "/quran", label: "القرآن" },
  { id: "prayer", path: "/prayer-times", label: "الصلاة" },
  { id: "tasbeeh", path: "/sebha", label: "السبحة" },
  { id: "explore", path: "/explore", label: "اكتشف" },
];

/** Which tab a page belongs to, so the bar always shows where you are. */
export function ufuqTabFor(pathname: string): UfuqTabId {
  if (pathname === "/") return "today";
  if (pathname.startsWith("/c/")) return "today";
  if (pathname.startsWith("/quran") || pathname.startsWith("/listen") || pathname.startsWith("/mushaf") || pathname.startsWith("/tafsir") || pathname.startsWith("/tasmee") || pathname.startsWith("/quran-vocab")) return "quran";
  if (pathname.startsWith("/prayer-times") || pathname.startsWith("/qibla") || pathname.startsWith("/mosques") || pathname.startsWith("/qadaa")) return "prayer";
  if (pathname.startsWith("/sebha")) return "tasbeeh";
  return "explore";
}

/** The tab roots: no back button on these. */
export function isUfuqTabRoot(pathname: string): boolean {
  return UFUQ_TABS.some((tab) => tab.path === pathname);
}

export type UfuqDestination = { path: string; title: string; sub: string; icon: LucideIcon };
export type UfuqGroup = { id: string; title: string; items: UfuqDestination[] };

export const UFUQ_EXPLORE_GROUPS: readonly UfuqGroup[] = [
  {
    id: "quran",
    title: "القرآن وعلومه",
    items: [
      { path: "/quran", title: "القرآن الكريم", sub: "المصحف والتلاوة والتسميع والحفظ والتفسير", icon: BookOpenText },
      { path: "/quran/page", title: "مصحف المدينة", sub: "صفحات المصحف كما طُبعت، مع التلاوة", icon: BookOpen },
      { path: "/listen", title: "السماع", sub: "القرآن كاملًا بأصوات قرّاء العالم وقيام الحرمين والتواشيح", icon: Headphones },
      { path: "/quran/khatma", title: "الختمة وخطتها", sub: "وِرد يومي يوصلك إلى الختم", icon: ListChecks },
      { path: "/quran/tafsir", title: "التفسير", sub: "سبعة تفاسير، آيةً آية", icon: ScrollText },
      { path: "/quran/tasmee", title: "التسميع", sub: "سمِّع حفظك بصوتك، كلمةً كلمة", icon: Mic },
      { path: "/quran/hifz", title: "الحفظ", sub: "خطة حفظ ومراجعة يومية", icon: Brain },
      { path: "/quran-vocab", title: "مفردات القرآن", sub: "كلمة كل يوم ومعناها", icon: Feather },
      { path: "/ijaz", title: "الإعجاز", sub: "آيات وحقائق تأمّل", icon: Atom },
    ],
  },
  {
    id: "hadith",
    title: "الحديث والسيرة",
    items: [
      { path: "/hadith", title: "الأحاديث", sub: "الكتب الستة والأربعون النووية", icon: BookOpen },
      { path: "/library/sharh", title: "الموسوعة الحديثية", sub: "الحديث مع شرحه ودرجته", icon: Library },
      { path: "/seerah", title: "السيرة النبوية", sub: "حياة النبي ﷺ على خطّ الزمن", icon: History },
      { path: "/companions", title: "الصحابة الكرام", sub: "سِيَرهم ومواقفهم", icon: Users },
      { path: "/stories", title: "قصص الأنبياء", sub: "من آدم إلى محمد عليهم السلام", icon: Star },
    ],
  },
  {
    id: "dua",
    title: "الدعاء والذكر",
    items: [
      { path: "/duas", title: "الأدعية المأثورة", sub: "من القرآن والسنة", icon: HandHeart },
      { path: "/asma", title: "أسماء الله الحسنى", sub: "معانيها وآثارها", icon: Sparkles },
      { path: "/ruqyah", title: "الرقية الشرعية", sub: "آيات وأدعية الرقية", icon: Shield },
      { path: "/adhkar/custom", title: "أذكاري الخاصة", sub: "أذكار تضيفها بنفسك", icon: Bookmark },
      { path: "/wird", title: "وِردي", sub: "أعمالك اليومية في مكان واحد", icon: Sun },
      { path: "/muhasaba", title: "المحاسبة", sub: "وقفة مع النفس كل ليلة", icon: NotebookPen },
    ],
  },
  {
    id: "prayer",
    title: "الصلاة",
    items: [
      { path: "/qibla", title: "اتجاه القبلة", sub: "بوصلة دقيقة", icon: Compass },
      { path: "/mosques", title: "المساجد القريبة", sub: "على الخريطة مع الاتجاهات", icon: MapPin },
      { path: "/qadaa", title: "قضاء الفوائت", sub: "خطة لقضاء ما فات", icon: TimerReset },
      { path: "/prayer-guide", title: "كيفية الصلاة", sub: "خطوة بخطوة", icon: Landmark },
      { path: "/wudu", title: "كيفية الوضوء", sub: "خطوة بخطوة", icon: Droplets },
      { path: "/reminders", title: "التذكيرات", sub: "مواعيد تذكّرك بما تحب", icon: BellRing },
    ],
  },
  {
    id: "learn",
    title: "تعلّم وشاهد",
    items: [
      { path: "/library", title: "المكتبة الإسلامية", sub: "كتب ومتون", icon: BookMarked },
      { path: "/video-library", title: "الدورات", sub: "دروس مرئية مرتّبة", icon: Clapperboard },
      { path: "/shorts", title: "مقاطع قصيرة", sub: "دقيقة تنفعك", icon: Zap },
      { path: "/islam-pillars", title: "أركان الإسلام", sub: "الخمسة التي بُني عليها", icon: Landmark },
      { path: "/faith-pillars", title: "أركان الإيمان", sub: "الستة وشرحها", icon: Gem },
      { path: "/faith-branches", title: "شُعَب الإيمان", sub: "بضع وسبعون شعبة", icon: GraduationCap },
      { path: "/major-sins", title: "الكبائر", sub: "لتجتنبها", icon: Scale },
      { path: "/angels", title: "الملائكة", sub: "أسماؤهم وأعمالهم", icon: MoonStar },
      { path: "/divine-books", title: "الكتب السماوية", sub: "ما أنزل الله على رسله", icon: ScrollText },
    ],
  },
  {
    id: "you",
    title: "أنت",
    items: [
      { path: "/companion", title: "أثر — رفيقك", sub: "اسأل عن دينك بهدوء", icon: MessageCircle },
      { path: "/insights", title: "الإحصاءات", sub: "تقدّمك على مدى الأيام", icon: BarChart3 },
      { path: "/favorites", title: "المفضلة", sub: "ما حفظته لتعود إليه", icon: Heart },
      { path: "/leaderboard", title: "المتصدرون", sub: "تنافس في الخير", icon: Trophy },
      { path: "/settings", title: "الإعدادات", sub: "التصميم والتنبيهات وكل شيء", icon: Settings2 },
    ],
  },
];

/** Titles for the top bar, in the words of each page. */
const TITLES: Record<string, string> = {
  "/": "اليوم",
  "/explore": "اكتشف",
  "/quran": "القرآن الكريم",
  "/quran/index": "المصحف",
  "/quran/khatma": "الختمة",
  "/quran/marks": "علاماتي",
  "/quran/search": "البحث في القرآن",
  "/quran/roots": "معجم الجذور",
  "/quran/numbers": "القرآن بالأرقام",
  "/quran/hifz": "الحفظ",
  "/quran/hifz/similar": "المتشابهات",
  "/quran/tasmee": "التسميع",
  "/quran/tafsir": "التفسير",
  "/quran/downloads": "التنزيلات",
  "/sebha": "السبحة",
  "/companion": "أثر",
  "/library/sharh": "الموسوعة الحديثية",
  "/tasmee": "التسميع",
  "/prayer-times": "الصلاة",
  "/search": "البحث",
  "/favorites": "المفضلة",
  "/insights": "الإحصاءات",
  "/settings": "الإعدادات",
  "/leaderboard": "المتصدرون",
  "/sources": "المصادر",
  "/asma": "أسماء الله الحسنى",
  "/duas": "الأدعية المأثورة",
  "/quran-vocab": "مفردات القرآن",
  "/stories": "قصص الأنبياء",
  "/prayer-guide": "كيفية الصلاة",
  "/wudu": "كيفية الوضوء",
  "/mosques": "المساجد القريبة",
  "/qibla": "القبلة",
  "/video-library": "الدورات",
  "/library": "المكتبة",
  "/hadith": "الأحاديث",
  "/hadith/memo": "مراجعة الأحاديث",
  "/companions": "الصحابة الكرام",
  "/seerah": "السيرة النبوية",
  "/adhkar/custom": "أذكاري الخاصة",
  "/ruqyah": "الرقية الشرعية",
  "/qadaa": "قضاء الفوائت",
  "/wird": "وِردي",
  "/muhasaba": "المحاسبة",
  "/reminders": "التذكيرات",
  "/tafsir": "التفسير",
  "/shorts": "مقاطع قصيرة",
};

export function ufuqTitleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]!;
  if (pathname.startsWith("/settings/")) return "الإعدادات";
  if (pathname.startsWith("/quran/tafsir/")) return "التفسير";
  if (pathname.startsWith("/quran/roots/")) return "الجذر";
  if (pathname.startsWith("/quran")) return "القرآن الكريم";
  if (pathname.startsWith("/listen")) {
    const sub: Record<string, string> = {
      reciters: "قرّاء العالم", reciter: "القارئ", surah: "سورة بأصوات القرّاء", golden: "التسجيلات الذهبية",
      qiyam: "قيام الليل في الحرمين", tawasheeh: "التواشيح والابتهالات", album: "التواشيح", favorites: "المفضّلة",
      playlist: "قائمتك", stats: "أثر سماعك",
    };
    return sub[pathname.split("/")[2] ?? ""] ?? "السماع";
  }
  if (pathname.startsWith("/hadith/")) return "الحديث";
  if (pathname.startsWith("/library/")) return "المكتبة";
  if (pathname.startsWith("/video-library/")) return "الدورات";
  if (pathname.startsWith("/c/")) return "الأذكار";
  for (const group of UFUQ_EXPLORE_GROUPS) {
    const hit = group.items.find((item) => item.path === pathname);
    if (hit) return hit.title;
  }
  return "أثر";
}
