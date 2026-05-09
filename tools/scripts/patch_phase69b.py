"""Phase 69b: QuranPlans confirm-reset dialog keyboard + overlay aria-hidden."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src/pages/QuranPlans.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

patches = [
    # Add keyboard handler (Escape) to the outer backdrop div and aria-hidden to inner backdrop
    (
        '        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" onClick={() => setConfirmReset(false)}>\n          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />',
        '        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" onClick={() => setConfirmReset(false)} onKeyDown={(e) => { if (e.key === "Escape") setConfirmReset(false); }}>\n          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />',
        'QuranPlans confirm-reset dialog keyboard+overlay'
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
