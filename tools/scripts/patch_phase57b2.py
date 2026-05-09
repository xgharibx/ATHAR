"""Patch Insights quranLast7Days bar chart."""
import pathlib

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")
f = root / "src/pages/Insights.tsx"
src = f.read_text(encoding="utf-8")

old = '              <div className="flex items-end gap-1.5" style={{ height: "64px" }}>\n                {quranLast7Days.map((day) => {'
new = '              <div className="flex items-end gap-1.5" style={{ height: "64px" }} role="img" aria-label="مخطط قراءة القرآن: آخر ٧ أيام">\n                {quranLast7Days.map((day) => {'

if old in src:
    src = src.replace(old, new, 1)
    f.write_text(src, encoding="utf-8")
    print("patched quranLast7Days chart")
else:
    print("SKIP: pattern not found")
    idx = src.find("quranLast7Days.map")
    if idx >= 0:
        print(repr(src[max(0, idx-200):idx+50]))
