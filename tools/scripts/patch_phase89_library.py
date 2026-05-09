import os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
path = os.path.join(WORKSPACE, 'src', 'pages', 'Library.tsx')

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. Hadith books grid: wrap button in div[role=listitem], move key to div
old1 = (
    '        {HADITH_BOOKS_STATIC.map((book) => (\n'
    '          <button type="button"\n'
    '            key={book.key}\n'
)
new1 = (
    '        {HADITH_BOOKS_STATIC.map((book) => (\n'
    '          <div key={book.key} role="listitem">\n'
    '          <button type="button"\n'
)
if old1 in content:
    content = content.replace(old1, new1, 1)
    changes += 1
    print('Library.tsx change 1: hadith book button start PATCHED')
else:
    print('Library.tsx change 1: NOT FOUND')

# Also close the wrapper after the button's closing tag
# The map ends with:   </button>\n        ))}
old2 = (
    '          </button>\n'
    '        ))}\n'
    '      </div>\n'
    '\n'
    '      <Card'
)
new2 = (
    '          </button>\n'
    '          </div>\n'
    '        ))}\n'
    '      </div>\n'
    '\n'
    '      <Card'
)
if old2 in content:
    content = content.replace(old2, new2, 1)
    changes += 1
    print('Library.tsx change 2: hadith book button close PATCHED')
else:
    print('Library.tsx change 2: NOT FOUND')
    # Find the relevant button close
    idx = content.find('HADITH_BOOKS_STATIC.map')
    if idx >= 0:
        end = content.find('</div>', idx)
        print('Context around close:', repr(content[end-100:end+80]))

# 2. LibraryEntryCard list: wrap in div[role=listitem]
old3 = '        {entries.map((entry) => <LibraryEntryCard key={entry.key} entry={entry} />)}'
new3 = '        {entries.map((entry) => <div key={entry.key} role="listitem"><LibraryEntryCard entry={entry} /></div>)}'
if old3 in content:
    content = content.replace(old3, new3, 1)
    changes += 1
    print('Library.tsx change 3: LibraryEntryCard PATCHED')
else:
    print('Library.tsx change 3: NOT FOUND')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Total changes: {changes}')
