import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

files = [
    'src/pages/Library.tsx',
    'src/pages/Quran.tsx',
    'src/pages/Search.tsx',
    'src/pages/WuduGuide.tsx',
    'src/pages/VideoLibrary.tsx',
    'src/pages/Settings.tsx',
]

rl = 'role="list"'

for f in files:
    with open(f, 'r', encoding='utf-8') as fp:
        lines = fp.readlines()
    print(f'=== {f} ===')
    for i, line in enumerate(lines):
        if rl in line:
            # Print 10 lines after to see children
            start = i
            end = min(i + 10, len(lines))
            for j in range(start, end):
                print(f'  {i+1+j-start}: {lines[j].rstrip()}')
            print()
