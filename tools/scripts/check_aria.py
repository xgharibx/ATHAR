"""Find IconButton and button elements missing aria-labels."""
import os
import re

results = []
for root, dirs, files in os.walk('src'):
    dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'assets']]
    for fn in files:
        if not fn.endswith('.tsx'):
            continue
        fp = os.path.join(root, fn)
        with open(fp, encoding='utf-8', errors='replace') as f:
            content = f.read()
        # Find IconButton tags that have onClick but no aria-label
        btns = re.findall(r'<IconButton(?:[^>]*)>', content)
        missing = sum(1 for b in btns if 'aria-label' not in b and 'onClick' in b)
        if missing > 0:
            results.append((fn, missing))

for fn, n in sorted(results, key=lambda x: -x[1]):
    print(f'{fn}: {n} missing aria-label')
print(f'Total files with issues: {len(results)}')
