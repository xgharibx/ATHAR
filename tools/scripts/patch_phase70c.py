"""Phase 70c: Add aria-live to Library.tsx search result count."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src/pages/Library.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

patches = [
    (
        '        <div className="text-xs opacity-50 tabular-nums">{entries.length.toLocaleString("ar-EG")}</div>',
        '        <div className="text-xs opacity-50 tabular-nums" aria-live="polite" aria-atomic="true">{entries.length.toLocaleString("ar-EG")}</div>',
        'Library entries count aria-live'
    ),
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
