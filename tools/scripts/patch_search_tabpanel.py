"""Patch Search.tsx: add id to tab buttons and role=tabpanel to panels."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Search.tsx'
content = open(path, 'r', encoding='utf-8').read()

patches = [
    # Tab button: adhkar
    (
        '            role="tab"\n            aria-selected={searchTab === "adhkar"}',
        '            id="search-tab-adhkar"\n            role="tab"\n            aria-selected={searchTab === "adhkar"}'
    ),
    # Tab button: quran
    (
        '            role="tab"\n            aria-selected={searchTab === "quran"}',
        '            id="search-tab-quran"\n            role="tab"\n            aria-selected={searchTab === "quran"}'
    ),
    # Tab button: library
    (
        '            role="tab"\n            aria-selected={searchTab === "library"}',
        '            id="search-tab-library"\n            role="tab"\n            aria-selected={searchTab === "library"}'
    ),
    # Tab button: hadith
    (
        '            role="tab"\n            aria-selected={searchTab === "hadith"}',
        '            id="search-tab-hadith"\n            role="tab"\n            aria-selected={searchTab === "hadith"}'
    ),
    # Adhkar results panel
    (
        '      {/* \u2500\u2500 Adhkar results \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}\n      {searchTab === "adhkar" && (\n      <Card className="p-5">',
        '      {/* \u2500\u2500 Adhkar results \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}\n      {searchTab === "adhkar" && (\n      <Card className="p-5" role="tabpanel" id="search-panel-adhkar" aria-labelledby="search-tab-adhkar" tabIndex={0}>'
    ),
    # Quran results panel
    (
        '      {/* \u2500\u2500 Quran results \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}\n      {searchTab === "quran" && (\n      <Card className="p-5">',
        '      {/* \u2500\u2500 Quran results \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}\n      {searchTab === "quran" && (\n      <Card className="p-5" role="tabpanel" id="search-panel-quran" aria-labelledby="search-tab-quran" tabIndex={0}>'
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
print('Round 1 done.')
