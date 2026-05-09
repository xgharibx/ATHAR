import os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
path = os.path.join(WORKSPACE, 'src', 'pages', 'WuduGuide.tsx')

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# WuduGuide: wrap button in div[role=listitem], move key to div
old1 = (
    '          return (\n'
    '            <button type="button"\n'
    '              key={step.id}\n'
    '              onClick={() => toggle(step.id)}\n'
)
new1 = (
    '          return (\n'
    '            <div key={step.id} role="listitem">\n'
    '            <button type="button"\n'
    '              onClick={() => toggle(step.id)}\n'
)
if old1 in content:
    content = content.replace(old1, new1, 1)
    changes += 1
    print('WuduGuide change 1: button open PATCHED')
else:
    print('WuduGuide change 1: NOT FOUND')
    # debug
    idx = content.find('WUDU_STEPS.map')
    if idx >= 0:
        print('Context:', repr(content[idx:idx+300]))

# Find the close: </button>\n          );\n        })}
old2 = (
    '            </button>\n'
    '          );\n'
    '        })}\n'
    '      </div>'
)
new2 = (
    '            </button>\n'
    '            </div>\n'
    '          );\n'
    '        })}\n'
    '      </div>'
)
if old2 in content:
    content = content.replace(old2, new2, 1)
    changes += 1
    print('WuduGuide change 2: button close PATCHED')
else:
    print('WuduGuide change 2: NOT FOUND')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Total changes: {changes}')
