import sys, re, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
files = [
    'src/components/layout/CommandPalette.tsx',
    'src/pages/Ruqyah.tsx',
    'src/pages/HadithBookView.tsx',
    'src/pages/Quran.tsx',
    'src/pages/CustomAdhkar.tsx',
    'src/pages/HadithMemo.tsx',
    'src/components/layout/AppShell.tsx',
    'src/pages/Sources.tsx',
    'src/pages/Library.tsx',
    'src/pages/PrayerGuide.tsx',
    'src/components/ui/PrayerWidget.tsx',
    'src/pages/NearbyMosques.tsx',
    'src/pages/AsmaAlHusna.tsx',
    'src/pages/ProphetStories.tsx',
    'src/pages/NotFound.tsx',
    'src/pages/Duas.tsx',
    'src/components/layout/QuranRadioFab.tsx',
    'src/pages/SeerahTimeline.tsx',
    'src/pages/WuduGuide.tsx',
    'src/components/dhikr/DailyWisdomCard.tsx',
    'src/components/dhikr/DailyCarousel.tsx',
    'src/pages/PrayerCountdown.tsx',
    'src/pages/Category.tsx',
]
pat = re.compile(r'<[A-Z][a-zA-Z]+ size=')
for rel in files:
    path = os.path.join(base, rel)
    if not os.path.exists(path):
        print(f'NOT FOUND: {rel}')
        continue
    with open(path, encoding='utf-8') as f:
        lines = f.readlines()
    found = [(i+1, l.rstrip()) for i, l in enumerate(lines)
             if pat.search(l) and 'aria-hidden' not in l and '<Button' not in l and '<IconButton' not in l]
    if found:
        name = rel.split('/')[-1]
        print(f'=== {name} ===')
        for ln, text in found:
            print(f'  {ln}: {text}')
        print()
