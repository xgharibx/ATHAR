"""Patch Settings.tsx: improve ARIA for HomeWidgets list."""
import re

path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Settings.tsx'
content = open(path, 'r', encoding='utf-8').read()

# 1. Add role="list" to the container div
old1 = '      <div className="space-y-2">'
new1 = '      <div role="list" aria-label="\u062a\u0631\u062a\u064a\u0628 \u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629" className="space-y-2">'

# 2. Add role="listitem" to the item div
old2 = '''          <div
            key={key}
            className="flex items-center gap-3 glass rounded-2xl border border-white/10 px-3 py-2.5"
          >'''
new2 = '''          <div
            key={key}
            role="listitem"
            className="flex items-center gap-3 glass rounded-2xl border border-white/10 px-3 py-2.5"
          >'''

# 3. Update aria-label for move up button
old3 = '                aria-label="\u062a\u062d\u0631\u064a\u0643 \u0644\u0623\u0639\u0644\u0649"'
new3 = '                aria-label={`\u062a\u062d\u0631\u064a\u0643 ${HOME_WIDGET_LABELS[key]} \u0644\u0623\u0639\u0644\u0649`}'

# 4. Update aria-label for move down button
old4 = '                aria-label="\u062a\u062d\u0631\u064a\u0643 \u0644\u0623\u0633\u0641\u0644"'
new4 = '                aria-label={`\u062a\u062d\u0631\u064a\u0643 ${HOME_WIDGET_LABELS[key]} \u0644\u0623\u0633\u0641\u0644`}'

patches = [(old1, new1), (old2, new2), (old3, new3), (old4, new4)]

for old, new in patches:
    if old in content:
        content = content.replace(old, new, 1)
        print(f'PATCHED: {old[:60]!r}')
    elif new in content:
        print(f'ALREADY_HAS: {new[:60]!r}')
    else:
        print(f'NOT_FOUND: {old[:60]!r}')

open(path, 'w', encoding='utf-8').write(content)
print('Done.')
