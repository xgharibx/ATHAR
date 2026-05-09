import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import os
base = r'c:\Users\Amrab\Downloads\noor-adhkar'

patches = {
    'src/pages/Sources.tsx': [
        ('<Database size={18} className="text-[var(--accent)]" />',
         '<Database size={18} aria-hidden="true" className="text-[var(--accent)]" />',
         'Database size 18'),
    ],
    'src/pages/PrayerTimes.tsx': [
        ('<Icon size={18} className="opacity-80" />',
         '<Icon size={18} aria-hidden="true" className="opacity-80" />',
         'Icon size 18'),
    ],
    'src/pages/Companions.tsx': [
        ('<Users size={19} className="text-[var(--accent)]" />',
         '<Users size={19} aria-hidden="true" className="text-[var(--accent)]" />',
         'Users size 19'),
    ],
}

for rel, pats in patches.items():
    path = os.path.join(base, rel)
    name = rel.split('/')[-1]
    print(f'=== {name} ===')
    with open(path, encoding='utf-8') as f:
        c = f.read()
    for old, new, label in pats:
        if old in c:
            c = c.replace(old, new)
            print(f'  OK  [{label}]')
        else:
            print(f'  MISS[{label}]')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
