"""Phase 65b part 2: Add scope=col to table headers in PrayerTimes.tsx, plus table captions."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src/pages/PrayerTimes.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

patches = [
    # Table 1 headers
    ('<th className="text-right pb-2 pr-1">اليوم</th>',
     '<th scope="col" className="text-right pb-2 pr-1">اليوم</th>',
     'table1 day header scope'),
    ('<th key={p} className="pb-2 px-1 text-center">{PRAYER_LABELS[p]}</th>',
     '<th key={p} scope="col" className="pb-2 px-1 text-center">{PRAYER_LABELS[p]}</th>',
     'table1 prayer header scope'),
    # Table 2 headers
    ('<th className="text-right pb-1.5 pr-1">اليوم</th>',
     '<th scope="col" className="text-right pb-1.5 pr-1">اليوم</th>',
     'table2 day header scope'),
    ('<th key={p} className="pb-1.5 px-0.5 text-center">{PRAYER_LABELS[p]}</th>',
     '<th key={p} scope="col" className="pb-1.5 px-0.5 text-center">{PRAYER_LABELS[p]}</th>',
     'table2 prayer header scope'),
]

for old, new, label in patches:
    if old in c:
        c = c.replace(old, new)
        print(f'  OK  [{label}]')
    else:
        print(f'  MISS[{label}]')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print('\nDone.')
