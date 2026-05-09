import re

with open('src/styles/globals.css', encoding='utf-8') as f:
    content = f.read()

# Find all .light overrides already existing
light_overrides = []
for m in re.finditer(r'\.light\s+([\w\s\[\]():>.#"-]+?)\s*\{', content):
    light_overrides.append(m.group(0)[:60])

print('Existing .light overrides:')
for lo in sorted(set(light_overrides))[:30]:
    print('  ' + lo.strip())
