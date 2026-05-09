"""Phase 59b fix: remaining BarChart2 and BookOpen icons in Insights.tsx."""
import pathlib

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")
f = root / "src/pages/Insights.tsx"
src = f.read_text(encoding="utf-8")

replacements = [
    # BarChart2 at line 1606 - section progress
    (
        '<BarChart2 size={14} className="text-[var(--accent)]" />\n            <div className="text-xs font-semibold opacity-65">تقدم الأقسام</div>',
        '<BarChart2 size={14} className="text-[var(--accent)]" aria-hidden="true" />\n            <div className="text-xs font-semibold opacity-65">تقدم الأقسام</div>',
        "Insights: BarChart2 (section progress) aria-hidden"
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
print("Phase 59b fix DONE")
