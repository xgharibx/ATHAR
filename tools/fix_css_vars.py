"""Fix deprecated CSS variables: --card-bg -> --card, --card-border -> --stroke"""
import os

ROOT = r"C:\Users\Amrab\Downloads\noor-adhkar\src\pages"

FILES = [
    "Settings.tsx",
    "AsmaAlHusna.tsx",
    "Duas.tsx",
    "Home.tsx",
    "PrayerGuide.tsx",
    "ProphetStories.tsx",
    "Insights.tsx",
    "Quran.tsx",
    "Qibla.tsx",
    "QuranVocab.tsx",
    "WuduGuide.tsx",
]

total_changes = 0
for fname in FILES:
    path = os.path.join(ROOT, fname)
    with open(path, "r", encoding="utf-8") as f:
        original = f.read()
    
    updated = original.replace("var(--card-bg)", "var(--card)")
    updated = updated.replace("var(--card-border)", "var(--stroke)")
    
    count = original.count("var(--card-bg)") + original.count("var(--card-border)")
    if count > 0:
        with open(path, "w", encoding="utf-8") as f:
            f.write(updated)
        print(f"  {fname}: {count} replacements")
        total_changes += count
    else:
        print(f"  {fname}: no changes needed")

print(f"\nTotal: {total_changes} replacements across {len(FILES)} files")
