import os, re

# Find TSX page files that might be missing h1 headings
issues = []

for root, dirs, files in os.walk('src/pages'):
    for f in files:
        if not f.endswith('.tsx'):
            continue
        fp = os.path.join(root, f)
        with open(fp, encoding='utf-8') as fh:
            content = fh.read()
        
        # Check for h1 presence
        has_h1 = bool(re.search(r'<h1\b', content))
        
        if not has_h1:
            issues.append(f'{fp}: no <h1>')

print(f'Pages possibly missing <h1>: {len(issues)}')
for iss in issues:
    print(' ', iss)
