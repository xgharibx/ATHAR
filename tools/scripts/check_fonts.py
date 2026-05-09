import re

with open('src/styles/globals.css', encoding='utf-8') as f:
    content = f.read()

# Find @font-face declarations
matches = list(re.finditer(r'@font-face\s*\{[^}]*\}', content, re.DOTALL))
print(f'Found {len(matches)} @font-face declarations:')
for m in matches:
    line = content[:m.start()].count('\n') + 1
    print(f'\nL{line}:')
    print(content[m.start():m.start()+200])
