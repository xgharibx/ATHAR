"""
Add page-enter animation class to the 10 pages missing it.
"""
import os

ROOT = r"C:\Users\Amrab\Downloads\noor-adhkar"

# Each tuple: (relative file path, old string, new string)
FIXES = [
    # Pattern: min-h-screen-safe pb-32, dir="rtl" first
    (
        "src/pages/AsmaAlHusna.tsx",
        '<div dir="rtl" className="min-h-screen-safe pb-32">',
        '<div dir="rtl" className="min-h-screen-safe pb-32 page-enter">',
    ),
    (
        "src/pages/Duas.tsx",
        '<div dir="rtl" className="min-h-screen-safe pb-32">',
        '<div dir="rtl" className="min-h-screen-safe pb-32 page-enter">',
    ),
    (
        "src/pages/PrayerGuide.tsx",
        '<div dir="rtl" className="min-h-screen-safe pb-32">',
        '<div dir="rtl" className="min-h-screen-safe pb-32 page-enter">',
    ),
    (
        "src/pages/ProphetStories.tsx",
        '<div dir="rtl" className="min-h-screen-safe pb-32">',
        '<div dir="rtl" className="min-h-screen-safe pb-32 page-enter">',
    ),
    (
        "src/pages/QuranVocab.tsx",
        '<div dir="rtl" className="min-h-screen-safe pb-32">',
        '<div dir="rtl" className="min-h-screen-safe pb-32 page-enter">',
    ),
    (
        "src/pages/WuduGuide.tsx",
        '<div dir="rtl" className="min-h-screen-safe pb-32">',
        '<div dir="rtl" className="min-h-screen-safe pb-32 page-enter">',
    ),
    # Pattern: relative + overflow-hidden, dir="rtl" first
    (
        "src/pages/HadithBooks.tsx",
        '<div dir="rtl" className="relative min-h-screen-safe overflow-hidden pb-24">',
        '<div dir="rtl" className="relative min-h-screen-safe overflow-hidden pb-24 page-enter">',
    ),
    (
        "src/pages/HadithMemo.tsx",
        '<div dir="rtl" className="relative min-h-screen-safe overflow-hidden pb-24">',
        '<div dir="rtl" className="relative min-h-screen-safe overflow-hidden pb-24 page-enter">',
    ),
    # Pattern: relative + overflow-hidden, dir="rtl" last
    (
        "src/pages/SeerahTimeline.tsx",
        '<div className="relative min-h-screen-safe overflow-hidden pb-24" dir="rtl">',
        '<div className="relative min-h-screen-safe overflow-hidden pb-24 page-enter" dir="rtl">',
    ),
    (
        "src/pages/Companions.tsx",
        '<div className="relative min-h-screen-safe overflow-hidden pb-24" dir="rtl">',
        '<div className="relative min-h-screen-safe overflow-hidden pb-24 page-enter" dir="rtl">',
    ),
]

fixed = 0
for rel_path, old, new in FIXES:
    full_path = os.path.join(ROOT, rel_path)
    with open(full_path, "r", encoding="utf-8") as f:
        content = f.read()

    if old in content:
        new_content = content.replace(old, new, 1)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"  \u2705 {rel_path.split('/')[-1]}: added page-enter")
        fixed += 1
    elif "page-enter" in content:
        print(f"  \u23ed\ufe0f  {rel_path.split('/')[-1]}: already has page-enter")
    else:
        print(f"  \u26a0\ufe0f  {rel_path.split('/')[-1]}: pattern NOT FOUND")
        # Debug: show first 5 lines of main page return
        lines = content.splitlines()
        for i, line in enumerate(lines):
            if "min-h-screen-safe" in line:
                print(f"     Found at line {i+1}: {line.strip()[:120]}")

print(f"\nDone. {fixed}/{len(FIXES)} files updated.")
