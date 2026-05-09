import sys, re, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
files = [
    'src/pages/HadithBooks.tsx',
    'src/pages/Qibla.tsx',
    'src/pages/QuranVocab.tsx',
    'src/pages/Home.tsx',
    'src/pages/YouTubeCoursePlayer.tsx',
    'src/pages/Insights.tsx',
    'src/pages/CommandPalette.tsx',
    'src/pages/Ruqyah.tsx',
]
pat = re.compile(r'<[A-Z][a-zA-Z]+ size=')
for rel in files:
    path = os.path.join(base, rel)
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
