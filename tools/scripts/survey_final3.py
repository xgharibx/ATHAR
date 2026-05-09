import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import os
base = r'c:\Users\Amrab\Downloads\noor-adhkar'

files = {
    'src/pages/Sources.tsx': [63,64,65,66,67,68],
    'src/pages/PrayerTimes.tsx': [1199,1200,1201,1202,1203,1204,1205],
    'src/pages/Companions.tsx': [65,66,67,68,69,70,71],
}
for rel, lns in files.items():
    path = os.path.join(base, rel)
    name = rel.split('/')[-1]
    print(f'=== {name} ===')
    with open(path, encoding='utf-8') as f:
        all_lines = f.readlines()
    for ln in lns:
        if ln-1 < len(all_lines):
            print(f'{ln}: {repr(all_lines[ln-1].rstrip())}')
    print()
