"""Phase 68c: Add aria-live to Quran search/filter result counts."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src/pages/Quran.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

patches = [
    # Add aria-live to ayah search result count container
    (
        '<div className="flex items-center gap-2">\n              {ayahTotalFound > ayahResults.length && (',
        '<div className="flex items-center gap-2" aria-live="polite" aria-atomic="true">\n              {ayahTotalFound > ayahResults.length && (',
        'Quran ayah result count aria-live'
    ),
    # Add sr-only live region for juz filter count (wrap the span with aria-live on parent div is hard since it's dynamic)
    # Instead add aria-live to the juz label span
    (
        '<span className="opacity-55">{sortedFiltered.length.toLocaleString("ar-EG")}',
        '<span className="opacity-55" aria-live="polite" aria-atomic="true">{sortedFiltered.length.toLocaleString("ar-EG")}',
        'Quran juz filter count aria-live'
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
