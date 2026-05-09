"""Patch Favorites.tsx: add id to tab buttons and role="tabpanel" to tab panels."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Favorites.tsx'
content = open(path, 'r', encoding='utf-8').read()

tabs = ['adhkar', 'quran', 'hadith', 'duas', 'stories', 'companions']

# Patch 1: Add id to each tab button (by matching unique aria-selected value)
tab_button_patches = [
    # adhkar tab button
    (
        'role="tab"\n            aria-selected={activeTab === "adhkar"}',
        'id="fav-tab-adhkar"\n            role="tab"\n            aria-selected={activeTab === "adhkar"}'
    ),
    # quran tab button
    (
        'role="tab"\n            aria-selected={activeTab === "quran"}',
        'id="fav-tab-quran"\n            role="tab"\n            aria-selected={activeTab === "quran"}'
    ),
    # hadith tab button
    (
        'role="tab"\n            aria-selected={activeTab === "hadith"}',
        'id="fav-tab-hadith"\n            role="tab"\n            aria-selected={activeTab === "hadith"}'
    ),
    # duas tab button
    (
        'role="tab"\n            aria-selected={activeTab === "duas"}',
        'id="fav-tab-duas"\n            role="tab"\n            aria-selected={activeTab === "duas"}'
    ),
    # stories tab button
    (
        'role="tab"\n            aria-selected={activeTab === "stories"}',
        'id="fav-tab-stories"\n            role="tab"\n            aria-selected={activeTab === "stories"}'
    ),
    # companions tab button
    (
        'role="tab"\n            aria-selected={activeTab === "companions"}',
        'id="fav-tab-companions"\n            role="tab"\n            aria-selected={activeTab === "companions"}'
    ),
]

# Patch 2: Add tabpanel role and aria-labelledby to each panel Card
panel_patches = [
    (
        '{/* \u2500\u2500 Adhkar tab \u2500\u2500 */}\n      {activeTab === "adhkar" && (\n      <Card className="p-5">',
        '{/* \u2500\u2500 Adhkar tab \u2500\u2500 */}\n      {activeTab === "adhkar" && (\n      <Card className="p-5" role="tabpanel" id="fav-panel-adhkar" aria-labelledby="fav-tab-adhkar" tabIndex={0}>'
    ),
    (
        '{/* \u2500\u2500 Quran bookmarks tab \u2500\u2500 */}\n      {activeTab === "quran" && (\n        <Card className="p-5">',
        '{/* \u2500\u2500 Quran bookmarks tab \u2500\u2500 */}\n      {activeTab === "quran" && (\n        <Card className="p-5" role="tabpanel" id="fav-panel-quran" aria-labelledby="fav-tab-quran" tabIndex={0}>'
    ),
    (
        '{/* \u2500\u2500 Hadith bookmarks tab \u2500\u2500 */}\n      {activeTab === "hadith" && (\n        <Card className="p-5">',
        '{/* \u2500\u2500 Hadith bookmarks tab \u2500\u2500 */}\n      {activeTab === "hadith" && (\n        <Card className="p-5" role="tabpanel" id="fav-panel-hadith" aria-labelledby="fav-tab-hadith" tabIndex={0}>'
    ),
    (
        '{/* \u2500\u2500 Duas tab \u2500\u2500 */}\n      {activeTab === "duas" && (\n        <Card className="p-5">',
        '{/* \u2500\u2500 Duas tab \u2500\u2500 */}\n      {activeTab === "duas" && (\n        <Card className="p-5" role="tabpanel" id="fav-panel-duas" aria-labelledby="fav-tab-duas" tabIndex={0}>'
    ),
    (
        '{/* \u2500\u2500 Stories tab \u2500\u2500 */}\n      {activeTab === "stories" && (\n        <Card className="p-5">',
        '{/* \u2500\u2500 Stories tab \u2500\u2500 */}\n      {activeTab === "stories" && (\n        <Card className="p-5" role="tabpanel" id="fav-panel-stories" aria-labelledby="fav-tab-stories" tabIndex={0}>'
    ),
    (
        '{/* \u2500\u2500 Companions tab \u2500\u2500 */}\n      {activeTab === "companions" && (\n        <Card className="p-5">',
        '{/* \u2500\u2500 Companions tab \u2500\u2500 */}\n      {activeTab === "companions" && (\n        <Card className="p-5" role="tabpanel" id="fav-panel-companions" aria-labelledby="fav-tab-companions" tabIndex={0}>'
    ),
]

all_patches = tab_button_patches + panel_patches
for old, new in all_patches:
    if old in content:
        content = content.replace(old, new, 1)
        print(f'PATCHED: {repr(old[:60])}')
    elif new in content:
        print(f'ALREADY_HAS: {repr(new[:60])}')
    else:
        print(f'NOT_FOUND: {repr(old[:60])}')

open(path, 'w', encoding='utf-8').write(content)
print('Done.')
