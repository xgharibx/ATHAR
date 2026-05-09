"""Phase 73d: Favorites - add aria-controls to tabs + HadithBookView listProps check."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
path = os.path.join(base, 'src', 'pages', 'Favorites.tsx')
with open(path, encoding='utf-8') as f:
    c = f.read()

tab_pairs = [
    ('adhkar',      'الأذكار'),
    ('quran',       'القرآن'),
    ('hadith',      'الأحاديث'),
    ('duas',        'الأدعية'),
    ('stories',     'القصص'),
    ('companions',  'الصحابة'),
]

total_ok = 0
total_miss = 0
for tab_key, _ in tab_pairs:
    old = f'id="fav-tab-{tab_key}"\n            role="tab"\n            aria-selected={{activeTab === "{tab_key}"}}'
    new = f'id="fav-tab-{tab_key}"\n            role="tab"\n            aria-controls="fav-panel-{tab_key}"\n            aria-selected={{activeTab === "{tab_key}"}}'
    if old in c:
        c = c.replace(old, new)
        print(f'  OK  [fav-tab-{tab_key} aria-controls]')
        total_ok += 1
    else:
        print(f'  MISS[fav-tab-{tab_key} aria-controls]')
        total_miss += 1

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print(f'\nDone. OK={total_ok} MISS={total_miss}')
