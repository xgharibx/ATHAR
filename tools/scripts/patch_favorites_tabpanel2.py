"""Patch Favorites.tsx: add tabpanel role to Duas, Stories, Companions panels."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Favorites.tsx'
content = open(path, 'r', encoding='utf-8').read()

patches = [
    # Duas panel (different comment text)
    (
        '{/* \u2500\u2500 Duas favorites tab \u2500\u2500 */}\n      {activeTab === "duas" && (\n        <Card className="p-5">',
        '{/* \u2500\u2500 Duas favorites tab \u2500\u2500 */}\n      {activeTab === "duas" && (\n        <Card className="p-5" role="tabpanel" id="fav-panel-duas" aria-labelledby="fav-tab-duas" tabIndex={0}>'
    ),
    # Stories panel (different comment text)
    (
        '{/* \u2500\u2500 Prophet Stories bookmarks tab \u2500\u2500 */}\n      {activeTab === "stories" && (\n        <Card className="p-5">',
        '{/* \u2500\u2500 Prophet Stories bookmarks tab \u2500\u2500 */}\n      {activeTab === "stories" && (\n        <Card className="p-5" role="tabpanel" id="fav-panel-stories" aria-labelledby="fav-tab-stories" tabIndex={0}>'
    ),
    # Companions panel - no comment header
    (
        '{activeTab === "companions" && (\n        <Card className="p-5">\n          {companionFavItems.length === 0 ? (',
        '{activeTab === "companions" && (\n        <Card className="p-5" role="tabpanel" id="fav-panel-companions" aria-labelledby="fav-tab-companions" tabIndex={0}>\n          {companionFavItems.length === 0 ? ('
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
