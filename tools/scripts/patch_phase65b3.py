"""Phase 65b part 3: Add aria-label to unlabeled inputs in DhikrList."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src/components/dhikr/DhikrList.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

patches = [
    # Custom count input
    ('  inputMode="numeric"\n                  placeholder="العدد"\n                />',
     '  inputMode="numeric"\n                  placeholder="العدد"\n                  aria-label="عدد التكرار"\n                />',
     'custom count aria-label'),
    # Custom benefit/source input
    ('                value={customBenefit}\n                onChange={(event) => setCustomBenefit(event.target.value)}\n                placeholder="المصدر أو الفضل"\n              />',
     '                value={customBenefit}\n                onChange={(event) => setCustomBenefit(event.target.value)}\n                placeholder="المصدر أو الفضل"\n                aria-label="المصدر أو الفضل"\n              />',
     'custom benefit aria-label'),
]

for old, new, label in patches:
    if old in c:
        c = c.replace(old, new)
        print(f'  OK  [{label}]')
    else:
        print(f'  MISS[{label}] — trying simpler approach')
        # Try simpler single-line approach
        pass

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('\nDone.')
