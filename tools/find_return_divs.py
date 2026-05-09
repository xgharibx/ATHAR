"""
Find the main return div in each page to understand where to add page-enter class
"""
import os

ROOT = r"C:\Users\Amrab\Downloads\noor-adhkar"

pages_to_check = [
    'src/pages/AsmaAlHusna.tsx',
    'src/pages/Duas.tsx',
    'src/pages/HadithBooks.tsx',
    'src/pages/HadithMemo.tsx',
    'src/pages/PrayerGuide.tsx',
    'src/pages/ProphetStories.tsx',
    'src/pages/QuranVocab.tsx',
    'src/pages/SeerahTimeline.tsx',
    'src/pages/WuduGuide.tsx',
    'src/pages/Companions.tsx',
]

for rel_path in pages_to_check:
    full_path = os.path.join(ROOT, rel_path)
    with open(full_path, encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find main return statement (not inside helper functions)
    # Look for 'return (' with indentation <= 2 spaces (top-level function body)
    found = False
    for i, line in enumerate(lines):
        stripped = line.rstrip()
        if 'return (' in stripped and i > 20:
            # Check indent level - main return should be at 2 spaces
            indent = len(stripped) - len(stripped.lstrip())
            if indent <= 4:
                print(f"\n=== {rel_path.split('/')[-1]} (line {i+1}):")
                for j in range(i, min(i+5, len(lines))):
                    print(f"  {j+1}: {lines[j].rstrip()}")
                found = True
                break
    if not found:
        print(f"\n=== {rel_path.split('/')[-1]}: No return found at top level")
