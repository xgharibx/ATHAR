import os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
path = os.path.join(WORKSPACE, 'src', 'pages', 'Quran.tsx')

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# Wrap button in div[role=listitem], move key from button to div
old1 = (
    '              return (\n'
    '                <button type="button"\n'
    '                  key={s.id}\n'
    '                  onClick={() => { recordRecentSurah(s.id); navigate(`/mushaf?surah=${s.id}`); }}\n'
)
new1 = (
    '              return (\n'
    '                <div key={s.id} role="listitem">\n'
    '                <button type="button"\n'
    '                  onClick={() => { recordRecentSurah(s.id); navigate(`/mushaf?surah=${s.id}`); }}\n'
)
if old1 in content:
    content = content.replace(old1, new1, 1)
    changes += 1
    print('Quran.tsx change 1: button start PATCHED')
else:
    print('Quran.tsx change 1: NOT FOUND')

# Close the wrapper div after </button> and before );
old2 = (
    '                </button>\n'
    '              );\n'
    '            })}\n'
    '          </div>\n'
    '        </Card>'
)
new2 = (
    '                </button>\n'
    '                </div>\n'
    '              );\n'
    '            })}\n'
    '          </div>\n'
    '        </Card>'
)
if old2 in content:
    content = content.replace(old2, new2, 1)
    changes += 1
    print('Quran.tsx change 2: button close PATCHED')
else:
    print('Quran.tsx change 2: NOT FOUND')
    idx = content.find('sortedFiltered.map')
    if idx >= 0:
        end = content.find('</div>\n        </Card>', idx)
        print('Context around close:', repr(content[end-120:end+60]))

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Total changes: {changes}')
