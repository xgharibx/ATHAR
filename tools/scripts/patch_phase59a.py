"""Phase 59a: Settings.tsx and Home.tsx decorative icon aria-hidden."""
import pathlib

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")

patches = [
    # --- Settings.tsx ---
    (
        "src/pages/Settings.tsx",
        [
            # Quick backup strip Download icon
            (
                '          <Download size={12} />\n          نسخ احتياطي',
                '          <Download size={12} aria-hidden="true" />\n          نسخ احتياطي',
                "Settings: Download (strip) aria-hidden"
            ),
            # Sparkles data summary header
            (
                '          <Sparkles size={16} className="text-[var(--accent)]" />\n          <div className="text-sm font-semibold">ملخص بياناتك</div>',
                '          <Sparkles size={16} className="text-[var(--accent)]" aria-hidden="true" />\n          <div className="text-sm font-semibold">ملخص بياناتك</div>',
                "Settings: Sparkles (data summary) aria-hidden"
            ),
            # Globe icon in language section
            (
                '<Globe size={15} className="text-[var(--accent)]" />',
                '<Globe size={15} className="text-[var(--accent)]" aria-hidden="true" />',
                "Settings: Globe aria-hidden"
            ),
            # Sparkles tasbeeh section header
            (
                '          <Sparkles size={18} className="text-[var(--accent)]" />\n          <div className="font-semibold">تجربة التسبیح</div>',
                '          <Sparkles size={18} className="text-[var(--accent)]" aria-hidden="true" />\n          <div className="font-semibold">تجربة التسبیح</div>',
                "Settings: Sparkles (tasbeeh) aria-hidden"
            ),
            # Bell icon in reminders section
            (
                '            <Bell size={18} className="text-[var(--accent)]" />',
                '            <Bell size={18} className="text-[var(--accent)]" aria-hidden="true" />',
                "Settings: Bell aria-hidden"
            ),
            # Download in backup section
            (
                '              <Download size={16} />\n              تصدير',
                '              <Download size={16} aria-hidden="true" />\n              تصدير',
                "Settings: Download (backup) aria-hidden"
            ),
            # Share2 in backup section
            (
                '              <Share2 size={16} />\n              مشاركة',
                '              <Share2 size={16} aria-hidden="true" />\n              مشاركة',
                "Settings: Share2 (backup) aria-hidden"
            ),
            # Upload in restore label
            (
                '                <Upload size={16} />\n                استيراد',
                '                <Upload size={16} aria-hidden="true" />\n                استيراد',
                "Settings: Upload aria-hidden"
            ),
            # Trash2 in danger zone header
            (
                '        <Trash2 size={16} className="text-[var(--danger)]" />\n        <div className="text-sm font-semibold text-[var(--danger)]">منطقة الخطر</div>',
                '        <Trash2 size={16} className="text-[var(--danger)]" aria-hidden="true" />\n        <div className="text-sm font-semibold text-[var(--danger)]">منطقة الخطر</div>',
                "Settings: Trash2 (danger header) aria-hidden"
            ),
            # Trash2 in confirm reset button
            (
                '            <Trash2 size={15} />\n            {confirm === "adhkar"',
                '            <Trash2 size={15} aria-hidden="true" />\n            {confirm === "adhkar"',
                "Settings: Trash2 (confirm button) aria-hidden"
            ),
            # BookMarked in adhkar reset button
            (
                '            <BookMarked size={15} />\n            مسح تقدّم الأذكار',
                '            <BookMarked size={15} aria-hidden="true" />\n            مسح تقدّم الأذكار',
                "Settings: BookMarked aria-hidden"
            ),
            # BookOpen in quran reset button
            (
                '            <BookOpen size={15} />\n            مسح بيانات القرآن',
                '            <BookOpen size={15} aria-hidden="true" />\n            مسح بيانات القرآن',
                "Settings: BookOpen aria-hidden"
            ),
            # Trash2 in all data reset button
            (
                '            <Trash2 size={15} />\n            مسح جميع البيانات',
                '            <Trash2 size={15} aria-hidden="true" />\n            مسح جميع البيانات',
                "Settings: Trash2 (all data) aria-hidden"
            ),
        ]
    ),
    # --- Home.tsx CheckCircle2 in buttons ---
    (
        "src/pages/Home.tsx",
        [
            (
                '                  <CheckCircle2 size={16} />\n                  {isStepDone ? "تم" : "أتممتها"}',
                '                  <CheckCircle2 size={16} aria-hidden="true" />\n                  {isStepDone ? "تم" : "أتممتها"}',
                "Home: DailyBetter step CheckCircle2 aria-hidden"
            ),
            (
                '                    <CheckCircle2 size={16} />\n                    {isDailyWirdDone ? "منجز ↩" : "تم"}',
                '                    <CheckCircle2 size={16} aria-hidden="true" />\n                    {isDailyWirdDone ? "منجز ↩" : "تم"}',
                "Home: DailyWird CheckCircle2 aria-hidden"
            ),
        ]
    ),
]

for rel_path, replacements in patches:
    f = root / rel_path
    src = f.read_text(encoding="utf-8")
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

print("Phase 59a DONE")
