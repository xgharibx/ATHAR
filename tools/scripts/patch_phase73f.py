"""Phase 73f: Add aria-controls to tabs in Search.tsx, HadithBooks.tsx, Quran.tsx."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'

ok = 0
miss = 0

def patch(path, old, new, label):
    global ok, miss
    with open(path, encoding='utf-8') as f:
        c = f.read()
    if old in c:
        c = c.replace(old, new)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c)
        print(f'  OK  [{label}]')
        ok += 1
    else:
        print(f'  MISS[{label}]')
        miss += 1

# ─── Search.tsx ────────────────────────────────────────────────────────────
search_path = os.path.join(base, 'src', 'pages', 'Search.tsx')
with open(search_path, encoding='utf-8') as f:
    sc = f.read()

search_tabs = [
    ('adhkar',  '🤲 الأذكار'),
    ('quran',   '<BookOpen size={13} aria-hidden="true" /> القرآن'),
    ('library', '<LibraryBig size={13} aria-hidden="true" /> المكتبة'),
    ('hadith',  '<ScrollText size={13} aria-hidden="true" /> الأحاديث'),
]

for tab_key, _ in search_tabs:
    old = f'id="search-tab-{tab_key}"\n            role="tab"\n            aria-selected={{searchTab === "{tab_key}"}}'
    new = f'id="search-tab-{tab_key}"\n            role="tab"\n            aria-controls="search-panel-{tab_key}"\n            aria-selected={{searchTab === "{tab_key}"}}'
    if old in sc:
        sc = sc.replace(old, new)
        print(f'  OK  [search-tab-{tab_key} aria-controls]')
        ok += 1
    else:
        print(f'  MISS[search-tab-{tab_key} aria-controls]')
        miss += 1

with open(search_path, 'w', encoding='utf-8') as f:
    f.write(sc)

# ─── HadithBooks.tsx ────────────────────────────────────────────────────────
hadith_books_path = os.path.join(base, 'src', 'pages', 'HadithBooks.tsx')
patch(
    hadith_books_path,
    '            id={`hadith-books-tab-${t}`}\n            role="tab"\n            aria-selected={tab === t}',
    '            id={`hadith-books-tab-${t}`}\n            role="tab"\n            aria-controls={`hadith-books-panel-${t}`}\n            aria-selected={tab === t}',
    'HadithBooks tabs aria-controls'
)

# ─── Quran.tsx ────────────────────────────────────────────────────────────
quran_path = os.path.join(base, 'src', 'pages', 'Quran.tsx')
with open(quran_path, encoding='utf-8') as f:
    qc = f.read()

# Tab "سور" -> quran-panel-surahs
old_s = '<button type="button" id="quran-tab-surahs" role="tab" aria-selected={mode === "surahs"}'
new_s = '<button type="button" id="quran-tab-surahs" role="tab" aria-controls="quran-panel-surahs" aria-selected={mode === "surahs"}'
if old_s in qc:
    qc = qc.replace(old_s, new_s)
    print('  OK  [quran-tab-surahs aria-controls]')
    ok += 1
else:
    print('  MISS[quran-tab-surahs aria-controls]')
    miss += 1

# Tab "بحث بالآيات" -> quran-panel-ayahs
old_a = '<button type="button" id="quran-tab-ayahs" role="tab" aria-selected={mode === "ayahs"}'
new_a = '<button type="button" id="quran-tab-ayahs" role="tab" aria-controls="quran-panel-ayahs" aria-selected={mode === "ayahs"}'
if old_a in qc:
    qc = qc.replace(old_a, new_a)
    print('  OK  [quran-tab-ayahs aria-controls]')
    ok += 1
else:
    print('  MISS[quran-tab-ayahs aria-controls]')
    miss += 1

with open(quran_path, 'w', encoding='utf-8') as f:
    f.write(qc)

print(f'\nTotal OK={ok} MISS={miss}')
print('Done.')
