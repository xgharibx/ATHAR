import re

with open('src/styles/globals.css', encoding='utf-8') as f:
    content = f.read()

# Find prefers-color-scheme queries
matches = list(re.finditer(r'@media[^{]*prefers-color-scheme[^{]*\{', content))
print(f'Found {len(matches)} prefers-color-scheme queries:')
for m in matches:
    line_num = content[:m.start()].count('\n') + 1
    print(f'L{line_num}: {content[m.start():m.start()+90]}')
    print()
