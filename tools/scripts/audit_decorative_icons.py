"""Audit lucide icons that are likely decorative (inside button/link with aria-label, or as pure decoration)
but don't have aria-hidden="true"."""
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
                # Find icon-only inside buttons with aria-label
                # Pattern: a button has aria-label and contains ONLY an icon
                # Check if an icon appears inside a button that already has aria-label  
                if re.search(r'<[A-Z][a-zA-Z]+ size=\d+\s*/>', line) or re.search(r'<[A-Z][a-zA-Z]+ size={', line):
                    # Check if aria-hidden is NOT present on this icon line
                    if 'aria-hidden' not in line:
                        # Check if the parent context (3 lines above) has an aria-label on a button
                        pre = '\n'.join(lines[max(0, i-4):i+1])
                        if 'aria-label' in pre and '<button' in pre:
                            fname = path.replace(base + os.sep, '')
                            results.append(f'{fname}:{i+1}: {line.strip()[:90]}')

print(f"Decorative icons inside aria-labeled buttons (without aria-hidden):")
for r in results[:30]:
    print(r)
print(f'\nTotal: {len(results)}')
