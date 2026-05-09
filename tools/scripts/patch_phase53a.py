"""Patch Phase 53:
1. QuranPlans custom days input - add aria-label + aria-describedby
2. Leaderboard friend code import input - add aria-label
3. PrayerTimesPageSkeleton - add role=status + aria-label
4. RouteErrorBoundary - add role=alert to error display
"""
import re

# ─── 1. QuranPlans.tsx ───────────────────────────────────────────────────────
path1 = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\QuranPlans.tsx'
content = open(path1, encoding='utf-8').read()

old1 = '''            <div className="flex gap-2">
              <input
                type="number"
                value={customDays}
                min={7}
                max={730}
                onChange={(e) => setCustomDays(e.target.value)}
                inputMode="numeric"
                className="flex-1 bg-[var(--card)] border border-[var(--stroke)] rounded-2xl px-3 py-2 text-sm text-right focus:outline-none focus:border-accent-60"
                placeholder="عدد الأيام"
              />'''

new1 = '''            <div className="flex gap-2">
              <input
                type="number"
                value={customDays}
                min={7}
                max={730}
                onChange={(e) => setCustomDays(e.target.value)}
                inputMode="numeric"
                className="flex-1 bg-[var(--card)] border border-[var(--stroke)] rounded-2xl px-3 py-2 text-sm text-right focus:outline-none focus:border-accent-60"
                placeholder="عدد الأيام"
                aria-label="عدد أيام الخطة المخصصة"
                aria-describedby="custom-days-hint"
              />'''

if old1 in content:
    content = content.replace(old1, new1, 1)
    # Add id to the hint text div
    old1b = '''            <div className="text-[10px] opacity-40 mt-1 text-right">
              {Number(customDays) > 0
                ? `${toArabicNumeral(Math.ceil(TOTAL_QURAN_AYAHS / Math.max(1, Number(customDays))))} آية يومياً`
                : "أدخل عدداً بين ٧ و٧٣٠"}
            </div>'''
    new1b = '''            <div id="custom-days-hint" className="text-[10px] opacity-40 mt-1 text-right">
              {Number(customDays) > 0
                ? `${toArabicNumeral(Math.ceil(TOTAL_QURAN_AYAHS / Math.max(1, Number(customDays))))} آية يومياً`
                : "أدخل عدداً بين ٧ و٧٣٠"}
            </div>'''
    if old1b in content:
        content = content.replace(old1b, new1b, 1)
        print("QuranPlans: PATCHED input + hint id")
    else:
        print("QuranPlans: input patched but hint div NOT found")
else:
    print("QuranPlans: OLD not found")
open(path1, 'w', encoding='utf-8').write(content)


# ─── 2. Leaderboard.tsx - friend code import input ──────────────────────────
path2 = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Leaderboard.tsx'
content2 = open(path2, encoding='utf-8').read()

old2 = '''              <Input
                value={importCode}
                onChange={(e) => { setImportCode(e.target.value); setImportError(""); }}
                placeholder="الصق كود الصديق هنا"
              />'''

new2 = '''              <Input
                value={importCode}
                onChange={(e) => { setImportCode(e.target.value); setImportError(""); }}
                placeholder="الصق كود الصديق هنا"
                aria-label="رمز الصديق للإضافة"
              />'''

if old2 in content2:
    content2 = content2.replace(old2, new2, 1)
    print("Leaderboard: PATCHED friend code input")
else:
    print("Leaderboard: OLD not found")
open(path2, 'w', encoding='utf-8').write(content2)


# ─── 3. Skeleton.tsx - PrayerTimesPageSkeleton role=status ──────────────────
path3 = r'c:\Users\Amrab\Downloads\noor-adhkar\src\components\ui\Skeleton.tsx'
content3 = open(path3, encoding='utf-8').read()

old3 = '''/** Prayer times page skeleton */
export function PrayerTimesPageSkeleton() {
  return (
    <div className="space-y-4">'''

new3 = '''/** Prayer times page skeleton */
export function PrayerTimesPageSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="جارٍ تحميل مواقيت الصلاة…">
      <span className="sr-only">جارٍ تحميل مواقيت الصلاة…</span>'''

if old3 in content3:
    content3 = content3.replace(old3, new3, 1)
    print("Skeleton: PATCHED PrayerTimesPageSkeleton role=status")
else:
    print("Skeleton: PrayerTimesPageSkeleton NOT found")
open(path3, 'w', encoding='utf-8').write(content3)


# ─── 4. App.tsx - RouteErrorBoundary error div role=alert ───────────────────
path4 = r'c:\Users\Amrab\Downloads\noor-adhkar\src\App.tsx'
content4 = open(path4, encoding='utf-8').read()

old4 = '''      return (
        <div dir="rtl" className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
          <div className="text-2xl">!</div>
          <div className="text-base font-semibold opacity-90">حدث خطأ في هذه الصفحة</div>
          <button type="button"
            className="px-4 py-2 rounded-2xl bg-[var(--card)] border border-[var(--stroke)] text-sm"
            onClick={() => this.setState({ hasError: false })}
          >
            إعادة المحاولة
          </button>
        </div>'''

new4 = '''      return (
        <div dir="rtl" role="alert" className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
          <div className="text-2xl" aria-hidden="true">!</div>
          <div className="text-base font-semibold opacity-90">حدث خطأ في هذه الصفحة</div>
          <button type="button"
            className="px-4 py-2 rounded-2xl bg-[var(--card)] border border-[var(--stroke)] text-sm"
            onClick={() => this.setState({ hasError: false })}
            aria-label="إعادة المحاولة لتحميل الصفحة"
          >
            إعادة المحاولة
          </button>
        </div>'''

if old4 in content4:
    content4 = content4.replace(old4, new4, 1)
    print("App.tsx: PATCHED RouteErrorBoundary role=alert")
else:
    print("App.tsx: OLD not found")
open(path4, 'w', encoding='utf-8').write(content4)

print("\nAll patches done!")
