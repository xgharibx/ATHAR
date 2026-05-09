"""Audit inputs without aria-label or aria-labelledby."""
import re, os

base = r'c:\Users\Amrab\Downloads\noor-adhkar\src'
results = []

for root, dirs, files in os.walk(base):
    for f in files:
        if f.endswith('.tsx'):
            path = os.path.join(root, f)
            content = open(path, encoding='utf-8').read()
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if '<input' in line:
                    # Get context (the full element up to 5 lines)
                    context = '\n'.join(lines[i:min(i+5, len(lines))])
                    if 'aria-label' not in context and 'aria-labelledby' not in context and 'aria-hidden' not in context:
                        # Exclude type=hidden, type=checkbox (usually labelled by parent)
                        if 'type="hidden"' not in line and 'type={' not in line:
                            fname = path.replace(base + os.sep, '')
                            results.append(f'{fname}:{i+1}: {line.strip()[:90]}')

print("Inputs without aria-label:")
for r in results:
    print(r)
print(f'\nTotal: {len(results)}')
