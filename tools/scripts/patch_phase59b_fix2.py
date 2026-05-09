"""Phase 59b fix2: remaining BookOpen and Share2 icons in Insights.tsx."""
import pathlib

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")
f = root / "src/pages/Insights.tsx"
src = f.read_text(encoding="utf-8")

replacements = [
    # BookOpen in Quran khatma card
    (
        '<BookOpen size={16} className="text-[var(--accent)]" />\n              <div className="font-semibold text-sm">خريطة ختمة القرآن</div>',
        '<BookOpen size={16} className="text-[var(--accent)]" aria-hidden="true" />\n              <div className="font-semibold text-sm">خريطة ختمة القرآن</div>',
        "Insights: BookOpen (khatma header) aria-hidden"
    ),
    # Share2 in share Quran progress button (already has text)
    (
        '<Share2 size={14} />\n              {quranSharing ?',
        '<Share2 size={14} aria-hidden="true" />\n              {quranSharing ?',
        "Insights: Share2 (quran progress share) aria-hidden"
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
print("Phase 59b fix2 DONE")
