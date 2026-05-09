"""Audit icon-only buttons without aria-label."""
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
                # Look for button elements that end with > followed by an icon on next line
                if '<button' in line and '>' in line:
                    # Check if aria-label is NOT in the button opening tag area (next 3 lines)
                    context = '\n'.join(lines[i:min(i+5, len(lines))])
                    if 'aria-label' not in context and '<svg' not in context:
                        # Check if there is visible text
                        button_end = context.find('</button>')
                        if button_end == -1:
                            # Multi-line button
                            # Look for any text content
                            inner = context[context.find('>')+1:min(50, len(context))]
                            if inner.strip() and inner.strip()[0] in ['<', '{']:
                                # Likely icon only or component
                                # Check if it's a simple icon
                                if re.search(r'<[A-Z]\w+ size=', inner):
                                    fname = path.replace(base + os.sep, '')
                                    results.append(f'{fname}:{i+1}: {line.strip()[:80]}')

for r in results[:25]:
    print(r)
print(f'\nTotal suspicious: {len(results)}')
