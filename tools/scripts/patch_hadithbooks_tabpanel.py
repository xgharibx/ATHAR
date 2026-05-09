"""Patch HadithBooks.tsx: add id to tab buttons and role=tabpanel to panels."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\HadithBooks.tsx'
content = open(path, 'r', encoding='utf-8').read()

patches = [
    # Add id to dynamic tab buttons
    (
        '            role="tab"\n            aria-selected={tab === t}\n            onClick={() => setTab(t)}',
        '            id={`hadith-books-tab-${t}`}\n            role="tab"\n            aria-selected={tab === t}\n            onClick={() => setTab(t)}'
    ),
    # Library panel
    (
        '      {tab === "library" && (\n        <div className="relative z-10">',
        '      {tab === "library" && (\n        <div className="relative z-10" role="tabpanel" id="hadith-books-panel-library" aria-labelledby="hadith-books-tab-library" tabIndex={0}>'
    ),
    # Search panel (inline)
    (
        '      {tab === "search" && <SearchTab books={sorted} />}',
        '      {tab === "search" && <div role="tabpanel" id="hadith-books-panel-search" aria-labelledby="hadith-books-tab-search" tabIndex={0}><SearchTab books={sorted} /></div>}'
    ),
]

for old, new in patches:
    if old in content:
        content = content.replace(old, new, 1)
        print(f'PATCHED: {repr(old[:70])}')
    elif new in content:
        print(f'ALREADY_HAS: {repr(old[:70])}')
    else:
        print(f'NOT_FOUND: {repr(old[:70])}')

open(path, 'w', encoding='utf-8').write(content)
print('Done.')
