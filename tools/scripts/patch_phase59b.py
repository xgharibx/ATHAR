"""Phase 59b: Insights.tsx section header icons aria-hidden."""
import pathlib

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")
f = root / "src/pages/Insights.tsx"
src = f.read_text(encoding="utf-8")

replacements = [
    # Zap in XP level badge
    (
        '<Zap size={13} style={{ color: xpLevel.color }} />',
        '<Zap size={13} style={{ color: xpLevel.color }} aria-hidden="true" />',
        "Insights: Zap aria-hidden"
    ),
    # TrendingUp in streak section header
    (
        '<TrendingUp size={16} className="text-[var(--accent)]" />\n              <div className="text-xs opacity-60">الإحصائيات</div>',
        '<TrendingUp size={16} className="text-[var(--accent)]" aria-hidden="true" />\n              <div className="text-xs opacity-60">الإحصائيات</div>',
        "Insights: TrendingUp (streak header) aria-hidden"
    ),
    # Flame in activity card header
    (
        '<Flame size={16} className="text-[var(--accent)]" />\n          <div className="font-semibold text-sm">نشاط الأذكار</div>',
        '<Flame size={16} className="text-[var(--accent)]" aria-hidden="true" />\n          <div className="font-semibold text-sm">نشاط الأذكار</div>',
        "Insights: Flame (activity header) aria-hidden"
    ),
    # TrendingUp in week activity card header
    (
        '<TrendingUp size={16} className="text-[var(--accent)]" />\n          <div className="font-semibold text-sm">نشاط الأسبوع</div>',
        '<TrendingUp size={16} className="text-[var(--accent)]" aria-hidden="true" />\n          <div className="font-semibold text-sm">نشاط الأسبوع</div>',
        "Insights: TrendingUp (week activity header) aria-hidden"
    ),
    # BookOpen in Quran stats header
    (
        '<BookOpen size={16} className="text-[var(--accent)]" />\n              <div className="font-semibold text-sm">إحصاءات القرآن</div>',
        '<BookOpen size={16} className="text-[var(--accent)]" aria-hidden="true" />\n              <div className="font-semibold text-sm">إحصاءات القرآن</div>',
        "Insights: BookOpen (Quran stats header) aria-hidden"
    ),
    # Flame in Quran streak badge
    (
        '<Flame size={11} className="text-[var(--accent)]" />\n                <span className="tabular-nums">',
        '<Flame size={11} className="text-[var(--accent)]" aria-hidden="true" />\n                <span className="tabular-nums">',
        "Insights: Flame (quran streak badge) aria-hidden"
    ),
    # Target in Quran daily goal progress
    (
        '<Target size={11} />\n                <span>هدف اليوم:',
        '<Target size={11} aria-hidden="true" />\n                <span>هدف اليوم:',
        "Insights: Target (quran daily goal) aria-hidden"
    ),
    # BookOpen in Quran 7-day chart header
    (
        '<BookOpen size={14} className="text-[var(--accent)]" />',
        '<BookOpen size={14} className="text-[var(--accent)]" aria-hidden="true" />',
        "Insights: BookOpen (quran 7-day header) aria-hidden"
    ),
    # Target in prayer consistency header
    (
        '<Target size={14} className="text-[var(--accent)]" />\n          <div className="font-semibold text-sm">ثبات الصلاة</div>',
        '<Target size={14} className="text-[var(--accent)]" aria-hidden="true" />\n          <div className="font-semibold text-sm">ثبات الصلاة</div>',
        "Insights: Target (prayer consistency header) aria-hidden"
    ),
    # BarChart2 first instance (category radar)
    (
        '<BarChart2 size={14} className="text-[var(--accent)]" />\n            <div className="font-semibold text-sm">مخطط الأقسام</div>',
        '<BarChart2 size={14} className="text-[var(--accent)]" aria-hidden="true" />\n            <div className="font-semibold text-sm">مخطط الأقسام</div>',
        "Insights: BarChart2 (category radar) aria-hidden"
    ),
    # Trophy in summary button
    (
        '<Trophy size={15} />\n            ترتيبي',
        '<Trophy size={15} aria-hidden="true" />\n            ترتيبي',
        "Insights: Trophy aria-hidden"
    ),
    # BookOpen in another section (lines ~1493, 1548)
    (
        '<BookOpen size={16} className="text-[var(--accent)]" />\n            <div className="font-semibold text-sm">',
        '<BookOpen size={16} className="text-[var(--accent)]" aria-hidden="true" />\n            <div className="font-semibold text-sm">',
        "Insights: BookOpen (other section headers) aria-hidden"
    ),
]

for old, new, label in replacements:
    count = src.count(old)
    if count == 1:
        src = src.replace(old, new, 1)
        print(f"  patched {label}")
    elif count == 0:
        print(f"  SKIP: {label} not found")
    else:
        src = src.replace(old, new)
        print(f"  patched {label} ({count} occurrences)")

f.write_text(src, encoding="utf-8")
print("Phase 59b DONE")
