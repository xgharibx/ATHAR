"""Phase 52: VideoLibrary sort groups role=group, Sebha aria-keyshortcuts, Mushaf page nav aria-keyshortcuts, NearbyMosques mosque list aria-live."""

import re

base = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages'

def patch(path, old, new, label=''):
    content = open(path, 'r', encoding='utf-8').read()
    name = path.split('\\')[-1]
    if old in content:
        content = content.replace(old, new, 1)
        open(path, 'w', encoding='utf-8').write(content)
        print(f'  PATCHED: {name} {label}')
        return True
    elif new in content:
        print(f'  ALREADY: {name} {label}')
        return True
    else:
        print(f'  MISS:    {name} {label}')
        return False

# ---- 1. VideoLibrary: add role=group to 3 sort chip containers ----
print('VideoLibrary sort groups:')
vl_path = base + r'\VideoLibrary.tsx'
content = open(vl_path, 'r', encoding='utf-8').read()

# Replace ALL 3 occurrences of the sort chips container
old_sort = '        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-2">'
new_sort = '        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-2" role="group" aria-label="\u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u0641\u064a\u062f\u064a\u0648\u0647\u0627\u062a">'

count = content.count(old_sort)
print(f'  Found {count} occurrences of sort chips container')
if count >= 3:
    content = content.replace(old_sort, new_sort)
    open(vl_path, 'w', encoding='utf-8').write(content)
    print(f'  PATCHED: {count} sort chip containers')
elif count == 0 and new_sort in content:
    print('  ALREADY: all sort groups have role=group')
else:
    print(f'  Partial match: only {count} occurrences found')
    # Find context
    idx = content.find('{/* Sort chips */')
    print(f'  Context near Sort chips: {repr(content[idx:idx+120]) if idx != -1 else "NOT FOUND"}')

# ---- 2. Sebha: add aria-keyshortcuts="Space" to count button ----
print('Sebha aria-keyshortcuts:')
patch(
    base + r'\Sebha.tsx',
    '        aria-label="\u0627\u0636\u063a\u0637 \u0644\u0644\u0639\u062f"\n        style={{ pointerEvents: "auto" }}',
    '        aria-label="\u0627\u0636\u063a\u0637 \u0644\u0644\u0639\u062f"\n        aria-keyshortcuts="Space"\n        style={{ pointerEvents: "auto" }}',
    'aria-keyshortcuts=Space'
)

# ---- 3. Mushaf: add aria-keyshortcuts to page nav buttons ----
print('Mushaf next page button aria-keyshortcuts:')
patch(
    base + r'\Mushaf.tsx',
    '              aria-label="\u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u062a\u0627\u0644\u064a\u0629"\n            >',
    '              aria-label="\u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u062a\u0627\u0644\u064a\u0629"\n              aria-keyshortcuts="ArrowLeft"\n            >',
    'next page'
)

print('Mushaf prev page button aria-keyshortcuts:')
patch(
    base + r'\Mushaf.tsx',
    '              aria-label="\u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0633\u0627\u0628\u0642\u0629"\n            >',
    '              aria-label="\u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0633\u0627\u0628\u0642\u0629"\n              aria-keyshortcuts="ArrowRight"\n            >',
    'prev page'
)

# ---- 4. NearbyMosques: add aria-live to mosque results list ----
print('NearbyMosques mosque results aria-live:')
patch(
    base + r'\NearbyMosques.tsx',
    '      {mosques.length > 0 && (\n        <div className="space-y-3">',
    '      {mosques.length > 0 && (\n        <div className="space-y-3" aria-live="polite" aria-label="\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0633\u0627\u062c\u062f \u0627\u0644\u0642\u0631\u064a\u0628\u0629">',
    'mosque list aria-live'
)

print('\nDone.')
