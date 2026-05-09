import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'

patches = {
    'src/components/layout/PrayerWidget.tsx': [
        (
            '<span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" title="يتم التحديث..." />',
            '<span aria-hidden="true" className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" title="يتم التحديث..." />',
            'pulse dot aria-hidden'
        ),
    ],
    'src/components/layout/QuranRadioFab.tsx': [
        (
            '<span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)] animate-pulse inline-block" />',
            '<span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[var(--ok)] animate-pulse inline-block" />',
            'live dot aria-hidden'
        ),
    ],
    'src/pages/Home.tsx': [
        (
            '<span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: "var(--ok)" }} />',
            '<span aria-hidden="true" className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: "var(--ok)" }} />',
            'radio dot aria-hidden'
        ),
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
