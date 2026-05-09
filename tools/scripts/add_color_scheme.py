with open('src/styles/globals.css', encoding='utf-8') as f:
    content = f.read()

# Add color-scheme to :root (dark default)
ROOT_BEFORE = '--sat: env(safe-area-inset-top, 0px);'
ROOT_INSERT = '  color-scheme: dark;\n\n  '

if ROOT_BEFORE in content and 'color-scheme: dark' not in content[:content.find(ROOT_BEFORE) + 200]:
    content = content.replace(
        '  ' + ROOT_BEFORE,
        ROOT_INSERT + ROOT_BEFORE,
        1
    )
    print('Added color-scheme: dark to :root')
else:
    print('SKIP: :root color-scheme already set or anchor not found')

# Add color-scheme to .light
LIGHT_MARKER = '--shadow: 0 18px 50px rgba(15, 19, 37, 0.12);\n}'
LIGHT_REPLACE = '--shadow: 0 18px 50px rgba(15, 19, 37, 0.12);\n\n  color-scheme: light;\n}'

if LIGHT_MARKER in content:
    content = content.replace(LIGHT_MARKER, LIGHT_REPLACE, 1)
    print('Added color-scheme: light to .light')
else:
    print('SKIP: .light shadow anchor not found')

with open('src/styles/globals.css', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
