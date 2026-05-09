"""Phase 57a: Add role=list/aria-label to Search.tsx result containers."""
import pathlib

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")
f = root / "src/pages/Search.tsx"
src = f.read_text(encoding="utf-8")

replacements = [
    # 1. Dhikr results list
    (
        '          <div className="space-y-2">\n            {results.map((r) => {',
        '          <div className="space-y-2" role="list" aria-label="نتائج الأذكار">\n            {results.map((r) => {',
        "Search: dhikr results role=list"
    ),
    # 2. Quran results list
    (
        '          <div className="space-y-2">\n            {quranResults.map((r, idx) =>',
        '          <div className="space-y-2" role="list" aria-label="نتائج القرآن">\n            {quranResults.map((r, idx) =>',
        "Search: quran results role=list"
    ),
    # 3. Library results list
    (
        '          <div className="space-y-2">\n            {libraryResults.map((entry) => (',
        '          <div className="space-y-2" role="list" aria-label="نتائج المكتبة">\n            {libraryResults.map((entry) => (',
        "Search: library results role=list"
    ),
    # 4. Hadith results list
    (
        '          <div className="space-y-2">\n            {hadithResults.map((h) => {',
        '          <div className="space-y-2" role="list" aria-label="نتائج الحديث">\n            {hadithResults.map((h) => {',
        "Search: hadith results role=list"
    ),
]

for old, new, label in replacements:
    if old in src:
        src = src.replace(old, new, 1)
        print(f"  patched {label}")
    else:
        print(f"  SKIP: {label} not found")

f.write_text(src, encoding="utf-8")
print("Phase 57a DONE")
