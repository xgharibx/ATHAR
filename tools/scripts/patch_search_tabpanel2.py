"""Patch Search.tsx: add tabpanel role to panels (using raw bytes to handle non-ASCII comments)."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Search.tsx'
content = open(path, 'r', encoding='utf-8').read()

patches = [
    # Adhkar panel - just match the conditional and card
    (
        '{searchTab === "adhkar" && (\n      <Card className="p5">',
        'noop'
    ),
]

# Simpler approach: just find and replace the Card elements directly by matching lines
import re

def add_tabpanel(content, search_cond, tab_id):
    """Add role=tabpanel to the Card immediately following the searchTab condition."""
    # Pattern: {searchTab === "X" && (\n      <Card className="p5">
    old = f'{{searchTab === "{search_cond}" && (\n      <Card className="p5">'
    new = f'{{searchTab === "{search_cond}" && (\n      <Card className="p5" role="tabpanel" id="search-panel-{tab_id}" aria-labelledby="search-tab-{tab_id}" tabIndex={{0}}>'
    if old in content:
        return content.replace(old, new, 1), True
    return content, False

tabs = [('adhkar', 'adhkar'), ('quran', 'quran'), ('library', 'library'), ('hadith', 'hadith')]

# Actually use the real class
for tab_name, tab_id in tabs:
    old = f'{{searchTab === "{tab_name}" && (\n      <Card className="p-5">'
    new = f'{{searchTab === "{tab_name}" && (\n      <Card className="p-5" role="tabpanel" id="search-panel-{tab_id}" aria-labelledby="search-tab-{tab_id}" tabIndex={{0}}>'
    if old in content:
        content = content.replace(old, new, 1)
        print(f'PATCHED: {tab_name}')
    elif new in content:
        print(f'ALREADY_HAS: {tab_name}')
    else:
        print(f'NOT_FOUND: {tab_name}')

open(path, 'w', encoding='utf-8').write(content)
print('Done.')
