"""Phase 66: Add document title management on route change in AppShell."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src/components/layout/AppShell.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

old = """  // A11y: move focus to main content on route change (SPA navigation)
  React.useEffect(() => {
    const main = document.getElementById('main-content');
    if (main) main.focus({ preventScroll: false });
  }, [location.pathname]);"""

new = """  // A11y: update document title + move focus to main on route change (WCAG 2.4.2)
  React.useEffect(() => {
    const PAGE_TITLES: Record<string, string> = {
      "/": "الرئيسية",
      "/quran": "القرآن الكريم",
      "/quran/plans": "خطط التلاوة",
      "/sebha": "السبحة الرقمية",
      "/prayer-times": "مواقيت الصلاة",
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
      "/qibla": "اتجاه القبلة",
      "/video-library": "مكتبة الفيديو",
      "/library": "المكتبة الإسلامية",
      "/hadith": "كتب الحديث",
      "/hadith/memo": "مراجعة الأحاديث",
      "/companions": "الصحابة الكرام",
      "/seerah": "السيرة النبوية",
      "/adhkar/custom": "أذكاري الخاصة",
      "/ruqyah": "الرقية الشرعية",
    };
    const p = location.pathname;
    const exact = PAGE_TITLES[p];
    let label = exact;
    if (!label) {
      if (p.startsWith("/mushaf")) label = "المصحف الشريف";
      else if (p.startsWith("/hadith/")) label = "قارئ الحديث";
      else if (p.startsWith("/library/")) label = "المكتبة الإسلامية";
      else if (p.startsWith("/video-library/")) label = "مكتبة الفيديو";
    }
    document.title = label ? `${label} — أثر` : "أثر";
    const main = document.getElementById('main-content');
    if (main) main.focus({ preventScroll: false });
  }, [location.pathname]);"""

if old in c:
    c = c.replace(old, new)
    print('  OK  [AppShell] document title management')
else:
    print('  MISS[AppShell] document title management')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('\nDone.')
