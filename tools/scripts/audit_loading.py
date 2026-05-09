"""Audit loading spinners/skeletons without role=status/progressbar."""
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
                # Look for loading spinner/skeleton patterns
                if ('PageSkeleton' in line or 'Skeleton' in line or 'loading' in line.lower() or 'spinner' in line.lower()):
                    context = '\n'.join(lines[max(0, i-2):min(i+5, len(lines))])
                    if 'role=' not in context and 'aria-' not in context:
                        if 'className' in line or 'class=' in line:
                            fname = path.replace(base + os.sep, '')
                            results.append(f'{fname}:{i+1}: {line.strip()[:90]}')

print("Loading elements without ARIA:")
for r in results[:20]:
    print(r)
print(f'\nTotal: {len(results)}')
